---
title: A Field Name Made Codex Look Expensive
date: 2026-07-17
author: Bob
public: true
maturity: finished
confidence: experience
tags:
- agents
- observability
- tokens
- cost-accounting
- schemas
excerpt: 'Codex reported more than two million cached input tokens. My extractor read
  them correctly, then stored them under a field the session ledger ignored.

  '
related:
- /blog/tokens-made-visible-four-prs-in-three-days/
- /blog/the-token-efficiency-paradox/
---

Codex reported **2,013,440 cached input tokens** in a real agent session. My
telemetry extractor found the number. The session ledger persisted zero.

Nothing crashed. No parser warning fired. The record still contained plausible
input and output totals. Downstream cost analysis simply treated Codex as if it
had no measurable cache behavior.

The bug was one field name:

```txt
provider:       cached_input_tokens
extractor:      cached_input_tokens
session schema: cache_read_tokens
```

The first two layers agreed with each other, so their tests passed. The last
layer only copied canonical schema fields, so it silently dropped the value.
Codex then looked much more expensive than it really was.

## Extraction Is an API Boundary

Provider payloads are not internal schemas. They are external dialects.

Codex calls the value `cached_input_tokens`. My canonical session record calls
it `cache_read_tokens`. Those names describe the same concept, but Python does
not care about semantic equivalence:

```python
usage = extract_usage_codex(messages)

record = SessionRecord(
    input_tokens=usage.get("input_tokens"),
    output_tokens=usage.get("output_tokens"),
    cache_read_tokens=usage.get("cache_read_tokens"),
)
```

Returning the provider key from `extract_usage_codex()` made the extractor look
faithful while violating its actual contract. It was faithfully preserving the
wrong vocabulary.

The repair is deliberately boring:

```python
cache_read_tokens = as_int(total_usage.get("cached_input_tokens"))
if cache_read_tokens is not None:
    result["cache_read_tokens"] = cache_read_tokens
```

Normalize once, at ingestion. Everything after that boundary speaks the
canonical language.

## Valid Data Can Still Be Economically False

This bug mattered because cache tokens have different economics from fresh
input. A cost estimator needs the components separately:

```txt
fresh input × input rate
+ cached input × cache-read rate
+ output × output rate
```

If cached input disappears, the estimator cannot recover the split later. In
my pipeline, that made the session unsuitable for cache-aware comparison, so
Codex had to be excluded from the cost analysis. A different fallback might
price all observed input at the fresh-input rate. Either choice distorts model
comparison.

That distortion then feeds routing. A selector trying to minimize dollars per
successful task may decide that Codex is inefficient, not because Codex used
more compute, but because one adapter called a cache read by its provider name.
A schema mismatch three layers down becomes a model-allocation policy.

This is a recurring observability trap: **missing dimensions bias decisions even
when the headline total is present**. A total token count can prove that work
happened. It cannot tell you how the provider billed that work.

## The Test Was Too Local

The old extraction test asserted the provider-shaped key:

```python
assert usage["cached_input_tokens"] == 600
```

That test certified the bug. It asked whether the function copied the source
payload, not whether its output could survive the next boundary.

The corrected assertion uses the canonical field:

```python
assert usage["cache_read_tokens"] == 600
```

The stronger verification used a real Codex rollout and ran the extractor
against the actual trajectory. The result changed from “cache component absent”
to:

```txt
cache_read_tokens = 2,013,440
```

That number is useful for more than a regression fixture. It proves the
supposedly minor field mapping carried the dominant component of a real
session's token economics.

## Canonicalize at the Edge

The general rule is simple:

1. Keep provider-specific names inside the provider adapter.
2. Return one canonical usage schema from every adapter.
3. Test the adapter against the consumer's contract, not the provider's spelling.
4. Run one end-to-end assertion that the canonical value reaches persisted
   state.

Do not teach every downstream consumer that Codex says
`cached_input_tokens`, one provider says `cache_read_input_tokens`, and another
says something else. That multiplies dialect handling across cost analysis,
dashboards, routing, exports, and every future tool.

An adapter is not just a parser. It is a semantic firewall.

## What I Deliberately Did Not Do

I did not backfill old session records. Historical trajectories may contain
enough source data to reconstruct the missing component, but rewriting a shared
ledger before the corrected extractor ships would mix legacy and repaired
semantics without a clear provenance marker.

I also did not add a new schema field. `cache_read_tokens` already existed and
was already consumed by persistence and cost analysis. Expanding the schema
would preserve the mismatch instead of fixing it.

The right change was one translation at the boundary, plus a test that speaks
the destination schema.

The tiny bugs that corrupt model economics rarely announce themselves as
accounting failures. Sometimes they are just two reasonable names for the same
number, separated by one `.get()` call.
