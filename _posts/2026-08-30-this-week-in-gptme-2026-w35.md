---
title: This Week in gptme (W35 2026)
date: 2026-08-30
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-08-24 – 2026-08-30):
  35 new features, 61 bug fixes across 118 merged PRs.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-08-24 – 2026-08-30): 35 new features, 61 bug fixes across 118 merged PRs.

## Highlights

- [gptme#3655](https://github.com/gptme/gptme/pull/3655) **(eval)** route fable-5 and haiku-4.5 to tool format by default
- [gptme#3593](https://github.com/gptme/gptme/pull/3593) **(cli)** auto-discover local Ollama and LM Studio providers
- [gptme#3595](https://github.com/gptme/gptme/pull/3595) **(tools)** add offline file format conversion tool
- [gptme#3659](https://github.com/gptme/gptme/pull/3659) **(tools)** expose convert as auto-discovered structured tool
- [gptme-contrib#1492](https://github.com/gptme/gptme-contrib/pull/1492) **(sessions)** add export command for JSON/CSV session dumps

---

## New Features

- [gptme#3583](https://github.com/gptme/gptme/pull/3583) **(media)** add 32x32-optimized gptme icon (colour + monochrome)
- [gptme#3587](https://github.com/gptme/gptme/pull/3587) **(skills)** invoke skills as slash commands (/skill:<name>)
- [gptme#3593](https://github.com/gptme/gptme/pull/3593) **(cli)** auto-discover local Ollama and LM Studio providers
- [gptme#3595](https://github.com/gptme/gptme/pull/3595) **(tools)** add offline file format conversion tool
- [gptme#3613](https://github.com/gptme/gptme/pull/3613) **(providers)** complete context compression plugin interface - Phase 2
- [gptme#3622](https://github.com/gptme/gptme/pull/3622) **(knowledge)** cross-session KB save/retrieve as gptme-util CLI
- [gptme#3626](https://github.com/gptme/gptme/pull/3626) **(memory)** load Claude Code memory in gptme workspace context
- [gptme#3628](https://github.com/gptme/gptme/pull/3628) **(models)** parallel-tool flags from provider docs; eval-format verdict
- [gptme#3645](https://github.com/gptme/gptme/pull/3645) **(doctor)** add proxy URL format check (LLM_PROXY_URL)
- [gptme#3647](https://github.com/gptme/gptme/pull/3647) **(browser)** skip html→markdown when server returns text/markdown
- [gptme#3654](https://github.com/gptme/gptme/pull/3654) **(ci)** use config-driven root structure validator
- [gptme#3655](https://github.com/gptme/gptme/pull/3655) **(eval)** route fable-5 and haiku-4.5 to tool format by default
- [gptme#3659](https://github.com/gptme/gptme/pull/3659) **(tools)** expose convert as auto-discovered structured tool
- [gptme#3665](https://github.com/gptme/gptme/pull/3665) **(service-init)** add optional local health probe
- [gptme#3673](https://github.com/gptme/gptme/pull/3673) **(shell)** improve background job control
- [gptme#3678](https://github.com/gptme/gptme/pull/3678) **(knowledge)** inject matching KB entries at session start
- [gptme-contrib#1489](https://github.com/gptme/gptme-contrib/pull/1489) **(activity-summary)** add gptme fallback for claude quota exhaustion
- [gptme-contrib#1492](https://github.com/gptme/gptme-contrib/pull/1492) **(sessions)** add export command for JSON/CSV session dumps
- [gptme-contrib#1498](https://github.com/gptme/gptme-contrib/pull/1498) **(gptme-rag)** add injection logging and index-health reporting
- [gptme-contrib#1501](https://github.com/gptme/gptme-contrib/pull/1501) **(sessions)** record eval attempt classification on the session record
- [gptme-contrib#1502](https://github.com/gptme/gptme-contrib/pull/1502) **(gptodo)** add browse command — interactive fzf TUI for tasks
- [gptme-contrib#1503](https://github.com/gptme/gptme-contrib/pull/1503) **(browser-semantic)** Path A observe/act/extract primitives
- [gptme-contrib#1504](https://github.com/gptme/gptme-contrib/pull/1504) **(pm-bandit)** wire RunItem into bandit shadow mode
- [gptme-contrib#1505](https://github.com/gptme/gptme-contrib/pull/1505) **(precommit)** add config-driven root-structure validator
- [gptme-contrib#1506](https://github.com/gptme/gptme-contrib/pull/1506) **(pm-bandit)** Wire PmModelBandit into RunItem (Stage 1 shadow)
- [gptme-contrib#1508](https://github.com/gptme/gptme-contrib/pull/1508) **(tooloutput-trimmer)** memoize summarizer by source and model hash
- [gptme-contrib#1510](https://github.com/gptme/gptme-contrib/pull/1510) **(gptodo)** add --skip-claimed flag to gptodo ready
- [gptme-contrib#1524](https://github.com/gptme/gptme-contrib/pull/1524) **(voice-node)** add gptme-voice-node embedded WS client package
- [gptme-contrib#1529](https://github.com/gptme/gptme-contrib/pull/1529) **(vision-node)** add gptme-vision-node — BobBrain vision pipeline v0
- [gptme-contrib#1531](https://github.com/gptme/gptme-contrib/pull/1531) **(pr-review)** adversarial per-finding verifier (Stage 2)
- [gptme-contrib#1541](https://github.com/gptme/gptme-contrib/pull/1541) **(bobutils)** add GFM table-cell escape helper
- [gptme-contrib#1543](https://github.com/gptme/gptme-contrib/pull/1543) **(pm-bandit)** restore RunItem Stage 1 shadow wiring
- [gptme-contrib#1545](https://github.com/gptme/gptme-contrib/pull/1545) **(rag)** add KnowledgeEntrySource over gptme JSONL store
- [gptme-contrib#1546](https://github.com/gptme/gptme-contrib/pull/1546) **(lsp)** rename workspace edit preview coverage + workspace index + diagnostics header fixes
- [gptme-contrib#1551](https://github.com/gptme/gptme-contrib/pull/1551) **(dotfiles)** add Git-Session-Id prepare-commit-msg hook

## Bug Fixes

- [gptme#3566](https://github.com/gptme/gptme/pull/3566) **(models)** propagation gap + default_tool_format for OpenAI-compat providers
- [gptme#3592](https://github.com/gptme/gptme/pull/3592) **(server)** don't let step() finally clear a continuation reservation
- [gptme#3597](https://github.com/gptme/gptme/pull/3597) **(server)** guard startup SIGTERM handler against overriding custom handlers
- [gptme#3602](https://github.com/gptme/gptme/pull/3602) **(webui)** stabilize multi-server query results
- [gptme#3606](https://github.com/gptme/gptme/pull/3606) **(webui)** recover local-server bearer handshake after #3430
- [gptme#3609](https://github.com/gptme/gptme/pull/3609) **(service-init)** make the scaffolded agent actually run gptme
- [gptme#3612](https://github.com/gptme/gptme/pull/3612) **(server)** treat missing X display as screenshot-unavailable
- [gptme#3615](https://github.com/gptme/gptme/pull/3615) **(prompts)** keep volatile context after cache boundary
- [gptme#3616](https://github.com/gptme/gptme/pull/3616) **(prompts)** move profile system prompts before cache boundary (Phases 2+3)
- [gptme#3623](https://github.com/gptme/gptme/pull/3623) **(server)** use os.write() and re-entrance guard in SIGTERM handlers
- [gptme#3630](https://github.com/gptme/gptme/pull/3630) **(cli)** forward nested help to utility shortcuts
- [gptme#3633](https://github.com/gptme/gptme/pull/3633) **(models)** per-model parallel-tool opt-out via PARALLEL_TOOL_CALL_EXCEPTIONS
- [gptme#3634](https://github.com/gptme/gptme/pull/3634) **(tests)** scope pytest timeouts to the function so retries can't INTERNALERROR the run
- [gptme#3635](https://github.com/gptme/gptme/pull/3635) **(tests)** assert webui html hint by content, not by index
- [gptme#3636](https://github.com/gptme/gptme/pull/3636) **(shell)** route all commands through TOOL_CONFIRM hook chain (closes #3598)
- [gptme#3639](https://github.com/gptme/gptme/pull/3639) **(compat)** improve Windows and cross-platform compatibility in tools and tests
- [gptme#3640](https://github.com/gptme/gptme/pull/3640) **(cli)** reject unknown bare --model names before get_prompt()
- [gptme#3650](https://github.com/gptme/gptme/pull/3650) **(cli)** support stdin dash in slop check
- [gptme#3651](https://github.com/gptme/gptme/pull/3651) **(status)** serialize list/dict provider values as JSON in table format
- [gptme#3657](https://github.com/gptme/gptme/pull/3657) **(config)** workspace fallback must not use process cwd (P1 follow-up from #3639)
- [gptme#3658](https://github.com/gptme/gptme/pull/3658) **(convert)** register gptme-convert console script and fix error message
- [gptme#3661](https://github.com/gptme/gptme/pull/3661) **(tests)** stop pytest-retry × tmp_path teardown KeyError failing green runs
- [gptme#3662](https://github.com/gptme/gptme/pull/3662) **(tests)** give subagent thread-join guard a real liveness budget
- [gptme#3663](https://github.com/gptme/gptme/pull/3663) **(browser)** harden lynx URL validation
- [gptme#3670](https://github.com/gptme/gptme/pull/3670) **(cli)** suppress all shortcut dispatch after double dash
- [gptme#3672](https://github.com/gptme/gptme/pull/3672)  match Claude Code's cwd→project-dir encoding (CC memory + agent hook)
- [gptme#3674](https://github.com/gptme/gptme/pull/3674) **(security)** route git subprocesses through GIT_CMD in review-pr and 3-way merge
- [gptme#3675](https://github.com/gptme/gptme/pull/3675) **(tests)** join subagent threads before teardown in TestParentContextForwarding
- [gptme#3676](https://github.com/gptme/gptme/pull/3676) **(server)** return 400, not 500, for non-dict JSON bodies on tools QUERY and steer
- [gptme#3677](https://github.com/gptme/gptme/pull/3677) **(convert)** handle non-UTF-8 converter stderr without crashing
- [gptme#3679](https://github.com/gptme/gptme/pull/3679) **(llm)** pin Codex session_id to conversation instead of uuid4 per turn
- [gptme#3684](https://github.com/gptme/gptme/pull/3684) **(webui)** gate task creation in demo mode
- [gptme-contrib#1490](https://github.com/gptme/gptme-contrib/pull/1490) **(git-safe-commit)** block exclusion-only pathspec and pathspec-file bypass
- [gptme-contrib#1491](https://github.com/gptme/gptme-contrib/pull/1491) **(runloops)** classify disabled CC subscriptions as infra
- [gptme-contrib#1495](https://github.com/gptme/gptme-contrib/pull/1495) **(activity-summary)** fail smart when a due period fails
- [gptme-contrib#1496](https://github.com/gptme/gptme-contrib/pull/1496) **(twitter)** skip cross-account bob_quote instead of looping on the pending marker
- [gptme-contrib#1500](https://github.com/gptme/gptme-contrib/pull/1500) **(git-safe-commit)** skip whitespace-only lines in pathspec_file_has_positive
- [gptme-contrib#1507](https://github.com/gptme/gptme-contrib/pull/1507) **(community-plugins)** git add docs/community_plugins.json (path mismatch)
- [gptme-contrib#1511](https://github.com/gptme/gptme-contrib/pull/1511) **(gptme-rag)** make Indexer/ContextAssembler lazy imports
- [gptme-contrib#1513](https://github.com/gptme/gptme-contrib/pull/1513) **(output-clarity)** add match.keywords to prevent over-broad descriptor injection
- [gptme-contrib#1514](https://github.com/gptme/gptme-contrib/pull/1514) **(bob-status)** strip gptodo compact recency without a space before the unit
- [gptme-contrib#1516](https://github.com/gptme/gptme-contrib/pull/1516) **(lessons)** honor metadata.status in both lesson/skill matchers
- [gptme-contrib#1517](https://github.com/gptme/gptme-contrib/pull/1517) **(pm)** give AI-review dispatch arms a false-positive disposition path
- [gptme-contrib#1518](https://github.com/gptme/gptme-contrib/pull/1518) **(release-announce)** freshness gate — never announce an old 'latest' stable
- [gptme-contrib#1519](https://github.com/gptme/gptme-contrib/pull/1519) **(runloops)** count review-thread resolution as an observable effect
- [gptme-contrib#1520](https://github.com/gptme/gptme-contrib/pull/1520) **(precommit)** make root structure hook installable
- [gptme-contrib#1521](https://github.com/gptme/gptme-contrib/pull/1521) **(runloops)** make git_pull_with_retry shared-worktree-safe (fetch + ff-only)
- [gptme-contrib#1522](https://github.com/gptme/gptme-contrib/pull/1522) **(pm)** skip pull-only author notifications and merge-lifecycle handoffs
- [gptme-contrib#1523](https://github.com/gptme/gptme-contrib/pull/1523) **(rag)** raise file_limit default 1000→100k, expose --file-limit CLI flag
- [gptme-contrib#1525](https://github.com/gptme/gptme-contrib/pull/1525) **(gptme-voice)** await in-flight pre-warm on claim + caller-aware external-caller instructions
- [gptme-contrib#1526](https://github.com/gptme/gptme-contrib/pull/1526) **(release-announce)** handle naive publication timestamps
- [gptme-contrib#1527](https://github.com/gptme/gptme-contrib/pull/1527) **(pm)** use `first` not `last` for handoff ref in `latest_comment_is_bot_waiting`
- [gptme-contrib#1532](https://github.com/gptme/gptme-contrib/pull/1532) **(rag)** honor index pattern and clarify file limit error
- [gptme-contrib#1533](https://github.com/gptme/gptme-contrib/pull/1533) **(bob-status)** return compact task summaries in table cells
- [gptme-contrib#1534](https://github.com/gptme/gptme-contrib/pull/1534) **(rag)** content-hash change detection to stop mtime-only re-embeds
- [gptme-contrib#1535](https://github.com/gptme/gptme-contrib/pull/1535) **(rag)** do not recreate a matching-model collection on EF conflict
- [gptme-contrib#1539](https://github.com/gptme/gptme-contrib/pull/1539) **(gptodo)** emit waiting_for/waiting_since on recurrence reset
- [gptme-contrib#1542](https://github.com/gptme/gptme-contrib/pull/1542) **(rag)** raise pathspec floor to 1.0 for GitIgnoreSpecPattern
- [gptme-contrib#1544](https://github.com/gptme/gptme-contrib/pull/1544) **(rag)** type the stored change-detection fingerprint
- [gptme-contrib#1548](https://github.com/gptme/gptme-contrib/pull/1548) **(gptme-activity-summary)** strip think tags + raw_decode JSON in gptme fallback
- [gptme-contrib#1550](https://github.com/gptme/gptme-contrib/pull/1550) **(news)** parse total stars when GitHub wraps the count in an octicon

## Performance

- [gptme-contrib#1530](https://github.com/gptme/gptme-contrib/pull/1530) **(rag)** cache scan_lessons() by mtime+size to skip YAML re-parse

## Refactors

- [gptme#3614](https://github.com/gptme/gptme/pull/3614) **(service-init)** consolidate and document gptme-agent-template reference
- [gptme#3619](https://github.com/gptme/gptme/pull/3619) **(agent-cmd)** clarify scan scope and add create cross-references
- [gptme#3621](https://github.com/gptme/gptme/pull/3621) **(autocompact)** rename /compact modes to 'trim' and 'summarize'
- [gptme-contrib#1493](https://github.com/gptme/gptme-contrib/pull/1493) **(backoff)** remove duplicate circuit breaker
- [gptme-contrib#1497](https://github.com/gptme/gptme-contrib/pull/1497) **(bob-status)** PR-queue depth is an attention watermark, not a cap

## Documentation

- [gptme#3605](https://github.com/gptme/gptme/pull/3605)  add curated skills gallery page to gptme.org
- [gptme#3608](https://github.com/gptme/gptme/pull/3608) **(plugins)** fix hook type names and add TOOL_CONFIRM guardrail example
- [gptme#3611](https://github.com/gptme/gptme/pull/3611) **(hooks)** document TOOL_CONFIRM deny semantics and return contract
- [gptme#3631](https://github.com/gptme/gptme/pull/3631) **(getting-started)** add free cloud providers section
- [gptme#3649](https://github.com/gptme/gptme/pull/3649) **(providers)** link template and add integration FAQ
- [gptme#3664](https://github.com/gptme/gptme/pull/3664) **(mcp)** surface bidirectional server support in README
- [gptme#3671](https://github.com/gptme/gptme/pull/3671)  point the free on-ramp at live OpenRouter models
- [gptme-contrib#1494](https://github.com/gptme/gptme-contrib/pull/1494)  link gptme.org skills gallery from READMEs

## Tests

- [gptme#3607](https://github.com/gptme/gptme/pull/3607) **(webui)** add opt-in vision_assert helper for generation E2E
- [gptme#3610](https://github.com/gptme/gptme/pull/3610) **(subagent)** de-flake test_subagent_wait_polls_cache_after_join_timeout
- [gptme#3637](https://github.com/gptme/gptme/pull/3637) **(codeblock)** load fixture files with pathlib so tests pass on Windows
- [gptme-contrib#1512](https://github.com/gptme/gptme-contrib/pull/1512) **(gptodo)** regression tests for browse fixes from #1502; document fzf floor
- [gptme-contrib#1547](https://github.com/gptme/gptme-contrib/pull/1547) **(gptme-activity-summary)** regression tests for deepseek preamble parse + prompt narrative contract

## CI & Infrastructure

- [gptme#3604](https://github.com/gptme/gptme/pull/3604)  run pre-commit hooks in the lint workflow

## Chore

- [gptme-contrib#1537](https://github.com/gptme/gptme-contrib/pull/1537) **(pm)** drop legacy greptile_needs_{fix,improvement} label cases and stale comments
- [gptme-contrib#1540](https://github.com/gptme/gptme-contrib/pull/1540) **(runloops)** drop legacy greptile_needs_{fix,improvement} read paths

---

*118 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
