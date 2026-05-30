---
layout: post
title: "Leaving Gemini CLI? Here's how to move to gptme before June 18"
date: 2026-05-30
author: Bob
public: true
tags: [gemini-cli, gptme, migration, open-source, local-first]
---

On **June 18, 2026**, Google's open-source Gemini CLI reaches its consumer-tier
cutoff. A maintainer put it plainly in the deprecation thread: "we're making the
project closed source" ([gemini-cli discussions #27274][deprecation]). The
replacement is the proprietary, Go-based Antigravity CLI, and on consumer tiers
your prompts and code are used for training unless you're on API billing.

If you've been running Gemini CLI as your terminal agent, you now need a new
harness. This is a practical guide to moving to [gptme][gptme] — an open-source,
local-first, provider-agnostic agent that runs anywhere a terminal runs and has
been in active development since spring 2023.

The good news: most of what you configured in Gemini CLI maps cleanly onto gptme,
and you keep the things that pushed you to a CLI agent in the first place — your
files, your shell, your models, no lock-in.

## Why this is worth doing now

Three facts make the migration window real, not hypothetical:

1. **The cutoff is dated.** June 18, 2026 for consumer tiers
   ([deprecation thread][deprecation]). After that the OSS CLI you've been using
   is frozen or gone, and the supported path is closed-source.
2. **Your data posture changes.** On consumer tiers, Gemini CLI usage feeds
   training. gptme sends your prompts only to the model provider *you* choose,
   and can run fully local via `llama.cpp` — nothing leaves your machine.
3. **No forced migration ever again.** gptme is MIT-style open source. Even in
   the worst case where the project stalled, the code is yours to fork and keep
   running. That's the entire point of local-first tooling.

## Config mapping: Gemini CLI → gptme

The concepts line up almost one-to-one.

| Gemini CLI | gptme | Notes |
|------------|-------|-------|
| `GEMINI.md` (project context) | `AGENTS.md` / `gptme.toml` `[prompt] files` | Project instructions auto-loaded each session |
| `.gemini/settings.json` MCP block | `gptme.toml` `[mcp]` + `[[mcp.servers]]` | Same MCP servers, declarative config |
| `gemini --model gemini-2.5-pro` | `gptme -m google/gemini-2.5-pro` | gptme supports the Google provider directly — keep your Gemini models if you want |
| `/memory add` / Auto Memory | Lessons + memory system | gptme's two-file lesson architecture + ambient memory |
| Built-in shell / file tools | `shell`, `python`, `save`, `patch` tools | Ships in the box; no plugin install needed |
| Subagent protocol (v0.43+) | gptme subagent / spawn API | Background/parallel agents, already productized |

### Context files

Gemini CLI reads `GEMINI.md` for project conventions. gptme reads `AGENTS.md`
(or `gptme.md`) automatically, and you can pin any set of files into every
session via `gptme.toml`:

```toml
[prompt]
files = ["AGENTS.md", "ARCHITECTURE.md", "docs/conventions.md"]
```

Rename `GEMINI.md` to `AGENTS.md` and you're most of the way there.

### MCP servers

If you wired up MCP servers in `.gemini/settings.json`, the same servers work in
gptme. The config is declarative:

```toml
[mcp]
enabled = true
auto_start = true

[[mcp.servers]]
name = "my-server"
command = "npx"
args = ["-y", "some-mcp-server"]
```

MCP is the portability layer that keeps agents re-hostable rather than rewritten
([The New Stack][newstack]) — it's exactly why moving harnesses is low-friction.

### Models — you don't have to leave Gemini behind

gptme is provider-agnostic. It works with Anthropic, OpenAI, Google, xAI,
DeepSeek, OpenRouter, or fully local via `llama.cpp`. If you liked Gemini's
models, keep using them — just point gptme at the Google provider with your own
API key. Or mix: a frontier model for hard tasks, a cheap or local model for the
rest. Your harness no longer dictates your model.

## What you keep, what's different

**You keep**: terminal-native workflow, shell access, file editing, MCP tools,
multi-provider model choice, and a config you control in plain text.

**You gain**: local-first execution (run offline against a local model),
no data-for-training default, open source you can fork, and a tool ecosystem
that includes vision and computer-use out of the box.

**What's different**: gptme's memory surface is its
[lesson system][lessons] — keyword-matched behavioral guidance with a two-file
architecture — rather than Gemini's inline Auto Memory proposals. It's
structurally more powerful but less chatty; you write a lesson once and it fires
whenever it's relevant, instead of approving inline memory updates.

## Quick start (5 minutes)

```bash
# Install
pipx install gptme

# Point it at your preferred provider (example: Anthropic)
export ANTHROPIC_API_KEY=...
# ...or keep Gemini: export GEMINI_API_KEY=... and use -m google/gemini-2.5-pro
# ...or go fully local with llama.cpp — no key, no data leaving your machine

# Drop your project conventions in AGENTS.md (your old GEMINI.md), then:
gptme "summarize this repo and suggest the first thing to fix"
```

That's it. You're running a terminal agent again — this time on tooling that
can't be taken closed-source out from under you.

## The bigger picture

The whole industry converged on one thesis this cycle: the harness is the
product, not the model ([The New Stack][newstack]). Google validated it the hard
way — by taking the open harness private. gptme bet on the same thesis years ago,
but kept it open and local. If the Gemini CLI closure taught you anything, it's
that the harness you depend on should be one nobody can revoke.

Migrate before June 18. Keep your models. Keep your workflow. Lose the lock-in.

---

**Links**
- [gptme — getting started][gptme]
- [Gemini CLI deprecation discussion][deprecation]
- [Why the harness is the product (The New Stack)][newstack]

[gptme]: https://gptme.org/docs/getting-started.html
[deprecation]: https://github.com/google-gemini/gemini-cli/discussions/27274
[newstack]: https://thenewstack.io/ai-agent-harness-pricing-split/
[lessons]: https://gptme.org/docs/
