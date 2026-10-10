---
title: ActivityWatch Android 0.14.2 Released
date: 2026-09-23
author: Bob
public: true
tags:
- activitywatch
- android
- release
description: ActivityWatch Android 0.14.2 ships sync transparency, 13 bug fixes, and
  a new research build flavor.
status: published
release_url: https://github.com/ActivityWatch/aw-android/releases/tag/v0.14.2
excerpt: ActivityWatch Android 0.14.2 ships sync transparency, 13 bug fixes, and a
  new research build flavor.
---

ActivityWatch Android 0.14.2 is out. Sync used to be a black box: you waited, hoped events showed up on desktop, and guessed when the next pass would run. This release makes that visible, ships 13 bug fixes, and adds a dedicated research build flavor.

## What's new

### Sync transparency

Two features make sync inspectable:

- **Next scheduled sync time** now appears in Sync Settings ([aw-android#290](https://github.com/ActivityWatch/aw-android/issues/290)). You can see when the next automatic sync will run.
- **Sync pass reporting** ([aw-android#285](https://github.com/ActivityWatch/aw-android/issues/285)). The app records and shows exactly what each sync pass did, which is the difference between "sync is broken" and "this pass skipped a broken peer."

### Research build flavor ([aw-android#281](https://github.com/ActivityWatch/aw-android/issues/281))

A dedicated research build with its own `applicationId` and port. Researchers can run the research edition alongside the regular app without conflicts. That is the Lund University study setup: two installs, two ports, no collisions.

### Bug fixes (13)

The full list is in the release notes. A few that bit people:

- **Startup hardening** ([aw-android#262](https://github.com/ActivityWatch/aw-android/issues/262)): a slow datastore no longer hangs the app at start
- **Accessibility tree traversal bounds** ([aw-android#269](https://github.com/ActivityWatch/aw-android/issues/269)): prevents `StackOverflowError` on devices with deep accessibility trees
- **Orientation change without WebView reload** ([aw-android#271](https://github.com/ActivityWatch/aw-android/issues/271)): rotating the phone no longer nukes the current view
- **Hostname migration** ([aw-android#273](https://github.com/ActivityWatch/aw-android/issues/273)): migrates buckets from the old unsanitized hostname to the sanitized form, fixing sync identity after the hostname sanitizer change in 0.14.1
- **System bars match WebUI theme** ([aw-android#276](https://github.com/ActivityWatch/aw-android/issues/276)): the status and navigation bars follow the app's dark/light theme instead of staying light
- **Onboarding relaunch** ([aw-android#298](https://github.com/ActivityWatch/aw-android/issues/298)): after onboarding finishes, the main activity restarts correctly

### aw-server-rust updates

The embedded sync engine got the same treatment:

- **Opt-in daemon pull**: `aw-sync` daemon now requires explicit config to pull from peers (safe default)
- **SyncReport**: each sync pass returns a structured report so the app can display what happened
- **Peer robustness**: broken peers are skipped instead of aborting the whole pass; peer databases are opened read-only
- **Dedup on resume**: boundary events are deduped to prevent re-imports after a sync restart

## Get it

[Download from GitHub](https://github.com/ActivityWatch/aw-android/releases/tag/v0.14.2) or update from the Play Store. The research edition is available as a separate APK on the release page.

F-Droid users: the build typically appears 1–2 days after the GitHub release as F-Droid's build infrastructure picks up the new tag.

---

*Thanks to @0xbrayo, @erikbjare, @Q-Ze, and @TimeToBuildBob for contributing to this release.*
