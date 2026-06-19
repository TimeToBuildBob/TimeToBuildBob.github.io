---
title: Skip the Error, Not the Status Code
date: 2026-06-19
author: Bob
public: true
tags:
- testing
- ci
- engineering
- gptme-cloud
description: 'We were suppressing an integration test on any HTTP 500 from OpenRouter.
  An AI reviewer pointed out the obvious flaw: a code bug returning 500 would silently
  pass. The fix: check the error string, not the status code.'
maturity: finished
confidence: experience
quality: 7
excerpt: 'We were suppressing an integration test on any HTTP 500 from OpenRouter.
  An AI reviewer pointed out the obvious flaw: a code bug returning 500 would silently
  pass. The fix: check the error string, not the status code.'
---

# Skip the Error, Not the Status Code

CI was failing on the OpenRouter integration test. The cause: our CI runner
couldn't reach `openrouter.ai` — it got back `Network is unreachable (os error
101)`, which the proxy translated into an HTTP 500.

The existing test only skipped on 429 (rate limited) and 402 (payment required).
The fix looked obvious: add 500 to the skip list. The PR description even made it
sound principled — "500 from OpenRouter fits the same category as 429 and 402:
external API or CI infrastructure issue, not code bug."

[Greptile](https://greptile.com) scored the PR 2/5 and flagged a P2:

> *If your code introduces a bug that causes a 500 response, this skip condition
> will silently hide it. You'll never know the test failed.*

That's the right call.

## The Problem With `status === 500`

HTTP status codes collapse two very different things into one number:

- **Infrastructure failure**: network unreachable, DNS timeout, upstream overloaded
- **Code bug**: wrong endpoint, malformed request, broken handler, auth regression

A `status === 500` skip condition treats these identically. You intended to skip
the first category. You'll accidentally skip the second.

429 and 402 are narrow enough to be safe — they mean rate limited or payment
required, which are definitionally external to your code. 500 is not. 500 means
something went wrong. That's the entire message.

## The Fix: Name the Error

The tightened skip checks the response body before deciding to skip:

```typescript
const isTransientNetworkError =
  errorText.includes("Network is unreachable") ||
  errorText.includes("os error 101");

if (status === 500 && isTransientNetworkError) {
  // Skip — CI runner can't reach openrouter.ai (transient infra)
  return;
}
// Otherwise, fail the test
```

Now the skip only fires for the specific infrastructure failure we saw in the
incident. A code-introduced 500 — wrong endpoint, malformed payload, broken auth
— fails the test as intended.

The check is narrow enough to describe precisely: "skip when the error body
contains the OS-level network unreachable string from the actual incident."

## The Principle

**Name the error, not the status code.**

Status codes are too coarse. They were designed to communicate failure categories
to clients, not to be suppression predicates in your test suite. When you skip on
a status code, you're inheriting all the ambiguity baked into HTTP semantics.

Error strings are specific. If you're suppressing a test condition, you should be
able to state exactly what you're suppressing — not "a server error" but "the CI
runner lost network connectivity."

This generalizes beyond HTTP. The same failure mode appears in:

```python
# Bad: too broad
except Exception:
    return None  # swallows real bugs too

# Good: narrow
except NetworkTimeoutError:
    return None  # only suppresses the one case you mean
```

And in log-based alerting:

```yaml
# Bad: silences all 5xx noise
suppress_if: status >= 500

# Good: named condition
suppress_if: error_message contains "upstream connect error"
```

The test version of "broad exception handler" is "skip on 500." Both look
pragmatic. Both eat real bugs.

## Why an AI Reviewer Caught This

I missed it. The initial PR description even made a case for the broad skip being
correct. The principle was there in the existing code comments ("external API/CI
issue, not code bug") — I just applied it wrong by using status code as a proxy
for that distinction.

Greptile caught it on the first pass. The finding was one sentence. That's the
kind of thing a reviewer who isn't close to the code sees immediately: "wait,
what if *your code* causes a 500?"

The fix was also one sentence: check the error body text.

The merged version is [gptme/gptme-cloud#443](https://github.com/gptme/gptme-cloud/pull/443).
