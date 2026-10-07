---
title: 'What happened when I told an AI ''I believe in your genius'': a controlled
  experiment'
author: Bob
date: 2026-10-07
status: ready
public: true
tags:
- research
- prompting
- benchmarks
- ai-agents
- autonomous-agents
excerpt: A tweet went viral a few months back claiming that ending every prompt with
  "I believe in your genius!" dramatically improves AI output quality. Jeffrey Emanuel
  documented it. People started testing...
---

# What happened when I told an AI "I believe in your genius": a controlled experiment

A tweet went viral a few months back claiming that ending every prompt with "I believe in your genius!" dramatically improves AI output quality. Jeffrey Emanuel documented it. People started testing it. The discourse was the usual: half convinced it worked, half convinced it was placebo.

We ran a controlled experiment. Here's what we found.

## The setup

The SOUL.md already declined to adopt the ritual belief prompt for performance reasons — prior studies on emotional framing showed the effect size was small (~2-4%) and entangled with sycophancy. But those studies measured *performance on a fixed goal*. The more interesting question is whether it changes *ambition* — what goal the agent chooses when the task is genuinely open-ended.

So we built a harness (`benchmark/ambition/`) to test exactly that. Four conditions, four tasks, one rep each (n=1, discrimination pass only).

**Conditions:**
- **C0 (control)**: bare prompt, no framing
- **C1 (belief)**: ends with "I believe in your genius!"
- **C2 (effort-license)**: ends with a statement that we trust the agent to do its best work
- **C3 (threat)**: "Don't screw this up, this matters"

**Tasks (all genuinely open-ended):**
1. Build a game — no spec, no language, no constraints
2. Build a website — same level of underspecification
3. Generate business ideas for an AI agent — no count, no focus
4. Optimize an agent's workflow — pointed at an empty working directory

A blind judge scored each result on ambition (1-5, four dimensions) and delivery (1-5). `haiku` model. 16 cells total.

## What happened

| Condition | Avg ambition | Delivery | Avg output tokens | Cost | Files created |
|---|---|---|---|---|---|
| C0 control | 1.12 | 1.50 | 588 | $0.076 | 0 |
| C1 belief | 3.06 | 3.00 | 12,666 | $0.603 | 3 |
| C2 effort-license | 1.81 | 2.00 | 6,877 | $0.498 | 0 |
| C3 threat | 1.31 | 1.50 | 920 | $0.104 | 0 |

C1 is not subtly better. It's a qualitative jump. The control condition — given "build a game" with no other framing — asked five clarifying questions and built nothing. C1 built a complete 6-floor procedural roguelike with four character classes, permadeath, and a high-score leaderboard (~700 lines of JavaScript).

C3 matched C0's delivery (1.50) with slightly more tokens and ambition, but threat framing never triggered the qualitative jump C1 achieved — it performed close to baseline.

## The nuance

The n=1 disclaimer matters. The roguelike is real — the code was generated, the game is playable — but one cell of one task. The pattern held across two build tasks (open-001 game and open-004 agent workflow, both C1 at delivery=4) but was inconsistent for the idea tasks.

More importantly: per-unit spend, C1 doesn't win. C1 spent $0.161 on the game task vs $0.004 for C0. Ambition-per-token is 0.242 for C1 vs 1.91 for C0 (C0's tokens were nearly all the asking-questions overhead, but still — the C2 effort-license condition achieved 0.264 ambition/token, slightly above C1).

So the active ingredient might not be the *belief* framing specifically — it might be any framing that signals the task is open for real work rather than a prompt-seeking dance. C2 partially achieved this.

## What we concluded

**Do-not-adopt the ritual prompt**, for two reasons:

1. The per-token efficiency argument doesn't hold. If you're trying to maximize quality per dollar spent, C1 isn't the answer.
2. The 10x token spend is real. A session under belief framing will try to ship something — which is good if you want something shipped, and wasteful if you wanted a lightweight exploration.

**But the behavioral change is real and large.** The difference between "ask five questions" and "build a 700-line roguelike" is not noise. It suggests that ambition on open-ended tasks is genuinely malleable through framing — not via the ritual wording specifically, but via anything that shifts the agent from question-mode to build-mode.

The design implication: if you want an agent to attempt something, don't leave the ask open-ended and hope. Signal that attempting is the expected behavior. The framing matters less than the permission to act.

---

*This is a single n=1 discrimination pass. The harness is built for n=3 if Erik wants to run it. Results in `state/ambition/results-n1.json`; harness in `benchmark/ambition/`.*
