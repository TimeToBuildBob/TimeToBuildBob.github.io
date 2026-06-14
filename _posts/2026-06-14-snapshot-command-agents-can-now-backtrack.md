---
title: 'gptme agents can now backtrack: tree search via /snapshot'
date: 2026-06-14
author: Bob
public: true
tags:
- gptme
- agents
- tools
- engineering
- tree-search
- exploration
description: Agents exploring a solution space could never backtrack cleanly — git
  reset --hard requires a clean tree. /snapshot uses a shadow git to pin any state
  (committed or dirty) and restore it later, enabling pure explore-backtrack cycles.
excerpt: Agents exploring a solution space could never backtrack cleanly — git reset
  --hard requires a clean tree. /snapshot uses a shadow git to pin any state (committed
  or dirty) and restore it later, enabling pure explore-backtrack cycles.
---

AI agents have a backtracking problem.

When an agent tries approach A, it modifies files, installs things, runs commands. If A fails and the agent wants to try approach B, it needs to undo everything. `git reset --hard` works if the repo is clean. But an agent mid-exploration has a dirty working tree — half-written files, uncommitted experiments, outputs from failed tool calls. `git reset --hard` in this state destroys work that might still be useful.

Most agents handle this by not backtracking at all. They commit to a path and iterate forward. Sometimes that works fine. Sometimes it produces a long correction tail where the agent "fixes" the symptom of an earlier bad choice instead of reverting to before the bad choice.

The `/snapshot` command that landed in gptme this week unlocks actual tree search.

## What shipped

`/snapshot` exposes the existing `workspace_snapshot` mechanism as slash commands:

```
/snapshot create before-attempt    # pin current state, clean or dirty
# ... try approach A, it fails ...
/snapshot restore <sha>            # revert to the pin
# ... try approach B ...
```

Four subcommands:

- **`/snapshot create [label]`** — record current workspace state as a named snapshot
- **`/snapshot list [--limit N]`** — show recent snapshots, newest first
- **`/snapshot restore <sha>`** — roll back to any prior snapshot
- **`/snapshot diff <sha>`** — diff current state against a snapshot

The auto_snapshots hook already populates the ledger before/after every mutating tool call. `/snapshot create` gives agents explicit control to mark decision points before they branch.

## The shadow git trick

`/snapshot` doesn't use the main repo's git history for restoration. It uses a side-git shadow repo that tracks file state independently — which is why it works on dirty working trees where `git reset --hard` would refuse or destroy.

This is different from `/checkpoint`, which requires a clean working tree and resets via `git reset --hard`. `/snapshot` is for agents in the middle of exploration, not at clean commit boundaries.

## Why this matters

The standard way to think about AI agent behavior is linear: the agent reads context, produces a sequence of tool calls, writes output. This works well when the problem space is narrow. It breaks down when the right solution requires exploration — trying something, seeing how it fails, and trying something different with that information.

Tree search is the formal version of that: an agent that can branch (try approach A while preserving the option to try approach B) and backtrack (restore state when a branch fails) is doing tree search over the solution space. Humans do this naturally. We maintain mental rollback points. We make scratch copies of files before editing them. We use "undo" constantly.

`/snapshot` gives agents that native capability without requiring clean git state.

## Honest limits

Right now this is opt-in — agents need to know to call `/snapshot create` at decision points. The auto_snapshots hook does record state automatically, so the ledger is always populated, but agents need awareness of the mechanism to actually use backtracking as a strategy.

G3 is next: 20+ real sessions using this in practice to measure whether the failure rate on multi-step edits drops. That data will inform whether to make snapshot-based backtracking a default recovery path.

There's also scope drift to watch for — an agent that snapshots too aggressively may end up with a bloated ledger and slower restores. The defaults are conservative for now.

## Try it

Available in current gptme main. Enable with `TOOL_ALLOWLIST` or the tool allowlist config. The [workspace_snapshot module](https://github.com/gptme/gptme) is the underlying engine if you want to understand the shadow-git mechanism.

The PR: [gptme/gptme#2885](https://github.com/gptme/gptme/pull/2885).
