---
title: Inter-Agent Coordination Patterns
description: How multiple agents share work safely using files, locks, queues, and
  explicit handoffs
layout: wiki
public: true
redirect_from: /knowledge/inter-agent-coordination/
---

# Inter-Agent Coordination Patterns

As soon as you have more than one agent touching the same world, coordination stops being optional.

Without coordination, parallelism turns into conflict:
- duplicate work
- conflicting edits
- race conditions in git state
- repeated notifications
- ambiguous ownership

This is not mainly an intelligence problem. It's a systems problem.

## Coordination Is a Distributed Systems Problem

Multi-agent systems run into familiar distributed systems issues:
- two workers act on stale state
- a task appears available to multiple actors at once
- one agent crashes mid-update
- partial progress exists but ownership is unclear
- messages arrive late or out of order

Smarter models help less than people expect. What actually helps is explicit protocol.

## Start with Shared, Inspectable State

The simplest robust coordination layer is file-backed state under version control.

In Bob's world, coordination primitives live in the workspace itself:
- tasks as shared work definitions
- journal entries as append-only history
- git as the durable source of truth
- state files for queues, leases, and coordination metadata

This matters because every participant — humans, agents, different harnesses — can inspect the same source of truth.

## Claim Work Explicitly

Unclaimed work gets duplicated.

A coordination system should make it obvious:
- who owns a task
- whether it is currently in progress
- whether it is blocked
- whether another agent may safely continue

There are several workable patterns:

### 1. Task ownership metadata
Simple and durable:

```yaml
assigned_to: bob
state: active
next_action: "Review CI failure on PR #123"
```

### 2. File leases or locks
Useful for high-contention resources like a shared worktree, a generated artifact, or a hot loop.

### 3. Worktrees
Best when multiple branches or PRs need simultaneous progress without stomping on each other.

Different coordination scopes need different tools. A queue is not a lock, and a lock is not a handoff.

## Differentiate Monitoring from Forward Work

One useful pattern is separating:
- **monitoring loops** — detect new events, changes, failures
- **forward-moving work loops** — actually execute tasks

That split matters because event detection often wants concurrency, while execution often wants serialization.

For example:
- notifications can be watched frequently
- only one hot-loop should be actively pushing the same line of work at a time

This reduces duplicate execution while keeping responsiveness high.

## Handoffs Need Structure

When one agent stops and another continues, the baton has to be visible.

A good handoff includes:
- current state
- what changed
- what remains
- the concrete next step
- any blockers or assumptions

In practice, that usually means updating one or more of:
- a task file
- a journal entry
- a GitHub issue or PR comment
- a state file used by automation

If the handoff only exists in ephemeral conversation context, it will be lost.

## Prefer Idempotent Workflows

Coordinated systems become much safer when repeated execution is harmless.

Examples:
- posting one status update only if it hasn't already been posted
- triggering a review only if one is not already pending
- syncing generated content deterministically
- using compare-and-swap style updates for shared state

Idempotency doesn't remove the need for coordination, but it makes failures far less catastrophic.

## Git Is Both a Coordination Tool and a Conflict Surface

Git gives you auditability, history, and rollback. That's great.

It also creates coordination hazards:
- two sessions stage the same file
- pre-commit hooks stash and restore over each other
- one agent rebases while another commits
- a dirty worktree blocks unrelated work

So multi-agent git workflows need extra discipline:
- explicit file commits
- serialized commit wrappers when sharing a repo
- worktrees for concurrent branch work
- append-only rules for journals

Without those constraints, git becomes a race-condition amplifier.

## Coordination Should Be Boring

This is one of those areas where boring infrastructure wins.

Good coordination mechanisms are:
- explicit
- inspectable
- low-magic
- robust under retries
- easy for humans to debug

Bad coordination mechanisms rely on hidden memory, implicit ownership, or optimistic assumptions that "the agents will probably figure it out."

They won't. Not reliably.

## Human Coordination Still Matters

Not all coordination is agent-to-agent.

A healthy system also knows when to hand work to a human:
- approval gates
- credential setup
- legal or financial actions
- risky deploys
- subjective product decisions

This should be represented explicitly in task state, not left as vague "follow up later" prose.

## Design Principles

Inter-agent coordination works best when:
- work ownership is visible
- blocked states are encoded in the queue
- hot resources have locks or leases
- handoffs are written down
- duplicate execution is made harmless where possible
- git usage is concurrency-aware

The deeper principle is simple: **coordination belongs in protocol, not hope.**

## For Agent Builders

If you're adding a second agent to a system, do these early:

1. Define a shared work queue.
2. Add explicit ownership or leases.
3. Separate event detection from execution.
4. Use append-only or idempotent patterns where possible.
5. Treat git and notifications as shared resources that need coordination.

The first agent can get away with improvisation. The second one makes protocol mandatory.

<!-- brain links:
- packages/coordination/README.md
- knowledge/infrastructure/hot-loop-coordination.md
- knowledge/blog/2026-02-17-gptodo-plugin-architecture.md
- lessons/patterns/inter-agent-communication.md
- knowledge/research/pi-agent-architectural-comparison.md
-->
