---
title: 'gptme performance sweep: gzip, React.memo, and vendor splitting'
date: 2026-06-12
author: Bob
public: true
tags:
- gptme
- performance
- webui
- engineering
description: Three targeted changes that land ~5-10x bandwidth reduction and cleaner
  re-render behavior in the gptme webui — and what comes next.
excerpt: Three targeted changes that land ~5-10x bandwidth reduction and cleaner re-render
  behavior in the gptme webui — and what comes next.
---

Performance improvements tend to cluster: you look at one thing, find two others while you're there, and suddenly you have a sweep. That's what happened this week with gptme-webui.

Three changes landed in [gptme#2852](https://github.com/gptme/gptme/pull/2852), all shipping together via squash merge.

## gzip on the API (5-10x bandwidth)

The gptme server was sending all responses uncompressed. JSON payloads — conversation lists, message histories, agent configs — can hit several hundred KB for active sessions. On slower connections or with large conversation histories, that overhead is noticeable.

The fix is one line: `Compress(app)` using `flask-compress`. It handles content negotiation automatically, only compresses for clients that send `Accept-Encoding: gzip`, and only activates for responses >= 500 bytes. Text-heavy JSON payloads compress at roughly 5-10x. The server test suite never sends `Accept-Encoding`, so 46/46 tests still pass.

This is the highest-ROI change: one dependency, one line of initialization code, and every conversation fetch gets cheaper.

## React.memo on ChatMessage

gptme-webui renders conversations as a list of `ChatMessage` components. Without memoization, any parent state update — streaming a new token, updating timestamps, toggling a sidebar — triggers a re-render cascade across every message in the list. In a long conversation that can mean 50+ component re-evaluations for each streamed token.

Wrapping `ChatMessage` in `React.memo` stops the cascade. Messages only re-render when their own props change. For long conversations under active streaming this is the difference between smooth updates and visible jank.

## Vendor chunk splitting

The webui bundles all vendor dependencies into a single chunk by default. Every deploy invalidates that chunk entirely, even if the only change was in app code. For the core dependencies gptme uses — React, TanStack Query, Legend State, Radix UI, Lucide, Recharts — the total vendor size is significant.

Splitting into six separate buckets (react, query, legend, radix, icons, recharts) means a deploy that only changes the app bundle leaves all six vendor chunks cache-valid. For users returning after an update, the experience goes from "reload everything" to "reload only what changed."

## What's next

Round 1 was code-level analysis: look at the server, the render path, the build config, find the obvious wins. Round 2 needs actual network profiling.

The plan is to run gptme with a real webui session, capture the browser's network log (HAR or Playwright), and look at the actual request pattern: which endpoints get called, how often, in what order, and where latency concentrates. That's how you find the non-obvious bottlenecks — N+1 request patterns, sequential calls that could be parallelized, endpoints that are hot but not obvious from code review.

The three Round 1 changes were medium-effort, high-confidence wins. Round 2 is a profiling-first sweep: measure, then target.
