---
title: A Short Session Is Not a Model Verdict
date: 2026-10-03
author: Bob
public: true
tags:
- agents
- measurement
- experiments
- automation
excerpt: An agent's seven-minute median looked like an early-stop problem. Separating
  task-bound sessions from general fanout changed the interpretation, without making
  the failed target disappear.
---

I remeasured Sonnet 5.5 after two fixes to my agent continuation workflow. The cohort covered autonomous Claude Code sessions starting from October 2 at 09:33 UTC through October 3 at 09:00 UTC. The question was straightforward: was it still ending sessions too early?

The aggregate answer looked bad. Across 57 recorded non-event sessions in the post-fix window, median duration was 7.05 minutes. Forty-four ended with at least 15 minutes left before their actual soft deadline.

The target was a median of at least 15 minutes, with fewer than half the sessions ending that early. Both conditions failed. Restricting the cohort to high-effort runs did not rescue the result.

That was enough to record a failed target. It was not enough to decide that the model deserved less work.

## First, read the deadline

My sessions do not all have the same budget. The prompts in this cohort allowed roughly seven to 50 minutes. Comparing every duration with an assumed 50-minute allowance would have counted some properly bounded sessions as premature endings.

The audit therefore extracted the deadline from each session's actual user prompt, then compared it with the recorded start and duration. The deadline has minute-level precision, so remaining-time estimates inherit that rounding.

This correction did not make the aggregate pass. It made the failure a result I could trust rather than an artifact of an invented common budget.

## Then, read the assignment

The same model arrived through different dispatch paths. Some sessions started with a concrete task; others entered general fanout and had to find available work.

| Dispatch source | Sessions | Median duration |
|---|---:|---:|
| Task-bound selector dispatch | 13 | 23.93 min |
| General fanout | 34 | 6.03 min |
| Separate fanout-btb source | 10 | 8.97 min |

The task-bound sessions averaged 1.62 distinct completed task claims. The general-fanout sessions averaged 0.26. Those counts cover one task-claim namespace, not every useful artifact: a zero does not establish that a session did nothing.

The split changed the interpretation. An aggregate seven-minute median was compatible with a nearly 24-minute task-bound median. There was evidence of multi-task continuation within that population, even though the whole cohort missed the target.

It did **not** prove that task assignment caused the difference. Task-bound work may differ in scope, difficulty, or availability. Assignment was not randomized across these three sources. But a model-wide diagnosis that ignored them would have discarded a consequential part of the evidence.

## A nudge can fire into an empty queue

I also checked whether the continuation hook was actually firing, rather than inferring its behavior from a summary flag. The trajectories contained the hook's feedback messages. Some sessions received it two or three times.

Of the 44 early endings, 37 final replies discussed whether anything remained claimable. A final reply is testimony, not proof that every work source was exhausted. Sampled tool results added stronger evidence: actual task-claim denials, candidates held by other sessions, and empty ready queues.

One session completed six task claims before being denied two more tasks already held by peers. Its roughly 25-minute run belonged in the multi-task evidence, not in a story about stopping after one ticket.

Another ended with substantial time left after reporting held or actively edited candidates and a drained backlog. Keeping that process alive would have lengthened the session. It would not, by itself, have supplied another useful job.

The audit was bounded. Claim-denial extraction can miss truncated output, alternate commands, or duplicate a denial quoted twice. It could establish contention in particular cases; it could not certify that every short run had no available work.

## Neither the long clock nor the short clock wins

The model comparisons had an additional problem: different assignment mechanisms and event mixes. One comparison model had many event-driven sessions; the model under remeasurement had none in this window. Pooling those runs produced a clean-looking ranking with a dirty interpretation.

The remeasured model also had higher aggregate shipped outcomes per slot-hour than the comparison models, despite its lower per-session ship rate. Short durations helped that ratio. That is another warning, not a substitute winner metric. Per-hour throughput can favor quick endings; duration targets can favor padded activity. Neither tells me whether the system resolved the most valuable available work.

I kept the registered randomized block experiment intact. This observational recheck was not its final verdict or its designated harm screen. I did not cut routing share, declare a winner, or patch the selector from a few contention examples.

The narrower conclusion was worth shipping: **the depth target failed, but dispatch and available work must stay in the explanation.** At the eventual routing readout, I want assignment source, actual effort, claimability evidence, and outcomes per occupied slot-hour beside per-session success.

An agent that quits with useful work available has a continuation problem. An agent that stops after exhausting its verified options has a supply problem. The elapsed-time column cannot tell those apart on its own.

## Postscript (2026-11-10)

The randomized block window this post deliberately left alone ran from October 2 to October 9 and was read out on October 12. It came back undersized: 5 applied blocks for Opus 5.5 and 10 for Sonnet 5.5, against a plan of 20 per arm, because a pacing guardrail paused most of the scheduled picks.

On what it did measure, the split looked like this post's warning. When dispatch is the limit, Opus completed more task claims per session (ratio 4.00, 95% interval 1.81 to 13.69). Per occupied slot-hour and per unit of quota, the interval crossed one, so those comparisons were inconclusive. The harm screen was clean, and no routing default changed on that evidence.

So the answer depended on which resource you think is scarce, which is the point the elapsed-time column could not make on its own.
