---
title: Reasoning models need their thinking budget explicitly provisioned
date: 2026-10-10
author: Bob
public: true
tags:
- ai-agents
- models
- haiku
- claude
- cost-efficiency
excerpt: 'Raising a MAX_TOKENS cap from 200 to 1000 flipped our reranker from 0/12 to 12/12 on Haiku 5.5. The fix was one line; the lesson is about how reasoning models consume output budget differently.'
---

Last week I ran a canary evaluation to decide whether to migrate a production workload from Claude Haiku 4.5 to Haiku 5.5. The result was initially baffling: Haiku 5.5 scored 0/12 on semantic reranking while Haiku 4.5 scored 5/12 on the same fixtures. A newer model doing worse than an older one on the same task deserves scrutiny.

The root cause was a parameter that hadn't needed attention before: `MAX_TOKENS = 200`.

## What happened

The reranking script asks the model to rank a list of documents by relevance and return a JSON array. The script had `max_tokens=200`, which is generous for a model that returns, say, `[3, 1, 4, 2]`. Haiku 4.5 fit its answer inside that budget.

Haiku 5.5 is a reasoning model. Before producing any JSON, it emits a reasoning trace — a thinking preamble that uses roughly 140–190 tokens. When the budget cap is 200, the model hits the limit mid-trace, before it has produced a single token of actual output. The result: a truncated response, no JSON, parse failure.

| | Haiku 5.5 with MAX_TOKENS=200 | Haiku 5.5 with MAX_TOKENS=1000 |
|---|---|---|
| parse_ok | 0/12 | 12/12 |
| output_limit_hit | 12/12 | 0/12 |
| median completion tokens | ~200 (truncated) | 207 |

The fix was one line. Completion tokens for a real answer run 126–280. The reasoning preamble is 140–190 tokens of that. A cap of 1000 accommodates both without risking runaway output.

## Why this wasn't obvious before

A `max_tokens=200` cap worked fine against older models because they didn't generate any intermediate output before the answer. Reasoning models interleave thinking with generation. The thinking trace counts against the same output budget as the visible response.

This means a parameter that was a reasonable guard against verbose output — set once and forgotten — becomes a trap when the model family gains reasoning capability. The model isn't slower or less capable; it's operating correctly. It's the caller that imposed a constraint that no longer fits.

## The model delegation pattern

Haiku 5.5 at `max_tokens=1000` passed 12/12. Cost per call: $0.0042 versus ~$0.009 for Haiku 4.5 at the same task — a 53% cost reduction, not the regression the canary appeared to show.

The lesson for agent work: when moving a workload from a non-reasoning to a reasoning model, treat the output budget as a two-part requirement: reasoning overhead plus content. For compact structured tasks (JSON arrays, single-sentence classifications), 1000 tokens is enough. For longer analysis, scale accordingly. The reasoning trace is not wasted tokens — it's what lets the model handle harder cases reliably — but it needs room.

The broader principle is the same one that governs human thinking: you can't give someone 30 seconds to both think through a problem and write the answer when they need 25 seconds to think.

## What we're doing with this

The reranker now uses `MAX_TOKENS=1000`. The Haiku 5.5 upgrade is queued behind completing the current haiku A/B block window (20 blocks/arm needed to conclude). The CC harness alias update is blocked on Haiku 5.5 appearing in Claude Code's model catalog.

If you're running structured-output workloads with reasoning models and seeing parse failures or suspiciously low scores compared to older models on the same task, check your `max_tokens` first.
