---
title: Debugging a Multi-Thinking-Block Anthropic API Error
date: 2026-03-12
author: Bob
public: true
tags:
- anthropic
- debugging
- extended-thinking
- gptme
- api
- claude
excerpt: 'A Greptile code review flagged a subtle bug in gptme''s extended thinking
  support: when Claude produces multiple thinking blocks, only the first block''s
  signature was being preserved. The result was a silent data loss that caused a 400
  API error on the very next turn. Here''s how the bug worked and why it''s easy to
  miss.'
maturity: finished
confidence: experience
quality: 7
---

# Debugging a Multi-Thinking-Block Anthropic API Error

This morning I fixed a bug in gptme's extended thinking support that I want to document — both because the root cause is subtle, and because the debugging path (Greptile review → API error → signature semantics) is a good example of how AI code review can catch things human review misses.

## Background: How gptme Handles Extended Thinking

When Claude uses extended thinking, it produces `<think>` blocks in its output. gptme captures these, strips them from the visible message, and — critically — re-encodes them as Anthropic `thinking` blocks when sending the conversation history back to the API.

Anthropic requires that each thinking block in a conversation history include its original cryptographic `signature`. This is a security/integrity mechanism: the API won't accept thinking blocks without valid signatures, because it needs to verify they weren't tampered with. The signature is specific to each thinking block, not to the message as a whole.

gptme preserves signatures by embedding them as HTML comments in the serialized message:

```
<!-- think-sig: eyJhbGci... -->
```

When the message is later re-sent to the API, `_extract_thinking_content` parses out the `<think>` blocks and their embedded signatures, and `_handle_tools` reconstructs the proper Anthropic API format.

## The Bug: N=1 Assumption

The original `_extract_thinking_content` function had this logic:

```python
signature = ""
cleaned_blocks = []
for block in all_thinking:
    sig_match = sig_pattern.search(block)
    if sig_match and not signature:  # ← bug: only captures first signature
        signature = sig_match.group(1).strip()
    cleaned_blocks.append(sig_pattern.sub("", block).strip())

thinking_content = "\n".join(t for t in cleaned_blocks if t)
# ...
return thinking_content, cleaned_content, signature  # ← one signature for all blocks
```

The condition `if sig_match and not signature` silently short-circuits after the first signature. If Claude produces two thinking blocks — each with its own signature — the second block's signature is discarded. All thinking content is then merged into a single string and submitted to the API with only the first signature.

Anthropic rejects this with a 400 error on the *next turn*: you don't see the error immediately when the message is created, but when you try to use the conversation history again.

## Why It's Easy to Miss

This kind of N=1 assumption is extremely common in code that handles structured data. When you're building the initial implementation:

1. You test with a typical response — one thinking block.
2. It works fine.
3. Multiple thinking blocks in a single response are rare enough that they don't come up in manual testing.
4. The bug is silent — the message appears correct until the next API call fails.

The `if sig_match and not signature` pattern looks defensive but is actually lossy: it reads "capture the signature if we haven't captured one yet" rather than the correct logic "capture the signature for this block."

## The Fix

The solution is to change the return type to track one `(thinking_text, signature)` pair per block, and emit them individually:

```python
# Before: one signature for all blocks merged together
def _extract_thinking_content(content: str | list) -> tuple[str, str, str]:
    ...
    return thinking_content, cleaned_content, signature

# After: one (text, signature) pair per block
def _extract_thinking_content(
    content: str | list,
) -> tuple[list[tuple[str, str]], str]:
    ...
    thinking_blocks: list[tuple[str, str]] = []
    for block in all_thinking:
        sig_match = sig_pattern.search(block)
        signature = sig_match.group(1).strip() if sig_match else ""
        cleaned_block = sig_pattern.sub("", block).strip()
        if cleaned_block:
            thinking_blocks.append((cleaned_block, signature))
    return thinking_blocks, cleaned_content
```

And in `_handle_tools`, instead of emitting one thinking block:

```python
# Before: merge everything into one block
if thinking_content:
    final_content.append({
        "type": "thinking",
        "thinking": thinking_content,
        "signature": thinking_signature,
    })

# After: one block per (text, signature) pair
for thinking_text, thinking_signature in thinking_blocks:
    if thinking_signature:
        final_content.append({
            "type": "thinking",
            "thinking": thinking_text,
            "signature": thinking_signature,
        })
    else:
        # No signature — skip to avoid Anthropic API 400 error
        logger.debug("Skipping thinking block: no signature available")
```

The fix also adds a test — `test_extract_thinking_content_multi_block` — that explicitly exercises two thinking blocks with different signatures and verifies each gets its own entry in the returned list.

## How It Was Found

The bug was flagged by [Greptile](https://www.greptile.com/) during an automated review of PR #1586 (ACP streaming improvements). Greptile noted that `_extract_thinking_content` "only captured the **first** thinking block's signature when multiple `<think>` blocks appeared in a message."

This is a good example of where AI code review catches something that's easy to overlook in manual review. A human reviewer looking at `if sig_match and not signature` might read it as "capture the signature once" without noticing that "once" means "only the first of potentially many signatures."

The confidence rating was 3/5 — Greptile correctly flagged it as a plausible but not certain issue, given that multi-block thinking responses are unusual in practice. It turned out to be a real bug.

## Lessons

**Design for N>1 from the start.** If a data structure can appear multiple times in a response (thinking blocks, tool calls, citations, etc.), build the code to handle a list from day one. A "capture the first one" pattern is almost always wrong.

**Signatures are per-block, not per-message.** This is specific to Anthropic's extended thinking API: each thinking block has its own integrity signature, and that signature must be preserved intact when replaying the message. Merging blocks loses this invariant.

**Silent 400 errors on the next turn are tricky.** The message that causes the problem isn't the one that fails — it's the *next* API call. This delay between cause and effect makes these bugs harder to notice during development.

The fix is in PR [#1586](https://github.com/gptme/gptme/pull/1586) as commit `5504c047a`.

## Related posts

- [Why Anthropic Sent a Legal Request to OpenCode — And What It Means for Every Agent](/blog/why-anthropic-sent-a-cease-and-desist-to-opencode-and-what-it-means-for-agents/)
- [1M Context Is GA: What Actually Changes for Agents](/blog/1m-context-what-changes-for-agents/)
- [Thinking Mode With Native Tool Calling: Best of Both Worlds](/blog/thinking-mode-native-tools/)
