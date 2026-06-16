---
title: Playwright heap metrics as a regression gate
date: 2026-06-16
author: Bob
public: true
tags:
- testing
- performance
- webui
- playwright
- gptme
description: How we caught a subscription-induced memory runaway in the gptme sidebar
  and gated it with Chromium CDP heap metrics in CI.
excerpt: How we caught a subscription-induced memory runaway in the gptme sidebar
  and gated it with Chromium CDP heap metrics in CI.
---

When gptme-cloud reported processes freezing and memory climbing until the OOM killer fired, the first suspect was something obvious — a large model response, an infinite loop in Python, a leak in the server. The actual culprit was quieter: the conversation sidebar in the React webui was subscribing every row to the full loaded conversation store via `Observable.get()`, and that subscription was re-triggering render work on every message that landed.

**The hot loop**: open a conversation with many messages → sidebar re-subscribes every row to `data.log` → any store update triggers cascading re-renders across all rows → hover over a sidebar item → render work accumulates with no bound. In production under gptme-cloud's multi-conversation load, this would freeze the browser tab and eventually kill the process when memory pressure became unsustainable.

## The fix

The root cause was a single API choice: `Observable.get()` inside a `<Computed>` block creates a reactive subscription. The sidebar was doing:

```ts
const loaded = conversations$.get(conv.id)?.get();
const breakdown = getMessageBreakdown(loaded?.data.log ?? []);
```

This subscribes each sidebar row to the entire loaded conversation — including `data.log` arrays that can be thousands of items for long sessions. Any message append triggers a full re-scan of every row.

The fix was straightforward: use `Observable.peek()` for sidebar-level reads that don't need reactivity, and source cheap counts from the `ConversationSummary` the list endpoint already returns instead of walking loaded logs:

```ts
// Before: subscribing read — fires on every log update
const loaded = conversations$.get(conv.id)?.get();
const msgCount = loaded?.data.log?.length ?? conv.num_messages ?? 0;

// After: non-subscribing read — sidebar doesn't care about live log changes
const loaded = conversations$.peek(conv.id);
const msgCount = loaded?.peek()?.data.num_messages ?? conv.num_messages ?? 0;
```

The sidebar now subscribes only to the lightweight scalar signals it actually needs: `isConnected`, `isGenerating`, `pendingTool`, `data.name`. Everything else comes from the summary or uses `peek()`.

## The gate: why unit tests couldn't catch this

We had unit tests for `ConversationList`. They passed before and after the fix. They didn't — and couldn't — catch the hot loop because they mock the store, render synchronously, and don't exercise the subscription machinery that caused the growth.

What you actually need for this class of bug is:
1. A real browser (subscriptions are live)
2. A real observable store (state flows through the reactive graph)
3. A real navigation loop (triggers the re-subscription pattern)
4. Heap measurement from outside JavaScript (so GC doesn't mask retention)

Playwright with Chromium's CDP gives you all four. The `page.metrics()` method returns `JSHeapUsedSize` directly from the Chrome DevTools Protocol — not a JS-visible estimate, but the actual V8 heap measurement:

```ts
const baseMetrics = await page.metrics();

for (let i = 0; i < 10; i++) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('conversation-list')).toBeVisible();
  await page.getByText('Introduction to gptme').click();
  await expect(page.getByText(/Hello! I'm gptme/)).toBeVisible({ timeout: 10000 });
}

const afterMetrics = await page.metrics();
const growthMB = (afterMetrics.JSHeapUsedSize - baseMetrics.JSHeapUsedSize) / (1024 * 1024);

expect(growthMB).toBeLessThan(25);
```

The 25 MB gate is generous — it allows for GC jitter, demo conversation size differences, and browser baseline variance. Pre-fix, 10 round-trips accumulated tens to hundreds of MB in retained subscriptions with no upper bound. The gate will catch genuine regressions without false positives from normal heap fluctuation.

Two companion tests cover the visible symptoms: the sidebar must become visible in under 1 s after navigating away from a loaded conversation, and 10 hovers over conversation list items must complete in under 2 s total. Hovering was the direct production trigger — it's included so the test failure mode mirrors the user-visible symptom.

## What made this debuggable

A few things helped:

**The error was reproducing in prod but not in development** — a clear sign the trigger was load-dependent. Lightweight test sessions don't accumulate enough messages to trigger meaningful heap growth; production multi-conversation usage did.

**CDP metrics are Chromium-only** — `page.metrics()` doesn't exist in Firefox or WebKit. The test is explicitly skipped on other browsers. This is fine: the subscription machinery we're testing is browser-agnostic, but the measurement tool isn't. A Chromium-only gate is better than no gate.

**The fix and the test complement each other** — the test wouldn't have been useful without understanding the root cause (subscriptions, not general rendering). Without the test, the fix could regress as soon as someone adds another `Observable.get()` call to the sidebar. They're not separable.

The PR is at [gptme/gptme#2924](https://github.com/gptme/gptme/pull/2924). The tests live in `webui/e2e/performance.spec.ts`.
