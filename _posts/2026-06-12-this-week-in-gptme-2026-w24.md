---
title: This Week in gptme (W24 2026)
date: 2026-06-12
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
- webui
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-06-09 – 2026-06-15):
  a heavy webui sprint, a quick server perf win, and several quality-of-life fixes
  across the stack.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-06-09 – 2026-06-15): a heavy webui sprint, a quick server perf win, and several quality-of-life fixes across the stack.

## Highlights

- **Conversation search is now real** — filter, highlight matches, persist the query in the URL, and jump to search with `/`. Eight PRs landed this feature, end to end.
- **[gptme#2852](https://github.com/gptme/gptme/pull/2852) (perf)** gzip on the API server — 5-10× bandwidth reduction on repeated conversations
- **[gptme#2831](https://github.com/gptme/gptme/pull/2831) (config)** `context_exclude` glob patterns in `gptme.toml` — keep noisy dirs out of workspace context
- **[gptme-contrib#1077](https://github.com/gptme/gptme-contrib/pull/1077) (pm-dispatch)** Thompson-sampling bandit for per-lane model routing — cheaper models on fast lanes
- **[gptme-contrib#1074](https://github.com/gptme/gptme-contrib/pull/1074) (imagen)** `image_gen` registered as a proper gptme plugin entry point

---

## WebUI: Conversation Management Sprint

The biggest theme this week is the webui conversation list. If you've been running gptme for a while you probably have hundreds of conversations. These PRs make navigating them much less painful.

**Search cluster (shipped in sequence):**

- [gptme#2827](https://github.com/gptme/gptme/pull/2827): Add conversation list search/filter
- [gptme#2832](https://github.com/gptme/gptme/pull/2832): Highlight matched terms in conversation titles
- [gptme#2834](https://github.com/gptme/gptme/pull/2834): Persist search query in URL `?search=` param (survives refresh, shareable)
- [gptme#2838](https://github.com/gptme/gptme/pull/2838): `/` keyboard shortcut to jump to search box

**Conversation stats:**

- [gptme#2823](https://github.com/gptme/gptme/pull/2823): Message count badge on conversation title
- [gptme#2833](https://github.com/gptme/gptme/pull/2833): Server now exposes `message_count` and `last_updated` in conversation list response
- [gptme#2841](https://github.com/gptme/gptme/pull/2841): WebUI shows those stats inline in the list

**Other webui improvements:**

- [gptme#2817](https://github.com/gptme/gptme/pull/2817): Per-pane conversation selector in split view (Slice 2)
- [gptme#2816](https://github.com/gptme/gptme/pull/2816): `Ctrl+Shift+\` toggles split view
- [gptme#2824](https://github.com/gptme/gptme/pull/2824): URL subroutes for settings deep-linking
- [gptme#2825](https://github.com/gptme/gptme/pull/2825): Persistent YOLO (no-confirm) mode setting
- [gptme#2828](https://github.com/gptme/gptme/pull/2828): Relative timestamps on messages with auto-refresh
- [gptme#2840](https://github.com/gptme/gptme/pull/2840): Settings-level STT provider choice (browser vs server)

---

## Performance

- [gptme#2852](https://github.com/gptme/gptme/pull/2852): Gzip compression on all API responses. 5-10× bandwidth savings on large conversation payloads. Zero config — just ships in the server.

---

## CLI and Config

- [gptme#2831](https://github.com/gptme/gptme/pull/2831): `context_exclude` in `[prompt]` section of `gptme.toml`. Pass glob patterns to keep directories out of workspace context injection. Useful for repos with giant `node_modules/`, `build/`, or data directories.
- [gptme#2843](https://github.com/gptme/gptme/pull/2843): Startup prompt stats report (`--show-prompt-stats`) — break down token cost per context section at launch.
- [gptme#2853](https://github.com/gptme/gptme/pull/2853): `--no-workspace` flag to skip all workspace context. Quick way to start a clean session without the workspace injection overhead.

---

## Session Completion

Two fixes to the auto-reply / session-complete kill-switch:

- [gptme#2846](https://github.com/gptme/gptme/pull/2846): Kill-switch now correctly detects the `incomplete-todos` variant (was only catching the `confirm` variant)
- [gptme#2847](https://github.com/gptme/gptme/pull/2847): Tests now cover the mixed-variant case — `reminder` then `confirm` in the same session

---

## Eval

- [gptme#2844](https://github.com/gptme/gptme/pull/2844): `tool_calls` count per task surfaced in eval output. Useful for tracking tool efficiency alongside pass rates.
- [gptme#2837](https://github.com/gptme/gptme/pull/2837): Narrow SWE-bench install extra — install only what that benchmark needs without pulling in the full eval suite.

---

## Accessibility and Tests

- [gptme#2839](https://github.com/gptme/gptme/pull/2839): Playwright e2e keyboard navigation tests
- [gptme#2829](https://github.com/gptme/gptme/pull/2829): Clickable conversation rows now keyboard-accessible
- [gptme#2822](https://github.com/gptme/gptme/pull/2822): Escape key and interrupt logs consistent with `isBusy`
- [gptme#2845](https://github.com/gptme/gptme/pull/2845): Escape navigates back from full-page settings view
- [gptme#2848](https://github.com/gptme/gptme/pull/2848): Server-backed star/unstar for conversations via metadata sidecar *(open, review welcome)*
- [gptme#2849](https://github.com/gptme/gptme/pull/2849): Semantic landmark roles and `aria-current` for keyboard navigation *(open)*

---

## gptme-contrib

- [gptme-contrib#1080](https://github.com/gptme/gptme-contrib/pull/1080): Greptile score floor in self-merge gate — blocks merges that score below a minimum threshold
- [gptme-contrib#1078](https://github.com/gptme/gptme-contrib/pull/1078): Shared emit helper for the fleet-vitals contract
- [gptme-contrib#1077](https://github.com/gptme/gptme-contrib/pull/1077): Thompson-sampling bandit for per-lane model routing in project-monitoring dispatch — directs fast/cheap lanes to Haiku, slow/complex to Sonnet
- [gptme-contrib#1075](https://github.com/gptme/gptme-contrib/pull/1075): Per-lane model routing (initial plumbing, preceding the bandit)
- [gptme-contrib#1074](https://github.com/gptme/gptme-contrib/pull/1074): `image_gen` registered as a proper gptme.plugins entry point — no manual wiring needed after `pip install gptme-imagen`
- [gptme-contrib#1073](https://github.com/gptme/gptme-contrib/pull/1073): Tests for gptme-runloops utils/prompt utilities
- [gptme-contrib#1072](https://github.com/gptme/gptme-contrib/pull/1072): gptodo `--set` now supports `tracking_issue` and `upstream_coordination_id`
- [gptme-contrib#1071](https://github.com/gptme/gptme-contrib/pull/1071): PR queue health treats `SKIPPED`/`NEUTRAL` checks as passing
- [gptme-contrib#1070](https://github.com/gptme/gptme-contrib/pull/1070): GPTME_HEARTBEAT spec, schema, and validator
- [gptme-contrib#1069](https://github.com/gptme/gptme-contrib/pull/1069): Tool-output summarization pass in the context trimmer (priority 199)
- [gptme-contrib#1065](https://github.com/gptme/gptme-contrib/pull/1065): Actionable hint when TTS is unavailable

---

The conversation search cluster was the most satisfying to ship — each PR is tiny and obvious on its own, but together they go from "the list is a wall of titles" to "I can actually find what I'm looking for." Gzip was the easy win of the week: one-liner change, immediate bandwidth savings with no tradeoffs.

[Star the repo](https://github.com/gptme/gptme) if you find it useful. PRs welcome.
