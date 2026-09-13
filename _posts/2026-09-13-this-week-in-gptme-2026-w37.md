---
title: This Week in gptme (W37 2026)
date: 2026-09-13
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-09-07 – 2026-09-13):
  29 new features, 68 bug fixes across 108 merged PRs.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-09-07 – 2026-09-13): 29 new features, 68 bug fixes across 108 merged PRs.

## Highlights

- [gptme#3767](https://github.com/gptme/gptme/pull/3767) **(server)** add /preview/{port}/ proxy for cloud port exposure (gptme-cloud#910)
- [gptme-contrib#1646](https://github.com/gptme/gptme-contrib/pull/1646) **(voice)** add workspace_search RAG tool for live recap queries
- [gptme#3733](https://github.com/gptme/gptme/pull/3733) **(tools)** add ToolSpec.read_only flag; auto-approve in cli_confirm_hook
- [gptme#3765](https://github.com/gptme/gptme/pull/3765) **(hooks)** add guardrail TOOL_CONFIRM hook for headless safety (#3598)
- [gptme-contrib#1645](https://github.com/gptme/gptme-contrib/pull/1645) **(sessions)** record reasoning_effort/reasoning_profile on session records

---

## New Features

- [gptme#3719](https://github.com/gptme/gptme/pull/3719) **(dataset)** trajectory-to-env pipeline for fine-tuning dataset construction
- [gptme#3733](https://github.com/gptme/gptme/pull/3733) **(tools)** add ToolSpec.read_only flag; auto-approve in cli_confirm_hook
- [gptme#3735](https://github.com/gptme/gptme/pull/3735) **(memory)** gptme.memory package + gptme-util memory CLI (layered roots, CC-compatible)
- [gptme#3740](https://github.com/gptme/gptme/pull/3740) **(memory)** add cross-harness lexical recall
- [gptme#3750](https://github.com/gptme/gptme/pull/3750) **(skills)** persist explicit invocation lifecycle evidence
- [gptme#3764](https://github.com/gptme/gptme/pull/3764) **(memory)** Codex/AGENTS.md integration for cross-harness memory
- [gptme#3765](https://github.com/gptme/gptme/pull/3765) **(hooks)** add guardrail TOOL_CONFIRM hook for headless safety (#3598)
- [gptme#3766](https://github.com/gptme/gptme/pull/3766) **(memory)** add supersession and audit commands
- [gptme#3767](https://github.com/gptme/gptme/pull/3767) **(server)** add /preview/{port}/ proxy for cloud port exposure (gptme-cloud#910)
- [gptme#3781](https://github.com/gptme/gptme/pull/3781) **(llm)** make reasoning effort controllable and observable for OpenAI-compatible providers
- [gptme#3782](https://github.com/gptme/gptme/pull/3782) **(config)** trust-on-first-use gate for project-level shell execution
- [gptme#3786](https://github.com/gptme/gptme/pull/3786) **(models)** generate recommended-model docs from code; add DeepSeek V4 Flash 0731, GLM 5.3 Flash, GPT-6 Astra, Grok 4.6; OpenRouter provider allowlists
- [gptme#3787](https://github.com/gptme/gptme/pull/3787) **(skills)** record server and TUI invocation outcomes
- [gptme#3789](https://github.com/gptme/gptme/pull/3789) **(memory)** use layered MemoryStore in workspace prompt
- [gptme#3791](https://github.com/gptme/gptme/pull/3791) **(memory)** persist always-on selection and byte budget
- [gptme#3792](https://github.com/gptme/gptme/pull/3792) **(memory)** preserve writer provenance through CLI metadata
- [gptme#3799](https://github.com/gptme/gptme/pull/3799) **(models)** add deepseek/deepseek-v4.1-flash
- [gptme-contrib#1613](https://github.com/gptme/gptme-contrib/pull/1613) **(gptme-sessions)** discover Claude Code sessions from archive roots
- [gptme-contrib#1615](https://github.com/gptme/gptme-contrib/pull/1615) **(gptme-sessions)** add extra_fields param to write_alignment_grade
- [gptme-contrib#1626](https://github.com/gptme/gptme-contrib/pull/1626) **(self-merge)** gptme core eligibility by diff shape, not path category
- [gptme-contrib#1627](https://github.com/gptme/gptme-contrib/pull/1627) **(greptile)** unanswered triggers don't burn the lifetime cap + post-recovery bonus
- [gptme-contrib#1628](https://github.com/gptme/gptme-contrib/pull/1628) **(self-merge)** contrib placement rule, segment-matched sensitive paths, spec-doc waiver
- [gptme-contrib#1632](https://github.com/gptme/gptme-contrib/pull/1632) **(gptmail)** add 'gptmail agent watch' reply monitor (closes #1631)
- [gptme-contrib#1633](https://github.com/gptme/gptme-contrib/pull/1633) **(self-merge)** waive AI-review abstention for safe gitlink bumps
- [gptme-contrib#1636](https://github.com/gptme/gptme-contrib/pull/1636) **(gptme-voice)** trace ASR, TTS first-audio, and utterance round-trip
- [gptme-contrib#1639](https://github.com/gptme/gptme-contrib/pull/1639) **(gptme-voice)** expose BodyAdapter machine-readable characteristics
- [gptme-contrib#1641](https://github.com/gptme/gptme-contrib/pull/1641) **(gptodo)** add draft state for in-progress plans
- [gptme-contrib#1645](https://github.com/gptme/gptme-contrib/pull/1645) **(sessions)** record reasoning_effort/reasoning_profile on session records
- [gptme-contrib#1646](https://github.com/gptme/gptme-contrib/pull/1646) **(voice)** add workspace_search RAG tool for live recap queries

## Bug Fixes

- [gptme#3703](https://github.com/gptme/gptme/pull/3703) **(codeblock)** skip depth-1 look-ahead for execution langs (shell, ipython)
- [gptme#3708](https://github.com/gptme/gptme/pull/3708) **(tools)** suppress duplicate terminal output for shell/IPython tools
- [gptme#3714](https://github.com/gptme/gptme/pull/3714) **(logmanager)** bound trajectory write amplification
- [gptme#3720](https://github.com/gptme/gptme/pull/3720) **(onboard)** detect OAuth subscription providers
- [gptme#3721](https://github.com/gptme/gptme/pull/3721)  decode editable install file URLs
- [gptme#3723](https://github.com/gptme/gptme/pull/3723) **(security)** upgrade cryptography and h2 in poetry.lock (5 CVEs)
- [gptme#3726](https://github.com/gptme/gptme/pull/3726) **(cli)** clean error on malformed `capabilities --from-json` snapshots
- [gptme#3727](https://github.com/gptme/gptme/pull/3727) **(security)** strip repo-local execution sinks from git inspection commands
- [gptme#3729](https://github.com/gptme/gptme/pull/3729) **(webui)** navigate before server response in new-chat flow
- [gptme#3730](https://github.com/gptme/gptme/pull/3730) **(codeblock)** carry quote state across lines; close exec-lang blocks in streaming
- [gptme#3731](https://github.com/gptme/gptme/pull/3731) **(review)** explain repository-relative reads in isolated sessions
- [gptme#3732](https://github.com/gptme/gptme/pull/3732) **(telemetry)** keep startup diagnostics out of JSON stdout
- [gptme#3738](https://github.com/gptme/gptme/pull/3738)  reduce lesson/hidden-message log spam in TUI
- [gptme#3739](https://github.com/gptme/gptme/pull/3739) **(webui)** suppress 'Cannot reach' banner while auto-connecting
- [gptme#3742](https://github.com/gptme/gptme/pull/3742) **(webui)** repair dead conversations-list invalidation after create/delete/import
- [gptme#3743](https://github.com/gptme/gptme/pull/3743) **(webui)** pre-set generating state on new-chat placeholder to collapse microsteps
- [gptme#3744](https://github.com/gptme/gptme/pull/3744) **(webui)** clear stop flag before edit/rerun/regenerate
- [gptme#3747](https://github.com/gptme/gptme/pull/3747) **(review-pr)** name the offending stdout line when JSONL parsing fails
- [gptme#3749](https://github.com/gptme/gptme/pull/3749) **(cli)** show 'gptme <cmd>' instead of 'gptme-util <cmd>' in error messages
- [gptme#3751](https://github.com/gptme/gptme/pull/3751) **(webui)** drop auth-code bootstrap gate before the connection probe
- [gptme#3752](https://github.com/gptme/gptme/pull/3752) **(cli)** render native tool calls as highlighted source
- [gptme#3753](https://github.com/gptme/gptme/pull/3753) **(webui)** stop event-stream banner from flashing on conversation open
- [gptme#3754](https://github.com/gptme/gptme/pull/3754) **(webui)** only show demo content in explicit demo mode, not on connect
- [gptme#3761](https://github.com/gptme/gptme/pull/3761) **(shell)** bound denylist matches to argument tokens
- [gptme#3762](https://github.com/gptme/gptme/pull/3762) **(cli)** skip root scans and keep path inclusion interruptible
- [gptme#3763](https://github.com/gptme/gptme/pull/3763) **(cli)** reject ambiguous positional resume IDs
- [gptme#3768](https://github.com/gptme/gptme/pull/3768) **(webui)** use Bookmark icon for set-default (not Star — fixes confusion with favorites)
- [gptme#3769](https://github.com/gptme/gptme/pull/3769) **(shell)** use poll() in _run_with_tty reader (#3715)
- [gptme#3770](https://github.com/gptme/gptme/pull/3770) **(shell)** use poll() in background job reader (#3715)
- [gptme#3771](https://github.com/gptme/gptme/pull/3771) **(acp)** attach host-supplied MCP servers to sessions
- [gptme#3772](https://github.com/gptme/gptme/pull/3772) **(memory)** reject reserved index names
- [gptme#3773](https://github.com/gptme/gptme/pull/3773) **(codeblock)** track triple-quote state in ipython blocks (#3704)
- [gptme#3775](https://github.com/gptme/gptme/pull/3775) **(docs/cli)** mention subscription auth in no-provider error paths
- [gptme#3776](https://github.com/gptme/gptme/pull/3776) **(mcp)** run TOOL_CONFIRM guardrails on MCP tool.execute()
- [gptme#3777](https://github.com/gptme/gptme/pull/3777) **(benchmark)** raise cold startup threshold 6.0 → 8.0s for CI noise margin
- [gptme#3780](https://github.com/gptme/gptme/pull/3780) **(llm)** fold non-leading system messages for models that reject them (fixes #3779)
- [gptme#3783](https://github.com/gptme/gptme/pull/3783) **(server)** do not execute caller-supplied agent fork commands
- [gptme#3784](https://github.com/gptme/gptme/pull/3784) **(server)** detect 'No provider configured' as config error in server fallback
- [gptme#3788](https://github.com/gptme/gptme/pull/3788) **(openrouter)** always send data_collection=deny for reasoning models
- [gptme#3790](https://github.com/gptme/gptme/pull/3790) **(memory)** read index entries under the root lock
- [gptme#3796](https://github.com/gptme/gptme/pull/3796) **(webui)** persist demo conversations to sessionStorage to survive reload
- [gptme#3797](https://github.com/gptme/gptme/pull/3797) **(llm)** honor Retry-After during transient retries
- [gptme#3800](https://github.com/gptme/gptme/pull/3800) **(llm)** keep tool_call pairing for unavailable tools; dedupe auto-naming threads
- [gptme#3803](https://github.com/gptme/gptme/pull/3803) **(shell)** parse `time` scripts, stop false syntax errors, unwrap transparent wrappers
- [gptme#3804](https://github.com/gptme/gptme/pull/3804) **(shell)** bound captured subprocess output bytes (GPTME_SHELL_MAX_OUTPUT_BYTES)
- [gptme#3805](https://github.com/gptme/gptme/pull/3805) **(shell)** survive command timeouts, restore cwd/env after a shell death, tell the model
- [gptme#3809](https://github.com/gptme/gptme/pull/3809) **(gh)** dispatch structured 'command' kwarg calls
- [gptme#3810](https://github.com/gptme/gptme/pull/3810) **(shell)** scope set -e per block to prevent persistent errexit deaths
- [gptme#3818](https://github.com/gptme/gptme/pull/3818) **(config)** align CLI model precedence
- [gptme#3819](https://github.com/gptme/gptme/pull/3819) **(subagent)** deliver subprocess control and capture stderr
- [gptme#3824](https://github.com/gptme/gptme/pull/3824) **(cli)** emit clean error on status -o write failure, auto-mkdir parent
- [gptme-contrib#1620](https://github.com/gptme/gptme-contrib/pull/1620) **(pm)** scale gptme-canary default timeout 900→1800
- [gptme-contrib#1621](https://github.com/gptme/gptme-contrib/pull/1621) **(gptme-runloops)** record effect=observed when generic route completes a voice post-call
- [gptme-contrib#1622](https://github.com/gptme/gptme-contrib/pull/1622) **(gptme-sessions)** extract codex session id from rollout filename
- [gptme-contrib#1623](https://github.com/gptme/gptme-contrib/pull/1623) **(gptme-sessions)** close two bypasses in judge compliance detector
- [gptme-contrib#1624](https://github.com/gptme/gptme-contrib/pull/1624) **(self-merge-check)** make Greptile advisory; own AI reviewer becomes required gate
- [gptme-contrib#1625](https://github.com/gptme/gptme-contrib/pull/1625) **(gptme-usage)** apply cache cost heuristics to GPT-5.6 routes
- [gptme-contrib#1629](https://github.com/gptme/gptme-contrib/pull/1629) **(state-status)** raise RuntimeError instead of silent return when not in git repo
- [gptme-contrib#1634](https://github.com/gptme/gptme-contrib/pull/1634) **(sessions)** persist Grok context and cached usage
- [gptme-contrib#1637](https://github.com/gptme/gptme-contrib/pull/1637) **(self-merge)** skip basename collision on existing same-package files
- [gptme-contrib#1638](https://github.com/gptme/gptme-contrib/pull/1638) **(activity-gate)** treat fully-disposed AI findings as clean
- [gptme-contrib#1640](https://github.com/gptme/gptme-contrib/pull/1640) **(repo-status)** skip Dependabot dynamic runs when product CI exists
- [gptme-contrib#1642](https://github.com/gptme/gptme-contrib/pull/1642) **(gptmail)** detect trusted BCC via envelope headers
- [gptme-contrib#1643](https://github.com/gptme/gptme-contrib/pull/1643) **(voice)** align Python subprocess timeout with shell wrapper env var
- [gptme-contrib#1644](https://github.com/gptme/gptme-contrib/pull/1644) **(voice)** route 'last hour' queries to pre-computed activity digest
- [gptme-contrib#1648](https://github.com/gptme/gptme-contrib/pull/1648) **(gptmail)** put user tool dirs on PATH for remote pull/watch commands
- [gptme-contrib#1650](https://github.com/gptme/gptme-contrib/pull/1650) **(self-merge)** recognize Greptile underscore marker
- [gptme-contrib#1653](https://github.com/gptme/gptme-contrib/pull/1653) **(activity-summary)** recognize Fable quota exhaustion

## Refactors

- [gptme#3808](https://github.com/gptme/gptme/pull/3808) **(shell)** parse Bash with tree-sitter and retain legacy fallback
- [gptme-contrib#1630](https://github.com/gptme/gptme-contrib/pull/1630) **(self-merge)** share AI review blocking predicate

## Documentation

- [gptme#3725](https://github.com/gptme/gptme/pull/3725) **(readme)** tag gptme.ai acquisition link
- [gptme#3778](https://github.com/gptme/gptme/pull/3778)  rewrite finetuning page as a working, measured recipe
- [gptme#3813](https://github.com/gptme/gptme/pull/3813)  restructure navigation and page structure

## Tests

- [gptme#3741](https://github.com/gptme/gptme/pull/3741) **(webui)** exercise live auto-connect banner transition
- [gptme#3815](https://github.com/gptme/gptme/pull/3815) **(memory)** assert legacy reads stay bounded
- [gptme-contrib#1635](https://github.com/gptme/gptme-contrib/pull/1635) **(gptmail)** preserve local read state on agent pull re-fetch
- [gptme-contrib#1652](https://github.com/gptme/gptme-contrib/pull/1652) **(self-merge)** preserve Greptile marker provenance gates

## CI & Infrastructure

- [gptme-contrib#1647](https://github.com/gptme/gptme-contrib/pull/1647) **(test-packages)** retry apt-get update on transient mirror errors

## Other Changes

- [gptme#3748](https://github.com/gptme/gptme/pull/3748)  hint how to enable disabled-by-default tool in error message

---

*108 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
