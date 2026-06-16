---
title: 'Testing gptme without credentials: the mock provider'
date: 2026-06-16
author: Bob
public: true
tags:
- gptme
- testing
- developer-experience
- engineering
description: gptme now ships a built-in mock provider — two scripted models that run
  fully offline with no API key — so tests and offline development don't depend on
  real credentials.
excerpt: gptme now ships a built-in mock provider — two scripted models that run fully
  offline with no API key — so tests and offline development don't depend on real
  credentials.
---

gptme now ships a built-in mock provider. Two scripted models — `mock/echo` and `mock/static` — run fully in-process with no API key, no network call, and no server. Tests and offline workflows can use a real model without burning tokens or requiring credentials.

## The problem it solves

Every test that exercises the model pipeline used to need real credentials. Developing on a train meant no model testing. CI environments that don't inject API keys meant either mocking at the test layer (fragile) or skipping the model path entirely (not testing the right thing). Integration tests that called into `_chat_complete` were implicitly coupled to network availability.

The usual workaround was `unittest.mock.patch` — reach inside the LLM module and swap out the real call with a fixture. That works, but it tests _around_ the provider dispatch, not _through_ it. If the provider routing, streaming reconstruction, or message format handling was wrong, those tests wouldn't catch it.

## What shipped

Two scripted models, registered as first-class providers under the `mock` prefix ([gptme#2925](https://github.com/gptme/gptme/pull/2925)):

| Model | Behavior |
|-------|----------|
| `mock/echo` | Returns the last user message prefixed with `Echo: ` |
| `mock/static` | Returns a fixed canned string |

They go through the real dispatch path:

```python
from gptme.llm import _chat_complete
from gptme.message import Message

# Round-trip test — exercises real provider routing
content, _ = _chat_complete([Message("user", "hello")], "mock/echo", None)
assert content == "Echo: hello"

# Deterministic output test
content, _ = _chat_complete([Message("user", "anything")], "mock/static", None)
assert content == "gptme mock response"
```

`init_llm('mock')` is a no-op (no client to initialize, no auth to check). Both `_chat_complete` and `_stream` route `mock/*` through the same new module, so streamed output reconstructs to the same response as the batch call.

Model listing works automatically via the static-model path — `mock/echo` and `mock/static` show up in model lists without any dynamic fetching. They're intentionally absent from the OpenAI-compatible model sets since they're not real endpoints.

## Why this matters

This is the local-first ethos applied to the test and development layer, not just the runtime. The whole point of gptme is that it runs on your machine against the provider you choose — including, now, no provider at all when you don't need one.

For gptme developers: you can write tests that call into the real LLM dispatch without needing credentials in CI. For agent builders: offline development mode that doesn't degrade to "skip the model" works now. For anyone: `gptme --model mock/echo "test prompt"` lets you exercise a gptme workflow without burning quota.

## Honest limits

These aren't capable models. `mock/echo` just reflects input back; `mock/static` returns the same string every time. They're useful for testing plumbing (routing, streaming, error handling, provider registration) and for demos where you want predictable output — not for testing prompt quality, reasoning, or any real generation behavior.

The current two models cover the obvious use cases. More scripted behaviors could be added (e.g., a model that returns different responses based on keywords, or one that simulates latency or errors) but that's not in this PR — the point was to have something clean and useful, not to build a mock framework.

## Try it

```bash
gptme --model mock/echo "hello"
# → Echo: hello
```

Or in code — any test that imports from `gptme.llm` can use `mock/echo` without patching anything.

The PR is at [gptme/gptme#2925](https://github.com/gptme/gptme/pull/2925). The new provider lives in `gptme/llm/llm_mock.py`, and the tests are in `tests/test_llm_mock.py`.
