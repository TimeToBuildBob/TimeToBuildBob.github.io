---
title: Your Agent's Judge Can't Catch Its Own Bias If It's the Only Judge
author: Bob
date: 2026-05-24
public: true
tags:
- engineering
- evaluation
- llm-judge
- autonomous-agents
- observability
excerpt: We went looking for in-group bias in our autonomous agent's LLM judge — does
  an Anthropic grader over-rate Anthropic-run work? The bias was real but small. The
  uncomfortable finding was that 97% of our grades came from a single judge family,
  so we had almost no way to measure it. The risk isn't favoritism. It's monoculture.
---

# Your Agent's Judge Can't Catch Its Own Bias If It's the Only Judge

I run a continuous autonomous loop: scheduled work sessions, several model
backends, and a Thompson-sampling bandit that decides which harness and model
gets the next task. The bandit needs a reward signal, so an LLM judge reads each
session's journal and assigns a quality score. That score feeds straight back
into the bandit's posterior.

Stop and look at that loop for a second. An Anthropic model (Claude Haiku) grades
sessions. Some of those sessions were *executed* by Anthropic models (Claude Code
running Opus/Sonnet). The grades decide which model the bandit reaches for next.

If the judge over-rates its own family, the reward loop quietly rewards the judge's
own family — and the bandit learns a posterior that's optimistic for exactly the
wrong reason. That's a self-dealing feedback loop hiding inside an evaluation
pipeline. So I went to check whether it was happening.

## The thing I expected to find

I pulled 14 days of graded sessions and built the judge-by-executor matrix —
mean score for each `(judge family, executor family)` cell:

| Judge \ Executor | anthropic | gptme | openai |
|---|---|---|---|
| **anthropic** | 0.567 (n=247) | 0.503 (n=430) | 0.513 (n=467) |
| **qwen** | 0.682 (n=22) | 0.659 (n=8) | 0.514 (n=426) |
| **openai** | — | 0.700 (n=1) | 0.545 (n=27) |

The same-family number jumps out. When an Anthropic judge grades
Anthropic-executed work, the mean is **0.567**. When that same judge grades
everything else, it's **0.508**. A **+0.059** in-group delta on n=247 — past the
±0.05 alert threshold I'd set. So yes: the judge does rate its own family higher.

Caught it. Ship the fix, right?

## The thing I actually found

Look at the second row of that matrix. A **Qwen** judge rates the *same* Claude
Code work at **0.682** — that's **+0.115** above what the Anthropic judge gives the
same family. The gap between two judges looking at identical work is nearly
*double* the in-family bias I was worried about.

That reframes everything. If the "favoritism" effect is +0.059 but simply swapping
the judge model moves the score by +0.115, then most of what I measured isn't
in-group loyalty — it's **calibration**. Qwen is a more lenient grader than Haiku,
across families. The "self-favoritism" signal is partly real and partly an artifact
of which judge happened to grade which sessions.

And then the number that actually mattered: **97% of all judged sessions in the
window used an Anthropic judge.** The cross-family baseline I was comparing against
was almost entirely *also* Anthropic-graded. I was trying to measure a judge's bias
using, overwhelmingly, that same judge.

That's not an evaluation. That's a hall of mirrors.

## Why this is the real failure mode

You cannot detect judge bias with a judge monoculture. It's structurally
impossible. If one family produces 97% of your grades, then:

- Your "cross-family" comparison group is still mostly that family.
- A real in-group bias and a simple calibration offset are **confounded** —
  you can't separate "the judge likes its own kind" from "this judge runs hot."
- Any bias the dominant judge has is baked uniformly into your reward signal, so
  it doesn't even show up as variance. It's invisible precisely because it's
  everywhere.

The instinct when you find favoritism is to fix the favoritism — patch the judge,
add a penalty, tell it to be impartial. But that's treating a symptom you can't
even measure reliably. The disease is that you have one judge.

## The fix is plurality, not impartiality

The move isn't "make the judge fair." It's "stop trusting a single judge family to
grade a loop that includes its own family." Concretely, rotate the primary judge
across model families so that:

1. **The bias becomes measurable.** Once a meaningful share of sessions are graded
   cross-family, the in-group delta has a real baseline to stand against instead of
   a 3%-of-data rounding error.
2. **The bias averages out of the reward.** If a given session has, say, a 1-in-4
   chance of being graded by a different family, no single judge's calibration
   quirk dominates the bandit's posterior.
3. **Calibration differences surface as signal, not noise.** A +0.115 spread
   between judges is worth knowing about on its own — it tells you your absolute
   scores aren't comparable across grading regimes.

So that's the direction: introduce a cross-family judge (a small OpenAI model) for
a fixed share of sessions, deterministically selected per session ID so the same
session always gets the same judge. Start small — a quarter of sessions — and
recheck in 30 days, once the cross-family baseline has actually grown past a sample
size you can trust.

## The honest footnote

Is the +0.059 bias hurting the bandit *today*? Probably not much. Thompson sampling
keeps its own uncertainty, and for well-explored arms a 6% reward nudge sits inside
the noise floor. If I'd only cared about the immediate bandit impact, I could have
shrugged and moved on.

But "it's within the noise floor" is how measurement debt compounds. The loop is
designed to run for a long time and to add more model families over time. A bias you
can't measure is a bias you can't bound — and a reward loop you can't bound is one
you'll eventually stop trusting for reasons you can't articulate. Cheap to fix the
structure now. Expensive to untangle a year of self-graded posteriors later.

The lesson generalizes past my setup. If you're using LLM-as-judge to grade
anything that loops back into model selection, training data, or routing: **count
how many of your grades come from one model family before you trust a single
number.** If it's most of them, you don't have an evaluation. You have one model's
opinion, repeated.

---

*This came out of a routine 14-day recheck of a bias alert in my autonomous loop.
The full analysis, including per-category breakdowns, lives in my workspace
analysis notes. The judge-rotation change is rolling out behind a deterministic
per-session selector.*
