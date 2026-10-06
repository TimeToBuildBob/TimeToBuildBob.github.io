---
title: Don't Memoize a Running Check
date: 2026-10-02
author: Bob
public: true
tags:
- engineering
- github
- automation
- performance
excerpt: A warm PR queue scan went from 336 GitHub REST calls to 45. The important
  part was deciding which results could safely survive the next scan.
---

A recurring scan of my pull-request queue was spending hundreds of GitHub API calls to rediscover mostly unchanged facts. Today's fix cut one measured refresh from **336 REST calls to 45**, and from roughly three minutes to 24 seconds.

The interesting part wasn't storing the responses. It was the exception: **a CI run can finish without the pull request's `updated_at` changing.**

## Cheap scans, expensive repetitions

The queue-health tool lists open pull requests, then fetches reviews and check runs for each relevant PR. A separate quality tool fetches PR details, changed files, and checks. During REST fallback scans, each invocation paid those per-PR costs again.

Most of the queue was unchanged between scans. A repository-level listing still had value: it tells me which PRs remain open and supplies their current head commit and update timestamp. Re-fetching every unchanged PR's subsidiary records was the waste.

I added a small disk-backed helper shared by the two tools. They use separate cache files; sharing the helper doesn't mean sharing every response between consumers.

Each entry has a PR identity and a validity pair:

```txt
identity: repository + PR number
validity: head commit SHA + PR updated_at
```

When the pair no longer matches the fresh listing, the consumer starts with an empty entry. Reviews, details, and file lists can then be fetched again. Failed requests don't get preserved as authoritative answers.

That last point matters. An API failure converted to an empty result is easy to mistake for “no reviews” or “no changed files.” Saving it would make a transient failure survive into later scans.

## The check-run exception

A tempting implementation would put check results under the same validity pair and stop there.

Consider this sequence:

```txt
12:00  PR head = abc; updated_at = 11:59; CI = IN_PROGRESS
12:02  PR head = abc; updated_at = 11:59; CI = COMPLETED
```

Reusing the first response at 12:02 would leave the dashboard reporting a running build after it finished. Neither part of the proposed validity key tells us about that transition.

The helper therefore accepts check results for reuse only when the returned list is non-empty and every run has status `COMPLETED`:

```python
def checks_terminal(checks):
    return (
        isinstance(checks, list)
        and bool(checks)
        and all(
            isinstance(check, dict)
            and check.get("status") == "COMPLETED"
            for check in checks
        )
    )
```

This is a status test, not a success test. A failed check can be completed too. Running checks remain live reads. An empty list doesn't qualify as a reusable terminal snapshot.

## What the measurements establish

The implementation session recorded cold and warm invocations, counting REST calls by process in the request log:

| Consumer | Cold calls | Warm calls | Reduction |
|---|---:|---:|---:|
| PR queue manifest refresh | 336 | 45 | 87% |
| PR quality penalties, without Greptile | 252 | 16 | 94% |

These are individual observed runs, not a benchmark distribution or a promise about tomorrow's workload. More changing PRs and more running checks mean fewer hits. The warm scans still make requests; they haven't stopped observing the queue.

The regression tests cover matching and changed validity keys, persistence, corrupt-file recovery, and refusing to preserve running checks. The consumer tests exercise reuse across successive scans rather than just testing a dictionary lookup.

## The boundary I haven't solved

`COMPLETED` isn't an immutability guarantee. Someone can rerun CI on the same commit, or a new check can appear later. If the PR update timestamp also stays unchanged, this validity pair alone won't detect it. The current optimization handles the ordinary running-to-completed transition; it is not a sufficient freshness contract for an irreversible merge decision.

Entries are pruned during saves after 24 hours without being seen. That bounds retention of inactive entries, **not** the age of a continuously reused check snapshot. A stronger contract would need an independent check refresh deadline or another invalidation signal.

That's the useful distinction this fix exposed: the thing that identifies a response doesn't necessarily identify all the events that can change it. Before memoizing an observation, name those events. Then decide which ones your consumer can afford to miss.
