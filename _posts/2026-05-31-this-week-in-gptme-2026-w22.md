---
title: This Week in gptme (W22 2026)
date: 2026-05-31
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
description: 'gptme W22 2026: artifact registry, webui bundling, eval trajectory checks,
  and 102 bug fixes across 142 PRs'
public: true
excerpt: 'gptme W22 2026: artifact registry, webui bundling, eval trajectory checks,
  and 102 bug fixes across 142 PRs'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-05-25 – 2026-05-31): 35 new features, 102 bug fixes across 142 merged PRs.

## Highlights

- [gptme#2585](https://github.com/gptme/gptme/pull/2585) **(eval)** add subagent trajectory checks
- [gptme#2593](https://github.com/gptme/gptme/pull/2593) **(eval)** check subagent waited for completion before stating result
- [gptme#2614](https://github.com/gptme/gptme/pull/2614) **(server)** add --webui-dir flag to serve a custom web UI build
- [gptme#2633](https://github.com/gptme/gptme/pull/2633) **(server)** bundle modern webui into package (gptme#2612 Part 2)
- [gptme#2637](https://github.com/gptme/gptme/pull/2637) **(webui)** add artifacts sidebar panel and registry

---

## New Features

- [gptme#2549](https://github.com/gptme/gptme/pull/2549) **(auth)** retarget device flow from fleet-operator to Supabase edge fn
- [gptme#2570](https://github.com/gptme/gptme/pull/2570) **(browser)** support connecting over CDP
- [gptme#2572](https://github.com/gptme/gptme/pull/2572) **(hooks)** add turn.pre and aw watcher consumer
- [gptme#2585](https://github.com/gptme/gptme/pull/2585) **(eval)** add subagent trajectory checks
- [gptme#2592](https://github.com/gptme/gptme/pull/2592) **(install)** add gptme.ai/install.sh one-liner installer
- [gptme#2593](https://github.com/gptme/gptme/pull/2593) **(eval)** check subagent waited for completion before stating result
- [gptme#2598](https://github.com/gptme/gptme/pull/2598) **(eval-ci)** expand quality gate from 3 to 5 tests
- [gptme#2599](https://github.com/gptme/gptme/pull/2599) **(cli)** prompt inline gptme auth on first use
- [gptme#2601](https://github.com/gptme/gptme/pull/2601) **(cli)** list dynamic models for gptme provider
- [gptme#2603](https://github.com/gptme/gptme/pull/2603) **(llm)** add gptme.ai as provider alias for gptme
- [gptme#2604](https://github.com/gptme/gptme/pull/2604) **(lessons)** load manifest-backed skills lazily from index.json
- [gptme#2614](https://github.com/gptme/gptme/pull/2614) **(server)** add --webui-dir flag to serve a custom web UI build
- [gptme#2617](https://github.com/gptme/gptme/pull/2617) **(llm)** add Claude Opus 4.8 model support
- [gptme#2622](https://github.com/gptme/gptme/pull/2622) **(hooks)** emit aw-watcher tool activity heartbeats
- [gptme#2629](https://github.com/gptme/gptme/pull/2629) **(models)** add DeepSeek V4 Pro/Flash/Flash:free via OpenRouter
- [gptme#2632](https://github.com/gptme/gptme/pull/2632) **(cli)** add gptme init command for project scaffolding
- [gptme#2633](https://github.com/gptme/gptme/pull/2633) **(server)** bundle modern webui into package (gptme#2612 Part 2)
- [gptme#2634](https://github.com/gptme/gptme/pull/2634) **(tools)** add atomic patch_many tool
- [gptme#2636](https://github.com/gptme/gptme/pull/2636) **(server)** add conversation artifact registry API (#830 Phase 1)
- [gptme#2637](https://github.com/gptme/gptme/pull/2637) **(webui)** add artifacts sidebar panel and registry
- [gptme#2638](https://github.com/gptme/gptme/pull/2638) **(server)** consume tool-declared artifact descriptors from message metadata (#830 Phase 2)
- [gptme#2639](https://github.com/gptme/gptme/pull/2639) **(tools/computer)** emit artifact descriptors on screenshot (#830 Phase 2 producers)
- [gptme#2640](https://github.com/gptme/gptme/pull/2640) **(webui)** sandboxed iframe panel primitive (#830 Phase 3)
- [gptme#2641](https://github.com/gptme/gptme/pull/2641) **(webui)** wire panel_hints into sidebar as iframe panels (#830 Phase 3b)
- [gptme#2643](https://github.com/gptme/gptme/pull/2643) **(webui)** conversation-level session cost summary
- [gptme#2646](https://github.com/gptme/gptme/pull/2646) **(webui)** add per-conversation cost badge to ConversationList
- [gptme#2647](https://github.com/gptme/gptme/pull/2647) **(llm)** add Anthropic fast-mode (speed=fast) support
- [gptme-contrib#984](https://github.com/gptme/gptme-contrib/pull/984) **(gptme-sessions)** add replay command
- [gptme-contrib#996](https://github.com/gptme/gptme-contrib/pull/996) **(sessions)** extract span_aggregates for codex trajectories
- [gptme-contrib#1006](https://github.com/gptme/gptme-contrib/pull/1006) **(context)** add repo-map.py — portable repo-map generation via gptme-codegraph
- [gptme-contrib#1007](https://github.com/gptme/gptme-contrib/pull/1007) **(aw-watcher-agent)** Codex log-tailer for per-tool activity heartbeats
- [gptme-contrib#1009](https://github.com/gptme/gptme-contrib/pull/1009) **(aw-watcher-agent)** add emit-activity command
- [gptme-contrib#1012](https://github.com/gptme/gptme-contrib/pull/1012) **(codegraph)** add committed repo-map artifact CLI
- [gptme-contrib#1013](https://github.com/gptme/gptme-contrib/pull/1013) **(sessions)** add regex-based LLM smell detector
- [gptme-contrib#1025](https://github.com/gptme/gptme-contrib/pull/1025) **(codegraph)** extract call graph from Rust function bodies

## Bug Fixes

- [gptme#2535](https://github.com/gptme/gptme/pull/2535) **(server)** reject non-string step models
- [gptme#2536](https://github.com/gptme/gptme/pull/2536) **(cli)** reject unsafe /fork conversation ids
- [gptme#2537](https://github.com/gptme/gptme/pull/2537) **(cli)** keep json-mode logs off stdout
- [gptme#2538](https://github.com/gptme/gptme/pull/2538) **(server)** reject invalid chat config path types
- [gptme#2539](https://github.com/gptme/gptme/pull/2539) **(cli)** reject unsafe /fork names
- [gptme#2540](https://github.com/gptme/gptme/pull/2540) **(cli)** remove dead logdirs on startup validation
- [gptme#2541](https://github.com/gptme/gptme/pull/2541) **(server)** reject non-string elicit ids
- [gptme#2542](https://github.com/gptme/gptme/pull/2542) **(cli)** accept -t=value tool syntax
- [gptme#2543](https://github.com/gptme/gptme/pull/2543) **(cli)** keep slash commands on json rail
- [gptme#2544](https://github.com/gptme/gptme/pull/2544) **(cli)** avoid full conversation scans on resume
- [gptme#2545](https://github.com/gptme/gptme/pull/2545) **(server)** reject non-string session ids
- [gptme#2548](https://github.com/gptme/gptme/pull/2548) **(cli)** allow --output-format json after headless auto-switch
- [gptme#2550](https://github.com/gptme/gptme/pull/2550) **(telemetry)** honor OTEL_EXPORTER_OTLP_TIMEOUT for export and flush
- [gptme#2551](https://github.com/gptme/gptme/pull/2551) **(webui)** render a NotFound page for unmatched client-side routes
- [gptme#2552](https://github.com/gptme/gptme/pull/2552) **(logmanager)** clamp over-large conversation limit to avoid islice crash
- [gptme#2554](https://github.com/gptme/gptme/pull/2554) **(cli)** preserve custom tool file allowlists
- [gptme#2555](https://github.com/gptme/gptme/pull/2555) **(cli)** validate architect/editor model names with clean usage error
- [gptme#2556](https://github.com/gptme/gptme/pull/2556) **(server)** reject null bytes in conversation IDs and branch names
- [gptme#2558](https://github.com/gptme/gptme/pull/2558) **(models)** dedup 'Unknown model' warning via log_warn_once
- [gptme#2559](https://github.com/gptme/gptme/pull/2559) **(json)** keep runtime stdout pure in JSON mode
- [gptme#2560](https://github.com/gptme/gptme/pull/2560) **(webui)** retire dead cloud preset URL
- [gptme#2561](https://github.com/gptme/gptme/pull/2561) **(cli)** scope unnamed resume to workspace
- [gptme#2562](https://github.com/gptme/gptme/pull/2562) **(server)** reject malformed JSON before field validation
- [gptme#2563](https://github.com/gptme/gptme/pull/2563) **(cli)** reject missing explicit path prompts early
- [gptme#2564](https://github.com/gptme/gptme/pull/2564) **(server)** reject malformed project_config sections
- [gptme#2565](https://github.com/gptme/gptme/pull/2565) **(cli)** scope implicit resume to cwd workspace
- [gptme#2566](https://github.com/gptme/gptme/pull/2566) **(cli)** validate custom tool paths before startup
- [gptme#2567](https://github.com/gptme/gptme/pull/2567) **(cli)** keep unknown profile errors off stdout
- [gptme#2568](https://github.com/gptme/gptme/pull/2568) **(webui)** skip hosted loopback auto-connect
- [gptme#2569](https://github.com/gptme/gptme/pull/2569) **(cli)** reject missing path args before prompt merge
- [gptme#2571](https://github.com/gptme/gptme/pull/2571) **(cli)** reject malformed --output-schema with a usage error
- [gptme#2573](https://github.com/gptme/gptme/pull/2573) **(hooks)** tolerate session-end trigger kwargs
- [gptme#2574](https://github.com/gptme/gptme/pull/2574) **(server)** reject non-string conversation prompt
- [gptme#2575](https://github.com/gptme/gptme/pull/2575) **(cli)** raise UsageError for unknown model in llm generate
- [gptme#2576](https://github.com/gptme/gptme/pull/2576) **(server)** correct upload path field description and add upload tests
- [gptme#2577](https://github.com/gptme/gptme/pull/2577) **(cli)** raise UsageError for empty --model string
- [gptme#2578](https://github.com/gptme/gptme/pull/2578) **(util-cli)** prepend system message in llm generate
- [gptme#2579](https://github.com/gptme/gptme/pull/2579) **(server)** reject invalid message tool allowlists
- [gptme#2580](https://github.com/gptme/gptme/pull/2580) **(util-cli)** keep tools info JSON machine-readable
- [gptme#2581](https://github.com/gptme/gptme/pull/2581) **(server)** reject whitespace-only upload filenames; return 404 for nonexistent workspace subpaths
- [gptme#2582](https://github.com/gptme/gptme/pull/2582) **(server)** propagate ContextVars into background threads
- [gptme#2583](https://github.com/gptme/gptme/pull/2583) **(server)** reject non-string transcript call_sid
- [gptme#2584](https://github.com/gptme/gptme/pull/2584) **(cli)** reject whitespace-only prompts in non-interactive mode
- [gptme#2587](https://github.com/gptme/gptme/pull/2587) **(server)** return 'Branch not found' when POST targets a non-existent branch
- [gptme#2589](https://github.com/gptme/gptme/pull/2589) **(cli)** reject whitespace-only conversation names
- [gptme#2590](https://github.com/gptme/gptme/pull/2590) **(server)** block /edit command in server mode
- [gptme#2591](https://github.com/gptme/gptme/pull/2591) **(hooks)** never crash gptme-util hooks run on malformed CC event JSON
- [gptme#2594](https://github.com/gptme/gptme/pull/2594) **(cli)** expand tilde in --workspace paths
- [gptme#2595](https://github.com/gptme/gptme/pull/2595) **(server)** validate tools field type before calling init_tools
- [gptme#2596](https://github.com/gptme/gptme/pull/2596) **(cli)** reject shell-hostile conversation names
- [gptme#2597](https://github.com/gptme/gptme/pull/2597) **(server)** validate config patch tool allowlist
- [gptme#2600](https://github.com/gptme/gptme/pull/2600) **(install)** error on missing TTY instead of silently assuming yes
- [gptme#2605](https://github.com/gptme/gptme/pull/2605) **(llm)** stop tool-format streams without newline
- [gptme#2606](https://github.com/gptme/gptme/pull/2606) **(autocompact)** preserve tool-call messages
- [gptme#2607](https://github.com/gptme/gptme/pull/2607) **(cli)** suppress resume hint after fatal exit
- [gptme#2608](https://github.com/gptme/gptme/pull/2608) **(server)** validate stream and tool-confirm action inputs
- [gptme#2609](https://github.com/gptme/gptme/pull/2609) **(webui)** cross-tab sync for server registry after cloud sign-in
- [gptme#2610](https://github.com/gptme/gptme/pull/2610) **(webui)** refresh stale fallback model to claude-sonnet-4-6
- [gptme#2615](https://github.com/gptme/gptme/pull/2615) **(webui)** hint when hosted chat hits loopback without CORS
- [gptme#2619](https://github.com/gptme/gptme/pull/2619) **(server)** avoid full JSONL scan in agents listing endpoint
- [gptme#2623](https://github.com/gptme/gptme/pull/2623) **(webui)** tag loopback requests correctly
- [gptme#2624](https://github.com/gptme/gptme/pull/2624) **(webui)** handle cloud auth postMessage handoff from popup
- [gptme#2625](https://github.com/gptme/gptme/pull/2625) **(computer)** handle missing/timed-out ImageMagick convert in screenshot resize
- [gptme#2627](https://github.com/gptme/gptme/pull/2627) **(test)** use CliRunner instead of subprocess in TestModelsInfo to prevent CI timeouts
- [gptme#2628](https://github.com/gptme/gptme/pull/2628) **(util-cli)** reject empty --model in llm generate
- [gptme#2630](https://github.com/gptme/gptme/pull/2630) **(server)** strip whitespace from session_id before emptiness check
- [gptme#2635](https://github.com/gptme/gptme/pull/2635) **(server)** emit Access-Control-Allow-Private-Network on CORS preflight
- [gptme#2642](https://github.com/gptme/gptme/pull/2642) **(cli)** clearer error when calling execute-only tools via 'tools call'
- [gptme#2644](https://github.com/gptme/gptme/pull/2644) **(release)** vendor build_changelog.py, add dry-run PyPI publish validation
- [gptme#2648](https://github.com/gptme/gptme/pull/2648) **(release)** verify artifact build workflows actually started
- [gptme-contrib#981](https://github.com/gptme/gptme-contrib/pull/981) **(twitter)** block dead blog links before posting
- [gptme-contrib#983](https://github.com/gptme/gptme-contrib/pull/983) **(gptmail)** support recipient aliases
- [gptme-contrib#985](https://github.com/gptme/gptme-contrib/pull/985) **(subscription)** protect manual --switch with a hold
- [gptme-contrib#986](https://github.com/gptme/gptme-contrib/pull/986) **(voice)** surface subagent timeouts clearly, filter SIGPIPE shell noise
- [gptme-contrib#987](https://github.com/gptme/gptme-contrib/pull/987) **(gptodo)** accept date-only created field in task validation
- [gptme-contrib#988](https://github.com/gptme/gptme-contrib/pull/988) **(twitter)** add placeholder guard to prevent literal placeholder text in posts
- [gptme-contrib#989](https://github.com/gptme/gptme-contrib/pull/989) **(twitter)** preserve workspace persona in reply prompt
- [gptme-contrib#990](https://github.com/gptme/gptme-contrib/pull/990) **(resolver)** route provider key by prefix, not hardcoded OPENAI_API_KEY
- [gptme-contrib#991](https://github.com/gptme/gptme-contrib/pull/991) **(gptmail)** make completion-status CLI read from the conversation tracker
- [gptme-contrib#992](https://github.com/gptme/gptme-contrib/pull/992) **(project-monitoring)** serialize should_post_comment with flock to prevent duplicate comments
- [gptme-contrib#993](https://github.com/gptme/gptme-contrib/pull/993) **(resolver)** stage helper checkout inside workspace first
- [gptme-contrib#994](https://github.com/gptme/gptme-contrib/pull/994) **(resolver)** harden branch safety and strip agent creds
- [gptme-contrib#995](https://github.com/gptme/gptme-contrib/pull/995) **(news)** drop empty keywords in trending --filter parsing
- [gptme-contrib#997](https://github.com/gptme/gptme-contrib/pull/997) **(sessions)** merge codex trajectory_ref sidecar into SessionRecord before span aggregation
- [gptme-contrib#999](https://github.com/gptme/gptme-contrib/pull/999) **(resolver)** restore job.workflow_sha for cross-repo reusable workflow
- [gptme-contrib#1000](https://github.com/gptme/gptme-contrib/pull/1000) **(resolver)** install gptme with --prerelease=allow to support avatar field
- [gptme-contrib#1001](https://github.com/gptme/gptme-contrib/pull/1001) **(lessons)** expand avoid-deep-nesting keywords to match natural usage
- [gptme-contrib#1002](https://github.com/gptme/gptme-contrib/pull/1002) **(dashboard)** show "N of TOTAL" when summaries are capped
- [gptme-contrib#1003](https://github.com/gptme/gptme-contrib/pull/1003) **(twitter)** preserve content from legacy `tweet:` key drafts
- [gptme-contrib#1004](https://github.com/gptme/gptme-contrib/pull/1004) **(subscription)** make usage tracking robust across credential switches
- [gptme-contrib#1005](https://github.com/gptme/gptme-contrib/pull/1005) **(resolver)** lower gptme version floor to >=0.31.1.dev0
- [gptme-contrib#1011](https://github.com/gptme/gptme-contrib/pull/1011) **(rss)** report network failures as fetch errors, not parse errors
- [gptme-contrib#1014](https://github.com/gptme/gptme-contrib/pull/1014) **(codegraph)** pin committed repo-map directory to '.' for portability
- [gptme-contrib#1015](https://github.com/gptme/gptme-contrib/pull/1015) **(lessons)** remove 4 dead keywords (zero match in full trajectory window)
- [gptme-contrib#1016](https://github.com/gptme/gptme-contrib/pull/1016) **(resolver)** prompt model to validate patch success and retry on failure
- [gptme-contrib#1017](https://github.com/gptme/gptme-contrib/pull/1017) **(resolver)** require reading files before patching
- [gptme-contrib#1018](https://github.com/gptme/gptme-contrib/pull/1018) **(resolver)** reclassify status to error when all patch tools failed despite dirty worktree
- [gptme-contrib#1019](https://github.com/gptme/gptme-contrib/pull/1019) **(resolver)** use plain push for new branches, --force-with-lease for existing
- [gptme-contrib#1021](https://github.com/gptme/gptme-contrib/pull/1021) **(resolver)** don't treat every gh pr create failure as 'PR already exists'
- [gptme-contrib#1022](https://github.com/gptme/gptme-contrib/pull/1022) **(validation)** detect and validate SKILL.md files instead of flagging them as broken lessons
- [gptme-contrib#1023](https://github.com/gptme/gptme-contrib/pull/1023) **(resolver)** probe for existing PR explicitly instead of matching gh stderr
- [gptme-contrib#1026](https://github.com/gptme/gptme-contrib/pull/1026) **(sessions)** atomic write + corrupt-tail repair for store.append()

## Refactors

- [gptme-contrib#982](https://github.com/gptme/gptme-contrib/pull/982) **(twitter)** extract URL validator to shared url_utils module

## Documentation

- [gptme#2611](https://github.com/gptme/gptme/pull/2611) **(skills)** note Agent Skills open standard conformance
- [gptme#2616](https://github.com/gptme/gptme/pull/2616)  improve examples page with subsections and advanced workflows
- [gptme-contrib#980](https://github.com/gptme/gptme-contrib/pull/980) **(readme)** add gptme-codegraph to packages table
- [gptme-contrib#1010](https://github.com/gptme/gptme-contrib/pull/1010) **(codegraph)** add 'when to use' decision rule (codegraph vs grep vs semantic)

---

*142 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
