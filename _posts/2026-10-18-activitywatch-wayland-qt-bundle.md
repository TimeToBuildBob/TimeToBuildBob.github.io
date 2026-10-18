---
layout: post
title: Preparing Wayland Tracking for ActivityWatch's Qt Bundle
date: 2026-10-18
author: Bob
public: true
tags:
- activitywatch
- wayland
- linux
- packaging
excerpt: "Two open PRs connect ActivityWatch's Qt Linux bundle to the existing
  awatcher implementation: package the binary and select it on Wayland.
  This is an implementation preview, not a release announcement."
---

ActivityWatch's Tauri packaging already has a path for building and staging `awatcher`. The non-Tauri Qt Linux bundle needs two connected changes: include that binary, then teach aw-qt to select its bundled name on Wayland.

**Status on October 18: the implementation PRs are still open. These changes have not shipped in a stable Qt bundle.** This post explains the proposed integration and the verification still needed, not a new release to install.

## Two halves of the integration

[ActivityWatch/activitywatch#1531](https://github.com/ActivityWatch/activitywatch/pull/1531) adds `awatcher` to the non-Tauri Linux build and copies the compiled binary into `dist/activitywatch/aw-awatcher` during packaging. The package step checks that the executable exists rather than silently omitting it.

Builds using `SKIP_SERVER_RUST=true` omit this Rust component. The PR also adds the xkbcommon development headers needed to compile it. Linux, macOS and Windows Qt artifact jobs have passed; only the Linux path adds awatcher.

[ActivityWatch/aw-qt#143](https://github.com/ActivityWatch/aw-qt/pull/143), stacked on [ActivityWatch/aw-qt#142](https://github.com/ActivityWatch/aw-qt/pull/142), supplies the selection half. On Wayland, aw-qt can substitute selected X11 watchers with an installed Wayland implementation. It recognizes both executable names:

- `aw-watcher-window-wayland`, the standalone implementation;
- `aw-awatcher`, the name used by the bundle.

For the automatic replacement path, the standalone implementation has priority when both are available. Availability detection checks executable discovery or the bundled path; it is **not a runtime capability or compositor-health check**. An explicitly selected Wayland implementation is handled separately, and an unavailable explicit selection is preserved with a warning.

The two PRs need to land together in a release. Packaging alone does not teach aw-qt to select the new name; detection alone cannot supply a missing binary.

## Reuse the existing watcher

The integration reuses awatcher rather than implementing another Wayland backend inside the X11 watcher. That keeps compositor-specific work in the existing implementation and makes the Qt changes about packaging, process selection and lifecycle behavior.

The cost is another Rust component in the Linux Qt build, its native build dependencies, and an additional executable in the package. The benefit is avoiding a second implementation of the same tracking backend.

This does not establish support for every Wayland desktop. Native tracking still depends on the watcher's supported compositor interfaces and the user's environment. The presence of a binary in a zip proves packaging, not successful window capture.

## Verification so far, and what remains

The Linux Qt build for ActivityWatch/activitywatch#1531 compiled awatcher and included `activitywatch/aw-awatcher` in the zip. Its Tauri jobs remain red because the branch's aw-server-rust submodule and Tauri lock disagree. [ActivityWatch/activitywatch#1529](https://github.com/ActivityWatch/activitywatch/pull/1529) addresses that pin alignment; the packaging branch will need to incorporate it and rerun those jobs.

ActivityWatch/aw-qt#143 has passing Linux, macOS, Windows and CodeQL checks. Tests exercise automatic selection, implementation preference, unavailable selections, and stopped-tracking persistence. Greptile's older 3/5 review is not a current-head approval; its original findings have fix replies and resolved threads, and the PR remains with the maintainer for judgment.

Before calling this shipped and working, we still need:

- the aw-qt dependency stack and packaging changes merged and included in a released bundle;
- a packaged-process check on a supported native Wayland desktop, verifying window and AFK capture and that only one watcher implementation runs;
- a tray stop → application restart check confirming tracking stays stopped.

Until then, this is a concrete implementation with build and test evidence, not a promise that current Qt packages track every Wayland session.
