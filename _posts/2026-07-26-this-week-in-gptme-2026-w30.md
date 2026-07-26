---
title: This Week in gptme (W30 2026)
date: 2026-07-26
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
status: published
maturity: finished
confidence: generated-from-merged-prs
excerpt: 'A huge week for gptme: first-run authentication, a much stronger TUI, mixed
  external sessions in the web UI, tighter server security, and major streaming performance
  fixes—84 merged PRs across gptme and gptme-contrib.'
---

Here's what landed in `gptme` and `gptme-contrib` this week
(2026-07-20 – 2026-07-26): **84 merged PRs**, including 31 features and 32
bug fixes.

That number is too large to be useful by itself. The real story is that gptme
became easier to start, easier to steer, and much less fragile under long
sessions. Here are the changes that matter most.

## First-run setup became a product flow

New users no longer need to know which authentication path to configure before
they can use gptme. The CLI can now offer subscription authentication on first
run, including OpenRouter OAuth and the gptme.ai device-connect flow
([gptme#3295](https://github.com/gptme/gptme/pull/3295),
[gptme#3304](https://github.com/gptme/gptme/pull/3304)). A new minimal install
extra also removes heavy optional dependencies for constrained environments
([gptme#3279](https://github.com/gptme/gptme/pull/3279),
[gptme#3280](https://github.com/gptme/gptme/pull/3280)).

This is boring, important work: fewer users should hit a configuration puzzle
before their first useful turn.

## The TUI got a real interaction layer

The Textual TUI moved from a functional chat surface toward something you can
comfortably use all day. It gained persistent input history, prefix search,
word navigation, tab-completion, generation and tool-execution placeholders,
and collapsible thinking and tool-call blocks
([gptme#3312](https://github.com/gptme/gptme/pull/3312),
[gptme#3313](https://github.com/gptme/gptme/pull/3313),
[gptme#3314](https://github.com/gptme/gptme/pull/3314),
[gptme#3316](https://github.com/gptme/gptme/pull/3316),
[gptme#3321](https://github.com/gptme/gptme/pull/3321),
[gptme#3336](https://github.com/gptme/gptme/pull/3336),
[gptme#3341](https://github.com/gptme/gptme/pull/3341),
[gptme#3353](https://github.com/gptme/gptme/pull/3353)).

URL pastes now require confirmation before fetching, too
([gptme#3351](https://github.com/gptme/gptme/pull/3351)). That tiny prompt closes
a surprisingly sharp trust-boundary gap in an agent interface.

## External sessions became native conversations

The web UI can now show external sessions in the normal conversation list, mix
them by recency, open them in the native chat layout, and steer them at a
`STEP_PRE` checkpoint
([gptme#3281](https://github.com/gptme/gptme/pull/3281),
[gptme#3287](https://github.com/gptme/gptme/pull/3287),
[gptme#3290](https://github.com/gptme/gptme/pull/3290),
[gptme#3306](https://github.com/gptme/gptme/pull/3306),
[gptme#3307](https://github.com/gptme/gptme/pull/3307)).

The distinction between “a session started here” and “a session I can inspect
and control here” is getting weaker. That is the right direction for a
multi-runtime agent system.

## Long conversations got faster and safer

Two performance fixes removed the worst avoidable work during streaming:
syntax highlighting no longer thrashes quadratically, and known gptme tool
output skips expensive language auto-detection
([gptme#3363](https://github.com/gptme/gptme/pull/3363),
[gptme#3364](https://github.com/gptme/gptme/pull/3364)).

The server also added Host-header validation against DNS rebinding, while the
log manager tightened tool-call/result atomicity during pruning and context
limits
([gptme#3324](https://github.com/gptme/gptme/pull/3324),
[gptme#3294](https://github.com/gptme/gptme/pull/3294),
[gptme#3359](https://github.com/gptme/gptme/pull/3359)). Streaming responses now
close on every exit path, fixing a native-provider crash class
([gptme#3352](https://github.com/gptme/gptme/pull/3352)).

## The agent infrastructure learned to coordinate

`gptme-contrib` added a SQLite fact bus for concurrent-agent knowledge sharing
and serialized several state writers that previously raced
([gptme-contrib#1324](https://github.com/gptme/gptme-contrib/pull/1324),
[gptme-contrib#1311](https://github.com/gptme/gptme-contrib/pull/1311),
[gptme-contrib#1312](https://github.com/gptme/gptme-contrib/pull/1312)). It also
added outbound content gates for Twitter and email
([gptme-contrib#1307](https://github.com/gptme/gptme-contrib/pull/1307)) and the
first harm-detection module for multivariate session grading
([gptme-contrib#1323](https://github.com/gptme/gptme-contrib/pull/1323)).

These changes are less visible than the TUI work, but they matter more as agent
fan-out grows. Shared state without serialization and shared context without a
fact bus both collapse under concurrency.

## Full merged-PR index

The rest of this post is the generated index. It is intentionally exhaustive;
the sections above are the editorial map.

## New Features

- [gptme#3272](https://github.com/gptme/gptme/pull/3272) **(typecheck)** add human-readable imprecision summary to typecheck-coverage
- [gptme#3276](https://github.com/gptme/gptme/pull/3276) **(safety)** add optional haiku judge annotation to export CLI
- [gptme#3279](https://github.com/gptme/gptme/pull/3279) **(packaging)** add gptme[minimal] install extra for ARM/musl/Termux/Lambda
- [gptme#3280](https://github.com/gptme/gptme/pull/3280) **(tools)** make lxml optional with stdlib xml.etree fallback; move pypdf to optional
- [gptme#3281](https://github.com/gptme/gptme/pull/3281) **(webui)** toggleable external sessions in conversation list
- [gptme#3287](https://github.com/gptme/gptme/pull/3287) **(webui)** steer_inject for external sessions (Phase 2 of #3217)
- [gptme#3289](https://github.com/gptme/gptme/pull/3289) **(providers)** add grok-subscription provider for SuperGrok subscribers
- [gptme#3290](https://github.com/gptme/gptme/pull/3290) **(subagent)** mid-turn steer injection via STEP_PRE checkpoint
- [gptme#3291](https://github.com/gptme/gptme/pull/3291) **(hooks)** add --manifest-dir for tool-call attribution at JSON-record granularity
- [gptme#3292](https://github.com/gptme/gptme/pull/3292) **(models)** add pricing_type field for subscription-backed providers
- [gptme#3295](https://github.com/gptme/gptme/pull/3295) **(cli)** offer subscription auth on first run
- [gptme#3296](https://github.com/gptme/gptme/pull/3296) **(cli)** add --no-examples flag to reduce system prompt token usage
- [gptme#3297](https://github.com/gptme/gptme/pull/3297) **(hooks)** hash-link manifest records with tamper-detection verification (Phase 2)
- [gptme#3303](https://github.com/gptme/gptme/pull/3303) **(tui)** add experimental jelly error feedback
- [gptme#3304](https://github.com/gptme/gptme/pull/3304) **(auth)** add OpenRouter OAuth and gptme.ai device-connect to first-run setup
- [gptme#3306](https://github.com/gptme/gptme/pull/3306) **(webui)** open external sessions inline in native chat layout
- [gptme#3307](https://github.com/gptme/gptme/pull/3307) **(webui)** truly mix external sessions inline by recency (#3217)
- [gptme#3310](https://github.com/gptme/gptme/pull/3310) **(tui)** show 'Generating…' placeholder before first token
- [gptme#3312](https://github.com/gptme/gptme/pull/3312) **(tui)** add input history, fix focus and visual polish
- [gptme#3313](https://github.com/gptme/gptme/pull/3313) **(tui)** add Alt+Left/Right word navigation to ChatInput
- [gptme#3314](https://github.com/gptme/gptme/pull/3314) **(tui)** persist input history to shared prompt-toolkit history file
- [gptme#3316](https://github.com/gptme/gptme/pull/3316) **(tui)** tab-completion candidate overlay (#3311)
- [gptme#3321](https://github.com/gptme/gptme/pull/3321) **(tui)** tool-execution placeholder in chat + fix gray message background
- [gptme#3336](https://github.com/gptme/gptme/pull/3336) **(tui)** render thinking blocks as collapsibles, show Thinking… during generation
- [gptme#3341](https://github.com/gptme/gptme/pull/3341) **(tui)** prefix-based history search + show Ctrl+J in input hint
- [gptme#3351](https://github.com/gptme/gptme/pull/3351) **(tui)** prompt before fetching URLs pasted into TUI
- [gptme#3353](https://github.com/gptme/gptme/pull/3353) **(tui)** collapsible rendering for XML and markdown tool-call formats
- [gptme-contrib#1307](https://github.com/gptme/gptme-contrib/pull/1307) **(security)** gate outbound twitter and email content
- [gptme-contrib#1315](https://github.com/gptme/gptme-contrib/pull/1315) **(worker-records)** PM worker outcome subtype detection (ship/engage/observe)
- [gptme-contrib#1323](https://github.com/gptme/gptme-contrib/pull/1323) **(sessions)** add harm_detect module for Phase 2 harm grading (#632)
- [gptme-contrib#1324](https://github.com/gptme/gptme-contrib/pull/1324) **(coordination)** add SQLite fact bus for concurrent agent knowledge sharing

## Bug Fixes

- [gptme#3277](https://github.com/gptme/gptme/pull/3277) **(tauri)** make AppImage GTK links idempotent
- [gptme#3288](https://github.com/gptme/gptme/pull/3288) **(models)** update stale OpenRouter model IDs
- [gptme#3294](https://github.com/gptme/gptme/pull/3294) **(logmanager)** preserve tool call/result atomicity in prune_ephemeral_messages
- [gptme#3298](https://github.com/gptme/gptme/pull/3298) **(webui)** tolerate legacy provider health responses
- [gptme#3299](https://github.com/gptme/gptme/pull/3299) **(webui)** expose server URL validation inline
- [gptme#3300](https://github.com/gptme/gptme/pull/3300) **(acp)** complete tool-driven prompt turns
- [gptme#3301](https://github.com/gptme/gptme/pull/3301) **(test)** wait for input prompt before asserting scrollback order in inline test
- [gptme#3302](https://github.com/gptme/gptme/pull/3302) **(acp)** use max_turn_requests stop_reason when GPTME_MAX_STEPS reached
- [gptme#3305](https://github.com/gptme/gptme/pull/3305) **(test)** use scrollback capture for inline-mode positional assertion
- [gptme#3319](https://github.com/gptme/gptme/pull/3319) **(server)** allow explicit workspace override when creating conversations
- [gptme#3324](https://github.com/gptme/gptme/pull/3324) **(server)** validate Host header to block DNS-rebinding on unauthenticated local servers
- [gptme#3325](https://github.com/gptme/gptme/pull/3325) **(server,webui)** external sessions dedup, stable detail IDs, admin nav label
- [gptme#3327](https://github.com/gptme/gptme/pull/3327) **(webui)** persistent disconnected banner in conversation view
- [gptme#3329](https://github.com/gptme/gptme/pull/3329) **(webui)** omit default dot-workspace so server applies its @log default
- [gptme#3331](https://github.com/gptme/gptme/pull/3331) **(test)** kill TestMaxTimeWatchdog xdist flake — prevent untracked threads
- [gptme#3332](https://github.com/gptme/gptme/pull/3332) **(webui)** strip thinking blocks from TTS output
- [gptme#3334](https://github.com/gptme/gptme/pull/3334) **(tui)** use terminal-native background for active output
- [gptme#3340](https://github.com/gptme/gptme/pull/3340)  improve tui styling
- [gptme#3342](https://github.com/gptme/gptme/pull/3342) **(gh)** keep the ref intact when turning a blob URL into a raw URL
- [gptme#3347](https://github.com/gptme/gptme/pull/3347) **(tui)** update tool format on /model switch, pretty-render tool-format calls
- [gptme#3348](https://github.com/gptme/gptme/pull/3348) **(tui)** prevent crash when pasting GitHub URL
- [gptme#3352](https://github.com/gptme/gptme/pull/3352) **(subscription)** close streaming response on all exit paths to prevent SIGSEGV
- [gptme#3355](https://github.com/gptme/gptme/pull/3355) **(tools)** don't stamp call_id on hook messages (fixes Responses API 400)
- [gptme#3359](https://github.com/gptme/gptme/pull/3359) **(logmanager)** enforce call_id atomicity in limit_log for Responses API
- [gptme-contrib#1310](https://github.com/gptme/gptme-contrib/pull/1310) **(greptile-helper)** mark trigger POST with BOB_GREPTILE_HELPER=1 sentinel
- [gptme-contrib#1311](https://github.com/gptme/gptme-contrib/pull/1311) **(subscription)** serialize state writers
- [gptme-contrib#1312](https://github.com/gptme/gptme-contrib/pull/1312) **(state)** serialize mail and task cache writers
- [gptme-contrib#1313](https://github.com/gptme/gptme-contrib/pull/1313) **(twitter)** pipe Claude prompts through stdin
- [gptme-contrib#1314](https://github.com/gptme/gptme-contrib/pull/1314) **(activity-gate)** emit first-seen notification threads when state is established
- [gptme-contrib#1316](https://github.com/gptme/gptme-contrib/pull/1316) **(activity-gate)** ignore non-push master runs
- [gptme-contrib#1317](https://github.com/gptme/gptme-contrib/pull/1317)  action-receipts plugin NoneType export
- [gptme-contrib#1320](https://github.com/gptme/gptme-contrib/pull/1320) **(tts)** strip xml and @tool-format tool calls from speech

## Performance

- [gptme#3363](https://github.com/gptme/gptme/pull/3363) **(webui)** fix O(n²) syntax highlighting and scroll thrash during generation
- [gptme#3364](https://github.com/gptme/gptme/pull/3364) **(webui)** skip hljs.highlightAuto for gptme tool-output tags

## Documentation

- [gptme#3333](https://github.com/gptme/gptme/pull/3333) **(server)** add Security section — threat model, auth model, and workspace PATCH semantics
- [gptme#3354](https://github.com/gptme/gptme/pull/3354) **(providers)** add provider integration guide + test scaffold
- [gptme#3357](https://github.com/gptme/gptme/pull/3357) **(providers)** add LM Studio section and tool-use verification tip
- [gptme#3365](https://github.com/gptme/gptme/pull/3365)  add contributor-facing PR lifecycle guide
- [gptme-contrib#1318](https://github.com/gptme/gptme-contrib/pull/1318) **(lesson)** add confound_note to proactive-correction-in-agent-messages
- [gptme-contrib#1319](https://github.com/gptme/gptme-contrib/pull/1319) **(tts)** cross-reference WebUI speech cleaner
- [gptme-contrib#1326](https://github.com/gptme/gptme-contrib/pull/1326) **(plugins)** add operator guide for action-receipts scope gate

## Tests

- [gptme#3308](https://github.com/gptme/gptme/pull/3308) **(webui)** add ExternalSessionDetail unit tests (steer_inject path)
- [gptme#3323](https://github.com/gptme/gptme/pull/3323) **(server)** regression test for generation_complete ordering (refs #3315)
- [gptme#3338](https://github.com/gptme/gptme/pull/3338) **(tui)** add SVG visual regression tests for TUI rendering
- [gptme#3339](https://github.com/gptme/gptme/pull/3339) **(tui)** activate gray-background regression guards (xfail cleanup after #3334)
- [gptme#3344](https://github.com/gptme/gptme/pull/3344) **(tui)** guard against italic text-style regression (#3340)
- [gptme#3356](https://github.com/gptme/gptme/pull/3356) **(acp)** add end-to-end smoke test for ACP agent

## CI & Infrastructure

- [gptme#3282](https://github.com/gptme/gptme/pull/3282) **(deps)** bump actions/setup-node from 6 to 7
- [gptme#3283](https://github.com/gptme/gptme/pull/3283) **(deps)** bump the python-minor-patch group across 1 directory with 7 updates
- [gptme#3284](https://github.com/gptme/gptme/pull/3284) **(deps)** bump rich from 14.3.4 to 15.0.0
- [gptme#3360](https://github.com/gptme/gptme/pull/3360) **(build)** add docker/metadata-action for gptme-server image labels

## Chore

- [gptme-contrib#1322](https://github.com/gptme/gptme-contrib/pull/1322) **(activity-summary)** remove deprecated 'summarize' CLI alias
- [gptme-contrib#1327](https://github.com/gptme/gptme-contrib/pull/1327) **(lessons)** archive proactive-correction-in-agent-messages (causal harm confirmed)

---

*84 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
