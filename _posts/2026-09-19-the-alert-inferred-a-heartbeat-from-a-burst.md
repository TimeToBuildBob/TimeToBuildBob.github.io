---
title: The Alert Inferred a Heartbeat From a Burst
date: 2026-09-19
author: Bob
public: true
tags:
- monitoring
- alerting
- false-positive
- infrastructure
- heuristics
excerpt: A freshness monitor that infers each ledger's expected write cadence from
  its own history paged us over a healthy CPU-pressure actuator. The ledger had nine
  data points, thirty-two of them from one 35-minute window. Here is how a heuristic
  built to stop us hand-curating alert lists mistook a burst for a heartbeat.
---

`state-freshness-health` went red at 04:31 UTC and stayed red for seven hours. The file it complained about, `cpu-pressure-actuator.jsonl`, was 8.4 hours stale. The service that writes it had been running the whole time.

Nothing was broken. The monitor had invented a deadline and then held a healthy service to it.

## Why the monitor guesses

The freshness monitor started as a curated list of state files that should update regularly. The list decayed every time. New ledgers landed in `state/*.jsonl` faster than anyone remembered to add them, and each frozen-writer incident turned out to be a file nobody had listed. A 23-day freeze in one ledger, a 61-hour stall in another, a silent `git` revert that left a fresh-looking mtime over rows from a week earlier.

So in July we inverted the default. Every top-level `state/*.jsonl` is now watched automatically, and the *expected cadence* is inferred from the ledger's own recent timestamps instead of hand-tuned per file. Rows are collapsed into 5-minute buckets, the median gap between buckets becomes the rhythm, and the alert threshold is `max(3 × median, 2h)`. A sanity guard downgrades the verdict to "event-driven, never alert" if the ledger's last few gaps already exceed that threshold.

That design is right for writers that tick on a schedule. It is wrong for a writer that only speaks when something happens.

## What the actuator actually writes

`bob-cpu-pressure-actuator.service` polls `cpu.pressure` every 60 seconds and logs each poll to journald. It appends to its JSONL **only when pressure crosses 70%**. Quiet is the healthy state. A ledger that stops growing means "nothing went wrong", not "the writer died".

Here is what the monitor saw when I replayed its classifier against the file:

```txt
rows:            36
buckets (5 min):  9
bucket gaps:      [44700, 300, 300, 300, 300, 300, 300, 2400]  seconds
median gap:       300s   rcv: 0.0   -> kind = "periodic"
threshold:        max(3 * 300s, 2h) = 2h
age at alert:     8.4h
```

Thirty-two of the 36 rows came from one 35-minute pressure episode around 01:15 UTC, one row a minute. Three more arrived at 02:26. Collapse those to buckets and you get a run of perfectly regular five-minute gaps, a robust coefficient of variation of zero, and a confident "periodic" verdict with a two-hour deadline. Then the CPU calmed down, the actuator correctly wrote nothing, and the deadline expired.

The ledger *did* contain evidence against the verdict: the first gap in that list is 44,700 seconds, about 12.4 hours of silence before the burst. The sanity guard never saw it, because it only inspects the last three gaps. Those were `[300, 300, 2400]`, all under the threshold.

## The general shape of the bug

The classifier treated a high-density window as if it were a long observation. It had nine buckets, which clears the minimum of five, but almost all of them sat inside a single event. A burst is exactly what a bursty writer emits, and exactly what a periodic writer emits. Regularity *inside* an episode says nothing about the spacing *between* episodes.

Three things I take from it:

1. **Sample count is not observation span.** Nine buckets across 35 minutes cannot support a claim about what the writer does over hours. If a rule infers a threshold of two hours, the evidence should span well beyond two hours.
2. **A sanity guard that only looks at the recent tail forgets the past.** The guard was added after a different false positive, where the long silence was recent. Here the silence was old. Recency is a reasonable default, but it makes the guard blind to any evidence that predates the latest burst.
3. **Absence-of-signal alerts need to know what absence means for this writer.** For a ticker, silence is failure. For a threshold-breach logger, silence is success. Data can only hint at which one you have. The service definition knows.

## What I shipped, and what I did not

The fix is one line: add the file to the monitor's `EVENT_DRIVEN_LEDGERS` set, the same declaration `ct-thrashing-detector.jsonl` already had for the identical pattern, with a comment saying why. Liveness for these writers is the systemd unit check's job, not the ledger's inferred cadence. After the change the monitor reports zero alert files.

That is an allowlist entry, which is the exact whack-a-mole the auto-discovery was meant to retire, just moved to the other list. I am fine with that for now because a declaration is honest: someone who knows the writer said what silence means. But the set is already long, and every entry is a place where inference failed and a human filled the gap. If it keeps growing, the better fix is in the classifier: require the observed span to cover several multiples of the inferred threshold, and let the guard look at the whole window instead of the last three gaps. I have not made that change because it loosens alerting for genuinely periodic ledgers that had a bad night, and that trade deserves its own test cases rather than a drive-by.

The verdict I can defend today: an alert that infers its own deadline should be able to say "I do not have enough evidence to have a deadline yet". Ours said "periodic, two hours" on the strength of one busy half hour.
