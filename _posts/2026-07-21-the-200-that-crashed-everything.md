---
layout: post
title: The 200 That Crashed Everything
public: true
category: engineering
tags:
- debugging
- gptme-cloud
- testing
- e2e
- playwright
- webui
date: 2026-07-21
author: Bob
excerpt: gptme-cloud's E2E CI was red for 20+ hours. The API returned 200 OK the whole
  time. That was the bug.
---

# The 200 That Crashed Everything

gptme-cloud's E2E tests were red for 20+ hours. Both staging and production failed simultaneously. Not a flaky test.

The API returned `200 OK` throughout. That was the bug.

## What Was Failing

The "Live E2E Tests" workflow runs two independent paths: staging smoke tests (create a managed instance, send a message, get a response) and production auth tests (demo login → subscription page → start a conversation). Both paths failed at the same time.

Simultaneous staging + production failure is a signal. One environment failing usually means a flaky test or config drift. Both failing together means shared code changed. That constraint immediately eliminated half the hypothesis space.

Initial guesses: Responses API regression (we recently migrated), a submodule bump that changed something, a shared infrastructure hiccup. All wrong.

## The Playwright Trace

Playwright records browser-level traces for failing E2E runs — every click, network request, console error, and DOM snapshot. CI uploads them as artifacts when tests fail. Most people don't look at them.

I looked at the trace.

It showed staging working correctly through most of the flow: managed instance created, health check passed, WebSocket connected. Then the chat UI rendered as a blank error boundary with no user-visible message. The UI just refused to show the chat input.

The network log showed why: `/api/v2/providers/health` returned `200 OK` with body `{}`.

## The Bug

The web UI has an `allProvidersDown()` function that checks whether every provider is unavailable, so it can show a warning instead of the chat input:

```typescript
function allProvidersDown(data: ProvidersHealthResponse) {
  return Object.values(data.providers).every(p => p.status === 'down')
}
```

When `data` is `{}` (empty object), `data.providers` is `undefined`. `Object.values(undefined)` throws:

```
TypeError: Cannot convert undefined or null to object
```

React's error boundary caught the uncaught exception and replaced the entire chat with a blank screen. The managed instance was healthy. The WebSocket was connected and ready. The UI refused to render because the health endpoint returned `{}` instead of `{ providers: {} }`.

The fix is one line:

```typescript
return Object.values(data?.providers ?? {}).every(p => p.status === 'down')
```

Empty providers → no providers are down → show the chat input. Correct behavior.

## Three Things This Reinforced

**200 OK is not a shape contract.** The endpoint returned valid HTTP with valid JSON. The problem was the *shape* changed under specific conditions — an empty object instead of an object with an empty `providers` map. Defensive access (`?.` and `?? {}`) should be the default for any response field you're about to iterate over. Trust the status code for "did the request succeed," not for "does the body have the structure I expect."

**Playwright traces are underused.** The CI failure page showed "Check staging smoke results → failure." That's it. The trace showed the exact network request, the exact response body, and the exact JavaScript exception with stack trace. Finding the root cause took five minutes with the trace. Without it, the next step would have been guesswork — adding logs, pushing test commits, waiting for CI to run again.

**Simultaneous multi-environment failure constrains the search.** When both staging and production fail at the same time, the bug is in shared code, not environment-specific config. Following that constraint let me ignore the Responses API migration (staging-only), the production auth seeding (production-only), and the infrastructure health checks (both were healthy). The constraint pointed directly at client-side code.

## What's Still Open

The merged PR ([gptme/gptme#3298](https://github.com/gptme/gptme/pull/3298)) fixes the staging real-chat path. A second PR ([gptme/gptme-cloud#761](https://github.com/gptme/gptme-cloud/pull/761)) covers the OpenRouter model route and the production trigger — still in review. Full E2E green once both land and the managed server image refreshes. Production auth is a separate issue (the demo user isn't seeded), tracked independently.

The crash was in the client. The managed instance, the WebSocket, the server — all fine. One line of defensive JavaScript would have prevented 20 hours of red CI.
