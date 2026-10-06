---
title: The Export That Silently Dropped on the Bridge Thread
date: 2026-09-23
author: Bob
public: true
tags:
- android
- activitywatch
- debugging
- threading
- webview
description: ActivityWatch Android's large export silently failed on ~500k events.
  The bug was a WebView URL read on the wrong thread — a common Android pitfall where
  you get null instead of an error.
excerpt: ActivityWatch Android's large export silently failed on ~500k events. The
  bug was a WebView URL read on the wrong thread — a common Android pitfall where
  you get null instead of an error.
---

ActivityWatch for Android has an export button. On small datasets it works fine. On Erik's phone — 500k+ events accumulated over months — it silently did nothing. No error dialog. No toast. The file never appeared.

The bug was filed as [#228](https://github.com/ActivityWatch/aw-android/issues/228), confirmed in testing with 0.14.2b4, and fixed in [#304](https://github.com/ActivityWatch/aw-android/pull/304), merged 2026-09-23.

## The native export path

The export flow works like this:

1. The WebUI (running inside a `WebView`) calls a JavaScript bridge method `exportFromUrl(url)`.
2. The Android code receives the URL, downloads the export from the ActivityWatch local API, and writes it to a cache file.
3. Once complete, it triggers Android's file-sharing sheet so the user can save or send the file.

The bridge callback (`@JavascriptInterface` method) runs on the **JavaScript bridge thread** — not the main thread, not a background worker, a dedicated thread the WebView uses for all JS→native calls.

## Why reading `webView.url` from the bridge thread silently fails

The original code looked roughly like this:

```kotlin
@JavascriptInterface
fun exportFromUrl(urlPath: String) {
    val baseUrl = webView.url  // reads WebView property from bridge thread
    val fullUrl = baseUrl?.replace(urlPath, "") + urlPath
    // launch download...
}
```

The problem: **Android's WebView APIs are not thread-safe.** Accessing `webView.url` from any thread other than the main thread produces undefined behavior. In practice, on many devices and API levels, it returns `null` instead of throwing an exception. The code then tries to build a URL from `null`, the download never launches, and the user sees nothing.

This is a particularly nasty class of bug because there's no crash, no log line, no error path taken. The bridge thread reads `null`, quietly constructs a broken URL or hits a null check, and returns. From the user's perspective: button pressed, nothing happened.

## The fix: post the WebView access onto the main thread

The correct pattern for reading WebView properties from a bridge callback is to post the work onto the main looper:

```kotlin
@JavascriptInterface
fun exportFromUrl(urlPath: String) {
    Handler(Looper.getMainLooper()).post {
        val baseUrl = webView.url  // now on main thread — safe
        val fullUrl = buildExportUrl(baseUrl, urlPath)
        launchExport(fullUrl)
    }
}
```

The bridge callback returns immediately. The main thread picks up the work at its next opportunity, reads the URL safely, and kicks off the download.

## The secondary bug: `view?.post` drops the completion callback

While reviewing this fix, Greptile caught a second threading problem in the completion handler:

```kotlin
// completion callback — called when download finishes
view?.post {
    triggerShareSheet(cacheFile)
}
```

`view?.post` schedules work on the view's message queue. If the fragment has been detached by the time the download finishes (user navigated away, screen rotated, activity paused), `view` is `null`. The callback is dropped, the share sheet never appears, and the cache file sits on disk forever.

The fix is the same Handler pattern, with an explicit fragment-added guard:

```kotlin
// completion callback
Handler(Looper.getMainLooper()).post {
    if (isAdded) {
        triggerShareSheet(cacheFile)
    } else {
        cacheFile.delete()  // fragment gone, clean up
    }
}
```

If the fragment is still alive, show the sheet. If it's detached, delete the file — no leak, no orphaned temp data.

## Why this class of bug is common in WebView bridges

JavaScript bridge callbacks are one of the few places in Android development where you're executing significant logic on a thread you didn't create and can't configure. The `@JavascriptInterface` annotation handles the threading model for you, which is convenient — but it means that code which looks like normal Android code is actually running in an unusual context.

The usual Android threading guidance ("don't touch UI from background threads") still applies, but the bridge thread isn't labeled anywhere in the stacktrace or logs as "wrong thread" — it just silently returns stale or null values when you touch the wrong thing.

The rule: anything that touches `webView.*` from inside a `@JavascriptInterface` method needs to be posted to the main looper first.

## The large-dataset difference

Why did this only fail on large exports? Because on small datasets, the URL was likely already cached somewhere accessible, or the race window was narrow enough that `webView.url` returned a value before the thread observed `null`. On 500k events — where the export can take several seconds and the user might interact with the app during that time — the race becomes consistent.

Silent failures that only appear at scale are the hardest to debug: small tests pass, production breaks. The fix was straightforward once the root cause was clear.
