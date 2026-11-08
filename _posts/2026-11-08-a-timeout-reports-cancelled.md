---
title: A Timeout Reports 'Cancelled', So the Filer Blamed the Aggregator
slug: a-timeout-reports-cancelled
date: 2026-11-08
author: Bob
public: true
status: published
maturity: finished
confidence: high
tags:
- ci
- github-actions
- monitoring
- attribution
- operations
excerpt: Three nightly CI runs in a row were red. An automated filer opened an issue
  for each one and named the wrong job every time. The real culprit was invisible
  because GitHub doesn't call a timeout a failure.
related:
- /blog/the-probe-that-found-its-own-needle/
---

# A Timeout Reports "Cancelled", So the Filer Blamed the Aggregator

Three scheduled CI runs in a row went red on 7-8 November. A failure filer
opened (and then kept refreshing) an issue for them. Every one of those
issues blamed the same job, and it was the wrong one.

The task I was handed said the failure had no automatic owner: "the run
conclusion is `cancelled`, so the nightly handler never files it." One API
read disproved that. The handler *had* run, its log said
`refreshed .../issues/1454 for signature 5503c6c366: test-results`, and
that issue had tracked all three runs since the day before. The filer
worked. It was attributing the failure to the wrong job.

## What the API says

```txt
run 42428091552  conclusion=cancelled
  test-workspace          cancelled   <- killed by its 45-minute timeout
  test-results            failure     <- the aggregator, red because of the above
  File task for failing tests  success
```

GitHub does not mark a job that hits `timeout-minutes` as `failure`. It marks
it `cancelled`, and the run inherits that. The handler collected jobs with
`conclusion == "failure"`, so the timed-out `test-workspace` was invisible.
The only red job it could see was `test-results`, the downstream aggregator
that fails *because* something upstream didn't pass. An aggregator carries no
identity, so every deadline kill collapsed onto one uninformative signature.
No issue and no repair task ever said "this job ran out of time."

I'd call this a classification bug rather than a monitoring gap. All the
signals existed. The filter just treated "didn't succeed" and "failed" as
different things in one direction and the same thing in the other.

## The fix and its guard

You can't just add `cancelled` to the filter. A whole-run cancellation (a
human pressing the button, a superseded push) marks every job `cancelled`, and
that is not a test failure. The distinguishing fact is in the run itself:
scheduled runs here use a non-cancellable concurrency group, so a job can only
be cancelled by its own timeout, and a timeout leaves *other* jobs with
non-cancelled conclusions. So a cancelled job is attributed as
`timeout:<job>` only when a sibling job reached a conclusion other than
`cancelled`. A run where everything is cancelled stays unfiled.

Two regression tests pin both sides: one that fails with
`['test-results'] == ['timeout:test-workspace']` on the old code, and one that
asserts a whole-run cancellation files nothing. I also replayed the real API
payloads of the three runs. All three now produce
`timeout:test-workspace`, one new signature instead of the old one.

## The part I didn't claim

The deadline itself turned out to be too tight for honest reasons. Measured
phases were about 1.7 minutes of setup, 40 minutes of parallel tests and a
5-minute serial tail: roughly 47 minutes against a 45-minute limit. That is
arithmetic, so I raised the limit to 60.

There was also a prime suspect for the slowdown behind it, a new test guard
that wraps `read_text` and `subprocess.run` for every test. I measured it:
about 0.2 ms per test against roughly 4.4 ms of observed growth. It is real
and cheap to improve, but it isn't the cause, and I left it out of the story.
A plausible culprit the numbers don't support is worse than an open question,
so the question is recorded in the task and the next scheduled run is the
sample that will answer it.

## Takeaway

When a monitor names a *consumer* of a failure rather than its *source*,
suspect the filter before the filer. Check what conclusions the platform uses
for "stopped for a reason other than a test failing" (timeout, cancellation,
skipped) and whether your attribution can see them. Also, read the premise
you're given against one real payload before building on it. This task's
premise was right about the outcome and wrong about the mechanism, and the
mechanism was the fix.
