---
title: This Week in gptme (W25 2026)
date: 2026-06-21
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: '84 PRs merged across gptme and gptme-contrib this week: subagent clarification,
  fork-any-message in the webui, append-only session logs, and a tree-of-thoughts
  eval harness.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-06-15 – 2026-06-21): 32 new features, 41 bug fixes across 84 merged PRs.

## Highlights

- [gptme#2902](https://github.com/gptme/gptme/pull/2902) **(webui)** add 'Try the offline demo' CTA to disconnected state
- [gptme#2923](https://github.com/gptme/gptme/pull/2923) **(webui)** fork conversations from any message
- [gptme#2952](https://github.com/gptme/gptme/pull/2952) **(server)** add API version constants, contract_revision, and X-API-Version header
- [gptme#2954](https://github.com/gptme/gptme/pull/2954) **(server)** add /api/v2/version endpoint
- [gptme#2899](https://github.com/gptme/gptme/pull/2899) **(tools)** as_function_subtoolspecs() — invoke tool functions without IPython

---

## New Features

- [gptme#2892](https://github.com/gptme/gptme/pull/2892) **(subagent)** configurable max_concurrent cap with semaphore gating
- [gptme#2896](https://github.com/gptme/gptme/pull/2896) **(util)** add --output-format json to gptme-util llm generate
- [gptme#2897](https://github.com/gptme/gptme/pull/2897) **(snapshot)** add --dry-run / -n flag to /snapshot prune
- [gptme#2898](https://github.com/gptme/gptme/pull/2898) **(computer)** add wait_for_change action for context-efficient UI loops
- [gptme#2899](https://github.com/gptme/gptme/pull/2899) **(tools)** as_function_subtoolspecs() — invoke tool functions without IPython
- [gptme#2900](https://github.com/gptme/gptme/pull/2900) **(scripts)** add treeofthoughts.py — eval-guided tree search for agents (#495)
- [gptme#2901](https://github.com/gptme/gptme/pull/2901) **(webui/tts)** add ttsAuthToken setting for cloud-authenticated TTS
- [gptme#2902](https://github.com/gptme/gptme/pull/2902) **(webui)** add 'Try the offline demo' CTA to disconnected state
- [gptme#2903](https://github.com/gptme/gptme/pull/2903) **(webui/stt)** add sttAuthToken setting for cloud-authenticated STT
- [gptme#2904](https://github.com/gptme/gptme/pull/2904) **(computer)** add window_focus action for reliable new-window targeting
- [gptme#2906](https://github.com/gptme/gptme/pull/2906) **(subagent)** clarification mechanism — subagents can pause and ask parent for more info
- [gptme#2907](https://github.com/gptme/gptme/pull/2907) **(profiles)** add structured-first backend selection to computer-use profile
- [gptme#2908](https://github.com/gptme/gptme/pull/2908) **(doctor)** add computer use prerequisite checks + run-docker-computer target
- [gptme#2919](https://github.com/gptme/gptme/pull/2919) **(ci)** run webui e2e tests against both stable and dev gptme
- [gptme#2920](https://github.com/gptme/gptme/pull/2920) **(shell)** suggest subagent when cd enters workspace with gptme.toml (#554)
- [gptme#2921](https://github.com/gptme/gptme/pull/2921) **(subagent)** progress tool — intermediate parent notifications during long tasks (#554)
- [gptme#2923](https://github.com/gptme/gptme/pull/2923) **(webui)** fork conversations from any message
- [gptme#2925](https://github.com/gptme/gptme/pull/2925) **(llm)** add built-in offline mock provider
- [gptme#2932](https://github.com/gptme/gptme/pull/2932) **(cli)** add `gptme-util snapshot list` subcommand
- [gptme#2933](https://github.com/gptme/gptme/pull/2933) **(cli)** add gptme-resume subcommand for lossy session rehydration
- [gptme#2947](https://github.com/gptme/gptme/pull/2947) **(webui)** chat UI polish — role-aligned message footer + Chat-button sidebar toggle
- [gptme#2950](https://github.com/gptme/gptme/pull/2950) **(subagent)** add redact_secrets option for context isolation
- [gptme#2952](https://github.com/gptme/gptme/pull/2952) **(server)** add API version constants, contract_revision, and X-API-Version header
- [gptme#2954](https://github.com/gptme/gptme/pull/2954) **(server)** add /api/v2/version endpoint
- [gptme#2956](https://github.com/gptme/gptme/pull/2956) **(logmanager)** append-only event log for session durability (Phase 1)
- [gptme#2961](https://github.com/gptme/gptme/pull/2961) **(subagent)** add subagent_list() tool for observability
- [gptme-contrib#1123](https://github.com/gptme/gptme-contrib/pull/1123) **(match-lessons)** suppress archived lessons + prevent contrib re-injection
- [gptme-contrib#1125](https://github.com/gptme/gptme-contrib/pull/1125) **(gptmail)** add named local mailboxes to agent CLI
- [gptme-contrib#1127](https://github.com/gptme/gptme-contrib/pull/1127) **(gptmail)** add fleet pending recipient view
- [gptme-contrib#1130](https://github.com/gptme/gptme-contrib/pull/1130) **(subscription)** add live token-probe script with refresh-aware stale-slot detection
- [gptme-contrib#1133](https://github.com/gptme/gptme-contrib/pull/1133) **(gptodo)** auto-set waiting_since when transitioning to waiting state
- [gptme-contrib#1145](https://github.com/gptme/gptme-contrib/pull/1145) **(pm-dispatch)** wire PmModelBandit into LaneDispatcher for model routing

## Bug Fixes

- [gptme#2905](https://github.com/gptme/gptme/pull/2905) **(webui/demo)** skip provider health + user settings fetches in demo mode
- [gptme#2915](https://github.com/gptme/gptme/pull/2915) **(server)** handle OSError in workspace API endpoints (ENAMETOOLONG crash)
- [gptme#2917](https://github.com/gptme/gptme/pull/2917) **(webui)** tolerate legacy non-paginated conversations response (#2916)
- [gptme#2922](https://github.com/gptme/gptme/pull/2922) **(webui)** skip hosted loopback probe for first-time users
- [gptme#2924](https://github.com/gptme/gptme/pull/2924) **(webui)** avoid sidebar log scans
- [gptme#2931](https://github.com/gptme/gptme/pull/2931) **(server)** accept --tools none to disable all tools
- [gptme#2935](https://github.com/gptme/gptme/pull/2935) **(webui)** extract ConversationItem to module level
- [gptme#2936](https://github.com/gptme/gptme/pull/2936) **(test)** use json.dumps for valid JSON in kimi_k2 test
- [gptme#2941](https://github.com/gptme/gptme/pull/2941) **(cli)** validate model provider early, before context_cmd runs
- [gptme#2942](https://github.com/gptme/gptme/pull/2942) **(server)** preserve 'files' field in PUT /api/v2/conversations/:id messages
- [gptme#2943](https://github.com/gptme/gptme/pull/2943) **(server)** enforce workspace containment at config PUT/PATCH boundary
- [gptme#2945](https://github.com/gptme/gptme/pull/2945) **(webui)** code-block rendering improvements + emoji additions + star move
- [gptme#2946](https://github.com/gptme/gptme/pull/2946) **(tools)** normalize bare callables in ToolSpec.functions (server won't start with plugins)
- [gptme#2951](https://github.com/gptme/gptme/pull/2951) **(cli)** make tokens count --file - read from stdin
- [gptme#2953](https://github.com/gptme/gptme/pull/2953) **(server)** prevent external-sessions endpoint from hanging on large session catalogs
- [gptme#2957](https://github.com/gptme/gptme/pull/2957) **(tests)** mock thread creation in test_subagent_status_returns_dict
- [gptme#2959](https://github.com/gptme/gptme/pull/2959) **(config)** tolerate PermissionError in ChatConfig.from_logdir workspace mkdir
- [gptme-contrib#1116](https://github.com/gptme/gptme-contrib/pull/1116) **(gptmail)** add pyyaml to declared dependencies
- [gptme-contrib#1117](https://github.com/gptme/gptme-contrib/pull/1117) **(gptmail)** add reply-once idempotency guard to agent reply
- [gptme-contrib#1119](https://github.com/gptme/gptme-contrib/pull/1119) **(gptmail)** reply-once for pull-based recipients (no duplicate replies)
- [gptme-contrib#1121](https://github.com/gptme/gptme-contrib/pull/1121) **(gptmail)** fix frontmatter split on dashes and add pull-only delivery type
- [gptme-contrib#1122](https://github.com/gptme/gptme-contrib/pull/1122) **(greptile)** lifetime total-trigger ceiling to stop infinite re-trigger spam
- [gptme-contrib#1126](https://github.com/gptme/gptme-contrib/pull/1126) **(tooloutput-trimmer)** run summarizer first (priority 199 → 202)
- [gptme-contrib#1129](https://github.com/gptme/gptme-contrib/pull/1129) **(gptmail)** tighten fleet pending recipient filtering
- [gptme-contrib#1134](https://github.com/gptme/gptme-contrib/pull/1134) **(gptme-usage)** mark Agent SDK credit change as paused
- [gptme-contrib#1135](https://github.com/gptme/gptme-contrib/pull/1135) **(lessons)** restore hook skill routing metadata
- [gptme-contrib#1136](https://github.com/gptme/gptme-contrib/pull/1136) **(pm-bandit)** add fcntl locking to record_outcome to prevent lost updates
- [gptme-contrib#1137](https://github.com/gptme/gptme-contrib/pull/1137) **(match-lessons)** default harness to 'gptme' when no env vars set
- [gptme-contrib#1138](https://github.com/gptme/gptme-contrib/pull/1138) **(match-lessons)** skip node_modules and tool dirs during lesson scan
- [gptme-contrib#1139](https://github.com/gptme/gptme-contrib/pull/1139) **(gptmail)** stamp read: true on pull-fetched msgs with no read: key
- [gptme-contrib#1140](https://github.com/gptme/gptme-contrib/pull/1140) **(gptmail)** agent read command now marks message read
- [gptme-contrib#1141](https://github.com/gptme/gptme-contrib/pull/1141) **(pm)** per-check slot key for concurrent master-CI failures
- [gptme-contrib#1142](https://github.com/gptme/gptme-contrib/pull/1142) **(evolution)** mkdir parents before saving history/refinements with slashed lesson IDs
- [gptme-contrib#1143](https://github.com/gptme/gptme-contrib/pull/1143) **(lessons)** remove 8 dead keywords from 4 active lessons
- [gptme-contrib#1144](https://github.com/gptme/gptme-contrib/pull/1144) **(lessons)** remove 20 dead keywords from 5 active lessons
- [gptme-contrib#1146](https://github.com/gptme/gptme-contrib/pull/1146) **(lessons)** remove 9 dead keywords from 9 active lessons
- [gptme-contrib#1147](https://github.com/gptme/gptme-contrib/pull/1147) **(tests)** remove spurious @patch decorator leaking MagicMock/ to workspace root
- [gptme-contrib#1148](https://github.com/gptme/gptme-contrib/pull/1148) **(lessons)** replace dead keywords with more specific trigger phrases
- [gptme-contrib#1149](https://github.com/gptme/gptme-contrib/pull/1149) **(perplexity)** use current sonar model; extract citations
- [gptme-contrib#1152](https://github.com/gptme/gptme-contrib/pull/1152) **(check-claude-usage)** support CC v2.1.183 section-header TUI format
- [gptme-contrib#1155](https://github.com/gptme/gptme-contrib/pull/1155) **(gptme-runloops)** resolve 10 mypy type errors in pm_dispatch

## Performance

- [gptme#2934](https://github.com/gptme/gptme/pull/2934) **(server)** partial cache update on message POST to avoid O(N) rescan

## Refactors

- [gptme-contrib#1150](https://github.com/gptme/gptme-contrib/pull/1150) **(lessons-extras)** extract NON_LESSON_FILES constant

## Documentation

- [gptme#2955](https://github.com/gptme/gptme/pull/2955) **(config)** add model selection guide and provider-key reference

## Tests

- [gptme#2937](https://github.com/gptme/gptme/pull/2937) **(server)** perf gate for GET /api/v2/conversations with 100 conversations
- [gptme-contrib#1132](https://github.com/gptme/gptme-contrib/pull/1132) **(gptme-usage)** add coverage for resolve_cc_version and is_post_agent_sdk_credit_change

## CI & Infrastructure

- [gptme#2909](https://github.com/gptme/gptme/pull/2909) **(deps)** bump actions/upload-artifact from 4 to 7
- [gptme#2927](https://github.com/gptme/gptme/pull/2927) **(deps)** bump the python-minor-patch group with 31 updates
- [gptme#2928](https://github.com/gptme/gptme/pull/2928) **(deps-dev)** bump pytest-cov from 6.0.0 to 7.1.0
- [gptme#2929](https://github.com/gptme/gptme/pull/2929) **(deps)** bump flask-cors from 5.0.0 to 6.0.5
- [gptme#2930](https://github.com/gptme/gptme/pull/2930) **(deps-dev)** bump pylint from 3.3.2 to 4.0.6

## Other Changes

- [gptme-contrib#1124](https://github.com/gptme/gptme-contrib/pull/1124)  [codex] add reusable autonomous session gate

---

*84 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
