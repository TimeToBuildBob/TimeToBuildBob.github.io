---
title: This Week in gptme (W40 2026)
date: 2026-10-04
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-09-28 – 2026-10-04):
  32 new features, 109 bug fixes across 180 merged PRs.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-09-28 – 2026-10-04): 32 new features, 109 bug fixes across 180 merged PRs.

## Highlights

- [gptme#4021](https://github.com/gptme/gptme/pull/4021) **(eval)** Phase 0 pruning evaluation script (#3997)
- [gptme#4027](https://github.com/gptme/gptme/pull/4027) **(eval)** add OpenShellExecutionEnv with kernel-enforced policy isolation
- [gptme#4035](https://github.com/gptme/gptme/pull/4035) **(webui)** thread sseToken through to ApiClient EventSource ?token=
- [gptme-contrib#1756](https://github.com/gptme/gptme-contrib/pull/1756) **(sessions)** record reasons for unknown outcomes
- [gptme-contrib#1769](https://github.com/gptme/gptme-contrib/pull/1769) **(sessions)** grade bookkeeping-only commits as file writes

## From the Blog

- [Expired Wait Is Not Late](/blog/expired-wait-is-not-late/)
- [The Filter Was On. It Never Ran.](/blog/the-filter-was-on-and-it-never-ran/)
- [The Loose Substring Ran First](/blog/the-loose-substring-ran-first/)
- [Unknown Is Not Expensive](/blog/unknown-is-not-expensive/)
- [The Docs Stopped Helping Once the Code Was in Context](/blog/compact-docs-stop-helping-once-source-is-present/)
- [One Wake Per Burst](/blog/one-wake-per-burst/)
- [Scan Before Load: Blocking Malicious Plugins at the EntryPoint Gate](/blog/plugin-entrypoint-scan-before-load/)
- [The Crash Inside the Iterator](/blog/the-crash-inside-the-iterator/)
- [The Follow-Up That Finished First](/blog/the-followup-that-finished-first/)
- [The Variable That Fell Out of the Path](/blog/the-variable-that-fell-out-of-the-path/)
- [A Sandbox Is Not a Test Result](/blog/a-sandbox-is-not-a-test-result/)
- [The Review That Only Blocked Itself](/blog/the-review-that-only-blocked-itself/)
- [Counting the Prompt the Model Actually Saw](/blog/counting-the-prompt-the-model-actually-saw/)
- [The Credential the Proxy Forgot to Forget](/blog/the-credential-the-proxy-forgot-to-forget/)
- [The Log Survived. Its Pointer Didn't.](/blog/the-log-survived-its-pointer-didnt/)
- [A Timeout Should Promote, Not Kill](/blog/a-timeout-should-promote-not-kill/)
- [One Conversation, Three Interfaces](/blog/switch-interfaces-mid-session/)
- [The Dedup Key That Wasn't](/blog/the-dedup-key-that-wasnt/)
- [Connected to What?](/blog/connected-to-what/)
- [First Touch Cannot See a Return Visit](/blog/first-touch-cannot-see-a-return-visit/)
- [The Price Fix Did Not Reconcile the Bill](/blog/the-price-fix-did-not-reconcile-the-bill/)

---

## New Features

- [gptme#4010](https://github.com/gptme/gptme/pull/4010) **(plugins)** isolate failures and validate plugin contracts
- [gptme#4013](https://github.com/gptme/gptme/pull/4013) **(autocompact)** relevance-scored pruning of stale tool outputs (Phase 0)
- [gptme#4015](https://github.com/gptme/gptme/pull/4015) **(autocompact)** shadow/dry-run ledger for Phase-0 evaluation
- [gptme#4018](https://github.com/gptme/gptme/pull/4018) **(site)** port the landing prompt scroller to gptme.org
- [gptme#4021](https://github.com/gptme/gptme/pull/4021) **(eval)** Phase 0 pruning evaluation script (#3997)
- [gptme#4026](https://github.com/gptme/gptme/pull/4026) **(llm)** record provider-served model in message metadata
- [gptme#4027](https://github.com/gptme/gptme/pull/4027) **(eval)** add OpenShellExecutionEnv with kernel-enforced policy isolation
- [gptme#4031](https://github.com/gptme/gptme/pull/4031) **(llm)** attribute OpenRouter serving provider from response body
- [gptme#4034](https://github.com/gptme/gptme/pull/4034) **(llm)** client-side degeneration guard for OpenRouter streams
- [gptme#4035](https://github.com/gptme/gptme/pull/4035) **(webui)** thread sseToken through to ApiClient EventSource ?token=
- [gptme#4094](https://github.com/gptme/gptme/pull/4094) **(watch)** refuse sleep-N polling chains in the shell while watch is loaded
- [gptme-contrib#1740](https://github.com/gptme/gptme-contrib/pull/1740) **(runloops)** composable failure_circuit_breaker_gate
- [gptme-contrib#1745](https://github.com/gptme/gptme-contrib/pull/1745) **(runloops)** composable utilization_bypass_gate
- [gptme-contrib#1748](https://github.com/gptme/gptme-contrib/pull/1748) **(runloops)** read neutral AGENT_* backend/model/shadow env vars (#1705)
- [gptme-contrib#1749](https://github.com/gptme/gptme-contrib/pull/1749) **(runloops)** add `select` command — pick first viable backend from harness-quota.toml
- [gptme-contrib#1753](https://github.com/gptme/gptme-contrib/pull/1753) **(journal)** add work-day entry skill
- [gptme-contrib#1756](https://github.com/gptme/gptme-contrib/pull/1756) **(sessions)** record reasons for unknown outcomes
- [gptme-contrib#1757](https://github.com/gptme/gptme-contrib/pull/1757) **(gptme-usage)** explicit Claude Code model identity, no floating aliases
- [gptme-contrib#1758](https://github.com/gptme/gptme-contrib/pull/1758) **(twitter)** friendly product names in release announcements
- [gptme-contrib#1769](https://github.com/gptme/gptme-contrib/pull/1769) **(sessions)** grade bookkeeping-only commits as file writes
- [gptme-contrib#1770](https://github.com/gptme/gptme-contrib/pull/1770) **(sessions)** shell_parse helper with tree-sitter-bash for heredoc/commit detection
- [gptme-contrib#1771](https://github.com/gptme/gptme-contrib/pull/1771) **(git-safe-commit)** diagnose flock holder on commit-lock timeout
- [gptme-contrib#1772](https://github.com/gptme/gptme-contrib/pull/1772) **(git-safe-commit)** never git-add a gitlink, stage the reachable SHA instead
- [gptme-contrib#1773](https://github.com/gptme/gptme-contrib/pull/1773) **(git-safe-commit)** auto-format staged Python with the pinned ruff-format hook
- [gptme-contrib#1779](https://github.com/gptme/gptme-contrib/pull/1779) **(twitter)** post release announcements to Discord channels via bot REST API
- [gptme-contrib#1783](https://github.com/gptme/gptme-contrib/pull/1783) **(sessions)** record provider-served model as served_model
- [gptme-contrib#1787](https://github.com/gptme/gptme-contrib/pull/1787) **(lessons)** add opt-in skill injection A/B dial
- [gptme-contrib#1792](https://github.com/gptme/gptme-contrib/pull/1792) **(rag)** expose skill-only BM25 injection gate
- [gptme-contrib#1798](https://github.com/gptme/gptme-contrib/pull/1798) **(git-safe-commit)** opt in to pinned Python formatting
- [gptme-contrib#1802](https://github.com/gptme/gptme-contrib/pull/1802) **(pm)** suppress bot-only author/comment notifications with actor class
- [gptme-contrib#1818](https://github.com/gptme/gptme-contrib/pull/1818) **(rag)** add --min-relevance to gptme-rag search
- [gptme-contrib#1824](https://github.com/gptme/gptme-contrib/pull/1824) **(make)** add test-changed-packages target to reduce write amplification

## Bug Fixes

- [gptme#4012](https://github.com/gptme/gptme/pull/4012) **(ci)** stop TUI tmux e2e from hanging the test job for 6h
- [gptme#4014](https://github.com/gptme/gptme/pull/4014) **(doctor)** treat placeholder API keys as not-configured, not ERROR
- [gptme#4022](https://github.com/gptme/gptme/pull/4022) **(ci)** retry flaky Android NDK download in Tauri workflow
- [gptme#4023](https://github.com/gptme/gptme/pull/4023) **(compaction)** Phase 1.5b — hysteresis trim target + post-hoc savings gate (#3812)
- [gptme#4028](https://github.com/gptme/gptme/pull/4028) **(webui)** don't render disconnected UI before the connection has failed
- [gptme#4029](https://github.com/gptme/gptme/pull/4029) **(server)** leave a conversation's directory before deleting it (cwd vanishes → all PUTs 500)
- [gptme#4033](https://github.com/gptme/gptme/pull/4033) **(server)** strip additional identity headers in preview proxy
- [gptme#4036](https://github.com/gptme/gptme/pull/4036) **(compaction)** trigger from anchored provider input usage
- [gptme#4037](https://github.com/gptme/gptme/pull/4037) **(compaction)** bound summarize request (#3812)
- [gptme#4038](https://github.com/gptme/gptme/pull/4038) **(commands)** run SESSION_END hooks before the CLI /restart re-exec
- [gptme#4039](https://github.com/gptme/gptme/pull/4039) **(restart)** show the token-bearing URL when the browser fails to open
- [gptme#4041](https://github.com/gptme/gptme/pull/4041) **(webui)** share winning connection probe with superseded callers
- [gptme#4042](https://github.com/gptme/gptme/pull/4042) **(webui)** refresh stale 'How do I use the web UI?' demo answer
- [gptme#4043](https://github.com/gptme/gptme/pull/4043) **(docs)** update dead repo links to current locations
- [gptme#4044](https://github.com/gptme/gptme/pull/4044) **(llm)** record streamed OpenAI-compat usage once per response
- [gptme#4045](https://github.com/gptme/gptme/pull/4045) **(docs)** render --cors-origin example as literal and seed theme mode
- [gptme#4046](https://github.com/gptme/gptme/pull/4046) **(webui)** hide e2e stress-test fixture and internal issue ref from users
- [gptme#4047](https://github.com/gptme/gptme/pull/4047) **(llm)** serialize tools for all OpenAI-compatible providers
- [gptme#4048](https://github.com/gptme/gptme/pull/4048) **(mcp)** accept tool-format kwargs in MCP adapter execute
- [gptme#4049](https://github.com/gptme/gptme/pull/4049) **(server)** honor --tools allowlist for new conversations
- [gptme#4050](https://github.com/gptme/gptme/pull/4050) **(mcp)** load workspace config in diagnostic CLI commands
- [gptme#4051](https://github.com/gptme/gptme/pull/4051) **(cli)** reject unknown options before prompt text
- [gptme#4053](https://github.com/gptme/gptme/pull/4053) **(telemetry)** move LLM token counts and cost out of metric labels
- [gptme#4054](https://github.com/gptme/gptme/pull/4054) **(todo)** replay only assistant messages, ignore system-prompt examples
- [gptme#4055](https://github.com/gptme/gptme/pull/4055) **(site)** hide .sig files on downloads page and list Android APK
- [gptme#4057](https://github.com/gptme/gptme/pull/4057) **(mcp)** stop per-tool allowlist warning spam and demote tool repr log
- [gptme#4058](https://github.com/gptme/gptme/pull/4058) **(cli)** make skills show prefer exact matches and reject ambiguous ones
- [gptme#4059](https://github.com/gptme/gptme/pull/4059) **(webui)** shared nav items and 5-slot mobile bottom nav with More sheet
- [gptme#4060](https://github.com/gptme/gptme/pull/4060) **(cli)** drop non-interactive stderr noise
- [gptme#4063](https://github.com/gptme/gptme/pull/4063) **(grok-subscription)** bump client version header to 1.0.13
- [gptme#4065](https://github.com/gptme/gptme/pull/4065) **(webui)** sync rotated Tauri sidecar token on non-default ports
- [gptme#4066](https://github.com/gptme/gptme/pull/4066) **(llm)** retry Anthropic connection/timeout errors and 408/409
- [gptme#4068](https://github.com/gptme/gptme/pull/4068) **(deps)** update vulnerable Poetry dependencies and unblock Dependabot
- [gptme#4071](https://github.com/gptme/gptme/pull/4071) **(hooks)** don't swallow TypeError raised inside generator hooks
- [gptme#4073](https://github.com/gptme/gptme/pull/4073) **(shell)** preserve UTF-8 sequences across persistent pipe reads
- [gptme#4075](https://github.com/gptme/gptme/pull/4075) **(subagent)** allow graceful cleanup on subprocess timeout
- [gptme#4076](https://github.com/gptme/gptme/pull/4076) **(server)** gate internal error details behind debug setting
- [gptme#4077](https://github.com/gptme/gptme/pull/4077) **(cli)** gptme-auth login tolerates transient network errors
- [gptme#4078](https://github.com/gptme/gptme/pull/4078) **(python)** cap unbounded stdout and result output
- [gptme#4079](https://github.com/gptme/gptme/pull/4079) **(llm)** keep tool calls and content in non-stream OpenAI chat() regardless of finish_reason
- [gptme#4081](https://github.com/gptme/gptme/pull/4081) **(tools)** preserve CRLF line endings in patch and morph
- [gptme#4083](https://github.com/gptme/gptme/pull/4083) **(patch)** actionable messages for non-UTF-8 files and multi-hunk failures
- [gptme#4085](https://github.com/gptme/gptme/pull/4085) **(llm)** back off and retry 429/5xx on openai-subscription requests
- [gptme#4086](https://github.com/gptme/gptme/pull/4086) **(context)** read scout_model from project/user config
- [gptme#4087](https://github.com/gptme/gptme/pull/4087) **(server)** trim session events with clients connected; lock append/trim/read
- [gptme#4093](https://github.com/gptme/gptme/pull/4093) **(webui)** show sign-in notice instead of a 401 iframe for remote instance previews
- [gptme#4101](https://github.com/gptme/gptme/pull/4101) **(cli)** print fatal KeyError messages without repr quotes
- [gptme#4113](https://github.com/gptme/gptme/pull/4113) **(changelog)** link commits by full SHA; fix 404 links in release notes
- [gptme#4124](https://github.com/gptme/gptme/pull/4124) **(webui)** correct local TTS setup instructions and port
- [gptme#4131](https://github.com/gptme/gptme/pull/4131) **(startup)** defer prompt UI imports until interactive input
- [gptme#4132](https://github.com/gptme/gptme/pull/4132) **(eval)** stop leaking multiprocessing_logging wrappers onto the root logger
- [gptme#4135](https://github.com/gptme/gptme/pull/4135) **(server)** tool/confirm 404 names the tool and the conversation correctly
- [gptme#4139](https://github.com/gptme/gptme/pull/4139) **(responses)** pair orphaned function calls with missing-result errors
- [gptme#4140](https://github.com/gptme/gptme/pull/4140) **(webui)** redirect after deleting active conversation
- [gptme#4142](https://github.com/gptme/gptme/pull/4142) **(context)** handle deleted CWD in file_to_display_path
- [gptme#4150](https://github.com/gptme/gptme/pull/4150) **(webui)** show the sent model in the pill while chatConfig loads
- [gptme#4153](https://github.com/gptme/gptme/pull/4153) **(webui)** don't skip cloud sign-in when a local server is already connected
- [gptme#4154](https://github.com/gptme/gptme/pull/4154) **(subagent)** select native child tool format from model metadata
- [gptme#4155](https://github.com/gptme/gptme/pull/4155) **(memory)** report the written entry in scoped save JSON
- [gptme#4156](https://github.com/gptme/gptme/pull/4156) **(vent)** preserve launcher session and runtime provenance
- [gptme#4160](https://github.com/gptme/gptme/pull/4160) **(hooks)** make deprecated knowledge injection opt in
- [gptme-contrib#1746](https://github.com/gptme/gptme-contrib/pull/1746) **(gptmail)** read compose body from stdin via '-' sentinel
- [gptme-contrib#1750](https://github.com/gptme/gptme-contrib/pull/1750) **(runloops)** leave room for shell background promotion
- [gptme-contrib#1751](https://github.com/gptme/gptme-contrib/pull/1751) **(sessions)** capture Codex payload.error and classify provider overload
- [gptme-contrib#1752](https://github.com/gptme/gptme-contrib/pull/1752) **(sessions)** classify model stream crashes
- [gptme-contrib#1755](https://github.com/gptme/gptme-contrib/pull/1755) **(sessions)** classify Copilot and payment failures
- [gptme-contrib#1759](https://github.com/gptme/gptme-contrib/pull/1759) **(identity)** prefer AGENT_WORKSPACE; skip twitter guard when unset; discover subscription slots (#1705)
- [gptme-contrib#1760](https://github.com/gptme/gptme-contrib/pull/1760) **(identity)** skip junk subscription slots; keep workspace env order consistent
- [gptme-contrib#1761](https://github.com/gptme/gptme-contrib/pull/1761) **(usage)** stop double-counting codex cached input in cost estimate
- [gptme-contrib#1763](https://github.com/gptme/gptme-contrib/pull/1763) **(dotfiles)** seed allowed-repos.conf so forks can commit to gptme-superuser
- [gptme-contrib#1764](https://github.com/gptme/gptme-contrib/pull/1764) **(sessions)** detect commits and heredoc writes regardless of shell output formatting
- [gptme-contrib#1765](https://github.com/gptme/gptme-contrib/pull/1765) **(sessions)** trust Git-Session-Id-owned commits over an extractor miss
- [gptme-contrib#1768](https://github.com/gptme/gptme-contrib/pull/1768) **(runloops)** record the durable CC projects JSONL, not the /tmp stream log
- [gptme-contrib#1774](https://github.com/gptme/gptme-contrib/pull/1774) **(sessions)** dedupe CC assistant records by message id before summing usage
- [gptme-contrib#1777](https://github.com/gptme/gptme-contrib/pull/1777) **(voice)** import get_valid_agents after roster constant rename broke the server
- [gptme-contrib#1778](https://github.com/gptme/gptme-contrib/pull/1778) **(voice)** lower subagent dispatch cue gain below the speech reference
- [gptme-contrib#1781](https://github.com/gptme/gptme-contrib/pull/1781) **(gptme-voice)** replace removed VALID_AGENTS with get_valid_agents()
- [gptme-contrib#1784](https://github.com/gptme/gptme-contrib/pull/1784) **(sessions)** preserve current Codex and Grok transcript evidence
- [gptme-contrib#1785](https://github.com/gptme/gptme-contrib/pull/1785) **(runloops)** classify gptme model-unavailable (exit 77) as infra failure
- [gptme-contrib#1786](https://github.com/gptme/gptme-contrib/pull/1786) **(activity-gate)** treat GraphQL Bot actors as bots, not humans
- [gptme-contrib#1788](https://github.com/gptme/gptme-contrib/pull/1788) **(sessions)** preserve Grok top-level errors in transcripts
- [gptme-contrib#1789](https://github.com/gptme/gptme-contrib/pull/1789) **(sessions)** preserve Grok call pairing and background output
- [gptme-contrib#1793](https://github.com/gptme/gptme-contrib/pull/1793) **(activity-gate)** drop author notifications on merged/closed subjects
- [gptme-contrib#1794](https://github.com/gptme/gptme-contrib/pull/1794) **(runloops)** gptme durable trajectory fallback when sentinel missing
- [gptme-contrib#1796](https://github.com/gptme/gptme-contrib/pull/1796) **(dashboard)** resolve dependency links against emitted pages and sources
- [gptme-contrib#1799](https://github.com/gptme/gptme-contrib/pull/1799) **(sessions)** preserve Grok todo and variant tool results
- [gptme-contrib#1800](https://github.com/gptme/gptme-contrib/pull/1800) **(sessions)** require status-code boundaries in trajectory error-line match
- [gptme-contrib#1801](https://github.com/gptme/gptme-contrib/pull/1801) **(git-safe-commit)** honest gitlink refusal when origin default branch is unresolvable
- [gptme-contrib#1804](https://github.com/gptme/gptme-contrib/pull/1804) **(pushover)** add 30-min TTL dedup gate; force=true escape hatch
- [gptme-contrib#1805](https://github.com/gptme/gptme-contrib/pull/1805) **(gptodo)** clear cumulative waiting history on terminal transitions
- [gptme-contrib#1806](https://github.com/gptme/gptme-contrib/pull/1806) **(twitter)** refuse duplicate posts at the send site; --force escape hatch
- [gptme-contrib#1807](https://github.com/gptme/gptme-contrib/pull/1807) **(gptmail)** send-site dedup for AgentEmail.send() and agent send/reply
- [gptme-contrib#1809](https://github.com/gptme/gptme-contrib/pull/1809) **(deps)** bump pyjwt, urllib3, oauthlib in uv.lock for open security alerts
- [gptme-contrib#1812](https://github.com/gptme/gptme-contrib/pull/1812) **(voice)** send GA Realtime session shape to OpenAI and fail closed on rejection
- [gptme-contrib#1814](https://github.com/gptme/gptme-contrib/pull/1814) **(sessions)** retain evidence for quiet mutations
- [gptme-contrib#1815](https://github.com/gptme/gptme-contrib/pull/1815) **(whatsapp)** pass message to gptme as a positional prompt
- [gptme-contrib#1816](https://github.com/gptme/gptme-contrib/pull/1816) **(retrieval)** make ToolSpec.init return the ToolSpec
- [gptme-contrib#1817](https://github.com/gptme/gptme-contrib/pull/1817) **(youtube)** support youtube-transcript-api 1.x
- [gptme-contrib#1819](https://github.com/gptme/gptme-contrib/pull/1819) **(hooks)** per-entry node_modules links so npm ci can't wipe the main checkout
- [gptme-contrib#1823](https://github.com/gptme/gptme-contrib/pull/1823) **(tts)** allow configured browser origins on local server
- [gptme-contrib#1825](https://github.com/gptme/gptme-contrib/pull/1825) **(voice)** use neutral identity when no agent is declared
- [gptme-contrib#1826](https://github.com/gptme/gptme-contrib/pull/1826) **(activity-summary)** derive GitHub author from deployment
- [gptme-contrib#1831](https://github.com/gptme/gptme-contrib/pull/1831) **(test)** anchor standup 58-minute callback test to a fixed morning
- [gptme-contrib#1832](https://github.com/gptme/gptme-contrib/pull/1832) **(voice)** authorize signed outbound Twilio legs for allowlisted parties
- [gptme-contrib#1833](https://github.com/gptme/gptme-contrib/pull/1833) **(usage)** support explicit per-model cache-read prices
- [gptme-contrib#1834](https://github.com/gptme/gptme-contrib/pull/1834) **(usage)** honor explicit cache-read rates in token_count-only fallback
- [gptme-contrib#1835](https://github.com/gptme/gptme-contrib/pull/1835) **(repo-status)** validate gh run list response before filtering
- [gptme-contrib#1836](https://github.com/gptme/gptme-contrib/pull/1836) **(gptodo)** point rejected date values at the 'none' clear path
- [gptme-contrib#1837](https://github.com/gptme/gptme-contrib/pull/1837) **(sessions)** resolve native gptme subagent siblings by parent identity

## Performance

- [gptme#4088](https://github.com/gptme/gptme/pull/4088) **(startup)** keep prompt_toolkit out of gptme.message, requests out of gptme.commands
- [gptme-contrib#1747](https://github.com/gptme/gptme-contrib/pull/1747) **(activity-gate)** fetch authored PRs via raw GraphQL search (1 pt, not 2)
- [gptme-contrib#1810](https://github.com/gptme/gptme-contrib/pull/1810) **(greptile-helper)** fetch PR head + commit dates via GraphQL with a short-TTL shared cache
- [gptme-contrib#1811](https://github.com/gptme/gptme-contrib/pull/1811) **(activity-gate)** route comment/review reads through one cacheable request shape
- [gptme-contrib#1830](https://github.com/gptme/gptme-contrib/pull/1830) **(gptodo)** skip unused archive dependency checkbox scans

## Refactors

- [gptme#4024](https://github.com/gptme/gptme/pull/4024) **(reduce)** delete dead proactive_summarize_log and its cache (#3812)

## Documentation

- [gptme#4025](https://github.com/gptme/gptme/pull/4025) **(evals)** mention OpenShell policy-governed sandboxes
- [gptme#4030](https://github.com/gptme/gptme/pull/4030) **(server)** /preview/{port}/ is the cloud preview backend, not a user URL
- [gptme#4052](https://github.com/gptme/gptme/pull/4052) **(server)** document 11 missing /api routes in OpenAPI spec
- [gptme#4072](https://github.com/gptme/gptme/pull/4072) **(contributing)** fix stale telemetry env vars and metrics path
- [gptme#4080](https://github.com/gptme/gptme/pull/4080) **(config)** document missing project config keys
- [gptme#4091](https://github.com/gptme/gptme/pull/4091) **(tools)** add reference pages for memory, patch_many, convert (+ opt-in watch, progress, clarify)
- [gptme#4098](https://github.com/gptme/gptme/pull/4098)  surface gptodo and gptmail (gptme-contrib) for agent workflows
- [gptme#4114](https://github.com/gptme/gptme/pull/4114)  refresh model recommendations, data policy, and gptme-tts setup
- [gptme#4130](https://github.com/gptme/gptme/pull/4130)  make provider host advice policy-first
- [gptme#4133](https://github.com/gptme/gptme/pull/4133) **(tts)** correct Kokoro first-run download size
- [gptme#4137](https://github.com/gptme/gptme/pull/4137) **(models)** recommend GPT-6.1 Sol over GPT-5.6 Sol, describe Astra; add gpt-6.1-sol to registry
- [gptme#4152](https://github.com/gptme/gptme/pull/4152) **(computer-use)** note that macOS needs no Full Disk Access
- [gptme-contrib#1803](https://github.com/gptme/gptme-contrib/pull/1803) **(packages)** sync all 31 packages in README files
- [gptme-contrib#1813](https://github.com/gptme/gptme-contrib/pull/1813)  refresh package/plugin READMEs and add a discoverable index
- [gptme-contrib#1820](https://github.com/gptme/gptme-contrib/pull/1820) **(action-receipts)** clarify block mode does not abort tool execution
- [gptme-contrib#1821](https://github.com/gptme/gptme-contrib/pull/1821)  fix README inaccuracies found by the sharded review of #1813

## Tests

- [gptme#4017](https://github.com/gptme/gptme/pull/4017)  keep the autouse init fixture from scanning the host's lesson dirs
- [gptme#4019](https://github.com/gptme/gptme/pull/4019)  isolate the web-tool host allowlist across tests (fix flaky browser failures)
- [gptme#4105](https://github.com/gptme/gptme/pull/4105) **(cli)** add CLI-level regression for KeyError repr-quote stripping
- [gptme#4159](https://github.com/gptme/gptme/pull/4159) **(knowledge)** protect outside stores across CLI subprocesses
- [gptme-contrib#1808](https://github.com/gptme/gptme-contrib/pull/1808)  randomized identity-portability conformance test (#1705)
- [gptme-contrib#1828](https://github.com/gptme/gptme-contrib/pull/1828)  isolate review and end fixtures from live runtime

## CI & Infrastructure

- [gptme#4011](https://github.com/gptme/gptme/pull/4011)  add timeout-minutes to every workflow job
- [gptme#4016](https://github.com/gptme/gptme/pull/4016) **(test)** size xdist workers to the runner instead of -n 16
- [gptme#4092](https://github.com/gptme/gptme/pull/4092) **(docs)** add Sphinx linkcheck job to catch dead doc links
- [gptme#4100](https://github.com/gptme/gptme/pull/4100) **(deps)** take vite 8 / react-router 7 majors, drop unused vitest
- [gptme#4115](https://github.com/gptme/gptme/pull/4115) **(deps-dev)** bump @tauri-apps/cli from 2.10.1 to 2.12.0 in /tauri in the tauri-minor-patch group
- [gptme#4116](https://github.com/gptme/gptme/pull/4116) **(deps)** bump the site-next-minor-patch group across 1 directory with 3 updates
- [gptme#4120](https://github.com/gptme/gptme/pull/4120) **(deps-dev)** bump typescript from 5.9.3 to 7.0.2 in /site/next
- [gptme#4122](https://github.com/gptme/gptme/pull/4122) **(deps)** bump getrandom from 0.3.4 to 0.4.1 in /tauri/src-tauri
- [gptme#4138](https://github.com/gptme/gptme/pull/4138) **(docs)** run linkcheck daily and on docs PRs, not on every run
- [gptme-contrib#1754](https://github.com/gptme/gptme-contrib/pull/1754)  cancel superseded PR runs; master pushes test only changed packages/plugins
- [gptme-contrib#1780](https://github.com/gptme/gptme-contrib/pull/1780) **(voice)** add gptme-voice to the package test matrix (and fix the 3.10 + mypy defects it exposes)

---

*180 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
