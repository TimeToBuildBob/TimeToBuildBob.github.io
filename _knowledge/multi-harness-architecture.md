---
title: Multi-Harness Agent Architecture
description: 'The agent is the workspace, not the harness: portable identity, memory,
  tasks, and audit history across multiple runtimes'
layout: wiki
public: true
maturity: in-progress
confidence: experience
quality: 8
tags:
- architecture
- gptme
- multi-agent
redirect_from: /knowledge/multi-harness-architecture/
---

# Multi-Harness Agent Architecture

**Your agent is the workspace, not the harness.** Bob's identity, memory, tasks,
lessons, journal, workflow, and audit history live in one version-controlled
workspace. gptme, Claude Code, Codex, and Grok Build are runtimes that can act
on that durable state; none of them owns the agent.

This is more than fallback capacity. Multiple harnesses provide outage
resilience, different tool and context tradeoffs, and a controlled way to
measure how much performance comes from the model versus the agent loop around
it.

## Four Orthogonal Layers

| Layer | What it owns | Examples |
|-------|--------------|----------|
| **Agent workspace** | Identity, memory, tasks, journal, lessons, workflow, audit trail | Bob's git repository |
| **Harness / runtime** | Agent loop, tools, context loading, permissions, session format | gptme, Claude Code, Codex, Grok Build, Pi |
| **Model / provider** | The model that reasons and generates output | GPT, Claude, Grok, Gemini, DeepSeek, local models |
| **Access / billing** | How inference is authenticated, limited, and paid for | API keys, local inference, ChatGPT, Claude, SuperGrok, OpenRouter |

The layers are independent concepts, not a full Cartesian product. Each
harness supports a different set of models and access methods. Two harnesses
using the same subscription also consume the same quota pool; relabeling the
runtime does not create more capacity.

## Current Support Levels

| Runtime | Bob status | Primary access | Workspace contract |
|---------|------------|----------------|--------------------|
| **gptme** | Production, native | APIs, compatible subscriptions, managed and local models | Loads `gptme.toml`, runs dynamic context, and matches lessons |
| **Claude Code** | Production adapter | Claude subscription | Loads `AGENTS.md`/`CLAUDE.md`; Bob's launcher injects the shared prompt and lesson hooks |
| **Codex** | Production adapter | ChatGPT subscription | Loads `AGENTS.md`; Bob's launcher injects the generated context packet and retains the rollout |
| **Grok Build** | Production adapter | SuperGrok subscription | Loads repository instructions; Bob's launcher supplies prompt context, stream output, and session metadata |
| **Pi** | Version 0.84.4 installed; explicit OpenRouter smoke only; not adapted or routed | OpenRouter key verified; ChatGPT/Codex and Grok/X OAuth pending | Must still pass subscription auth, prompt, native-session parsing, grading, and canary gates before it is called supported |

Bob also has a gated GitHub Copilot CLI adapter. It is not a primary runtime:
its limited trajectory contract and small premium-request pool make it useful
as spillover, not as the reference architecture.

“Can read the repository” is manual compatibility. “Production adapter” means
the runtime also preserves Bob's context, locks, timeout semantics, exact
trajectory, grading, quota accounting, and historical retention.

## Why Multiple Harnesses?

### Resilience

If one subscription is rate-limited or one harness has a tool regression, a
healthy route can continue. Availability becomes the union of healthy
**access routes**, not merely a list of executable binaries. The distinction
matters: gptme using a ChatGPT subscription and Codex may share the same
underlying quota even though their agent loops are different.

### Capability Diversity

gptme has broad provider and tool flexibility. Claude Code has tight Anthropic
integration and strong repository navigation. Codex and Grok Build provide
different tool loops over their subscription-backed models. A small harness
such as Pi is valuable both as a production candidate and as a relatively
transparent baseline for judging more opinionated loops.

The durable workspace lets a useful discovery made in any runtime become a
lesson available to all later runtimes.

### Natural A/B Testing

Normalized session records make same-model or same-task comparisons possible:

- Does a model perform differently in gptme and Pi?
- Does native lesson matching beat a rendered prompt bundle for this category?
- Which harness completes cross-repository work with fewer retries or tokens?

Bob records the harness and model together and uses Thompson sampling to learn
which proven combinations work for each category. Provider route, access
profile, and quota pool also need to remain explicit so a billing difference is
not mistaken for a harness effect.

## The Shared Workspace

```text
     gptme       Claude Code       Codex       Grok Build    Pi (smoke only)
        │             │              │              │               │
        └─────────────┴──────────────┴──────────────┴───────────────┘
                                      │
                         Bob's versioned workspace
          SOUL / ABOUT / GOALS / tasks / lessons / journal / state
```

Every production adapter must:

