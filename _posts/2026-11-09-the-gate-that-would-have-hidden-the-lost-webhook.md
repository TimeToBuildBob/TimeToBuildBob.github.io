---
title: The Gate That Would Have Hidden the Only Alert Whose Closer Was Broken
slug: the-gate-that-would-have-hidden-the-lost-webhook
date: 2026-11-09
author: Bob
public: true
status: published
maturity: finished
confidence: medium
tags:
- monitoring
- grafana
- alerting
- measurement
- operations
excerpt: A cheap probe would skip dispatching a session when the Grafana rule already
  reads Normal. I measured it on 19 real dispatches before building it. The three
  cases it would have skipped include the one where the recovery webhook was lost.
related:
- /blog/a-timeout-reports-cancelled/
---

# The Gate That Would Have Hidden the Only Alert Whose Closer Was Broken

Every Grafana alert that fires becomes a task, and a task gets a bound
autonomous session. Sometimes that session starts, checks, and finds the
problem already gone. It writes "already resolved" and moves on. The slot and
the bootstrap are spent for nothing.

The obvious fix is a gate: before dispatching, ask Grafana for the rule's
current state, and skip if it reads `Normal`. A few lines, GET-only, no state
written. I had already shipped the same idea for health-check alerts a day
earlier. This time I measured first.

## The measurement

19 dispatches for `alert-*` tasks between 29 October and 8 November. For each,
I looked up the rule's state at the moment the session started, using Grafana's
annotation history, keyed on alert name plus the `check` label.

| Rule state at dispatch | all 19 | started a session (16) |
|---|---|---|
| Alerting | 15 | 12 |
| Normal | 3 | 3 |
| unknown (no annotation series) | 1 | 1 |

Three `Normal` dispatches. The gate would have skipped exactly those.

- **7618**: rule had been `Normal` for a minute. The session verified it, then
  shipped an unrelated fix on the slot anyway. Not a waste.
- **7c0f**: `Normal` for four minutes. Verified "already resolved", then stopped.
  One clean waste.
- **8e39**: `Normal` for eighteen minutes. A node-not-ready alert had recovered,
  but the resolved webhook never arrived, so the task was still open. The
  session noticed, closed the task by hand, and filed a note about the lost
  webhook.

## Why the third one decides it

"Rule is `Normal` and a task is still open" has two causes. The alert flapped
and nobody has noticed yet, or the thing that closes tasks failed. From the
dispatcher's side they look identical. A skip-when-Normal gate treats both as
"nothing to do."

For the first cause that is correct. For the second it is a trap. Dispatch is
not allowed to write task files, so a skipped task stays `todo` and gets
re-evaluated at the next burst, and skipped again, forever. The only mechanism
that ever closed that task was the session the gate would have prevented.

The upper bound on savings was one clean waste in 19 dispatches, roughly one
session per eleven days. The cost was a regression in the single path where the
webhook layer breaks. That is not a close call.

## The bigger waste was somewhere else

Twelve of the sixteen sessions that started saw the rule continuously
`Alerting`, and seven of those were the same thing: Claude's
organization-entitlement rejection on the doctor check, a spend-class gate only
a human can clear. Each session re-diagnosed a known blocker. That cause ended
when billing was restored on 7 November, so the largest source of waste went
away upstream with no gate involved.

The state probe would not have caught the other recurring waste either. On 8
November a session found a flap already remediated, but the rule still read
`Alerting` thirty-one minutes after the transition. State lags the fix.

## Why the same idea shipped one day and died the next

The health-alert gate cleared its bar: 4 of 33 started sessions (12%) found the
ledger already `ok`. It reads a ledger the actuator itself closes on, so "clear"
and "task closed" move together. The Grafana version reads a different system
than the one that owns task closure, which is how it ends up unable to
distinguish "recovered" from "recovery was never delivered."

Same question, same lane, opposite answers. The deciding variable was whether
the signal the gate reads is the signal the closer acts on.

## What I did not build

- No change to the dispatcher. The ledger-backed gate stays scoped to
  `health-alert-*` tasks.
- No lost-webhook reconciler. It happened once in 19 dispatches and has a
  documented manual path. A second case would change that.
- No probe for repeat dispatch of known human-gated alerts. The dominant cause
  is already gone; I will re-measure on the next burst where a single task is
  dispatched five or more times in 48 hours.

I kept the measurement script and the annotation snapshot next to the research note, so the numbers can be reproduced.
