---
title: This Week in gptme (W44 2026)
date: 2026-11-01
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-10-26 – 2026-11-01):
  5 new features, 114 bug fixes across 131 merged PRs.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-10-26 – 2026-11-01): 5 new features, 114 bug fixes across 131 merged PRs.

## Highlights

- [gptme#4510](https://github.com/gptme/gptme/pull/4510) **(tauri)** Windows Authenticode signing for installer and sidecar
- [gptme#4500](https://github.com/gptme/gptme/pull/4500) **(models)** update gptme managed default to openrouter/anthropic/claude-sonnet-5.5
- [gptme#4516](https://github.com/gptme/gptme/pull/4516) **(providers)** add OpenCode Go DeepSeek support
- [gptme-contrib#1983](https://github.com/gptme/gptme-contrib/pull/1983) **(runloops)** dispatch review-only contributor PR sessions
- [gptme-contrib#1989](https://github.com/gptme/gptme-contrib/pull/1989) **(imagen)** add AUTOMATIC1111 local Stable Diffusion provider

---

## New Features

- [gptme#4500](https://github.com/gptme/gptme/pull/4500) **(models)** update gptme managed default to openrouter/anthropic/claude-sonnet-5.5
- [gptme#4510](https://github.com/gptme/gptme/pull/4510) **(tauri)** Windows Authenticode signing for installer and sidecar
- [gptme#4516](https://github.com/gptme/gptme/pull/4516) **(providers)** add OpenCode Go DeepSeek support
- [gptme-contrib#1983](https://github.com/gptme/gptme-contrib/pull/1983) **(runloops)** dispatch review-only contributor PR sessions
- [gptme-contrib#1989](https://github.com/gptme/gptme-contrib/pull/1989) **(imagen)** add AUTOMATIC1111 local Stable Diffusion provider

## Bug Fixes

- [gptme#4473](https://github.com/gptme/gptme/pull/4473) **(webui)** bind task queries and actions to their API owner
- [gptme#4474](https://github.com/gptme/gptme/pull/4474) **(workspace)** preserve attachment roots in glTF previews
- [gptme#4475](https://github.com/gptme/gptme/pull/4475) **(webui)** only offer supported task detail actions
- [gptme#4476](https://github.com/gptme/gptme/pull/4476) **(telemetry)** make SDK content capture opt-in
- [gptme#4477](https://github.com/gptme/gptme/pull/4477) **(clipboard)** support copy to clipboard on Windows
- [gptme#4478](https://github.com/gptme/gptme/pull/4478) **(deps)** bump sanitize-html and postcss-selector-parser for open npm advisories
- [gptme#4479](https://github.com/gptme/gptme/pull/4479) **(webui)** show native tool arguments before confirmation
- [gptme#4481](https://github.com/gptme/gptme/pull/4481) **(ci)** drop Python 3.10 (EOL) to fix Security Advisories workflow
- [gptme#4482](https://github.com/gptme/gptme/pull/4482) **(models)** hide retired Gemini Flash Lite from setup
- [gptme#4484](https://github.com/gptme/gptme/pull/4484) **(chats)** re-root forked conversation attachment references
- [gptme#4485](https://github.com/gptme/gptme/pull/4485) **(codeblock)** normalize line endings before excluding thinking blocks
- [gptme#4486](https://github.com/gptme/gptme/pull/4486) **(desktop)** adopt Wry per-download failure isolation
- [gptme#4487](https://github.com/gptme/gptme/pull/4487) **(logmanager)** skip rows with non-object metadata when listing conversations
- [gptme#4488](https://github.com/gptme/gptme/pull/4488) **(cli)** parse both gptme.toml file schemas in context files
- [gptme#4489](https://github.com/gptme/gptme/pull/4489) **(server)** derive subscription-connect default model from recommended models
- [gptme#4492](https://github.com/gptme/gptme/pull/4492)  validate generated name word roles
- [gptme#4493](https://github.com/gptme/gptme/pull/4493) **(tests)** isolate user config writes from developer home
- [gptme#4494](https://github.com/gptme/gptme/pull/4494) **(cli)** ship media wavs in wheels so sound list works
- [gptme#4497](https://github.com/gptme/gptme/pull/4497) **(slop)** don't split staccato sentences on abbreviation and version periods
- [gptme#4498](https://github.com/gptme/gptme/pull/4498) **(agent)** keep template gptme.toml intact on create; accept legacy form in doctor
- [gptme#4499](https://github.com/gptme/gptme/pull/4499) **(server)** refuse edit on native tool calls instead of running the original
- [gptme#4501](https://github.com/gptme/gptme/pull/4501) **(tauri)** bind re-signed AppImage signature to the bundler's app version
- [gptme#4502](https://github.com/gptme/gptme/pull/4502) **(security)** upgrade deps to fix Security Advisories CI (brotli, filelock, setuptools, virtualenv)
- [gptme#4503](https://github.com/gptme/gptme/pull/4503) **(webui)** supply API owner in suggested action tests
- [gptme#4505](https://github.com/gptme/gptme/pull/4505) **(context)** use NUL-delimited git ls-files to handle quoted filenames
- [gptme#4506](https://github.com/gptme/gptme/pull/4506) **(ci)** bound and cache Tauri apt dependency setup
- [gptme#4508](https://github.com/gptme/gptme/pull/4508) **(export)** embed CDN dependencies inline for offline HTML rendering
- [gptme#4512](https://github.com/gptme/gptme/pull/4512) **(memory)** quote YAML-scalar names in to_markdown
- [gptme#4515](https://github.com/gptme/gptme/pull/4515) **(message)** emit valid TOML for boolean and null metadata
- [gptme#4517](https://github.com/gptme/gptme/pull/4517) **(tauri)** register AppImage callbacks without desktop-file-utils
- [gptme#4518](https://github.com/gptme/gptme/pull/4518) **(commands)** allow aborting invalid TOML conversation edits
- [gptme#4520](https://github.com/gptme/gptme/pull/4520) **(subagent)** track branch ownership during worktree cleanup
- [gptme#4522](https://github.com/gptme/gptme/pull/4522)  respect zero trailing lines in message truncation
- [gptme#4523](https://github.com/gptme/gptme/pull/4523)  keep concurrent cost summaries coherent
- [gptme#4525](https://github.com/gptme/gptme/pull/4525) **(dataset)** count persisted tool syntax across formats
- [gptme#4526](https://github.com/gptme/gptme/pull/4526) **(tools)** preserve line endings in patch_many and hashline_edit
- [gptme#4527](https://github.com/gptme/gptme/pull/4527) **(tools)** keep file mode in hashline_edit atomic write
- [gptme#4529](https://github.com/gptme/gptme/pull/4529) **(checkpoint)** honor dirty restore at the checkpoint HEAD
- [gptme#4530](https://github.com/gptme/gptme/pull/4530) **(backtrack)** verify named checkpoint conversation prefix
- [gptme#4532](https://github.com/gptme/gptme/pull/4532) **(chats)** retain explicit fork restrictions and profile
- [gptme#4533](https://github.com/gptme/gptme/pull/4533) **(export)** mark standalone attachments as omitted
- [gptme#4534](https://github.com/gptme/gptme/pull/4534) **(deps)** upgrade Tornado to 6.6 for security advisories
- [gptme#4535](https://github.com/gptme/gptme/pull/4535) **(config)** tolerate malformed provider containers before overlay merge
- [gptme#4537](https://github.com/gptme/gptme/pull/4537) **(todo)** isolate working memory by conversation
- [gptme#4538](https://github.com/gptme/gptme/pull/4538) **(convert)** select first frame for PNG and JPEG output
- [gptme#4540](https://github.com/gptme/gptme/pull/4540) **(append)** dispatch file-save lifecycle hooks
- [gptme#4542](https://github.com/gptme/gptme/pull/4542) **(morph)** preserve provider response boundary whitespace
- [gptme#4543](https://github.com/gptme/gptme/pull/4543) **(vision)** normalize palette images before JPEG compression
- [gptme#4544](https://github.com/gptme/gptme/pull/4544) **(rag)** isolate exact project storage identities
- [gptme#4545](https://github.com/gptme/gptme/pull/4545) **(gh)** fail closed on unsuccessful check conclusions
- [gptme#4548](https://github.com/gptme/gptme/pull/4548) **(vision)** preserve EXIF display orientation during compression
- [gptme#4550](https://github.com/gptme/gptme/pull/4550) **(chats)** retain matching text in external search snippets
- [gptme#4551](https://github.com/gptme/gptme/pull/4551) **(logmanager)** preserve current context on failed and child loads
- [gptme#4552](https://github.com/gptme/gptme/pull/4552) **(subagent)** recover final prose for native completion
- [gptme#4554](https://github.com/gptme/gptme/pull/4554)  only report actual tool format changes on model switch
- [gptme#4559](https://github.com/gptme/gptme/pull/4559) **(tui)** collapse long single-line tool output
- [gptme#4560](https://github.com/gptme/gptme/pull/4560) **(convert)** treat image output filenames literally
- [gptme#4561](https://github.com/gptme/gptme/pull/4561) **(restart)** preserve option values using interface definitions
- [gptme#4563](https://github.com/gptme/gptme/pull/4563) **(choice)** preserve numeric labels when stripping list prefixes
- [gptme#4565](https://github.com/gptme/gptme/pull/4565) **(form)** recognize documented slash boolean syntax
- [gptme#4567](https://github.com/gptme/gptme/pull/4567)  recover terminal tool calls after partial Responses streams
- [gptme#4568](https://github.com/gptme/gptme/pull/4568) **(tui)** deliver child and watch events with safe idle continuation
- [gptme#4570](https://github.com/gptme/gptme/pull/4570) **(watch)** observe child exit independently of stdout EOF
- [gptme#4572](https://github.com/gptme/gptme/pull/4572) **(convert)** treat video thumbnail filenames literally
- [gptme#4573](https://github.com/gptme/gptme/pull/4573) **(tmux)** preserve escaped quotes when splitting commands
- [gptme#4583](https://github.com/gptme/gptme/pull/4583) **(chats)** attribute mixed-model statistics to originating models
- [gptme#4585](https://github.com/gptme/gptme/pull/4585) **(chats)** recover bounded full messages at stable search coordinates
- [gptme#4588](https://github.com/gptme/gptme/pull/4588) **(convert)** publish LibreOffice output across filesystems
- [gptme#4589](https://github.com/gptme/gptme/pull/4589) **(read)** decode explicit damaged-file ranges consistently
- [gptme#4591](https://github.com/gptme/gptme/pull/4591) **(packaging)** use PEP 621-native build configuration
- [gptme#4595](https://github.com/gptme/gptme/pull/4595) **(tools)** reject unencodable edits before truncating files
- [gptme#4597](https://github.com/gptme/gptme/pull/4597) **(patch)** preserve literal ellipsis comments and context
- [gptme#4599](https://github.com/gptme/gptme/pull/4599) **(dirs)** decode Git workspace paths as UTF-8
- [gptme#4603](https://github.com/gptme/gptme/pull/4603) **(anthropic)** serialize non-streaming tool inputs as JSON
- [gptme#4604](https://github.com/gptme/gptme/pull/4604) **(anthropic)** normalize tool results before native system messages
- [gptme#4611](https://github.com/gptme/gptme/pull/4611) **(shell)** skip escaped pipes when protecting pipeline stdin
- [gptme#4613](https://github.com/gptme/gptme/pull/4613) **(shell)** preserve output boundaries across multiline commands
- [gptme#4619](https://github.com/gptme/gptme/pull/4619) **(save)** bind overwrite approval to previewed file baseline
- [gptme#4620](https://github.com/gptme/gptme/pull/4620) **(morph)** reject nonregular sources before reads and inference
- [gptme#4623](https://github.com/gptme/gptme/pull/4623)  preserve ordered Responses assistant phases through replay
- [gptme#4627](https://github.com/gptme/gptme/pull/4627) **(convert)** preserve ImageMagick displayed EXIF orientation
- [gptme#4628](https://github.com/gptme/gptme/pull/4628) **(memory)** keep retired entries out of legacy indexes
- [gptme#4633](https://github.com/gptme/gptme/pull/4633) **(hashline)** consume multiline continuation headers
- [gptme#4637](https://github.com/gptme/gptme/pull/4637) **(browser)** encode literal Lynx search query values
- [gptme#4650](https://github.com/gptme/gptme/pull/4650) **(browser)** preserve literal code during markdown cleanup
- [gptme#4651](https://github.com/gptme/gptme/pull/4651) **(todo)** distinguish mixed-format pending call offsets
- [gptme#4654](https://github.com/gptme/gptme/pull/4654) **(tui)** preserve literal thinking tags in tool payloads
- [gptme#4655](https://github.com/gptme/gptme/pull/4655) **(context)** require explicit prompt path attachments by default
- [gptme#4656](https://github.com/gptme/gptme/pull/4656) **(browser)** accept basename screenshot destinations
- [gptme#4660](https://github.com/gptme/gptme/pull/4660) **(llm)** recover uncommitted generations within one bounded budget
- [gptme#4664](https://github.com/gptme/gptme/pull/4664) **(tests)** type stream unwrap and shared writer handlers
- [gptme-contrib#1947](https://github.com/gptme/gptme-contrib/pull/1947) **(greptile)** verify review head through memoized REST read
- [gptme-contrib#1948](https://github.com/gptme/gptme-contrib/pull/1948) **(review)** let completion callers floor the affordable-token retry
- [gptme-contrib#1949](https://github.com/gptme/gptme-contrib/pull/1949) **(voice)** kill the subagent tree when a cancel lands during spawn
- [gptme-contrib#1953](https://github.com/gptme/gptme-contrib/pull/1953) **(runloops)** reject unsuccessful Claude one-shot results
- [gptme-contrib#1972](https://github.com/gptme/gptme-contrib/pull/1972) **(deps)** lock Pillow 13.0.0 and certifi 2026.10.19 for open security alerts
- [gptme-contrib#1973](https://github.com/gptme/gptme-contrib/pull/1973) **(usage)** align gptme-usage tests with the haiku-5-5 alias pin
- [gptme-contrib#1975](https://github.com/gptme/gptme-contrib/pull/1975) **(coordination)** retry the WAL conversion so concurrent first opens don't fail
- [gptme-contrib#1976](https://github.com/gptme/gptme-contrib/pull/1976) **(codegraph)** exercise tree-sitter tests in CI
- [gptme-contrib#1978](https://github.com/gptme/gptme-contrib/pull/1978) **(ci)** bind package matrix tests to the labelled Python runtime
- [gptme-contrib#1979](https://github.com/gptme/gptme-contrib/pull/1979) **(deps)** raise the root Python floor to the workspace lock so Dependabot can resolve
- [gptme-contrib#1980](https://github.com/gptme/gptme-contrib/pull/1980) **(activity-summary)** correct human report data and failure status
- [gptme-contrib#1981](https://github.com/gptme/gptme-contrib/pull/1981) **(activity-summary)** preserve configured ActivityWatch URL
- [gptme-contrib#1986](https://github.com/gptme/gptme-contrib/pull/1986) **(voice)** pin callback tests to midday UTC
- [gptme-contrib#1987](https://github.com/gptme/gptme-contrib/pull/1987) **(sessions)** keep row order in SessionStore.rewrite upserts
- [gptme-contrib#1991](https://github.com/gptme/gptme-contrib/pull/1991) **(github)** prefer Greptile summary SHA over thread-reply reviews
- [gptme-contrib#1992](https://github.com/gptme/gptme-contrib/pull/1992) **(runloops)** count a same-head re-review that clears all findings as an effect
- [gptme-contrib#1994](https://github.com/gptme/gptme-contrib/pull/1994) **(repo-status)** ignore fork-master pull_request runs in the default-branch window
- [gptme-contrib#1995](https://github.com/gptme/gptme-contrib/pull/1995) **(repo-status)** don't stale-annotate schedule runs by SHA
- [gptme-contrib#1998](https://github.com/gptme/gptme-contrib/pull/1998) **(skills)** align test-discovery detector with gptme's canonical detector
- [gptme-contrib#2001](https://github.com/gptme/gptme-contrib/pull/2001) **(hooks)** warn when the node_modules donor has empty or half-installed package dirs
- [gptme-contrib#2003](https://github.com/gptme/gptme-contrib/pull/2003) **(deps)** upgrade setuptools to patched 84.1.0
- [gptme-contrib#2008](https://github.com/gptme/gptme-contrib/pull/2008) **(git)** reject unknown push arguments and add safe preview
- [gptme-contrib#2009](https://github.com/gptme/gptme-contrib/pull/2009) **(sessions)** isolate runloop tests and reject non-text identities

## Performance

- [gptme-contrib#2007](https://github.com/gptme/gptme-contrib/pull/2007) **(gptodo)** use safe libyaml frontmatter loader when available

## Documentation

- [gptme#4615](https://github.com/gptme/gptme/pull/4615) **(shell)** explain explicit background state isolation
- [gptme-contrib#1886](https://github.com/gptme/gptme-contrib/pull/1886) **(community)** add reproducible tooling bug issue form
- [gptme-contrib#1999](https://github.com/gptme/gptme-contrib/pull/1999) **(imagen)** document the AUTOMATIC1111 provider and add an a1111 extra

## Tests

- [gptme#4521](https://github.com/gptme/gptme/pull/4521)  isolate mocked GitHub tests from gh installation
- [gptme#4643](https://github.com/gptme/gptme/pull/4643) **(dirs)** preserve resolver types in locale regressions
- [gptme-contrib#1969](https://github.com/gptme/gptme-contrib/pull/1969) **(plugins)** guard plugin tools against the native tool-call format
- [gptme-contrib#1984](https://github.com/gptme/gptme-contrib/pull/1984) **(lessons)** isolate concurrent admission from selector deadlines

## CI & Infrastructure

- [gptme-contrib#1974](https://github.com/gptme/gptme-contrib/pull/1974) **(packages)** discover the package matrix by tests/ presence, not Makefile
- [gptme-contrib#1996](https://github.com/gptme/gptme-contrib/pull/1996) **(deps)** bump the uv group across 1 directory with 2 updates
- [gptme-contrib#1997](https://github.com/gptme/gptme-contrib/pull/1997)  coalesce queued master-push runs without losing diff coverage
- [gptme-contrib#2000](https://github.com/gptme/gptme-contrib/pull/2000) **(skills)** run skills/*/tests suites in CI

---

*131 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
