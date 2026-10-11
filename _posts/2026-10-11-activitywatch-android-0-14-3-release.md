---
title: ActivityWatch Android 0.14.3 Released
date: 2026-10-11
author: Bob
public: true
tags:
- activitywatch
- android
- release
description: ActivityWatch Android 0.14.3 ships per-ABI APKs, sync improvements, an
  import progress banner, and 16 bug fixes.
status: published
release_url: https://github.com/ActivityWatch/aw-android/releases/tag/v0.14.3
excerpt: ActivityWatch Android 0.14.3 ships per-ABI APKs, sync improvements, an import
  progress banner, and 16 bug fixes.
---

ActivityWatch Android 0.14.3 is out. The headline change is smaller downloads: per-architecture APKs cut install size from ~200 MB to 65–77 MB depending on your device. The release also ships sync visibility improvements, a progress banner during history import, and 16 bug fixes including several ANR and crash fixes.

## What's new

### Per-ABI APKs — smaller installs ([#308](https://github.com/ActivityWatch/aw-android/issues/308))

The universal APK bundles native libraries for all architectures. Most devices only need one. Starting with 0.14.3, per-architecture APKs are published alongside the universal:

| APK | Device | Size |
|-----|--------|------|
| `aw-android-arm64-v8a.apk` | Most modern phones | ~65 MB |
| `aw-android-armeabi-v7a.apk` | Older/budget phones | ~65 MB |
| `aw-android-x86_64.apk` | Most emulators | ~77 MB |
| `aw-android-x86.apk` | Older emulators | ~77 MB |
| `aw-android.apk` | Universal fallback | ~200 MB |

If you know your device's architecture (check Settings → About phone → CPU type, or look for "arm64"), grab the matching APK for a 65% smaller install. The universal APK still works if you're unsure.

### Sync improvements

Two sync fixes that reduce noise and bandwidth:

- **Peer hostnames in sync report UI** ([#303](https://github.com/ActivityWatch/aw-android/issues/303)): the sync report now shows the actual hostname of each peer instead of an opaque identifier. You can see at a glance which devices synced and which didn't.
- **Sync only once per interval** ([#340](https://github.com/ActivityWatch/aw-android/issues/340)): a bug caused each scheduled sync to run twice. Fixed — halves the bandwidth and battery impact of sync.

### Import progress banner ([#316](https://github.com/ActivityWatch/aw-android/issues/316))

When you open the app while historical data is still importing, a banner now tells you so. Before this, the timeline looked empty or incomplete with no explanation.

### Bug fixes (16)

A large fix batch. The most user-visible:

- **Bucket hostname rewrite at startup** ([#354](https://github.com/ActivityWatch/aw-android/issues/354)): bucket hostnames are now rewritten to the canonical form before anything opens the datastore. Fixes events appearing under the wrong device name after a hostname change.
- **Single-instance server startup** ([#324](https://github.com/ActivityWatch/aw-android/issues/324)): the server startup guard is now atomic. Fixes a race that could start two server instances on fast launches.
- **Browser events off main thread** ([#344](https://github.com/ActivityWatch/aw-android/issues/344)): browser event writes moved off the accessibility main thread. Fixes ANR reports from the web watcher on some devices.
- **Deferred RustInterface init** ([#325](https://github.com/ActivityWatch/aw-android/issues/325)): Rust initialization now happens on an IO thread. Reduces startup ANRs on slower devices.
- **Server socket crash fix** ([#315](https://github.com/ActivityWatch/aw-android/issues/315)): the app no longer crashes at startup if the server socket can't be created (port conflict, permissions).
- **Large export streaming** ([#304](https://github.com/ActivityWatch/aw-android/issues/304)): large JSON exports now stream to a cache file instead of buffering in memory. Fixes OOM crashes on data-heavy exports.
- **WebView back navigation** ([#327](https://github.com/ActivityWatch/aw-android/issues/327)): the back button now navigates through WebView history before closing the activity.
- **Dark mode for sync settings** ([#326](https://github.com/ActivityWatch/aw-android/issues/326)): the Sync Settings screen now follows system dark mode.
- **In-progress session counted** ([#337](https://github.com/ActivityWatch/aw-android/issues/337)): the foreground session in progress is now included in the usage count.

### Performance

- **RustInterface constructed off main thread** ([#346](https://github.com/ActivityWatch/aw-android/issues/346)): faster app startup, especially on first launch.
- **SAF sync skips unchanged files** ([#347](https://github.com/ActivityWatch/aw-android/issues/347)): the SAF directory mirror no longer re-copies files that haven't changed. Faster sync on large datasets.

## Get it

Download from the [GitHub releases page](https://github.com/ActivityWatch/aw-android/releases/tag/v0.14.3). Pick the per-ABI APK for your architecture, or use the universal APK if unsure.

The release is also available on [F-Droid](https://f-droid.org/packages/net.activitywatch.android/) (may take a few days to propagate).

Thanks to the contributors: [@0xbrayo](https://github.com/0xbrayo), [@ErikBjare](https://github.com/ErikBjare), and [@TimeToBuildBob](https://github.com/TimeToBuildBob).
