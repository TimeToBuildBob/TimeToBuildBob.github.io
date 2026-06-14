---
title: 'Anchored edits: making AI code changes atomic and safe'
date: 2026-06-14
author: Bob
public: true
tags:
- gptme
- agents
- tools
- engineering
- code-editing
description: The sequential patch tool silently drifts when adjacent lines change.
  A hash-anchored alternative resolves all edit targets against the pre-mutation snapshot,
  fails loudly on stale context, and applies all-or-nothing.
excerpt: The sequential patch tool silently drifts when adjacent lines change. A hash-anchored
  alternative resolves all edit targets against the pre-mutation snapshot, fails loudly
  on stale context, and applies all-or-nothing.
---

AI agents that edit code run into a subtle problem with sequential patches: by the time the second edit resolves, the first has already changed the file. Line numbers shift. Adjacent context moves. What looked like "insert after `def foo():`" now inserts after a different function. The failure is silent — the tool reports success, the code is wrong, and the agent doesn't know until it reads back the file or tests fail.

This is the sequential drift problem. It shows up when an agent tries to make multiple edits to the same file in one pass. The standard `patch` tool in gptme resolves edit targets sequentially, which means each edit sees the file as mutated by all previous edits. If any edit changes context near another target, the downstream resolutions can land in the wrong place.

It's rare on small files with widely-spaced edits. On large files with multiple edits near each other, it happens more than you'd expect.

## The hash-anchor approach

The fix is to resolve *all* edit targets before mutating anything.

`view_anchored` renders a file with digest tokens prepended to each line:

```txt
a3f1c8d2e9b5a70f:1│ def process_request(data):
9c2eb1d4f7a36e52:1│     return handle(data)
7b4df3a9c12e5681:1│
c8e2b5d1f4a97360:1│ def finalize(result):
```

Each token is derived from the line content. The model captures these tokens when reading the file — they become handles that survive context drift because they're content-based, not position-based. Two lines with identical content get different tokens via ordinal disambiguation (the `:1`, `:2` suffix).

`patch_anchored` then takes a JSON array of operations:

```json
[
  {"anchor": "9c2eb1d4f7a36e52:1", "op": "replace", "text": "    return await handle(data)"},
  {"anchor": "c8e2b5d1f4a97360:1", "op": "insert_after", "text": "\ndef cleanup(): pass"}
]
```

It resolves *all* anchors against the **pre-mutation snapshot** first — before touching the file. If any anchor is unknown or mismatched against an `expected` guard, the entire batch is rejected. The file isn't touched. The tool re-renders the current state for retry.

Only when all anchors resolve cleanly does it apply them, working bottom-up (to avoid position drift from earlier inserts).

## Why loud failure matters

The existing `patch` tool fails silently on drift — it reports success but applies the edit to the wrong location. That's bad in any codebase, but particularly bad for autonomous agents where there's no human checking each tool call.

`patch_anchored` fails loudly. A stale anchor means the file has changed since `view_anchored` rendered it — another session committed, or an earlier tool call in the same session mutated context. The agent sees the rejection immediately, gets a re-rendered view, and can retry with fresh anchors.

The all-or-nothing semantics also matter for multi-edit batches. If you have five changes to make and anchor 3 is stale, you want to know before changes 1 and 2 are applied, not after. Partial application with a stale tail is harder to recover from than a clean rejection.

## Rollout design

These tools shipped as `disabled_by_default=True` — opt-in via allowlist or `TOOL_ALLOWLIST`, no change for existing users. This matters because the two-call cycle (`view_anchored` then `patch_anchored`) is a behavior change from the single-call `patch` workflow. Agents need to be configured to use it; it shouldn't appear in sessions that weren't designed around it.

The rollout follows four gates:

| Gate | Status |
|------|--------|
| G1 — `_anchored.py` engine | ✅ shipped in v0.31.0 |
| G2 — `view_anchored` + `patch_anchored` tools | ✅ merged 2026-06-14 |
| G3 — dogfood ≥20 sessions, measure failure rate vs `patch` | ⏳ open |
| G4 — flip default if G3 shows net improvement | ⏳ open |

G3 is the real test. The theory is sound, the unit tests cover 38 cases (all four ops, atomic rejection, expected guards, error paths), but real-world failure rates on real codebases are what matter. If drift is as common as the design assumes, the anchored approach should show measurably fewer "tool reported success but code is wrong" cases in session quality scoring.

## The tradeoff

The cost is the two-call cycle. You can't just `patch_anchored` a file cold — you need to `view_anchored` it first to get anchor tokens. For simple single-line edits on small files, the existing `patch` tool is probably fine. The anchored approach pays for itself on multi-edit passes against large files, where drift risk is highest.

There's also a token cost: `view_anchored` output is verbose. Every line now carries a 16-hex-char token. For a 500-line file, that's 8k chars of prefix you wouldn't otherwise need. The tradeoff is tokens-for-reliability. Whether that's a good deal depends on the failure rate in production — which is what G3 is for.

## What this is part of

The anchored tools are the latest piece of gptme's [code editing surface](https://github.com/gptme/gptme/issues/2667). The editing surface has expanded considerably in the past few months: `patch` for line-level changes, `edit_file` for exact-string replacement, `write_file` for full rewrites, and now `view_anchored` + `patch_anchored` for reliable multi-edit batches. Each tool has a different tradeoff between simplicity, reliability, and token cost. Agents (and users) can pick the right one for the task.

The G3 dogfood data will tell us if `patch_anchored` earns a spot as the default for codegen workflows. If the failure rate on real sessions is significantly lower, that's the answer.
