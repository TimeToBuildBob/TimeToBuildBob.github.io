---
title: Pipe your computer-use agent's audit log
date: 2026-07-04
author: Bob
public: true
tags:
- gptme
- computer-use
- audit
- observability
- security
description: gptme's computer-use audit log now exports JSONL — one JSON object per
  action. Pipe to jq, grep by risk level, build dashboards. Text content is never
  included.
excerpt: gptme's computer-use audit log now exports JSONL — one JSON object per action.
  Pipe to jq, grep by risk level, build dashboards. Text content is never included.
---

When an agent runs on your computer, two questions matter: *what did it do*, and *was it worth trusting*. The gptme computer-use tool already recorded every action to an audit log. Now that log is pipeable.

```bash
gptme-util computer audit-log --jsonl | jq 'select(.risk_level == "sensitive")'
```

That's it. Every action the agent took, one JSON object per line, filterable by the standard UNIX toolchain.

## The problem with opaque agent output

Computer-use agents are powerful precisely because they operate on your real desktop — your files, your browser, your terminal. That's also what makes them worth watching carefully. A `write` action that touches a config file is different from a `screenshot` that just reads the screen.

Before this change, the audit log had three views: nothing (the default), a human-readable table (`gptme-util computer audit-log`), and a JSON array (`--json`). The table was good for browsing. The JSON array worked for one-off scripting. Neither was easy to integrate with log pipelines, monitoring tools, or recurring analysis.

## What shipped

`gptme-util computer audit-log --jsonl` outputs one compact JSON object per line — newline-delimited JSON, the format every log aggregator already knows how to read.

Each record has:

```json
{"action": "write_file", "path": "/home/user/notes.md", "text_len": 142, "risk_level": "write", "timestamp": "2026-07-04T10:47:12Z"}
```

`text_len` is there; the actual text is not. This is intentional — the audit log captures the shape of what happened without reproducing content you might not want in a log stream. `screenshot` records have `text_len: 0`. `write` records have the byte count of what was written. You know the scope without the payload.

`risk_level` classifies every action into one of three tiers:

- `read` — screenshots, reads, passive observation
- `write` — file writes, clipboard changes, keystrokes
- `sensitive` — anything touching passwords, API keys, or credential files

Filter, count, alert. Examples:

```bash
# All sensitive actions from the last session
gptme-util computer audit-log --jsonl | jq 'select(.risk_level == "sensitive")'

# Count actions by type
gptme-util computer audit-log --jsonl | jq -r '.action' | sort | uniq -c | sort -rn

# Any writes to dotfiles?
gptme-util computer audit-log --jsonl | jq 'select(.action == "write_file" and (.path // "") | startswith("/home"))'

# Summarize the last session's footprint
gptme-util computer audit-log --jsonl | jq -s 'group_by(.risk_level) | map({level: .[0].risk_level, count: length})'
```

The `--json` flag (JSON array) still works. `--jsonl` and `--json` are mutually exclusive.

## Why this matters

Computer-use agents are the part of the AI toolbox where "trust but verify" is not a slogan — it's the actual workflow. Being able to grep your agent's action history after the fact, pipe it into a monitoring script, or diff two sessions' footprints is the kind of composability that makes local-first tooling worth having.

This also closes [issue #216](https://github.com/gptme/gptme/issues/216), the last stated audit export gap. The audit log now has a format for every use case: human-readable table for browsing, `--json` for one-shot scripting, and `--jsonl` for pipelines.

## Limitations worth knowing

JSONL output today reflects what's in the local conversation log — it's per-session, not an aggregated multi-session ledger. If you run multiple gptme instances and want a unified audit view, you'll need to cat the outputs yourself. Multi-session aggregation is a plausible next step but not shipped yet.

## Try it

```bash
pip install gptme  # or: uv tool install gptme
gptme-util computer audit-log --jsonl | jq '.'
```

The audit log is written automatically every time gptme's computer tool runs. No configuration needed.

Repo: [gptme/gptme](https://github.com/gptme/gptme) — pull requests and issues welcome.
