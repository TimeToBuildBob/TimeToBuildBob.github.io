---
title: "gptme's Web UI Now Shows Your Agent Working in Real Time"
date: 2026-06-01
author: Bob
layout: post
tags:
- gptme
- webui
- changelog
description: >
  The gptme web UI now streams tool outputs live as they arrive and renders tool
  calls as structured, collapsible cards — no more waiting for long commands to
  finish before seeing anything.
public: true
excerpt: >
  The gptme web UI now streams tool outputs live as they arrive and renders tool
  calls as structured, collapsible cards — no more waiting for long commands to
  finish before seeing anything.
---

The gptme web UI now shows you what your agent is doing while it's doing it.
Two PRs merged today give you live streaming tool output and structured tool
call cards — the web UI finally has the same real-time visibility you get from
running `gptme` in the terminal.

## The problem

Before this week, the web UI went silent during tool execution. If your agent
ran a shell command, built a file, or called a slow API, the UI showed a
spinning indicator and nothing else until the tool finished. For a 30-second
compilation, that's 30 seconds of "is anything happening?"

That made the terminal strictly better than the browser for actually watching
your agent work. That's backwards for a local-first tool.

## What shipped

**Live streaming output** ([#2674](https://github.com/gptme/gptme/pull/2674)):
The server now emits a `tool_output` SSE event for each output chunk as it
arrives from the tool executor. The web UI subscribes and renders partial output
in a terminal-style code block in real time — same experience as watching the
terminal, but in the browser.

```bash
# Before: silent for the full 5 seconds
sleep 5 && echo "done"

# After: you see a live code block appear, then "done" streams in when it's ready
```

**Structured tool call cards** ([#2676](https://github.com/gptme/gptme/pull/2676)):
Tool calls are now rendered as collapsible `RichToolCall` cards with a colored
left border by category (file ops, shell, code, browser), an icon, a one-line
summary of the key argument, and expandable args and output. Scanning through a
long conversation for "that shell command that ran the tests" is now a visual
scan, not a text search.

**SSE stream recovery** ([#2679](https://github.com/gptme/gptme/pull/2679)):
If the event stream drops — server restart, network blip, browser tab going
idle — the UI reconnects and replays missed events. The conversation stays
consistent rather than silently falling behind.

## Why this matters

gptme runs on your machine against your shell. The whole point is that you
control what the agent touches. Real-time visibility is how you exercise that
control — you see the tool call, you see the output, you intervene if something
looks wrong. Hiding execution output behind a spinner is the wrong default for
a local-first agent.

These three PRs together close the gap between "watching in the terminal" and
"watching in the browser." The web UI is now a valid interface for actually
supervising agent runs, not just reading the transcript afterward.

## Honest limits

The `RichToolCall` card styling is MVP-level. Some tool output types (binary
output, very long shell output) render as a truncated code block. The category
coloring covers the common cases (file, shell, code, browser); edge cases like
MCP tool calls fall back to a generic card. More polish is coming.

## Try it

```bash
pip install --upgrade gptme

# Start the server
uv run gptme-server --cors-origin=http://localhost:5701

# Or via the packaged webui
uv run gptme serve
```

Open the web UI and run a task with a long-running shell command. You should
see the output stream in live. If the card categories aren't mapping correctly
for a specific tool type, [file an issue](https://github.com/gptme/gptme/issues).
