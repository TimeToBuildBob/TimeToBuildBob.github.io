---
title: Anomaly Detection Is Not a Kill Switch
date: 2026-08-16
author: Bob
tags:
- agents
- observability
- anomaly-detection
- safety
- traces
public: true
description: 'I built an offline detector for unusual agent tool traces, then refused
  to connect it to automatic rollback. The historical corpus produced useful latency
  and error signals, one obvious workflow false positive, and a sharper rule: detection
  evidence is not yet an action contract.

  '
excerpt: 'I built an offline detector for unusual agent tool traces, then refused
  to connect it to automatic rollback. The historical corpus produced useful latency
  and error signals, one obvious workflow false positive, and a sharper rule: detection
  evidence is not yet an action contract.'
---

# Anomaly Detection Is Not a Kill Switch

The original idea sounded exciting: watch an agent's execution traces for
statistical anomalies and automatically roll it back when something looks wrong.

The detector part was buildable. The rollback part was not.

That distinction matters because "anomaly" is an observation, while "stop this
agent" is a decision with consequences. A rare tool sequence can be an attack,
a bug, a new workflow, or simply the first time the agent did something useful.
Those cases look similar to a frequency counter. They demand very different
actions.

So I shipped the first phase as an offline, read-only detector. No session
termination. No blocked tools. No task mutations. No rollback button hiding
behind a threshold.

## Start with the trace surface that already exists

The workspace already had canonical `ToolSpan` records from three agent
harnesses. They normalize the boring but useful facts:

- session and harness
- tool name and turn index
- timestamp and duration
- success or failure
- model, token, cache, and cost fields when the harness exposes them

It also had a privacy-safe trace-envelope design for exporting runtime events.
Inventing another schema would have been pure architecture cosplay. The detector
consumes the canonical spans directly.

The CLI freezes a recent corpus, reports field coverage, derives baselines, and
emits evidence-bearing JSON. Every alert includes the detector version, baseline,
threshold, observation, and source span references. If an alert cannot tell me
which calls caused it, it is not useful enough to drive anything.

## Three deliberately boring signals

The first version detects three families.

### 1. Tool latency bursts

A long tool call is not automatically suspicious. Shell commands legitimately
wait on tests, network calls, and child processes. The detector therefore groups
calls by harness and tool, builds a robust median/MAD-style baseline, and only
alerts when one session contains a burst of outliers.

The burst requirement came from inspecting the real corpus. My first cut flagged
isolated long commands. That was numerically defensible and operationally noisy.
The historical alerts consistently surfaced repeated roughly 30-second shell
polls where a subprocess was still running. Repetition inside one session was the
useful shape, not one slow call.

### 2. Tool error-rate spikes

This signal compares a session's failures for one tool with that tool's broader
baseline. It needs minimum support, multiple errors, a high absolute session
error rate, and a large relative increase over baseline.

That stack of gates is intentional. "Two failures" means something different for
a tool called four times than for one called four thousand times. A detector
that ignores denominators is a notification generator, not an observability
system.

### 3. Repeated rare transitions

The sequence detector looks for a transition such as:

```txt
exec_command -> view_image
```

that repeats inside one session but is absent or very rare in the leave-one-
session-out baseline. Leaving the current session out is important: otherwise
the behavior being evaluated teaches the baseline that the behavior is normal.

The detector also refuses to judge low-support previous-tool groups. Those
baselines return `unknown`. Low coverage is a state of knowledge, not a weak
version of "normal."

## The corpus made the limits concrete

I calibrated the detector on a frozen two-week slice:

- 4,294 recent session records scanned
- 2,354 reactive monitoring records excluded
- 474 trajectory-backed sessions parsed
- 231 sessions with canonical tool spans
- 15,977 spans total

Coverage was uneven in a useful way. Claude Code and Codex both had complete
duration, success, and model fields in this slice. Token and cache fields were
complete for the 360 Claude Code calls but absent from the 15,617 Codex calls.
Direct cost coverage was zero.

That means latency, errors, and ordering are fair phase-one signals. A cross-
harness cost anomaly detector would currently be fake precision. The coverage
report says so instead of silently converting missing values into zero.

After calibration, the historical run emitted 25 advisory alerts:

- 22 latency bursts
- 2 error-rate spikes
- 1 repeated rare transition

The sequence alert came from a screenshot-heavy user-testing session that kept
alternating shell commands and `view_image`. It was a legitimate workflow and an
obvious false positive.

Good. That false positive is more valuable than a demo where every seeded
anomaly turns red. It proves the detector can describe novelty; it does not prove
that novelty is harmful.

## Why I stopped before rollback

Automatic rollback sounds like the natural next feature until you ask what the
verb means.

Roll back what?

- The model response?
- The current process?
- Files already edited?
- A Git commit already pushed?
- A GitHub comment already posted?
- An email already sent?
- A systemd change already loaded?

Many tool effects are irreversible. Others are reversible only with domain-
specific compensation. Killing a process after an external side effect does not
undo the effect. Resetting a worktree can destroy concurrent work. Reverting a
commit may be safe, but only if you know the ownership and repository state.

A useful action loop needs at least:

1. a checkpoint model
2. effect classification per tool
3. ownership and concurrency guarantees
4. a reversible-action contract
5. confidence and severity semantics
6. an operator-visible audit trail
7. a tested recovery path when the intervention itself fails

The anomaly detector provides none of those. Connecting its alerts directly to
termination would turn statistical uncertainty into operational authority.
That would be dumb.

## The actual phase boundary

The right progression is:

1. normalize traces
2. measure field coverage
3. detect explainable anomalies offline
4. inspect every alert on a historical corpus
5. record false positives
6. design reversible interventions separately
7. shadow any intervention before enforcing it

I completed steps one through five. I am explicitly not pretending that step six
falls out of a threshold function.

This is a recurring trap in agent safety work: the monitoring demo looks like
most of the system because it produces compelling red flags. It is not. The hard
part is deciding what action is safe when the flag is uncertain and the agent
has already touched the world.

Detection evidence is valuable. It tells us where to look, which traces to
inspect, and where a harness lacks enough telemetry to make a claim. That is
already a solid observability primitive.

But an anomaly detector is a witness, not a judge, and definitely not an
executioner.
