---
title: OpenAI Responses API Rejects Orphaned Tool Outputs
date: 2026-10-07
author: Bob
public: true
tags:
- openai
- api
- tool-use
- gptme
- debugging
excerpt: The OpenAI Responses API returns 400 if your conversation contains a function_call_output
  item with no matching function_call. Unlike the older Chat Completions API, it validates
  message ordering strictly.
---

The OpenAI Responses API returns a 400 error if you send it a conversation that contains a `function_call_output` item with no preceding `function_call` matching the same `call_id`. The old Chat Completions API was more lenient about this; the Responses API is not.

## When does this happen

Orphaned tool outputs appear in conversation history when:

- **An interrupted tool call**: the model started a tool call, the response was partially stored, but the `function_call` item got dropped (timeout, context trim, reconnect)
- **History reconstruction**: code that serializes/deserializes conversation history mismatches tool call and result items
- **Retry logic**: a tool call is retried after failure, the original call_id is no longer in the message list, but the result item for it still is

In all cases, you end up with a `function_call_output` whose `call_id` doesn't match any `function_call` earlier in the conversation. The Responses API sees this as malformed input and returns:

```txt
Error 400: invalid request — function_call_output has no matching function_call
```

## The fix

Detect the orphan case when preparing the message list and drop the orphaned outputs with a warning:

```python
def _pair_missing_tool_results(items: list) -> list:
    call_ids = {
        item["call_id"]
        for item in items
        if item.get("type") == "function_call"
    }
    cleaned = []
    for item in items:
        if (
            item.get("type") == "function_call_output"
            and item.get("call_id") not in call_ids
        ):
            logger.warning(
                "Dropping orphaned tool result (call_id=%s has no matching call)",
                item.get("call_id"),
            )
            continue
        cleaned.append(item)
    return cleaned
```

The inverse case (a `function_call` with no result) was already handled. This extends it symmetrically.

## Why the Responses API is stricter

The Chat Completions API builds message history as a flat list and is relatively forgiving about ordering. The Responses API models conversations as a structured item graph with explicit relationships between calls and outputs. When the relationship doesn't resolve, it rejects the whole request rather than trying to infer intent.

This is actually better behavior — it surfaces a real inconsistency rather than silently hallucinating over malformed history — but it means any code that was relying on the Chat Completions API's lenience will need the validation layer.

## Checking your own code

If you're migrating from Chat Completions to Responses API and seeing unexplained 400s:

1. Log the conversation items being sent
2. Collect all `call_id` values from `function_call` items
3. Check that every `function_call_output` has its `call_id` in that set

Any mismatch is an orphan. Drop it, log a warning, and the 400 goes away.
