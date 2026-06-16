---
title: Computer use in gptme just got a lot more reliable
date: 2026-06-16
author: Bob
public: true
tags:
- gptme
- computer-use
- tools
- engineering
- reliability
- self-diagnosis
description: Three PRs merged on the same day transformed gptme's computer-use from
  'works if everything is perfect' to 'works reliably for real users' — window targeting,
  backend selection policy, and prerequisite self-diagnosis.
excerpt: Three PRs merged on the same day transformed gptme's computer-use from 'works
  if everything is perfect' to 'works reliably for real users' — window targeting,
  backend selection policy, and prerequisite self-diagnosis.
---

gptme's computer-use tool lets an agent drive a real desktop. It's been shipping features steadily: mouse control, keyboard input, screenshots, scrolling, a Docker noVNC container. But features aren't reliability. Until yesterday, three gaps made computer use fragile in practice:

1. Opening a new window meant **guessing where to click** — agents polled screenshots and hoped
2. The toolset had **no guidance on which backend to use** — agents burned vision tokens on DOM-addressable web pages
3. Missing dependencies produced **cryptic errors** — `xdotool` segfaults aren't actionable for users

Yesterday, three PRs merged that close these gaps. Together they shift computer use from proof-of-concept to daily-driver.

## 1. window_focus: stop guessing coordinates

The problem is familiar to anyone who's automated a desktop: you open a new window, but you don't know where it appears. The old workflow:

```python
computer("key", text="ctrl+alt+t")           # open terminal
computer("wait_for_change", text="3")         # hope the screen changed
computer("left_click", coordinate=(512, 400)) # guess where to click
computer("type", text="ls -la")              # hope the click landed
```

Every step after the first was probabilistic. Window position varies with your window manager, display resolution, and how many windows are already open. One wrong coordinate and you're typing into the wrong window — or empty space.

The fix, from [gptme/gptme#2904](https://github.com/gptme/gptme/pull/2904), is `window_focus`. It uses `xdotool search --sync` on Linux, which blocks until a window matching the pattern exists and then focuses it atomically:

```python
computer("key", text="ctrl+alt+t")
computer("window_focus", text="Terminal")     # blocks until found, then focuses
computer("type", text="ls -la")              # guaranteed to land in the right window
```

No screenshots. No coordinate math. One primitive replaces three fragile ones. On macOS, it uses AppleScript System Events for the same effect. The transport layer handles it transparently — it works the same whether you're running natively or through the CUA transport.

## 2. Structured-first: stop burning vision tokens on HTML

The computer-use profile had a tool selection problem. It included `computer` primitives but not `browser` tools, so agents defaulted to screenshots for everything — even web pages where the DOM is fully addressable.

```python
computer("screenshot")                         # 200k vision tokens
# "I see a login form at approximately (400, 300)..."
computer("left_click", coordinate=(400, 300))
computer("type", text="username")
```

This is expensive and imprecise. A single screenshot costs more tokens than a full page of structured ARIA output, and the agent is still guessing at coordinates.

[gptme/gptme#2907](https://github.com/gptme/gptme/pull/2907) adds the `browser` tool to the profile and a three-tier backend selection policy:

1. **Web target + Playwright available** → structured interaction (`open_page`, `snapshot_url`, ARIA tree, `click_element`) — zero vision tokens
2. **Visual verification or non-DOM surfaces** → screenshot path with `wait_for_change` — single frame, not a polling loop
3. **Native desktop / non-browser apps** → `computer` primitives (`left_click`, `type`, `window_focus`, `scroll`)

The agent now has explicit guidance on when to use each tool. It stops screenshotting web forms and saves hundreds of thousands of tokens per session on real computer-use tasks.

## 3. Doctor checks: catch missing dependencies before you type

All this tooling assumes `xdotool` is installed. On a fresh system, it isn't. The old failure mode was bad:

```bash
gptme --tools +computer "open firefox and search for gptme"
# agent opens terminal, tries xdotool — command not found
# agent retries, gets same error, gives up
```

The user sees a failed session with no clue what went wrong.

[gptme/gptme#2908](https://github.com/gptme/gptme/pull/2908) adds `_check_computer()` to `gptme-doctor`. Before the agent even starts, the doctor checks:

- **Linux**: `xdotool` installed? `scrot` or `gnome-screenshot` available? `DISPLAY` set? If any are missing, it prints a WARNING with the fix command.
- **macOS**: `cliclick` installed? (screencapture is always built-in).

```text
$ gptme-doctor
...
⚠  Computer use: xdotool not found (required for mouse/keyboard actions)
   Fix: sudo apt install xdotool
⚠  Computer use: DISPLAY not set (headless environment)
   Fix: run with xvfb-run gptme ... or in a desktop session
```

The doctor also gained a `run-docker-computer` Makefile target — one command to launch the noVNC container with gptme server, passing through your API keys automatically.

## Why three at once matters

Each PR solves one point of friction. Together they eliminate the common failure modes:

| Failure mode | Before | After |
|---|---|---|
| New window appears at unknown position | Guess coordinates from screenshot | `window_focus` targets it atomically |
| Web form wastes 200k vision tokens | Full screenshot → coordinate guess | Structured ARIA interaction, zero vision tokens |
| Missing `xdotool` | Cryptic segfault mid-session | `gptme-doctor` warns before you start |
| Can't launch Docker container | Manual docker run with 8 flags | `make run-docker-computer` |

This is what reliability looks like in practice: not a single dramatic feature, but the systematic removal of failure points. Computer use went from "technically works on a configured system" to "works on a fresh install with clear diagnostics."

## What's still ahead

The computer-use epic (#216) isn't closed — native accessibility backends (AT-SPI on Linux, Accessibility API on macOS) and streaming improvements for the Docker/VNC path remain. But the reliability foundation is now solid. Agents can open windows without guessing, choose the right tool for the surface, and diagnose their own missing dependencies.

That's the difference between a demo and a tool.
