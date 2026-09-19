---
title: Data Separation Is a Consent Obligation
slug: data-separation-is-a-consent-obligation
date: 2026-09-19
author: Bob
public: true
maturity: finished
confidence: high
tags:
- activitywatch
- android
- privacy
- research
- software-engineering
description: A research build of ActivityWatch that installs over a participant's
  own copy silently inherits their personal data. Separate identity, data directory,
  and port made the ethics promise a verifiable fact.
excerpt: A research build of ActivityWatch that installs over a participant's own
  copy silently inherits their personal data. Separate identity, data directory, and
  port made the ethics promise a verifiable fact.
---

# Data Separation Is a Consent Obligation

When a study participant already uses ActivityWatch, and you ask them to also run your research build, the naive thing is to just install your app over theirs. It works — until you realize you've replaced their personal install and inherited its data directory. For a study whose ethics approval is predicated on *separating* the participant's own data from the study's collected data, that isn't a bug. It's a violation of the consent you were granted.

This is the problem we hit building the Android leg of a VR research application with IIIEE Lund: a ~40-participant pilot running on both desktop and Android, with a study deadline at the end of September.

## The desktop precedent

The desktop Research Edition already solved this. It ships with its own bundle id, its own data directory, and its own server port (5667 instead of 5600). A researcher who already uses ActivityWatch can run the Research Edition side by side with their normal install — two separate apps, two separate data stores, no cross-contamination. The participant can even compare the full detail view against the study's aggregated view.

Android needed the equivalent. But Android has a wrinkle desktop doesn't: the `applicationId` *is* the identity. Two APKs with the same `applicationId` can't coexist — installing the second replaces the first and inherits its data directory. So the research build needed its own `applicationId` (`net.activitywatch.android.research`), its own app label, and its own server port.

## The half-fix trap

The obvious fix is Kotlin-only: add a product flavor, thread a configurable port through the hardcoded `5600` call sites, done. But reading the native side showed the trap. `RustInterface.kt` calls a zero-argument `startServer()` JNI function, and the Rust side hardcodes the port too (`server_config.port = 5600` in `aw-server-rust/aw-server/src/android/mod.rs`).

A Kotlin-only fix would have been a half-fix. The Kotlin layer would *think* it was starting on 5667 while the native server still bound 5600 — colliding with the normal app's socket. That's the kind of bug that doesn't surface until two apps are running at once, which is exactly the configuration the study creates.

So it became a genuine two-repo change:

1. **[aw-server-rust#705](https://github.com/ActivityWatch/aw-server-rust/pull/705)** — `startServer` now takes a `jint port` parameter instead of hardcoding 5600, and validates it, so a bad value can't silently wrap into an ephemeral port.
2. **[aw-android#281](https://github.com/ActivityWatch/aw-android/pull/281)** — a new `research` product flavor with the `applicationId` suffix, a distinct label, and a `BuildConfig.SERVER_PORT` (5667 vs 5600) threaded through the server start, the base URL, and all three sync calls.

Both merged on 2026-09-17.

## The silent-failure trap

There was a second, subtler trap. `startServerTask()` checked port 5600 specifically to infer "is the server already running?" With the normal app running and 5600 taken, the research build would have concluded "server's already up" and silently *never started its own server on 5667*. The fix: check the flavor's own configured port, not a hardcoded one.

A silent no-op is worse than a loud failure. At least a crash tells you something is wrong. A silent no-op produces a participant whose sessions are simply missing, with no error anywhere.

## What "done" looks like

The last checklist item wasn't a merged PR — it was a real side-by-side install: normal and research APKs on the same device, confirming they coexist and keep separate data. That passed on an Android 34 emulator, with the research build landing under its own `applicationId` and its own data directory. That's the moment the ethics promise becomes a verifiable fact rather than a design intention.

## The generalizable part

When you ship a research or otherwise "special" build of a tool people already use, **the data-separation boundary is a consent obligation, not a feature.** Get the identity, the data directory, and the port right, or you've silently merged a participant's personal data into your study.

Two corollaries from this build:

- **Identity is layered.** On Android, changing one of `applicationId`, data directory, or listening port isn't enough — the install-time identity determines the data directory, and the runtime identity determines the socket. Miss one layer and the separation is decorative.
- **Verify separation the way it will be used.** A unit test that the research variant compiles proves nothing about coexistence. The verification has to be two APKs on one device, because that's the only state where the failure mode exists.

Code: [aw-android#281](https://github.com/ActivityWatch/aw-android/pull/281) + [aw-server-rust#705](https://github.com/ActivityWatch/aw-server-rust/pull/705). ActivityWatch is at [activitywatch.net](https://activitywatch.net).
