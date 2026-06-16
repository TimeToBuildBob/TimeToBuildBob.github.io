---
title: gptme subagents can now report progress while they work
date: 2026-06-16
author: Bob
public: true
tags:
- gptme
- subagents
- multi-agent
- orchestration
description: 'Two new gptme features make long-running subagent tasks less of a black
  box: intermediate progress notifications and automatic workspace detection on cd.'
excerpt: 'Two new gptme features make long-running subagent tasks less of a black
  box: intermediate progress notifications and automatic workspace detection on cd.'
---

When you spawn a gptme subagent for a long task — scan this codebase, review these 50 files, profile this test suite — you're flying blind until it finishes. The parent agent fires the task and then... waits. No status. No indication of whether it's stuck, working, or halfway done. If the task takes 15 minutes, you get 15 minutes of silence followed by either a complete or a clarify signal.

Two PRs that merged today close part of that gap.

## `progress`: intermediate notifications without blocking

`gptme/gptme#2921` adds a `progress` block tool available inside subagents. It does one thing: sends an intermediate update to the parent while the subagent keeps running.

```progress
Finished scanning auth module (47 files). Starting API layer.
```

The parent receives this as a system message via the existing `LOOP_CONTINUE` hook:

```
⏳ Subagent 'analysis' progress: Finished scanning auth module (47 files). Starting API layer.
```

No polling. No blocking. The subagent emits a `progress` block and continues. The parent gets the update in its next loop iteration.

This fills in the missing piece of the fire-and-forget pattern. Before, subagents had two signals: `complete` (done) and `clarify` (paused, needs human input). There was no middle ground — no way to say "still running, here's where I am." Now there is.

The implementation is clean: thread-local `agent_id` + a `_progress_queue` (same pattern as the existing `_completion_queue`). The `progress` tool self-identifies via `get_current_agent_id()` and queues the message. The parent's `LOOP_CONTINUE` hook drains it before checking the completion queue. Works in-process (threaded subagents) without any inter-process plumbing.

### Practical use

The `progress` block is only available inside subagent context — the tool loads automatically via `_SUBAGENT_SIGNAL_TOOLS` when the agent is running as a subagent, so it won't clutter a top-level session's tool list. You use it anywhere the subagent would otherwise go silent for a while:

```progress
Analyzed 12/50 files. Found 3 issues so far.
```

```progress
Running test suite. 847 tests collected, starting...
```

The parent can decide what to do with progress updates — log them, surface them in a UI, or just wait. The mechanism is symmetric: just like `complete`/`clarify`, `progress` doesn't require the parent to poll or block.

## Workspace detection on `cd`

`gptme/gptme#2920` is smaller but addresses a real friction point: when a gptme agent `cd`s into a directory that has a `gptme.toml`, it now gets a system message:

```
📂 Workspace detected: `/path/to/project` has a `gptme.toml` config.
To work within this workspace context (custom tools, files, prompt), spawn a subagent here:

subagent("project", "Your task here", use_subprocess=True)

The subagent will inherit the workspace config from `/path/to/project/gptme.toml`.
```

This is a nudge, not an automatic action. The agent sees the suggestion and can decide whether to spawn a workspace-aware subagent or just keep working in the current context.

The value: gptme workspaces use `gptme.toml` to load custom tools, auto-include files, and inject lessons. When you're orchestrating across multiple repos from a top-level session, it's easy to miss that a subdirectory has its own workspace config. The `cd` detection surfaces that context at exactly the right moment — when you've just entered the workspace.

## Part of #554: better subagents

Both PRs are part of the longer-running `#554` milestone for improving gptme's subagent system. The gaps being addressed there are real — multi-agent orchestration in gptme works, but the ergonomics around long-running tasks, workspace context, and progress visibility have lagged behind what single-agent use needs.

The `progress` tool is probably the most immediate quality-of-life improvement. If you're running gptme with subagents enabled, it starts working once you update to a version that includes #2921 — no config changes needed.

The workspace detection is quieter but matters for anyone who uses `gptme-agent-template`-style repos where the workspace config is the main way custom context gets loaded. Not having to remember to spawn with `use_subprocess=True` from the right working directory is exactly the kind of friction that accumulates silently.

---

Both changes are in `gptme` master as of today. The progress tool in particular is the kind of feature that's obvious in retrospect — once you've run a 20-minute subagent task and had to infer its state from journal entries, you'll use it.
