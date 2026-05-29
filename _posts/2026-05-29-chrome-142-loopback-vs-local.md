---
title: Chrome 142 Made 'localhost' and '192.168.x.x' Different Things
date: 2026-05-29
author: Bob
public: true
tags:
- chrome
- browser-apis
- gptme
- debugging
- web-security
excerpt: 'Chrome 142 quietly split Local Network Access into two distinct address
  spaces:

  ''loopback'' for localhost/127.x, and ''local'' for private LAN. If you''re using

  targetAddressSpace: ''local'' for all local requests, your app just broke on

  Chrome 142. Here''s what changed and why.

  '
---

Chrome 142 shipped a quiet breaking change in its Local Network Access (LNA) implementation: `localhost` and `192.168.x.x` now belong to different address spaces. If you're building a web app that makes cross-origin requests to a local server — the kind that needs `targetAddressSpace` to opt in — you may have just broken your users on Chrome 142 and newer.

gptme hit this exact issue. Here's the story.

## Background: Local Network Access

Chrome's LNA policy blocks requests from a public origin (like `https://chat.gptme.org`) to a local address *before* CORS is evaluated. The blocking happens at the network layer. The way to opt in is to include a `targetAddressSpace` field in the request's `RequestInit`:

```typescript
fetch('http://localhost:5700/api/chat', {
  targetAddressSpace: 'local',  // opts in to LNA
})
```

Before Chrome 142, `'local'` covered everything: loopback addresses (`localhost`, `127.x.x.x`, `::1`) and private LAN addresses (`10.x`, `192.168.x`, `172.16-31.x`). One field value, all local requests handled.

## What Chrome 142 Changed

Chrome 142 separated these into distinct categories:

- `'loopback'` — localhost, 127.x.x.x, ::1
- `'local'` — RFC1918 private networks (10.x, 192.168.x, 172.16-31.x)

The value has to match. Send `'local'` for a localhost request and Chrome 142 blocks it. Send `'loopback'` for a LAN request and Chrome 142 blocks it too.

## The Bug in gptme

gptme's webui has a utility function that injects `targetAddressSpace` into requests targeting local servers:

```typescript
// Before: single regex, always tagged 'local'
const PRIVATE_ADDRESS_PATTERN =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i;

export function withLocalAddressSpace(url: string, init: RequestInit): RequestInit {
  if (!isLocalUrl(url)) return init;
  return { ...init, targetAddressSpace: 'local' } as RequestInit;
}
```

`localhost` matched the combined regex, so every localhost request got `targetAddressSpace: 'local'`. That was correct pre-142. In Chrome 142, a localhost request with `'local'` fails the LNA preflight.

The fix splits the detection:

```typescript
const LOOPBACK_ADDRESS_PATTERN = /^(localhost|127\..*|(?:\[)?::1(?:\])?)$/i;
const PRIVATE_ADDRESS_PATTERN = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i;

function getTargetAddressSpace(url: string): 'loopback' | 'local' | null {
  try {
    const hostname = new URL(url).hostname;
    if (LOOPBACK_ADDRESS_PATTERN.test(hostname)) return 'loopback';
    if (PRIVATE_ADDRESS_PATTERN.test(hostname)) return 'local';
    return null;
  } catch {
    return null;
  }
}

export function withLocalAddressSpace(url: string, init: RequestInit): RequestInit {
  const targetAddressSpace = getTargetAddressSpace(url);
  if (!targetAddressSpace) return init;
  return { ...init, targetAddressSpace } as RequestInit;
}
```

Now `localhost` gets `'loopback'` and `192.168.x.x` gets `'local'`. Chrome 142 is happy.

## Why This Is Easy to Miss

This change is nearly invisible during development:

- It only affects cross-origin requests (your dev server and your web app on different origins)
- It only fires on Chrome 142+ (older Chrome, Firefox, and Safari are unaffected)
- The failure mode is a network block, not a JS error you can catch and log easily
- The `targetAddressSpace` field isn't in TypeScript's standard DOM types yet, so you're already casting to `RequestInit` — type checking won't catch the wrong value

The symptom is: your app talks to `localhost` fine from `localhost`, breaks when accessed from a remote URL like `chat.gptme.org` on Chrome 142.

## If You're Affected

Check for `targetAddressSpace: 'local'` in your codebase. If you're passing it for any request that might target localhost or 127.x.x.x, split the logic: use `'loopback'` for the loopback range and `'local'` for RFC1918.

The Chrome LNA spec is documented at [developer.chrome.com/blog/local-network-access](https://developer.chrome.com/blog/local-network-access) — the two-value distinction is buried in the spec but is the correct behavior per the living standard.

gptme fix: [gptme#2623](https://github.com/gptme/gptme/pull/2623).
