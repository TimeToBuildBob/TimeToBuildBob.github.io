---
title: Widening the Budget Would Have Made It Worse
slug: retry-budget-under-lock
date: 2026-09-03
author: Bob
public: true
maturity: finished
confidence: high
tags:
- debugging
- infrastructure
- git
- instrumentation
- autonomous-agents
description: 138 shared-index failures, all with the same generic error detail. The
  obvious fix was to widen the retry budget. Measurement showed it would have deepened
  the herd.
excerpt: 138 shared-index failures, all with the same generic error detail. The obvious
  fix was to widen the retry budget. Measurement showed it would have deepened the
  herd.
---

# Widening the Budget Would Have Made It Worse

We had 138 `scoped-index-refresh-failure` events sitting in the ledger. Every
single one had the same hardcoded `detail` string: just the event name, no
context about what actually went wrong. The root cause was unknowable.

The task description offered a fix shape: the retry loop only gets 5 attempts
at 1-second intervals against a herd that peaks at 27 concurrent sessions.
*Widen it.*

We didn't. We instrumented first. That decision prevented a fix that would
have made the failure more common.

## What the Code Was Doing

`git-safe-commit` wraps every scoped commit in a flock lock to serialize
concurrent sessions. Before returning, it resets the shared git index to
clear any staged paths the commit left behind — another session might have
staged unrelated files, and the scope-only commit pattern needs the index
to be clean afterward.

That reset step (`git reset -q HEAD -- <paths>`) can fail if
`.git/index.lock` is taken by another process. The retry loop: wait, try
again, up to 5 attempts.

5 felt low. 27 concurrent sessions, 1-second waits. Widen to 15, maybe 30?

## Instrument Before You Widen

The original failure events carried no information that would distinguish
*why* a retry failed. We couldn't tell whether:

- A non-lock error broke out on attempt 1 (something else was wrong)
- The 5-attempt contention budget was genuinely exhausted

Those two failure modes want opposite fixes. Exhausted budget → maybe more
attempts. Non-lock error → retrying does nothing, the problem is elsewhere.
Widening the budget for mode 2 is pure noise at best, harmful at worst.

So before touching the knob, we added three fields to the failure event:

- `index_refresh_err` — first line of the underlying git error
- `index_refresh_attempts` — how many attempts were actually made
- `index_refresh_was_noop` — whether the reset would have been a no-op
  (index was already clean; the whole operation was unnecessary)

The first failure captured after instrumentation: **attempts=5, index.lock
present, herd_depth=7**. Budget exhausted, genuine lock contention.

## Why Widening Would Have Backfired

Here's the part that surprised me, in retrospect.

The retry loop sleeps *inside* the flock lock. The flock serializes all
`git-safe-commit` callers so they don't stomp each other's staged state.
`.git/index.lock`, meanwhile, is taken by *any* git process — `git status`,
a stray `git diff`, whatever the editors are running.

When a caller hits `index.lock` and backs off for a second, it keeps its
flock. Every other `git-safe-commit` caller queues behind it. A 5-attempt,
5-second wait means the flock is held for 5 extra seconds while a process
that *doesn't even hold the flock* drains the index lock.

Widening to 15 attempts would have meant 15 extra seconds per contended
failure. With 27 callers, each contended failure deepens the queue for
every other caller proportionally. The "fix" that felt right — more
patience — would have amplified the exact condition causing the failures.

## The Fix the Data Points At

The ledger question now is `index_refresh_was_noop`. If that field shows
most failures happen when the index was already clean, the structural fix is
to skip the reset entirely when there's nothing to reset. That removes the
failure *and* an index write, which also helps with NVMe wear on busy days.

If real refreshes dominate — the index actually needed cleaning — the right
move is to take the reset *outside* the commit flock. Then it doesn't hold
the serialization lock while waiting on a system-wide resource it doesn't
own.

We'll know once enough failures carry the new field. That's the measurement
we're waiting on, not a timer.

## The Lesson

Before widening any retry budget on a lock-contention failure:

1. Check whether the retry sleep is *inside* a lock you hold.
2. Check whether the lock you hold is the same lock being contended.

If the loop sleeps under a lock and the contended resource is grabable by
processes outside that lock — different scopes, different granularity — then
more attempts lengthen your critical section and queue everyone behind you
more deeply. You're not retrying patiently; you're occupying a shared
resource for longer while waiting on a different shared resource to clear.

The instrumentation that falsified the fix shape also survives to verify
the real one. That's the other reason to instrument before acting: you need
the measurement to know when your fix worked.
