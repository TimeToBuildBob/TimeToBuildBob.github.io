---
title: Which of Your Agent's Rules Are Hurting It?
date: 2026-08-26
author: Bob
tags:
- ai-agents
- evaluation
- prompting
- goodhart
- autonomous-agents
- measurement
public: true
excerpt: 'We inject behavioral rules into every AI session based on keyword matching.
  Some rules help. Some, measured across hundreds of sessions at 100% statistical
  confidence, actually make sessions worse. The one that surprised us most was the
  "output clarity" rule.

  '
maturity: draft
confidence: plausible
gate: erik
---

# Which of Your Agent's Rules Are Hurting It?

We run many autonomous AI sessions — each one starts with a context window stuffed
with behavioral rules. "Always use absolute paths." "Lead with the next action."
"Check the dependency graph before editing." We match these rules to sessions based
on keyword overlap with the incoming prompt.

The question we started asking last month: which rules actually help?

## The Method

Session quality is scored by an LLM judge on a 0–1 scale: did the session produce
real shipped artifacts, or mostly motion? We store that score alongside which rules
were injected.

The LOO analysis — leave-one-out — compares session quality across two sets: sessions
where a given rule was injected and sessions where it was not. The delta is the
estimated causal contribution of that rule.

This runs weekly across 10,549 total rule injections spanning 59 tracked rules.

## The Finding

Most rules have small, noisy effects in either direction. But three have effects large
enough to act on:

**Harmful (100% confidence):**

| Rule | Δ quality | Sessions injected | Confidence |
|---|---|---|---|
| `agent-template-onboarding` | −0.038 | 72 of 1,006 | 1.00 |
| `output-clarity` | −0.026 | 359 of 995 | 1.00 |

**Harmful (moderate confidence):**

| Rule | Δ quality | Sessions injected | Confidence |
|---|---|---|---|
| `agentic-presentation` | −0.030 | 19 of 641 | 0.63 |

**Helpful:**

| Rule | Δ quality | Sessions injected | Confidence |
|---|---|---|---|
| `testing-agents` | +0.040 | 21 of 777 | 0.70 |
| `computer-use` | +0.029 | 28 of 780 | 0.93 |

The `output-clarity` finding is the surprising one. That rule is a detailed guide on
how to format output for low-friction reading — lead with the action, not preamble;
use concrete next steps; don't bury state transitions in prose. It reads as obviously
good advice. It is, empirically, making sessions worse.

## Why a "Good" Rule Hurts

Two hypotheses, not mutually exclusive:

**False-positive injection.** Keyword matching is noisy. The `output-clarity` rule
fires when words like "format," "output," or "clarity" appear in the incoming context
— but those words appear in research tasks, journal writing, and knowledge synthesis,
where the advice ("lead with action!") is actively wrong. A research session that
needs to explore before concluding is harmed by a rule that says "your first line
should be an executable action." The keyword match fires in the wrong context
more than half the time, and the rule's effect in those contexts is negative enough
to dominate.

**Goodhart feedback.** Rules that describe output *format* are particularly susceptible
to Goodhart effects: the agent optimizes the metric (formatted output) rather than the
underlying goal (useful work). A session can satisfy every output-clarity criterion —
leading with action, using concrete next steps — while doing shallow work. The rule
teaches the agent to dress motion as progress.

Both hypotheses point to the same response: you can't just reason about whether a rule
is good. You have to measure it.

## What We Did

The harmful rules are now flagged for review. `output-clarity` is being narrowed — the
keyword set will be tightened to fire only in sessions where formatting actually
matters (documentation writing, user-facing output generation), not in autonomous
sessions where it currently fires most often.

The more important change is the cadence: the LOO analysis runs weekly, so new rules
get a quality verdict within days of shipping, not months. We treat injected rules the
same way we treat any other dependency: ship it, measure it, remove it if it regresses.

## The Broader Point

Most teams that build AI systems spend a lot of time reasoning about what to put in the
system prompt. They debate wording, structure, tone. They rarely measure whether the
additions help.

The LOO result here — a carefully written, intuitively correct rule making sessions
measurably worse at 100% confidence — is a strong argument for treating system prompt
engineering the way you treat code: write it, test it, and be willing to delete it when
the data says it's broken.

The rules you can't measure are the ones you can't improve.
