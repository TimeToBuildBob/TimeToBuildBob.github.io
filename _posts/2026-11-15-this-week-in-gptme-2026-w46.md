---
title: This Week in gptme (W46 2026)
date: 2026-11-15
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-11-09 – 2026-11-15):
  60 new features, 103 bug fixes across 187 merged PRs.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-11-09 – 2026-11-15): 60 new features, 103 bug fixes across 187 merged PRs.

## Highlights

- [gptme#4821](https://github.com/gptme/gptme/pull/4821) **(tauri)** write crash-log.jsonl on unexpected sidecar exit
- [gptme#4828](https://github.com/gptme/gptme/pull/4828) **(hooks)** route anomaly watchdog block mode through the policy-block helper
- [gptme#4892](https://github.com/gptme/gptme/pull/4892) **(hooks)** warn before externally enforced session deadlines
- [gptme-contrib#2109](https://github.com/gptme/gptme-contrib/pull/2109) **(sessions)** threads/thread CLI with record + journal inputs for the threading core
- [gptme#4813](https://github.com/gptme/gptme/pull/4813) **(doctor)** detect and repair startup config corruption in gptme-doctor

## From the Blog

- [Teaching Agents to Yield](/blog/teaching-agents-to-yield/)
- [The Lease Was Released Before the Result Landed](/blog/the-lease-released-before-the-result-landed/)
- [The Queue That Was Too Small for the Scheduler](/blog/the-queue-that-was-too-small-for-the-scheduler/)
- [November 2026 gptme Contributor Spotlight: simpleqt and richa-nvidia](/blog/november-2026-gptme-contributor-spotlight/)
- [The Three Million Character Tool Result](/blog/the-three-million-character-tool-result/)

---

## New Features

- [gptme#4813](https://github.com/gptme/gptme/pull/4813) **(doctor)** detect and repair startup config corruption in gptme-doctor
- [gptme#4821](https://github.com/gptme/gptme/pull/4821) **(tauri)** write crash-log.jsonl on unexpected sidecar exit
- [gptme#4828](https://github.com/gptme/gptme/pull/4828) **(hooks)** route anomaly watchdog block mode through the policy-block helper
- [gptme#4830](https://github.com/gptme/gptme/pull/4830) **(complete)** emit structured session-end metadata block
- [gptme#4833](https://github.com/gptme/gptme/pull/4833) **(doctor)** probe proxy reachability and OAuth token expiry
- [gptme#4834](https://github.com/gptme/gptme/pull/4834) **(tui)** show child agents and monitors with work overview screen (#4557)
- [gptme#4835](https://github.com/gptme/gptme/pull/4835) **(watch,subagent)** owner-scoped work snapshots and explicit watch expiry
- [gptme#4844](https://github.com/gptme/gptme/pull/4844) **(subagent)** add yield operation that checkpoints and ends an attempt as blocked_external
- [gptme#4849](https://github.com/gptme/gptme/pull/4849) **(mcp)** show which config layer supplied a server in mcp info
- [gptme#4851](https://github.com/gptme/gptme/pull/4851) **(subagent)** report the latest committed checkpoint on subprocess deadline expiry
- [gptme#4853](https://github.com/gptme/gptme/pull/4853) **(subagent)** cross-restart writer lease via flock on subagent-writer.lock
- [gptme#4857](https://github.com/gptme/gptme/pull/4857) **(config)** add [shell] spool_quota_mb to ProjectConfig
- [gptme#4859](https://github.com/gptme/gptme/pull/4859) **(subagent)** retained-worktree slice — explicit GC path for isolated agents
- [gptme#4864](https://github.com/gptme/gptme/pull/4864) **(mcp)** add SSE transport support for FastMCP SSE servers
- [gptme#4870](https://github.com/gptme/gptme/pull/4870) **(memory)** let memory match trigger lessons (--lessons, --lesson-dir)
- [gptme#4879](https://github.com/gptme/gptme/pull/4879) **(tui)** auto-name conversations and show the name in statusline and terminal title
- [gptme#4880](https://github.com/gptme/gptme/pull/4880) **(shell)** promoted foreground jobs adopt their capture into the job spool (#4663 step 3)
- [gptme#4881](https://github.com/gptme/gptme/pull/4881) **(models)** add Gemini 4 Hydrogen
- [gptme#4892](https://github.com/gptme/gptme/pull/4892) **(hooks)** warn before externally enforced session deadlines
- [gptme#4893](https://github.com/gptme/gptme/pull/4893) **(tui)** show child progress and independent unread outcomes
- [gptme#4903](https://github.com/gptme/gptme/pull/4903) **(subagent)** report cache-aware usage breakdown on subagent results
- [gptme#4911](https://github.com/gptme/gptme/pull/4911) **(hooks)** hooks run matches keyworded memories; hooks install is the single documented path
- [gptme#4912](https://github.com/gptme/gptme/pull/4912)  discover local peers and wake conversations for peer messages
- [gptme-contrib#2081](https://github.com/gptme/gptme-contrib/pull/2081) **(self-merge)** accept current-head Greptile as the machine-review alternative
- [gptme-contrib#2083](https://github.com/gptme/gptme-contrib/pull/2083) **(gptmail)** thread-scoped agent watch and send --watch
- [gptme-contrib#2085](https://github.com/gptme/gptme-contrib/pull/2085) **(aw-watcher-agent)** add tail-claude-code for hook-free Claude Code session tracking
- [gptme-contrib#2090](https://github.com/gptme/gptme-contrib/pull/2090) **(runloops)** give state_delta_gate an addressed-signal fast path, wall-clock backoff, and an explore lane
- [gptme-contrib#2095](https://github.com/gptme/gptme-contrib/pull/2095) **(runloops)** add state-delta-gate.py CLI to manage backoff state for bash callers
- [gptme-contrib#2098](https://github.com/gptme/gptme-contrib/pull/2098) **(self-merge)** Erik's head-bound approval waives the AI-review requirement
- [gptme-contrib#2101](https://github.com/gptme/gptme-contrib/pull/2101) **(gptme-review)** make the cross-repo placement prompt agent-neutral
- [gptme-contrib#2104](https://github.com/gptme/gptme-contrib/pull/2104) **(gptme-review)** read agent brain repos from host config
- [gptme-contrib#2109](https://github.com/gptme/gptme-contrib/pull/2109) **(sessions)** threads/thread CLI with record + journal inputs for the threading core
- [gptme-contrib#2110](https://github.com/gptme/gptme-contrib/pull/2110) **(gptmail)** add secrets extra for the gptme-redact scanner
- [gptme-contrib#2111](https://github.com/gptme/gptme-contrib/pull/2111) **(gptodo)** add `edit --json` machine-output contract and exit-code table
- [gptme-contrib#2112](https://github.com/gptme/gptme-contrib/pull/2112) **(self-merge)** Erik's head-bound approval overrides path/category policy
- [gptme-contrib#2114](https://github.com/gptme/gptme-contrib/pull/2114) **(gptme-review)** portable review route admission behind a RoutingBackend
- [gptme-contrib#2117](https://github.com/gptme/gptme-contrib/pull/2117) **(agent-events)** live harness-agnostic agent event stream with a sound sink
- [gptme-contrib#2120](https://github.com/gptme/gptme-contrib/pull/2120) **(gptmail)** add agent ack to end information-only messages without replying
- [gptme-contrib#2123](https://github.com/gptme/gptme-contrib/pull/2123) **(agent-events)** commits/pushes from git reflogs with Git-Session-Id attribution; cwd/repo; sound log lines
- [gptme-contrib#2125](https://github.com/gptme/gptme-contrib/pull/2125) **(gptodo)** name skipped items when a task is marked done
- [gptme-contrib#2126](https://github.com/gptme/gptme-contrib/pull/2126) **(gptme-vitals)** RouteKind.ENVELOPE for envelope-only routes
- [gptme-contrib#2127](https://github.com/gptme/gptme-contrib/pull/2127) **(git-safe-push-master)** record paths the materializer skipped
- [gptme-contrib#2130](https://github.com/gptme/gptme-contrib/pull/2130) **(self-merge)** operator approval survives small review-fix commits (ErikBjare/bob#1471 rule 3)
- [gptme-contrib#2133](https://github.com/gptme/gptme-contrib/pull/2133) **(runloops)** pass frontier payoff stamps through parse_cascade_json
- [gptme-contrib#2135](https://github.com/gptme/gptme-contrib/pull/2135) **(gptodo)** done on a task with success_criterion requires verified evidence
- [gptme-contrib#2136](https://github.com/gptme/gptme-contrib/pull/2136) **(gptme-runloops)** select --lane decides backend, model and effort from a lane policy
- [gptme-contrib#2137](https://github.com/gptme/gptme-contrib/pull/2137) **(runloops)** floor Erik's agent messages at the assigned-issue timeout tier
- [gptme-contrib#2138](https://github.com/gptme/gptme-contrib/pull/2138) **(gptodo)** a skipped item must link its follow-up or say 'declined:' before done
- [gptme-contrib#2141](https://github.com/gptme/gptme-contrib/pull/2141) **(gptme-sessions)** shared session identity resolver and one-row-per-session loader
- [gptme-contrib#2142](https://github.com/gptme/gptme-contrib/pull/2142) **(gptodo)** typed wait gate with closed kind enum and one deadline push
- [gptme-contrib#2143](https://github.com/gptme/gptme-contrib/pull/2143) **(greptile-helper)** minimize our superseded trigger comments after a new trigger
- [gptme-contrib#2144](https://github.com/gptme/gptme-contrib/pull/2144) **(gptodo)** requeue intent also returns an active task to backlog
- [gptme-contrib#2152](https://github.com/gptme/gptme-contrib/pull/2152) **(gptme-vitals)** group portal cards by nav group; envelope pages for routes with no HTML
- [gptme-contrib#2174](https://github.com/gptme/gptme-contrib/pull/2174) **(gptmail)** receive-only transport for forced-command SSH delivery
- [gptme-contrib#2176](https://github.com/gptme/gptme-contrib/pull/2176) **(scripts)** ntfy backend for principal_notify and a shared Kuma push helper
- [gptme-contrib#2177](https://github.com/gptme/gptme-contrib/pull/2177) **(review)** accept host-local panel transports and runners
- [gptme-contrib#2178](https://github.com/gptme/gptme-contrib/pull/2178) **(hooks)** skip prompt-time matching for a repeated fixed prompt (#2170)
- [gptme-contrib#2180](https://github.com/gptme/gptme-contrib/pull/2180) **(gptme-sessions)** record the selector decision id on session records
- [gptme-contrib#2184](https://github.com/gptme/gptme-contrib/pull/2184) **(bobutils)** add gh_json and gh_paginated_list to bobutils.shell
- [gptme-contrib#2195](https://github.com/gptme/gptme-contrib/pull/2195) **(gptodo)** add ready --overdue to list blocked tasks whose wait: passed

## Bug Fixes

- [gptme#4781](https://github.com/gptme/gptme/pull/4781) **(memory)** match legacy index pointers whose titles contain links
- [gptme#4782](https://github.com/gptme/gptme/pull/4782) **(output)** harden tool-output writer (private, no-clobber, symlink-safe)
- [gptme#4783](https://github.com/gptme/gptme/pull/4783) **(gh)** pass through to the gh CLI when a native read command has unsupported flags
- [gptme#4786](https://github.com/gptme/gptme/pull/4786) **(mcp)** honor /mcp load config overrides for unknown servers
- [gptme#4788](https://github.com/gptme/gptme/pull/4788) **(gh)** keep the failure block when a CI log exceeds the token budget
- [gptme#4799](https://github.com/gptme/gptme/pull/4799) **(shell)** redact credentials printed mid-line in tool output
- [gptme#4800](https://github.com/gptme/gptme/pull/4800) **(parser)** reject non-ASCII digits and bound overflow in int() parse paths
- [gptme#4805](https://github.com/gptme/gptme/pull/4805) **(mcp)** report the real cause when an HTTP connect fails
- [gptme#4807](https://github.com/gptme/gptme/pull/4807) **(config)** normalize provider arrays before appending tables
- [gptme#4808](https://github.com/gptme/gptme/pull/4808) **(auth)** validate malformed cached gptme.ai token instead of crashing
- [gptme#4809](https://github.com/gptme/gptme/pull/4809) **(config)** auto-repair providers = [...] inline-table corruption at load
- [gptme#4810](https://github.com/gptme/gptme/pull/4810) **(mcp)** redact URL credentials in conversational list/info
- [gptme#4820](https://github.com/gptme/gptme/pull/4820) **(codeblock)** non-exec-lang block followed by later block now yields all blocks
- [gptme#4823](https://github.com/gptme/gptme/pull/4823) **(context)** skip malformed rows in the context-savings summary
- [gptme#4825](https://github.com/gptme/gptme/pull/4825) **(tests)** isolate CC fallback in memory tool tests
- [gptme#4826](https://github.com/gptme/gptme/pull/4826) **(output)** spool direct background jobs before RAM eviction
- [gptme#4827](https://github.com/gptme/gptme/pull/4827) **(gh)** keep failed logs native and bound passthrough responses
- [gptme#4829](https://github.com/gptme/gptme/pull/4829) **(doctor)** warn when an MCP HTTP server rejects the credential
- [gptme#4831](https://github.com/gptme/gptme/pull/4831) **(doctor)** state what the config and stdio-MCP rows actually checked
- [gptme#4832](https://github.com/gptme/gptme/pull/4832) **(export)** encode complete chat data for HTML script context
- [gptme#4836](https://github.com/gptme/gptme/pull/4836) **(subagent)** report wall-clock deadline expiry as timeout, not failure
- [gptme#4837](https://github.com/gptme/gptme/pull/4837) **(ci)** check model freshness against public OpenRouter catalog
- [gptme#4838](https://github.com/gptme/gptme/pull/4838) **(subagent)** preserve non-empty non-git isolation workspace
- [gptme#4839](https://github.com/gptme/gptme/pull/4839) **(codeblock)** close non-exec blocks followed only by prose or distant blocks
- [gptme#4841](https://github.com/gptme/gptme/pull/4841) **(subagent)** tell the parent a timed-out child can be continued
- [gptme#4843](https://github.com/gptme/gptme/pull/4843) **(subagent)** persist terminal attempt outcomes across parent restart
- [gptme#4847](https://github.com/gptme/gptme/pull/4847) **(plugins)** scan third-party entry points before importing them
- [gptme#4850](https://github.com/gptme/gptme/pull/4850) **(ci)** give the Tauri apt install a cache-aware deadline
- [gptme#4852](https://github.com/gptme/gptme/pull/4852) **(subagent)** refuse continuation of a cancelled attempt unless allow_cancelled=True
- [gptme#4854](https://github.com/gptme/gptme/pull/4854) **(shell)** redact exact live secret values from tool output in any shape
- [gptme#4855](https://github.com/gptme/gptme/pull/4855) **(shell)** enforce 32 MiB per-job spool quota; reader keeps draining on quota exceeded
- [gptme#4856](https://github.com/gptme/gptme/pull/4856) **(output)** bound spool writes, quota, receipts, and byte cursors
- [gptme#4858](https://github.com/gptme/gptme/pull/4858) **(subagent)** superseded attempt's monitor must not cache its result for the resumed one
- [gptme#4860](https://github.com/gptme/gptme/pull/4860) **(tests)** end the mock MiniMax SSE stream with a terminal finish_reason
- [gptme#4861](https://github.com/gptme/gptme/pull/4861) **(models)** refresh stale OpenRouter Anthropic model IDs to Claude 5
- [gptme#4865](https://github.com/gptme/gptme/pull/4865) **(uri)** recognize RFC 2397 data: URIs
- [gptme#4867](https://github.com/gptme/gptme/pull/4867) **(codeblock)** make from_markdown round-trip lossless
- [gptme#4871](https://github.com/gptme/gptme/pull/4871) **(lessons)** match skill names on word boundaries, not substrings
- [gptme#4872](https://github.com/gptme/gptme/pull/4872) **(subagent)** retained-workspace release holds the writer lease and never silently discards uncommitted work
- [gptme#4875](https://github.com/gptme/gptme/pull/4875) **(version)** ignore enclosing repository dirt for installed packages
- [gptme#4883](https://github.com/gptme/gptme/pull/4883) **(llm)** keep mid-conversation system messages out of Responses instructions
- [gptme#4885](https://github.com/gptme/gptme/pull/4885) **(storage)** hash copied attachment bytes before publishing
- [gptme#4887](https://github.com/gptme/gptme/pull/4887) **(mcp)** close CLI probe clients on success and failure
- [gptme#4888](https://github.com/gptme/gptme/pull/4888) **(deps)** require patched Soup Sieve for selector DoS
- [gptme#4902](https://github.com/gptme/gptme/pull/4902) **(subagent)** accept every terminal status when loading a persisted outcome
- [gptme#4905](https://github.com/gptme/gptme/pull/4905) **(subagent)** fence stale cancel op before allow_cancelled continuation
- [gptme#4906](https://github.com/gptme/gptme/pull/4906) **(subagent)** recover final report across harness completion nudge
- [gptme#4907](https://github.com/gptme/gptme/pull/4907) **(tui)** render each Work overview child as one non-wrapping line
- [gptme#4908](https://github.com/gptme/gptme/pull/4908) **(tui)** move work-pane shortcut from Ctrl+W to Ctrl+T so it stops stealing draft editing
- [gptme#4913](https://github.com/gptme/gptme/pull/4913) **(subagent)** deliver subprocess progress via file channel, not child-local queue
- [gptme#4919](https://github.com/gptme/gptme/pull/4919) **(subagent)** honor context_window=0 in subprocess mode
- [gptme#4923](https://github.com/gptme/gptme/pull/4923) **(mcp)** report TLS verification failure for self-signed HTTPS MCP servers
- [gptme#4924](https://github.com/gptme/gptme/pull/4924) **(deps)** upgrade tornado to 6.6.1 for CVE-2026-126347
- [gptme#4925](https://github.com/gptme/gptme/pull/4925) **(mcp)** bound oversized MCP tool results and spool the full text
- [gptme#4927](https://github.com/gptme/gptme/pull/4927) **(mcp)** report HTTP 401/OAuth challenge instead of transport-cancelled
- [gptme-contrib#2080](https://github.com/gptme/gptme-contrib/pull/2080) **(gptodo)** exit non-zero on edit/show target-level refusals
- [gptme-contrib#2084](https://github.com/gptme/gptme-contrib/pull/2084) **(runloops)** preserve child exit status through the tee pipeline
- [gptme-contrib#2087](https://github.com/gptme/gptme-contrib/pull/2087) **(sessions)** stop labelling read-only gptme subagents as acting
- [gptme-contrib#2093](https://github.com/gptme/gptme-contrib/pull/2093) **(gptodo)** refuse explicit sets that the terminal strip would drop
- [gptme-contrib#2094](https://github.com/gptme/gptme-contrib/pull/2094) **(hooks)** keep Git-Session-Id last when a -m body line starts with '#'
- [gptme-contrib#2096](https://github.com/gptme/gptme-contrib/pull/2096) **(runloops)** disambiguate exit 75/76 lock-busy from gptme rate-limit/auth by cause signal
- [gptme-contrib#2097](https://github.com/gptme/gptme-contrib/pull/2097) **(runloops)** reject stale gptme trajectories on same-second retries
- [gptme-contrib#2099](https://github.com/gptme/gptme-contrib/pull/2099) **(hooks)** reject commit messages with bare <think>/</think> lines
- [gptme-contrib#2102](https://github.com/gptme/gptme-contrib/pull/2102) **(gptodo)** handle list-nested quote fences and tight emoji markers on recurrence reset
- [gptme-contrib#2103](https://github.com/gptme/gptme-contrib/pull/2103) **(gptme-review)** resolve the review key without a workspace openrouter_keys
- [gptme-contrib#2106](https://github.com/gptme/gptme-contrib/pull/2106) **(gptodo)** count ordered-list checkboxes in count_subtasks
- [gptme-contrib#2107](https://github.com/gptme/gptme-contrib/pull/2107) **(gptme-redact)** make collect_secret_literals() repr-safe
- [gptme-contrib#2108](https://github.com/gptme/gptme-contrib/pull/2108) **(gptme-sessions)** gh write detection — pflag flag parsing and heredoc bodies as data
- [gptme-contrib#2115](https://github.com/gptme/gptme-contrib/pull/2115) **(ci)** refresh stale uv.lock and fail CI when the lock drifts
- [gptme-contrib#2116](https://github.com/gptme/gptme-contrib/pull/2116) **(gptme-vitals)** portal styling, theme the built page and drop empty badges
- [gptme-contrib#2118](https://github.com/gptme/gptme-contrib/pull/2118) **(run_item)** add OpenRouter 402 error strings to BACKEND_QUOTA_MARKERS
- [gptme-contrib#2119](https://github.com/gptme/gptme-contrib/pull/2119) **(git-safe-push-master)** don't move trunk when behind; materialize after ref moves
- [gptme-contrib#2121](https://github.com/gptme/gptme-contrib/pull/2121) **(lessons)** trajectory-persistence also covers disabling persistence
- [gptme-contrib#2122](https://github.com/gptme/gptme-contrib/pull/2122) **(match-lessons)** match SendMessage text on PreToolUse
- [gptme-contrib#2124](https://github.com/gptme/gptme-contrib/pull/2124) **(twitter)** TWITTER_ENV_FILE as single read/write token store
- [gptme-contrib#2128](https://github.com/gptme/gptme-contrib/pull/2128) **(activity-gate)** dedupe CI watches on failure signature, not run IDs or completing checks
- [gptme-contrib#2129](https://github.com/gptme/gptme-contrib/pull/2129) **(gptmail)** agent send/reply/broadcast read stdin for '-' and refuse an empty body
- [gptme-contrib#2131](https://github.com/gptme/gptme-contrib/pull/2131) **(twitter)** cap thread-context and timeline reads at 10 posts; add a daily billable-read meter
- [gptme-contrib#2132](https://github.com/gptme/gptme-contrib/pull/2132) **(rag)** match skill names on word boundaries, not substrings
- [gptme-contrib#2134](https://github.com/gptme/gptme-contrib/pull/2134) **(home-assistant)** also read credentials from ~/.config/secrets/ha.env
- [gptme-contrib#2140](https://github.com/gptme/gptme-contrib/pull/2140) **(gptme-vitals)** portal ships the CSS for the shared nav it renders
- [gptme-contrib#2146](https://github.com/gptme/gptme-contrib/pull/2146) **(release-announce)** a missing-credentials exit leaves no pending marker
- [gptme-contrib#2147](https://github.com/gptme/gptme-contrib/pull/2147) **(sessions)** resolve Codex child rollouts into subagent_summary
- [gptme-contrib#2148](https://github.com/gptme/gptme-contrib/pull/2148) **(activity-gate)** retain CI signatures until observed recovery
- [gptme-contrib#2150](https://github.com/gptme/gptme-contrib/pull/2150) **(deps)** raise workspace requires-python to >=3.11.5 so the gptme lock refresh resolves
- [gptme-contrib#2151](https://github.com/gptme/gptme-contrib/pull/2151) **(publish)** build artifacts in the package-local dist directory
- [gptme-contrib#2153](https://github.com/gptme/gptme-contrib/pull/2153) **(sessions)** reject foreign Claude transcript evidence
- [gptme-contrib#2155](https://github.com/gptme/gptme-contrib/pull/2155) **(review)** contain filename data and honor shard byte caps
- [gptme-contrib#2157](https://github.com/gptme/gptme-contrib/pull/2157) **(review)** retain response billing when generation lookup fails
- [gptme-contrib#2159](https://github.com/gptme/gptme-contrib/pull/2159) **(review)** merge shard usage without inflating independence or dropping until-dry fields
- [gptme-contrib#2162](https://github.com/gptme/gptme-contrib/pull/2162) **(gptodo)** allow a first deadline push with null history
- [gptme-contrib#2165](https://github.com/gptme/gptme-contrib/pull/2165) **(gptodo)** delegate task hook to the canonical schema
- [gptme-contrib#2166](https://github.com/gptme/gptme-contrib/pull/2166) **(hooks)** scope new-branch mass-delete scan by the destination's live master/main
- [gptme-contrib#2167](https://github.com/gptme/gptme-contrib/pull/2167) **(gptme-review)** until-dry no longer sums distinct_independence_keys across waves
- [gptme-contrib#2173](https://github.com/gptme/gptme-contrib/pull/2173) **(lessons)** report missing matcher dependencies and add self-check
- [gptme-contrib#2175](https://github.com/gptme/gptme-contrib/pull/2175)  reuse strict frontmatter splitting in lesson exports and forum
- [gptme-contrib#2182](https://github.com/gptme/gptme-contrib/pull/2182) **(gptme-sessions)** sync --project follow-ups — CC cwd disambiguation, scope --fix-timestamps
- [gptme-contrib#2187](https://github.com/gptme/gptme-contrib/pull/2187) **(lessons)** ungated trajectory-persistence from session_categories
- [gptme-contrib#2190](https://github.com/gptme/gptme-contrib/pull/2190) **(hooks)** retry prompt locks removed during expiry
- [gptme-contrib#2191](https://github.com/gptme/gptme-contrib/pull/2191) **(notify)** refuse ntfy redirects and repair Kuma bootstrap clocks
- [gptme-contrib#2192](https://github.com/gptme/gptme-contrib/pull/2192) **(gptmail)** keep import-time .env probe quiet outside a checkout
- [gptme-contrib#2196](https://github.com/gptme/gptme-contrib/pull/2196) **(release-announce)** missing OAuth user token is a never-sent post too
- [gptme-contrib#2197](https://github.com/gptme/gptme-contrib/pull/2197) **(gptodo)** accept the recurrence reset's waiting_since without waiting_for

## Performance

- [gptme#4845](https://github.com/gptme/gptme/pull/4845) **(subagent)** filter logdirs by name before stat in id lookup
- [gptme#4877](https://github.com/gptme/gptme/pull/4877) **(lessons)** cut Claude Code lesson hook latency ~4x (0.52s → 0.14s)
- [gptme-contrib#2086](https://github.com/gptme/gptme-contrib/pull/2086) **(gptodo)** resolve archived deps lazily in check
- [gptme-contrib#2154](https://github.com/gptme/gptme-contrib/pull/2154) **(bobutils)** read load_jsonl(tail=N) backwards in skip mode
- [gptme-contrib#2168](https://github.com/gptme/gptme-contrib/pull/2168) **(gptme-usage)** resolve default quota config path without importing gptme

## Refactors

- [gptme-contrib#2145](https://github.com/gptme/gptme-contrib/pull/2145) **(gptodo)** recurrence gate is recur + wait, not a generated waiting_for
- [gptme-contrib#2149](https://github.com/gptme/gptme-contrib/pull/2149) **(review)** extract portable large-diff shard planner
- [gptme-contrib#2163](https://github.com/gptme/gptme-contrib/pull/2163) **(review)** extract portable subscription panel execution
- [gptme-contrib#2183](https://github.com/gptme/gptme-contrib/pull/2183) **(hooks)** remove co-occurrence prediction from match-lessons

## Documentation

- [gptme#4842](https://github.com/gptme/gptme/pull/4842) **(explain)** list current /compact modes (summarize|trim)
- [gptme-contrib#2113](https://github.com/gptme/gptme-contrib/pull/2113) **(gptme-vitals)** build already passes the shared theme
- [gptme-contrib#2189](https://github.com/gptme/gptme-contrib/pull/2189) **(bobutils)** list gh_json and gh_paginated_list in the README module table

## Tests

- [gptme#4812](https://github.com/gptme/gptme/pull/4812) **(config)** pin inline-array and empty-array provider roundtrip contract
- [gptme#4846](https://github.com/gptme/gptme/pull/4846)  isolate GPTME_LOGS_HOME per test (stop subagent-test-* leaking into live logs dir)
- [gptme#4891](https://github.com/gptme/gptme/pull/4891) **(tui)** verify work-view ownership and bounded timeout wakes
- [gptme#4894](https://github.com/gptme/gptme/pull/4894) **(time-awareness)** isolate tests from host session-deadline env
- [gptme#4914](https://github.com/gptme/gptme/pull/4914)  reset message output format around each test
- [gptme-contrib#2088](https://github.com/gptme/gptme-contrib/pull/2088) **(gptme-sessions)** isolate suite from host dispatch env and global git hooks
- [gptme-contrib#2160](https://github.com/gptme/gptme-contrib/pull/2160) **(sessions)** isolate tests from ambient CC_SESSION_ID
- [gptme-contrib#2188](https://github.com/gptme/gptme-contrib/pull/2188) **(lessons)** isolate trajectory replay from experiment settings

## CI & Infrastructure

- [gptme#4784](https://github.com/gptme/gptme/pull/4784) **(release)** publish to PyPI with OIDC in the pypi environment
- [gptme-contrib#2091](https://github.com/gptme/gptme-contrib/pull/2091) **(publish)** publish aw-watcher-agent to PyPI on aw-watcher-agent-v* tags
- [gptme-contrib#2100](https://github.com/gptme/gptme-contrib/pull/2100)  run PR checks on stacked PRs targeting feat/** bases

## Chore

- [gptme-contrib#2158](https://github.com/gptme/gptme-contrib/pull/2158) **(gptme-redact)** bump to 0.1.1 for repaired first publish

---

*187 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
