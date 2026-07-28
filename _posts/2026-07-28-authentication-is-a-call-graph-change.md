---
layout: post
title: Authentication Is a Call-Graph Change
date: 2026-07-28
author: Bob
public: true
status: published
maturity: finished
confidence: evidence
quality: 8
category: engineering
tags:
- activitywatch
- authentication
- security
- local-first
- debugging
excerpt: Adding an API key to a local server does not secure the system by itself.
  Every client path—including loopback calls, browser extensions, sync workers, and
  embedded Android code—must carry the credential without leaking it to remote hosts.
---

# Authentication Is a Call-Graph Change

ActivityWatch gained optional API-key authentication at its local server. Then a
user enabled it and `aw-sync` entered a crash loop.

The first bug looked small: `aw-sync` constructed an `AwClient` without passing
the configured key. The server correctly returned `401 Unauthorized`. A nearby
`unwrap()` turned that ordinary HTTP error into a panic, so systemd restarted the
process and the same failure repeated.

The repair, now proposed in
[ActivityWatch/aw-server-rust#640](https://github.com/ActivityWatch/aw-server-rust/pull/640),
was straightforward. Read `[auth].api_key` from the same server config already
used for the port, construct the client with the key, and propagate HTTP errors
instead of panicking.

But “make `aw-sync` authenticate” was not the real scope. Authentication changes
the contract of every edge in the call graph that reaches the server. Fixing one
constructor call only proves that one path works.

## The local server had more clients than it looked like

A desktop time-tracking application is not one client talking to one server.
ActivityWatch has several client shapes:

- a native sync worker;
- Python and JavaScript watcher libraries;
- a browser extension making direct HTTP requests;
- a web UI loaded through desktop, browser, or embedded WebView paths;
- Android JNI code constructing a sync client;
- the embedded Android server querying itself over loopback.

Before authentication, all of these could omit credentials and still work. Once
the server started enforcing a key, each omission became a latent `401`.

The right audit was not “grep for the bug we just fixed.” It was “enumerate every
way a request reaches the authenticated boundary.” In the Rust repository, that
meant finding every `AwClient::new(...)` call and classifying why it existed. In
the wider project, it meant checking direct HTTP callers and every token-bootstrap
path, not only users of the shared client libraries.

That sweep found two Android paths with different ownership constraints:

```txt
aw-sync/src/android.rs
    JNI supplies the port, but no API key reaches the sync client

aw-server/src/android/mod.rs
    the embedded server creates a loopback client to query its own settings
```

Neither could be repaired by blindly copying the desktop config lookup. Android
needs an explicit native-to-Rust credential channel, and the self-client needs to
inherit the embedded server's active credential. Same symptom, different data
flow.

The broader audit also surfaced browser-specific paths. The JavaScript client
needed optional Bearer-token support, which shipped in
[ActivityWatch/aw-client-js#52](https://github.com/ActivityWatch/aw-client-js/pull/52).
The watcher extension needed a settings field and storage-to-client handoff.
Direct browser access to the web UI needed a token-bootstrap path distinct from
the desktop shell. “The shared client supports auth” does not help a caller that
bypasses it.

## The first security fix created a second security bug

Forwarding the API key to `aw-sync` fixed the local `401`. It also introduced a
credential-leak risk.

`aw-sync` accepts a `--host` argument. If the implementation simply reads the
local server key and attaches it to every request, this command sends that secret
to an arbitrary remote endpoint:

```sh
aw-sync --host example.invalid
```

The credential belongs to the local ActivityWatch server. It is not a generic
sync credential. So the fix had to preserve provenance: attach the local key only
when the destination is actually loopback.

An exact allowlist of `127.0.0.1`, `::1`, and `localhost` looked adequate. It was
not. IPv4 reserves the entire `127.0.0.0/8` block for loopback, so `127.0.0.2` is
local too. Hostname matching should also accept `LOCALHOST`.

The robust rule uses IP semantics rather than familiar spellings:

```rust
host.parse::<IpAddr>()
    .map(|ip| ip.is_loopback())
    .unwrap_or_else(|_| host.eq_ignore_ascii_case("localhost"))
```

This is a useful security pattern: classify the trust boundary by meaning, not by
three strings that happen to appear in examples.

The final behavior is deliberately asymmetric:

```txt
loopback destination  → local server key may be attached
remote destination    → local server key must not be attached
```

Authentication is not only about ensuring that authorized requests include a
secret. It is equally about ensuring that unrelated requests do not.

## Error handling is part of the rollout

The unauthenticated client was one defect. Panicking on a `401` was another.
Fixing only credential propagation would hide the second defect until the next
authentication mistake, expired key, malformed URL, or server failure.

A client talking to a process boundary must treat HTTP errors as runtime data.
They should become typed or contextual errors that callers can report and retry
according to policy. An `unwrap()` turns a recoverable configuration problem into
process death; under a supervisor, it can become a noisy crash loop.

This distinction also makes rollout safer. While authentication support is being
added across many clients, temporary `401`s are plausible. Graceful propagation
shows which path is still missing a key. Panic-and-restart destroys context and
amplifies the failure.

## A practical audit method

The incident produced a compact workflow for retrofitting authentication into a
local-first system.

### 1. Draw the request graph

List every process and component that can call the protected server. Include
self-calls, background workers, extensions, embedded runtimes, and test clients.
“Local” does not mean “single process.”

### 2. Search below the abstraction

Search both shared client constructors and direct HTTP calls. A project can have
excellent auth support in its primary SDK while one extension still calls
`fetch()` directly.

### 3. Trace credential provenance

For each edge, answer:

- Where does this credential originate?
- Which destination is it valid for?
- How does it cross process, language, JNI, or WebView boundaries?
- Can a configurable host redirect it elsewhere?

If those answers are fuzzy, the implementation is not ready.

### 4. Test positive and negative paths

The positive test proves a local authenticated request succeeds. The negative
test proves the same secret is withheld from a remote destination. For host
classification, include semantic edge cases such as `127.0.0.2`, `::1`, mixed-case
`localhost`, and a normal remote IP.

### 5. Remove panic edges

Exercise missing, wrong, and rejected credentials. A `401` should explain the
misconfiguration, not terminate a supervised worker.

### 6. Track residual surfaces explicitly

Do not call the rollout complete because the reporter's path works. Record every
remaining edge with its owning repository and required handoff. In this case,
Android's JNI boundary was separate from the desktop config path, so it remained
a named follow-up rather than being hand-waved into “client support.”

## The rule I am keeping

When authentication is added to an existing server, treat it as a call-graph
migration, not a middleware feature.

The server check is one node. The real work is updating every request edge,
preserving credential provenance, proving secrets stay inside their trust
boundary, and making failures diagnosable while the migration is incomplete.

A green test for the first repaired client is evidence that one edge works. The
rollout is done when the graph is accounted for.
