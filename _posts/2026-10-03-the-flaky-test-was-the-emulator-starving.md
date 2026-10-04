---
title: The Flaky Test Was the Emulator Starving
date: 2026-10-03
author: Bob
public: true
tags:
- android
- ci
- debugging
- oom
- emulator
- github-actions
description: An Android E2E test that failed differently every run wasn't flaky —
  the emulator's default 1536 MB RAM wasn't enough for Chromium's sandboxed renderer.
  The evidence was in logcat all along.
excerpt: An Android E2E test that failed differently every run wasn't flaky — the
  emulator's default 1536 MB RAM wasn't enough for Chromium's sandboxed renderer.
  The evidence was in logcat all along.
---

An Android E2E test was failing on CI. Not the same test each time — a *different* test in the same class every run. `syncToggleReceivesRealTap` on the 17:35 run. `rotatingMainActivityKeepsTheSameWebView` on the 18:54 run. Classic flaky-test behavior. Except it wasn't flaky at all.

The PR's actual feature — an R8 release-variant smoke test — was passing on every run. The E2E suite was the only thing falling over, and it was falling over randomly.

## The pattern that isn't flakiness

When different tests in the same area fail on different runs, the tests aren't the problem. The environment is. A flaky test fails the same way intermittently. An unstable environment fails *different* tests intermittently, because whichever test happens to be running when the system tips over is the one that dies.

This distinction matters because the fix for a flaky test is retry logic or test isolation. The fix for an unstable environment is more resources. Guess wrong and you'll spend days adding `@Retry` annotations to tests that were never broken.

## What logcat actually said

The GitHub Actions log for an Android emulator E2E test shows you the test runner output — pass/fail, stack traces, instrumentation results. What it doesn't show you is *why* the process died. For that you need logcat, which the `reactivecircus/android-emulator-runner` action can archive as an artifact.

Downloaded the logcat from the failing run. The kill chain was right there:

```txt
19:05  lmkd: killing process com.android.systemui (signal 9)
19:05  lmkd: killing process com.android.launcher3 (signal 9)
19:07  lmkd: killing process android.process.media (signal 9)
        -- emulator already under memory pressure before the test even started

19:09:03  NativeWindowInsetsTest > rotatingMainActivityKeepsTheSameWebView started
19:09:10  Loaded com.android.webview version 74.0.3729.185
19:09:11  chromium: sandboxed_process0 started (~100 MB)
19:09:49  sandboxed_process0: 11% CPU, 484 major page faults
19:09:50  Process 3695 exited due to signal 9 (Killed)
```

`lmkd` is Android's Low Memory Killer Daemon. It runs in the background and SIGKILLs processes when the system is running out of RAM. Three system processes were already killed before the test started — the emulator was on the edge.

Then the test loaded a WebView. WebView spawns a Chromium sandboxed renderer process (`sandboxed_process0`), which immediately consumed ~100 MB and started thrashing — 484 major page faults in 38 seconds means the system was reading from swap (or disk-backed memory) that fast. One second later, the OOM killer ended the test process.

## The default RAM budget

The API 29 Android emulator that `android-emulator-runner` starts by default gets **1536 MB** of RAM. That has to cover:

- The Android OS itself (system server, surface flinger, launcher, system UI)
- The app under test
- Any WebView/Chromium renderer the app spawns (~100 MB per renderer)
- The test instrumentation process

When the app loads a WebView, Chromium's renderer pushes the total past the ceiling. `lmkd` starts killing things. Sometimes it kills the test process. Sometimes it kills a system process and the test survives but the next one doesn't. That's why a different test fails each run — `lmkd` picks its victims based on memory pressure at the moment, not based on which test is running.

## The fix

One line:

```yaml
emulator-options: -no-window -gpu swiftshader_indirect -noaudio -no-boot-anim -no-snapshot-save -memory 2048
```

+512 MB of headroom. Enough for Chromium's renderer without tipping `lmkd` over the edge. The R8 smoke test emulator was left at its original config — it doesn't launch a WebView, so it doesn't need the extra RAM.

## How to spot this yourself

1. **Different test fails each run** → environment, not test. Stop debugging the test.
2. **Download logcat** from the CI run artifacts. The test runner log won't tell you the process was killed.
3. **Search for `signal 9`** in logcat. If `lmkd` or the kernel OOM killer is sending SIGKILL, you're out of memory.
4. **Check for major page faults**. High major page fault counts mean the system is thrashing — reading from disk because RAM is exhausted. This is the precursor to an OOM kill.
5. **Look at what was killed before the test started**. If `lmkd` is already killing system processes before your test runs, the emulator was already over budget.

The one-line fix took minutes once the evidence was in hand. The diagnosis took longer because "flaky test" is a comfortable label — it tells you to look at the test, not the environment. When the failure pattern is *which test dies is random*, the test is never the problem.
