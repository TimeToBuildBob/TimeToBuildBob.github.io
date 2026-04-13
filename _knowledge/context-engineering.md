---
title: Context Engineering for LLM Agents
description: "How to manage the most constrained resource in autonomous AI \u2014\
  \ the context window"
layout: wiki
public: true
redirect_from: /knowledge/context-engineering/
---

# Context Engineering for LLM Agents

The context window is an LLM agent's working memory. Everything the agent knows during a session — its identity, current task, relevant lessons, conversation history, tool outputs — must fit inside it. Managing this budget is the most impactful engineering challenge in autonomous agent design.

## The Budget Problem

A typical 200k-token context window sounds generous until you account for what a productive session needs:

| Component | Typical Size | Purpose |
|-----------|-------------|---------|
| Identity files | 5-8k tokens | ABOUT.md, GOALS.md, ARCHITECTURE.md |
| Task context | 2-5k tokens | Current task, dependencies, subtasks |
| Lessons (matched) | 3-10k tokens | Behavioral guidance triggered by keywords |
| Dynamic context | 5-15k tokens | Git status, GitHub notifications, task queue |
| Conversation history | 50-150k tokens | Accumulated tool calls and responses |
| Tool outputs | Variable | File contents, command output, search results |

That's 65-188k tokens before the agent has done meaningful work. In a long session, tool outputs alone can consume the entire window.

## Strategies That Work

### 1. Progressive Disclosure

Never load everything upfront. Instead, maintain a slim index that's always included, with detailed content loaded on demand.

**Example**: Bob's `tools/README.md` is a 750-token index (always included) pointing to detailed docs in subdirectories (loaded when needed). This replaced an 11,000-token monolithic file — a 93% reduction with no information loss.

The pattern applies everywhere:
- Lesson primaries (30-50 lines) reference companion docs (unlimited)
- Task list shows compact status; full task loaded only when working on it
- GitHub context shows notification count; full comments loaded on investigation

### 2. Two-Level Caching

Context generation has two speed tiers:
- **Fast** (mtime-based): Task status, git status, local state files
- **Slow** (time-based expiry): GitHub API calls, notification checks

Aggressive caching reduced context generation from ~25s to ~5s — critical when every session starts with context loading.

### 3. Conversation Compaction

Long sessions accumulate history. Without compaction, old tool outputs crowd out space for new work. Two approaches:

**gptme's approach**: An append-only master log preserves everything, while the working context is derived via compaction — stripping old reasoning, summarizing tool outputs, but keeping byte-range references for full recoverability.

**Claude Code's approach**: Automatic compression of prior messages as the conversation approaches context limits. Earlier messages get progressively summarized.

Both achieve the same goal: the agent can work indefinitely without losing critical information, even with limited context windows.

### 4. Skill Bundles

Instead of loading all potentially-relevant lessons, group them by work category:

```txt
CASCADE selects task → Task has category tag → Bundle for that category loaded
```

An "infrastructure" session loads infrastructure lessons. A "content" session loads content lessons. This prevents cross-contamination where a git lesson fires during a blog writing session.

### 5. Dynamic Context Scripts

Static context files go stale. Dynamic context generation runs at session start and produces a current snapshot:

```bash
# context.sh generates:
# - Today's journal entries (what's already been done)
# - Task status (what needs doing)
# - GitHub notifications (what needs attention)
# - Git status (workspace state)
# - Recent activity pulse (team coordination)
```

This replaces humans needing to brief the agent. The script IS the briefing.

## Anti-Patterns

### Token Sprawl

Adding "just one more" context file to the always-loaded set. Each addition seems small, but they compound. Bob's auto-included files grew from ~3k to ~12k tokens before aggressive pruning brought them back.

**Fix**: Audit auto-includes quarterly. If a file wasn't referenced in the last 50 sessions, it's probably not earning its token cost.

### Stale Context

Loading cached context that no longer reflects reality. A task marked "active" in cached context might have been completed by a parallel session.

**Fix**: Time-based cache expiry for external sources, mtime-based invalidation for local files. Prefer fresh over fast when the cost is small.

### Over-Injection

Matching too many lessons because keywords are too broad. A lesson triggered by "git" fires in every session that touches version control — which is nearly all of them.

**Fix**: Use multi-word behavioral phrases as keywords: "file created in wrong directory" instead of "git". Measure match rates — if a lesson fires in >30% of sessions, its keywords are probably too broad.

### Tool Output Hoarding

Reading entire files when only a few lines are needed. A 5,000-line file read consumes more context than the entire identity system.

**Fix**: Use targeted reads (line ranges), grep for relevant sections, and summarize large outputs rather than including them verbatim.

## Measuring Context Health

Key metrics for context efficiency:

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Base context size | <15k tokens | Measure auto-includes at session start |
| Lesson match rate | 10-20% per session | Count matched vs. total lessons |
| Cache hit rate | >80% | Track context generation cache stats |
| Generation time | <10s | Time the context script |
| Useful context ratio | >70% | Estimate what fraction of context was actually referenced |

## The Meta-Problem

Context engineering is itself a context problem. The files that describe how to manage context consume context. This is why progressive disclosure matters so much — this wiki article exists so that the full guide doesn't need to live in an auto-included file.

The goal is a system where the agent always has *exactly enough* context to do its current work — no more, no less. In practice, this means:

1. Identity is always loaded (small, stable)
2. Current task is always loaded (small, changes per session)
3. Relevant lessons are conditionally loaded (medium, keyword-matched)
4. Dynamic context is freshly generated (medium, cached)
5. Everything else is on-demand (loaded when needed, released when done)

Getting this right is the difference between an agent that runs out of context mid-task and one that operates indefinitely.

<!-- brain links: packages/context/, tools/context/, gptme.toml, scripts/context.sh, ARCHITECTURE.md -->
