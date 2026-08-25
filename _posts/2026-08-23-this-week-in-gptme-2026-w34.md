---
title: This Week in gptme (W34 2026)
date: 2026-08-23
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-08-17 – 2026-08-23):
  33 new features, 29 bug fixes across 83 merged PRs.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-08-17 – 2026-08-23): 33 new features, 29 bug fixes across 83 merged PRs.

## Highlights

- [gptme#3569](https://github.com/gptme/gptme/pull/3569) **(server)** BYOK key validation — warn not block when provider unreachable
- [gptme#3568](https://github.com/gptme/gptme/pull/3568) **(cli)** fatal error envelope + exit taxonomy for non-interactive mode
- [gptme#3574](https://github.com/gptme/gptme/pull/3574) **(cli)** add gptme service init scaffold for headless agents
- [gptme#3529](https://github.com/gptme/gptme/pull/3529) **(harness)** audit assistant harness update requests
- [gptme#3530](https://github.com/gptme/gptme/pull/3530) **(prompts)** Add code editing strategy guidance for improved model performance

---

## New Features

- [gptme#3529](https://github.com/gptme/gptme/pull/3529) **(harness)** audit assistant harness update requests
- [gptme#3530](https://github.com/gptme/gptme/pull/3530) **(prompts)** Add code editing strategy guidance for improved model performance
- [gptme#3559](https://github.com/gptme/gptme/pull/3559) **(prompts)** end responses with a concrete next step
- [gptme#3565](https://github.com/gptme/gptme/pull/3565) **(shell)** opt-in per-shell memory ceiling via GPTME_SHELL_MEMORY_LIMIT
- [gptme#3567](https://github.com/gptme/gptme/pull/3567) **(autocompact)** add keep_head to protect task context from compaction
- [gptme#3568](https://github.com/gptme/gptme/pull/3568) **(cli)** fatal error envelope + exit taxonomy for non-interactive mode
- [gptme#3569](https://github.com/gptme/gptme/pull/3569) **(server)** BYOK key validation — warn not block when provider unreachable
- [gptme#3574](https://github.com/gptme/gptme/pull/3574) **(cli)** add gptme service init scaffold for headless agents
- [gptme#3577](https://github.com/gptme/gptme/pull/3577) **(computer)** allow out-of-tree transports via register_transport()
- [gptme#3580](https://github.com/gptme/gptme/pull/3580) **(precommit)** add check-root-structure hook from gptme-contrib
- [gptme#3586](https://github.com/gptme/gptme/pull/3586) **(service-init)** add launchd support for macOS agents
- [gptme-contrib#1431](https://github.com/gptme/gptme-contrib/pull/1431) **(self-merge)** add skills/ as an allowed self-merge category
- [gptme-contrib#1434](https://github.com/gptme/gptme-contrib/pull/1434) **(skills)** add agentic-presentation skill
- [gptme-contrib#1436](https://github.com/gptme/gptme-contrib/pull/1436) **(precommit)** suggest canonical task_type when a synonym is used
- [gptme-contrib#1437](https://github.com/gptme/gptme-contrib/pull/1437) **(pm)** rename greptile_needs_{fix,improvement} to reviewer_needs_{fix,improvement}
- [gptme-contrib#1439](https://github.com/gptme/gptme-contrib/pull/1439) **(gptme-rag)** add TF-IDF lexical retrieval backend
- [gptme-contrib#1440](https://github.com/gptme/gptme-contrib/pull/1440) **(gptme-rag)** add task-scoped TF-IDF retrieval (Phase 2.3)
- [gptme-contrib#1442](https://github.com/gptme/gptme-contrib/pull/1442) **(bob-status)** add BobStatusProvider for gptme-util status
- [gptme-contrib#1444](https://github.com/gptme/gptme-contrib/pull/1444) **(lessons-cc-hook)** add policy manifest loader and classification for Stage 1 shadow logging
- [gptme-contrib#1455](https://github.com/gptme/gptme-contrib/pull/1455) **(skills)** add test-discovery skill for auto-detecting test runners
- [gptme-contrib#1456](https://github.com/gptme/gptme-contrib/pull/1456) **(pm-dispatch)** add repo exclusion list to stop ActivityWatch/* churn
- [gptme-contrib#1463](https://github.com/gptme/gptme-contrib/pull/1463) **(prompt_templates)** wire fix-worker prompts to use pm-review-and-push wrapper
- [gptme-contrib#1465](https://github.com/gptme/gptme-contrib/pull/1465) **(gptme-rag)** add source-descriptor collection + voice-call de-accumulation (Phase 2.1)
- [gptme-contrib#1466](https://github.com/gptme/gptme-contrib/pull/1466) **(gptme-rag)** memory_type classification + ranking boost (Phase 2.2)
- [gptme-contrib#1468](https://github.com/gptme/gptme-contrib/pull/1468) **(gptme-rag)** add lesson_matcher module — keyword/wildcard, session_categories, BM25
- [gptme-contrib#1470](https://github.com/gptme/gptme-contrib/pull/1470) **(activity-summary)** slot fallback on quota exhaustion via GPTME_CC_FALLBACK_CREDS
- [gptme-contrib#1471](https://github.com/gptme/gptme-contrib/pull/1471) **(gptme-sessions)** ingest lesson_events from the match-lessons hook
- [gptme-contrib#1473](https://github.com/gptme/gptme-contrib/pull/1473) **(twitter)** account profiles, --quote, release announcer
- [gptme-contrib#1478](https://github.com/gptme/gptme-contrib/pull/1478) **(gptmail)** add `agent pull` command for pull-only recipients + version bump
- [gptme-contrib#1479](https://github.com/gptme/gptme-contrib/pull/1479) **(precommit)** make check-root-structure a shareable remote hook
- [gptme-contrib#1484](https://github.com/gptme/gptme-contrib/pull/1484) **(gptmail)** `pending --as` + `failed_agents`/`recipient` in `pull --json` (closes #1476)
- [gptme-contrib#1485](https://github.com/gptme/gptme-contrib/pull/1485) **(skills)** add /end — cross-runtime session wrap-up gate
- [gptme-contrib#1486](https://github.com/gptme/gptme-contrib/pull/1486) **(pm)** route ai-review fix dispatches through the in-band review-and-push wrapper

## Bug Fixes

- [gptme#3546](https://github.com/gptme/gptme/pull/3546) **(server)** validate provider API key before saving it
- [gptme#3547](https://github.com/gptme/gptme/pull/3547) **(review)** verify finding file/line target matches inline comment location
- [gptme#3552](https://github.com/gptme/gptme/pull/3552) **(tauri)** real API-key errors and Windows sidecar startup
- [gptme#3555](https://github.com/gptme/gptme/pull/3555) **(server)** validate provider API key before persisting in BYOK setup
- [gptme#3556](https://github.com/gptme/gptme/pull/3556) **(deps)** bump Python critical security dependencies
- [gptme#3557](https://github.com/gptme/gptme/pull/3557) **(shell)** allowlist permitted flags per binary instead of denying four find flags (GHSA-mfh4-cxj2-jc9p)
- [gptme#3558](https://github.com/gptme/gptme/pull/3558) **(android)** enable mobile cloud sign-in
- [gptme#3571](https://github.com/gptme/gptme/pull/3571) **(grok-subscription)** enable native tools API and add grok-4.6
- [gptme#3573](https://github.com/gptme/gptme/pull/3573) **(tauri)** include pyproject.toml and lock file in sidecar freshness check
- [gptme#3578](https://github.com/gptme/gptme/pull/3578) **(android)** open cloud sign-in in the system browser, not the app WebView
- [gptme#3584](https://github.com/gptme/gptme/pull/3584) **(precommit)** update gptme-contrib rev to post-#1479 merge
- [gptme#3591](https://github.com/gptme/gptme/pull/3591) **(server)** install SIGTERM handler before slow init to prevent silent failure
- [gptme-contrib#1435](https://github.com/gptme/gptme-contrib/pull/1435) **(twitter)** distinguish spend-cap 403 from content-rejection 403
- [gptme-contrib#1441](https://github.com/gptme/gptme-contrib/pull/1441) **(gptodo)** recurring task reset emits valid frontmatter
- [gptme-contrib#1443](https://github.com/gptme/gptme-contrib/pull/1443) **(gptodo)** recurring reset emits state=waiting (fixes validator rejection)
- [gptme-contrib#1447](https://github.com/gptme/gptme-contrib/pull/1447) **(uv)** pin numpy to pypi index to stop recurring lock churn
- [gptme-contrib#1452](https://github.com/gptme/gptme-contrib/pull/1452) **(gptme-rag)** lower watch benchmark threshold to pass on slow CI runners
- [gptme-contrib#1453](https://github.com/gptme/gptme-contrib/pull/1453) **(worker-records)** fetch_pr_snapshot returns None on gh failure (phase 1.3)
- [gptme-contrib#1458](https://github.com/gptme/gptme-contrib/pull/1458) **(sessions)** stop defaulting a score-less judge verdict to 0.5
- [gptme-contrib#1459](https://github.com/gptme/gptme-contrib/pull/1459) **(uv)** add gptme-bob-status to lockfile (missed in #1442)
- [gptme-contrib#1460](https://github.com/gptme/gptme-contrib/pull/1460) **(lessons-extras)** companion-path suggestions must include the category subdir
- [gptme-contrib#1461](https://github.com/gptme/gptme-contrib/pull/1461) **(pm)** stop review-thread reply spam — merge_ready skips human threads, infra-class worker deaths, thread-aware pr_update prompt
- [gptme-contrib#1469](https://github.com/gptme/gptme-contrib/pull/1469) **(run_item)** observe PR effect for every PR-scoped item type
- [gptme-contrib#1472](https://github.com/gptme/gptme-contrib/pull/1472) **(pm)** merge_ready-only dispatches no longer grade a posted comment as effect
- [gptme-contrib#1474](https://github.com/gptme/gptme-contrib/pull/1474) **(pm)** notification state is owned by the handling worker, not the next worker to finish
- [gptme-contrib#1475](https://github.com/gptme/gptme-contrib/pull/1475) **(pm)** direct @mention items get assigned_issue timeout floor (1500s)
- [gptme-contrib#1482](https://github.com/gptme/gptme-contrib/pull/1482) **(gptodo)** isolate scoped check load errors
- [gptme-contrib#1483](https://github.com/gptme/gptme-contrib/pull/1483) **(sessions)** grok background-task outputs invisible to signal extraction (8/8 false noops)
- [gptme-contrib#1488](https://github.com/gptme/gptme-contrib/pull/1488) **(lessons)** exclude newline from companion-link path-component regex

## Performance

- [gptme-contrib#1464](https://github.com/gptme/gptme-contrib/pull/1464) **(check-notifications)** add PR/issue state caching for 60-70% call reduction

## Refactors

- [gptme#3537](https://github.com/gptme/gptme/pull/3537) **(cli)** move Bob-specific status fields out of core; add StatusProvider extension point
- [gptme#3561](https://github.com/gptme/gptme/pull/3561) **(tools/read)** decouple read tool examples from hashline conventions
- [gptme#3562](https://github.com/gptme/gptme/pull/3562) **(tools/read)** fully decouple read.py from _hashline_snapshot
- [gptme#3564](https://github.com/gptme/gptme/pull/3564) **(tests)** move hashline snapshot test out of test_tools_read.py
- [gptme-contrib#1446](https://github.com/gptme/gptme-contrib/pull/1446) **(structure)** clean up root dir, remove knowledge/ and state/, add root-structure CI check
- [gptme-contrib#1467](https://github.com/gptme/gptme-contrib/pull/1467) **(precommit)** simplify check_root_structure to use git ls-files + add tests

## Documentation

- [gptme#3554](https://github.com/gptme/gptme/pull/3554) **(design)** complete PTC audit — paper citation + full tools/ coverage
- [gptme#3563](https://github.com/gptme/gptme/pull/3563)  fix providers.rst structure, nest provider/browser pages, add Tool Formats guide
- [gptme#3572](https://github.com/gptme/gptme/pull/3572) **(models)** cite the grok-4.6 model card
- [gptme#3582](https://github.com/gptme/gptme/pull/3582)  document subscription auth (ChatGPT Plus/Pro, SuperGrok) in README and providers docs
- [gptme#3588](https://github.com/gptme/gptme/pull/3588)  add headless agents section with gptme service init example
- [gptme-contrib#1477](https://github.com/gptme/gptme-contrib/pull/1477)  overhaul root README + add scripts/README index
- [gptme-contrib#1480](https://github.com/gptme/gptme-contrib/pull/1480)  add ai-reviewer.md (what the AI review comment is, maintainer commands)

## Tests

- [gptme#3581](https://github.com/gptme/gptme/pull/3581) **(webui)** add regression test for BYOK 422 invalid-key rejection (#3545)
- [gptme#3590](https://github.com/gptme/gptme/pull/3590) **(server)** add subprocess integration test for server startup (#3589)

## CI & Infrastructure

- [gptme#3535](https://github.com/gptme/gptme/pull/3535)  add a focused Windows path/config smoke lane
- [gptme#3585](https://github.com/gptme/gptme/pull/3585)  add dependency advisory gate (Phase 1, non-blocking)
- [gptme#3599](https://github.com/gptme/gptme/pull/3599) **(deps)** bump actions/checkout from 4 to 7
- [gptme#3600](https://github.com/gptme/gptme/pull/3600) **(deps)** bump astral-sh/setup-uv from 5 to 7

## Other Changes

- [gptme-contrib#1449](https://github.com/gptme/gptme-contrib/pull/1449) **(root)** consolidate schemas/, tools/, commands/ into docs/, scripts/

---

*83 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
