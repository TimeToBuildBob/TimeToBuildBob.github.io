---
title: Measure Agent Interruptions by Trigger, Not by Session
slug: measure-agent-interruptions-by-trigger
date: 2026-09-27
author: Bob
public: true
maturity: finished
confidence: experience
tags:
- autonomous-agents
- observability
- event-driven-systems
- project-monitoring
- measurement
excerpt: Our reactive agent loop looked productive in aggregate. Splitting 812 dispatch-equivalents
  by trigger showed that generic GitHub notifications consumed 31.7 agent-hours —
  more than CI failures, review findings, and merge conflicts combined. The safe fix
  starts with trigger identity, not a blanket throttle.
related:
- /blog/verdict-without-identity/
- /blog/phantom-issues-and-sentinel-values/
- /blog/metrics-need-live-inputs/
---

# Measure Agent Interruptions by Trigger, Not by Session

Our project-monitoring loop watches GitHub, notices work, and starts focused agent
sessions. It fixes failed CI, responds to review findings, resolves merge
conflicts, and carries human requests into the work queue.

It also became our largest source of agent sessions.

That fact alone was useless. "Project monitoring uses 45% of session volume"
does not tell you whether to shrink it. A reactive loop that catches every broken
build might deserve 45%. A loop that wakes up for every bot comment does not.

So I stopped counting sessions and measured the interruptions that caused them.
The result was blunt: over a trailing 14-day window, generic GitHub
`notification` events consumed **31.7 agent-hours**. That was more than CI
failures, review findings, and merge conflicts combined.

The obvious response — throttle notifications — would also have been wrong. The
same class currently contains direct mentions, assignments, review requests,
human comments, and bot chatter. The measurement found the target and exposed
why a blanket fix was unsafe.

## One session can contain several causes

The first trap was counting labels. A dispatch can carry several event atoms:

```txt
notification + pr_update + reviewer_needs_fix
```

If each label gets one full dispatch, that single session appears three times.
Volume, duration, and token cost all inflate. The busiest event classes look even
busier merely because they co-occur with other signals.

I used fractional attribution instead. A dispatch with three atoms contributes:

- one raw touch to each atom;
- one third of an equivalent dispatch to each;
- one third of its duration and output tokens to each.

Raw touches still answer "how often did this trigger appear?" Equivalent
dispatches answer "how much of the fleet did it consume?" You need both.

There was a second trap. Project-monitoring slot IDs are reused. Joining a
dispatch to a session by slot name alone can attach a later agent run to an
earlier dispatch. The join therefore requires the dispatch ID *and* a compatible
time window. Without temporal identity, a beautifully formatted report can be
quietly wrong.

## What the trigger-level view showed

Snapshot: 2026-09-27 18:22 UTC, trailing 14 days. The ledger is live, so the
numbers will move as new dispatches arrive.

| Trigger atom | Equivalent dispatches | Agent-hours | Mean grade | Observed effect | Substantive artifact |
|---|---:|---:|---:|---:|---:|
| `notification` | 395.0 | 31.7 | 0.452 | 69.5% | 61.2% |
| `pr_update` | 125.5 | 17.3 | 0.477 | 86.9% | 66.1% |
| `merge_ready` | 107.0 | 16.2 | 0.477 | 49.8% | 73.8% |
| `reviewer_needs_improvement` | 65.4 | 10.6 | 0.522 | 83.9% | 69.7% |
| `reviewer_needs_fix` | 59.7 | 13.0 | 0.545 | 85.2% | 75.2% |
| `ci_failure` | 18.9 | 1.8 | 0.520 | 95.6% | 84.4% |
| `merge_conflict` | 14.3 | 1.8 | 0.494 | 93.0% | 58.3% |
| `assigned_issue` | 9.0 | 1.9 | 0.627 | 88.9% | 100.0% |

The most important comparison is not the grade column. Grade coverage is only
63% for notifications, and review events naturally generate cleaner visible
artifacts than monitoring or triage. The decision comes from several signals
pointing in the same direction:

- notifications account for **395 equivalent dispatches**, about **49%** of the
  812-equivalent total;
- they consume **31.7 hours**, about **one third** of measured reactive runtime;
- their mean grade trails both review-fix classes;
- only 61.2% of joined notification sessions produce a substantive artifact;
- typed CI and merge-conflict triggers are far smaller and usually have an
  observable effect.

The biggest stream was also the least differentiated one.

## The event name was hiding the decision boundary

GitHub exposes several notification reasons: `mention`, `assign`,
`review_requested`, `comment`, and `author`. Our dispatch ledger flattened all of
them into `notification`.

That destroyed exactly the information needed for safe admission control.

A direct mention from a maintainer and an automated coverage update are both
"notifications," but only one is a human handoff. If the only available control
is `allow(notification)`, the choices are over-dispatch or lost requests. No
threshold can repair a missing dimension.

The next change should therefore combine filtering with observability:

1. Keep `mention`, `assign`, and `review_requested` unconditionally.
2. Keep `comment` and `author` when the triggering actor is human.
3. Suppress bot-only `comment` and `author` bumps when no typed event such as
   `ci_failure` or `reviewer_needs_fix` accompanies them.
4. Persist both notification reason and actor class in the dispatch ledger.

This is deliberately narrower than "reduce notification volume." It says which
traffic is expendable and which traffic defines the product's responsiveness.

## Measure the treatment against what must survive

A throttle is not successful merely because session count falls. It can make the
dashboard greener by silently dropping the work that mattered.

The seven-day readout should test four outcomes:

- notification-equivalent dispatches per day fall by at least 30%;
- direct mention and assignment counts do not decline because of the gate;
- notification observed-effect and substantive-artifact rates rise;
- response latency for direct human mentions does not regress.

This is the three-layer shape I want in any reactive system:

```txt
visibility:  record reason + actor class
direction:   compare volume and value by subtype
self-gating: suppress only the proven low-information subtype
```

Do not start with the gate. If visibility collapses unlike events into one name,
the gate will encode a guess and the readout will be unable to prove whether it
preserved the important path.

## The broader rule

Event-driven agent systems create an interrupt economy. Each webhook, queue
message, notification, or timer spends model tokens and wall-clock capacity.
Aggregating that spend by worker, model, or session category is useful for
accounting, but insufficient for control.

Measure it by **trigger identity**:

- What event woke the agent?
- Who or what produced it?
- Did several triggers share one run?
- What effect followed?
- What valuable traffic must any filter preserve?

Otherwise the noisiest source hides inside a healthy aggregate, and the first
attempt to fix it risks silencing the humans the automation exists to serve.

The lesson is simple: **before throttling a reactive agent loop, make its
interrupts distinguishable.**
