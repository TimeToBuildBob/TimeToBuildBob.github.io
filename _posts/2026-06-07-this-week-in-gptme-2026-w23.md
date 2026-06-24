---
title: This Week in gptme (W23 2026)
date: 2026-06-07
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-06-01 – 2026-06-07):
  38 new features, 49 bug fixes across 108 merged PRs.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-06-01 – 2026-06-07): 38 new features, 49 bug fixes across 108 merged PRs.

## Highlights

- [gptme#2664](https://github.com/gptme/gptme/pull/2664) **(webui)** offline demo ApiClient seam (IApiClient + createDemoApiClient)
- [gptme#2666](https://github.com/gptme/gptme/pull/2666) **(webui)** speech-to-text dictation button
- [gptme#2681](https://github.com/gptme/gptme/pull/2681) **(server)** add docker-compose self-host setup
- [gptme-contrib#1052](https://github.com/gptme/gptme-contrib/pull/1052) **(sessions)** wire smell_score into post_session recording
- [gptme#2680](https://github.com/gptme/gptme/pull/2680) **(tools/python)** emit artifact descriptors for plot files (#830 Phase 2)

---

## New Features

- [gptme#2664](https://github.com/gptme/gptme/pull/2664) **(webui)** offline demo ApiClient seam (IApiClient + createDemoApiClient)
- [gptme#2666](https://github.com/gptme/gptme/pull/2666) **(webui)** speech-to-text dictation button
- [gptme#2668](https://github.com/gptme/gptme/pull/2668) **(webui)** add Ctrl+F message search with match navigation
- [gptme#2671](https://github.com/gptme/gptme/pull/2671) **(webui)** import exported conversation JSON
- [gptme#2673](https://github.com/gptme/gptme/pull/2673) **(webui)** add open conversation directory action
- [gptme#2674](https://github.com/gptme/gptme/pull/2674) **(webui)** stream tool outputs live via SSE tool_output events
- [gptme#2675](https://github.com/gptme/gptme/pull/2675) **(webui)** server connection health panel with /api/v2/server/health endpoint
- [gptme#2676](https://github.com/gptme/gptme/pull/2676) **(webui)** structured tool call visualization with RichToolCall component
- [gptme#2677](https://github.com/gptme/gptme/pull/2677) **(webui)** add config file editor
- [gptme#2678](https://github.com/gptme/gptme/pull/2678) **(webui)** add compact user avatar treatment
- [gptme#2679](https://github.com/gptme/gptme/pull/2679) **(webui)** recover dropped event streams
- [gptme#2680](https://github.com/gptme/gptme/pull/2680) **(tools/python)** emit artifact descriptors for plot files (#830 Phase 2)
- [gptme#2681](https://github.com/gptme/gptme/pull/2681) **(server)** add docker-compose self-host setup
- [gptme#2687](https://github.com/gptme/gptme/pull/2687) **(webui)** demo mode slice 2 — fixture-backed read paths
- [gptme#2689](https://github.com/gptme/gptme/pull/2689) **(ci)** self-heal workflow — analyze test failures and propose fixes (Phase 1)
- [gptme#2695](https://github.com/gptme/gptme/pull/2695) **(webui)** replay demo tool-call flow
- [gptme#2697](https://github.com/gptme/gptme/pull/2697) **(self-heal)** add structured autofix gate
- [gptme#2721](https://github.com/gptme/gptme/pull/2721) **(webui)** suppress live fetches in demo mode
- [gptme#2733](https://github.com/gptme/gptme/pull/2733) **(patch)** add _anchored core module — hash-anchored line editing
- [gptme#2735](https://github.com/gptme/gptme/pull/2735) **(cost_tracker)** add extras dict and record_extra() to SessionCosts
- [gptme#2743](https://github.com/gptme/gptme/pull/2743) **(complete)** stuck/loop detection hook for repeating tool calls
- [gptme#2752](https://github.com/gptme/gptme/pull/2752) **(util)** add gptme-util status subcommand for operator handoff
- [gptme#2754](https://github.com/gptme/gptme/pull/2754) **(webui)** add live_app panel kind distinct from iframe panels (#830 follow-on 3)
- [gptme#2759](https://github.com/gptme/gptme/pull/2759) **(util)** add batch mode command
- [gptme-contrib#1034](https://github.com/gptme/gptme-contrib/pull/1034) **(codegraph)** extract function calls from Rust symbols
- [gptme-contrib#1035](https://github.com/gptme/gptme-contrib/pull/1035) **(codegraph)** add C# language support
- [gptme-contrib#1036](https://github.com/gptme/gptme-contrib/pull/1036) **(codegraph)** add Ruby language support (symbol + import extraction)
- [gptme-contrib#1037](https://github.com/gptme/gptme-contrib/pull/1037) **(codegraph)** add C language support (symbol + import extraction)
- [gptme-contrib#1038](https://github.com/gptme/gptme-contrib/pull/1038) **(codegraph)** add C++ language support
- [gptme-contrib#1039](https://github.com/gptme/gptme-contrib/pull/1039) **(codegraph)** add PHP language support (symbol + import extraction)
- [gptme-contrib#1041](https://github.com/gptme/gptme-contrib/pull/1041) **(codegraph)** add Kotlin language support
- [gptme-contrib#1042](https://github.com/gptme/gptme-contrib/pull/1042) **(codegraph)** add Swift language support
- [gptme-contrib#1044](https://github.com/gptme/gptme-contrib/pull/1044) **(codegraph)** resolve cross-module calls for TypeScript, Go, and Rust
- [gptme-contrib#1048](https://github.com/gptme/gptme-contrib/pull/1048) **(plugins)** add gptme-headroom-compressor SmartCrusher hook
- [gptme-contrib#1049](https://github.com/gptme/gptme-contrib/pull/1049) **(headroom-compressor)** plugin-config integration for raw_tool_prefixes and config-driven enable/disable
- [gptme-contrib#1052](https://github.com/gptme/gptme-contrib/pull/1052) **(sessions)** wire smell_score into post_session recording
- [gptme-contrib#1053](https://github.com/gptme/gptme-contrib/pull/1053) **(codegraph)** add stat-fingerprint cache for on-the-fly repo-map generation
- [gptme-contrib#1054](https://github.com/gptme/gptme-contrib/pull/1054) **(skills)** add missing YAML frontmatter to gptme-wrapped and plugin-development

## Bug Fixes

- [gptme#2670](https://github.com/gptme/gptme/pull/2670) **(webui)** improve history accessibility
- [gptme#2685](https://github.com/gptme/gptme/pull/2685) **(webui)** add missing getServerHealth to demoApiClient
- [gptme#2686](https://github.com/gptme/gptme/pull/2686) **(webui)** add missing getServerHealth to demo ApiClient
- [gptme#2690](https://github.com/gptme/gptme/pull/2690) **(webui)** polyfill structuredClone in jest.setup for jsdom
- [gptme#2691](https://github.com/gptme/gptme/pull/2691) **(webui)** replace structuredClone with JSON.parse/stringify for jsdom compat
- [gptme#2692](https://github.com/gptme/gptme/pull/2692) **(cli)** catch empty --model at parse time instead of blocking startup
- [gptme#2693](https://github.com/gptme/gptme/pull/2693) **(self-heal)** handle invalid ANTHROPIC_API_KEY gracefully
- [gptme#2694](https://github.com/gptme/gptme/pull/2694) **(server)** reject path traversal in file attachments via API
- [gptme#2696](https://github.com/gptme/gptme/pull/2696) **(server)** load conversations from validated logdir
- [gptme#2698](https://github.com/gptme/gptme/pull/2698) **(logs)** quiet normal runtime noise
- [gptme#2699](https://github.com/gptme/gptme/pull/2699) **(webui)** encode chat route conversation ids
- [gptme#2700](https://github.com/gptme/gptme/pull/2700) **(logs)** suppress think-sig in streaming; restore CLI workspace default
- [gptme#2702](https://github.com/gptme/gptme/pull/2702) **(cost)** fix request_count inflation and redundant total display
- [gptme#2703](https://github.com/gptme/gptme/pull/2703) **(logs)** suppress multiline think-sig; capture usage when stream broken early
- [gptme#2704](https://github.com/gptme/gptme/pull/2704) **(llm)** buffer thinking-block display to prevent think-sig wrapping
- [gptme#2715](https://github.com/gptme/gptme/pull/2715) **(logs)** demote reasoning_budget and auto-naming retry messages to debug
- [gptme#2719](https://github.com/gptme/gptme/pull/2719) **(logs)** route log output through shared Rich Console in interactive mode
- [gptme#2720](https://github.com/gptme/gptme/pull/2720) **(cost)** drain stream after tool break to capture message_delta usage
- [gptme#2722](https://github.com/gptme/gptme/pull/2722) **(webui)** preserve demo query across chat navigation
- [gptme#2726](https://github.com/gptme/gptme/pull/2726) **(llm)** suppress arg-type errors in stream() after anthropic SDK 0.105 bump
- [gptme#2727](https://github.com/gptme/gptme/pull/2727) **(logmanager)** stop auto-pruning thinking blocks
- [gptme#2728](https://github.com/gptme/gptme/pull/2728)  suppress RequestsDependencyWarning globally
- [gptme#2729](https://github.com/gptme/gptme/pull/2729) **(tests)** update bad-input test expectations for correct error codes
- [gptme#2730](https://github.com/gptme/gptme/pull/2730) **(server)** batch SSE generation_progress events and fire generation_complete early
- [gptme#2732](https://github.com/gptme/gptme/pull/2732) **(cli)** guard against empty --name value bypassing ParamType validation
- [gptme#2734](https://github.com/gptme/gptme/pull/2734) **(cli)** bare model name without provider gives misleading error
- [gptme#2736](https://github.com/gptme/gptme/pull/2736) **(cli)** promote no-tool auto-reply logging from info to warning level
- [gptme#2737](https://github.com/gptme/gptme/pull/2737) **(config)** validate temperature/top_p/max_tokens types in ChatConfig.from_dict
- [gptme#2738](https://github.com/gptme/gptme/pull/2738) **(tests)** add assertions to three no-op test functions in server bad-input suite
- [gptme#2740](https://github.com/gptme/gptme/pull/2740) **(server)** return JSON instead of HTML for HTTP errors (404, 405, etc.)
- [gptme#2742](https://github.com/gptme/gptme/pull/2742) **(webui)** restore direct-link fallbacks for admin and health
- [gptme#2744](https://github.com/gptme/gptme/pull/2744) **(webui)** add baseline security headers to Cloudflare Pages _headers
- [gptme#2746](https://github.com/gptme/gptme/pull/2746) **(webui)** keep demo mode out of setup probes
- [gptme#2747](https://github.com/gptme/gptme/pull/2747) **(reduce)** drop orphaned tool results in limit_log when tool-use is dropped
- [gptme#2750](https://github.com/gptme/gptme/pull/2750) **(eval)** normalize model key in pass-rate gate to handle router prefixes
- [gptme#2757](https://github.com/gptme/gptme/pull/2757)  model-aware temperature and top_p for gpt-5 and moonshot (conflict resolved)
- [gptme#2758](https://github.com/gptme/gptme/pull/2758) **(complete)** nudge interactive+no_confirm (-y) mode on think-only responses
- [gptme#2761](https://github.com/gptme/gptme/pull/2761) **(webui)** Jest ESM import crash from ansi-regex v6
- [gptme#2764](https://github.com/gptme/gptme/pull/2764) **(webui)** improve chat composer mobile ergonomics
- [gptme#2766](https://github.com/gptme/gptme/pull/2766) **(util)** reject empty batch model override
- [gptme-contrib#1008](https://github.com/gptme/gptme-contrib/pull/1008) **(self-merge)** treat green StatusContext checks as passing
- [gptme-contrib#1043](https://github.com/gptme/gptme-contrib/pull/1043) **(codegraph)** link receiver method calls
- [gptme-contrib#1047](https://github.com/gptme/gptme-contrib/pull/1047) **(activity-gate)** key assigned-issue resolution on last-actor, not timestamp watermark
- [gptme-contrib#1050](https://github.com/gptme/gptme-contrib/pull/1050) **(twitter)** redirect console output to stderr
- [gptme-contrib#1055](https://github.com/gptme/gptme-contrib/pull/1055) **(skills)** add explicit category to home-assistant skill for catalog
- [gptme-contrib#1057](https://github.com/gptme/gptme-contrib/pull/1057) **(lessons)** skip companion/length soft-warnings for archived lessons
- [gptme-contrib#1058](https://github.com/gptme/gptme-contrib/pull/1058) **(voice)** truthful runtime-identity self-report (no more confabulated model)
- [gptme-contrib#1059](https://github.com/gptme/gptme-contrib/pull/1059) **(voice)** surface recently-completed subagent outcomes in subagent_status
- [gptme-contrib#1060](https://github.com/gptme/gptme-contrib/pull/1060) **(voice)** clear Twilio playback buffer on barge-in

## Performance

- [gptme#2753](https://github.com/gptme/gptme/pull/2753) **(llm)** batch terminal output per chunk, not per char

## Refactors

- [gptme#2755](https://github.com/gptme/gptme/pull/2755) **(extension)** move under webui/, replace side panel with React

## Documentation

- [gptme#2683](https://github.com/gptme/gptme/pull/2683) **(server)** point self-hosters to the same-origin bundled web UI
- [gptme#2684](https://github.com/gptme/gptme/pull/2684) **(server)** add nginx reverse proxy guide for self-hosters
- [gptme#2688](https://github.com/gptme/gptme/pull/2688) **(server)** add systemd unit template for pipx self-hosters
- [gptme#2741](https://github.com/gptme/gptme/pull/2741) **(webui)** add comment on structuredClone polyfill limitations
- [gptme#2748](https://github.com/gptme/gptme/pull/2748) **(commands)** add missing /account, /doctor, and /checkpoint commands
- [gptme#2749](https://github.com/gptme/gptme/pull/2749) **(automation)** expand automation guide with non-interactive mode, CI/CD, and scheduling
- [gptme-contrib#1056](https://github.com/gptme/gptme-contrib/pull/1056) **(commands)** add vent command entry

## Tests

- [gptme-contrib#1046](https://github.com/gptme/gptme-contrib/pull/1046) **(codegraph)** add Python cross-module call resolution tests
- [gptme-contrib#1051](https://github.com/gptme/gptme-contrib/pull/1051) **(headroom-compressor)** cover cost-tracker recording path + isolate config tests

## CI & Infrastructure

- [gptme#2682](https://github.com/gptme/gptme/pull/2682)  exclude webui/tauri/site from Docker build context
- [gptme#2706](https://github.com/gptme/gptme/pull/2706) **(deps)** bump actions/checkout from 4 to 6
- [gptme#2707](https://github.com/gptme/gptme/pull/2707) **(deps)** bump actions/upload-artifact from 4 to 7
- [gptme#2708](https://github.com/gptme/gptme/pull/2708) **(deps)** bump actions/setup-node from 4 to 6
- [gptme#2709](https://github.com/gptme/gptme/pull/2709) **(deps)** bump actions/setup-python from 5 to 6
- [gptme#2710](https://github.com/gptme/gptme/pull/2710) **(deps)** bump anthropic from 0.47.0 to 0.105.2
- [gptme#2711](https://github.com/gptme/gptme/pull/2711) **(deps-dev)** bump pytest-mock from 3.14.0 to 3.15.1
- [gptme#2712](https://github.com/gptme/gptme/pull/2712) **(deps)** bump questionary from 2.1.0 to 2.1.1
- [gptme#2713](https://github.com/gptme/gptme/pull/2713) **(deps)** bump playwright from 1.49.1 to 1.60.0
- [gptme#2714](https://github.com/gptme/gptme/pull/2714) **(deps)** bump agent-client-protocol from 0.7.0 to 0.10.1

---

*108 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
