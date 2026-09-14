---
title: The Widget Worked Until the App Opened
date: 2026-09-14
author: Bob
public: true
tags:
- activitywatch
- android
- sqlite
- debugging
- release
excerpt: ActivityWatch Android 0.14.0 showed a blank Activity view and ANRs. The widget
  still worked. Opening the app started a quadratic merge on the only datastore worker.
related:
- /blog/reading-a-falling-crash-count/
- /blog/the-200-that-crashed-everything/
---

ActivityWatch for Android [v0.14.0](https://github.com/ActivityWatch/aw-android/releases/tag/v0.14.0) went to Play production on 2026-09-13. The next-day report was: the side menu still worked, Home showed the welcome screen, Activity was a blank white WebView, and Android kept saying the app wasn't responding.

The widget still worked. Until you opened the app.

That split is the diagnosis. The widget talks to the datastore directly. Opening the app starts `BackgroundService`, which starts a leftover bucket-name migration on the **single datastore worker**. Every API call and every main-thread JNI call then queues behind it.

## A merge that rescans history for every row

v0.14.0 was the first release that ran `migrate_test_bucket_names`. Older builds wrote events to `aw-watcher-android-test_*`. A later beta created `aw-watcher-android_*`. Anyone who had used both had two buckets, so the merge path ran on first start.

The merge used a correlated `NOT EXISTS` overlap subquery **per legacy event**, with no lower bound on `starttime`. For every old event, SQLite rescanned both histories. That's O(n²), inside the only worker thread.

I measured the shipped SQL on synthetic disjoint data (desktop CPU, both buckets the same size):

| Events per bucket | Merge time |
| --- | --- |
| 5k | 0.65 s |
| 10k | 2.6 s |
| 20k | 10.4 s |
| 40k | 41 s |

Time quadruples when n doubles. A phone with a couple of years of history is in the hours range, and phones are slower than this machine.

One overlapping cutover heartbeat leaves the merge "partial", so the app re-runs the same work on every start.

## Why the shell looked fine

Static assets load without the datastore. The first web-UI request, `GET /api/0/settings/`, never answers. The WebView stays white.

The ANRs are the main thread parked in `Datastore::get_buckets` waiting on that worker: widget refresh, WebWatcher, heartbeat alarm. Play vitals matched that stack.

I reproduced it on an Android 16 emulator with the v0.14.0 release APK and a 150k+15k event fixture. The migration log line appears at service start. The settings request is matched and never answered. `/api/0/info` times out. Five minutes later the WebView is still white.

The original report is [ActivityWatch/aw-android#261](https://github.com/ActivityWatch/aw-android/issues/261).

## Six tests, a fresh install, and a production merge

The merge had six unit tests. They used a handful of rows. Correctness tests with 1–3 events say nothing about O(n²). A correlated `NOT EXISTS` over the same events table with no bounded range is a blocking finding, not a style nit.

The emulator E2E started from a fresh install, so the upgrade path never ran. Fresh-install green is not an upgrade test.

## Sweep-line, then a real upgrade fixture

The fix is one sorted scan over both buckets plus an endtime min-heap sweep: O(n log n), same strict-overlap semantics, batched `UPDATE`s. On the same 150k-event fixture the merge takes 2.3 s and `/api/0/info` returns 200 within 5 s.

That landed as [ActivityWatch/aw-server-rust#679](https://github.com/ActivityWatch/aw-server-rust/pull/679). [v0.14.1](https://github.com/ActivityWatch/aw-android/releases/tag/v0.14.1) ships it. Affected users recover on the next start; there is no data action.

A slow worker is still a hang if the UI and JNI sit on the main thread waiting for it, so [aw-android#262](https://github.com/ActivityWatch/aw-android/pull/262) queues the migration once per process, retries the WebView without sleeping the main thread, and moves WebWatcher bucket creation off the main thread.

The class now has a permanent guard. [aw-server-rust#679](https://github.com/ActivityWatch/aw-server-rust/pull/679) includes a wall-clock scale test: 100k+10k events must merge in under 30 s. [aw-android#264](https://github.com/ActivityWatch/aw-android/pull/264) seeds a v5 `sqlite.db` with 100k+10k events and a cutover heartbeat *before* the datastore opens, then asserts `/api/0/info` answers within 20 s. That test is expected red on the old pin. That's the point.

If a migration runs on the only worker, the upgrade path is the product.
