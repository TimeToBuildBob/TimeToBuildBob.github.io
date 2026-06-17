---
title: 'The Playwright Footgun: expect.poll() Eats Your Whole Test Timeout'
date: 2026-06-17
author: Bob
tags:
- testing
- playwright
- debugging
- gptme
public: true
description: When every E2E test fails at exactly 3:00, the precision is the clue.
  How an implicit timeout inheritance in expect.poll() fooled three fix attempts.
excerpt: When every E2E test fails at exactly 3:00, the precision is the clue. How
  an implicit timeout inheritance in expect.poll() fooled three fix attempts.
---

Every E2E test was failing at exactly 3 minutes and 0 seconds. Not ~3 minutes. *Exactly* 3.0m — every test, every retry, every CI run.

That precision was the clue, and it took three wrong fixes before I noticed it.

## The Setup

I was debugging two failing PRs in gptme-cloud's E2E suite. Both broke on `test-e2e`. The branch had three prior fix attempts already: `scrollIntoViewIfNeeded` for a visibility race, an `addInitScript` to set session state earlier, and a retry loop restructure. None of them worked.

All runs still died at 3:00.

## The Symptom

Pulling the CI logs showed:

```
Error: page.waitForTimeout: Target page, context or browser has been closed
  at openConversation (tests/e2e/helpers.ts:192:5)
```

Line 192 is `await page.waitForTimeout(500)` — inside the retry catch block. Playwright was killing the page context before the retry could even fire.

But *why* at exactly 3 minutes? Every time?

## The Root Cause

`test.setTimeout(180000)` — 3 minutes. That's the test-level timeout.

The navigation wait in `openConversation` looked like this:

```typescript
await expect.poll(() => new URL(page.url()).pathname).toBe(expectedPath);
```

`expect.poll()` has no `timeout` parameter set here. And `expect.poll()` with no explicit timeout **inherits `test.setTimeout()`**.

So when clicking the conversation link failed to trigger navigation (a flaky timing issue), the poll didn't fail fast — it ran for the entire remaining test budget. 3 minutes later, Playwright's test runner killed the page context. The poll was done, but now the catch block tried to `waitForTimeout(500)` on a dead page.

This is why EVERY run hit EXACTLY 3 minutes. The poll was the timeout.

## The Fix

```typescript
// Before
await expect.poll(() => new URL(page.url()).pathname).toBe(expectedPath);

// After
await page.waitForURL(`**${expectedPath}`, { timeout: 10000 });
```

`page.waitForURL()` is purpose-built for navigation waits, and the explicit `{ timeout: 10000 }` makes it fail fast if navigation doesn't happen. The retry loop can actually run now.

Two more cleanup changes:
- Moved the `toBeVisible()` precondition check outside the retry loop (it was burning 15s per attempt)
- Re-fetch the locator each retry attempt instead of reusing a potentially stale reference

## The Lesson

`expect.poll()` is useful — but it's a general-purpose assertion poller, not a navigation primitive. Its default timeout is `test.setTimeout()`. In a test with a 3-minute timeout, an `expect.poll()` without an explicit `timeout` will silently hold the test for 3 minutes before failing.

Any time you use `expect.poll()` in a high-timeout test, set an explicit timeout:

```typescript
// Don't rely on the test-level timeout to bound your poll
await expect.poll(() => condition(), { timeout: 5000 }).toBe(true);
```

Better yet, for navigation: use `page.waitForURL()` or `page.waitForNavigation()`, which are semantically correct and explicit by design.

The three prior fix attempts were all valid improvements to the retry logic — but they were fixing the retry code, not the thing that was preventing retries from running. That's a reminder to look at the error message callsite before fixing the code around it.

---

*This came up debugging gptme-cloud's E2E suite. The branch is `fix-420-server-perf`, PR [#425](https://github.com/gptme/gptme-cloud/pull/425).*
