---
title: This Week in gptme (W24 2026)
date: 2026-06-14
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-06-08 – 2026-06-14):
  76 new features, 43 bug fixes across 145 merged PRs.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-06-08 – 2026-06-14): 76 new features, 43 bug fixes across 145 merged PRs.

## Highlights

- [gptme#2885](https://github.com/gptme/gptme/pull/2885) **(commands)** `/snapshot` — agents can now checkpoint their conversation tree and resume from any past state
- [gptme#2882](https://github.com/gptme/gptme/pull/2882) **(tools)** `view_anchored` and `patch_anchored` — edit files without line-number drift
- [gptme#2878](https://github.com/gptme/gptme/pull/2878) **(commands)** `/backtrack` — in-session conversation recovery; roll back to any prior checkpoint
- [gptme#2880](https://github.com/gptme/gptme/pull/2880) **(tools)** `ToolFunction` abstraction — structured callable metadata for tools, enabling richer composition
- [gptme#2778](https://github.com/gptme/gptme/pull/2778) **(webui)** browser TTS for assistant messages via Web Speech API

---

## New Features

- [gptme#2778](https://github.com/gptme/gptme/pull/2778) **(webui)** add browser TTS for assistant messages (Slice 1 — Web Speech API)
- [gptme#2779](https://github.com/gptme/gptme/pull/2779) **(webui)** add Alt+N global shortcut for new conversation
- [gptme#2781](https://github.com/gptme/gptme/pull/2781) **(plugins)** discover src-layout plugins, layer user [plugins], lenient +tool
- [gptme#2791](https://github.com/gptme/gptme/pull/2791) **(server)** add `detail` query param to conversation list endpoint
- [gptme#2792](https://github.com/gptme/gptme/pull/2792) **(webui)** auto-poll provider health every 60s; add degraded badge on settings icon
- [gptme#2794](https://github.com/gptme/gptme/pull/2794) **(webui)** add OpenRouter STT fallback for unsupported browsers
- [gptme#2795](https://github.com/gptme/gptme/pull/2795) **(webui)** add server-side TTS endpoint via OpenRouter
- [gptme#2797](https://github.com/gptme/gptme/pull/2797) **(cli)** add --format table option to gptme-util status
- [gptme#2801](https://github.com/gptme/gptme/pull/2801) **(webui)** model favorites, set-as-default, and picker scroll fix
- [gptme#2803](https://github.com/gptme/gptme/pull/2803) **(webui)** toggle/stop TTS playback from the message button
- [gptme#2806](https://github.com/gptme/gptme/pull/2806) **(webui)** add /settings route with full-page settings view
- [gptme#2812](https://github.com/gptme/gptme/pull/2812) **(webui)** show active model in conversation header
- [gptme#2813](https://github.com/gptme/gptme/pull/2813) **(ci)** self-heal Phase 2 — auto-open draft fix PR on structured gate pass
- [gptme#2814](https://github.com/gptme/gptme/pull/2814) **(artifacts)** include workspace files created/modified by the conversation
- [gptme#2815](https://github.com/gptme/gptme/pull/2815) **(webui)** add TTS engine selector (browser / gptme-server / gptme-tts)
- [gptme#2816](https://github.com/gptme/gptme/pull/2816) **(webui)** add keyboard shortcut (Ctrl+Shift+\) to toggle split view
- [gptme#2817](https://github.com/gptme/gptme/pull/2817) **(webui)** add per-pane conversation selector in split view (Slice 2)
- [gptme#2818](https://github.com/gptme/gptme/pull/2818) **(artifacts)** format-independent file-write parsing + diffs
- [gptme#2823](https://github.com/gptme/gptme/pull/2823) **(webui)** show message count as badge on conversation title line
- [gptme#2824](https://github.com/gptme/gptme/pull/2824) **(webui)** add URL subroutes for settings category deep-linking
- [gptme#2825](https://github.com/gptme/gptme/pull/2825) **(webui)** add persistent no-confirm (YOLO) mode setting
- [gptme#2827](https://github.com/gptme/gptme/pull/2827) **(webui)** add conversation list search/filter
- [gptme#2828](https://github.com/gptme/gptme/pull/2828) **(webui)** show relative timestamps on messages with auto-refresh
- [gptme#2831](https://github.com/gptme/gptme/pull/2831) **(config)** add context_exclude glob patterns to [prompt] in gptme.toml
- [gptme#2832](https://github.com/gptme/gptme/pull/2832) **(webui)** highlight matched search terms in conversation list titles
- [gptme#2833](https://github.com/gptme/gptme/pull/2833) **(server)** expose message_count and last_updated in conversation list
- [gptme#2834](https://github.com/gptme/gptme/pull/2834) **(webui)** persist conversation search query in URL ?search= param
- [gptme#2837](https://github.com/gptme/gptme/pull/2837) **(eval)** add narrow swebench install extra
- [gptme#2838](https://github.com/gptme/gptme/pull/2838) **(webui)** add / keyboard shortcut to focus conversation search
- [gptme#2840](https://github.com/gptme/gptme/pull/2840) **(webui)** add settings-level STT provider choice (browser vs server)
- [gptme#2841](https://github.com/gptme/gptme/pull/2841) **(webui)** show conversation stats in list using list-response data
- [gptme#2843](https://github.com/gptme/gptme/pull/2843) **(cli)** add startup prompt stats report
- [gptme#2844](https://github.com/gptme/gptme/pull/2844) **(eval)** surface per-task tool-call count (tool-efficiency metric)
- [gptme#2848](https://github.com/gptme/gptme/pull/2848) **(webui)** server-backed star/unstar for conversations via metadata sidecar
- [gptme#2853](https://github.com/gptme/gptme/pull/2853) **(cli)** add --no-workspace flag to skip all workspace context
- [gptme#2860](https://github.com/gptme/gptme/pull/2860) **(server)** cursor-based pagination for conversations list
- [gptme#2861](https://github.com/gptme/gptme/pull/2861) **(server)** add limit/before message pagination to conversation GET
- [gptme#2864](https://github.com/gptme/gptme/pull/2864) **(server)** add ?q= filter param to conversations API with server-side webui search
- [gptme#2865](https://github.com/gptme/gptme/pull/2865) **(webui)** add sort control to conversation list (Recent/Longest/A-Z)
- [gptme#2869](https://github.com/gptme/gptme/pull/2869) **(openai)** enable Responses API by default for gpt-5/o-series models
- [gptme#2870](https://github.com/gptme/gptme/pull/2870) **(server)** add /api/v0/metrics Prometheus endpoint
- [gptme#2872](https://github.com/gptme/gptme/pull/2872) **(webui)** thread log_offset through conversation state for windowed pagination (Slice 1)
- [gptme#2878](https://github.com/gptme/gptme/pull/2878) **(commands)** add /backtrack for in-session conversation recovery
- [gptme#2880](https://github.com/gptme/gptme/pull/2880) **(tools)** introduce ToolFunction abstraction for structured callable metadata
- [gptme#2881](https://github.com/gptme/gptme/pull/2881) **(subagent)** forward subprocess/isolated defaults from planner subtask roles
- [gptme#2882](https://github.com/gptme/gptme/pull/2882) **(tools)** add view_anchored and patch_anchored tools (Gate G2)
- [gptme#2884](https://github.com/gptme/gptme/pull/2884) **(computer)** add scroll action for mouse wheel support
- [gptme#2885](https://github.com/gptme/gptme/pull/2885) **(commands)** add /snapshot command for agent tree search (#495)
- [gptme#2886](https://github.com/gptme/gptme/pull/2886) **(snapshot)** embed conversation message count for diff summary
- [gptme-contrib#1061](https://github.com/gptme/gptme-contrib/pull/1061) **(gptme-codegraph)** add local-first semantic search (Phase 1)
- [gptme-contrib#1063](https://github.com/gptme/gptme-contrib/pull/1063) **(gptme-coordination)** add generic inter-agent coordination package
- [gptme-contrib#1065](https://github.com/gptme/gptme-contrib/pull/1065) **(gptme-tts)** actionable available_hint when TTS is unavailable
- [gptme-contrib#1069](https://github.com/gptme/gptme-contrib/pull/1069) **(trimmer)** add tool-output summarization pass (priority 199)
- [gptme-contrib#1070](https://github.com/gptme/gptme-contrib/pull/1070) **(protocols)** add GPTME_HEARTBEAT spec, schema, and validator
- [gptme-contrib#1074](https://github.com/gptme/gptme-contrib/pull/1074) **(imagen)** register image_gen as a gptme.plugins entry point
- [gptme-contrib#1075](https://github.com/gptme/gptme-contrib/pull/1075) **(pm-dispatch)** per-lane model routing (fast lane → cheaper model)
- [gptme-contrib#1077](https://github.com/gptme/gptme-contrib/pull/1077) **(pm-dispatch)** Thompson-sampling bandit for per-lane model routing
- [gptme-contrib#1078](https://github.com/gptme/gptme-contrib/pull/1078) **(fleet-vitals)** shared emit helper for the fleet-vitals contract
- [gptme-contrib#1079](https://github.com/gptme/gptme-contrib/pull/1079) **(imagen)** add execute function for image_gen blocks with inline webui preview
- [gptme-contrib#1080](https://github.com/gptme/gptme-contrib/pull/1080) **(self-merge)** Greptile score floor — upstream greptile-merge-signal + wire into gate
- [gptme-contrib#1081](https://github.com/gptme/gptme-contrib/pull/1081) **(pm)** surface own-PR Greptile review via notification-blind detector
- [gptme-contrib#1082](https://github.com/gptme/gptme-contrib/pull/1082) **(github)** add resolve-greptile-threads.py (resolveReviewThread primitive)
- [gptme-contrib#1083](https://github.com/gptme/gptme-contrib/pull/1083) **(gptodo)** add 'status --json' for machine-readable output
- [gptme-contrib#1085](https://github.com/gptme/gptme-contrib/pull/1085) **(agent-msg)** add reply command and needs-reply tracking
- [gptme-contrib#1086](https://github.com/gptme/gptme-contrib/pull/1086) **(scripts)** upstream codex + openrouter usage scrapers
- [gptme-contrib#1088](https://github.com/gptme/gptme-contrib/pull/1088) **(subscription)** upstream config-driven check-quota.py + shared harness_models
- [gptme-contrib#1089](https://github.com/gptme/gptme-contrib/pull/1089) **(gptmail)** add channel field to MessageInfo tracker
- [gptme-contrib#1090](https://github.com/gptme/gptme-contrib/pull/1090) **(gptmail)** add Transport Protocol + EmailTransport adapter (fold step 1)
- [gptme-contrib#1092](https://github.com/gptme/gptme-contrib/pull/1092) **(self-merge)** capture headRefOid in CheckResult for pre-merge re-check
- [gptme-contrib#1094](https://github.com/gptme/gptme-contrib/pull/1094) **(gptmail)** add AgentTransport (fold step 2)
- [gptme-contrib#1097](https://github.com/gptme/gptme-contrib/pull/1097) **(gptmail)** add `gptmail agent` CLI subgroup (fold step 3)
- [gptme-contrib#1098](https://github.com/gptme/gptme-contrib/pull/1098) **(subscription)** add HarnessQuotaConfig + load_quota_config() for agent-generic quota
- [gptme-contrib#1101](https://github.com/gptme/gptme-contrib/pull/1101) **(usage)** new gptme-usage package — move harness_models + config-leak fixes
- [gptme-contrib#1102](https://github.com/gptme/gptme-contrib/pull/1102) **(usage)** config-driven quota — ship generic, data via per-agent harness-quota.toml
- [gptme-contrib#1103](https://github.com/gptme/gptme-contrib/pull/1103) **(gptmail)** unread-default + read markers for `gptmail agent list`
- [gptme-contrib#1108](https://github.com/gptme/gptme-contrib/pull/1108) **(gptme-usage)** add merge_with_module_defaults helper

## Bug Fixes

- [gptme#2777](https://github.com/gptme/gptme/pull/2777) **(ci)** pin self-heal logs to triggering attempt
- [gptme#2793](https://github.com/gptme/gptme/pull/2793) **(plugins)** recurse nested src-layout tool packages
- [gptme#2796](https://github.com/gptme/gptme/pull/2796) **(webui)** request fast conversation list detail
- [gptme#2798](https://github.com/gptme/gptme/pull/2798) **(cli)** reject malformed model paths
- [gptme#2800](https://github.com/gptme/gptme/pull/2800)  conversation load crash chain (server symlink 500 + webui dataless crash + error surfacing)
- [gptme#2802](https://github.com/gptme/gptme/pull/2802) **(webui)** UI polish (input radius, code blocks, avatar, health badge)
- [gptme#2804](https://github.com/gptme/gptme/pull/2804) **(webui)** sync model selector when switching conversations
- [gptme#2807](https://github.com/gptme/gptme/pull/2807) **(hooks)** hide injected agent-instructions from conversation view
- [gptme#2808](https://github.com/gptme/gptme/pull/2808) **(webui)** don't flush queued messages during tool confirmation
- [gptme#2809](https://github.com/gptme/gptme/pull/2809) **(tools)** report unavailable tools accurately instead of 'invalid choice'
- [gptme#2820](https://github.com/gptme/gptme/pull/2820) **(cloud)** route LLM API calls to Supabase edge functions, not fleet.gptme.ai
- [gptme#2821](https://github.com/gptme/gptme/pull/2821) **(server)** graceful shutdown on SIGTERM
- [gptme#2822](https://github.com/gptme/gptme/pull/2822) **(webui)** make Escape key and interrupt logs consistent with isBusy
- [gptme#2826](https://github.com/gptme/gptme/pull/2826) **(cloud)** parse max_completion_tokens for gptme provider models
- [gptme#2829](https://github.com/gptme/gptme/pull/2829) **(webui)** make clickable selection rows keyboard-accessible
- [gptme#2835](https://github.com/gptme/gptme/pull/2835) **(webui)** update ConversationList test to handle highlighted search terms
- [gptme#2845](https://github.com/gptme/gptme/pull/2845) **(webui)** add Escape-to-navigate-back for full-page settings view
- [gptme#2846](https://github.com/gptme/gptme/pull/2846) **(complete)** auto-reply kill-switch now detects incomplete-todos variant
- [gptme#2849](https://github.com/gptme/gptme/pull/2849) **(webui)** add semantic landmarks, aria-current, and aria-selected for keyboard navigation
- [gptme#2856](https://github.com/gptme/gptme/pull/2856) **(server)** scope conversations cache to active logs dir
- [gptme#2857](https://github.com/gptme/gptme/pull/2857) **(webui)** reduce redundant conversations API calls on page load
- [gptme#2859](https://github.com/gptme/gptme/pull/2859) **(server)** preserve messages field on cached conversation list responses
- [gptme#2867](https://github.com/gptme/gptme/pull/2867)  two startup hangs — skip OpenRouter fetch for bare model names, non-blocking piped stdin
- [gptme#2868](https://github.com/gptme/gptme/pull/2868) **(server)** validate model type in config PATCH to prevent 500
- [gptme#2871](https://github.com/gptme/gptme/pull/2871) **(models)** validate provider default model entries + update groq default
- [gptme#2873](https://github.com/gptme/gptme/pull/2873) **(server)** improve model validation error messages with examples
- [gptme#2874](https://github.com/gptme/gptme/pull/2874) **(server)** tolerate pre-existing workspace symlink in ChatConfig.from_logdir
- [gptme#2877](https://github.com/gptme/gptme/pull/2877) **(server)** return 400 for non-positive limit in conversations API
- [gptme#2879](https://github.com/gptme/gptme/pull/2879) **(webui)** collapse single hook system messages in chat view
- [gptme-contrib#1062](https://github.com/gptme/gptme-contrib/pull/1062) **(gptme-tts)** make plugin discoverable and fix stale hook names
- [gptme-contrib#1064](https://github.com/gptme/gptme-contrib/pull/1064) **(subscription)** export pacing snapshot helpers
- [gptme-contrib#1066](https://github.com/gptme/gptme-contrib/pull/1066) **(self-merge-check)** accept 'owner/repo <number>' two-positional form
- [gptme-contrib#1071](https://github.com/gptme/gptme-contrib/pull/1071) **(pr-queue-health)** treat SKIPPED/NEUTRAL checks as passing
- [gptme-contrib#1072](https://github.com/gptme/gptme-contrib/pull/1072) **(gptodo)** allow editing tracking_issue and upstream_coordination_id via --set
- [gptme-contrib#1084](https://github.com/gptme/gptme-contrib/pull/1084) **(scripts)** reconcile check-claude-usage.sh with main-repo fixes
- [gptme-contrib#1093](https://github.com/gptme/gptme-contrib/pull/1093) **(lessons)** remove dead keywords from project-monitoring-session-patterns
- [gptme-contrib#1095](https://github.com/gptme/gptme-contrib/pull/1095) **(scripts)** treat partial-null limit_remaining as available in check-openrouter-usage
- [gptme-contrib#1096](https://github.com/gptme/gptme-contrib/pull/1096) **(monitoring)** emit own-PR Greptile review for BLOCKED PRs
- [gptme-contrib#1104](https://github.com/gptme/gptme-contrib/pull/1104) **(self-merge)** gate eligibility on actual merge permission
- [gptme-contrib#1106](https://github.com/gptme/gptme-contrib/pull/1106) **(runloops)** lazy pm_dispatch re-export to silence runpy RuntimeWarning
- [gptme-contrib#1107](https://github.com/gptme/gptme-contrib/pull/1107) **(self-merge)** scope spec-like-doc gate to repo root only
- [gptme-contrib#1109](https://github.com/gptme/gptme-contrib/pull/1109) **(gptmail agent)** report delivery failures + guard self-send
- [gptme-contrib#1110](https://github.com/gptme/gptme-contrib/pull/1110) **(gptmail agent)** exclude peer replies to my messages from pending

## Performance

- [gptme#2852](https://github.com/gptme/gptme/pull/2852) **(server)** enable gzip compression on API responses
- [gptme#2854](https://github.com/gptme/gptme/pull/2854) **(server)** skip branch glob on fast scan, dedupe stat, drop debug log
- [gptme#2862](https://github.com/gptme/gptme/pull/2862) **(tools)** lazy-load mcp.types and bashlex to reduce startup time
- [gptme#2863](https://github.com/gptme/gptme/pull/2863) **(server)** add ETag conditional request support for conversations endpoints
- [gptme#2866](https://github.com/gptme/gptme/pull/2866) **(tools)** lazy-load MCPClient and MCPRegistry to reduce startup time

## Refactors

- [gptme#2805](https://github.com/gptme/gptme/pull/2805) **(webui)** group Settings → Servers into collapsible sections
- [gptme#2875](https://github.com/gptme/gptme/pull/2875) **(llm)** extract shared Responses API event loop into openai_responses.py
- [gptme-contrib#1105](https://github.com/gptme/gptme-contrib/pull/1105) **(agent-msg)** convert to thin shim over gptmail agent CLI

## Documentation

- [gptme#2782](https://github.com/gptme/gptme/pull/2782) **(howto)** add how-to guide section with 5 task-oriented recipes
- [gptme#2810](https://github.com/gptme/gptme/pull/2810)  add model-routing guide — pick your model per task
- [gptme#2811](https://github.com/gptme/gptme/pull/2811) **(config)** document [models] section — default and favorites keys
- [gptme#2858](https://github.com/gptme/gptme/pull/2858) **(howto)** remove inaccurate --no-workspace equivalence claim

## Tests

- [gptme#2780](https://github.com/gptme/gptme/pull/2780) **(tauri)** add E2E chat interaction flow tests (Slice 2)
- [gptme#2830](https://github.com/gptme/gptme/pull/2830) **(server)** add PATCH edit-message and DELETE message edge-case tests
- [gptme#2839](https://github.com/gptme/gptme/pull/2839) **(webui)** add Playwright e2e keyboard navigation tests
- [gptme#2847](https://github.com/gptme/gptme/pull/2847) **(complete)** cover cross-variant auto-reply exit counting
- [gptme-contrib#1068](https://github.com/gptme/gptme-contrib/pull/1068) **(coordination)** add tests for db module
- [gptme-contrib#1073](https://github.com/gptme/gptme-contrib/pull/1073) **(gptme-runloops)** add tests for utils/prompt utilities

## CI & Infrastructure

- [gptme#2784](https://github.com/gptme/gptme/pull/2784) **(deps)** bump actions/cache from 4 to 5
- [gptme#2785](https://github.com/gptme/gptme/pull/2785) **(deps)** bump codecov/codecov-action from 6 to 7
- [gptme#2786](https://github.com/gptme/gptme/pull/2786) **(deps-dev)** bump pre-commit from 4.0.1 to 4.6.0
- [gptme#2787](https://github.com/gptme/gptme/pull/2787) **(deps-dev)** bump mypy from 1.13.0 to 2.1.0
- [gptme#2788](https://github.com/gptme/gptme/pull/2788) **(deps)** bump datasets from 4.6.0 to 5.0.0
- [gptme#2789](https://github.com/gptme/gptme/pull/2789) **(deps-dev)** bump sphinx-book-theme from 1.1.3 to 1.1.4
- [gptme#2790](https://github.com/gptme/gptme/pull/2790) **(deps-dev)** bump myst-parser from 4.0.0 to 4.0.1

## Chore

- [gptme-contrib#1067](https://github.com/gptme/gptme-contrib/pull/1067)  ignore Python build/ and dist/ artifacts (git + jscpd)

---

*145 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
