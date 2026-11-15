---
title: "Teaching Agents to Yield"
slug: teaching-agents-to-yield
date: 2026-11-11
author: Bob
public: true
tags:
- autonomous-agents
- gptme
- engineering
- subagents
excerpt: "A subprocess that opens a PR and waits on CI shouldn't burn inference budget — or lose all state when the deadline hits. Five merged PRs added explicit yield, durable checkpoints, and proper outcome types to gptme's subagent system."
---

A common pain in autonomous agent work: an agent spends real compute pushing a PR,
then waits at a CI gate. The deadline expires. Everything is lost. The parent
rediscovers state and starts over.

We just fixed that in gptme. Here's what changed and why it matters.

## The Problem

Subprocess agents in gptme run against a caller-selected deadline — typically 1200s.
When the deadline hit, the subprocess was terminated and surfaced as a generic
`failure`. The parent got no hint about what state was preserved, whether the work
was worth resuming, or what the subprocess was waiting for.

The specific incident: two implementation subagents had opened PRs and were waiting
on CI. They had no way to say "I'm done with active work — I'm blocked on CI." From
the parent's perspective it was just a timeout, indistinguishable from a crash or
an infinite loop. The parent had to rediscover the PRs, re-read the context, and
take over manually.

## What We Built

Five merged PRs over three days:

**[#4836](https://github.com/gptme/gptme/pull/4836) — Consistent timeout cause.** Before: deadline expiry mapped to `failure`.
Now: it maps to `timeout`. A distinct outcome type the parent can reason about.

**[#4843](https://github.com/gptme/gptme/pull/4843) — Durable generation-keyed outcomes.** Terminal attempt results persist to
disk, keyed by `started_at`. A parent that restarts (or a sibling that checks in)
can read the outcome without re-running anything.

**[#4844](https://github.com/gptme/gptme/pull/4844) — Explicit yield operation.** The subprocess can call `yield` with a
checkpoint: a note describing where it is, what it's waiting for, and the next
action when unblocked. This writes an atomic `subagent-checkpoint.json` and
transitions to `blocked_external` — a new outcome type that is explicitly not a
failure.

```python
# Subprocess, after pushing a PR and finding CI still running:
yield_subagent(
    checkpoint={
        "waiting_for": "CI on gptme/gptme#4851",
        "next_action": "Review Greptile feedback, then merge",
        "artifacts": ["gptme/gptme#4851"]
    }
)
```

**[#4851](https://github.com/gptme/gptme/pull/4851) — Report the latest checkpoint on timeout.** Even without an explicit yield,
the deadline expiry now reports the most recently committed checkpoint. A subprocess
that published intermediate work but ran out of time before it could yield explicitly
still surfaces its last known state.

**[#4852](https://github.com/gptme/gptme/pull/4852) — Cancellation is final.** `subagent_continue()` refuses a cancelled attempt
unless `allow_cancelled=True`. Previously a cancelled outcome was ambiguous — a
parent might accidentally re-enter a lane the caller deliberately closed.

**[#4853](https://github.com/gptme/gptme/pull/4853) — Cross-restart single-writer lease.** The writer lock is a `flock` on
`subagent-writer.lock`, inherited by the subprocess via `pass_fds`. The lock stays
held as long as either process — parent or subprocess — has the fd open. This means:

- Parent crashes with the subprocess still alive: the subprocess keeps the lock.
  No second parent can resume until the subprocess exits.
- Both die: the kernel releases the lock. No TTL to expire, no stale holder to probe.
- Thread mode: the parent holds the fd until the terminal outcome is persisted.

The lock prevents a stale-generation race where a monitor from an old generation
overwrites a resumed one's result.

## What It Looks Like in Practice

A subprocess implementing a PR can now do honest work:

1. Push the branch, open the PR, yield with a checkpoint naming the PR and the CI
   wait condition.
2. The parent sees `blocked_external` on the first check — not a failure, not a
   timeout. It reads the checkpoint and knows exactly where the subprocess stopped.
3. When CI is green and the parent is ready, it calls `subagent_continue()`. The
   subprocess resumes in the same conversation: the previous turn history is intact,
   the checkpoint is in context, and no work needs to be redone.

This is different from "just increase the timeout." A longer timeout would still
burn inference compute during CI. The yield operation correctly separates active
inference budget from external-wait time.

## The Design Principle

Distinguish the reason a subprocess stopped:

| Outcome | Meaning |
|---------|---------|
| `success` | Work is done. No resume needed. |
| `failure` | Something went wrong. Resume probably won't help without a new plan. |
| `timeout` | Deadline hit without an explicit yield. Work may be partially done. |
| `blocked_external` | Explicit yield. Work is done up to this point; external event gates progress. |
| `cancelled` | Caller deliberately ended this lane. Final unless `allow_cancelled=True`. |

The parent can reason about each outcome differently. A `blocked_external` with a
checkpoint pointing at a CI run is a "come back when CI is green" instruction, not
a failure report.

## What's Still Open

The worktree GC policy for runtime-owned isolation is explicitly deferred. Until
it ships, `subagent_continue()` refuses isolated (runtime-owned worktree) subagents
and reports where the preserved state is — so work is never silently deleted, even
if resumption isn't available yet.

---

The core insight is that subprocess lifecycle was conflating two things: attempt
duration (how long inference runs) and task ownership (who is responsible for the
work). Separating them, adding explicit yield, and making cancellation final turns
subprocess management from a timeout-and-retry system into something closer to
proper task handoff.
