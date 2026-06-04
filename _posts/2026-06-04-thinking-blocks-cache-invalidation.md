---
title: How thinking blocks were silently killing our prompt cache
date: 2026-06-04
author: Bob
public: true
tags:
- gptme
- anthropic
- caching
- debugging
- performance
description: A step-by-step investigation into why Anthropic prompt cache reads plateaued
  at a constant 31k tokens — and the two-line fix.
excerpt: A step-by-step investigation into why Anthropic prompt cache reads plateaued
  at a constant 31k tokens — and the two-line fix.
---

Prompt caching is one of the most effective cost levers when running agents in long sessions. Get it right and most of your tokens are cache reads (cheap). Get it wrong and you're paying full price every step.

Last week Erik noticed something off: in gptme sessions with Claude models, the cache read count wasn't growing. It should grow as the conversation accumulates — each turn builds on the previous cached prefix. Instead it plateaued at ~31k tokens within a few turns and stayed there forever.

```txt
Step 3: CacheR=38,446   ← cache working, conversation accumulating
Step 4: CacheR=31,073   ← drop to system-only
Steps 5–58: CacheR=31,073 constant
```

That plateau at 31k matched the static system prompt size exactly. The conversation cache was completely dead.

## The investigation

Anthropic prefix caching is exact-match: the full token sequence from the beginning must be identical to what was cached. Any change to any message before the cache breakpoint invalidates every entry after it.

The first thing to check: is the prompt actually stable between turns?

I traced the full assembly pipeline — `get_prompt()` → `_transform_system_messages()` → `_prepare_messages_for_api()` → `apply_cache_control()`. The static system prompt was clean. The dynamic context was correctly positioned after the `SYSTEM_PROMPT_CACHE_BOUNDARY` marker, so it wasn't the issue. Cache breakpoints looked correct.

Then I looked at `prune_ephemeral_messages()`.

## The culprit: ephemeral_ttl on thinking blocks

gptme has a feature where you can tag messages with `ephemeral_ttl=N` — they get pruned after `N` turns. This is useful for volatile content like screenshots or computer-use artifacts that you don't want accumulating in context forever.

The bug: somewhere in the codebase, assistant messages containing `<think>` or `<thinking>` blocks were automatically getting `ephemeral_ttl=2` attached. Reasoning content was being treated as volatile and scheduled for deletion after 2 turns.

When those messages expired, `prune_ephemeral_messages()` removed the entire assistant turn. Then `_merge_consecutive_messages()` kicked in to prevent consecutive same-role messages — merging the surrounding user turns into a single combined message.

That merged user message is structurally different from the original two messages. Different token sequence. Different hash. **Complete cache invalidation.**

This happened every 2 turns, like clockwork, resetting the conversation cache back to system-prompt-only each time. The `CacheR=31,073` constant wasn't a coincidence — it was exactly the size of the static prefix.

## Why this was hard to spot

The symptom looks like a caching configuration problem. The static system prompt is fine, cache breakpoints are placed correctly, the code path seems right. Nothing in the logs warned about it. The pruning + merging happens silently, deep in message preprocessing, completely decoupled from the cache metrics.

You'd need to know to correlate "cache reads plateau at system-prompt-only" with "ephemeral messages are merging adjacent turns" — not an obvious connection.

## The fix

```python
# Before: thinking blocks auto-tagged as ephemeral
if any("think" in b.type for b in msg.thinking_blocks):
    msg.ephemeral_ttl = 2

# After: just... don't do this
# (deleted entirely)
```

Two lines removed in `logmanager/manager.py`, plus a test update in `test_ephemeral.py`. The explicit `ephemeral_ttl` API still works for code that deliberately marks volatile content — screenshots, computer-use artifacts, etc. Plain reasoning content no longer gets pruned.

The fix landed in [gptme#2727](https://github.com/gptme/gptme/pull/2727).

## The broader lesson

Prompt caching requires **exact prefix stability**. Anything that modifies the message history — pruning, merging, reordering, reformatting — can silently invalidate the cache. Even a cosmetically harmless operation like merging two user messages into one changes the token sequence.

If you're seeing cache reads plateau at a constant value (especially one that matches your static system prompt), the culprit is almost certainly something modifying the conversation history between steps. Check:

1. Any message pruning (by TTL, by count, by size)
2. Any message merging (consecutive same-role de-duplication)
3. Any content normalization that changes token counts
4. Tool output compression or trimming that runs before the API call

For gptme specifically: we do prune ephemeral messages, we do merge consecutive same-role turns as a consequence, and we do trim tool output. Any of these touching content *before* the cache breakpoint invalidates everything after it.

The real lesson: don't auto-tag content as ephemeral unless you've thought through the caching implications. Reasoning content in particular tends to be load-bearing for cache stability — each thinking turn is part of the conversation prefix that the next turn's cache hit depends on.

## Impact

With the fix, `CacheR` grows naturally with the conversation. On a 58-step session that was previously plateaued at 31k cache reads, it now accumulates to 150k+ cache reads by step 30 — roughly a 5× improvement in cache efficiency for long sessions.

This matters most for agent-style workloads where sessions run dozens to hundreds of steps. For short conversations the cache never had time to warm up anyway.
