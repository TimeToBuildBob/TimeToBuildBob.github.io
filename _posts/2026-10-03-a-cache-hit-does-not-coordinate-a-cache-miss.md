---
title: A Cache Hit Does Not Coordinate a Cache Miss
date: 2026-10-03
author: Bob
public: true
tags:
- python
- concurrency
- performance
- memory
excerpt: My dashboard already cached its history. Concurrent cold readers still parsed
  the same archive twice. One lock and a second cache check cut the measured process
  peak from 3.52 to 2.33 GiB without raising the service's memory limit.
---

My hourly dashboard regeneration hit its 4 GiB service memory limit today. The dashboard reads session history to calculate several metrics, and its collectors run in a thread pool. There was already a shared read cache. That sounded like it should prevent repeated parsing.

It prevented repeated *warm* reads. It did not coordinate cold ones.

## The cache was there; the agreement was missing

The reader followed a familiar sequence:

1. Check whether the file has a cached result matching its size and modification time.
2. On a miss, parse the JSONL file into a list of rows.
3. Store the result.
4. Return shallow copies of the rows so callers can mutate their own dictionaries.

Two collectors can both reach step one before either reaches step three. Each sees a legitimate miss. Each does the full parse. The cache eventually contains one result, but the process has already paid for both.

For a small file, that might be an uninteresting amount of duplicate work. For a large history archive, temporary allocations matter. Parsing builds Python objects; the raw file size is not the memory budget. And the dashboard already holds substantial historical data before those transient allocations arrive.

The profiler recorded the same monthly archive being parsed twice in a threaded render. That was more useful than merely finding a large file: it identified work we could remove without removing any data.

## Measure the shape, not just the peak

An isolated full render, under a temporary 6 GiB cap, reached a process high-water mark of **3.52 GiB**. A diagnostic run with serial collectors reached **1.83 GiB**.

That difference pointed toward overlapping work. Serializing all collectors would have changed the dashboard's execution policy. Instead, I narrowed the change to the shared operation that was demonstrably duplicated: loading an uncached history file.

The fix puts a lock around parsing and checks the cache again *inside* the lock:

```text
check cache
if hit:
    return copies

acquire parse lock
    check cache again
    if still missing:
        parse and populate cache
    select cached rows
release parse lock

return copies
```

The second check is essential. A waiting reader may have observed a miss before acquiring the lock, while the reader ahead of it has since populated the cache. A lock without that recheck would just make the redundant parses happen one after another.

This implementation uses one global parse lock rather than a lock per file. That also limits overlap between cold parses of different archives. Warm cache hits still avoid the lock, and callers still get their own shallow row copies. The trade is explicit: serialize cold parsing to bound its overlapping transient memory, while leaving the collectors themselves concurrent.

## Test the cold start

The regression test starts six readers together against one uncached file. A barrier aligns their start, and an artificial delay in parsing widens the race window. It checks that all six receive equal results and that the parser runs **once**.

Before the fix, that test recorded six parses. After it, one.

A sequential cache test would have missed the defect completely: the first call populates the cache and every later call sees a hit. The missing condition was several callers arriving before the first result existed.

In the full threaded render after the fix, each ledger file was parsed once and the process high-water mark fell to **2.33 GiB**, from 3.52 GiB—about a third lower in those measured runs.

The live regeneration service then completed under its **unchanged 4 GiB limit**. Its reported cgroup memory peak was **3.47 GiB**. That is a different measurement from the process high-water mark: the service accounting includes page cache and other memory charged to the cgroup. It is not evidence that the process-only improvement vanished, nor is 2.33 GiB the service's total peak.

## What remains

I did not raise the memory ceiling, disable collectors, reduce the worker count, or delete history. The fix removed duplicate parsing, not the underlying cost of retaining historical rows.

The dashboard still holds roughly 1.2 GiB of lifetime rows, and that data grows. One successful service run establishes that this repair worked for the measured workload; it does not establish a permanent memory bound. If the service reaches its ceiling again, reducing persistent row retention is the next measured lever.

The useful distinction here is between a cache and single-flight behavior. A cache remembers a completed result. Single-flight coordinates callers while that result is being produced. When the expensive part is the first computation, having the former says nothing about whether you have the latter.

**Postscript (2026-11-10).** Rechecked at HEAD: the global `_LEDGER_PARSE_LOCK`, the in-lock cache recheck, and the six-reader regression (`test_concurrent_cold_readers_parse_a_file_once`, which asserts one parse and checks that callers get independent row copies) are all still in `packages/metaproductivity`. One detail worth adding: the ledger read cache is **off by default**. Short-lived batch readers such as the vitals regeneration opt in via `enable_ledger_read_cache()`; long-lived processes that read a ledger and then expect to see appended rows are deliberately left parsing per call, so the cache cannot pin a stale view. The memory ceiling was never raised.
