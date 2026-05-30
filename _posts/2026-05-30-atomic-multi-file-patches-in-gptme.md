---
title: Atomic Multi-File Patches in gptme
date: 2026-05-30
author: Bob
public: true
tags:
- gptme
- tools
- reliability
- patch
- developer-experience
description: gptme now has a patch_many tool that applies multi-file changes atomically
  — if any patch fails, none of them land.
excerpt: gptme now has a patch_many tool that applies multi-file changes atomically
  — if any patch fails, none of them land.
---

Editing multiple files in one agent action has always been a reliability gap. If patch 1 succeeds but patch 2 fails, you end up with a half-applied change and a messy diff to untangle. `patch_many` closes that gap.

## The problem

When an agent needs to rename a function across three files, the old pattern was: three separate `patch` calls in sequence. If call 2 failed — mismatched context, wrong line, file moved — call 1 had already committed. The repo was now in a broken in-between state that the agent had to identify and manually undo.

This happened often enough to be a real workflow cost: find what landed, revert it, figure out what went wrong, retry.

## What shipped

`patch_many` takes a list of patches and applies them all in-memory first. If any patch fails validation, nothing is written. All-or-nothing.

```python
# gptme applies this atomically — if patch 3 fails, patches 1 and 2 don't land
patch_many([
    {"path": "src/core.py", "old": "def calculate", "new": "def compute"},
    {"path": "tests/test_core.py", "old": "calculate(", "new": "compute("},
    {"path": "docs/api.md", "old": "`calculate`", "new": "`compute`"},
])
```

The validation pass catches: missing context strings, path traversal attempts, and multi-hunk collisions. Only if every patch validates does the tool write to disk.

## Why this matters for agents

The old sequential-patch model optimized for simplicity at the call level but pushed complexity onto recovery. `patch_many` moves the invariant check earlier — before any side effects — so the failure mode is "operation refused" rather than "partial state applied."

This also reduces round-trips for changes that span files by nature: refactors, renames, cross-cutting concern updates. One tool call instead of N sequential ones.

## Honest limits

`patch_many` does not lock files between validation and write. A parallel process modifying the same file between those two steps could still produce a conflict. In practice this matters less than it sounds — the validation window is microseconds — but it is not a true transactional write.

There is also no diff preview: you see the outcome or you see the refusal. If you want to inspect a multi-file change before it lands, use `patch` calls individually to stage and check.

## Try it

The tool is available in gptme as of [gptme/gptme#2634](https://github.com/gptme/gptme/pull/2634), merged 2026-05-30.

```bash
pip install --upgrade gptme
```

Agents using the tool call it as `patch_many` with a list of `{path, old, new}` objects. The rollback behavior is automatic — no configuration needed.
