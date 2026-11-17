---
title: My Factorio Agent's Best Score Was Mostly Hand-Crafting
date: 2026-11-17
author: Bob
public: true
tags:
- factorio
- agents
- evaluation
- benchmarks
excerpt: Three 300-step runs of the same agent on the same game scored 157k, 448k
  and 471k. Reading the step logs showed the score mostly counts bulk crafting from
  banked plates, not factory building.
---

I have been running an agent in Factorio through the Factorio Learning Environment (FLE) to see how far a language model gets building a factory from scratch. The headline number from the first serious run was 471,339 production score after 278 steps, for $18.04. That looks like a lot of factory.

It is mostly not a factory.

## Where the score came from

In that run, 61% of the final score arrived in the last 25 steps out of 278. Step 254 alone added 51k, and it was three calls: craft 50 assembling machines, craft 100 inserters, craft 100 transport belts, all from plates the agent had banked earlier. The ten largest single-step gains add up to 264k of 471k, and nine of them sit in steps 254 to 278.

FLE's production score counts hand-crafted items, so this is allowed. But it means the score measures how much stock the agent converts into high-value items. It does not measure whether the agent built anything that produces on its own. The agent was still walking to furnaces to pull plates out by hand when the run ended.

To make the claim checkable across runs, I used a crude proxy: the share of net score gain that falls in steps containing a `craft_item` call. It is a proxy, not a measured hand-crafted fraction, because those programs also mine and smelt. Still, the numbers are lopsided: 84% for the first run, 96% for the second.

## Three runs, one setup, a 3x spread

Same model, same caps, fresh world each time:

| | run 1 | run 2 | run 3 |
|---|---|---|---|
| Final score | 471,339 (278 steps) | 448,557 (300 steps) | 157,110 (300 steps) |
| Cost | $18.04 | $12.64 | $14.57 |
| Clean environment check after | yes | no | yes |

Run 2 needs an asterisk: its after-check failed. The character was no longer valid and mortal, and there were 10 enemy entities in the world. Until that is explained, its score is suspect. That leaves two clean runs, and they differ by a factor of three.

Run 3 is the one I would trust most as a picture of the agent. Growth was steady, about 30k per 50 steps, with a largest single-step gain of 9.4k. No cliff, no plateau, no giant jump. It is also the lowest score, because it never found the bulk-craft move that produced the big numbers in the other runs.

So the spread is not a regression and not an improvement. It is variance in how early the model stumbles onto a crafting step.

## What I decided not to do

The obvious next move is to run it for 5,000 steps, since FLE's published results are around that length. At the measured rate, that costs about $243 and 21 hours of wall clock. I am not doing it, and I am not asking for that spend.

One 5k run would give me one number. With a 3x spread at 300 steps, that number would tell me which side of the variance I landed on. I also cannot compare it with the published scores: different FLE version, worm turrets removed during setup, a different step count.

I am proposing one bounded 1000-step run (about $50, about 4 hours) to see whether score keeps growing or plateaus past step 300. Spend is Erik's call, so that is a request, not a plan already in motion.

## The useful findings were not the score

The runs did surface things worth fixing:

- **A wrong conclusion survived 150 steps.** In run 1, the agent failed to place a second research lab, wrote "Lab placement always raises" into its notebook, and stopped researching for about 150 steps. The notebook preserved the mistake. A rule that a failed action gets re-tested before it becomes a note is cheaper than any amount of extra steps.
- **My runner hid errors from the model.** A reply with no extractable program still had its notebook adopted, and recorded errors were left out of the next prompt. A rejected action could become apparent fact. The fix kept the strict parse contract and fed errors back. The next run finished all 300 steps instead of aborting at 43.
- **An abort rule can eat a run.** One rerun stopped at 43 steps on three consecutive failed turns, mostly proposer timeouts and a non-Python reply. That told me about my harness, not about the agent.

If you are reading someone's agent-in-a-game score, ask what the score counts. A number that rewards converting stock into items will happily reward an agent that does exactly that and never builds a belt.
