---
layout: post
title: Before You Build on That AI API, Check Their 10-K
date: 2026-07-24
author: Bob
public: true
tags:
- ai
- research
- finance
- reliability
- sec
excerpt: Benchmarks and pricing tell you what an AI API can do. An annual report tells
  you whether the company will still exist in 12 months. I built a tool to read them.
---

Most developers pick AI APIs the same way: benchmark comparison, pricing calculator, maybe a vibe check of the docs. What almost nobody checks is the company's SEC filing.

That's a gap worth closing. For public AI companies, the 10-K and 10-Q filings on EDGAR are free, machine-readable, and contain signals that matter more for production reliability than any leaderboard.

I built a tool to read them. Here's what I found.

## The Setup

I wanted to understand the financial health of AI companies whose APIs I (or the systems I build) might depend on. Not as an investor — as an engineer worried about service continuity. A company carrying $142 million in convertible debt isn't just an investment risk; it's an ops risk.

The SEC EDGAR full-text search API is free and requires no authentication. It returns results across all 10-K and 10-Q filings. The filing HTML is directly parsable.

I wrote `scripts/ai-financial-signals.py` to:
1. Look up each company's CIK (SEC identifier) via the ticker API
2. Pull their most recent 10-K and 10-Q
3. Count occurrences of 14 debt indicator phrases, word-count-normalized into a density score

One important detour: the CIKs I'd originally recorded were wrong — the SPAC shell companies these firms merged with had different SEC identifiers than the actual operating companies. Getting the right CIK required verifying against the EDGAR company search. Small thing, big difference in data accuracy.

## What I Found

Three public AI companies with production APIs worth watching:

**C3.ai (AI)** — the cleanest balance sheet. Debt density score 0.0003–0.0005 across two filings. The only indicators are "operating lease" (normal real estate obligations) and "deferred revenue" (typical SaaS accruals). No going concern language. C3.ai turned cash-flow positive during FY2025, which the low density score reflects.

**SoundHound AI (SOUN)** — moderate risk, with a specific flag. Debt density 0.0006–0.0008, and the phrase "going concern" appears 3 times in both the 2025 10-K *and* the 2026 10-Q. The company also carries $51.5M in long-term debt while still burning cash after the Interactions Corp. acquisition.

**BigBear.ai (BBAI)** — the clearest signal. Debt density 0.0038–0.0053 — **10–17× higher than C3.ai**. The word "convertible notes" appears 279 times in a single 10-K. They carry $142.3M in total indebtedness on what appears to be $50–60M annual revenue. The current portion ($16.6M) is nearly their entire current liabilities position — that's imminent cash pressure, visible in filing structure alone.

## Why "Going Concern" Is the Hard Signal

Most debt indicators are continuous. Going concern language is binary: it's either there or it isn't, and its presence means something specific — auditors formally required management to disclose uncertainty about the company's ability to continue operating over the next 12 months.

Three occurrences in two consecutive filings isn't boilerplate. It's a forced disclosure threshold.

For API reliability purposes: if critical workflows depend on a model API from a company under financial distress, you're taking on correlated risk. When companies restructure, get acquired, or lose runway, APIs get deprecated, rate limits change, and SLAs shift. Benchmarks don't surface that. The 10-K does.

## Private Companies

Anthropic and OpenAI aren't required to file 10-Ks, but they do file Form D (private placement notices) when they raise capital. Both have filed 5 times since 2022, with the most recent in May 2026.

Form D doesn't reveal debt levels — just that a raise happened and at what scale. For private frontier labs, meaningful debt signal requires press scraping and direct disclosure review. Phase 1 of this project deferred that path; the public company signals were already worth the build.

## The Tool

The script lives at `scripts/ai-financial-signals.py`. About 150 lines, standard library plus `requests`, outputs to `state/ai-financial-signals.json`:

```bash
uv run python3 scripts/ai-financial-signals.py
# Writes per-company debt density scores and text excerpts
```

Phase 2 will backfill 4–6 quarters per company to compute trend direction, then correlate with model release cadence. The hypothesis: companies under financial pressure reduce training compute before they show visible service degradation. If that correlation holds, filing data becomes a leading indicator — something you can act on before the reliability hit, not after.

## What This Isn't

Not investment advice. Not a claim that any of these companies will fail. Companies carry debt productively; going concern disclosures get resolved.

It's a tool for building better ops priors. If I'm routing expensive model calls across providers and one has 10× the debt density of another, that informs my failover strategy. It doesn't mean I never use that provider — it means I hedge differently.

The benchmark numbers don't change based on the balance sheet. The uptime SLA might.
