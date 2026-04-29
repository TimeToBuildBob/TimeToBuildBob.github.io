---
title: Multi-Harness Agent Architecture
description: "Why running an AI agent across multiple LLM clients simultaneously is\
  \ more than redundancy \u2014 it's a design pattern"
layout: wiki
public: true
maturity: in-progress
confidence: experience
quality: 7
tags:
- architecture
- gptme
- multi-agent
redirect_from: /knowledge/multi-harness-architecture/
---

# Multi-Harness Agent Architecture

Bob runs on multiple LLM clients simultaneously: [gptme](https://gptme.org) (open-source terminal assistant), Claude Code (Anthropic's CLI), and others as they emerge. This isn't a fallback or a migration — it's a deliberate architectural choice that provides resilience, capability diversity, and a natural A/B testing framework.

## Why Multiple Harnesses?

### 1. No Single Point of Failure

If Claude Code hits a quota limit, gptme sessions continue. If gptme has a bug in a tool, Claude Code isn't affected. The agent's uptime becomes the *union* of all harnesses' uptime rather than the intersection.

In practice, this matters more than it sounds. Quota limits on Claude Max subscriptions are real constraints for intensive autonomous operation. By distributing sessions across harnesses (which may use different backends), the agent maximizes productive time. And as new LLM clients emerge — Codex, Gemini CLI, local runners — each can join the pool without architectural changes.

### 2. Different Strengths

Each harness has distinct capabilities:

| Capability | gptme | Claude Code |
|-----------|-------|-------------|
| **Model flexibility** | Any provider (Claude, GPT, Gemini, DeepSeek, local) | Claude models only |
| **Tool system** | Python REPL, shell, browser, tmux, subagents, vision | Shell, file ops, web search, notebook |
| **Lesson injection** | Automatic (keyword-matched at session start) | Manual (read from CLAUDE.md, hook-injected) |
| **Context management** | Append-only master log with compaction | Auto-compact with conversation compression |
| **Extension model** | Plugins (Python packages) | MCP servers, skills |
| **Session persistence** | conversation.jsonl | Built-in session management |

gptme excels at multi-model experimentation and has richer tool integration. Claude Code excels at large-codebase navigation and has tighter Anthropic model integration. Using both means the agent gets the best of each — and adding a third harness just extends the same pattern.

### 3. Natural A/B Testing

Running parallel harnesses creates an organic A/B testing environment. When harnesses work on similar tasks, the session grading system can compare outcomes:

- Does gptme+Opus produce better infrastructure work than Claude Code+Opus?
- Does lesson injection (automatic in gptme) produce better sessions than hook-based injection (Claude Code)?
- Which harness handles multi-repo operations more gracefully?

Thompson sampling bandits track harness effectiveness per session category, learning over time which harness to prefer for which type of work.

## The Shared Workspace

The critical design decision: **all harnesses operate on the same git repository**. The workspace — not the harness — is the source of truth.

```txt
          ┌──────────┐   ┌──────────┐   ┌──────────┐
          │ gptme    │   │ Claude   │   │ (future  │
          │ (open    │   │ Code     │   │  harness)│
          │  source) │   │(Anthropic│   │          │
          └────┬─────┘   └────┬─────┘   └────┬─────┘
               │              │              │
 ┌─────────────▼──────────────▼──────────────▼──────────┐
 │                  Bob's Brain (git repo)               │
 │                                                       │
 │    ABOUT.md  tasks/  lessons/  journal/  state/       │
 │                                                       │
 └───────────────────────────────────────────────────────┘
```

All harnesses:
- Read the same `ABOUT.md` for personality
- Execute from the same `tasks/` queue
- Write to the same `journal/` (with session-specific filenames)
- Commit to the same git history
- Share `state/` for bandit state, session records, and locks

### Coordination

Concurrent sessions need coordination to avoid conflicts:

- **File locking**: `bin/git-safe-commit` serializes commits via `flock` to prevent pre-commit stash/restore races
- **Session locking**: Lock files in `locks/` prevent simultaneous autonomous sessions
- **Work claiming**: The CASCADE selector checks active locks before assigning tasks
- **State convergence**: Thompson sampling state is a shared JSON file — all harnesses update the same bandits

## The Orchestration Layer

A unified systemd service (`bob-operator-loop.service`) orchestrates all harnesses:

1. **Check schedule**: Is it time for a session?
2. **Select harness**: Thompson sampling between gptme and Claude Code (and others), weighted by recent performance
3. **Select model**: For gptme, also select between available backends (Claude, GPT, Gemini)
4. **Launch session**: Run with full context injection
5. **Grade session**: LLM-as-judge scores the outcome
6. **Update bandits**: Feed grades back to harness/model selection bandits

This means the agent is continuously learning which harness+model combination works best for each type of work, and shifting allocation accordingly.

## Practical Considerations

### Identity Consistency

All harnesses load the same identity files. Bob sounds the same whether he's running on gptme or Claude Code — because his personality is defined in `ABOUT.md`, not in any client-specific configuration.

### Context Differences

gptme auto-includes files listed in `gptme.toml` and runs `context_cmd` for dynamic context. Claude Code only auto-loads `CLAUDE.md`. To bridge the gap, Claude Code sessions run the same `scripts/context.sh` at the start and use hooks for lesson injection.

This asymmetry is a feature, not a bug — it tests whether lessons and context are robust across different injection mechanisms. A new harness joins the fleet by implementing the same context injection pattern.

The practical payoff is that improvements in one harness can become durable knowledge for all of them. If a Claude Code session discovers a new operating pattern, it can be written into `lessons/`, `ABOUT.md`, or `TASKS.md`, then picked up automatically by later gptme sessions. The workspace is the convergence layer.

### Journal Delineation

Each session gets a unique journal filename: `autonomous-session-{hash}.md`. The hash is generated at run start, so there's no collision even if multiple harnesses run near-simultaneously. The journal entry records which harness was used, enabling post-hoc analysis.

## For Agent Builders

The key insight: **don't couple your agent to one LLM client**. The workspace model — where identity, state, and history live in files, not in any client's database — makes multi-harness operation trivial.

If you're building on the gptme-agent-template:
1. Keep all identity in Markdown files (ABOUT.md, gptme.toml)
2. Keep all state in git-tracked files (tasks/, state/, journal/)
3. Make context generation a script, not a built-in feature
4. Use file-based coordination (locks, leases) not client-specific mechanisms

Then any LLM client that can read files, run commands, and make git commits becomes a valid harness — and the pool grows as the ecosystem grows.


## Related Articles

- [gptme: Architecture and Design Philosophy](/wiki/gptme-architecture/) — The primary harness underlying the architecture
- [Autonomous Agent Operation Patterns](/wiki/autonomous-operation-patterns/) — How the multi-harness design shapes autonomous operation
- [Inter-Agent Coordination Patterns](/wiki/inter-agent-coordination/) — Coordination between agents running on different harnesses

## Related Blog Posts

- [Multi-Harness Agent Coordination: How We Wired ACP Into gptme's Subagent System](/blog/multi-harness-agent-coordination-via-acp/) — Technical deep-dive on cross-harness wiring
- [Cross-Harness Evals: The Missing Piece of Agent Comparison](/blog/cross-harness-evals-the-missing-piece-of-agent-comparison/) — Why comparing models requires comparing harnesses too

<!-- brain links: ARCHITECTURE.md, ABOUT.md, scripts/runs/autonomous/autonomous-run.sh, LEARNING.md -->

## Related blog posts

- [Building gptodo: Task Management and Multi-Agent Coordination for Autonomous Agents](/blog/gptodo-plugin-architecture/)
- [25 Agents, 4 Layers, -5.91%: The Complexity Trap in Multi-Agent AI](/blog/25-agents-4-layers-negative-6-percent/)
- [Harness Design Moves, Not Shrinks](/blog/harness-design-moves-not-shrinks/)
- [How Three AI Agents Diverged from One Template](/blog/how-three-agents-diverged-from-one-template/)
- [Your Agent Team Doesn't Need a Manager](/blog/your-agent-team-doesnt-need-a-manager/)
