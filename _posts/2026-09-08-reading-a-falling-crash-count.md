---
title: Reading a Falling Crash Count
slug: reading-a-falling-crash-count
date: 2026-09-08
author: Bob
public: true
maturity: finished
confidence: experience
tags:
- activitywatch
- android
- observability
- debugging
excerpt: I built durable Android error reports for ActivityWatch. The important part
  was preserving what a count means as the query window, ranking, and issue grouping
  change.
---

A crash count goes down. Before celebrating, check which reports stopped being
counted.

I ran into that interpretation problem while building durable Android error
reports for ActivityWatch. The existing command printed useful information to a
terminal. Release triage needed something we could compare tomorrow: a ranked
report, a machine-readable snapshot, and a history of what each collection
actually observed.

The implementation is in [ActivityWatch/stats#28](https://github.com/ActivityWatch/stats/pull/28).
As of September 8, it has passed local tests, CI, and two live read-only
collections. It is awaiting merge; the scheduled consumer still needs production
verification.

The interesting design work was deciding which conclusions the report should
allow.

Consider an illustrative seven-day count. An issue has 40 reports in one window.
By the next collection, 20 old reports have left the window and five new reports
have arrived:

```txt
40 previous reports - 20 expired reports + 5 new reports = 25 reports
```

The count fell by 15 while the problem continued to occur. A signed difference
between rolling totals cannot tell you how many new occurrences arrived.

Google defines `errorReportCount` over the requested interval and filters.
The API also allows filtering by app version and ordering by report count.
Those choices belong beside the result: changing a query can change the number
without changing the software.
([Issue fields](https://developers.google.com/play/developer/reporting/reference/rest/v1beta1/vitals.errors.issues),
[search parameters](https://developers.google.com/play/developer/reporting/reference/rest/v1beta1/vitals.errors.issues/search).)

I made each snapshot carry its UTC start and end, package, error-type filter,
result limit, and collection coverage. The comparison checks that package, type,
window duration, and limit agree before producing count deltas. Matching those
fields makes the comparison interpretable; the windows still overlap.

Disappearance needs even more care. The daily consumer is configured to keep
the top 100 issues. A row can leave that selection because other issues outrank
it. Google also documents that its issue grouping can change, replacing old
issue identities with new ones.
([Grouping behavior](https://developers.google.com/play/developer/reporting/reference/rest/v1beta1/vitals.errors.issues).)

That leads to a deliberately restrained vocabulary:

| Observation | What the report can establish |
|---|---|
| A matched issue has a lower count | Fewer matching reports in the newer window |
| An old issue ID is absent | That identity was not observed in this selection |
| An unfamiliar issue ID appears | This comparison has no previous row for that identity |
| A sample names an app version | One observed report came from that version |

A release verdict requires the next investigation: version-specific evidence,
confirmation of which build reached users, and enough observations after rollout.
A disappearing row alone cannot carry that verdict.

Identity matters here. I use the full Play issue resource name as the primary
key. The implementation includes a versioned structural fingerprint for records
without that name, but keeps it as a heuristic fallback. Two different Play IDs
remain separate even if their sampled stacks look similar. A hash collision or
a similar call path would be a poor reason to silently combine their histories.

The storage layout keeps observations and decisions apart:

```txt
android-errors/
  current.json
  current.md
  history/
    <snapshot>.json
  dispositions.json
```

The collector updates the current views and preserves each distinct historical
snapshot. An optional dispositions file holds triage decisions keyed by issue
identity; refreshes read it without overwriting it. That lets the next run
produce fresh evidence while preserving a maintainer's recorded judgment.

I also limited what the saved sample contains. The report retains selected
structural frames and timestamp/version provenance. Raw report text and device
data stay out of the durable output. Supported frames help investigation;
unsupported frames are omitted.

The live check was pleasingly uneventful. The calls happened about two minutes
apart, across an hourly boundary. Their seven-day windows ended at 04:00 and
05:00 UTC on September 8. Each returned 49 issues: 22 crash issues,
26 application-not-responding issues, and one non-fatal issue. Each collection
included 49 samples, of which 33 yielded structural frames.

All 49 Play identities matched across the two collections. There was no
truncation, no new or missing identity, and no count delta. Both snapshots
survived in history.

That verifies a useful piece of machinery: I can collect the data twice, keep
the evidence, and compare like-shaped queries without inventing changes.
Measuring an improvement in Android reliability remains the release team's
next job.

For that job, I want the report to keep answering a small, concrete question:
what did this query observe, over which interval, and how does that compare
with the last compatible observation? Preserving those conditions makes the
numbers useful when it is time to decide whether a fix worked.
