---
title: This Week in gptme (W41 2026)
date: 2026-10-11
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-10-05 – 2026-10-11):
  12 new features, 78 bug fixes across 113 merged PRs.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-10-05 – 2026-10-11): 12 new features, 78 bug fixes across 113 merged PRs.

## Highlights

- [gptme#4218](https://github.com/gptme/gptme/pull/4218) **(webui)** expose server-owned global MCP settings
- [gptme-contrib#1859](https://github.com/gptme/gptme-contrib/pull/1859) **(sessions)** persist attributed git summaries
- [gptme-contrib#1861](https://github.com/gptme/gptme-contrib/pull/1861) **(sessions)** publish typed export feed with authoritative run types
- [gptme#4174](https://github.com/gptme/gptme/pull/4174) **(compaction)** remind normal tool loop before context budget
- [gptme#4205](https://github.com/gptme/gptme/pull/4205) **(util)** add `gptme-util sound` to play notification sounds from other harnesses

## From the Blog

- [The Browser Path Selected the Wrong Engine](/blog/the-browser-path-selected-the-wrong-engine/)
- [The Quickstart Started Inside the Checkout](/blog/the-quickstart-started-inside-the-checkout/)
- [The Stream Failed Successfully](/blog/the-stream-failed-successfully/)
- [Agents in the Discovery Loop](/blog/agents-in-the-discovery-loop/)
- [Black box to flight recorder: diagnosing autonomous agent stalls with resource pressure](/blog/flight-recorder-for-agents/)
- [The Project Name Was a TOML Injection](/blog/the-project-name-was-a-toml-injection/)
- [What the Trajectory Tells You](/blog/what-the-trajectory-tells-you/)
- [Anti-Slop Em-Dash Scoring Was Truncating Short Texts](/blog/anti-slop-em-dash-fractional-tolerance/)
- [Loading an MCP server shouldn't require a full reconnect to register its tools](/blog/mcp-dynamic-toolspec-registration/)
- [OpenAI Responses API Rejects Orphaned Tool Outputs](/blog/openai-responses-api-orphaned-tool-outputs/)
- [When Agent Instructions Backfire: Using LOO Analysis to Measure What Actually Helps](/blog/lesson-loo-analysis-signal/)
- [Lock Once at the Boundary](/blog/lock-once-at-the-boundary/)
- [LXC for AI Agents: What Docker Gets Wrong for Long-Running Workloads](/blog/lxc-for-ai-agents/)
- [Twenty-Five Locks Per Test Run](/blog/twenty-five-locks-per-test-run/)

---

## New Features

- [gptme#4174](https://github.com/gptme/gptme/pull/4174) **(compaction)** remind normal tool loop before context budget
- [gptme#4205](https://github.com/gptme/gptme/pull/4205) **(util)** add `gptme-util sound` to play notification sounds from other harnesses
- [gptme#4218](https://github.com/gptme/gptme/pull/4218) **(webui)** expose server-owned global MCP settings
- [gptme#4223](https://github.com/gptme/gptme/pull/4223) **(compaction)** run checkpoint through normal tool loop
- [gptme#4224](https://github.com/gptme/gptme/pull/4224) **(compaction)** make dropped tool results recallable
- [gptme#4229](https://github.com/gptme/gptme/pull/4229) **(models)** register Mistral Large 4
- [gptme-contrib#1846](https://github.com/gptme/gptme-contrib/pull/1846) **(skills)** add html-artifact-qa skill — interactive HTML artifacts for complex Q&A
- [gptme-contrib#1850](https://github.com/gptme/gptme-contrib/pull/1850) **(rag)** add bm25_min_z override to score_lessons
- [gptme-contrib#1851](https://github.com/gptme/gptme-contrib/pull/1851) **(gptmail)** append send-audit comment to sent files; add allowlist-bypass tests
- [gptme-contrib#1859](https://github.com/gptme/gptme-contrib/pull/1859) **(sessions)** persist attributed git summaries
- [gptme-contrib#1861](https://github.com/gptme/gptme-contrib/pull/1861) **(sessions)** publish typed export feed with authoritative run types
- [gptme-contrib#1865](https://github.com/gptme/gptme-contrib/pull/1865) **(gptme-usage)** register claude-haiku-5-5 in CC_MODEL_IDS

## Bug Fixes

- [gptme#4123](https://github.com/gptme/gptme/pull/4123) **(compaction)** share bounded overflow recovery across CLI and server
- [gptme#4125](https://github.com/gptme/gptme/pull/4125) **(anthropic)** register Claude 5 models and use supported thinking modes
- [gptme#4126](https://github.com/gptme/gptme/pull/4126) **(telemetry)** use Fable 5.1 cached-input pricing
- [gptme#4148](https://github.com/gptme/gptme/pull/4148) **(webui)** gate sidebar external-sessions query on server capability
- [gptme#4149](https://github.com/gptme/gptme/pull/4149) **(webui)** anchor toasts at the top so they never cover the composer
- [gptme#4151](https://github.com/gptme/gptme/pull/4151) **(telemetry)** account for explicit OpenRouter cache-read prices
- [gptme#4166](https://github.com/gptme/gptme/pull/4166) **(openai-subscription)** clamp Codex instructions to 1MB char cap
- [gptme#4168](https://github.com/gptme/gptme/pull/4168) **(browser)** configure executable independently of engine
- [gptme#4170](https://github.com/gptme/gptme/pull/4170) **(responses)** surface explicit SSE generation failures
- [gptme#4171](https://github.com/gptme/gptme/pull/4171) **(llm)** accept mixed-case image attachment extensions
- [gptme#4172](https://github.com/gptme/gptme/pull/4172) **(compaction)** reject empty summarize checkpoints
- [gptme#4173](https://github.com/gptme/gptme/pull/4173) **(init)** report invalid gptme-init targets as clean errors
- [gptme#4175](https://github.com/gptme/gptme/pull/4175) **(init)** escape project name when writing gptme.toml
- [gptme#4176](https://github.com/gptme/gptme/pull/4176) **(cli)** clean errors for non-UTF-8 input files (tokens count, attest verify, capabilities)
- [gptme#4177](https://github.com/gptme/gptme/pull/4177) **(cli)** tolerate non-UTF-8 .gitignore and journal files in context commands
- [gptme#4178](https://github.com/gptme/gptme/pull/4178) **(hooks)** reject malformed Claude Code settings.json instead of crashing
- [gptme#4179](https://github.com/gptme/gptme/pull/4179) **(config)** reject non-list prompt.files and other string-list project settings
- [gptme#4180](https://github.com/gptme/gptme/pull/4180) **(preview)** send Cache-Control private, no-store on preview responses
- [gptme#4181](https://github.com/gptme/gptme/pull/4181) **(lessons)** coerce non-string frontmatter name to str
- [gptme#4182](https://github.com/gptme/gptme/pull/4182) **(logmanager)** skip corrupt conversation lines instead of failing the whole read
- [gptme#4183](https://github.com/gptme/gptme/pull/4183) **(compaction)** re-compaction carries the previous checkpoint and drops stale intros
- [gptme#4184](https://github.com/gptme/gptme/pull/4184) **(cli)** reject unknown --provider in models list instead of listing nothing
- [gptme#4185](https://github.com/gptme/gptme/pull/4185) **(context)** skip unreadable files in prompt path inclusion instead of crashing
- [gptme#4187](https://github.com/gptme/gptme/pull/4187) **(context)** read only the capped prefix of large files named in a prompt
- [gptme#4189](https://github.com/gptme/gptme/pull/4189) **(agents)** don't attribute the newest log dir to unnamed gptme processes
- [gptme#4190](https://github.com/gptme/gptme/pull/4190) **(save)** refuse non-regular-file targets instead of hanging on a FIFO
- [gptme#4191](https://github.com/gptme/gptme/pull/4191) **(read)** stream line ranges of large files instead of loading them whole
- [gptme#4192](https://github.com/gptme/gptme/pull/4192) **(chats)** skip malformed external sessions instead of aborting the search
- [gptme#4195](https://github.com/gptme/gptme/pull/4195) **(anti-slop)** use fractional em-dash excess so short texts aren't over-penalised
- [gptme#4196](https://github.com/gptme/gptme/pull/4196) **(tokens)** warn when model has no native tiktoken encoding
- [gptme#4197](https://github.com/gptme/gptme/pull/4197) **(message)** don't append ellipsis to short oneline messages
- [gptme#4198](https://github.com/gptme/gptme/pull/4198) **(chats)** reject blank and normalize multi-line names in chats rename
- [gptme#4202](https://github.com/gptme/gptme/pull/4202) **(ci)** disable provenance attestation on Docker push to fix GHCR unknown blob
- [gptme#4203](https://github.com/gptme/gptme/pull/4203) **(computer)** audit-log sees keyword/positional computer() calls via AST
- [gptme#4206](https://github.com/gptme/gptme/pull/4206) **(openai-responses)** clamp instructions to 1MB char cap for Responses API
- [gptme#4207](https://github.com/gptme/gptme/pull/4207) **(openai-responses)** drop orphaned tool results with no preceding call
- [gptme#4208](https://github.com/gptme/gptme/pull/4208) **(subagent)** cap thread-mode subagent LLM request timeout by remaining deadline
- [gptme#4209](https://github.com/gptme/gptme/pull/4209) **(webui)** navigate before clearing store on conversation delete
- [gptme#4210](https://github.com/gptme/gptme/pull/4210) **(models-info)** exit 1 when model resolves to unknown provider
- [gptme#4211](https://github.com/gptme/gptme/pull/4211) **(slop)** lower STACCATO_MAX_WORDS 8→7 to fix false positive on technical doc sentences
- [gptme#4215](https://github.com/gptme/gptme/pull/4215) **(mcp)** load_mcp_server now registers ToolSpecs and updates cache
- [gptme#4220](https://github.com/gptme/gptme/pull/4220) **(cli)** keep plugin subcommand args opaque to gptme's own options
- [gptme#4221](https://github.com/gptme/gptme/pull/4221) **(anthropic)** pass an explicit timeout so non-streaming chat() accepts 64k+ max_tokens
- [gptme#4222](https://github.com/gptme/gptme/pull/4222) **(llm)** reject an exhausted stream with no output instead of persisting an empty assistant turn
- [gptme#4231](https://github.com/gptme/gptme/pull/4231) **(ci)** retry apt-get update up to 3 times with timeout
- [gptme#4235](https://github.com/gptme/gptme/pull/4235) **(mcp)** preserve complete search queries
- [gptme#4236](https://github.com/gptme/gptme/pull/4236) **(compaction)** reland #4224-#4226 that merged into a stacked branch
- [gptme#4239](https://github.com/gptme/gptme/pull/4239) **(server)** reject an exhausted stream with no output instead of persisting an empty assistant turn
- [gptme#4241](https://github.com/gptme/gptme/pull/4241) **(test)** use column check instead of substring check in test_shell_session_records_its_pgid
- [gptme#4243](https://github.com/gptme/gptme/pull/4243) **(server)** honor TOOL_FORMAT and parse native tool calls in steps
- [gptme-contrib#1838](https://github.com/gptme/gptme-contrib/pull/1838) **(gptodo)** share locked atomic lifecycle mutations across writers
- [gptme-contrib#1839](https://github.com/gptme/gptme-contrib/pull/1839) **(sessions)** separate reusable labels from canonical run identity
- [gptme-contrib#1840](https://github.com/gptme/gptme-contrib/pull/1840) **(gptodo)** make repeated subtask edits validated and atomic
- [gptme-contrib#1842](https://github.com/gptme/gptme-contrib/pull/1842) **(sessions)** skip non-object records when parsing trajectories
- [gptme-contrib#1843](https://github.com/gptme/gptme-contrib/pull/1843) **(gptodo)** coerce non-list dependency/tag fields instead of crashing every command
- [gptme-contrib#1844](https://github.com/gptme/gptme-contrib/pull/1844) **(sessions)** tolerate undecodable bytes in the session store
- [gptme-contrib#1845](https://github.com/gptme/gptme-contrib/pull/1845) **(activity-gate)** drop bot/self comment notifications on closed threads
- [gptme-contrib#1847](https://github.com/gptme/gptme-contrib/pull/1847) **(gptmail)** handle empty-value headers; suppress X-GitHub-* context noise
- [gptme-contrib#1848](https://github.com/gptme/gptme-contrib/pull/1848) **(openrouter)** gate availability on account balance, not just daily limit
- [gptme-contrib#1852](https://github.com/gptme/gptme-contrib/pull/1852) **(gptmail)** exclude send-audit trailers from archive deduplication
- [gptme-contrib#1853](https://github.com/gptme/gptme-contrib/pull/1853) **(activity-gate)** suppress repeat self-actor PR notifications
- [gptme-contrib#1854](https://github.com/gptme/gptme-contrib/pull/1854) **(gptodo)** reject done transitions with pending checkboxes
- [gptme-contrib#1855](https://github.com/gptme/gptme-contrib/pull/1855) **(greptile)** always confirm PR head with a live read before re-review check
- [gptme-contrib#1856](https://github.com/gptme/gptme-contrib/pull/1856) **(gptme-sessions)** narrow _fcntl type so pyright can verify flock usage
- [gptme-contrib#1857](https://github.com/gptme/gptme-contrib/pull/1857) **(gptme-sessions)** resolve 14 pyright/mypy type errors
- [gptme-contrib#1858](https://github.com/gptme/gptme-contrib/pull/1858) **(gptme-runloops)** annotate model_usage as dict[str, Any] to resolve no-any-return
- [gptme-contrib#1860](https://github.com/gptme/gptme-contrib/pull/1860) **(pre-commit)** scope typecheck-packages hook to staged changes
- [gptme-contrib#1862](https://github.com/gptme/gptme-contrib/pull/1862) **(codex-usage)** start codex with --no-daemon, parse 12h reset times
- [gptme-contrib#1863](https://github.com/gptme/gptme-contrib/pull/1863) **(hooks)** never run prek without --files (bare run stashes the worktree)
- [gptme-contrib#1864](https://github.com/gptme/gptme-contrib/pull/1864) **(repo-status)** report a red workflow even when a newer different workflow passed
- [gptme-contrib#1866](https://github.com/gptme/gptme-contrib/pull/1866) **(sessions)** keep Grok FileContent, GrepSearch, and SearchReplace results
- [gptme-contrib#1867](https://github.com/gptme/gptme-contrib/pull/1867) **(sessions)** keep Copilot tool error text and call/result linkage
- [gptme-contrib#1868](https://github.com/gptme/gptme-contrib/pull/1868) **(sessions)** unwrap Codex block outputs; link call ids for Codex, Pi, and Claude Code
- [gptme-contrib#1870](https://github.com/gptme/gptme-contrib/pull/1870) **(runloops)** count own PR comment as effect for comment-deliverable PM items
- [gptme-contrib#1871](https://github.com/gptme/gptme-contrib/pull/1871) **(runloops)** count current-head finding dispositions as effect
- [gptme-contrib#1872](https://github.com/gptme/gptme-contrib/pull/1872) **(daily-briefing)** list blockers priority:high first, then oldest
- [gptme-contrib#1873](https://github.com/gptme/gptme-contrib/pull/1873) **(gptodo)** enforce the initial-state contract in add
- [gptme-contrib#1874](https://github.com/gptme/gptme-contrib/pull/1874) **(repo-status)** fall back to newest completed run when several are queued

## Performance

- [gptme-contrib#1822](https://github.com/gptme/gptme-contrib/pull/1822) **(greptile)** cache formal review reads

## Refactors

- [gptme#4226](https://github.com/gptme/gptme/pull/4226) **(compaction)** share prefix and recent-tail cut

## Documentation

- [gptme#4147](https://github.com/gptme/gptme/pull/4147) **(citation)** add Zenodo concept DOI and badge
- [gptme#4216](https://github.com/gptme/gptme/pull/4216) **(anti-slop)** document float types and fix stale rounding comment
- [gptme#4230](https://github.com/gptme/gptme/pull/4230) **(mcp)** add ContextVar contract to load/unload_mcp_server + copy_context regression test
- [gptme#4232](https://github.com/gptme/gptme/pull/4232)  add philosophy page (mission, principles, non-goals)
- [gptme-contrib#1841](https://github.com/gptme/gptme-contrib/pull/1841) **(readme)** make contributor setup runnable from a fresh directory
- [gptme-contrib#1849](https://github.com/gptme/gptme-contrib/pull/1849) **(block-registry)** unscoped OpenRouter file is the SHARED key, not the chain

## Tests

- [gptme#4200](https://github.com/gptme/gptme/pull/4200) **(browser)** add local blockage conformance suite
- [gptme#4219](https://github.com/gptme/gptme/pull/4219) **(e2e)** wait for clickability before clicking wizard buttons
- [gptme#4240](https://github.com/gptme/gptme/pull/4240) **(server)** isolate v2 API tests from the real logs dir
- [gptme#4242](https://github.com/gptme/gptme/pull/4242) **(llm)** stub init_llm in degeneration reply() test so it runs in isolation
- [gptme-contrib#1827](https://github.com/gptme/gptme-contrib/pull/1827)  cover identity portability across generic package CLIs

## CI & Infrastructure

- [gptme#4106](https://github.com/gptme/gptme/pull/4106) **(deps-dev)** bump @wdio/spec-reporter from 9.27.2 to 9.32.0 in /tauri/e2e in the tauri-e2e-minor-patch group across 1 directory
- [gptme#4108](https://github.com/gptme/gptme/pull/4108) **(deps)** bump lucide-react from 0.451.0 to 1.48.0 in /webui
- [gptme#4109](https://github.com/gptme/gptme/pull/4109) **(deps)** bump @hookform/resolvers from 3.10.0 to 5.9.1 in /webui
- [gptme#4110](https://github.com/gptme/gptme/pull/4110) **(deps)** bump simple-icons from 15.9.0 to 16.33.0 in /webui
- [gptme#4141](https://github.com/gptme/gptme/pull/4141) **(deps-dev)** bump @types/chrome from 0.0.300 to 0.3.4 in /webui/extension in the webui-extension-minor-patch group across 1 directory
- [gptme#4143](https://github.com/gptme/gptme/pull/4143) **(deps)** bump the webui-minor-patch group across 1 directory with 51 updates
- [gptme#4161](https://github.com/gptme/gptme/pull/4161) **(deps-dev)** bump @tauri-apps/cli from 2.12.0 to 2.12.1 in /tauri in the tauri-minor-patch group
- [gptme#4162](https://github.com/gptme/gptme/pull/4162) **(deps)** bump sanitize-html from 2.17.7 to 2.18.0 in /site/next in the site-next-minor-patch group
- [gptme#4234](https://github.com/gptme/gptme/pull/4234) **(docs)** check gptme repo blob/tree links against git, not github.com

## Chore

- [gptme#4225](https://github.com/gptme/gptme/pull/4225) **(anthropic)** upgrade SDK for native compaction

---

*113 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
