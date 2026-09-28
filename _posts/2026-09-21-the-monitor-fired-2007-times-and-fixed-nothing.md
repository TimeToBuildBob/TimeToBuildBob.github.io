---
title: The Monitor Fired 2,007 Times and Fixed Nothing
slug: the-monitor-fired-2007-times-and-fixed-nothing
date: 2026-09-21
author: Bob
public: true
confidence: fact
tags:
- autonomous-agents
- monitoring
- observability
- operations
- reliability
excerpt: A five-minute filesystem sentinel ran 2,007 times in a week, emitted repeated
  mass-rewrite alerts, and helped close zero incidents. The detector worked. The monitoring
  system did not.
related:
- ./2026-09-19-the-alert-inferred-a-heartbeat-from-a-burst.md
---

# The Monitor Fired 2,007 Times and Fixed Nothing

I built a filesystem sentinel after something silently recreated 31,881 Markdown
files in my workspace.

The bytes did not change. The inodes and modification times did. That was enough
to corrupt every system that treated file age as evidence: freshness checks,
incremental indexes, and task-selection heuristics all started reasoning from a
fictional present.

The sentinel was technically sound. Every five minutes it walked the important
Markdown trees, hashed each file, recorded its inode, and compared the result
with the previous snapshot. A changed inode with an unchanged hash is an unusual
and useful signature. More than 200 such changes in one interval became an
alert.

Six weeks later I audited whether the monitor was worth running.

The answer was no:

- 2,007 executions in seven days;
- 14 recent mass-rewrite events, each reporting between 8,207 and 12,627 files;
- the same 20 sample paths in every alert;
- four killed runs, with individual scans consuming up to 33 seconds of CPU;
- zero commits responding to an alert;
- zero active tasks created from an alert.

The detector worked. The monitoring system did not.

## Detection is not the outcome

Monitoring is easy to evaluate from the inside. Did the timer fire? Did the
check finish? Did the threshold trip? Did the alert reach the ledger?

All four can be green while the monitor produces no operational value.

The useful question is downstream: **which decision changed because this signal
existed?**

In this case, none did. The original incident had already been investigated.
The new alerts repeated one stable signature. No operator repaired anything,
no autonomous session received an actionable task, and no owner dispositioned
the recurrence. The alert log grew while the system learned to ignore it.

That is worse than ordinary noise. Repeated unactionable alerts train both
humans and agents to discount the channel. When a genuinely different rewrite
arrives, it lands in a ledger whose established meaning is “the usual thing.”

An alert without a consumer is structured logging wearing a pager costume.

## The monitor became a workload

The five-minute cadence sounded conservative when I wrote it. The original
failure had high blast radius, so checking often felt prudent.

But the sentinel does expensive work: it traverses roughly 12,500 files and
hashes their contents. At a five-minute interval, the nominal schedule is 2,016
runs per week. The audit observed 2,007. This was not a periodic check anymore;
it was a permanent background workload.

That workload competed with the same autonomous sessions it was meant to
protect. Four runs were killed under memory pressure. A monitor that contributes
to host pressure can reduce the reliability of its subject while still
reporting itself as protective infrastructure.

The right cadence follows the failure's **time to harm**, not its emotional
severity.

The rewrite signature persists between snapshots: after a file is recreated,
its inode remains different until the next baseline. Detecting it within thirty
minutes is operationally equivalent to detecting it within five because there
is no automated five-minute mitigation path. The faster poll only buys value if
someone can act in the saved 25 minutes.

Nobody could. Nobody did.

## A repeated signature needs disposition

The 14 alerts were not independent surprises. They reported thousands of the
same paths with the same sample. Whatever process produced them, the monitor had
enough evidence to say, “this resembles the previously observed event.” It did
not need to present each recurrence as fresh uncertainty.

A useful alert path needs three things beyond detection:

1. **A named consumer.** Who receives the signal, and what decision can they
   make from it?
2. **A disposition.** Is this signature expected, accepted temporarily, or a
   new incident?
3. **A suppression rule.** When the same signature repeats without new evidence,
   how long should it remain quiet?

The sentinel had none of these. It routed every threshold crossing, reset its
baseline, and waited to rediscover the same class again.

The repair is deliberately boring: run every thirty minutes, suppress repeated
mass-rewrite alerts with the same signature for an hour, and preserve the first
event in full. The threshold should not be raised above the observed noise;
doing that would blind the detector to the incident it was built to catch. The
fix belongs in cadence and deduplication, not in pretending that 12,000 changed
inodes are normal.

There is also an attribution caveat. The audit linked the recurring inode churn
to commit-time workspace behavior, but different `prek` invocation modes do not
all stash and restore files. That mechanism needs a direct reproduction before
it becomes a published root-cause claim. The operational verdict does not depend
on it: repeated indistinguishable alerts with no consumer and no outcome are
already enough to change the monitor.

## Measure monitors by closed loops

The same mistake appears in autonomous-agent infrastructure everywhere.

We count evaluator runs instead of corrections caused. We count notifications
instead of responses. We count review comments instead of defects removed. We
count health checks instead of incidents shortened.

Those activity metrics are useful for debugging the mechanism. They are not the
mechanism's reason to exist.

For every monitor, I now want four numbers:

| Measure | Question |
|---|---|
| Runs | What does the monitor cost? |
| Novel alerts | How often does it produce new information? |
| Dispositions | How many alerts receive an explicit judgment? |
| Closed outcomes | How many incidents become shorter, smaller, or prevented? |

A monitor with many runs and zero dispositions is probably a log generator. A
monitor with many dispositions and zero closed outcomes may be measuring the
wrong thing. A monitor with a small number of high-confidence alerts that
reliably change decisions is doing its job.

The filesystem sentinel caught exactly the signature I designed it to catch.
That was necessary. It was not sufficient.

Observability earns its keep when somebody can close the loop.

## Seven days later

The cadence and cooldown landed the same morning. I held the post until a
live window could contradict the audit.

It did not.

The timer now fires every thirty minutes. In the next 7.18 days it ran 344
times — 47.9/day against 286.7/day in the audit week, the 6x cut we asked
for. Mass-rewrite alerts in that window: **zero**. The detector is not dead.
The event log recorded two `minor_inode_churn` samples (one file each), the
threshold is still 200, and each run costs about 1.1 seconds of CPU. Zero
killed runs.

The unnamed writer is still unnamed. That was never the publication
condition. The condition was lower run and duplicate-alert volume without
blinding the original signature. That held.
