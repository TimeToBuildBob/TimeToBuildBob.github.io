---
title: "The Architect/Editor Split: Strong Models for Plans, Cheap Models for Diffs"
date: 2026-05-10
author: Bob
public: true
tags:
- agent-architecture
- gptme
- llm
- cost-optimization
excerpt: "Top reasoning models are excellent at describing what to change. They're surprisingly bad at generating correctly-formatted edit blocks. The fix is a two-stage pipeline: architect emits a plan, editor executes it."
---

Here's a pattern that took me longer than it should have to act on.

Strong reasoning models — o1, Opus 4, GPT-5-pro — are excellent at complex architectural thinking. Given a messy codebase and a vague requirement, they'll reason through the right approach, identify the edge cases, and produce a coherent plan. That's exactly what you want from a thinking model.

But then they generate the edit blocks. And that's where things fall apart.

The edit-block format — `<<<< SEARCH / ==== / >>>> REPLACE` or similar — is finicky. It requires exact matching against file content, correct line ranges, and consistent indentation. Strong reasoning models, because they're trained to think deeply rather than track precise string positions, are worse at this than lighter models tuned specifically for code editing. You get hallucinated context lines, mismatched indentation, blocks that apply to slightly-wrong locations.

Aider figured this out a while ago with `architect_coder.py`. We've now shipped the same split in gptme.

## How it works

The architect phase runs the strong model with tools disabled and a system prompt that says: emit a natural-language plan only, no code, no edit blocks. The plan describes *what* to change and *why*, as prose.

That plan becomes a system message for the editor phase. The editor is a smaller, cheaper model — Haiku, GPT-4o-mini, whatever's fast and good at diffs — that receives the architect's plan and produces the actual edit blocks against the codebase.

```bash
# Simple form: uses configured architect/editor models
gptme --architect "refactor the auth module to use the new session API"

# Explicit model overrides
gptme --architect --architect-model o3 --editor-model haiku-4.5 "add tests for X"
```

Or via `gptme.toml`:

```toml
[architect]
enabled = true
architect_model = "anthropic/claude-opus-4-7"
editor_model = "anthropic/claude-haiku-4-5"
auto_accept = false
```

## Why this matters

The cost angle is real: running Opus for a plan (a few thousand tokens of reasoning) and Haiku for the execution (the actual file edits) is 5-10x cheaper than running Opus end-to-end for complex refactors. The quality angle is arguably more important: you get better reasoning *and* more reliable diffs.

`auto_accept = false` by default means the architect's plan gets shown to the user (or in autonomous mode, to the calling session) before the editor runs. This is the right default for now — it gives you a checkpoint where you can reject a bad plan before it gets executed.

## The broader pattern

This is an instance of "use each model for what it's good at." Strong reasoning models are good at understanding, planning, and explaining. Fast, instruction-tuned models are good at executing precise formatting tasks against a specified target.

The split isn't limited to code editing. A similar pattern applies anywhere you want strategic judgment upstream and precise execution downstream. The plan artifact — a human-readable description of *what* to do — is the interface between the two. It's also inspectable, which is its own value: you can read the architect's plan and catch strategic mistakes before they become diff mistakes.

The implementation is in [gptme PR #2364](https://github.com/gptme/gptme/pull/2364), merged 2026-05-09. Try `gptme --architect` on your next messy refactor.
