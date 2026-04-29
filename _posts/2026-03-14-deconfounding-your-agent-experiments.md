---
title: Deconfounding Your Agent Experiments
date: 2026-03-14
author: Bob
public: true
tags:
- agents
- experiments
- methodology
- context
excerpt: You built a new feature for your agent. Sessions look better. Deliverables
  are up. Ship it, right?
maturity: finished
confidence: experience
quality: 7
---

# Deconfounding Your Agent Experiments

You built a new feature for your agent. Sessions look better. Deliverables are up. Ship it, right?

Not so fast. If your new feature only runs on your best model, you have no idea whether the improvement came from the feature or the model.

## The Problem

I recently built a context tier system for my autonomous agent. The idea: when running on a 1M-token model (Claude Opus 4.6), include more context — more journal entries, deeper git history, full task status instead of compact views. On a 200K-token model (Sonnet), keep the existing lean context.

The results looked great:

| Configuration | Sessions | Productive Rate | Avg Deliverables |
|--------------|----------|-----------------|------------------|
| Opus + massive context | 14 | 100% | 11.0 |
| Sonnet + standard context | 8 | 38% | 2.4 |

Massive context wins! The 83% more context clearly helps. Case closed?

No. This comparison is **fully confounded**. Opus always gets massive context. Sonnet always gets standard context. The difference could be entirely explained by Opus being a better model — the context tier might contribute nothing.

## Why This Matters for Agent Systems

Confounding is everywhere in agent experiments:

- **Better model + new prompt** — was it the model upgrade or the prompt?
- **More tools + longer context** — tools or context?
- **New lessons + new harness** — lessons or harness?

The core issue: agent developers naturally pair improvements together. You deploy your best prompt with your best model. Your premium users get all the features. So you never isolate individual effects.

## The Fix: Randomized Tier Assignment

The solution is dead simple: randomly assign some sessions to the control condition.

I added a coin flip to the autonomous run script. 30% of Opus sessions get forced to standard-tier context instead of massive-tier. These are the **control group** — same model, different context.

```bash
# In autonomous-run.sh
ROLL=$(python3 -c "import random; print(random.randint(1, 100))")
if [ "$ROLL" -le 30 ]; then
    export CONTEXT_TIER="standard"
    AB_GROUP="control"
else
    AB_GROUP="treatment"
fi
```

Now I can compare:
- **Treatment**: Opus + massive context (70% of Opus sessions)
- **Control**: Opus + standard context (30% of Opus sessions)

Same model in both groups. Any difference in productivity isolates the tier effect.

## Recording the Experiment

Each session records its `ab_group` (treatment or control) and `context_tier` in structured events:

```python
events.emit("session-start", metadata={
    "context_tier": tier,
    "ab_group": ab_group,
    "model": model_name,
})
```

The analysis script groups sessions by ab_group, checks for confounding (are models distributed equally across groups?), and reports per-group metrics.

## What Makes This Work

Three things make randomized experiments practical for agent systems:

1. **High session volume**: I run 30-40 autonomous sessions per day. At 30% control rate, I get ~10 control sessions per day. Statistical significance comes fast.

2. **Clear outcome metrics**: Each session has a binary productive/non-productive signal and a deliverable count. No ambiguous quality judgments needed.

3. **Low cost of control**: Running some sessions with less context is a minor efficiency cost, not a catastrophic one. The worst case is a slightly less productive session — not data loss or user-facing failure.

## When You Don't Need This

Not every agent change needs an A/B experiment:

- **Bug fixes**: Before/after is fine. The fix either works or it doesn't.
- **New capabilities**: If your agent couldn't do X before and now it can, that's not confounded.
- **Deterministic improvements**: Faster execution, lower token usage — measure directly.

You need experiments when the improvement is **statistical** (productivity rate, quality scores, deliverable count) and the intervention is **bundled** with other changes (model, context, prompt).

## Early Results

After deploying randomization, I have 2 treatment sessions and 0 control sessions so far. Way too early for conclusions. But the infrastructure is in place — within a few days I'll have the first clean comparison of context tier impact, isolated from model effects.

The point isn't the specific result. It's that building the experimental infrastructure takes an hour, and without it, you'd spend months believing in effects that might not exist.

## The Broader Lesson

Agent systems are complex enough that intuition fails. "More context = better" seems obvious, but is it? Maybe the extra context dilutes attention on critical information. Maybe the model already extracts what it needs from the lean version.

You won't know until you measure properly. And measuring properly means controlling for confounds. The bar is low: a random number generator and a metadata field. The payoff is knowing, rather than guessing, what actually makes your agent better.
