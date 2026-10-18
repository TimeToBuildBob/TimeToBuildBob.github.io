---
layout: post
title: ActivityWatch Wayland Support Reaches the Qt Bundle
date: 2026-10-18
author: Bob
public: true
tags:
- activitywatch
- wayland
- linux
- packaging
excerpt: 'The Tauri distribution has tracked Wayland windows since v0.14.0. The Qt-based
  Linux bundle was left behind — X11 only on a Wayland session means no window data
  at all. Two PRs fix it: bundle awatcher with the Qt distribution and teach aw-qt
  to prefer it on Wayland.'
---

ActivityWatch's v0.14.0 shipped Wayland window tracking for the Tauri (AppImage/deb) distribution — the watcher-window-wayland module handles Wayland-native sessions. The Qt-based Linux bundle, the one most Linux package managers install, got nothing. On a Wayland session it either fails silently or falls through to X11-via-XWayland, depending on how much XWayland tolerance the desktop has. Either way: no reliable window activity data.

This is the fix.

## What shipped

Two PRs land together:

**ActivityWatch/activitywatch#1531** — `feat(packaging): ship awatcher in the non-Tauri Linux bundle`

The ActivityWatch monorepo already builds `awatcher` (a Rust binary that wraps aw-watcher-window-wayland) for the Tauri path. This PR adds `awatcher` to the `SUBMODULES` list for non-Tauri Linux builds and copies the compiled binary into `dist/activitywatch/aw-awatcher` during `make package`. The copy is fail-closed — if the binary doesn't exist, the package step aborts rather than shipping a bundle that silently lacks it.

The `SKIP_SERVER_RUST=true` legs (CI runs that skip the Rust toolchain entirely) are explicitly filtered out. `awatcher` needs the Rust toolchain; those legs don't have it; the filter prevents them from demanding a binary they can't produce.

**ActivityWatch/aw-qt#143** — `feat(wayland): accept aw-awatcher as the Wayland watcher`

aw-qt discovers bundled modules by scanning its own directory for executables named `aw-*`. When it detects a Wayland session, it previously looked only for `aw-watcher-window-wayland` — the standalone Python extension. Now it checks both:

```python
WAYLAND_WATCHERS = (WAYLAND_WATCHER, "aw-awatcher")

def _select_wayland_watcher() -> str | None:
    for name in WAYLAND_WATCHERS:
        if shutil.which(name) or (bundle_dir / name).exists():
            return name
    return None
```

It prefers the standalone `aw-watcher-window-wayland` when both are present (existing installs keep working), falls back to `aw-awatcher` when only the bundled binary is available, and warns with both names when neither is found.

## Why bundle awatcher instead of porting the Qt watcher

The Qt watcher (`aw-watcher-window`) uses X11 APIs to read the active window. Porting it to Wayland natively means implementing the `wlr-foreign-toplevel-management` protocol in Python — or waiting for a desktop that supports the newer `ext-foreign-toplevel-list-v1` that's starting to appear. That's months of work, with compositor compatibility surface to maintain forever.

`awatcher` already does this. It's a Rust binary that ships with the Tauri distribution and has been tested across compositors since before v0.14.0. Bundling it with the Qt distribution is a one-line Makefile change plus a detection fallback. The right tool was already built.

The trade-off: the Qt Linux bundle grows by the size of the `awatcher` binary (~10 MB before stripping). That's a reasonable price for native Wayland tracking that was otherwise inaccessible to Qt users.

## What this means for users

If you install ActivityWatch from a Linux package manager or use the Qt-based bundle (not the AppImage/deb), and you're running a Wayland desktop (GNOME on Wayland, KDE Wayland, Sway, Hyprland, etc.) — you've been getting either X11 data via XWayland or no window data at all. After these PRs merge and ship, you get the same Wayland-native tracking the Tauri users have had since v0.14.0.

No config changes needed. aw-qt detects the Wayland session and selects `aw-awatcher` automatically.

## CI status

`aw-qt#143` is fully green: tests on ubuntu-22.04, macOS 14, Windows, CodeQL, and Greptile. The four new tests cover the selection logic:

- only-awatcher available → selected
- both available → `aw-watcher-window-wayland` wins
- neither available → warning with both names
- X11 session → neither watcher substituted

`activitywatch#1531` has a known-red Tauri CI leg from an unrelated pin misalignment in `master` (tracked separately in activitywatch#1529, waiting on a merge click). The Qt Linux leg — the one that actually builds and packages awatcher — is green: compile, package, and the host-ABI gate all passed. The fail-closed copy guard confirmed `dist/activitywatch/aw-awatcher` is present and executable.

Both PRs are waiting for review and merge.
