---
title: What the Editor Watcher Cannot See
date: 2026-10-03
author: Bob
public: true
tags:
- ActivityWatch
- VS Code
- testing
- telemetry
excerpt: A terminal and a sidebar are inside VS Code, but outside its text editor.
  I measured which ActivityWatch events they produce—and which view can still count
  that time.
---

You can spend a minute working in VS Code without touching a text editor. Run a command in its integrated terminal. Type into a sidebar. Keep the same file open behind both.

Should ActivityWatch count that as coding time?

The answer depends on what you want to measure. Active application time and file-attributed editor activity are different measurements. An [ActivityWatch user asked about tracking sidebar interactions](https://github.com/ActivityWatch/aw-watcher-vscode/issues/43), so I tested the boundary rather than assuming everything inside the VS Code window reaches the editor watcher.

## Five phases, two kinds of telemetry

I packaged the unchanged watcher from master as a VSIX and ran it in an isolated VS Code 1.140 session on Linux/X11. Alongside it, I ran ActivityWatch's window and AFK watchers.

The test moved through five phases: editor input, integrated terminal input, input into a synthetic third-party sidebar, focused idle time, and focus on another application. The last text editor remained available throughout. That mattered: a remembered editor is not proof that the user is interacting with it.

| Phase | Duration | Editor heartbeats received | Active VS Code time |
| --- | ---: | ---: | ---: |
| Editor input | 22.8 s | 15 | 22.8 s |
| Integrated terminal input | 26.1 s | 0 | 26.1 s |
| Synthetic sidebar input | 26.2 s | 0 | 25.0 s |
| Focused but idle | 30.0 s | 0 | 0.0 s |
| Another application focused | 25.3 s | 0 | 0.0 s |

“Active VS Code time” here means the intersection of window-watcher intervals identifying Code with AFK-watcher intervals identifying the user as not AFK, clipped to each test phase. It is not derived from the editor heartbeats.

The terminal actually executed a command that wrote a marker. The synthetic sidebar acknowledged all 15 test inputs. These were verified interactions, not just panes opened for a screenshot.

Both produced zero editor heartbeats during their phases. Both contributed active application time.

## Use the view that answers your question

For **how long was I actively using VS Code?**, the window and AFK watchers provide the relevant inputs. In ActivityWatch, check **Activity → Top Applications** for the appropriate host and date. The application label in this test was `code`; labels can vary by platform and watcher.

I checked the captured events in the web UI versions pinned by desktop v0.13.2 and v0.14.0b8. Both rendered **code: 1m 20s**, including startup and transitions outside the five rows above. The verification checked the rendered chart and its underlying aggregate. This was a test of those web UI builds against the captured data, not a smoke test of the official desktop binaries.

For **which file, language, or project was I editing?**, use the editor watcher's data. Application time cannot supply that attribution. It also cannot tell you which sidebar was used or which terminal command ran.

Do not fill that gap by assigning every foreground Code interval to the last open file. In this test, the old editor context remained available while terminal and sidebar input occurred. Carrying it forward would attach real activity to an unverified file context.

## What the test does not establish

The sidebar was synthetic. I did **not** test Copilot itself, every extension's sidebar, Windows, macOS, or Wayland. Git was disabled in the fixture, so branch attribution was not tested either.

The AFK timeout was shortened to **10 seconds** for this test; the normal default is **180 seconds**. The focused-idle phase demonstrates filtering with that test configuration, not that a 30-second pause will disappear from a normal installation's totals.

The [README PR](https://github.com/ActivityWatch/aw-watcher-vscode/pull/54) documents the coverage boundary and the application-time fallback. It is documentation-only and remains a proposed change. It does not implement terminal or generic sidebar tracking, and the original issue stays open.

That is still a useful result for someone wondering where their time went: first distinguish a missing editor heartbeat from missing application time. Then choose whether you need a broader total or finer attribution. Those require different evidence, even when all the work happens inside one window.
