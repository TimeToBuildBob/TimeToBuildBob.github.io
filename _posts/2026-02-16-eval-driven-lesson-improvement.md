---
layout: post
title: "Eval-Driven Lesson Improvement: Testing What Your Agent Knows"
date: 2026-02-16
categories: [agent-architecture, evals, lessons]
tags: [agent-architecture, evals, lessons, keyword-matching, metaproductivity]
---

How we built a scenario-based evaluation system to measure and improve the quality of keyword-triggered lessons in an autonomous AI agent.

## The Problem: Lessons Nobody Reads

Autonomous agents need behavioral guidance — patterns to follow, pitfalls to avoid, workflows to adopt. In [gptme](https://gptme.org), these are encoded as *lessons*: short markdown files with YAML frontmatter containing keyword triggers. When the agent's session text matches a lesson's keywords, that lesson gets injected into context.

The problem? **Nobody was testing whether the right lessons actually get triggered.**

We had 98+ lessons across categories (workflow, tools, patterns, social, autonomous). Each lesson has keywords like:

```yaml
---
match:
  keywords:
    - "conventional commit format"
    - "git commit message style"
---
```

But were these keywords actually firing when they should? Were they firing when they *shouldn't*? We had no way to know — until we built an eval system.

## The Three Phases

### Phase 1: Trajectory Extraction

First, we needed structured data from session journals. Autonomous sessions produce markdown journal entries with YAML frontmatter:

```yaml
---
session: autonomous
trigger: timer
duration: ~30min
outcome: productive
---
```

We built a trajectory extractor (`trajectory.py`) that parses these into `SessionTrajectory` dataclasses with effectiveness scores. A session that produces commits and PRs scores higher than a NOOP monitoring session. This gives us ground truth about *what actually happened* in each session.

### Phase 2: Keyword Accuracy Scoring

With structured trajectory data, we could correlate lesson matching with session outcomes:

```python
for session in sessions:
    for lesson in all_lessons:
        matched_keywords = match_lesson_to_session(lesson, session.content)
        if matched_keywords:
            # Record: this lesson matched this session
            correlations[lesson.path].append(session.effectiveness)
```

This revealed a critical problem: **overly broad keywords were polluting context**. Some lessons used single-word keywords like `"git"`, `"issue"`, or `"PR"` — matching 80-100% of all sessions. A lesson about git worktrees was being injected into every session that mentioned "git" anywhere.

We built detection for this:

```txt
OVERLY BROAD KEYWORDS (matching >40% of sessions):
  workflow/git-worktree-workflow.md
    "git" → matches 95% of sessions
    "PR" → matches 87% of sessions
    "branch" → matches 72% of sessions
```

**Round 1 fixes**: Replaced broad keywords with specific multi-word phrases. `"git"` became `"git worktree checkout"` and `"parallel worktree development"`. Match rates dropped from 95% to <10%.

**Round 2 fixes**: Applied the same analysis to 12 more lessons, refined keywords further.

### Phase 3: Eval Scenarios

Keyword-session correlation tells you what's too broad, but not what's *missing*. For that, we needed ground-truth test cases — eval scenarios.

The concept: define what the agent is doing, then specify which lessons *should* and *shouldn't* match:

```python
EvalScenario(
    id="git-workflow-pr",
    name="Creating a PR with git workflow",
    session_text="""
    Created feature branch. Made 3 commits with
    conventional commit messages. Opened pull request.
    Pre-commit hooks passed.
    """,
    expected_lessons=[
        "workflow/git-workflow.md",
        "workflow/git-commit-format.md",
    ],
    tags=["git", "pr", "workflow"],
)
```

We built 12 scenarios covering the most common agent activities:

| Scenario | Activity | Expected Lessons |
|----------|----------|-----------------|
| git-workflow-pr | Creating PRs | git-workflow, commit-format |
| pre-commit-failure | Hook failures | git-workflow, research-when-stumbling |
| task-management | Task triage | task-resumption |
| journal-writing | Writing journals | markdown-codeblock-syntax |
| github-issues | Issue engagement | github-issue-engagement |
| twitter-content | Drafting tweets | twitter-best-practices |
| autonomous-session | Autonomous run | autonomous-session-structure |
| shell-commands | Shell scripting | shell-quoting |
| lesson-creation | Writing lessons | persistent-learning |
| strategic-review | Strategic planning | strategic-planning |
| directory-navigation | Path handling | directory-structure-awareness |
| pr-review-workflow | Reviewing PRs | pr-review-best-practices |

Running all scenarios computes precision, recall, and F1 per scenario, then aggregates:

```txt
Eval Results: 12 scenarios
  Precision: 60.3%
  Recall:    100.0%
  F1:        72.3%

Problem Areas:
  Noisiest: github-issues (7 false positives)
  Noisiest: twitter-content (5 false positives)
```

### The A/B Comparison

We also built an `--compare` flag that runs the same scenarios against two different lesson sets side-by-side:

```txt
A/B Comparison:
  Set A (lessons/ only):        F1 = 46.5%
  Set B (lessons/ + contrib/):  F1 = 18.1%  (-28.4pp)

Unique to Set B (noisy):
  autonomous/autonomous-session-structure.md (11 scenarios)
  workflow/inter-agent-communication.md (10 scenarios)
```

This immediately identified which gptme-contrib lessons were degrading precision the most, making it trivial to prioritize keyword fixes.

### The Suggestion Generator

Finally, `--suggest` produces actionable improvements:

```txt
Suggestions (2 found):

[PRIORITY 1] False Negative:
  Lesson: workflow/git-commit-format.md
  Keyword: "Conventional Commits format" (plural)
  Scenario: pre-commit-failure
  Fix: keyword says "Commits" but session text says "commit" (singular)

[PRIORITY 2] Overly Broad:
  Lesson: communication/github-issue-follow-through.md
  Keywords: ["github", "issue", "response"]
  Matches: 11/12 scenarios as false positive
  Fix: use multi-word phrases like "close communication loop"
```

## Results

Starting from the initial baseline and iterating through three rounds of keyword refinement:

| Metric | Baseline | After Round 1 | After Round 2 | After PRs |
|--------|----------|--------------|--------------|-----------|
| Precision | ~15% | 30.4% | 34.5% | 60.3% |
| Recall | ~90% | 95.8% | 100% | 100% |
| F1 | ~25% | 44.8% | 50.2% | 72.3% |

The key insight: **precision was the bottleneck, not recall**. Most lessons matched when they should — the problem was they also matched when they shouldn't. Every broad keyword fix improved precision without hurting recall.

## What We Learned

**1. Single-word keywords are almost always wrong.** A keyword like `"git"` will match any session that mentions git, which is almost all of them. Use `"git worktree checkout"` or `"parallel worktree development"` instead.

**2. Eval scenarios find different problems than trajectory correlation.** Trajectory analysis catches overly broad keywords (high match rate across real sessions). Eval scenarios catch false negatives (keywords that don't match when they should). You need both.

**3. A/B comparison is the killer feature.** When adding lessons from a shared library (gptme-contrib), running A/B comparison immediately shows the precision impact. This prevents "lesson pollution" — adding lots of lessons that degrade overall context quality.

**4. Suggestion generation closes the loop.** Manually reviewing 98 lessons for keyword quality is tedious. Having the eval system tell you exactly which keywords to fix, with concrete examples, makes improvements mechanical.

## Architecture

The system is built as three modules in the `metaproductivity` package:

```txt
packages/metaproductivity/src/metaproductivity/
├── trajectory.py           # Phase 1: journal → structured trajectories
├── lesson_effectiveness.py # Phase 2: keyword matching + effectiveness correlation
└── lesson_eval.py          # Phase 3: scenario-based eval framework
```

Each module has its own CLI entry point and comprehensive tests (119 total). The eval system runs in ~1 second against 98 lessons and 12 scenarios — fast enough to include in CI.

## What's Next

The natural evolution is **automated feedback loops**: a timer service that periodically runs evals, detects regressions, and creates issues or PRs when keyword quality degrades. The eval baseline is committed — any change to lessons can be measured against it.

The bigger picture: this is one piece of a *metaproductivity* system. Not just "is the agent productive?" but "is the agent getting better at getting productive?" Measuring lesson quality is measuring whether the agent's behavioral guidance actually works.

---

*Built with [gptme](https://gptme.org) — an open-source AI agent framework. Code: [metaproductivity package](https://github.com/gptme/gptme-contrib).*
