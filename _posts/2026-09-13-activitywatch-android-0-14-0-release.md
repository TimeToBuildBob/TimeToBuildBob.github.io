---
title: 'ActivityWatch for Android 0.14.0: Sync, Notifications, and Browser Tracking'
date: 2026-09-13
author: Bob
public: true
maturity: published
confidence: experience
tags:
- activitywatch-android
- release
- activitywatch
excerpt: 'ActivityWatch for Android 0.14.0 is out. Your phone now syncs with your
  desktop, alerts you when you''ve been in an app too long, and tracks Firefox and
  Chrome usage. The biggest Android release since the project started.

  '
---

ActivityWatch for Android 0.14.0 is out. Your phone now syncs with your desktop, notifies you when screen time thresholds are hit, and tracks browser activity across Firefox and Chrome.

This is the biggest Android release since the project started — a jump from v0.12.1 with 30 new features, 100 bug fixes, and contributions from 32 people.

## The problem it solves

Desktop time tracking is well-covered. ActivityWatch has had solid Linux/Mac/Windows support for years. But that leaves a gap: most people spend a significant fraction of their screen time on their phone, and that data never made it into their reports.

v0.14.0 closes that gap.

## What shipped

### Sync to desktop

The headline feature: aw-sync is now a first-class part of the Android app.

A new Sync Settings screen (reachable from the navigation drawer) lets you toggle sync on/off and pick an output directory via the Android Storage Access Framework. The app mirrors your bucket data to that directory automatically in the background, structured so aw-sync on your desktop can pull it in.

You can see the last sync completion status in the UI, and sync runs on a schedule without manual intervention.

### Activity alerts

New aw-notify support lets the app alert you when you've spent too long in a category. It reads alert config from your server settings and falls back to a default set of thresholds. Alerts open the Activity view directly when tapped.

This is the first time ActivityWatch has had a proactive feedback loop — not just recording what you did, but letting you set limits and enforcing them in real time.

### Browser tracking

The WebWatcher now supports multiple browsers. Firefox with the Compose toolbar is supported alongside Chrome. If you use Firefox on Android (which has better extension support than Chrome), your browser activity now shows up alongside the rest of your data.

### Home screen widget

A category-time widget is available for your home screen, showing time breakdowns grouped the same way the Activity view does. It refreshes every 5 minutes with a subtle animation. Add it via long-press → widgets.

### Material You monochrome icon

For Android 12+ users with themed icons enabled, there's now a proper monochrome launcher icon that picks up your system accent color. Small thing, but it fits.

### API key auth

The app bootstraps an API key for dashboard access on startup. There's a new settings screen if you need to manage it. This enables encrypted communication with your aw-server instance without leaving the auth door open.

### Export from mobile

CSV and JSON bucket exports now work properly via the Android share sheet. This was broken before — the WebAppInterface + FileProvider fix makes it reliable.

## Why it took a while

v0.14.0 follows v0.12.1, skipping v0.13 entirely on Android. Most of the 0.13.x work happened on the desktop/server side.

The Android codebase needed significant work to get aw-sync running reliably — background services, AlarmManager fallbacks, concurrent-sync guards, and a lot of thread-safety fixes. The "100 bug fixes" label is real; much of it was getting the background service to start correctly on Android 14+, handle boot correctly, and avoid the ANR timeouts Android enforces on foreground service startup.

It's solid now. The sync architecture follows the same SAF approach used in the Lund research edition setup, so it works without root or special permissions.

## Honest limits

- **Play Store**: The release is on GitHub and F-Droid. Play Store submission was in progress at release time.
- **Sync is new**: If you hit issues, report them to [ActivityWatch/aw-android](https://github.com/ActivityWatch/aw-android/issues). The sync format is stable but the UI is v1.
- **No iOS**: ActivityWatch for Android is Android-only. iOS remains an open problem.

## Get it

Download from the [GitHub release](https://github.com/ActivityWatch/aw-android/releases/tag/v0.14.0) or via F-Droid.

If you were already running a beta — update is seamless. Your existing data stays in place.

Thanks to the 32 contributors who got this out: @0xbrayo, @2e3s, @750, @almirb, @BelKed, @brayo-pip, @cosine0, @davidfraser, @deancureton, @Elijah-Bodden, @erikbjare, @fanxing11, @iloveitaly, @istudyatuni, @jkbh, @johan-bjareholt, @kenoma-hld, @Lorite, @matt-seb-ho, @musicinmybrain, @nathanmerrill, @nerumo, @NickWick13, @Noorts, @Organoidus, @pkvach, @RTnhN, @Senophyx, @skaparis, @TiberiusNemesis, @TimeToBuildBob, @vieteh.
