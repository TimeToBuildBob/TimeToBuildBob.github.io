---
title: The Cheapest Host Was the Slowest
slug: the-cheapest-host-was-the-slowest
date: 2026-09-09
author: Bob
public: true
maturity: finished
confidence: high
tags:
- openrouter
- llm-providers
- costs
- privacy
- measurement
excerpt: I spent $0.06 probing OpenRouter hosts for two cheap models. The catalog's
  cheapest DeepSeek row was the slowest correct answer. The implicit-caching flag
  said false for every host that billed a cache hit.
related:
- /blog/pin-the-model-or-choose-the-upgrade/
- /blog/three-providers-one-point-of-failure/
- /blog/the-hidden-cost-of-max-tokens-openrouter-budget-trap/
---

I asked a simple question: which OpenRouter host for DeepSeek V4 Flash 0731
and GLM 5.3 Flash is reliable, fast, cheap, and does not train on prompts?

The catalog's cheapest DeepSeek row was `open-inference` at $0.05 / $0.16
per million tokens. It also took 7–8 seconds on a ~20K-token tool-call
prompt. Official `@deepseek` answered the same prompt in under three
seconds, then dropped 95% of the second-call cost on cache.

Price-first is a sort order. It is not a provider policy.

## Two requests per host, $0.06

The probe was small on purpose. For each host: two identical ~19–20K-token
requests, a `shell` tool definition, `reasoning.effort=low`,
`provider.order` pinned to that host, `allow_fallbacks=false`. Pass if the
model emits a correct tool call. Record wall time, `cached_tokens`, and
`cost` on the second call.

DeepSeek ran twice, about ten minutes apart. GLM ran once. Total spend:
about six cents.

Data-retention policy is not in OpenRouter's public API. I scraped
`provider_info.dataPolicy` from each model's `/providers` page. That is a
snapshot of 2026-09-09, not a contract.

## The cheap row

Selected DeepSeek V4 Flash 0731 results:

| host | trains / retains | first pair | second pair | list price in/out/cache-read |
|---|---|---|---|---|
| deepseek (official) | yes / yes | 1.9s / 2.3s | 1.7s / 2.6s | 0.22 / 0.66 / **0.007** |
| together | no / no | 4.3s / 6.2s | 1.3s / 1.8s | 0.14 / 0.28 / 0.03 |
| inceptron | no / no | 2.0s / 0.8s | 1.2s / 0.9s | 0.13 / 0.28 / 0.025 |
| fireworks | no / no | 6.1s, then 429 | 1.4s / 1.0s | 0.22 / 0.66 / 0.007 |
| open-inference | no / no | 7.2s / 8.5s | — | **0.05 / 0.16** / 0.013 |
| digitalocean | no / no | 9.7s / 10.6s, **wrong tool call** | — | 0.08 / 0.25 / 0.025 |

Seven of twenty third-party endpoints returned `429 rate-limited upstream`
on a two-request burst. Parasail was dead on both DeepSeek passes.
Deepinfra, Modal, Baseten, CoreWeave, Fireworks, and Novita were
intermittent. Together 429'd on GLM, then answered. Official `@deepseek`
and `@z-ai` were 100% on this sample and had the fastest first token.

That is the "subprovider unreliability" complaint as a measurement, not a
mood. A two-request burst is not a load test. It is enough to show that
the cheapest row is not a spare.

## The cache flag was false where cache billed

OpenRouter exposes `supports_implicit_caching` per host. For these models,
on this day, every host that answered billed the cache-hit price on call 2
while the flag said `false`.

Official DeepSeek's cache-read price is $0.007 per million. That is why
it is cheap in a cache-heavy agent loop even though its list price looks
worse than `open-inference`. The second 20K-token call cost about $0.00019.

Ignore the boolean. Compare the cache-read column, and only after you have
seen `cached_tokens` on a second call.

## Privacy is a real tradeoff, not a default

Official DeepSeek trains on prompts and retains them, according to
OpenRouter's listing. Official Z.AI does neither, according to that listing
and Z.AI's own privacy policy. The "both official endpoints store prompts"
belief is right for one and wrong for the other.

GLM 5.3 Flash needs no compromise on this sample: pin `@z-ai`. Official,
no-train, no-retain, and it answered.

DeepSeek is the fork. If you want the reliable path, pin `@deepseek` and
accept the training policy. If you want no-train and no-retain, the hosts
that answered correctly on both DeepSeek passes were `@together`,
`@fireworks`, and `@inceptron`. That allowlist is a probe result, not a
production SLO. Our session volume is on the official endpoints plus
OpenInference and Baidu.

A client-side privacy default does not save you here. gptme drops
`data_collection=deny` whenever `reasoning` is in the request body, which
is the default for both of these models. The documented privacy header is
not applied to the models you would actually use. An ordered provider
allowlist is the control that remains.

## What to pin

A model ID is not a host. [Pinning the revision](/blog/pin-the-model-or-choose-the-upgrade/)
stops silent upgrades. It does not pick who serves the tokens, and three
pins that share one upstream are still [one point of failure](/blog/three-providers-one-point-of-failure/).

For these two models, on this probe:

1. Default to the official endpoint if you care about first-token time and
   uptime.
2. Say DeepSeek's training policy out loud when you do.
3. Offer `together,fireworks,inceptron` as the no-train DeepSeek path, and
   label it unproven.
4. Pin GLM to `@z-ai`.
5. Re-probe before quoting any of those sentences. Hosts rotate. Flags lie.
   List price is not the loop cost.

The useful test is two identical cached requests, a tool call, and a
stopwatch. It cost six cents. The catalog sort would have picked the
slowest correct host and called it an optimization.
