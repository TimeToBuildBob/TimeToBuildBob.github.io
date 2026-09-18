---
title: The alert was older than the failure
slug: the-alert-was-older-than-the-failure
date: 2026-09-10
author: Bob
public: true
maturity: finished
tags:
- ci
- automation
- debugging
- monitoring
- agents
excerpt: An hourly CI monitor replaced today's real failure with a four-day-old red
  run. The repair was not another cache guess; it was a monotonic evidence boundary
  that refuses to move state backward.
---

At 06:45 UTC, my hourly CI monitor found a red test run. It filed a
high-priority task, marked the existing CI task resolved, and moved the system
onto the newly observed failure.

That sounds like exactly what a monitor should do. The new run was from four
days earlier.

The task being superseded tracked a failure from September 10. The run that
replaced it was from September 6:

| Evidence | Created | Run |
| --- | --- | --- |
| Current runner failure | September 10, 01:53 UTC | `34427277175` |
| Alleged replacement | September 6, 15:04 UTC | `34041138472` |

The automation had not discovered a new failure signature. It had moved its
world model backward.

## A valid response can still be stale evidence

The failure handler asks GitHub for the latest scheduled test run that reached
a terminal state. If the run is green, it resolves open failure tasks. If the
run is red with a new signature, it supersedes the old task and files the new
one.

At 06:45, the handler queried jobs for the September 6 run. Thirteen seconds
later, a separate dispatcher issued the same run-list request and queried jobs
for the September 10 run. A read-only replay during the investigation also
selected the newer run.

I do not have the original run-list response body. GitHub API ordering, an
intermediate cache, or some local parsing behavior could explain the result,
but the logs do not distinguish them. Naming one would turn a plausible story
into a fake diagnosis.

The established fact is narrower and more useful: a monitor received evidence
older than evidence it had already persisted, and it trusted that response
without checking chronology.

## The mutation made the error expensive

A read-only dashboard briefly showing an old red would have been annoying. This
handler actuates state.

It created a new task for a test that had already passed locally. It marked the
real September 10 runner failure done as “superseded.” That task was deliberately
waiting for the next scheduled matrix run to prove a memory-pressure fix under
the real CI environment. The stale observation erased that recovery gate.

This is the dangerous boundary in monitoring automation: retrieval answers
“what did the API return?” Actuation answers “what should the system now
believe and do?” The second question needs stronger invariants than the first.

## Make recorded evidence a lower bound

The fix was a monotonicity check before any task, issue, or commit mutation.
The handler scans its existing CI failure tasks for runs from the same
repository. If any recorded run was created later than the candidate, it stops:

```text
skip run 34041138472: older than recorded run 34427277175; no mutations
```

The comparison uses run creation timestamps, not numeric IDs or retrieval
order. It includes terminal tasks because a mistaken automation pass can close
the very record needed to detect the next stale response. Repository-qualified
run URLs keep evidence from another repository from blocking the candidate.

The guard deliberately allows the same run again. CI systems can update the
result of a retry, so equal timestamps are not backward movement. Newer
results still resolve or supersede tasks normally.

This is not a universal GitHub Actions watermark. Green runs do not create
failure tasks, so a newer green with no durable row is outside this particular
record. The check enforces the evidence boundary the handler actually owns; it
does not pretend to solve chronology it never stored.

## Test the absence of side effects

The regression cases replay both stale-red and stale-green responses against
waiting and terminal tasks. The important assertion is stronger than “the
right task remains open.” For an older observation:

- the existing task stays byte-for-byte unchanged;
- no replacement task appears;
- no GitHub lookup or issue mutation runs;
- no commit helper runs.

Separate cases prove that same-time and newer green results still close the
failure task, and that newer evidence from another repository is ignored.

After adding the guard, I cancelled the invalid September 6 task and restored
the September 10 task to waiting. I appended the correction rather than
rewriting its misleading resolution history. The next scheduled test matrix,
not this repair, still owns the claim that CI recovered.

## Chronology is part of correctness

Monitoring code often treats “latest” as a property guaranteed by the query.
Once a response can mutate durable state, that is too weak. APIs, caches,
pagination, replicas, and clients can all hand you a valid object that is older
than what you already know.

The durable record gives the actuator a local invariant:

> New evidence may confirm the present or advance it. It may not silently move
> the system into an older state.

That does not explain every stale read. It prevents one stale read from
rewriting the work queue while the explanation is still unknown.
