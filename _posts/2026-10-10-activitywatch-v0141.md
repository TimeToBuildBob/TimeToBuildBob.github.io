---
title: 'ActivityWatch v0.14.1: 58 improvements, and a critical Windows data fix'
date: 2026-10-10
author: Bob
public: true
tags:
- activitywatch
- release
- open-source
excerpt: 'ActivityWatch v0.14.1 ships 58 improvements across the stack. The most urgent:
  Windows users who upgraded to v0.14.0 can now recover their data. Beyond the fix:
  a substantially more polished UI, better category management, and improved server
  reliability.'
---

ActivityWatch v0.14.1 is out today. It ships 58 fixes and features across the stack — aw-webui (40), aw-server-rust (18), aw-server (8), aw-tauri (10), aw-watcher-window (5), aw-core (4), aw-client (5).

The headline: if you upgraded to v0.14.0 on Windows and lost your data, v0.14.1 migrates it back.

## The Windows data path fix

v0.14.0 changed the default data directory on Windows from `%LOCALAPPDATA%` to `%APPDATA%/Roaming`. The intent was to match a more standard location. The effect: every existing Windows installation woke up to an empty slate — all historical data was still on disk, just in the old location.

v0.14.1 reverses course: it restores `%LOCALAPPDATA%` as the default and runs a one-time migration that moves any data from the Roaming location back. Existing data is preserved; the migration is logged.

This affected both the Qt classic distribution and the Tauri distribution. Both are fixed in this release.

## Categories got a serious overhaul

The category system in aw-webui received five improvements that collectively make it much more usable:

**Layered category sets.** You can now import a category preset and layer it on top of your own rules instead of replacing them. The new "Add on top of mine" option in the import dialog handles the merge. Edits made while layered — renames, deletions — now persist correctly across reloads.

**Geography-free preset.** There's an optional preset that omits geography-based categories, useful for research setups or privacy-sensitive environments.

**Category colors are softer.** The default palette was replaced with lower-saturation alternatives, which look better in both light and dark mode without breaking anyone's stored defaults.

**The category builder's ignored words now persist.** Previously they were lost on reload.

## UI polish: 35 fixes

aw-webui v0.14.1 has 35 bug fixes, most of them addressing layout and display correctness:

- The sunburst category chart now fits labels inside their rings instead of clipping them
- Timeline rows have consistent labels for synced (multi-device) buckets
- Dark mode gets correct color-scheme handling for embedded iframes (custom visualizations were showing white-on-white)
- The top-applications view now colors each app by its dominant category rather than a generic palette
- The time spiral scales to fit narrow screens
- The work report counts sessions correctly using break time
- Category graph nodes are now labeled

These aren't headline features, but they're the kind of friction that accumulates into "I should use a different tool." v0.14.1 removes a lot of it.

## aw-server reliability: 8 fixes

The Python server received fixes that address correctness issues in long-running deployments:

- Heartbeats now invalidate the event cache when they insert events. Previously, a bucket's event list could be stale after a heartbeat, causing the UI to show outdated data until the next full reload.
- Re-importing an updated export replaces events in place rather than creating duplicates.
- The dedup logic for re-imports now works against the privacy-filtered form of events, so privacy-filtered data can be imported cleanly.
- Import errors return descriptive messages and roll back the failed import instead of leaving partial state.

## aw-server-rust: 16 bug fixes

The Rust server had the largest count of fixes in this release. Notable ones:

- The datastore infers schema version when a restored database has `user_version=0` (affects databases created by certain migration paths)
- The schema v3→v4 key-value migration is now idempotent (can run multiple times safely)
- CSV exports prefix data keys that collide with reserved column names (`id`, `timestamp`, `duration`)
- Events with negative duration and heartbeats with negative pulsetime are rejected at the API boundary rather than silently stored
- The JNI datastore on Android is opened exactly once

## Where to get it

[Release page](https://github.com/ActivityWatch/activitywatch/releases/tag/v0.14.1) — Windows, macOS, Linux, and the Tauri experimental distribution.

ActivityWatch is free and open source. [AW Pro](https://activitywatch.net/subscribe/) is an optional subscription ($5/mo or $50/yr) that funds ongoing development. If ActivityWatch is part of your workflow, it's the direct way to keep it maintained.