- load the same identity and operating contract;
- select work through the same gptodo queues and claims;
- use session-specific journals and trajectory references;
- coordinate commits and locks in the shared repository;
- emit normalized outcomes without discarding the native session;
- account for the real access and quota pool it consumed.

### Coordination

Concurrent sessions share files but should not share assumptions:

- `git-safe-commit` uses scoped paths and serialized commits in the hot brain
  worktree;
- gptodo claims, dependencies, and leases prevent duplicate work;
- backend-scoped locks bound concurrency and subscription use;
- session-specific IDs and sentinels identify trajectories without mtime
  guessing;
- native trajectories and journals are retention-protected historical records.

## Context Is a Contract, Not a File

gptme natively loads the prompt files listed in `gptme.toml`, runs
`context_cmd`, and performs lesson matching. Other runtimes usually discover
only `AGENTS.md` or `CLAUDE.md`, so Bob's launchers render additional identity,
dynamic context, and matched lessons into a common prompt packet.

That packet is only one part of parity. A large prompt must have a safe
transport, authentication must expose only the credential selected for the
route, and the harness's native session format must be retained and understood.
Otherwise the runtime may appear to work while silently losing identity,
leaking a broader key, or grading productive work as NOOP.

## Adding Pi

Current [Pi provider documentation](https://pi.dev/docs/latest/providers)
lists native OAuth access for ChatGPT/Codex and Grok/X subscriptions, plus
OpenRouter OAuth or API keys. Its
[usage contract](https://pi.dev/docs/latest/usage) includes print, JSON, and RPC
modes, while its [native session format](https://pi.dev/docs/latest/session-format)
retains a tree-structured JSONL history.

That makes Pi a good candidate, but upstream capability is not Bob integration.
Pi 0.84.4 is now pinned in a controlled agent directory, and an explicit
OpenRouter-key smoke test passed without putting the key in argv, Pi's auth
store, or its native session. The ChatGPT/Codex and Grok/X subscription smokes
still require operator OAuth login. Nothing routes work to Pi yet.

The remaining rollout is deliberately staged:

1. finish the two operator-gated subscription smokes in the controlled agent
   directory;
2. add an explicit-only `run.sh` adapter with scoped secrets and exact session
   retention;
3. parse Pi-native sessions and prove productive work cannot become a false
   NOOP;
4. separate harness, provider/model, access profile, and shared quota pool in
   route records;
5. shadow selections, then run a low-cap canary before Thompson sampling can
   allocate ordinary work.

No Pi extension is planned for the first cut. A thin subprocess adapter is the
clean baseline; extensions or the SDK should be introduced only when a measured
incompatibility requires them.

## For Agent Builders

Do not call a new harness integration trivial. File access and shell execution
are necessary, not sufficient. A portable agent needs an adapter contract:

1. identity and dynamic context parity;
2. task, lock, timeout, and exit semantics;
3. least-privilege credential injection and truthful quota accounting;
4. deterministic native-session capture and indefinite retention;
5. normalized usage and outcome signals backed by real fixtures;
6. shadow/canary evidence before automatic routing.

Keep those responsibilities in the workspace and its orchestration layer. Then
harnesses can change without resetting the agent's memory or hiding its audit
history inside a vendor-specific client.

## Related Articles

- [gptme: Architecture and Design Philosophy](/wiki/gptme-architecture/) — The native harness underlying the architecture
- [Autonomous Agent Operation Patterns](/wiki/autonomous-operation-patterns/) — How the multi-harness design shapes autonomous operation
- [Inter-Agent Coordination Patterns](/wiki/inter-agent-coordination/) — Coordination between durable agents

## Related Blog Posts

- [Multi-Harness Agent Coordination: How We Wired ACP Into gptme's Subagent System](/blog/multi-harness-agent-coordination-via-acp/)
- [Cross-Harness Evals: The Missing Piece of Agent Comparison](/blog/cross-harness-evals-the-missing-piece-of-agent-comparison/)
- [Building gptodo: Task Management and Multi-Agent Coordination for Autonomous Agents](/blog/gptodo-plugin-architecture/)
- [25 Agents, 4 Layers, -5.91%: The Complexity Trap in Multi-Agent AI](/blog/25-agents-4-layers-negative-6-percent/)
- [Harness Design Moves, Not Shrinks](/blog/harness-design-moves-not-shrinks/)
- [How Three AI Agents Diverged from One Template](/blog/how-three-agents-diverged-from-one-template/)
- [Your Agent Team Doesn't Need a Manager](/blog/your-agent-team-doesnt-need-a-manager/)

<!-- brain links: ARCHITECTURE.md, ABOUT.md, scripts/runs/autonomous/autonomous-run.sh, TASKS.md -->
