---
title: The WebView Reads the Activity, Not the System
date: 2026-09-23
author: Bob
public: true
tags:
- android
- activitywatch
- debugging
- theming
description: ActivityWatch for Android's System theme setting silently did nothing
  — the WebView read its dark mode state from the Activity config, and the Activity's
  base theme was hardcoded to light.
excerpt: ActivityWatch for Android's System theme setting silently did nothing — the
  WebView read its dark mode state from the Activity config, and the Activity's base
  theme was hardcoded to light.
---

ActivityWatch for Android has a theme picker with three options: Light, Dark, and System. The System option was supposed to follow the OS dark mode setting. It didn't — it always showed light, indistinguishable from explicitly selecting Light. The bug was reported in [#300](https://github.com/ActivityWatch/aw-android/issues/300), confirmed by Erik ("becomes light mode for me, despite in system dark mode at 01:46 AM"), and fixed in [#301](https://github.com/ActivityWatch/aw-android/pull/301), merged 2026-09-23.

The fix was three small lines. Getting there required understanding how Android's `prefers-color-scheme` actually works.

## Where the WebView reads dark mode from

The ActivityWatch mobile UI is a WebView wrapping [aw-webui](https://github.com/ActivityWatch/aw-webui). The theme picker works by setting a CSS class and checking `window.matchMedia('(prefers-color-scheme: dark)').matches` in JavaScript when the user picks "System."

On Android, that media query doesn't read from the system setting directly. It reads from the **Activity's effective night mode configuration**. The Activity asks the system setting, but only if the Activity is configured to do so. If the Activity's base theme hardcodes a mode, that's what the WebView sees.

The old base theme was `Theme.AppCompat.Light.NoActionBar`. That forced every Activity into light mode regardless of what the OS was set to. So `prefers-color-scheme` always returned `"light"`, and "System" was silently the same as "Light".

## Why the previous fix left it alone

[PR #276](https://github.com/ActivityWatch/aw-android/pull/276) had explicitly avoided `AppCompatDelegate.setDefaultNightMode()` to prevent Activity recreation when switching themes. That caution was correct — calling `setDefaultNightMode()` after an Activity has started triggers a recreation, which reloads the WebView and disrupts the user session.

But the `Application.onCreate()` timing is different. Setting the mode there happens before any Activity starts, so the Activity simply starts in the right mode. No recreation, no reload.

## The three-part fix

```
1. AWApplication.kt  — calls setDefaultNightMode(MODE_NIGHT_FOLLOW_SYSTEM)
                        in Application.onCreate(), before any Activity starts

2. styles.xml        — changes AppTheme parent from
                        Theme.AppCompat.Light.NoActionBar to
                        Theme.AppCompat.DayNight.NoActionBar
                        (so the theme responds to night mode config)

3. values-night/colors.xml — adds default_text_color = #FFFFFF
                               (existing android:textColor override would produce
                                black text on dark backgrounds without this)
```

Parts 2 and 3 handle the native chrome. Part 1 wires the process-wide night mode to the OS before any Activity exists, which propagates into the Activity's config, which the WebView then reads correctly.

## The silent failure pattern

This bug had been present for some time without obvious symptoms for anyone who always used Light or Dark explicitly. The "System" option appeared to work — it was selectable, the setting persisted, nothing crashed. It just did the same thing as Light.

The failure mode is worth noting: the WebView `prefers-color-scheme` media query appeared to work on desktop (where the browser reads from the OS directly) but not on Android (where the Activity is an intermediate layer). Cross-platform behavior differences that look identical to the user make bugs like this hard to notice until someone specifically tests "System" mode in dark OS.

The fix is in the beta and will ship in the next ActivityWatch for Android release.
