---
title: A Thousand Results Is Not the Whole Dataset
date: 2026-10-05
author: Bob
public: true
maturity: finished
confidence: evidence
tags:
- engineering
- github
- measurement
- reliability
excerpt: My weekly report refused a capped GitHub search. Splitting the date range
  recovered 1,139 PR evidence rows without pretending the first thousand were the
  whole population.
---

My weekly orchestration report stopped generating because its GitHub search returned 1,000 pull requests.

That was a successful search response. It was also the maximum number the fetcher requested—the GitHub search result ceiling. The report could not tell whether those thousand rows were the whole population or a truncated prefix.

The existing guard refused to calculate a metric from them. That refusal was useful. The repair was to recover the missing evidence, not remove the guard.

## Pagination has a ceiling

The report follows work through task creation, dispatch, pull requests, review and merge. Its PR fetch starts with an author-filtered search over a rolling date window, then retrieves details in GraphQL batches.

A capped search corrupts the population before the detailed fetch even begins. If the missing PRs differ from the returned ones, a review or merge rate calculated from the returned set can be misleading. Fetching perfect details for those thousand rows would not recover the omitted PRs.

Requesting more pages is not a general cure for a search result ceiling. Shortening the report's window would change the question. Accepting the first thousand would change the denominator without admitting it.

I kept the window and split the query.

## Divide the range, discard the parent

The implementation uses inclusive calendar-day ranges. A result below the cap is accepted. A result at the cap is discarded, and the range is split into two non-overlapping children.

Here is an illustrative four-day split, not the live run's query trace:

```txt
October 1–4 reaches the cap
  October 1–2 reaches the cap
    October 1 is below the cap: keep it
    October 2 is below the cap: keep it
  October 3–4 is below the cap: keep it
```

The right child starts on the day after the midpoint. Starting both children on the midpoint would overlap the inclusive ranges.

Discarding the parent is just as important. Keeping the capped parent and appending the child results would mix duplicate rows with recovered rows. Only accepted leaf searches feed the existing detail fetch.

A regression test uses a cap of two to force recursive splitting with a tiny fixture. Its parent response contains PR numbers 99 and 100; the accepted children contain 1, 2 and 3. The test checks the exact query windows and confirms the discarded parent numbers never enter the GraphQL request.

## Keep the unsolved boundary visible

What if one calendar day still returns 1,000 rows?

The fetcher raises an error. It does not write a replacement evidence file. A second regression checks that an existing file survives this failure unchanged.

This is conservative: exactly 1,000 matches and more than 1,000 matches look the same through the returned list. The code refuses both. It does not establish the true count from separate metadata.

A narrower partition might solve a future single-day overflow. I did not add one without that observed need. The repair handles the failure we had while preserving a clear boundary for the one it cannot handle.

Preserving yesterday's file is not permission to present yesterday's evidence as fresh. The fetch has failed; the consumer still needs to keep that failure and the evidence date visible.

## What the recovery proves

After the repair, the service completed successfully and regenerated its reports. The recovered PR evidence had **1,139 rows and 1,139 distinct repository/PR-number identities**. All 16 focused orchestration tests passed.

Those checks establish recovery beyond the previous thousand-row ceiling, unique PR identities in that output, and the tested partitioning behavior. They do not prove that every per-PR timeline is exhaustive or that downstream causal attribution is correct. Nor do disjoint date ranges turn several live API requests into a transactional snapshot.

The useful contract is narrower: a capped parent response is never silently treated as a complete population. The fetcher either gets below-cap partitions across the original range or refuses to replace the evidence.

When a measurement stops because its evidence is incomplete, making the number appear again is the wrong acceptance criterion. Recover the population—or keep the gap visible.

## Postscript, November 10

I re-checked the fetcher before publishing. The bisection is unchanged: capped parents are still discarded, and a capped single day still raises instead of replacing the evidence file. The weekly report has run every Monday since, most recently on November 9. No single-day overflow has occurred yet, so the narrower partition is still unbuilt. The focused test file now has 18 tests, and all of them pass.
