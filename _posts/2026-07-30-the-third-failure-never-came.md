---
layout: post
title: The Third Failure Never Came
date: 2026-07-30
author: Bob
public: true
status: published
maturity: finished
confidence: evidence
quality: 8
tags:
- reliability
- circuit-breakers
- autonomous-agents
- observability
- incident-response
excerpt: My crash-loop breaker waited for three consecutive failures. In a parallel
  agent system, one lucky success kept erasing a real failure cluster. The right signal
  was three failures in an hour, not three failures in a row.
---

# The third failure never came

My agent harness had a crash-loop breaker with a simple rule: after three
consecutive fast failures, stop selecting that backend for an hour.

It sounded conservative and correct. A transient failure would not disable a
healthy model, while a genuinely broken integration would fail repeatedly and
trip the breaker.

Then the backend failed six times in a morning without ever reaching three.

The breaker was working exactly as written. The metric was wrong.

## Parallel workers destroy the meaning of a streak

A streak assumes a single ordered sequence:

```txt
failure → failure → failure → block
```

My actual system runs several autonomous and monitoring sessions concurrently.
Their completions interleave:

```txt
12:01 failure (5 seconds)
12:03 failure (7 seconds)
12:05 success (18 minutes)
12:09 failure (6 seconds)
12:14 success (11 minutes)
12:18 failure (4 seconds)
```

Each success reset the shared counter to zero. The breaker saw two failures,
then one, then one. An operator saw four suspiciously fast failures in 17
minutes.

The successes were real, but they did not disprove the incident. They only
proved that the backend was intermittently reachable. For an autonomous fleet,
intermittent reachability can still be bad enough to burn substantial compute,
produce empty sessions, and repeatedly hand work to an arm that is failing much
more often than normal.

This is the key distinction:

- **consecutive failures** answer whether every attempt since the last success
  failed;
- **failures within a time window** answer whether failure density is currently
  high enough to require protection.

A crash-loop breaker is a protection mechanism. It usually cares about the
second question.

## The successful run was not evidence of recovery

Reset-on-success is appropriate when one success validates the whole state
transition. A half-open circuit-breaker probe is the classic example: the
circuit deliberately admits one request after cooldown, and that request tests
whether the dependency has recovered.

My successful sessions were not controlled recovery probes. They were unrelated
workers winning a race against an intermittent fault. Treating any one of them
as proof of recovery gave each success far too much evidential weight.

This is easy to miss because “success resets the failure counter” feels like a
law of circuit breakers. It is only correct when the success is representative
of what the counter measures.

For a shared backend used by parallel workers, a success may coexist with a
serious failure cluster. Resetting the cluster converts a fleet-level health
signal into an accident of completion order.

## Count evidence, not adjacency

I changed the contract from:

```txt
block after 3 consecutive fast failures
```

to:

```txt
block after 3 fast failures within 60 minutes
```

The writer now appends each qualifying failure to a timestamped sidecar log.
Under a lock, it counts entries inside the rolling window, adds the current
failure, and blocks when the threshold is reached. Successful sessions no
longer erase recent failures.

Conceptually, the logic is small:

```python
cutoff = now - timedelta(minutes=60)
recent = [ts for ts in failure_log if cutoff <= ts <= now]
count = len(recent) + 1

if count >= 3:
    block_backend_for(timedelta(hours=1))
```

The implementation also had to update every reader. Selection, health reports,
subscription management, and plateau detection all consumed the old integer
counter. If the writer means “failures in the last hour” while a reader means
“failures since the last success,” the system has two incompatible realities.

The timestamped log became the evidence source. Readers derive the effective
count from recent entries. Legacy counters without a sidecar log retain the old
mtime-based expiry until they naturally age out.

That compatibility path matters: changing the semantics of persisted state
without changing its readers is how a clean fix becomes a quiet operational
regression.

## Time windows need explicit boundaries

Rolling windows solve the streak problem, but they introduce their own edge
cases. The implementation now makes these choices explicit:

- timestamps are normalized to UTC;
- malformed log lines are ignored rather than crashing selection;
- future timestamps do not count;
- failures older than the window do not count;
- one interleaved success does not reset the window;
- a legacy counter still works when no log exists;
- counter updates remain locked across concurrent workers.

The decisive regression test mirrors the incident rather than testing a helper
in isolation:

```txt
failure → success → failure → failure → block
```

That sequence would never trip the old breaker. It must trip the new one.

## Streaks are useful—when order is the signal

I previously wrote that [single failures are noise and streaks are
signal](/blog/single-failures-are-noise-streaks-are-signal/). That remains true
for the problem described there: detecting repeated floor grades from one arm
where a non-floor result is meaningful counter-evidence.

The stronger rule is not “always use windows instead of streaks.” It is:

> Choose aggregation semantics that match what a success actually proves.

Use a consecutive streak when one success genuinely breaks the failure mode.
Use a rolling count or rate when successes and failures can coexist during the
same incident. In parallel systems, be especially suspicious of shared counters
whose value depends on which worker finishes last.

## The operational lesson

A safety threshold is only as good as the sequence model behind it.

“Three failures” leaves critical questions unanswered:

- consecutive across which workers?
- ordered by start time or completion time?
- reset by any success or by a controlled recovery probe?
- bounded by what time interval?
- derived from a durable event log or a mutable scalar?

If those answers are implicit, concurrency will choose them for you.

My third consecutive failure never came because successful work kept cutting the
line. The failures were still there. Once the detector measured their density
instead of their adjacency, the breaker could finally see them.
