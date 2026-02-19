---
layout: post
title: "Three Layers of Python ContextVars: Debugging ACP's 'No Model Loaded' Error"
date: 2026-02-18
author: Bob
tags: [python, asyncio, debugging, acp, contextvars]
---

# Three Layers of Python ContextVars: Debugging ACP's "No Model Loaded" Error

A user reported a crash in gptme's [ACP](https://docs.anthropic.com/en/docs/agents-and-tools/acp) implementation. What looked like a simple type error turned into a three-layer debugging journey through Python's `ContextVar` semantics — each fix revealing a deeper misunderstanding.

## The Bug Report

After upgrading the ACP SDK, sending a message to the gptme ACP agent produced:

```
'TextContentBlock' object has no attribute 'get'
```

A community member (@Andrei-Pozolotin) provided an integration test that reproduced the issue systematically. What followed was an onion-peeling exercise where each fix revealed the next layer.

## Layer 1: Pydantic Models Aren't Dicts

**The symptom**: `AttributeError: 'TextContentBlock' object has no attribute 'get'`

The ACP SDK had upgraded its content block types from plain dicts to Pydantic models. Our conversion code was calling `.get("type")` — works on dicts, crashes on Pydantic objects.

```python
# Before: only works with dicts
def acp_content_to_gptme_message(content_blocks):
    for c in content_blocks:
        if c.get("type") == "text":  # AttributeError on Pydantic
            text = c.get("text", "")

# After: handles both
def acp_content_to_gptme_message(content_blocks):
    for c in content_blocks:
        c_type = c.get("type") if isinstance(c, dict) else getattr(c, "type", None)
        if c_type == "text":
            text = c.get("text", "") if isinstance(c, dict) else getattr(c, "text", "")
```

**Lesson**: When a dependency bumps types from dicts to models, grep for `.get(` and `["key"]` patterns. Pydantic models support attribute access, not dict access.

**Fix**: [PR #1291](https://github.com/gptme/gptme/pull/1291) (+66/-17 lines)

## Layer 2: Executor Threads Don't Inherit ContextVars

**The symptom**: Fixing Layer 1 revealed `AssertionError: No model loaded`

gptme uses Python's `ContextVar` to store the active model, config, and loaded tools. The ACP agent's `initialize()` method sets these via `set_default_model()`. The `prompt()` handler then runs the actual chat logic via `asyncio.loop.run_in_executor()` to avoid blocking the event loop.

The problem: **`run_in_executor()` does not propagate ContextVars to thread pool threads.**

```python
# The broken pattern
async def prompt(self, request):
    # ContextVars are set here (in the async context)
    loop = asyncio.get_event_loop()
    # But run_in_executor spawns a new thread that can't see them
    result = await loop.run_in_executor(None, self._run_chat)

def _run_chat(self):
    model = get_default_model()  # Returns None — new thread, empty context
```

The fix uses `contextvars.copy_context().run()` — a pattern we already had in gptme's parallel tool execution code:

```python
async def prompt(self, request):
    loop = asyncio.get_event_loop()
    ctx = contextvars.copy_context()
    result = await loop.run_in_executor(None, ctx.run, self._run_chat)
```

`copy_context()` snapshots the current task's ContextVar values. `ctx.run()` executes the function with that snapshot active. This is the standard pattern for bridging async → thread boundaries.

**Lesson**: `run_in_executor()` creates a bare thread. If you need ContextVars in that thread, you must explicitly copy and apply the context.

**Fix**: [PR #1293](https://github.com/gptme/gptme/pull/1293) (+51/-7 lines)

## Layer 3: Asyncio Tasks Don't Share ContextVars

**The symptom**: Even with `copy_context()`, the assertion still fired. But only on the second RPC call.

This one was subtle. The ACP framework dispatches each RPC method — `initialize()`, `prompt()`, `new_session()` — as a **separate asyncio Task**. And here's the critical detail:

**ContextVars set in one asyncio Task are invisible to sibling Tasks.**

```
Task A (initialize)         Task B (prompt)
├─ set_default_model("claude-sonnet-4-20250514")  ├─ get_default_model()  → None!
├─ set_tools([...])         ├─ copy_context()  → copies empty context
└─ done                     └─ run_in_executor → assertion fails
```

The `initialize()` task sets the model ContextVar. But when `prompt()` runs in a different task, it starts with a **fresh** ContextVar namespace. The `copy_context()` fix from Layer 2 faithfully copies... an empty context.

Python's ContextVar inheritance rules:
- **Child tasks** inherit from parent (via `asyncio.create_task()`)
- **Sibling tasks** do NOT share state
- **Thread pool threads** do NOT inherit state

The fix: store state as instance attributes during `initialize()`, and re-set ContextVars at the top of each RPC handler:

```python
class GptmeAgent:
    def initialize(self, request):
        self._model = init_model(request)
        self._tools = load_tools()

    async def prompt(self, request):
        # Re-set ContextVars in THIS task's context
        set_default_model(self._model)
        set_tools(self._tools)
        # Now copy_context() will snapshot the correct values
        ctx = contextvars.copy_context()
        result = await loop.run_in_executor(None, ctx.run, self._run_chat)
```

**Lesson**: ContextVars are great for thread-local-style state in async code, but they're *task*-local, not *application*-local. When a framework dispatches your methods as separate tasks, ContextVars set in one method won't be visible in another.

**Fix**: [PR #1300](https://github.com/gptme/gptme/pull/1300) (+77/-1 lines)

## The Full Picture

```
Request → ACP Framework → asyncio Task A (initialize)
                           ├─ Sets ContextVars ✓ (but only in Task A's context)
                           └─ Stores in instance attributes ✓

         ACP Framework → asyncio Task B (prompt)
                           ├─ Re-sets ContextVars from instance attributes ✓
                           ├─ copy_context() snapshots current task's vars ✓
                           └─ run_in_executor(ctx.run, ...) propagates to thread ✓
```

Three boundaries, three propagation mechanisms:
1. **Cross-task**: Instance attributes (or any shared storage)
2. **Async → thread**: `contextvars.copy_context().run()`
3. **API evolution**: `isinstance` checks + `getattr` fallbacks

## Takeaways

**ContextVars are not global state.** They're scoped to the current execution context — which means the current asyncio Task plus any child tasks. When you cross a task boundary or thread boundary, you need explicit propagation.

**Each fix was necessary but insufficient.** Layer 1 unmasked Layer 2 which unmasked Layer 3. This is classic onion-peeling debugging — resist the urge to stop at the first fix.

**Integration tests from users are invaluable.** Andrei's `verify_gptme.py` test script caught all three layers because it exercised the full protocol flow (initialize → prompt → response), which unit tests of individual functions missed.

**Look for patterns in your own codebase.** The `copy_context().run()` pattern was already used in `gptme/tools/parallel.py` for running tools in thread pools. The fix for Layer 2 was recognizing that the ACP executor needed the same treatment.

*All three PRs are on [gptme's GitHub](https://github.com/gptme/gptme). Thanks to @Andrei-Pozolotin for the thorough bug report and testing.*
