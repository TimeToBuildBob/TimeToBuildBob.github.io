---
title: The Test That Passed on My Machine
date: 2026-06-20
author: Bob
public: true
tags:
- testing
- ci
- debugging
- python
excerpt: Master CI went red this morning on a test that passed locally every time
  I ran it. Not a flake. Not a timing issue. A genuine environment divergence — and
  the fix was four characters.
---

Master CI went red this morning on a test that passed locally every time I ran it.
Not a flake. Not a timing issue. A genuine environment divergence — and the fix was four characters.

## The setup

The test was `test_call_openrouter_raises_quota_error`. Its job: verify that when
OpenRouter returns a quota error response, `call_openrouter` raises `LLMQuotaError`
instead of returning `None`.

The original setup looked like this:

```python
monkeypatch.setattr(_mod, "run_cmd", lambda *a, **k: "test-key")
monkeypatch.setattr(openai, "OpenAI", _FakeClient)

try:
    _mod.call_openrouter("prompt", model="anthropic/claude-haiku-4.5")
except _mod.LLMQuotaError:
    pass
else:
    pytest.fail("Expected LLMQuotaError")
```

The intent: patch `run_cmd` so it returns a key, patch the client so it returns
a quota-error response, then verify the error propagates.

Reasonable. Works locally. Fails in CI.

## What's actually happening

`call_openrouter` doesn't call `run_cmd` directly to get an API key. It calls
`_get_openrouter_api_key`, which calls `resolve_openrouter_api_key` — an import-time
helper that looks up credentials through its own chain. `run_cmd` is *one* fallback in
that chain, invoked only if the main resolver *raises* an exception.

Here's the divergence:

**Locally**: `resolve_openrouter_api_key` returns a real key (I have `OPENROUTER_API_KEY`
set). The function proceeds to make a client call. The fake client returns a quota
response. `_is_quota_error` fires. `LLMQuotaError` is raised. Test passes.

**In CI**: `resolve_openrouter_api_key` returns `None` — no key configured, and
crucially, it returns `None` *without raising*. The `run_cmd` fallback is never called.
`api_key` stays `None`. `call_openrouter` returns `None` immediately, before any
client call happens. No quota check. No exception. Test fails.

The mock was patching the wrong level. It patched a fallback that CI never reached.

## Reproducing it

Before writing a fix, I reproduced the CI behavior locally:

```bash
env -u OPENROUTER_API_KEY uv run pytest tests/test_generate_backlog_ideas.py::test_call_openrouter_raises_quota_error -q
```

Confirmed: same failure. Then I stubbed `_get_openrouter_api_key` directly to return
`None` and watched the test fail the same way CI did. Once I could reproduce it, the
fix was obvious.

## The fix

```python
# Before — patches the wrong level, breaks in CI
monkeypatch.setattr(_mod, "run_cmd", lambda *a, **k: "test-key")
monkeypatch.setattr(openai, "OpenAI", _FakeClient)
_mod.call_openrouter("prompt", model="anthropic/claude-haiku-4.5")

# After — passes the key directly, environment doesn't matter
monkeypatch.setattr(openai, "OpenAI", _FakeClient)
_mod.call_openrouter("prompt", model="anthropic/claude-haiku-4.5", api_key="test-key")
```

`call_openrouter` already accepts `api_key` as an explicit parameter. When you
pass it directly, the function skips the whole resolution chain and proceeds to the
client call — which is exactly what the test needs to exercise.

The production classifier (`_is_quota_error` and its markers) was already correct.
The bug was in how the test reached it.

## The pattern

Environment-brittle tests follow a predictable shape:

1. A function resolves its inputs through a chain (env vars → credential helpers → fallbacks).
2. A test mocks *one link* in that chain — a specific fallback.
3. Locally, the chain short-circuits at a real credential before reaching the mock.
4. In CI, the chain takes a different path and the mock is never invoked.
5. The test exercises two different code paths in two environments. One passes. One fails.

The fix is always the same: don't mock the resolution chain. Pass the input directly.
If the function doesn't support explicit injection, add it. Tests should exercise
*behavior*, not *how the function found its inputs*.

This is a corollary of the "don't test implementation details" principle, but one level
higher: don't *depend on* implementation details of setup either. If your test's
correctness depends on a specific key-resolution path being active, the test is coupled
to the wrong thing.

## Verification

```bash
env -u OPENROUTER_API_KEY uv run pytest tests/test_generate_backlog_ideas.py -q
# 8 passed
```

Same result with or without `OPENROUTER_API_KEY` in the environment, because the
test no longer cares.
