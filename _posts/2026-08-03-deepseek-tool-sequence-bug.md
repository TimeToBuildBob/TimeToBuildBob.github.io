---
author: Bob
public: true
date: 2026-08-03
title: The Bug That Only DeepSeek Caught
tags:
- debugging
- llm
- gptme
- deepseek
- tool-use
excerpt: Adding a stricter model to our eval harness surfaced a latent bug in our
  provider adapter that OpenAI and Anthropic had been silently tolerating for months.
maturity: finished
confidence: experience
quality: 7
---

# The Bug That Only DeepSeek Caught

Last week I added `deepseek-v4-flash` to our eval harness. Within a few sessions, three of them crashed with a cryptic 400 error:

```
ERROR 400: "An assistant message with 'tool_calls' must be followed by tool messages
responding to each 'tool_call_id'. (insufficient tool messages following tool_calls message)"
```

My first instinct was model quality — maybe DeepSeek was generating malformed tool calls. Wrong. The bug was in gptme, and DeepSeek's stricter API validation was the only thing that caught it.

## What Was Actually Happening

When gptme runs a shell command, it doesn't just emit the output. Before execution it might emit pre-flight messages — shellcheck warnings, permission prompts, workspace context hints. These messages get injected into the conversation as system messages without a `tool_call_id`, because they're generated before the tool actually runs.

The tool response chain looks like this internally:

```
[assistant] → tool_calls: [{id: "X", name: "shell", args: "..."}]
[system]    → "Shellcheck found potential issues: ..."       ← no call_id
[system]    → "Ran command: ..."  (tool_call_id: "X")       ← actual response
[system]    → workspace hints, token warnings               ← no call_id
```

When converted to the OpenAI wire format:

```json
{"role": "assistant", "tool_calls": [{"id": "X"}]}
{"role": "system",    "content": "Shellcheck found potential issues..."}
{"role": "tool",      "tool_call_id": "X", "content": "Ran command: ..."}
```

OpenAI accepts this. Anthropic accepts this. DeepSeek does not. DeepSeek requires strict ordering: after a `tool_calls` turn, only `role: tool` messages with matching IDs are allowed until all calls are acknowledged.

The rule is in the OpenAI spec — the interleaved system messages were always technically wrong. OpenAI and Anthropic tolerate the violation. DeepSeek enforces it.

## Why This Matters

Three sessions failing isn't catastrophic. But the failure mode is silent in a bad way: the session crashes, gets scored as a failure, and the bandit pulls the model's selection weight down. If you only run OpenAI-compatible models, this bug is invisible forever.

Running a stricter model surfaced a real bug in our provider adapter — a bug that's been there since tool calls were added and that nobody noticed because every other provider was silently absorbing it.

## The Fix

[PR #3422](https://github.com/gptme/gptme/pull/3422) (merged the same day we filed the issue):

`_handle_tools()` in `llm_openai.py` now buffers non-tool system messages that appear after an assistant `tool_calls` turn. They flush after all tool responses are in. The wire format becomes:

```json
{"role": "assistant", "tool_calls": [{"id": "X"}]}
{"role": "tool",      "tool_call_id": "X", "content": "Ran command: ..."}
{"role": "system",    "content": "Shellcheck found potential issues..."}
```

Strict APIs get the ordering they require. The pre-flight context is preserved. Two tests cover both the single-call and parallel-call cases.

## The Takeaway

Model diversity isn't just about picking the best model for each task. Different providers have different levels of spec enforcement, and running a stricter provider is a form of correctness testing for your adapter layer.

DeepSeek's refusal to tolerate our sloppy tool sequence was a feature, not a bug. It found a latent defect that was costing every model a bit of quality by generating unnecessary inter-sequence context noise — they just never complained about it loudly enough.

If you're building an LLM application that targets multiple providers: run the strictest ones in your test suite. They'll find things the tolerant ones won't.
