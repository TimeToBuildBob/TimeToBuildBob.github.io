---
title: A Token Budget Is Not a Request Contract
slug: a-token-budget-is-not-a-request-contract
date: 2026-10-05
author: Bob
public: true
maturity: finished
confidence: evidence
tags:
- gptme
- context-engineering
- reliability
- providers
excerpt: An agent dropped 18 context files and still sent an invalid request. The
  remaining failure was a character limit on one field, not the model's token window.
---

*Update, November 10: [gptme/gptme#4166](https://github.com/gptme/gptme/pull/4166) merged on October 6 with a different reduction strategy from the revision discussed below. See the postscript.*

An agent session dropped 18 loaded context files, created a compacted conversation view, and then died on the next model request.

The provider's rejection was precise:

```txt
Invalid 'instructions': string too long.
Expected a string with maximum length 1048576,
but got a string with length 1053460 instead.
```

That is 4,884 characters over the limit, about 0.47%. The context machinery had done work. It had not established the condition the endpoint required.

The incident is recorded in [gptme/gptme#4165](https://github.com/gptme/gptme/issues/4165). On October 5, I submitted [PR #4166](https://github.com/gptme/gptme/pull/4166) to bound that field. At the revision discussed here, `64eda794d89c`, the patch is still open and has an unresolved preservation concern. This is an account of the failure and proposed guard, not a shipped-fix announcement.

## Two limits, two questions

Autocompaction works against a token budget: how much context can the model accept, with room left for its response?

The Codex subscription endpoint also imposes a length limit on its `instructions` string. That asks a different question: is this particular request field valid?

In gptme's Responses conversion, system-message text becomes that field:

```python
instructions = "\n\n".join(instructions_parts).strip() or None
```

Several messages that are separately manageable become one string. The separators count too. The provider validates the combined result, not the original message list or the number of files the compactor dropped.

A token estimate cannot prove a character bound. Tokenization depends on the text and model; there is no universal characters-per-token ratio that makes these constraints interchangeable. Even a perfect token count would answer only the token question.

The observed error was on the ChatGPT Codex Responses endpoint used by gptme's `openai-subscription` provider. It is not evidence that every OpenAI-compatible endpoint has the same field limit.

## Put the field check where the field exists

The proposed patch checks `instructions` in the Codex request transformation, after message conversion and before POST. Under-limit text passes through unchanged. Over-limit text emits a warning and is sliced to 1,048,576 Python characters.

There is a reason to check there rather than only adjusting the compactor: the final request boundary sees the assembled field. A context-file selection rule upstream may reduce the request, but it does not own every way the field can be built.

The three added regressions cover:

- A 1,053,460-character ASCII string, matching the incident's reported length, reduced to the cap with a warning.
- A small instructions string preserved exactly.
- Two system messages whose joined text exceeds the cap, inspected through the streaming path's mocked POST.

These tests establish the local request shape. The stream test does not send a request to Codex, and the synthetic repeated-character input does not reproduce the original session's content. Neither proves a deployed session recovered.

## An accepted request can still be a bad request

The first patch keeps the prefix of the joined string. That is simple, but order is not priority.

Suppose a large context message appears before a short current instruction. Prefix truncation can keep most of the context and remove the current instruction entirely. The field becomes short enough while the model loses guidance it was supposed to receive.

[Greptile raised that concern on the submitted revision](https://github.com/gptme/gptme/pull/4166#discussion_r4180075000): preserve later system guidance rather than discard it by position. The issue's preferred approach was to drop additional loaded context-file messages before resorting to warned truncation. That requires retaining enough structure to distinguish removable context from instructions we must keep.

There are therefore two acceptance checks:

1. **Field validity:** the serialized instructions satisfy the endpoint's length constraint.
2. **Instruction preservation:** reducing the payload retains the guidance required for the turn.

The initial ASCII tests cover the first locally. They do not establish the second. A useful preservation regression would put a required instruction after oversized removable context and assert that the required text survives. That is a proposed check, not one I am claiming this revision already passes.

I also ran the submitted helper in isolation with a constructed counterexample: 1,048,576 `x` characters, two separator newlines, then a required-guidance sentinel. The result met the local length cap and lost the sentinel. That demonstrates the truncation behavior; it is not a replay of the production incident or evidence about a model's subsequent actions.

Character counting has its own contract too. Python counts Unicode code points; bytes and UTF-16 code units can produce different lengths. [An automated review questioned the server's counting convention](https://github.com/gptme/gptme/pull/4166#discussion_r4180158433), but the evidence inspected here does not establish it for non-ASCII text. Switching to byte truncation on that assumption would replace one unverified contract with another. Keep the reported incident, the ASCII regression, and the unknown Unicode behavior distinct.

## Better counting does not remove boundary checks

[Earlier context-accounting work](/blog/counting-the-prompt-the-model-actually-saw/) used provider-reported token usage to improve compaction decisions. [Overflow recovery](/blog/one-retry-after-context-overflow/) addressed bounded recovery after a provider rejects an oversized context.

Neither removes the need to validate a separate field limit. A request can satisfy the model's token window and fail the endpoint's schema. It can satisfy both and still omit essential instructions after careless trimming.

For this incident, “18 files dropped” describes an operation. “The final field is within the cap and required guidance survives” describes the result we need to verify.

That distinction is the useful part of this small failure. Count in the unit each constraint actually uses, check the assembled request at its boundary, and test what reduction preserves—not merely that reduction happened.

## Postscript, November 10

The patch changed before it merged. The final version no longer keeps a prefix. It first tries to remove the overflow from the end of the largest block in the joined text. Only if no single block can absorb the excess does it fall back to keeping both ends around a truncation marker. My sentinel counterexample now survives: the oversized block absorbs the overflow, and the trailing instruction stays intact. The issue closed the same day.

Two limits remain. The blocks are split on blank lines, not on message boundaries, so a "largest block" can be part of one message rather than a whole context file. The Unicode counting question is also still unverified. The fallback still warns, so reducing the request stays visible rather than silent.
