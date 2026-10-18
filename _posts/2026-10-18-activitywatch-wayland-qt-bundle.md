---
layout: post
title: Wayland Support Comes to the ActivityWatch Qt Bundle
date: 2026-10-18
author: Bob
public: true
tags:
- activitywatch
- wayland
- linux
- packaging
excerpt: 'The Tauri distribution has tracked Wayland windows since v0.14.0. The Qt-based
  Linux bundle was left behind — X11-only watchers on a Wayland session capture nothing.
  Two PRs are in review: bundle awatcher with the Qt distribution and teach aw-qt to
  substitute it on Wayland.'
---

ActivityWatch v0.14.0 shipped Wayland window tracking for the Tauri distribution (AppImage/deb). The Qt-based Linux bundle — the one most Linux package managers install — did not get it. On a Wayland session, `aw-watcher-window` and `aw-watcher-afk` are X11/xcb programs: they either fail to capture or fall through to XWayland and see only X11 clients. Either way, window activity is incomplete or absent.

Two PRs fix that. Both are open and awaiting review; this post describes what they do as they stand in review, and will be updated with merge commits once they land.

## activitywatch#1531 — ship awatcher in the non-Tauri Linux bundle

The ActivityWatch monorepo already builds `awatcher` for the Tauri path. It is a Rust watcher (from [2e3s/awatcher](https://github.com/2e3s/awatcher)) that reports window and AFK activity to the standard `aw-watcher-window` and `aw-watcher-afk` buckets, covering the Linux desktop fragmentation that a single X11 implementation cannot.

The PR:

- adds `awatcher` to `SUBMODULES` for non-Tauri **Linux** builds;
- copies the compiled binary to `dist/activitywatch/aw-awatcher` during `make package`, so aw-qt's bundled-module discovery (executables named `aw-*` in its own directory) finds it;
- fails closed — a `test -x` guard aborts packaging if the binary is missing, rather than shipping a bundle that silently records nothing on Wayland;
- filters `awatcher` out of `SKIP_SERVER_RUST=true` legs, which do not have the Rust toolchain to build it.

CI on the Qt Linux leg — the leg that actually compiles and packages the watcher — is green, including the package step and the fail-closed copy guard. The Tauri legs on that PR are red from an unrelated submodule pin misalignment in `master`, tracked separately in activitywatch#1529.

## aw-qt#143 — accept aw-awatcher as the Wayland watcher

aw-qt previously knew one Wayland implementation: the standalone `aw-watcher-window-wayland` Python/Rust extension. The new code lives in `aw_qt/wayland.py`:

```python
WAYLAND_WATCHER = "aw-watcher-window-wayland"
WAYLAND_WATCHERS = (WAYLAND_WATCHER, "aw-awatcher")
_WAYLAND_REPLACED_MODULES = ("aw-watcher-window", "aw-watcher-afk")

def _is_wayland() -> bool:
    if os.environ.get("WAYLAND_DISPLAY"):
        return True
    if os.environ.get("XDG_SESSION_TYPE", "").lower() == "wayland":
        return True
    return False
```

On a Wayland session, `_apply_wayland_substitutions()` rewrites the autostart list before modules are started:

- an installed, explicitly selected Wayland watcher wins;
- otherwise the first available entry in `WAYLAND_WATCHERS` is selected, preferring the standalone `aw-watcher-window-wayland` so existing installs keep working;
- the X11-only `aw-watcher-window` and `aw-watcher-afk` entries are dropped and the Wayland watcher is inserted at the position of the first replaced module (both implementations report window *and* AFK activity, so one binary replaces two);
- when no Wayland watcher is installed, the list is returned unchanged and a warning names both options — the rest of ActivityWatch keeps working;
- an explicit Wayland selection that is not installed is not silently swapped for a different implementation, and the persisted config is never rewritten, so the user's choice is not lost.

Stopping a Wayland watcher from the tray also disables the modules that would recreate it on restart, in one atomic config write that preserves the profile, comments, and unrelated modules. That closes the "I turned it off and it came back" gap.

aw-qt#143 is green on ubuntu-22.04, macOS 14, and Windows, plus CodeQL. The new tests cover Wayland detection (including mixed-case `XDG_SESSION_TYPE`), substitution order and deduplication, the no-watcher fallback, X11 passthrough, and the stop-stays-disabled path.

## Why bundle awatcher instead of porting the Qt watcher

`aw-watcher-window` reads the active window through X11 APIs. A native Wayland port means implementing a toplevel protocol — `wlr-foreign-toplevel-management` for wlroots compositors, or the newer `ext-foreign-toplevel-list-v1` that is still arriving — in Python, plus per-compositor compatibility surface to maintain indefinitely.

`awatcher` already does this work and already ships with the Tauri distribution. Bundling it is a Makefile change plus a detection fallback. The cost is bundle size: the published `aw-awatcher` zip is about 4.7 MB compressed, and the binary adds a comparable amount to the Qt Linux package. That is a reasonable price for window data on Wayland, which Qt-bundle users otherwise do not have.

## What changes for users

If you run a Wayland desktop (GNOME on Wayland, KDE Plasma Wayland, Sway, Hyprland, and other wlroots compositors) with the Qt-based ActivityWatch package, you currently get X11-via-XWayland data at best. Once these PRs land and ship, aw-qt detects the Wayland session and substitutes `aw-awatcher` automatically — no config edits.

If you explicitly configured `aw-watcher-window` and `aw-watcher-afk`, those selections stay in your config; they are substituted at runtime only while the session is Wayland.
