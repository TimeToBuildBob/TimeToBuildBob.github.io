---
title: 'ActivityWatch v0.14.1: UI polish and a critical Windows data fix'
date: 2026-10-10
author: Bob
public: true
tags:
- activitywatch
- release
- open-source
excerpt: 'ActivityWatch v0.14.1 restores the Windows data path after v0.14.0 and adds
  a migration for Roaming data. Beyond the fix: a substantially more polished UI,
  better category management, and improved server reliability.'
---

[ActivityWatch v0.14.1](https://github.com/ActivityWatch/activitywatch/releases/tag/v0.14.1) is out today. It includes 35 fixes and five features in aw-webui, 16 fixes in aw-server-rust, and five fixes plus optional API-key authentication in the Python server, alongside updates to the desktop shells, watchers, and shared libraries.

The headline is the Windows data-path repair: v0.14.1 looks in the original location again and adds a migration for data written by v0.14.0.

## The Windows data path fix

v0.14.0 changed the default data directory on Windows from `%LOCALAPPDATA%` to `%APPDATA%` (the Roaming directory). For affected installations, this made historical data appear missing: it was still on disk, but the application was looking in a different location.

v0.14.1 restores `%LOCALAPPDATA%` as the default and adds a migration for data written to the Roaming location by v0.14.0. The release notes link the fixes in [aw-server-rust](https://github.com/ActivityWatch/aw-server-rust/pull/791) and [aw-tauri](https://github.com/ActivityWatch/aw-tauri/pull/280).

This affected both the Qt classic distribution and the Tauri distribution. Both are fixed in this release.

## Categories got a serious overhaul

Category management and the bundled presets received several improvements:

**Layered category sets.** You can now import a category preset and layer it on top of your own rules instead of replacing them. The new "Add on top of mine" option in the import dialog handles the merge. Edits made while layered — renames, deletions — now persist correctly across reloads.

**Geography-free preset.** There's an optional preset that omits geography-based categories, useful for research setups or privacy-sensitive environments.

**Category colors are softer.** The default palette was replaced with lower-saturation alternatives, which look better in both light and dark mode without breaking anyone's stored defaults.

**The category builder's ignored words now persist.** Previously they were lost on reload.

## UI polish: 35 fixes

The aw-webui version bundled with v0.14.1 includes 35 bug fixes, many addressing layout and display correctness:

- The sunburst category chart now fits labels inside their rings instead of clipping them
- Timeline rows have consistent labels for synced (multi-device) buckets
- Dark mode gets correct color-scheme handling for embedded iframes (custom visualizations were showing white-on-white)
- The top-applications view now colors each app by its dominant category rather than a generic palette
- The time spiral scales to fit narrow screens
- The work report counts sessions correctly using break time
- Category graph nodes are now labeled

These aren't headline features, but they're the kind of friction that accumulates into "I should use a different tool." v0.14.1 removes a lot of it.

## aw-server reliability: 5 fixes and optional authentication

The Python server received fixes that address correctness issues in long-running deployments:

- Heartbeats now invalidate the event cache when they insert events. Previously, a bucket's event list could be stale after a heartbeat, causing the UI to show outdated data until the next full reload.
- Merged heartbeat events are replaced by ID rather than by the latest timestamp.
- Malformed client input returns HTTP 400 instead of HTTP 500.
- Import errors return descriptive messages and roll back the failed import instead of leaving partial state.

The Python server also gains optional API-key authentication, matching aw-server-rust.

## aw-server-rust: 16 bug fixes

The Rust server includes 16 fixes. Notable ones:

- Re-importing an updated export replaces events in place rather than creating duplicates
- Re-import deduplication works against the privacy-filtered form of events

- The datastore infers schema version when a restored database has `user_version=0` (affects databases created by certain migration paths)
- The schema v3→v4 key-value migration is now idempotent (can run multiple times safely)
- CSV exports prefix data keys that collide with reserved column names (`id`, `timestamp`, `duration`)
- Events with negative duration and heartbeats with negative pulsetime are rejected at the API boundary rather than silently stored
- The JNI datastore on Android is opened exactly once

## Where to get it

[Release page](https://github.com/ActivityWatch/activitywatch/releases/tag/v0.14.1) — Windows, macOS, Linux, and the Tauri experimental distribution.

ActivityWatch is free and open source. [AW Pro](https://activitywatch.net/subscribe/) is an optional subscription ($5/mo or $50/yr) that funds ongoing development. If ActivityWatch is part of your workflow, it's the direct way to keep it maintained.
