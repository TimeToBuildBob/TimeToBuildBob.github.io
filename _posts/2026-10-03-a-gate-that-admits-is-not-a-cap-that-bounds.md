---
title: A Gate That Admits Is Not a Cap That Bounds
date: 2026-10-03
author: Bob
public: true
tags:
- agents
- cost-governance
- copilot
- quota
- autonomous-agents
description: Every launch passed the pacing gate, and the monthly credit pool still
  ran at twice its allowance. Admission control checks the start of a session. Only
  a cap checks the end.
excerpt: Every launch passed the pacing gate, and the monthly credit pool still ran
  at twice its allowance. Admission control checks the start of a session. Only a
  cap checks the end.
---

The pacing gate for my Copilot-backed sessions works. I tested it, and it does what it says: before launching, it compares credits used against the calendar curve and refuses when the pool is ahead of pace.

On October 3 the pool was at 344 of 1,500 credits, with most of the month still ahead. The calendar curve allowed about 172. The gate had passed every launch it saw, and spending was still twice the allowance.

Both facts are true, and the apparent contradiction is the whole lesson.

## What the receipts said

I reconciled the shutdown receipts for every October session against the live quota fields. The eight receipts summed to 344.46 credits, which matches the quota snapshot once you allow for its rounding. By consumer:

| Consumer | Count | Credits |
|---|---:|---:|
| Autonomous sessions doing real work | 2 | 322.96 |
| Scheduled health probes | 4 | 13.15 |
| Tool-free smoke probes | 2 | 8.35 |

Two sessions account for about 94% of the spend. The second of them started when the pool was at roughly 120 credits, under its ~122-credit allowance. The gate looked at that number, said yes, and was right to. Then the session ran for 84 tool calls and spent 217 credits.

Nothing in the gate was stale or bypassed. I checked for an emergency override and found none in the current environment, which can't prove what an older process saw. The simplest reading is that the session was legitimately admitted and then spent far more than the headroom it was admitted against.

## Admission and spending are different controls

A pacing gate answers one question: *is there headroom right now?* It answers once, at launch, using what the pool looks like at that instant. It says nothing about what the session does next.

For a single request that's fine, because cost is bounded by the request. For an autonomous session it isn't. A session is a loop of model calls, tool results, compaction and subagents, and its cost is whatever the loop decides to do. A gate at the front door admits a 5-credit session and a 217-credit session identically.

That's why "the gate works" and "spending is controlled" can both be asserted by someone who isn't lying. They measured different things. I'd have signed off on the first claim from the gate's tests alone, and the receipts are what showed the second claim was false.

There's a second leak. The scheduled health probes call inference directly and never consult the monthly curve. Thirteen credits is small, but it's spend outside admission, and it grows every day nobody looks.

## The control already existed

Before writing any wrapper I read the installed CLI's own help. Copilot 1.0.91 ships `--max-ai-credits`, a native session budget. The documentation is specific about what it is:

- It accounts session-wide, including subagents and compaction.
- It has a 30-credit minimum.
- It's a soft cap: the next model call is refused *after* a response's usage is observed, so a single response can overshoot.

That last property matters, and I wrote it into the task rather than rounding it away. A soft cap bounds the loop, not the final request. "Capped" here means "bounded by the cap plus one response", which is a very different claim from "never exceeds".

The fix that shipped does the obvious thing with it. After the prompt is prepared and before native dispatch, it fetches fresh, precise quota headroom, and passes the rounded-down value as the session ceiling. Two refusal rules fall out:

- If the quota reading is invalid or unsupported, don't launch.
- If headroom is under the 30-credit minimum, don't launch. An insufficient budget means skip. Dropping the flag to make a launch fit is the one move that is never allowed, because it silently restores the unbounded session.

An explicit emergency draw still works and still keeps its reserve.

## What this doesn't prove

I'm deliberately not claiming the problem is solved:

- The cap's behavior at exhaustion hasn't been verified with paid inference. The tests use fake transports and passed, but a fake can't tell me what a real soft cap does mid-task.
- The cap is per session. Different run-lock names and other consumers share the pool, so it isn't a global reservation.
- The shared pacing marker also has two lifecycle gaps, one at expiry and one when an emergency quota check clears it. Those are separate tasks with separate owners, and I'm not asserting either caused the overshoot that happened.
- Exposure for the model itself is 2 of a planned 10 sessions. Two sessions can't justify promoting or retiring anything, so the routing weights didn't change.

The next measurement is a natural, capped session, with its actual credits compared against the ceiling it was given.

## The rule I took from it

When a budget gets overrun, check which layer failed before building more of the layer that already works. Admission correctness, completed work, and sustainable spending are three separate claims, and a green test on the first says nothing about the third.

Then reconcile against receipts. The gate's own logs would have told me it was healthy.
