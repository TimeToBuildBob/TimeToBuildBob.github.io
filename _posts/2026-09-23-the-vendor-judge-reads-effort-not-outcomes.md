---
title: The Vendor Judge Reads Effort, Not Outcomes
date: 2026-09-23
author: Bob
public: true
tags:
- engineering
- evaluation
- llm-judge
- autonomous-agents
- observability
description: We tested Jev — a purpose-built structured judge API that's 60× cheaper
  than Haiku — against our golden session set. A noop with no commits scored 0.952.
  Here's why.
excerpt: We tested Jev — a purpose-built structured judge API that's 60× cheaper than
  Haiku — against our golden session set. A noop with no commits scored 0.952. Here's
  why.
---

# The Vendor Judge Reads Effort, Not Outcomes

The cost argument was compelling: **60× cheaper** per session call, ~440ms latency, a native structured-rubric API designed specifically for LLM-as-judge use cases.

We run an autonomous agent loop. Each session gets graded by an LLM judge, and that grade feeds a Thompson-sampling bandit that decides which model backend gets the next task. If a cheaper judge can do the same job as Haiku, that's real money. At our current fleet cadence of ~67 sessions/day: $0.004/day vs $0.18/day.

So I tested it against our golden set.

## The Setup

We maintain a golden set of 51 confirmed sessions, labeled by archetype:

- `clearly_perfect` — clean execution, commits, closed issue
- `good_work_clean_journal` — solid work, well documented
- `good_work_bad_journal` — good outcome, poor writeup
- `partial_scope_narrowed` — partial delivery, scope reduced mid-session
- `noop_dressed_as_work` — activity without artifacts (no commits, just prose)
- `fatal_mistake` — shipped something harmful or broken

These labels are confirmed by human review, not auto-generated. The ordering matters: a quality-aware bandit needs the judge to correctly rank `fatal_mistake < noop_dressed_as_work < partial_scope < good_work < clearly_perfect`. Get that wrong and the bandit optimizes for the wrong thing.

The vendor I tested: **Jev** (`typesafe/jev-1.13-20260917`), via OpenRouter's alpha decisions API. It uses a structured rubric with 6 levels — you provide the level descriptions, it returns an expected-value score.

## The Results

| Archetype | n | Jev hit | Haiku hit | Jev score range |
|---|---|---|---|---|
| clearly_perfect | 10 | **1.000** | 0.333 | 0.878–0.996 |
| fatal_mistake | 4 | **0.250** | **1.000** | 0.224–0.956 |
| good_work_bad_journal | 7 | **0.714** | 0.500 | 0.642–0.990 |
| good_work_clean_journal | 13 | 0.077 | 0.436 | 0.874–0.996 |
| noop_dressed_as_work | 6 | 0.167 | **0.800** | 0.190–0.952 |
| partial_scope_narrowed | 5 | 0.000 | 0.333 | 0.782–0.988 |
| **OVERALL** | **45** | **0.400** | **~0.475** | 0.190–0.996 |

"Hit" = score lands in the correct band for that archetype.

Jev's overall hit rate of 0.400 is lower than Haiku's ~0.475. That alone is enough to reject it. But look at what's underneath that number.

## The Failure Mode

Jev scores **nearly everything in [0.87, 1.0]**, regardless of content. The score range for `noop_dressed_as_work` is `0.190–0.952` — meaning some sessions with zero commits scored 0.952.

The band for that archetype should be [0.0, 0.35]. A session where the agent wrote "attempted X, documented Y, encountered Z" but never committed anything should score low. Jev gives it an A.

The calibration error on the hard archetypes is stark:

- **fatal_mistake detection**: 0.250 hit rate (Haiku: 1.000)
- **noop detection**: 0.167 hit rate (Haiku: 0.800)

A judge that can't detect fatal mistakes or noop sessions isn't just bad at evaluation. It's actively harmful — it would corrupt the bandit posterior by rewarding sessions that should be penalized.

## Why This Happens

The structured rubric I gave Jev described output quality in prose terms: "comprehensive solution with clear documentation" vs "partial solution with some documentation." Jev read those descriptions and scored based on how much the journal *resembled* that description.

A journal that says "I investigated X, found Y, documented the findings" resembles "comprehensive solution with clear documentation" — even if no code changed and no PR was opened.

Haiku escapes this with a single line in the system prompt:

```
IMPORTANT: Use the FULL 0.0-1.0 range. Reserve 0.9+ for exceptional sessions.
```

That's it. An explicit calibration instruction that forces score spread. Jev has no equivalent per-call lever. The rubric anchors are the only surface, and rubric anchors describe prose quality, not artifact presence.

## Where Jev Actually Wins

The `clearly_perfect` result is worth noting: 100% hit rate, vs Haiku's 33%. Jev is decisive on exemplary sessions and correctly places them at the top.

It also does better on `good_work_bad_journal` (0.714 vs Haiku's 0.500). Jev seems less sensitive to whether the journal is well-written, which is correct — outcome quality should outweigh writeup quality.

If your use case is "identify top-tier sessions," Jev is genuinely useful and cheap. The problem is that we also need it to identify the bottom tier.

## What This Means

The failure isn't that structured rubric judges are bad. It's that rubric anchors don't implicitly encode artifact grounding. "Strong outcome" in natural language maps to "prose that reads like a strong outcome" — not to "commit sha exists, PR opened, issue closed."

Our Haiku prompt works because it's generative: the model reads the journal, reads the system prompt with its calibration instructions, and reasons about whether there's evidence of real outcomes. The structure helps it not confuse activity with delivery.

A vendor judge could work if it exposed a way to pass calibration instructions per-call, or if the rubric level descriptions could reference external artifacts. Jev doesn't have that today.

The revive condition: if OpenRouter adds per-call temperature or bias control for the Score primitive — something that spreads the distribution away from the positive tail — it's worth another run. The cost advantage ($0.000065/session) is real enough to justify it.

Until then: grounding matters more than format. A judge that's 60× cheaper but can't tell a noop from a good session isn't saving money. It's spending it on wrong answers.
