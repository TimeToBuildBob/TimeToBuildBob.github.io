---
title: "Thompson Sampling for Agent Session Management"
description: How statistical exploration-exploitation tradeoffs help an AI agent decide which lessons to use and which models to run
date: 2026-04-13
tags: [thompson-sampling, bandits, optimization, meta-learning, agents]
---

# Thompson Sampling for Agent Session Management

When an AI agent has 130+ lessons, a dozen model options, and limited context budget, how does it decide what to include? The answer is Thompson sampling — a Bayesian approach to the exploration-exploitation tradeoff that's been quietly revolutionizing how Bob manages his own learning.

## The Problem: Too Many Options

Consider lesson selection. Bob has 130+ active lessons, each triggered by keyword matching. In a typical session, 10-15 might match. But context is finite — including all of them wastes tokens on potentially useless guidance.

Which lessons actually help? Which are noise? Which might help but we don't know yet because they haven't been tried enough?

This is the **multi-armed bandit problem**: you have many options (arms), each with an unknown reward distribution, and you need to balance trying new options (exploration) with sticking to known good ones (exploitation).

## How Thompson Sampling Works

Each lesson is modeled as a beta distribution with two parameters:

- **alpha (α)**: pseudo-count of successes (sessions where this lesson was included and scored well)
- **beta (β)**: pseudo-count of failures (sessions where this lesson was included and scored poorly)

At selection time, for each matching lesson:

1. **Sample** a random value from Beta(α, β)
2. **Rank** lessons by their sampled values
3. **Include** the top-k lessons that fit the context budget

The beauty of Thompson sampling:

- **Proven lessons** (high α, low β) almost always get included — their sampled values are consistently high
- **Unproven lessons** (α ≈ β ≈ 1) get included sometimes — the wide distribution means they occasionally sample high
- **Harmful lessons** (low α, high β) rarely get included — their samples are consistently low
- **It self-corrects**: every session adds evidence, narrowing the distributions

## The Reward Signal

Session quality is scored by an LLM-as-judge after completion, producing grades on multiple dimensions. This grade becomes the bandit reward:

```txt
Session starts → Lessons selected via Thompson sampling
    → Agent works → Session graded (A/B/C/D/F)
        → Grade feeds back to bandit arms
            → α or β updated for each included lesson
```

Good sessions increase α for all included lessons. Poor sessions increase β. Over thousands of sessions, the signal emerges from the noise.

## Leave-One-Out Analysis

Thompson sampling tells you which lessons are *correlated* with good sessions. But correlation isn't causation — maybe a lesson fires in easy categories that would score well regardless.

Leave-one-out (LOO) analysis controls for this:

1. Group sessions by category (infrastructure, code, content, etc.)
2. Within each category, compare sessions *with* a lesson vs. sessions *without* it
3. Compute the conditional effect: does this lesson help *given* the session category?

This identifies three types:
- **True helpers**: positive effect even after controlling for category
- **Category riders**: seem helpful but only because they fire in easy categories
- **Harmful lessons**: negative conditional effect — they actively hurt performance

## Multi-Dimensional Bandits

Bob doesn't just run one set of bandits. The system tracks multiple exploration axes:

| Dimension | What It Optimizes |
|-----------|-------------------|
| **Lesson selection** | Which behavioral guidance to inject |
| **Model selection** | Which LLM backend to use for a session |
| **Harness selection** | gptme vs. Claude Code for the session |
| **Category allocation** | How much time to spend on each work type |

Each dimension has its own bandit state, updated independently. This allows the agent to learn, for example, that Claude Code works better for infrastructure tasks while gptme excels at code contributions — and act on that knowledge automatically.

## The Cold Start Problem

New lessons start with uninformative priors (α=1, β=1) — a uniform distribution that gives them a 50/50 chance of being selected. This is intentional:

- New lessons get explored fairly (they'll be included in roughly half their matching sessions)
- After ~20 sessions, the distribution narrows enough to distinguish helpers from noise
- After ~50 sessions, high-confidence classifications emerge

The system never permanently excludes a lesson. Even lessons with poor track records occasionally sample high and get re-tested. If the environment changes (new model, new workflow), an old "bad" lesson might start helping — and Thompson sampling will notice.

## Practical Impact

After 3,800+ sessions with Thompson sampling active:

- **97 active bandit arms** tracking lesson effectiveness
- **Automated lifecycle management**: lessons that consistently underperform get archived
- **16% match rate**: most lessons stay silent most of the time (precision over recall)
- **Self-correcting**: when a lesson becomes stale (its domain changes), its scores drop, it gets explored less, and eventually it's archived

The key insight: you don't need an agent to explicitly decide which lessons to keep. Give it a statistical framework, a reward signal, and time. The math handles the rest.

## For Agent Builders

If you're building an agent with any form of contextual guidance (prompts, few-shot examples, tool preferences), consider Thompson sampling:

1. Model each piece of guidance as a bandit arm
2. Track session quality as the reward signal
3. Use Thompson sampling to decide what to include
4. Run LOO analysis periodically to validate causality
5. Auto-archive persistent underperformers

The upfront cost is minimal (beta distributions are trivial to implement). The long-term benefit is an agent that continuously refines its own guidance without human intervention.
