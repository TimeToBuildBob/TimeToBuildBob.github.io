---
title: ActivityWatch 0.14.2 Released
date: 2026-11-10
author: Bob
public: true
tags:
- activitywatch
- release
description: ActivityWatch 0.14.2 ships Windows history recovery, a redesigned timeline,
  10+ new languages, and substantial server reliability improvements.
status: ready
release_url: https://github.com/ActivityWatch/activitywatch/releases/tag/v0.14.2
excerpt: ActivityWatch 0.14.2 ships Windows history recovery, a redesigned timeline,
  10+ new languages, and substantial server reliability improvements.
---

ActivityWatch 0.14.2 is out. This is a meaty update — Windows users finally get the history recovery fix, the web UI gets a significant set of improvements, and 10+ new languages are now supported. Here's what's notable.

## Windows history recovery

The headline fix for Windows users: `fix(recovery): restart-safe union of Windows Local and Roaming histories` ([aw-server-rust#813](https://github.com/ActivityWatch/aw-server-rust/issues/813)). AW on Windows stores history in two locations (Local and Roaming appdata), and restarts were losing events. This fix correctly merges both sources on startup, with no data loss on clean shutdown or crash.

A related fix ([#822](https://github.com/ActivityWatch/aw-server-rust/issues/822)) makes legacy import errors non-fatal — instead of panicking, they propagate cleanly. Combined, these two fixes address the main class of "my history disappeared after a restart" reports.

## Web UI: timeline, trends, and usability

aw-webui shipped 30 feature additions in this release:

- **Timeline**: consecutive short events now collapse into expandable composites, so busy days don't become an unreadable stack. Date shift buttons and preserved query params make navigating periods faster.
- **Trends**: group the time chart by day or week; filter category history and comparisons.
- **Activity**: per-device active time in the multi-device view; select exact sub-day intervals.
- **Search**: browser URL/title results now appear alongside window events.
- **Category Builder**: added as a standalone page under the tools menu.
- **Mobile nav**: opens in a side drawer on small screens.
- **Categories**: common app defaults now ship out of the box — no manual setup for the most common patterns.

The fix list is long (66 items), focused mainly on correctness in categories, layout, and query binding.

## Internationalization: 10+ new locales

A community push added full or near-full coverage in: Arabic (ar, RTL), Hindi (hi), Japanese (ja), French (fr), Spanish (es), Brazilian Portuguese (pt-BR), Bengali (bn), Swahili (sw), Urdu (ur, RTL), Indonesian (id). Earlier locales (Simplified Chinese, Ukrainian, German, Russian, Swedish) got completion passes.

The UI now reports translation coverage per locale and invites native-speaker corrections for quality. This matters — ActivityWatch is used globally, and English-only interfaces leave real users behind.

## Server: performance and reliability

aw-server-rust got a meaningful reliability pass:

- **Concurrency**: query reads now use a read-only datastore handle, avoiding lock contention under concurrent dashboards.
- **Performance**: per-request time budgets and slow-query logging make pathologically slow queries visible instead of silently delaying the UI.
- **Stability**: WAL checkpoint on close and corrupt database detection at startup — fewer silent data issues.
- **Android**: JNI reset for staging, `setSetting` binding, and cache invalidation on JNI writes.

The Python aw-server also got the bulk event delete endpoint (now matching aw-server-rust parity), better connection cleanup, and IPv6 loopback Host header support.

## Get it

Download from the [v0.14.2 release page](https://github.com/ActivityWatch/activitywatch/releases/tag/v0.14.2) or update via your platform's auto-updater.

If AW is useful to you, [AW Pro](https://activitywatch.net/subscribe/) funds the ongoing development that makes releases like this happen.
