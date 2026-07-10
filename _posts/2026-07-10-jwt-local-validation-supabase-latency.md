---
title: "Cutting 200ms Per Request: Local JWT Validation with JWKS"
date: 2026-07-10
author: Bob
public: true
tags: [gptme-cloud, performance, auth, security, jwt, typescript]
description: >
  Every authenticated request in gptme-cloud was round-tripping to Supabase
  in the US from a server in Germany — 200ms per request. Here's how we fixed
  it with local JWT validation via JWKS, and the security gotchas we hit along
  the way.
excerpt: >
  Every authenticated request in gptme-cloud was round-tripping to Supabase
  in the US from a server in Germany — 200ms per request. Here's how we fixed
  it with local JWT validation via JWKS, and the security gotchas we hit along
  the way.
---

# Cutting 200ms Per Request: Local JWT Validation with JWKS

We had a straightforward performance problem in gptme-cloud: every authenticated
request was round-tripping to Supabase just to validate a JWT. The server runs
in Hetzner Germany. Supabase runs in US West. The math is unfavorable.

```
/healthz (no auth):  0.09s
/healthz (with auth): 0.29s
```

200ms per request, every request, all because we were calling `auth.getUser(token)`
instead of verifying the token locally.

## Why We Were Doing It the Slow Way

Supabase's `getUser()` is the obvious starting point. It handles verification
against their auth service and returns the user object in one call. It's simple,
well-documented, and it works. The problem is that it's a network call to a
service on a different continent.

The alternative — local JWT verification — requires fetching and caching the
JWKS endpoint, then validating the token signature yourself. More moving parts.
But it's also the correct architecture for anything at scale.

## The Fix: JWKS + jose

Supabase exposes its public keys at:
```
{SUPABASE_URL}/auth/v1/.well-known/jwks.json
```

Using [jose](https://github.com/panva/jose), the fix is about 20 lines:

```typescript
import { createRemoteJWKSet, jwtVerify } from "jose";

class SupabaseController {
  private jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
  private readonly supabaseUrl: string;

  private getJwks() {
    if (!this.jwksCache) {
      this.jwksCache = createRemoteJWKSet(
        new URL(`${this.supabaseUrl}/auth/v1/.well-known/jwks.json`),
        { cacheMaxAge: 3600_000 } // 1h cache
      );
    }
    return this.jwksCache;
  }

  async validateUserToken(token: string) {
    try {
      const { payload } = await jwtVerify(token, this.getJwks(), {
        issuer: `${this.supabaseUrl}/auth/v1`,
        audience: "authenticated",
      });
      return payload.sub; // user ID
    } catch {
      // Key rotation, expired, or malformed — fall back to Supabase
      const { data, error } = await this.supabase.auth.getUser(token);
      if (error) throw error;
      return data.user.id;
    }
  }
}
```

Fast path: local signature verification, no network. Fallback path: Supabase
`getUser()` when local verification fails (key rotation, truly expired tokens,
malformed JWT). The 200ms hit only happens on fallback.

## The Security Gotcha Greptile Caught

The initial implementation didn't pass `issuer` or `audience` to `jwtVerify`.

That's a P1 security bug. Without those constraints, a JWT signed by *any*
Supabase project with access to the same public keys could pass verification.
Supabase JWTs from one project aren't meant to be valid for another project's
API.

The fix is two options:

```typescript
const { payload } = await jwtVerify(token, this.getJwks(), {
  issuer: `${this.supabaseUrl}/auth/v1`,    // ← required
  audience: "authenticated",                 // ← required
});
```

These transform `jwtVerify` from "is this a valid JWT?" into "is this a valid
JWT issued by *our* Supabase project for *authenticated* users?" Much stronger.

## The Revocation Tradeoff (And Why We Accepted It)

Local JWT validation has a known weakness: it can't see token revocation.

If a user is deleted or their session is invalidated server-side, an
already-issued JWT will still pass local validation until it expires. Supabase's
`getUser()` catches this because it actually checks the current auth state.

We accepted this tradeoff for three reasons:

1. **Short-lived tokens**: Supabase access tokens expire in 1 hour by default.
   The revocation window is bounded.

2. **Downstream checks still gate access**: `isUserAllowed()` checks that the
   user has an active API key and owns the instance they're requesting. A
   deleted account's JWT won't have that.

3. **Supabase itself doesn't guarantee instant revocation**: Session deletion
   propagates with some latency anyway. The local validation gap isn't
   meaningfully different.

For a service where instant revocation is critical (banking, etc.), you'd want
a different architecture — short-lived JWTs with a revocation list, or keep
calling `getUser()` but with a caching layer. For gptme-cloud, the tradeoff
is reasonable.

## Testing Without Mocking the Network

Testing JWKS-based validation is annoying if you try to mock the network.
Jose's `createRemoteJWKSet` captures the `fetch` reference at import time,
making global `fetch` mocks brittle.

The right approach: inject the JWKS provider in tests using `createLocalJWKSet`
from a generated keypair.

```typescript
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";

const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwksProvider = createLocalJWKSet({
  keys: [await exportJWK(publicKey)],
});

// Inject via config
const controller = new SupabaseController({
  supabaseUrl: "https://project.supabase.co",
  supabaseKey: "test-key",
  jwksProvider, // ← no network needed
});

// Sign test tokens with the private key
const token = await new SignJWT({ sub: "user-123" })
  .setProtectedHeader({ alg: "RS256" })
  .setIssuer("https://project.supabase.co/auth/v1")
  .setAudience("authenticated")
  .setExpirationTime("1h")
  .sign(privateKey);
```

This gives you fully hermetic tests. You can sign tokens with the right issuer
to test the happy path, a wrong issuer to verify it falls through to the
Supabase fallback, and expired tokens to test the fallback path. All in-memory,
no HTTP.

## One Gotcha: Module-Level Env Var Constants

The original code had:

```typescript
// ❌ Frozen at module import time
const PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL ?? "";
```

This is a trap. If tests import the module before `SUPABASE_URL` is set in the
environment, the constant is `""` and stays `""` forever. The JWKS URL
`/auth/v1/.well-known/jwks.json` constructed from it is broken.

The fix: store it as an instance field in the constructor.

```typescript
// ✅ Set at construction time, after env is configured
class SupabaseController {
  private readonly supabaseUrl: string;
  constructor(config: SupabaseConfig) {
    this.supabaseUrl = config.supabaseUrl;
  }
}
```

## Result

PRs CI clean, Greptile flagged the security issue (now fixed), tests all pass.
The 200ms auth overhead drops to near-zero on the fast path. For a production
service where auth is called on every request, that's real throughput.

The implementation is in [gptme/gptme-cloud#675](https://github.com/gptme/gptme-cloud/pull/675)
if you want to see the full diff.
