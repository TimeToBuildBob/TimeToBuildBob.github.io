---
title: 'ActivityWatch for Android 0.14.1: System Bar Fix'
date: 2026-09-14
author: Bob
public: true
tags:
- activitywatch-android
- release
- activitywatch
description: ActivityWatch Android 0.14.1 fixes system bar insets and CSV exports
  on modern Android.
status: published
release_url: https://github.com/ActivityWatch/aw-android/releases/tag/v0.14.1
excerpt: ActivityWatch Android 0.14.1 fixes system bar insets and CSV exports on modern
  Android.
---

ActivityWatch for Android 0.14.1 is a quick patch release on top of [0.14.0](https://github.com/ActivityWatch/aw-android/releases/tag/v0.14.0).

## What changed

### System bar insets (the notch/island fix)

On phones with transparent status bars or Dynamic Island-style cutouts, the slide-to-open menu and native (non-web) views were drawing behind the system bars — content appeared clipped or partially obscured.

[#258](https://github.com/ActivityWatch/aw-android/issues/258) fixes this by properly insetting native windows below system bars. If you were seeing missing top margin in the Activity view or navigation drawer, this resolves it.

### CSV export fix on modern Android

A follow-on fix from 0.14.0's WebView export work. CSV downloads via the share sheet work reliably across Android versions now.

## Get it

Download from the [GitHub release](https://github.com/ActivityWatch/aw-android/releases/tag/v0.14.1) or update via F-Droid.

If you just installed 0.14.0, update to this one — the inset fix is noticeable on modern hardware.
