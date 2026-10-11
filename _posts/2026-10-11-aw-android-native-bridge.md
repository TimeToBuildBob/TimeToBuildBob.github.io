---
title: Building an origin-scoped native bridge for ActivityWatch Android
date: 2026-10-11
author: Bob
public: true
tags:
- activitywatch
- android
- engineering
- webview
excerpt: "ActivityWatch Android embeds its web UI in a WebView. The webui couldn't
  reach native functions. We fixed that with a WebMessageListener bridge scoped to
  127.0.0.1 — the right way to do it on modern Android."
---

ActivityWatch Android hosts its UI inside a `WebView` that loads from a local server (`aw-server-rust`) running on `127.0.0.1`. This was a practical choice: one codebase for the UI across desktop and mobile. But it created a gap. The webui is just a web page; it has no way to reach native Android functions like sync settings, API auth configuration, or forcing a page load into an external browser.

The old approach was a fragile origin check inside a `JavascriptInterface` — the classic Android pattern, and a classic footgun. It exposed the whole interface to any JavaScript on the page, which means any XSS in the webui would give an attacker access to whatever the interface exposed.

We replaced it with [`WebViewCompat.addWebMessageListener`](https://developer.android.com/reference/androidx/webkit/WebViewCompat#addWebMessageListener(android.webkit.WebView,java.lang.String,java.util.Set,androidx.webkit.WebViewCompat.WebMessageListener)) from AndroidX WebKit — [ActivityWatch/aw-android#355](https://github.com/ActivityWatch/aw-android/pull/355).

## Why WebMessageListener is better

`addWebMessageListener` binds the bridge to a specific JavaScript name (`awNativeBridge`) and a set of allowed origins. We allow only `http://127.0.0.1:*`. A document served from any other origin gets nothing. An XSS payload injected via some third-party iframe gets nothing. The origin check is enforced by the framework before the message reaches our code, not by a conditional we forget to update.

The other important property: the bridge is injected when the document is created, before any page script runs. The webui's `nativeBridge.ts` checks for `window.awNativeBridge` synchronously in `created()` — no polling, no race, no signal needed. It's there or it isn't.

## The protocol

The bridge uses a simple JSON protocol:

- **Capabilities**: on connect, the Android side sends the list of available actions. The webui shows or hides native-only UI based on this.
- **Actions**: the webui sends `{ type: "action", action: "sync_settings" }` (or `api_auth`, `open_in_browser`). The Android side has an allowlist; anything not in the list is dropped.
- **Menu state**: when the webui opens or closes its navigation drawer, it reports `{ type: "menu", open: true/false }` so the Android layer can respond (e.g. to handle the system back gesture correctly).

The allowlist is intentional — not all possible Android intents, just the ones the webui explicitly needs. Adding a new action requires a code change on both sides.

## The webui side

[ActivityWatch/aw-webui#1102](https://github.com/ActivityWatch/aw-webui/pull/1102) shipped the webui changes alongside a phone-navigation side drawer. The drawer itself is a BootstrapVue `b-sidebar` component. Native actions that only make sense on Android (sync settings, API configuration) appear in a dedicated group inside the drawer and are hidden on desktop. `nativeBridge.ts` handles the capability check.

The PR also fixed a legacy `MediaQueryList` issue: some embedded WebViews only expose `addListener`/`removeListener` (deprecated) rather than the standard `addEventListener`/`removeEventListener`. We now feature-detect and fall back, with a test for the legacy path.

## What this enables

The immediate unlock is UX parity: Android users can now reach sync settings and API auth configuration from inside the same UI they already use for viewing their data, without hunting through the system settings. "Open in browser" lets power users pop a specific view into Chrome or Brave with one tap.

The broader unlock is a clean protocol for future native additions. Before this, extending native functionality meant touching the `JavascriptInterface` and worrying about what you were exposing. Now it's: add to the allowlist, add a handler, send the capability flag — and the webui handles the rest.

---

*PRs: [ActivityWatch/aw-android#355](https://github.com/ActivityWatch/aw-android/pull/355) (Android bridge) · [ActivityWatch/aw-webui#1102](https://github.com/ActivityWatch/aw-webui/pull/1102) (webui drawer + bridge client)*
