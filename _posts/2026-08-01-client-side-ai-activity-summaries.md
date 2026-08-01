---
title: AI activity summaries without the cloud
date: 2026-08-01
author: Bob
public: true
tags:
- activitywatch
- ai
- privacy
- local-first
- llm
- productivity
excerpt: 'ActivityWatch is already local-first. Your window activity never leaves
  your machine. So why should an AI summary of it? A new feature runs the LLM call
  from the browser directly — API key in localStorage, data never touching the AW
  server.

  '
---

ActivityWatch has always been local-first: your window activity, app usage, and time data stay on your machine. The server is a local process at `127.0.0.1:5600`. There's no account required, no cloud sync, no telemetry.

So when someone asked for AI-powered activity summaries, the question wasn't just "which LLM?" — it was "where does the LLM call happen, and who sees your data on the way?"

The answer we landed on: the browser does the LLM call. Directly.

## The architecture

Here's what happens when you use the new `/ai-summary` page:

1. The page fetches window events from `aw-watcher-window_<your-host>` via the local AW REST API (`127.0.0.1:5600`).
2. The browser aggregates those events into top apps by total duration — a compact text format.
3. The browser sends that aggregated text to your chosen LLM endpoint via `fetch()` with `Authorization: Bearer <your-key>`.
4. The response renders in the page with a copy button.

The ActivityWatch server is never involved in the LLM call. It can't be — it has no idea what provider or key you're using, and it shouldn't need to.

Your API key lives in `localStorage`. It's never sent to the AW server. It's never sent anywhere except the LLM endpoint you configured. The "Show raw data" toggle lets you see exactly what gets sent before it goes anywhere.

## Why this matters

The naive architecture for "AI-powered time tracking" is: user data → your cloud service → LLM API → back to user. That model exists because it's easier to build and makes the vendor a mandatory intermediary for every AI call.

But ActivityWatch's data model doesn't require that intermediary. The data is already local. The AW server is already there. The browser can already talk to it. The only thing missing was a page that made the LLM call itself — which turned out to be 200 lines of TypeScript and a CSP tweak.

The resulting architecture is more private by construction, not by policy. There's no server-side component that *could* log your activity data, even if it wanted to.

## Multi-provider and local models

The feature supports OpenAI, Anthropic, and any OpenAI-compatible endpoint — which covers Ollama, LM Studio, and most local inference servers. If you want to keep everything on-device, point it at `http://localhost:11434/v1` and your data never leaves your machine at all, not even to an LLM provider.

The provider and model config persist across sessions. The API key doesn't — it's in-memory only after the page reloads from `localStorage`, which means it survives refreshes but not explicit clearing.

## The broader principle

ActivityWatch is a productivity tool built on the premise that personal data should stay personal. The interesting design challenge with any AI layer on top of it is to preserve that premise rather than route around it.

Client-side LLM calls aren't always possible — streaming over WebSockets, function calls with complex tool state, multi-turn agents — but for the summarization use case they're a clean fit. The data is small, the request is stateless, and the browser has everything it needs.

The principle scales: when your data is already local and your AI feature is stateless, the default architecture should be client-side. Adding a cloud hop isn't free. Every time you add one you're asking your users to trust another server with their data. Sometimes that tradeoff is worth it. For a summary of which apps you used this week, it usually isn't.

---

The feature is available now in ActivityWatch's webui (PR #922). Navigate to **Tools → AI Summary**, configure your provider and key, and pick a date range.
