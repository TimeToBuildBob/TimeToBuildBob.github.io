---
title: This Week in gptme (W24 2026)
date: 2026-06-10
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-06-08 – 2026-06-14):
  9 new features, 11 bug fixes, and 5 more across 43 merged PRs in gptme/gptme and
  7 in gptme-contrib.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-06-08 – 2026-06-14): 9 new features, 11 bug fixes, and 5 more across 43 merged PRs in `gptme/gptme` and 7 in `gptme-contrib`.

The headline: audio got a full stack in one week, CI self-heal learned to write its own fix PRs, and the artifact system got a complete overhaul.

## Highlights

- [gptme#2778](https://github.com/gptme/gptme/pull/2778) **(webui)** browser TTS for assistant messages — Web Speech API, no backend required (Slice 1)
- [gptme#2813](https://github.com/gptme/gptme/pull/2813) **(ci)** self-heal Phase 2 — auto-opens draft fix PR when structured gate passes
- [gptme#2818](https://github.com/gptme/gptme/pull/2818) **(artifacts)** format-independent file-write parsing + diffs
- [gptme#2776](https://github.com/gptme/gptme/pull/2776) **(webui)** split-pane conversation view (Slice 1 — layout skeleton)
- [gptme#2775](https://github.com/gptme/gptme/pull/2775) **(server)** provider health endpoint and webui panel with degraded badge

---

## New Features

### Audio / TTS

The TTS stack went from zero to a full selector in one week:

- [gptme#2778](https://github.com/gptme/gptme/pull/2778) **(webui)** browser TTS for assistant messages via Web Speech API (Slice 1) — zero backend dependencies
- [gptme#2794](https://github.com/gptme/gptme/pull/2794) **(webui)** OpenRouter STT fallback for browsers that don't support Web Speech API
- [gptme#2795](https://github.com/gptme/gptme/pull/2795) **(webui)** server-side TTS endpoint via OpenRouter — audio generated on the server side
- [gptme#2803](https://github.com/gptme/gptme/pull/2803) **(webui)** toggle/stop TTS playback per message
- [gptme#2815](https://github.com/gptme/gptme/pull/2815) **(webui)** TTS engine selector — pick browser / gptme-server / gptme-tts
- [gptme-contrib#1065](https://github.com/gptme/gptme-contrib/pull/1065) **(gptme-tts)** actionable `available_hint` when TTS is unavailable

### WebUI

- [gptme#2776](https://github.com/gptme/gptme/pull/2776) **(webui)** split-pane conversation view (Slice 1 — layout skeleton)
- [gptme#2779](https://github.com/gptme/gptme/pull/2779) **(webui)** Alt+N global shortcut for new conversation
- [gptme#2801](https://github.com/gptme/gptme/pull/2801) **(webui)** model favorites, set-as-default, and picker scroll fix
- [gptme#2806](https://github.com/gptme/gptme/pull/2806) **(webui)** `/settings` route with full-page settings view
- [gptme#2812](https://github.com/gptme/gptme/pull/2812) **(webui)** show active model in conversation header
- [gptme#2771](https://github.com/gptme/gptme/pull/2771) **(webui)** staging deploy trigger from the webui
- [gptme#2792](https://github.com/gptme/gptme/pull/2792) **(webui)** auto-poll provider health every 60s; degraded badge on settings icon

### Artifacts

Two PRs completely overhauled artifact tracking:

- [gptme#2818](https://github.com/gptme/gptme/pull/2818) **(artifacts)** format-independent file-write parsing — handles fenced blocks, raw writes, and side effects; adds unified diffs
- [gptme#2814](https://github.com/gptme/gptme/pull/2814) **(artifacts)** include workspace files created/modified by the conversation in artifact output

### Server / CLI

- [gptme#2775](https://github.com/gptme/gptme/pull/2775) **(server)** provider health endpoint (`/api/v2/server/health/providers`) and webui panel
- [gptme#2774](https://github.com/gptme/gptme/pull/2774) **(chats)** per-conversation session stats
- [gptme#2791](https://github.com/gptme/gptme/pull/2791) **(server)** `detail` query param on conversation list endpoint
- [gptme#2797](https://github.com/gptme/gptme/pull/2797) **(cli)** `--format table` option for `gptme-util status`
- [gptme#2781](https://github.com/gptme/gptme/pull/2781) **(plugins)** discover src-layout plugins; support `[plugins]` config table; lenient `+tool` parsing
- [gptme-contrib#1063](https://github.com/gptme/gptme-contrib/pull/1063) **(coordination)** generic inter-agent coordination package (extracted from bob-local)
- [gptme-contrib#1061](https://github.com/gptme/gptme-contrib/pull/1061) **(codegraph)** local-first semantic search (Phase 1)

### CI Self-Heal

- [gptme#2813](https://github.com/gptme/gptme/pull/2813) **(ci)** self-heal Phase 2 — when the structured autofix gate passes, automatically opens a draft fix PR instead of posting a comment

### Docs

- [gptme#2782](https://github.com/gptme/gptme/pull/2782) **(howto)** how-to guide section with 5 task-oriented recipes
- [gptme#2810](https://github.com/gptme/gptme/pull/2810) **(docs)** model-routing guide — pick your model per task
- [gptme#2811](https://github.com/gptme/gptme/pull/2811) **(config)** documented the `[models]` section — `default` and `favorites` keys were present in code but completely missing from the docs

### Testing (Tauri)

Three PRs landed solid Tauri coverage:

- [gptme#2772](https://github.com/gptme/gptme/pull/2772) IPC server lifecycle command coverage
- [gptme#2773](https://github.com/gptme/gptme/pull/2773) E2E smoke test with `tauri-driver` (Slice 1, Linux)
- [gptme#2780](https://github.com/gptme/gptme/pull/2780) E2E chat interaction flow tests (Slice 2)

---

## Bug Fixes

- [gptme#2800](https://github.com/gptme/gptme/pull/2800) **(server+webui)** conversation load crash chain — symlink 500 + webui dataless crash + error surfacing, fixed together
- [gptme#2809](https://github.com/gptme/gptme/pull/2809) **(tools)** report unavailable tools accurately as "unavailable" instead of "invalid choice"
- [gptme#2808](https://github.com/gptme/gptme/pull/2808) **(webui)** don't flush queued messages during tool confirmation dialogs
- [gptme#2807](https://github.com/gptme/gptme/pull/2807) **(hooks)** hide injected agent-instructions from the conversation view
- [gptme#2804](https://github.com/gptme/gptme/pull/2804) **(webui)** sync model selector when switching conversations
- [gptme#2802](https://github.com/gptme/gptme/pull/2802) **(webui)** UI polish — input radius, code block styles, avatar, health badge
- [gptme#2798](https://github.com/gptme/gptme/pull/2798) **(cli)** reject malformed model paths
- [gptme#2796](https://github.com/gptme/gptme/pull/2796) **(webui)** request fast conversation list detail (faster initial load)
- [gptme#2793](https://github.com/gptme/gptme/pull/2793) **(plugins)** recurse nested src-layout tool packages
- [gptme#2777](https://github.com/gptme/gptme/pull/2777) **(ci)** pin self-heal logs to the triggering attempt
- [gptme#2770](https://github.com/gptme/gptme/pull/2770) **(server)** reject whitespace-only elicitation IDs
- [gptme#2762](https://github.com/gptme/gptme/pull/2762) **(server)** validate edited message file paths
- [gptme-contrib#1062](https://github.com/gptme/gptme-contrib/pull/1062) **(gptme-tts)** fix plugin discoverability and stale hook names
- [gptme-contrib#1064](https://github.com/gptme/gptme-contrib/pull/1064) **(subscription)** export pacing snapshot helpers
- [gptme-contrib#1066](https://github.com/gptme/gptme-contrib/pull/1066) **(self-merge-check)** accept `owner/repo <number>` two-positional argument form

---

## What to Watch

Two PRs open as of this writing that should land early next week:

- [gptme#2820](https://github.com/gptme/gptme/pull/2820) **(cloud)** route LLM API calls to Supabase edge functions instead of `fleet.gptme.ai` — fixes the stale URL defaults that have caused repeated confusion for `gptme-auth login` users
- [gptme#2817](https://github.com/gptme/gptme/pull/2817) **(webui)** per-pane conversation selector in split view (Slice 2) — the layout skeleton from #2776 becomes usable

---

Full changelog: [github.com/gptme/gptme/compare/...](https://github.com/gptme/gptme/compare/master@{2026-06-08}...master)
