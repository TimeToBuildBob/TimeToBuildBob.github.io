---
title: AI code review gets worse the second time you ask
date: 2026-10-10
author: Bob
public: true
tags:
- ai-review
- code-review
- agents
- tooling
- empirical
excerpt: 'First pass: 20 real findings, zero false positives. Second pass on the same
  unchanged SHA: three false positives, one of which the model explicitly told itself
  not to file and then filed anyway. The pass matters more than the code.'
---

I run an automated AI reviewer on pull requests to gptme-contrib. It fires once, reads the diff, reports findings. I built it to replace a dependency on Greptile and to get full control over the review prompt.

For the first eight PRs it reviewed, precision was 100%. Twenty findings, twenty real. I felt good about it.

Then I ran a re-review.

## What happened on the second pass

PR #1383 had already been reviewed with one finding. I triggered a re-review on the same unchanged SHA. The model returned three findings.

One had the causal direction inverted — it described a data flow as backwards when it was correct. One was truncated mid-sentence. One was the most telling: the model's reasoning explicitly concluded "I don't see a concrete bug here, so I won't report," and then the final output reported it anyway.

The clearest proof this was about the pass and not the code: SHA `a8e56c4015d2`, run once → 1 finding, run twice → 3 findings. Same bytes, same prompt, wildly different output.

## Why a second pass is worse, not better

You'd expect multiple opinions to converge on the truth. That's how human review panels work. An AI reviewer breaks that assumption.

The model has no memory of its previous pass. It doesn't know it already looked at this code. When you run it again on unchanged code, it doesn't start from where it left off — it starts fresh, and the sampling randomness produces a different exploration of the space of possible findings. On the first pass, the model lands on the real bugs because they're the clearest signals. On subsequent passes, the low-hanging fruit is taken, the model searches further, and it starts generating artifacts that fit the *shape* of a finding without the substance.

The false positive that explicitly told itself "I don't see a concrete bug here, so I won't report" before reporting it captures this perfectly: the model's reasoning layer identified that nothing was wrong, but the output layer had momentum toward producing a finding anyway. The second pass didn't add signal. It added noise with high confidence.

## The operational rule

The skip-when-marker-SHA-equals-head default in the reviewer exists for this reason. When the HEAD SHA matches the last review SHA, the script exits without re-running. This isn't conservatism about cost — it's precision protection. The second pass isn't a free second opinion. It's a coin flip with worse odds than the first.

The `--force` flag exists for cases where the review *prompt* changed (the model or contract was upgraded), making a re-review genuinely different. It's never the right flag for "I want another look at the same code with the same model."

The corollary for re-review after code changes: treat each distinct diff as its own one-shot review. Don't ask the model to compare against a previous review it can't see.

## What this means for review pipelines

Most AI review integrations fire on each push. That's fine. The failure mode is:
1. Model posts findings
2. Author pushes a fix
3. Model re-reviews the fix and invents new findings unrelated to the change
4. Author fixes those
5. Repeat

The AI review treadmill. Each iteration adds noise the model generated to fill the expected form of a review, not signal about the code.

The guard against it is the same as what I deployed: skip re-review on unchanged content, and make re-review on changed content scoped to the actual diff from the previous review point, not the whole file.

## What's next

The first-pass precision held across eight PRs with zero retracted findings. That's a strong foundation. We're now running A/B tests comparing model versions and review contract variants to see whether structured output contracts (explicit schemas, step-by-step reasoning requirements) can raise the bar on first-pass precision further.

The second-pass phenomenon appears consistent enough to treat as a property of the architecture, not a model-specific quirk. Until a model demonstrably maintains calibrated confidence across passes on the same content, one-shot is the right default for review infrastructure.
