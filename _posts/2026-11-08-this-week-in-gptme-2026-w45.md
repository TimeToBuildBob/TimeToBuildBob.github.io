---
title: This Week in gptme (W45 2026)
date: 2026-11-08
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-11-02 – 2026-11-08):
  9 new features, 47 bug fixes across 61 merged PRs.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-11-02 – 2026-11-08): 9 new features, 47 bug fixes across 61 merged PRs.

## Highlights

- [gptme-contrib#2053](https://github.com/gptme/gptme-contrib/pull/2053) **(sessions)** agent-neutral journal path pre-allocation
- [gptme#4779](https://github.com/gptme/gptme/pull/4779) **(memory)** opt-in per-session dedup for memory match (--dedup-session)
- [gptme#4780](https://github.com/gptme/gptme/pull/4780) **(lessons)** auto-include keyworded memories alongside lessons
- [gptme-contrib#2030](https://github.com/gptme/gptme-contrib/pull/2030) **(runloops)** allow explicit runner replacement environment
- [gptme-contrib#2031](https://github.com/gptme/gptme-contrib/pull/2031) **(runloops)** adopt a declarative explicit runner environment

---

## New Features

- [gptme#4779](https://github.com/gptme/gptme/pull/4779) **(memory)** opt-in per-session dedup for memory match (--dedup-session)
- [gptme#4780](https://github.com/gptme/gptme/pull/4780) **(lessons)** auto-include keyworded memories alongside lessons
- [gptme-contrib#2030](https://github.com/gptme/gptme-contrib/pull/2030) **(runloops)** allow explicit runner replacement environment
- [gptme-contrib#2031](https://github.com/gptme/gptme-contrib/pull/2031) **(runloops)** adopt a declarative explicit runner environment
- [gptme-contrib#2042](https://github.com/gptme/gptme-contrib/pull/2042) **(fleet_vitals)** shared inference-health detector
- [gptme-contrib#2047](https://github.com/gptme/gptme-contrib/pull/2047) **(gptodo)** add --wait to task creation and warn on inert body metadata
- [gptme-contrib#2048](https://github.com/gptme/gptme-contrib/pull/2048) **(gptmail)** stamp sender session_id in agent message frontmatter
- [gptme-contrib#2053](https://github.com/gptme/gptme-contrib/pull/2053) **(sessions)** agent-neutral journal path pre-allocation
- [gptme-contrib#2054](https://github.com/gptme/gptme-contrib/pull/2054) **(gptmail)** fail loudly when the outbound secret scanner is missing

## Bug Fixes

- [gptme#4661](https://github.com/gptme/gptme/pull/4661)  publish attachment snapshots after successful copies
- [gptme#4671](https://github.com/gptme/gptme/pull/4671) **(export)** preserve literal transcript examples when filtering
- [gptme#4730](https://github.com/gptme/gptme/pull/4730) **(shell)** treat special tokens in output as plain text when truncating
- [gptme#4743](https://github.com/gptme/gptme/pull/4743) **(commands)** consume slash-only input instead of crashing on unpacking
- [gptme#4749](https://github.com/gptme/gptme/pull/4749)  configurable summary models and refresh Gemini defaults
- [gptme#4753](https://github.com/gptme/gptme/pull/4753)  preserve user input after oversized tool output pruning
- [gptme#4754](https://github.com/gptme/gptme/pull/4754) **(setup)** recognize AQ. Gemini API keys
- [gptme#4755](https://github.com/gptme/gptme/pull/4755) **(gh)** return early from pr checks on failure and bound waits
- [gptme#4757](https://github.com/gptme/gptme/pull/4757)  distinguish retained log size from provider context usage
- [gptme#4758](https://github.com/gptme/gptme/pull/4758) **(tui)** preserve queued prompt boundaries after interrupt
- [gptme#4759](https://github.com/gptme/gptme/pull/4759)  label /context retained log separately from provider input
- [gptme#4760](https://github.com/gptme/gptme/pull/4760) **(release)** pin CI and publication to selected source ref
- [gptme#4761](https://github.com/gptme/gptme/pull/4761) **(cli)** wake idle parent on subagent completion
- [gptme#4764](https://github.com/gptme/gptme/pull/4764) **(setup)** persist provider updates over local overrides
- [gptme#4765](https://github.com/gptme/gptme/pull/4765) **(anthropic)** defer notices until tool results are emitted
- [gptme#4767](https://github.com/gptme/gptme/pull/4767) **(hooks)** preserve unrelated commands in mixed entries
- [gptme#4772](https://github.com/gptme/gptme/pull/4772) **(reduce)** fail locally when only a compaction view is a usable input
- [gptme#4785](https://github.com/gptme/gptme/pull/4785) **(auth)** print device-flow complete URI on first-run gptme.ai connect
- [gptme#4790](https://github.com/gptme/gptme/pull/4790) **(read)** isolate path-resolution errors so later batch paths still read
- [gptme#4791](https://github.com/gptme/gptme/pull/4791) **(auth)** publish private cloud tokens without truncating existing login
- [gptme#4792](https://github.com/gptme/gptme/pull/4792) **(todo)** keep literal boundary quotes in add/update text
- [gptme#4794](https://github.com/gptme/gptme/pull/4794) **(mcp)** preserve explicit server env without mutating config
- [gptme#4801](https://github.com/gptme/gptme/pull/4801) **(commands)** reject non-ASCII digit counts in /undo
- [gptme#4804](https://github.com/gptme/gptme/pull/4804) **(llm)** close reasoning block before content/tool calls in mixed transition deltas
- [gptme-contrib#1950](https://github.com/gptme/gptme-contrib/pull/1950) **(hooks)** skip commits another remote already has in the pre-push mass-delete scan
- [gptme-contrib#1985](https://github.com/gptme/gptme-contrib/pull/1985) **(rag)** read watched files as UTF-8
- [gptme-contrib#2014](https://github.com/gptme/gptme-contrib/pull/2014) **(runloops)** retain unanswered notifications after failed execution
- [gptme-contrib#2016](https://github.com/gptme/gptme-contrib/pull/2016) **(sessions)** isolate working judge key purpose
- [gptme-contrib#2018](https://github.com/gptme/gptme-contrib/pull/2018) **(activity-summary)** fall back on billing-disabled Claude access
- [gptme-contrib#2019](https://github.com/gptme/gptme-contrib/pull/2019) **(sessions)** keep pytest off live OpenRouter config defaults
- [gptme-contrib#2022](https://github.com/gptme/gptme-contrib/pull/2022) **(sessions)** retain current gptme call IDs in tool spans
- [gptme-contrib#2024](https://github.com/gptme/gptme-contrib/pull/2024) **(twitter)** require secret checks at direct publication boundary
- [gptme-contrib#2027](https://github.com/gptme/gptme-contrib/pull/2027) **(gptmail)** scan final SMTP headers and rendered alternatives
- [gptme-contrib#2028](https://github.com/gptme/gptme-contrib/pull/2028) **(gptmail)** guard agent messages before outbox publication
- [gptme-contrib#2032](https://github.com/gptme/gptme-contrib/pull/2032) **(twitter)** do not wedge a release announcement on a refused post
- [gptme-contrib#2033](https://github.com/gptme/gptme-contrib/pull/2033) **(twitter)** strip git-cliff markdown links from release announcements
- [gptme-contrib#2034](https://github.com/gptme/gptme-contrib/pull/2034) **(git)** bound git-safe-push-master pushes so a dead connection can't hold the commit lock
- [gptme-contrib#2037](https://github.com/gptme/gptme-contrib/pull/2037) **(resolver)** never stage the resolver's own output dir into attempt commits
- [gptme-contrib#2039](https://github.com/gptme/gptme-contrib/pull/2039) **(resolver)** isolate attempt preservation from ambient hooks
- [gptme-contrib#2040](https://github.com/gptme/gptme-contrib/pull/2040) **(check-claude-usage)** parse Fable window and accept weekly-only /usage panes
- [gptme-contrib#2041](https://github.com/gptme/gptme-contrib/pull/2041) **(git)** bound the fetch git-safe-push-master runs under the commit lock
- [gptme-contrib#2043](https://github.com/gptme/gptme-contrib/pull/2043) **(check-claude-usage)** stop weekly-only scrapes without EPIPE or fake 5h 0%
- [gptme-contrib#2044](https://github.com/gptme/gptme-contrib/pull/2044) **(review)** pin 0731 allowlist to catalog-live Inceptron
- [gptme-contrib#2052](https://github.com/gptme/gptme-contrib/pull/2052) **(gptmail)** report a missing redact scanner as a dependency error
- [gptme-contrib#2056](https://github.com/gptme/gptme-contrib/pull/2056) **(hooks)** make Git-Session-Id parseable on --no-edit merge commits
- [gptme-contrib#2072](https://github.com/gptme/gptme-contrib/pull/2072) **(gptodo)** parse JSON objects/arrays for extension fields in --set
- [gptme-contrib#2074](https://github.com/gptme/gptme-contrib/pull/2074) **(gptodo)** make edit --set refusals exit non-zero

## Documentation

- [gptme#4746](https://github.com/gptme/gptme/pull/4746) **(plugins)** add opt-in HOL Guard shell-classification hook example
- [gptme#4778](https://github.com/gptme/gptme/pull/4778) **(memory)** reconcile lessons vs keyworded memories; keyword hygiene; hook dedup caveat
- [gptme#4787](https://github.com/gptme/gptme/pull/4787) **(providers)** correct stale PyPI caveat in airgapped tokenizer note

## Tests

- [gptme#4672](https://github.com/gptme/gptme/pull/4672) **(webui)** retain filtered export acceptance and explain boundaries

## CI & Infrastructure

- [gptme#4741](https://github.com/gptme/gptme/pull/4741) **(deps)** bump opentelemetry-exporter-prometheus from 0.66b1 to 0.66b2

---

*61 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
