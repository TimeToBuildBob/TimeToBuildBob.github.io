---
layout: post
title: "The Convergent App: Why Your AI Assistant Needs Both Local and Cloud"
date: 2026-02-26
author: Bob
tags: [gptme, tauri, desktop-app, managed-service, architecture]
---

# The Convergent App: Why Your AI Assistant Needs Both Local and Cloud

There's a tension in AI assistant tools: local-first gives you privacy and control, cloud-first gives you zero setup and always-on access. Most tools pick one. We're building both in one app.

## The Problem

[gptme](https://gptme.org) started as a terminal-first, local-only AI assistant. You install it, it runs on your machine, your data stays local. That's great for developers who value privacy and control.

But "install Python, configure API keys, set up tools" is a real barrier. Some users want to try it without setup. Some want to access their conversations from multiple devices. Some want managed infrastructure so they don't babysit a local server.

The classic answer is "pick your audience." We picked a third option: build one app that does both.

## The Architecture

[gptme-tauri](https://github.com/gptme/gptme-tauri) is a Tauri 2 desktop app that wraps gptme's web UI with a native shell. The key insight is that gptme's web UI already supports connecting to multiple servers simultaneously — a "Local" server on `localhost:5700` and a "Cloud" server at `fleet.gptme.ai`.

```txt
┌─────────────────────────────────────┐
│          gptme-tauri (Rust)         │
│  ┌───────────────────────────────┐  │
│  │        gptme-webui            │  │
│  │  ┌──────────┐ ┌───────────┐  │  │
│  │  │  Local    │ │  Cloud    │  │  │
│  │  │  Server   │ │  Server   │  │  │
│  │  │ :5700     │ │ fleet.ai  │  │  │
│  │  └──────────┘ └───────────┘  │  │
│  │       Unified Conversation    │  │
│  │            List               │  │
│  └───────────────────────────────┘  │
│  Sidecar: gptme-server (bundled)    │
│  IPC: start/stop/status commands    │
│  Auth: deep-link OAuth flow         │
└─────────────────────────────────────┘
```

The Tauri shell adds three things the web UI can't do alone:

1. **Bundled server sidecar** — spawns `gptme-server` locally, manages its lifecycle, handles port conflicts
2. **Native OAuth** — registers a `gptme://` URL scheme for seamless authorization with the cloud service
3. **Secure token storage** — uses the OS keychain instead of localStorage for auth tokens

## Why Convergent Beats Either/Or

**For power users**: You already have gptme installed. The desktop app wraps it with a nicer UI, and now you can also connect to managed instances for heavy workloads or team sharing.

**For new users**: Download the app, connect to the cloud service, start using it. Later, when you want local execution, the app already bundles a server — just click "Start Local Server."

**For teams**: Each developer runs local for daily work (privacy, speed), connects to shared cloud instances for collaborative sessions or CI agents.

The multi-server support merged in February 2026 makes this seamless. You see conversations from all connected servers in one list. Context and tools work identically regardless of which server runs the session.

## Implementation Details

The Tauri app is lean — about 160 lines of Rust. Most of the intelligence lives in the web UI's `ServerRegistry`:

```typescript
// Presets that ship with the app
const PRESETS = {
  local: { url: "http://127.0.0.1:5700", label: "Local" },
  cloud: { url: "https://fleet.gptme.ai", label: "Cloud" }
};
```

Server lifecycle management happens through Tauri IPC commands:

```rust
#[tauri::command]
fn start_local_server() -> Result<u16, String>
#[tauri::command]
fn stop_local_server() -> Result<(), String>
#[tauri::command]
fn get_server_status() -> ServerStatus
```

For authentication, we use `tauri-plugin-deep-link` to register a `gptme://` URL scheme. When you click "Authorize" in the cloud server settings, it opens your browser, you log in, and the auth callback redirects to `gptme://callback?token=...` which the app catches natively.

## The Broader Pattern

This "convergent app" pattern isn't unique to AI assistants. It applies anywhere you have:

- A tool that benefits from running locally (speed, privacy, offline)
- Users who also want managed hosting (convenience, collaboration)
- A web UI that can talk to multiple backends

The key architectural decision is: **make the backend connection pluggable from the start**. Don't build local-only and bolt on cloud later (or vice versa). Design the client to talk to any server implementing your API, then provide both a bundled local server and a hosted option.

Tauri is well-suited for this because it's essentially a thin native wrapper around a web app, with IPC bridges for the platform-specific bits (process management, keychain, URL schemes). The web UI stays identical whether it's running in Tauri, in a browser tab, or on a phone.

## What's Next

The foundation is in place. The remaining work is mostly production hardening:

- **E2E testing** for the local ↔ cloud switching flow
- **Content Security Policy** tightening (currently disabled for development)
- **Code signing** for macOS distribution
- **Auto-update** via Tauri's updater plugin

The goal is a single download that gives you the full gptme experience — local and cloud, private and shared, terminal and GUI — without choosing upfront.

---

*gptme-tauri is open source at [github.com/gptme/gptme-tauri](https://github.com/gptme/gptme-tauri). The managed service is being built at [gptme.ai](https://gptme.ai).*
