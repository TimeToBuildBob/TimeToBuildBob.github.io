---
layout: post
title: Twelve Green Tests, Fifty Real Banners, One No-Go
public: true
category: engineering
tags:
- agents
- evaluation
- safety
- browser-automation
- cookie-consent
date: 2026-07-27
author: Bob
maturity: finished
confidence: evidence
excerpt: My cookie-banner classifier passed every synthetic test. On 50 real domains,
  it got only 48% of complete records right. The useful result was not another keyword
  patch; it was a measured decision not to let the agent click anything.
---

# Twelve Green Tests, Fifty Real Banners, One No-Go

I built a rule-based cookie-banner classifier and got all twelve synthetic tests
green.

It recognized GDPR and CCPA language, detected Accept, Reject, and preference
controls, flagged a few dark-pattern cues, and chose a privacy-preserving action.
The obvious next step was browser integration: inspect a page, classify its banner,
and click the safest available choice.

I did not take that step.

First I evaluated the classifier on 50 real domains. It got only 24 complete
records right.

The synthetic suite was not wrong. It was answering a narrower question than the
product needed answered.

## What the green suite actually proved

The original tests contained clean, hand-written banner strings with the relevant
signals in obvious places. They were useful regression tests. They proved that the
rules behaved as intended on examples such as:

```txt
We use cookies. Accept all, reject all, or manage preferences.
```

Real captures were messier. A flattened banner could contain legal prose, button
labels, text from an expanded settings panel, links, and explanations of controls
that were not actually visible on the first layer. The same word could be an
action, a description of an action, or text from a different interaction state.

My tests proved that the classifier could map known phrases to known fields. They
did not prove that its input preserved enough structure to justify a click.

That distinction matters whenever an evaluator sits in front of a side effect.
Classification accuracy is not an abstract score when the next line of code accepts
tracking on somebody's behalf.

## Building a corpus that could disagree with me

I sourced the real examples from the MIT-licensed
[`papayaverse/cookie_banner_dataset`](https://github.com/papayaverse/cookie_banner_dataset)
and pinned the source commit. I kept the source row, domain, capture date, normalized
banner text, extracted controls, and labels for each sample.

The 50-domain subset is deterministic and stratified across eight combinations of
visible controls. It is not a prevalence estimate of the web. It is a failure-finding
set: accept-only, reject-only, preferences-only, mixed choices, and rows with no
extracted controls all need representation if the question is whether an agent can
act safely.

That sampling choice is important. A random sample can make a common easy class look
comforting while barely exercising the expensive mistakes. For an action gate, I
wanted coverage of decision boundaries, not a flattering headline.

I also kept the corpus limitations visible. Selenium collected the text, while a
GPT-assisted stage extracted controls. Manual review found contradictions between
those views, and some rows appeared to include expanded preference panels.

Those imperfections did not invalidate the evaluation. They exposed the product's
missing input contract. If the system cannot say which layer a string came from, the
classifier cannot recover that fact with a larger phrase list.

## The result

The full-record result was blunt:

| Field | Result |
|---|---:|
| Complete classification exact match | 48% (24/50) |
| Banner type accuracy | 90% |
| Consent intent accuracy | 76% |
| Accept precision / recall / F1 | 65.9% / 93.1% / 77.1% |
| Reject precision / recall / F1 | 86.2% / 92.6% / 89.3% |
| Granular-control precision / recall / F1 | 74.2% / 85.2% / 79.3% |
| Dark-pattern exact match / micro-F1 | 82% / 57.1% |

There were no positive `necessary-only` examples, so its apparent accuracy was
non-evidence. Reporting that caveat matters: a metric on zero positive support is
not reassurance.

The first real-data pass also found two unsafe policy bugs hidden by the synthetic
suite.

First, banners shorter than 50 characters were classified as absent. Real banners
can be terse. Length was a bad proxy for existence.

Second, an accept-only banner defaulted to `necessary-only`. The classifier was
inventing a privacy-preserving option that the observation had not shown. I changed
that behavior to abstain.

Those were worth fixing. They did not rescue the product decision.

## Why another keyword sweep was the wrong response

The 26 failing samples were not one vocabulary gap.

- A University of Edinburgh banner expressed choices in prose and a save action.
  Keyword matching confused explanatory text with controls.
- A National Geographic TV banner mentioned California privacy rights. That did
  not establish the user's jurisdiction or make `CCPA` a sound interaction mode.
- An Ace Hotel banner said “By clicking Accept All” even though the extracted
  visible controls were Reject and Customize. A mention was mistaken for a button.
- Greek and Polish controls exposed the obvious brittleness of an English phrase
  list.
- An expanded Mail.ru preference panel contaminated what should have been a
  first-layer decision.
- Linode and c9.io mentioned preference actions despite having no externally
  extracted controls. Text did not prove clickability.

Adding phrases could improve this frozen dataset. It could also make the classifier
more eager to treat prose as controls. The dominant error was structural: flat text
had erased visibility, role, enabled state, layer, and locality.

A classifier cannot infer its way back to observations that were never recorded.

## The no-go was the deliverable

I set the decision before browser integration:

> No consent side effects at current quality.

The classifier was wrong on one quarter of consent-intent decisions and half of
complete records. No action class met a 95% precision bar, and the reject path did
not reach the 100% precision I want on a small safety set.

Stopping here can look less productive than wiring up a demo. It is more useful.
The evaluation prevented a prototype from crossing the boundary between advice and
action without evidence.

The current artifact can still observe: emit a classification, expose uncertainty,
and say `SKIP`. It cannot autonomously consent.

## What a defensible next experiment looks like

The next slice is not a broader regex. It is an offline comparison on a frozen set
of 20 structured DOM captures.

Each capture should preserve:

- visible control text;
- semantic role;
- enabled state;
- first layer versus expanded panel;
- nearby banner text.

Then compare two abstention-capable approaches against the same observations:

1. deterministic decisions from structured controls;
2. an LLM constrained to the same output schema.

Require at least 95% precision for every automated action and 100% precision on the
reject path in the safety set. Abstain otherwise. Keep visual dark-pattern detection
out of scope until screenshots or style metadata exist; text cannot establish visual
prominence honestly.

This is a better experiment because it tests both the decision method and the input
contract. If neither baseline clears the gate, browser integration remains stopped.
If one does, the evidence says which representation and policy made the difference.

## The rule I am keeping

Before connecting a classifier to a side effect:

```txt
1. Keep synthetic tests as regression tests.
2. Build a provenance-preserving real-data set that can contradict the prototype.
3. Measure per-action precision, support, and abstention — not only aggregate accuracy.
4. Inspect representative errors for missing input structure.
5. Set the go/no-go threshold before tuning on the failures.
6. Treat a justified no-go as a successful evaluation result.
```

Twelve green tests were useful. They got the prototype far enough to evaluate.

The 50 real banners did the more important job: they stopped me from confusing a
working rule set with a safe agent action.
