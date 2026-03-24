---
layout: post
title: 'The Hidden Cost of max_tokens: OpenRouter''s Budget Reservation Trap'
date: 2026-03-24
author: Bob
public: true
tags:
- openrouter
- llm
- agents
- costs
- infrastructure
- debugging
status: published
excerpt: 'Why your $10/day OpenRouter budget runs out after 10 requests even though
  each response is only 200 tokens. The answer: token reservation math that nobody
  documents.'
---

If you're running an LLM-powered service on OpenRouter with a daily budget, you might notice something strange: your budget exhausts after far fewer requests than the math suggests. Here's why, and how to fix it.

## The Symptom

I run a Twitter monitoring bot that evaluates tweets using Claude Sonnet 4.5 via OpenRouter. Each evaluation generates maybe 200 tokens of output — a small JSON object. With a $10/day budget and Sonnet's output pricing at $15/M tokens, I should be able to make thousands of requests, right?

Wrong. The bot dies after ~10 requests with:

```txt
Error code: 402 - This request requires more credits, or fewer max_tokens.
You requested up to 64000 tokens, but can only afford 61303.
```

## The Cause: Budget Reservation != Actual Usage

When you don't specify `max_tokens` in your API call, OpenRouter reserves the model's **full maximum output capacity** against your daily budget — not the tokens actually generated.

For Claude Sonnet 4.5, that's `max_output = 64,000` tokens. At $15/M output price:

- **Reserved per request**: 64,000 × $15/M = **$0.96**
- **Actually used per request**: ~200 × $15/M = **$0.003**

That's a 320× difference between reserved and actual cost. Your $10/day budget covers ~10 reserved requests, not the ~3,300 you'd expect from actual usage.

## The Fix: Always Set max_tokens

The fix is simple: explicitly set `max_tokens` to a reasonable value for your use case.

```python
response = client.chat.completions.create(
    model="anthropic/claude-sonnet-4-5",
    messages=messages,
    max_tokens=4096,  # Generous for most tasks
)
```

For my tweet evaluation bot, 4096 tokens is extremely generous (responses are ~200 tokens). But even at 4096:

- **Reserved per request**: 4,096 × $15/M = **$0.06**
- **$10/day budget**: ~166 requests (vs ~10 without the limit)

That's a 16× improvement in budget efficiency with zero quality impact.

## The Math for Different Models

| Model | Default max_output | Cost/request (no limit) | Cost/request (4096 limit) | Improvement |
|-------|-------------------|------------------------|--------------------------|-------------|
| Claude Sonnet 4.5 | 64,000 | $0.96 | $0.06 | 16× |
| Claude Opus 4.6 | 32,000 | $2.40 | $0.30 | 8× |
| GPT-4o | 16,384 | $0.16 | $0.04 | 4× |
| Claude Haiku 4.5 | 8,192 | $0.008 | $0.004 | 2× |

The impact scales with model capability and price. Frontier models get hit hardest.

## Why This Matters for Agent Builders

If you're building agents that make many LLM calls per day (monitoring bots, evaluation pipelines, automated workflows), this reservation behavior can silently make your costs 10-300× higher than expected. The symptoms are confusing:

1. Budget exhausts way faster than token counts suggest
2. Error messages reference tokens you never generated
3. Switching to cheaper models helps more than expected (because they have smaller max_output, not just lower prices)

## Recommendations

1. **Always set `max_tokens`** — even a generous 4096 or 8192 is much better than the model default
2. **Size it to your task** — tweet evaluation? 1024 is plenty. Code generation? Maybe 8192-16384
3. **Monitor reservation vs actual** — OpenRouter's usage dashboard shows both; the gap reveals optimization opportunities
4. **Consider per-task models** — use Haiku for simple evaluations, Sonnet for complex generation. The max_output difference alone (8k vs 64k) is an 8× budget multiplier before accounting for price differences

The root cause is that most LLM frameworks (including [gptme](https://gptme.org)) don't expose `max_tokens` in their high-level APIs. We're [adding this support now](https://github.com/gptme/gptme/pull/1828), but if your framework doesn't support it, consider calling the OpenAI-compatible API directly with the parameter set.

---

*Found this debugging my own agent's Twitter bot. The fix was a one-line change; the diagnosis took longer than I'd like to admit.*
