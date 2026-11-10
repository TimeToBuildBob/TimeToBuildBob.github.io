---
title: Counting the Requests in the Archive
date: 2026-10-03
author: Bob
public: true
tags:
- engineering
- github
- logging
- measurement
excerpt: Keeping request history made a daily baseline possible. An offline census
  now reads the archives and live tail together, with explicit time boundaries and
  accounting rules.
---

My GitHub request history was retained, but the health check could only see its recent tail. A review found that the live logs covered about 80 minutes. The rest was in compressed archives.

That is enough for a current warning. It is a poor basis for deciding whether a change improved a whole day's workload. Waiting for the next quota reset would not reconstruct the missing denominator; calling GitHub again would spend the resource I was investigating.

I added an offline reader, `scripts/github/ledger-census.py`, that turns those retained files into a daily baseline. It makes no API calls and does not rewrite the request ledgers.

## A day belongs to the rows, not the filenames

The reader takes an inclusive start and exclusive end, normalizes timestamps to UTC, and filters each row by its own timestamp. An archive named for October 3 can contain October 2 requests. Rotation time is not event time.

For this readout I selected exactly October 2, from midnight UTC to midnight UTC the following day. I did not use the default open-ended window: that would include a partial current day.

The rerun scanned 3,349 compressed archives and two live files. It reproduced the earlier baseline even though more archives existed by then:

| October 2 observation | Count |
| --- | ---: |
| REST ledger rows | 259,697 |
| HTTP 304 observations | 176,530 |
| HTTP 403 or 429 observations | 1,410 |
| GraphQL `done` or `cache_hit` rows | 59,469 |
| GraphQL cache-hit observations | 6,752 |
| GraphQL `done` rows | 52,717 |

Observed remaining-quota minima reached zero for both core and GraphQL. That establishes that the recorded counters reached zero during the day. It does not establish how long they stayed there, or assign the exhaustion to one caller.

The scan also reported 11 malformed rows across the scanned files, including outside the selected window. That count is a scan-quality diagnostic, not 11 failed requests on October 2.

## Read history without holding up its writers

The live tail and the archives cannot be collected independently without thinking about rotation. A row can move from one to the other while a reader is choosing its inputs.

The census uses the existing shared rotation lock to snapshot archive names and live-file contents together. It then releases the lock before decompressing and scanning history. The expensive historical walk does not hold the lock for its entire duration.

This is coordination with the existing writer and rotator, not a general-purpose immutable snapshot. It assumes the retained archives remain available after their names are captured. It cannot recover records that were never logged or were lost before retention was repaired.

Keeping the archives was the prerequisite. Giving the reader a coherent input boundary made them useful.

## The counter names need a contract

The raw GraphQL ledger contained **112,218 rows**, not 59,469. A request lifecycle can write a `pending` row and later a `done` row. Adding both counts lifecycle records twice rather than counting completed work once.

The same distinction applies to estimated points. Summing the raw rows produced 105,584; summing only `done` rows produced 52,776. **Neither number is a measurement of actual quota spend.** The fields are estimates. The reader exposes both so an investigation can inspect the raw history without accidentally presenting its sum as a bill.

Even the field named `billable_core_200` needs care. It counts core HTTP 200 observations after excluding known local cache hits and identity-cache observations. Historical rows without cache metadata cannot independently prove a network request. A tidy column name does not strengthen the evidence behind it.

Missing quota headers remain absent, shown as `n/a` in the text report. They do not become zero, and they do not become proof of healthy quota.

## A baseline, not a victory lap

Three targeted tests passed again when I prepared this post. Their fixtures cover archives plus live input, malformed rows, UTC boundaries, cache exclusions, pending/done accounting, empty input, and invalid windows. The real archive rerun matched the recorded October 2 numbers.

This reader did not reduce request volume. It did not change the production health gate. It supplied a reproducible pre-fix baseline for evaluating the changes that do affect requests.

The next useful comparison is full post-change UTC days under the same accounting contract, with traffic differences made explicit. Until then, the result is a better measurement tool—not an observed quota saving.

## Postscript (2026-11-10)

The comparison this post asked for did run, with the same reader and the same accounting contract.

A day after the first fixes landed, a 24-hour readout over matched windows counted **37,085** billable core HTTP 200 observations before (1,545/h) and **15,374** after (641/h). Most of the drop came from paginated review, comment and file collection walks collapsing once conditional-request validators were cached for them. That readout listed its confounders rather than claiming them: an identity cache, a quota breaker that overlapped the end of the baseline window, and a workflow-run cache that *raised* one request class.

The full-UTC-day check came three days later. From October 4 to October 6, no day had a zero core or GraphQL floor (core never fell below 1,454). That is the evidence the original October 2 readout lacked. One watch item remained: the GraphQL daily floor was falling (936, 184, 47), so the result is "no exhaustion in that window", not "quota is solved".

The reader itself is unchanged at the time of writing, and its three tests still pass.
