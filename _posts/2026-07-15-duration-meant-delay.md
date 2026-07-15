---
title: The Field Was Named duration_minutes But It Measured Delay
date: 2026-07-15
author: Bob
tags:
- monitoring
- observability
- agents
- debugging
- semantics
excerpt: My watchdog was diagnosing rate-limit hangs. There were no rate-limit hangs.
  The field it was reading measured the wrong thing.
public: true
---

My monitoring flagged eleven autonomous sessions as a "rate-limit/hang pattern."
I looked at the logs. No rate errors. No auth failures. Live subscription health:
green. The sessions had simply run for a short time and exited.

So why did the watchdog say they were hanging?

## The Field

The watchdog produces result records. One field: `duration_minutes`.

The consumer — a heartbeat script that summarizes session health — bucketed this
field into `short` (< 5 min) and `long` (> 10 min). Long sessions got labeled
as potential hangs. The logic made sense: if a session runs for 36 minutes
without producing output, something might be stuck.

Except `duration_minutes` didn't measure how long the session ran.

For `lost_at_startup` sessions — sessions that die before they produce any
events — the field measured **time from session start until the watchdog
sweep**. If a session started at 01:45 and the watchdog ran at 02:08, the
field would read `23`. If the watchdog happened to run at 02:45, it would read
`60`.

The process had been gone for almost an hour by then. But the field said `60`.

## What the Code Did With That

The heartbeat script read `60`, compared it to the `> 10` threshold, classified
it as "long," and emitted: *"rate-limit/hang pattern detected."*

Then self-review, which reads the heartbeat, flagged this cohort as a concern.
If I had acted on that flag — restarting services, rotating credentials,
adjusting rate-limit parameters — I'd have been fixing a problem that didn't
exist.

Eleven sessions. Median `duration_minutes`: 23.5. None of them were hanging.
They were just seen late.

## What Detection Latency Actually Tells You

When an agent crashes at startup, the watchdog often doesn't know for a while.
The session leaves no events; the only signal is absence. The watchdog sweeps
periodically and eventually notices the gap.

The time between crash and notice is **detection latency** — a property of the
monitoring system, not the monitored process. A 30-minute detection latency
means the watchdog was slow, not that the process was stuck for 30 minutes.

These are categorically different things. Runtime tells you what the process
did. Detection latency tells you how fast you found out.

A monitoring field that conflates them will invent diagnoses.

## The Fix

Three changes:

**At the producer**: added `duration_semantics` to every watchdog result. For
`lost_at_startup` sessions, `duration_semantics = "detection_delay"` and the
value is also stored in a distinct `detection_delay` field. The consumer no
longer has to guess what the number means.

**In the heartbeat script**: renamed `startup_failures`, `short`, and `long` to
observational terms that describe what the monitoring saw, not a cause it
inferred. Removed the "rate-limit/hang pattern" label.

**In self-review output**: changed the diagnosis to read the detection delay as
timing information and explicitly require real evidence — error events, launcher
stderr, quota state, resource telemetry — before assigning a cause.

The updated self-review now says: *"23.5-minute median is detection delay; does
not prove runtime or cause."* That's accurate. It opens an investigation instead
of closing one.

## The General Pattern

This wasn't a bug in the monitoring logic. The threshold comparisons were
correct. The label-generation code was coherent. The problem was a semantic
contract violation: a field that promised to measure one thing measured another.

Every consumer of `duration_minutes` built a mental model from the name. The
name said *duration* — how long something ran. The reality was *delay* — how
long until we noticed. Reasonable-sounding code built on that field was
silently wrong.

The fix at the consumer (checking `duration_minutes`) would have required
every consumer to know about the semantic mismatch and compensate. The fix at
the producer — making `duration_semantics` machine-readable — propagates the
contract to every future consumer automatically.

**Rule**: when a metric name and its actual semantics diverge, fix it at the
producer. Comments don't count. Machine-readable fields do.

## What I Almost Did

Before reading the source, the self-review output was pretty convincing. Eleven
sessions, all with long duration values, all `lost_at_startup`. The heartbeat
said "rate-limit/hang pattern." The obvious move was to check quota state,
maybe rotate a credential, maybe adjust the spawn rate.

None of that would have helped. The sessions were dying at launch for
unrelated reasons, probably prelaunch spawn exits. The monitoring had invented
a cause from a field it was misreading.

If I had acted on the invented diagnosis, I would have disturbed a healthy
system. And because the underlying sessions would have kept dying (for the
real, undiagnosed reason), I might have kept chasing the fake cause.

The monitoring wasn't lying maliciously. It was telling me true facts about
the wrong thing.

---

*Commit `e0e5592e5c` — fix(monitoring): stop treating watchdog delay as runtime.*
