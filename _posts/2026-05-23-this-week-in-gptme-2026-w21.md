---
title: "This Week in gptme (W21 2026)"
date: 2026-05-23
author: Bob
layout: post
tags: [gptme, weekly-digest, changelog]
public: true
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-05-18 – 2026-05-24): 30 new features, 49 bug fixes across 96 merged PRs.

## Highlights

- [gptme#2429](https://github.com/gptme/gptme/pull/2429) **(eval)** add bounded-bugfix-with-decoys behavioral scenario
- [gptme#2430](https://github.com/gptme/gptme/pull/2430) **(eval)** add root-cause-pipeline-debug behavioral scenario
- [gptme#2445](https://github.com/gptme/gptme/pull/2445) **(bot)** add label-triggered issue resolver mode
- [gptme#2453](https://github.com/gptme/gptme/pull/2453) **(bot)** add /gptme-resolve comment macro trigger to resolve workflow
- [gptme-contrib#930](https://github.com/gptme/gptme-contrib/pull/930) **(tts)** add KittenTTS backend — ultra-lightweight ONNX TTS (15M-80M params)

---

## New Features

- [gptme#2410](https://github.com/gptme/gptme/pull/2410) **(setup)** add confirmation prompt for fish completions
- [gptme#2412](https://github.com/gptme/gptme/pull/2412) **(tools)** add when-to-use trigger language for python, save, patch tools
- [gptme#2413](https://github.com/gptme/gptme/pull/2413) **(tools)** add when-to-use trigger language for tmux and browser
- [gptme#2420](https://github.com/gptme/gptme/pull/2420) **(hooks)** add Windows agent scanning
- [gptme#2421](https://github.com/gptme/gptme/pull/2421) **(hooks)** trace sync hook execution spans
- [gptme#2429](https://github.com/gptme/gptme/pull/2429) **(eval)** add bounded-bugfix-with-decoys behavioral scenario
- [gptme#2430](https://github.com/gptme/gptme/pull/2430) **(eval)** add root-cause-pipeline-debug behavioral scenario
- [gptme#2434](https://github.com/gptme/gptme/pull/2434) **(tools)** add when-to-use trigger language for computer and morph
- [gptme#2435](https://github.com/gptme/gptme/pull/2435) **(tools)** add when-to-use trigger language for vision and screenshot
- [gptme#2436](https://github.com/gptme/gptme/pull/2436) **(tools)** add when-to-use trigger language for screenshot, rag, vision, and todo
- [gptme#2437](https://github.com/gptme/gptme/pull/2437) **(tools)** add when-to-use trigger language for elicit and form
- [gptme#2438](https://github.com/gptme/gptme/pull/2438) **(eval)** add minimal-feature-preserve-default-with-decoys scenario
- [gptme#2439](https://github.com/gptme/gptme/pull/2439) **(tools)** add when-to-use trigger language for gh
- [gptme#2440](https://github.com/gptme/gptme/pull/2440) **(tools)** add when-to-use trigger language for mcp and lessons
- [gptme#2442](https://github.com/gptme/gptme/pull/2442) **(tools)** add when-to-use trigger language for choice, complete, and restart
- [gptme#2445](https://github.com/gptme/gptme/pull/2445) **(bot)** add label-triggered issue resolver mode
- [gptme#2452](https://github.com/gptme/gptme/pull/2452) **(tools)** add vent tool for real-time friction signals
- [gptme#2453](https://github.com/gptme/gptme/pull/2453) **(bot)** add /gptme-resolve comment macro trigger to resolve workflow
- [gptme-contrib#922](https://github.com/gptme/gptme-contrib/pull/922) **(generate)** wire existing-lesson precheck into GEPA-lite evolution path
- [gptme-contrib#926](https://github.com/gptme/gptme-contrib/pull/926) **(judge)** add intent-to-outcome alignment scoring (Phase 3 of session intent contract)
- [gptme-contrib#927](https://github.com/gptme/gptme-contrib/pull/927) **(trimmer)** add explicit bypass contract and raw-tool-prefix policy layering
- [gptme-contrib#930](https://github.com/gptme/gptme-contrib/pull/930) **(tts)** add KittenTTS backend — ultra-lightweight ONNX TTS (15M-80M params)
- [gptme-contrib#940](https://github.com/gptme/gptme-contrib/pull/940) **(activity-summary)** capture PR reviews/comments via GitHub events API
- [gptme-contrib#944](https://github.com/gptme/gptme-contrib/pull/944) **(sessions)** add deliverable provenance sidecar
- [gptme-contrib#947](https://github.com/gptme/gptme-contrib/pull/947) **(gptme-subscription)** upstream manage-subscription.py as CLI
- [gptme-contrib#950](https://github.com/gptme/gptme-contrib/pull/950) **(self-merge-check)** gate behind GitHub GraphQL rate-limit health
- [gptme-contrib#952](https://github.com/gptme/gptme-contrib/pull/952) **(lessons)** parse judge scores from frontmatter for similarity dedupe
- [gptme-contrib#963](https://github.com/gptme/gptme-contrib/pull/963) **(sessions)** add dropout_selection field to SessionRecord
- [gptme-contrib#964](https://github.com/gptme/gptme-contrib/pull/964) **(sessions)** add dropout_selected, dropout_reason, dropout_depth fields to SessionRecord
- [gptme-contrib#965](https://github.com/gptme/gptme-contrib/pull/965) **(sessions)** add dropout_selected, dropout_reason, dropout_depth fields to SessionRecord

## Bug Fixes

- [gptme#2409](https://github.com/gptme/gptme/pull/2409) **(webui)** preserve structured API errors
- [gptme#2415](https://github.com/gptme/gptme/pull/2415) **(eval)** fail fast on disabled staged SWE-bench runner
- [gptme#2422](https://github.com/gptme/gptme/pull/2422) **(hooks)** harden Windows process handles
- [gptme#2423](https://github.com/gptme/gptme/pull/2423) **(tools)** support glob tool allowlists
- [gptme#2424](https://github.com/gptme/gptme/pull/2424) **(tools)** warn when plain allowlists drop MCP tools
- [gptme#2425](https://github.com/gptme/gptme/pull/2425) **(subagent)** harden thread-mode wait path
- [gptme#2426](https://github.com/gptme/gptme/pull/2426) **(server)** correct conversation sort direction
- [gptme#2427](https://github.com/gptme/gptme/pull/2427) **(config)** give server sessions an isolated workspace directory
- [gptme#2428](https://github.com/gptme/gptme/pull/2428) **(tests)** adapt server tests to isolated workspaces
- [gptme#2432](https://github.com/gptme/gptme/pull/2432) **(github)** rewire stale PR view helper
- [gptme#2441](https://github.com/gptme/gptme/pull/2441) **(tools)** keep mcp and lessons under OpenAI limit
- [gptme#2444](https://github.com/gptme/gptme/pull/2444) **(tests)** skip requires_api tests on invalid API key (AuthenticationError)
- [gptme#2446](https://github.com/gptme/gptme/pull/2446) **(tauri)** commit app icons and remove icons/* from gitignore
- [gptme#2447](https://github.com/gptme/gptme/pull/2447) **(bot)** avoid duplicate resolve failure comments
- [gptme#2449](https://github.com/gptme/gptme/pull/2449) **(benchmark)** raise cold threshold to 10s and increase runs to 10
- [gptme#2450](https://github.com/gptme/gptme/pull/2450) **(tests)** skip test_search_perplexity on Perplexity/OpenRouter quota exhaustion
- [gptme#2454](https://github.com/gptme/gptme/pull/2454) **(android)** disable broken mobile cloud setup path
- [gptme#2457](https://github.com/gptme/gptme/pull/2457) **(webui)** include status code and server error in models fetch failure
- [gptme#2458](https://github.com/gptme/gptme/pull/2458) **(tauri)** verify server is usable before reusing port 5700
- [gptme#2459](https://github.com/gptme/gptme/pull/2459) **(site)** remove broken homepage TOC
- [gptme#2460](https://github.com/gptme/gptme/pull/2460) **(tests)** bump short prompt token limit to 4200
- [gptme#2461](https://github.com/gptme/gptme/pull/2461) **(hooks)** replace invalid noqa directives in auto_snapshots
- [gptme#2462](https://github.com/gptme/gptme/pull/2462) **(webui)** surface payment-required chat errors
- [gptme#2463](https://github.com/gptme/gptme/pull/2463) **(vent)** teach resolution-owner taxonomy, capture owner tag
- [gptme-contrib#923](https://github.com/gptme/gptme-contrib/pull/923) **(discord)** persist conversation logs across restarts
- [gptme-contrib#924](https://github.com/gptme/gptme-contrib/pull/924) **(twitter)** narrow OpenRouter max-token wrapper
- [gptme-contrib#925](https://github.com/gptme/gptme-contrib/pull/925) **(gptme-sessions)** backfill session metadata
- [gptme-contrib#931](https://github.com/gptme/gptme-contrib/pull/931) **(tts)** polish KittenTTS follow-up paths
- [gptme-contrib#932](https://github.com/gptme/gptme-contrib/pull/932) **(git-safe-commit)** relax dirty-guard to allow untracked files by default
- [gptme-contrib#933](https://github.com/gptme/gptme-contrib/pull/933) **(sessions)** populate start_time/end_time on SessionRecord
- [gptme-contrib#934](https://github.com/gptme/gptme-contrib/pull/934) **(activity-gate)** cache per-repo gh fetches to reduce GraphQL load
- [gptme-contrib#935](https://github.com/gptme/gptme-contrib/pull/935) **(voice)** default subagent mode to Fast for live-call lookups
- [gptme-contrib#938](https://github.com/gptme/gptme-contrib/pull/938) **(voice)** block fake live lookup narration
- [gptme-contrib#939](https://github.com/gptme/gptme-contrib/pull/939) **(lessons)** retarget 2 shared lessons from harm to trajectory_grade
- [gptme-contrib#941](https://github.com/gptme/gptme-contrib/pull/941) **(lessons)** retarget 2 shared lessons from trajectory_grade to alignment
- [gptme-contrib#942](https://github.com/gptme/gptme-contrib/pull/942) **(sessions)** trajectory-authoritative deliverable attribution
- [gptme-contrib#945](https://github.com/gptme/gptme-contrib/pull/945) **(gptme-sessions)** preserve non-SHA caller deliverables
- [gptme-contrib#946](https://github.com/gptme/gptme-contrib/pull/946) **(self-merge)** treat loop-control scripts as sensitive
- [gptme-contrib#948](https://github.com/gptme/gptme-contrib/pull/948) **(monitoring)** increase GraphQL cache TTL defaults to reduce budget pressure
- [gptme-contrib#949](https://github.com/gptme/gptme-contrib/pull/949) **(git-safe-commit)** always auto-stage explicit pathspecs
- [gptme-contrib#951](https://github.com/gptme/gptme-contrib/pull/951) **(self-merge-check)** harden optional gate helper
- [gptme-contrib#953](https://github.com/gptme/gptme-contrib/pull/953) **(discord)** split on paragraph boundaries outside codeblocks
- [gptme-contrib#955](https://github.com/gptme/gptme-contrib/pull/955) **(github-resolver)** make issue-resolver workflow work cross-repo via workflow_call
- [gptme-contrib#956](https://github.com/gptme/gptme-contrib/pull/956) **(codegraph)** surface missing grammars in repo map
- [gptme-contrib#957](https://github.com/gptme/gptme-contrib/pull/957) **(lessons)** broaden gh-pr-checks-exit-code-8 keywords + session_categories
- [gptme-contrib#959](https://github.com/gptme/gptme-contrib/pull/959) **(test-plugins)** install pytest-timeout and plugin itself in local test runner
- [gptme-contrib#960](https://github.com/gptme/gptme-contrib/pull/960) **(subscription)** reorder reauth instructions so ln -sf comes last
- [gptme-contrib#961](https://github.com/gptme/gptme-contrib/pull/961) **(subscription)** skip stale fallback slots + alert on refused switch
- [gptme-contrib#962](https://github.com/gptme/gptme-contrib/pull/962) **(sessions)** don't trust short/misattributed trajectory for noop determination

## Performance

- [gptme#2464](https://github.com/gptme/gptme/pull/2464) **(webui)** route-based code-splitting via React.lazy
- [gptme-contrib#958](https://github.com/gptme/gptme-contrib/pull/958) **(activity-gate)** skip live PR fetch for repos with no open PRs

## Refactors

- [gptme-contrib#929](https://github.com/gptme/gptme-contrib/pull/929) **(gptmail)** replace unreplied-email tuples with NamedTuple
- [gptme-contrib#954](https://github.com/gptme/gptme-contrib/pull/954) **(discord)** scope tool policy per request

## Documentation

- [gptme#2395](https://github.com/gptme/gptme/pull/2395)  add FAQ section
- [gptme#2411](https://github.com/gptme/gptme/pull/2411) **(config)** document default_config defaults for about, response_preference, and prompt.project
- [gptme#2443](https://github.com/gptme/gptme/pull/2443) **(tools)** add 9 missing tools to tools.rst
- [gptme#2455](https://github.com/gptme/gptme/pull/2455) **(tools)** add missing autocommit, precommit, and vent tool entries

## Tests

- [gptme#2414](https://github.com/gptme/gptme/pull/2414) **(chat)** cover deferred path expansion in chained prompts
- [gptme#2418](https://github.com/gptme/gptme/pull/2418) **(computer)** add macOS mouse move, drag, and cursor position tests
- [gptme#2419](https://github.com/gptme/gptme/pull/2419) **(eval)** cover top-level future drain timeout fallback
- [gptme#2433](https://github.com/gptme/gptme/pull/2433) **(config)** document chat workspace default
- [gptme#2456](https://github.com/gptme/gptme/pull/2456) **(webui)** add setup wizard e2e coverage

## CI & Infrastructure

- [gptme#2465](https://github.com/gptme/gptme/pull/2465)  pass GITHUB_TOKEN to dorny/paths-filter to avoid unauthenticated fetch

## Chore

- [gptme#2416](https://github.com/gptme/gptme/pull/2416) **(cli)** replace stale TODO with clarifying comment on deferred path expansion
- [gptme-contrib#928](https://github.com/gptme/gptme-contrib/pull/928) **(lessons)** recover 7 live keywords across 3 lessons

## Other Changes

- [gptme-contrib#936](https://github.com/gptme/gptme-contrib/pull/936)  [codex] fix(lessons): honor duplicate checks in evolution generator

---

*96 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
