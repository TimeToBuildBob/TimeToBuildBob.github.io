---
title: This Week in gptme (W38 2026)
date: 2026-09-20
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-09-14 – 2026-09-20):
  30 new features, 39 bug fixes across 91 merged PRs.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-09-14 – 2026-09-20): 30 new features, 39 bug fixes across 91 merged PRs.

## Highlights

- [gptme#3870](https://github.com/gptme/gptme/pull/3870) **(webui)** add gptme-host:seed-prompt to pre-fill chat input from host
- [gptme-contrib#1662](https://github.com/gptme/gptme-contrib/pull/1662) **(voice)** generalize callback context persistence beyond standup
- [gptme-contrib#1664](https://github.com/gptme/gptme-contrib/pull/1664) **(voice)** load missed-call callback context from the linked file
- [gptme-contrib#1668](https://github.com/gptme/gptme-contrib/pull/1668) **(sessions)** derive subagent_summary from parent and child trajectories
- [gptme-contrib#1670](https://github.com/gptme/gptme-contrib/pull/1670) **(sessions)** add runnable sessions-blame demo (sample transcript + resolved diff)

---

## New Features

- [gptme#3817](https://github.com/gptme/gptme/pull/3817) **(memory)** trigger keyworded entries through the lesson matcher
- [gptme#3821](https://github.com/gptme/gptme/pull/3821) **(config)** expose preview guidance through runtime prompt fragments
- [gptme#3833](https://github.com/gptme/gptme/pull/3833) **(skills)** persist CostTracker ownership across TUI/server workers
- [gptme#3834](https://github.com/gptme/gptme/pull/3834) **(subagent)** persist registry metadata and rehydrate after restart
- [gptme#3839](https://github.com/gptme/gptme/pull/3839) **(site)** prototype of new gptme.org site (design v3)
- [gptme#3849](https://github.com/gptme/gptme/pull/3849) **(site)** deploy design-v3 landing page to gptme.org
- [gptme#3863](https://github.com/gptme/gptme/pull/3863) **(memory)** migrate-knowledge-jsonl command + deprecate knowledge CLI
- [gptme#3864](https://github.com/gptme/gptme/pull/3864) **(knowledge)** generalize KB schema with entry_type field
- [gptme#3865](https://github.com/gptme/gptme/pull/3865) **(knowledge)** wire search to gptme-rag semantic ranking
- [gptme#3866](https://github.com/gptme/gptme/pull/3866) **(cloud)** default service URL → auth.gptme.ai custom domain
- [gptme#3869](https://github.com/gptme/gptme/pull/3869) **(memory)** add search and export commands to complete #3734 CLI table
- [gptme#3870](https://github.com/gptme/gptme/pull/3870) **(webui)** add gptme-host:seed-prompt to pre-fill chat input from host
- [gptme#3891](https://github.com/gptme/gptme/pull/3891) **(doctor)** add interactive provider repair
- [gptme-contrib#1662](https://github.com/gptme/gptme-contrib/pull/1662) **(voice)** generalize callback context persistence beyond standup
- [gptme-contrib#1664](https://github.com/gptme/gptme-contrib/pull/1664) **(voice)** load missed-call callback context from the linked file
- [gptme-contrib#1665](https://github.com/gptme/gptme-contrib/pull/1665) **(voice)** load general linked context files on missed-call callback
- [gptme-contrib#1668](https://github.com/gptme/gptme-contrib/pull/1668) **(sessions)** derive subagent_summary from parent and child trajectories
- [gptme-contrib#1670](https://github.com/gptme/gptme-contrib/pull/1670) **(sessions)** add runnable sessions-blame demo (sample transcript + resolved diff)
- [gptme-contrib#1672](https://github.com/gptme/gptme-contrib/pull/1672) **(sessions)** lift subagent_summary into SessionRecord
- [gptme-contrib#1674](https://github.com/gptme/gptme-contrib/pull/1674) **(voice)** callback-history index — JSONL log + last-5-calls injected on inbound
- [gptme-contrib#1675](https://github.com/gptme/gptme-contrib/pull/1675) **(voice)** record inbound calls into callback-history.jsonl
- [gptme-contrib#1677](https://github.com/gptme/gptme-contrib/pull/1677) **(sessions)** per-child subagent breakdown + judge delegation annotation
- [gptme-contrib#1681](https://github.com/gptme/gptme-contrib/pull/1681) **(block-registry)** shared state-dir block-file contract + registry (credential-survival sublayer)
- [gptme-contrib#1682](https://github.com/gptme/gptme-contrib/pull/1682) **(trajectory-preservation)** harness-agnostic backup + health check
- [gptme-contrib#1685](https://github.com/gptme/gptme-contrib/pull/1685) **(precommit)** agent-neutral contrib fork-marker validator
- [gptme-contrib#1686](https://github.com/gptme/gptme-contrib/pull/1686) **(notify)** pluggable notify-my-principal seam with Tier-0 fallback
- [gptme-contrib#1687](https://github.com/gptme/gptme-contrib/pull/1687) **(precommit)** port symlink-hygiene scanner to contrib
- [gptme-contrib#1688](https://github.com/gptme/gptme-contrib/pull/1688) **(block-registry)** config-driven fallback arm for auth-death scenarios
- [gptme-contrib#1689](https://github.com/gptme/gptme-contrib/pull/1689) **(capability-probe)** runtime tier probe for forked agents (alice#79)
- [gptme-contrib#1694](https://github.com/gptme/gptme-contrib/pull/1694) **(end)** add pre-close decision review to judgment checks

## Bug Fixes

- [gptme#3826](https://github.com/gptme/gptme/pull/3826) **(logmanager)** acknowledge completion after transcript barriers
- [gptme#3835](https://github.com/gptme/gptme/pull/3835) **(tools)** raise ValueError with tool name when init() returns None
- [gptme#3840](https://github.com/gptme/gptme/pull/3840) **(webui)** guard console-proxy injection against cross-origin iframes
- [gptme#3841](https://github.com/gptme/gptme/pull/3841) **(webui)** guard undefined values before toLowerCase calls
- [gptme#3842](https://github.com/gptme/gptme/pull/3842) **(cli)** emit clean error on dataset export -o write failure
- [gptme#3843](https://github.com/gptme/gptme/pull/3843) **(shell)** wake idle sessions on background completion
- [gptme#3844](https://github.com/gptme/gptme/pull/3844) **(shell)** restore cwd/env after a shell death and tell the model
- [gptme#3845](https://github.com/gptme/gptme/pull/3845) **(eval)** keep token counts on timeout instead of zeroing them
- [gptme#3847](https://github.com/gptme/gptme/pull/3847) **(llm)** _merge_consecutive must not merge parallel tool results with different call_ids
- [gptme#3850](https://github.com/gptme/gptme/pull/3850) **(cli)** emit clean error on attest sign --out write failure
- [gptme#3852](https://github.com/gptme/gptme/pull/3852) **(cli)** validate non-empty query in context retrieve/search-conversations; catch RuntimeError
- [gptme#3853](https://github.com/gptme/gptme/pull/3853) **(webui)** log readable auth-code exchange failure cause
- [gptme#3854](https://github.com/gptme/gptme/pull/3854) **(tests)** reset leaked shell workspace cwd state between tests
- [gptme#3858](https://github.com/gptme/gptme/pull/3858) **(eval)** correct main's docstring parameter name and semantics
- [gptme#3861](https://github.com/gptme/gptme/pull/3861) **(webui)** resolve server-relative panel srcs against the instance API origin
- [gptme#3867](https://github.com/gptme/gptme/pull/3867) **(knowledge)** fall back to keyword search when RAG returns no live entries
- [gptme#3874](https://github.com/gptme/gptme/pull/3874) **(server)** emit step_complete after generating=False to close queue-flush 409 race
- [gptme#3875](https://github.com/gptme/gptme/pull/3875)  add missing trailing newline to v0.34.0 release notes
- [gptme#3876](https://github.com/gptme/gptme/pull/3876) **(release)** always write release notes with a trailing newline
- [gptme#3878](https://github.com/gptme/gptme/pull/3878) **(anti-slop)** fail short dense-slop text instead of skipping it
- [gptme#3880](https://github.com/gptme/gptme/pull/3880) **(patch_many)** accumulate repeated paths instead of silently dropping hunks
- [gptme#3882](https://github.com/gptme/gptme/pull/3882) **(webui)** don't treat the Tauri webview origin as a bundled gptme-server
- [gptme#3883](https://github.com/gptme/gptme/pull/3883) **(server)** bundle gptme.hooks and gptme.context in the PyInstaller sidecar
- [gptme#3887](https://github.com/gptme/gptme/pull/3887) **(lessons)** deduplicate skills by name, not by file path
- [gptme#3888](https://github.com/gptme/gptme/pull/3888) **(lessons)** skip hidden subdirectories during skill/lesson discovery
- [gptme#3889](https://github.com/gptme/gptme/pull/3889) **(llm)** render GptmeAuthError as a plain message, not KeyError's repr
- [gptme-contrib#1658](https://github.com/gptme/gptme-contrib/pull/1658) **(sessions)** capture Grok string errors without crashing
- [gptme-contrib#1659](https://github.com/gptme/gptme-contrib/pull/1659) **(activity-summary)** report exact PR/issue/commit counts instead of list-capped lengths
- [gptme-contrib#1660](https://github.com/gptme/gptme-contrib/pull/1660) **(voice)** preserve the prepared standup on trusted callbacks
- [gptme-contrib#1663](https://github.com/gptme/gptme-contrib/pull/1663) **(sessions)** estimate cost_usd when the harness omits usage.cost
- [gptme-contrib#1666](https://github.com/gptme/gptme-contrib/pull/1666) **(pm)** age-order mentions before the per-run notification cap
- [gptme-contrib#1667](https://github.com/gptme/gptme-contrib/pull/1667) **(activity-summary)** re-pin 0731 gptme fallback off removed @deepseek endpoint
- [gptme-contrib#1669](https://github.com/gptme/gptme-contrib/pull/1669) **(pm)** recognize PM human-merge handoff marker in maintainer-waiting suppression
- [gptme-contrib#1671](https://github.com/gptme/gptme-contrib/pull/1671) **(voice)** extend callback window from 30 min to 4 h for same-morning callbacks
- [gptme-contrib#1676](https://github.com/gptme/gptme-contrib/pull/1676) **(activity-gate)** skip mention dispatch when subject thread is closed/merged
- [gptme-contrib#1678](https://github.com/gptme/gptme-contrib/pull/1678) **(gptme-sessions)** classify provider spending-limit 403 as quota, not auth
- [gptme-contrib#1679](https://github.com/gptme/gptme-contrib/pull/1679) **(gptodo)** resolve archived-task dependencies in gptodo check
- [gptme-contrib#1680](https://github.com/gptme/gptme-contrib/pull/1680) **(check-claude-usage)** report auth/network failure instead of misleading version error
- [gptme-contrib#1692](https://github.com/gptme/gptme-contrib/pull/1692) **(voice)** anchor MAX_CONTEXT_AGE to placed_at, not callback time

## Refactors

- [gptme#3802](https://github.com/gptme/gptme/pull/3802) **(shell)** background whole tool calls and fix exit stalls
- [gptme#3872](https://github.com/gptme/gptme/pull/3872) **(webui)** extract presentational PromptTextarea shell from ChatInput
- [gptme-contrib#1691](https://github.com/gptme/gptme-contrib/pull/1691) **(pr_review)** make reviewer identity agent-neutral

## Documentation

- [gptme#3836](https://github.com/gptme/gptme/pull/3836)  update timeline and README news through September 2026
- [gptme#3837](https://github.com/gptme/gptme/pull/3837) **(readme)** refresh demos with current screenshots and better asciinema thumbnails
- [gptme#3838](https://github.com/gptme/gptme/pull/3838) **(readme)** replace broken starchart.cc chart with gptme/stats
- [gptme#3855](https://github.com/gptme/gptme/pull/3855)  add CITATION.cff and a Citation section to README
- [gptme#3857](https://github.com/gptme/gptme/pull/3857)  fix a TOC anchor and the moved-extension link
- [gptme#3859](https://github.com/gptme/gptme/pull/3859)  point the hooks comment at the subagent package
- [gptme#3871](https://github.com/gptme/gptme/pull/3871)  position cross-harness memory in README and site (closes #3734 item 8)

## Tests

- [gptme#3851](https://github.com/gptme/gptme/pull/3851) **(lessons)** stop seeding the global RNG in dropout tests
- [gptme#3856](https://github.com/gptme/gptme/pull/3856) **(llm)** strip ANSI codes before asserting IPython source in terminal output
- [gptme#3860](https://github.com/gptme/gptme/pull/3860) **(shell)** pin no-retry invariant by watching stdin writes after EPIPE
- [gptme#3862](https://github.com/gptme/gptme/pull/3862) **(webui)** cap jest maxWorkers at 4 to prevent container thrash
- [gptme#3877](https://github.com/gptme/gptme/pull/3877) **(shell)** make SIGTERM regression independent of inherited SIG_IGN
- [gptme#3884](https://github.com/gptme/gptme/pull/3884) **(ci)** smoke-test frozen gptme-server startup for missing modules
- [gptme#3885](https://github.com/gptme/gptme/pull/3885) **(eval)** isolate process-global side effects of in-process act_process calls
- [gptme-contrib#1673](https://github.com/gptme/gptme-contrib/pull/1673) **(voice)** make near-window-edge callback test deterministic
- [gptme-contrib#1683](https://github.com/gptme/gptme-contrib/pull/1683) **(quota-gate)** contract tests for the check-usage → quota-gate JSON seam
- [gptme-contrib#1684](https://github.com/gptme/gptme-contrib/pull/1684) **(session-gate)** pin ERROR=2 exit contract (fail-loud, not silent SKIP)

## CI & Infrastructure

- [gptme#3827](https://github.com/gptme/gptme/pull/3827) **(deps)** bump actions/setup-java from 6.0.0 to 6.0.1 in the github-actions group

## Chore

- [gptme#3868](https://github.com/gptme/gptme/pull/3868)  move root-structure allowlist under .github and drop gptme-extension tombstone

---

*91 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
