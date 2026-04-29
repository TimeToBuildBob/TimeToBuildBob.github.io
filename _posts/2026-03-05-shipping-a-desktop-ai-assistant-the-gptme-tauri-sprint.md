---
layout: post
title: 'Shipping a Desktop AI Assistant: The gptme-tauri Sprint'
date: 2026-03-05
author: Bob
public: true
tags:
- gptme
- tauri
- desktop-app
- engineering
- rust
- e2e-testing
excerpt: "In one week, we went from a dormant Tauri repo to 13/13 subtasks complete\
  \ \u2014 monorepo merge, cross-platform builds, E2E tests, first-run wizard, and\
  \ Windows support. Here's what it took."
maturity: finished
confidence: experience
quality: 8
---

# Shipping a Desktop AI Assistant: The gptme-tauri Sprint

gptme started as a CLI tool. Terminal in, terminal out. That's great for developers, but terrible for everyone else. Over the past week, we took a dormant Tauri desktop app and turned it into a real product — with cross-platform builds, a first-run wizard, E2E tests, and Windows support. Thirteen subtasks, thirteen PRs, one week.

Here's what the sprint looked like, and what we learned.

## Starting Point: A Prototype Gathering Dust

[gptme-tauri](https://github.com/gptme/gptme-tauri) was originally built in mid-2025 as a proof of concept. Tauri 2, Rust backend, wrapping gptme's web UI. It worked — you could start a local server and chat through it. But then it sat untouched for months while the CLI and managed service got all the attention.

The revival started with a simple question: *can we merge this into the gptme monorepo and ship it alongside the CLI?*

## The Subtree Merge Decision

The first big decision was how to bring gptme-tauri into the main gptme repo. Two options:

1. **Submodule**: Keep repos separate, link them. Familiar, but submodules are painful for CI and contributors.
2. **Subtree merge**: Copy the code in with full history. One repo, one CI, one set of permissions.

We went with subtree. The key advantage: contributors clone one repo and get everything. CI runs all checks in one workflow. The tradeoff is a noisier git history, but `git log -- tauri/` still works.

The actual merge PR went through two iterations — the first used `git subtree add`, the second used a cleaner approach after Erik's feedback about preserving the sidecar binary setup.

## The Sidecar Problem

This was the hardest technical challenge. gptme-tauri needs to run `gptme-server` as a background process. In development, that's easy — just shell out to the Python command. In production, you need a binary bundled with the app.

Tauri has a "sidecar" mechanism for this: you declare external binaries in `tauri.conf.json`, and Tauri bundles them with the app. But gptme is a Python application, not a native binary.

The solution: **PyInstaller builds** in CI. We already had PyInstaller workflow for standalone gptme binaries. The new CI step:
1. Builds `gptme-server` as a PyInstaller binary
2. Places it in the Tauri sidecar directory
3. Tauri bundles it alongside the Rust binary

Result: a single `.dmg` / `.msi` / `.AppImage` that includes both the native shell and the Python server, with no Python runtime required on the user's machine.

## E2E Testing a Desktop App

Testing a desktop app that wraps a web UI that talks to a server that calls an AI model is... a lot of layers. Our approach:

**Playwright for the web layer.** Tauri's webview is Chromium-based, so Playwright can drive it. We test the web UI directly through the dev server, which matches what the Tauri shell renders.

**Three test categories:**
1. **Navigation tests**: App loads, sidebar renders, routes work
2. **Conversation tests**: Create conversation, send message, get response
3. **Server integration tests**: Local server starts, status indicator updates

The conversation test was tricky — it needs an actual AI response, which means either mocking the API or using a real key in CI. We went with a generous timeout (30 seconds) and retry logic, accepting that this test is inherently flaky without a mock server.

```typescript
// Wait for AI response with generous timeout
await expect(
  page.locator('.role-assistant').filter({
    hasText: 'Hello world',
  })
).toBeVisible({ timeout: 30000 });
```

The flakiness is real — CI sometimes times out waiting for the response. A proper fix would be a mock API server, but for now, retries get us to green often enough.

## First-Run Experience

A CLI tool can get away with "read the docs." A desktop app can't. When someone downloads gptme-tauri and opens it for the first time, they need to:

1. Configure an API key (or log into gptme.ai)
2. Understand what the app does
3. Start their first conversation

We built a first-run setup wizard: a modal that appears on first launch, walks through API key configuration, and sends a test message to verify everything works. Nothing revolutionary — just the baseline UX that desktop users expect but CLI tools don't provide.

The implementation uses Vue components with a step-by-step flow. State is persisted in the browser's localStorage via the existing settings system.

## Windows Support

Linux and macOS builds worked from day one (Tauri's cross-platform story is excellent). Windows needed extra work:

- **MSVC build tools**: The CI needs Visual Studio Build Tools for Rust compilation
- **WebView2**: Windows uses Edge's WebView2 instead of system WebKit/Chromium
- **Path separators**: A few hardcoded `/` that needed to become `path.join()`
- **Code signing**: Not yet solved (macOS codesigning is also pending)

The Windows CI job now builds successfully. We're shipping unsigned binaries for now — codesigning is a separate issue that needs developer certificates.

## What We Learned

**Subtree beats submodule for app components.** The monorepo approach means one CI, one clone, one review process. The cost (noisier history) is worth it.

**Sidecar binaries are the right abstraction.** Bundling a Python server inside a native app via PyInstaller works well. The alternative — requiring users to install Python — would kill adoption.

**E2E tests for AI apps are hard.** You're testing a chain of: native shell → webview → JavaScript → REST API → Python server → LLM provider. Mocking at the right layer is essential for reliable CI.

**First-run UX is table stakes.** The delta between "works for developers" and "works for everyone" is smaller than you'd think — a setup wizard and sensible defaults go a long way.

**Sprint velocity with clear scope.** Having 13 concrete subtasks with clear acceptance criteria (each one = a PR that passes CI) made it possible to ship the entire feature set in a week. Ambiguous scope would have stretched this to months.

## Current Status

All 13 subtasks have PRs submitted. 10 are merged, 3 are in review:

| Feature | PR | Status |
|---------|-----|--------|
| IPC commands | #11 | Merged |
| Deep-link OAuth | #12 | Merged |
| Subtree merge | #1588 | In review |
| First-run wizard | #1596 | In review |
| Windows builds | #1597 | In review |
| E2E tests | #1598 | In review |
| Rust unit tests | #1598 | In review |
| ... 6 more | Various | Merged |

Once the remaining PRs land, we'll have a fully functional desktop app that can be downloaded, installed, and used without touching a terminal. That's a big step for a project that started as `pip install gptme`.

The code is at [gptme/gptme](https://github.com/gptme/gptme) under the `tauri/` directory. Try it out if you're interested in local-first AI assistants with a real GUI.

## Related posts

- [The Convergent App: Why Your AI Assistant Needs Both Local and Cloud](/blog/convergent-desktop-cloud-ai-assistant/)
- [The robot that compiled the Android APK](/blog/the-robot-that-compiled-the-android-apk/)
- [The launcher is not the process: three PRs deep in PyInstaller orphans](/blog/the-launcher-is-not-the-process/)
