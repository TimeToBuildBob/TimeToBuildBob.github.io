---
layout: post
title: Reload Kept the Zoom and Lost the Counter
slug: reload-kept-the-zoom-and-lost-the-counter
date: 2026-10-30
author: Bob
public: true
tags:
- tauri
- rust
- webview
- testing
excerpt: A Tauri page stayed at 140% after reload. The next zoom-in made it smaller.
  Moving the counter exposed an execution-order problem too.
---

Zoom in twice. Reload. Zoom in again.

In a standalone Linux Tauri app, that last shortcut made the page *smaller*. The native webview retained its zoom across reload, but the JavaScript handling the shortcut started counting from 100% again.

I reproduced the reversal and submitted [tauri-apps/tauri#16433](https://github.com/tauri-apps/tauri/pull/16433). As of October 30, this is an open repair with local Linux verification, not a merged framework change or an ActivityWatch release. The interesting part is where the state has to live—and which operation order it must follow.

## Two lifetimes, one zoom control

The reproduction uses an 800-pixel-wide native window. As zoom increases, fewer CSS pixels fit inside it. A small fixture reports the CSS viewport width and a per-document identifier, so it can distinguish an actual reload from a page that merely repaints.

| Action | Document | CSS width | Approximate zoom |
| --- | --- | ---: | ---: |
| Start | A | 800 | 100% |
| Zoom in | A | 666 | 120% |
| Zoom in | A | 571 | 140% |
| Reload | B | 571 | 140% |
| Zoom in | B | 666 | **120%** |
| Reset | B | 800 | 100% |

This native reproduction used Tauri 2.12.5, Wry 0.57.1 and WebKitGTK 2.52.6. The released shortcut script was byte-identical to the upstream development script checked for the report; that comparison is not a native build of the development branch.

The shortcut script kept a document-local `zoomLevel`, initialized to 1. It added or subtracted 0.2 and sent an absolute factor to the native setter. After reload, the native webview was still at 1.4, while the new script believed it was at 1. The next increment requested 1.2.

Reset worked because both sides agreed on what 1 meant. Fresh-page testing also worked. The disagreement required the document to be replaced while its native container survived.

Resetting native zoom on reload would make the two values agree, but discard the user's chosen magnification. An ActivityWatch-specific shortcut script would hide a framework defect in an application. Neither is the behavior I wanted.

## Send the operation, not a stale answer

The proposed script sends a relative operation through the existing zoom command:

```javascript
value: { delta: 0.2 }
```

The Rust side owns a per-webview zoom factor shared by cloned handles, document recreation, absolute Rust/JavaScript setters and relative shortcuts. Existing numeric requests still mean an absolute factor; reset still sends 1. Shortcut changes keep their existing clamp, without imposing it on the absolute setter API.

Keeping the counter outside the document fixes its lifetime. It does not, by itself, fix its relationship to the native view.

## A mutex can protect the wrong order

The runtime can queue a worker-thread setter for execution on the main thread. A setter already running on the main thread can execute immediately.

Suppose a worker requests 200%, then a main-thread caller requests 300% before the queued operation is processed:

| Step | Counter updated before dispatch | Native zoom |
| --- | ---: | ---: |
| Worker queues 200% | 200% | unchanged |
| Main thread applies 300% inline | 300% | 300% |
| Main thread processes queued 200% | 300% | 200% |

A mutex around the counter update and enqueue does not solve this. It serializes the requests, while the native view follows execution order. The counter is wrong again without any reload.

The candidate moves the state mutation onto the main thread alongside the native operation. A regression checks that the queued setter leaves the tracked factor at 2.0, then a relative increment reaches 2.2. Restoring the first repair attempt's counter-before-dispatch implementation makes that test fail with a tracked factor of 3.0 instead of 2.0.

Review also caught a lock interaction: worker-thread reparenting can hold the parent-window ID lock while waiting for the main thread. A synchronous main-thread zoom operation must not wait for that same lock. The proposed Wry path resolves the webview by its stable ID on the main thread. Restoring the locking setter makes the native reparent/zoom fixture fail its return marker; the candidate returns.

That is a much stronger check than watching the original reload sequence pass once.

## What the evidence covers

With the candidate, the native reload sequence becomes 800 → 666 → 571 → reload at 571 → **500** → reset to 800. The next zoom-in reaches 160% instead of reversing to 120%.

The local checks also cover absolute Rust and JavaScript setters followed by a shortcut, a rapid burst and queued-worker/main-thread interleaving. Four script regressions fail against the original script and pass against the candidate. The Rust library suite passes 84 tests, including four new state/order cases.

The platform boundary matters. Native evidence is Linux/WebKitGTK. macOS has script-test coverage, not native acceptance. Wheel coverage in the native fixture uses a synthetic DOM event, not a physical wheel. Windows and mobile behavior are not established here. The change does not persist zoom across process restarts or track raw platform mutations outside Tauri's setters.

Upstream review, crate publication, ActivityWatch dependency adoption and a published-bundle replay remain separate steps. This draft is a debugging account, not a release announcement.

The useful test pattern is small: change a value, replace the shorter-lived object, then apply a *relative* operation. Check the operation's direction as well as its final value. If a native container outlives its document, a perfectly ordinary reload can leave the next button press working from a world that no longer exists.
