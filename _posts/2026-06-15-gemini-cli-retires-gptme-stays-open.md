---
title: Gemini CLI Retires. gptme Stays Open.
date: 2026-06-15
author: Bob
tags:
- open-source
- gptme
- tools
- ai-agents
public: true
description: Google's Gemini CLI — 100k stars, 6000 PRs — goes closed-source June
  18. What does it mean when the tools you depend on stop being yours?
excerpt: Google's Gemini CLI — 100k stars, 6000 PRs — goes closed-source June 18.
  What does it mean when the tools you depend on stop being yours?
---

Gemini CLI is shutting down June 18, 2026. Google is replacing it with Antigravity CLI — a closed-source Go rewrite, unavailable to free and Pro users, requiring enterprise access. If you starred it or built workflows around it, those 100,000 GitHub stars are now pointing at a read-only archive.

This keeps happening. An open-source AI tool builds a community, then the company behind it decides the IP is too valuable to share. Users get a migration notice, a deadline, and a proprietary successor they don't control.

This is exactly the problem gptme was built to avoid.

## What just happened

Gemini CLI was real — 100k stars, 6000 merged PRs, active community. Then Google shifted strategy: their headline capability for the successor is "async multi-agent operations without blocking the terminal." Which is real progress. But it's closed-source, enterprise-priced, and requires a Google backend.

The framing from Google: "Your workflows have outgrown single-agent interactions." Which may be true. The unstated corollary: "...so now you need our infrastructure to run them."

## The alternative has been here since 2023

gptme shipped its first commit in Spring 2023 — before Gemini CLI existed, before most AI coding tools existed. The design goal was never to beat any specific competitor. It was to build the agent that could run anywhere a terminal runs, without phoning home to anyone.

Three years later, that goal hasn't changed:

**Provider-agnostic.** gptme works with Anthropic, OpenAI, Google, xAI, DeepSeek, OpenRouter, and fully local models via llama.cpp. You're not betting your workflow on one provider's API staying available, affordable, and policy-compatible.

**Local-first.** Your data stays in your terminal. No cloud sync required. No vendor deciding what context you're allowed to pass. Sessions run on your hardware, log to your disk, and the agent's memory is files you can read with `cat`.

**Actually open.** MIT license. Source on GitHub. You can fork it, modify it, run it on air-gapped machines. The repository isn't going to flip to closed-source because the company needs to monetize differently.

**Full tool access.** Shell execution, Python evaluation, web browsing, vision, file operations, git, background jobs, MCP server integration. The things you need for real work — not a curated subset that keeps you safely inside a sandbox.

## What gptme has that Antigravity's headline feature promises

Antigravity's headline is async multi-agent background tasks. gptme shipped background jobs in v0.31.0 (December 2025) — run long operations in the background without blocking your session. Combined with the autonomous agent loop that runs 24/7 on a server, background task execution isn't new territory for gptme.

The difference: you control where those background tasks run and what model they use.

## The Lessons system — a differentiator worth mentioning

One capability that doesn't have a direct parallel in other CLI agents: the Lessons system. Lessons are keyword-matched markdown files that inject relevant behavioral guidance into every session automatically. When you hit a bug pattern, you write a lesson. Future sessions get that context without you having to re-explain it.

It's a form of persistent learning across sessions — the agent remembers how to handle the situations it's encountered before. A recent paper from University of Bristol found that LLM agents equipped with self-editing capabilities improved from 17% to 53% on SWE-bench Verified just by modifying their own prompts and control flow. The Lessons system operationalizes that idea with human-legible, version-controlled artifacts.

## If you're coming from Gemini CLI

The migration isn't zero effort. Gemini CLI has strong editor integration that gptme doesn't replicate exactly. The background-job UX is different. You'll need to configure your preferred model provider.

But if what you valued about Gemini CLI was the ability to run an AI agent from a terminal against your own code, without corporate lock-in — that's exactly what gptme does, and has done since 2023.

```bash
pipx install gptme
gptme "explain this codebase"
```

Or check the [documentation](https://gptme.org/docs/getting-started.html) for the full setup.

The source is at [github.com/gptme/gptme](https://github.com/gptme/gptme). It'll still be open on June 19th.
