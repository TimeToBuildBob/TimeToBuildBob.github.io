---
title: This Week in gptme (W26 2026)
date: 2026-06-28
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-06-22 – 2026-06-28):
  8 new features, 17 bug fixes across 35 merged PRs.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-06-22 – 2026-06-28): 8 new features, 17 bug fixes across 35 merged PRs.

## Highlights

- [gptme#2971](https://github.com/gptme/gptme/pull/2971) **(cli)** add context search-conversations subcommand for RAG conversation search
- [gptme#2975](https://github.com/gptme/gptme/pull/2975) **(subagent)** context_window parameter for workspace context isolation
- [gptme#2976](https://github.com/gptme/gptme/pull/2976) **(subagent)** expose context_window in tool instructions; validate negative values
- [gptme#2988](https://github.com/gptme/gptme/pull/2988) **(lessons)** randomized lesson-dropout injection for causal LOO
- [gptme-contrib#1157](https://github.com/gptme/gptme-contrib/pull/1157) **(gptme-cc-memory)** add typed session memory package for Claude Code

---

## New Features

- [gptme#2971](https://github.com/gptme/gptme/pull/2971) **(cli)** add context search-conversations subcommand for RAG conversation search
- [gptme#2975](https://github.com/gptme/gptme/pull/2975) **(subagent)** context_window parameter for workspace context isolation
- [gptme#2976](https://github.com/gptme/gptme/pull/2976) **(subagent)** expose context_window in tool instructions; validate negative values
- [gptme#2988](https://github.com/gptme/gptme/pull/2988) **(lessons)** randomized lesson-dropout injection for causal LOO
- [gptme-contrib#1157](https://github.com/gptme/gptme-contrib/pull/1157) **(gptme-cc-memory)** add typed session memory package for Claude Code
- [gptme-contrib#1158](https://github.com/gptme/gptme-contrib/pull/1158) **(coordination)** add event queue for async skill dispatch (Phase 1)
- [gptme-contrib#1162](https://github.com/gptme/gptme-contrib/pull/1162) **(lessons)** add randomized dropout to CC hook (mirrors gptme#2988)
- [gptme-contrib#1163](https://github.com/gptme/gptme-contrib/pull/1163) **(quota-gate)** capture underlying error on check failure

## Bug Fixes

- [gptme#2970](https://github.com/gptme/gptme/pull/2970) **(server)** return 400 on config-file PATCH with non-table traversal
- [gptme#2973](https://github.com/gptme/gptme/pull/2973) **(shell)** only show workspace-detected hint once per workspace
- [gptme#2974](https://github.com/gptme/gptme/pull/2974) **(config)** strip unknown top-level keys from config file on load
- [gptme#2977](https://github.com/gptme/gptme/pull/2977) **(subagent)** correct context_window=N truncation (off-by-one in n_base)
- [gptme#2980](https://github.com/gptme/gptme/pull/2980) **(rag)** stop tools list hook registration warning
- [gptme#2981](https://github.com/gptme/gptme/pull/2981)  demote reasoning content logging from INFO to DEBUG
- [gptme#2985](https://github.com/gptme/gptme/pull/2985) **(openai)** embed reasoning content in non-streaming response instead of dropping it
- [gptme#2990](https://github.com/gptme/gptme/pull/2990) **(lessons)** always log dropout record when epsilon>0, even if no lessons withheld
- [gptme#2991](https://github.com/gptme/gptme/pull/2991) **(webui)** fix fork_command placeholder in Create Agent dialog
- [gptme#2992](https://github.com/gptme/gptme/pull/2992) **(util)** tokens count rejects valid provider-prefixed models
- [gptme-contrib#1151](https://github.com/gptme/gptme-contrib/pull/1151) **(gptmail)** GPTME_WORKSPACE override + lazy logging in watcher daemon
- [gptme-contrib#1154](https://github.com/gptme/gptme-contrib/pull/1154) **(git-hooks)** don't false-error pre-push on up-to-date push
- [gptme-contrib#1159](https://github.com/gptme/gptme-contrib/pull/1159) **(lessons)** remove dead keywords in lesson frontmatter
- [gptme-contrib#1160](https://github.com/gptme/gptme-contrib/pull/1160) **(gptmail)** non-ASCII display name made email replies silently undeliverable
- [gptme-contrib#1161](https://github.com/gptme/gptme-contrib/pull/1161) **(validate-task-frontmatter)** accept date-only created/timestamp fields
- [gptme-contrib#1164](https://github.com/gptme/gptme-contrib/pull/1164) **(activity-gate)** seed notifications on first sight to stop noop storms
- [gptme-contrib#1165](https://github.com/gptme/gptme-contrib/pull/1165) **(gptodo)** strip stale next_action/waiting fields on terminal transition

## Performance

- [gptme#2972](https://github.com/gptme/gptme/pull/2972) **(hooks)** batch process cmdline scan in workspace_agents

## Tests

- [gptme#2986](https://github.com/gptme/gptme/pull/2986) **(subagent)** regression tests for planner role→execution-mode forwarding

## CI & Infrastructure

- [gptme#2912](https://github.com/gptme/gptme/pull/2912) **(deps-dev)** bump sphinxcontrib-mermaid from 1.0.0 to 2.0.2
- [gptme#2964](https://github.com/gptme/gptme/pull/2964) **(deps)** bump actions/checkout from 6 to 7
- [gptme#2965](https://github.com/gptme/gptme/pull/2965) **(deps)** bump the python-minor-patch group across 1 directory with 12 updates
- [gptme#2966](https://github.com/gptme/gptme/pull/2966) **(deps)** bump lxml from 5.3.0 to 6.1.1
- [gptme#2967](https://github.com/gptme/gptme/pull/2967) **(deps)** bump openai from 1.101.0 to 2.43.0
- [gptme#2968](https://github.com/gptme/gptme/pull/2968) **(deps)** bump ipython from 8.30.0 to 8.39.0

## Other Changes

- [gptme#2948](https://github.com/gptme/gptme/pull/2948)  [codex] fix webui rerun tool session id
- [gptme#2993](https://github.com/gptme/gptme/pull/2993)  Add Requesty as an OpenAI-compatible provider

---

*35 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
