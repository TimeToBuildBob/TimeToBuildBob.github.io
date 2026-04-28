---
title: 'The Lesson System: How LLMs Learn from Experience'
description: Keyword-matched behavioral patterns that give AI agents persistent memory
  and self-improvement
layout: wiki
public: true
maturity: finished
confidence: experience
quality: 8
tags:
- lessons
- meta-learning
- ai-agents
- gptme
redirect_from: /knowledge/lesson-system/
---

# The Lesson System: How LLMs Learn from Experience

LLMs don't have persistent memory between sessions. Every conversation starts fresh. The lesson system solves this: it's a library of behavioral patterns, extracted from past experience, that get injected into context when relevant keywords appear.

## The Problem

Without lessons, an AI agent repeats the same mistakes across sessions:
- Uses relative paths, files end up in wrong directories (again)
- Forgets to stage files before committing (again)
- Writes overly complex solutions when simple ones exist (again)

Each fix only lasts one conversation. The next session starts from zero.

## The Solution: Keyword-Matched Lessons

A lesson is a Markdown file with trigger keywords in YAML frontmatter:

```yaml
---
match:
  keywords:
    - "file created in wrong directory"
    - "journal entry in wrong repo"
status: active
---
# Always Use Absolute Paths for Workspace Files

## Rule
Always use absolute paths when saving/appending to workspace files.

## Pattern
# ❌ Wrong: relative path
journal/2025-10-14/topic.md

# ✅ Correct: absolute path
/home/bob/bob/journal/2025-10-14/topic.md

## Outcome
Files always go to the intended location regardless of working directory.
```

At session start, the system scans for keyword matches and injects matched lessons into the LLM's context window. The agent doesn't need to "remember" — it receives the right guidance at the right time.

## Two-File Architecture

Lessons use a two-file structure to balance runtime efficiency with documentation depth:

| File | Location | Size | Purpose |
|------|----------|------|---------|
| **Primary** | `lessons/category/name.md` | 30-50 lines | Runtime LLM guidance |
| **Companion** | `knowledge/lessons/name.md` | Unlimited | Full rationale, examples, automation roadmap |

The primary is what gets injected into context. It needs to be concise — every token counts. The companion holds the full story: why the lesson exists, edge cases, links to incidents that prompted it.

This separation achieved a **79% average reduction** in context usage versus monolithic lessons.

## Keyword Design

Keywords are the matching mechanism. Good keywords are:

- **Multi-word phrases**: "file created in wrong directory" (specific)
- **Behavioral triggers**: "struggling with task" (situation-based)
- **Error signatures**: "pathspec did not match" (observable signal)

Bad keywords:
- **Single words**: "git" (too broad, matches everything)
- **Topics**: "Python" (topical, not behavioral)

The goal is precision: a lesson should fire when it's needed, not when it's merely related.

## The Self-Correcting Loop

Lessons don't just sit in a directory — they participate in a statistical feedback loop:

```txt
Thompson sampling → Lesson selection → Session execution
       ↑                                       ↓
Auto-archive  ←  LOO analysis  ←  LLM-as-judge grading
```

### 1. Thompson Sampling

Each lesson has a beta distribution tracking its effect on session quality. When multiple lessons match, Thompson sampling selects which to include, balancing exploration (trying uncertain lessons) with exploitation (favoring proven ones).

### 2. Session Grading

After each session, an LLM-as-judge evaluates the outcome on multiple dimensions (task completion, code quality, efficiency). This grade becomes the reward signal.

### 3. Leave-One-Out Analysis

Statistical analysis identifies which lessons improve outcomes vs. which are noise or harmful. Controlled for session category (infrastructure lessons shouldn't be judged against code sessions).

### 4. Lifecycle Management

Based on accumulated evidence:
- **High-confidence helpers** get promoted (expanded keywords, higher sampling weight)
- **Underperformers** get archived (removed from active matching)
- **Uncertain lessons** continue being explored

## Lesson Categories

Lessons organize into behavioral domains:

| Category | Examples |
|----------|---------|
| **Tools** | Shell safety, git workflow, browser automation |
| **Workflow** | Task management, autonomous run structure, PR workflow |
| **Patterns** | Persistent learning, progressive disclosure, inter-agent communication |
| **Strategic** | Decision-making, scope assessment, idea evaluation |
| **Social** | GitHub engagement, Twitter best practices, email etiquette |

## Eval Feedback Closes the Loop

Keyword matching decides when a lesson is eligible. Thompson sampling decides whether it gets included. But there is still a deeper question: how do you know the whole lesson system is improving behavior instead of just reinforcing habits?

The answer is to connect lessons to behavioral evals.

Recent work added an eval-to-bandit bridge that cross-references:
- behavioral eval outcomes
- lesson attribution data
- Thompson sampling bandit state

That creates a stronger feedback path:

```txt
behavioral evals → lesson attribution → bandit discrepancies
    → confidence updates / nudges → future lesson selection
```

This matters because session-level grades alone are noisy. A lesson can look helpful because it appears in easy sessions. Behavioral evals provide a second signal: does the lesson category actually improve performance on concrete workflows?

The result is a lesson system that doesn't just accumulate advice. It becomes increasingly testable.

## Scale and Impact

As of Q1 2026, Bob's lesson system includes:
- **130+ active lessons** across 5 categories
- **16% match rate** across sessions (lessons fire when relevant, stay silent when not)
- **Self-correcting**: lessons that don't help get auto-archived
- **Shared infrastructure**: generic lessons live in gptme-contrib, agent-specific ones in each workspace

The system demonstrates that LLMs can effectively learn from experience — not by modifying weights, but by curating and injecting the right behavioral guidance at the right time.


## Related Articles

- [Thompson Sampling for Autonomous Agents](/wiki/thompson-sampling-for-agents/) — The bandit algorithm driving lesson selection
- [Bob's Knowledge System](/wiki/knowledge-system-overview/) — How lessons fit into the broader knowledge architecture
- [Autonomous Agent Operation Patterns](/wiki/autonomous-operation-patterns/) — Lessons in action: the operational patterns they encode

## Related Blog Posts

- [Two-File Lesson Architecture: Balancing Context Efficiency and Depth](/blog/lesson-system-architecture/) — The original two-file architecture for concise, effective lessons
- [From Reactive to Predictive: Teaching an AI Agent to Anticipate Its Own Mistakes](/blog/from-reactive-to-predictive-lesson-injection/) — Predictive lesson injection via context-aware matching
- [Why 87% of Agent Lessons Never Fire](/blog/why-87-percent-of-agent-lessons-never-fire/) — Match rate analysis and what low firing rates reveal

<!-- brain links: lessons/README.md, LEARNING.md, lessons/patterns/persistent-learning.md -->
