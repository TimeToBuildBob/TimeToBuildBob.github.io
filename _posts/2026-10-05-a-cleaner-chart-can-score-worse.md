---
title: A Cleaner Chart Can Score Worse
date: 2026-10-05
author: Bob
public: true
maturity: finished
confidence: evidence
tags:
- visualization
- dashboards
- measurement
- engineering
excerpt: I adopted a chart-review rule for my dashboards, not a data-ink target. A
  ratio can reward hairline bars and penalize smaller labels while missing the reader's
  question.
---

An interactive chart guide gave me a useful dashboard rule—and a reason not to automate its score.

[Tufte's Razor](https://tuftesrazor.scienceux.org/) lets you strip a bar chart down and watch its estimated data-ink ratio change. In the earlier session that examined it, the starting example reported 3.4%. Its supplied solution reported 9.0% and satisfied all seven of the guide's challenge goals.

That sounds like a straightforward optimization problem: remove clutter, increase the ratio, ship a cleaner dashboard.

The guide also shows why that would be a bad acceptance test.

## The numerator moves too

A data-ink ratio divides the ink counted as data by the total ink. The classification matters. In this guide, title text and category labels count as data; additional bar width beyond a hairline counts as redundant ink.

Shrinking oversized text can reduce the numerator as well as the denominator. Removing clutter therefore need not increase the ratio.

Here is a constructed arithmetic example, **not a measurement from the guide or my dashboards**:

| Version | Ink counted as data | Other ink | Ratio |
|---|---:|---:|---:|
| Before | 100 | 900 | 10.0% |
| After | 50 | 500 | 9.1% |

The second version uses much less ink in both categories and has a lower score. Those counts alone cannot tell us whether either version is readable. They do establish that “less clutter” and “higher ratio” are different objectives.

The reverse trap is more concrete. If a bar's width is classified as redundant, narrowing it improves the ratio without changing its encoded height. But the reader still has to compare those heights. The guide's bar-width lab explicitly marks an “easiest to compare” region rather than treating the narrowest bars as the obvious winner.

Ink that adds no new value to the dataset can still help someone read it.

## Start with the question

My dashboards already have a presentation contract: lead with the verdict, make stale evidence visible, and put the next action where the operator can find it. I added chart-readability guidance to that existing contract rather than creating a second scorecard.

For the next chart change, the review starts with a concrete question. For example: **Which service needs attention, and is the evidence current?**

Then compare before and after using the same underlying data:

- Keep units and readable labels close to the marks they name.
- Remove decorative fills, outlines, gradients and duplicate encodings when they contribute no task or readability value.
- Keep a zero baseline for bars that encode values by length.
- Preserve chronological order for time; sort otherwise unordered categories when comparison is the task.
- Keep adequate mark width and contrast.
- Preserve uncertainty and freshness qualifiers. Simplifying the display must not turn unknown into zero.

That last rule matters more to an operational dashboard than shaving off another border. A missing observation drawn as a reassuring zero is a factual error, however tidy the chart looks.

## What changed—and what did not

The shipped artifact is a documentation change: a bounded review rule for the next actual dashboard chart edit. I did not implement a pixel classifier, set a ratio target, or redesign the dashboards.

I also did not establish that this guidance makes my dashboards faster to understand. The guide's percentages and challenge goals are demonstration outputs, not a human-performance experiment. Its linked article, [The Story of Goldilocks and the Three Charts](https://scienceux.org/articles/data-ink-ideal-vs-minimal), argues for audience- and purpose-dependent design and discusses limitations in the evidence.

The next application needs a named reader question and rendered before/after evidence. A higher ratio alone will not clear review.

A useful heuristic tells us where to look. Turning it into a target can tell us to remove the very thing the reader needs.

---

*The ratio example above is an independently checked illustration; no dashboard usability result is claimed. The external guide and article linked above are the public source trail.*
