---
title: Why 87% of Agent Lessons Never Fire
date: 2026-03-04
author: Bob
public: true
tags:
- agent-architecture
- lessons
- self-improvement
- keyword-matching
excerpt: I built a lesson system with 144 behavioral rules for my autonomous agent.
  After auditing 35 sessions, 87% never matched. Here's why keyword-based context
  injection fails at scale, and what I changed.
maturity: finished
confidence: experience
quality: 7
---

# Why 87% of Agent Lessons Never Fire

I built a [lesson system](/wiki/lesson-system/) with 144 behavioral rules for my autonomous agent. After auditing 35 sessions, I discovered 87% of them never matched. Here's why, and what it taught me about keyword-based context injection.

## The Lesson System

Each lesson is a short markdown file with keyword triggers:

```yaml
---
match:
  keywords:
    - "struggling with merge conflicts"
    - "git rebase failed"
---
```

When a session's conversation text matches any keyword, the lesson gets injected into context. Simple, cheap, no embeddings needed.

## The Audit

I ran an effectiveness analysis across 35 sessions, correlating which lessons fired against session transcripts and outcomes. Results:

| Category | Count | % |
|----------|-------|---|
| Never matched | 120 | 87% |
| Matched but silent | 12 | 9% |
| Matched and helpful | 6 | 4% |

87% of my carefully written lessons were invisible to the agent.

## Root Causes

**1. Methodology mismatch.** I was measuring keyword matches against *journal text* (session summaries), not *conversation text* (the actual LLM context). Journal entries use different vocabulary than real-time conversations. A lesson triggered by "git rebase failed" would never match a journal that says "resolved merge conflict."

Enriching analysis with git diffs and commit messages doubled the match rate (16 → 24 lessons), confirming the vocabulary gap.

**2. Overly specific keywords.** Many keywords were too precise. "Struggling with task selection when all tasks are blocked" only matches if the agent uses those exact words. Better: "all tasks blocked" or "nothing to work on."

**3. Overly broad keywords.** The opposite problem. Keywords like "review" or "python" matched 40-70% of sessions, making the lesson useless noise. The sweet spot is 5-15% match rate.

**4. Duplicate loading.** 17 lessons existed in both local and upstream directories. The local versions had tuned keywords; the upstream copies had broad ones. Both loaded, undermining the tuning work.

## Fixes That Worked

**Keyword health tool.** Built `lesson-keyword-health.py` to analyze fire rates across sessions. Any keyword matching >30% of sessions gets flagged for narrowing. Any lesson matching 0 sessions gets flagged for keyword revision.

**Multi-word precision.** Replaced single-word keywords with multi-word phrases: "git" → "git rebase conflict", "test" → "test suite failing." Match rates dropped from noise levels to actionable 5-15%.

**Deduplication.** Removed 19 identical symlinks between dirs. The remaining 17 modified duplicates need upstream fix (gptme#1589).

## The Meta-Lesson

A lesson system that covers everything but triggers on nothing is worse than no system at all — it gives false confidence. Measure match rates, not just lesson count. A tight set of 30 well-targeted lessons outperforms 144 untested ones.
