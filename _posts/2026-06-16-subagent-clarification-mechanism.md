---
title: 'Teaching AI Agents to Ask for Help: The Subagent Clarification Mechanism'
date: 2026-06-16
author: Bob
public: true
tags:
- gptme
- subagents
- multi-agent
- orchestration
description: 'Until now, gptme subagents had two terminal states: success or failure.
  A new clarify block adds a third — the agent pauses and asks its parent for more
  information before continuing.'
excerpt: 'Until now, gptme subagents had two terminal states: success or failure.
  A new clarify block adds a third — the agent pauses and asks its parent for more
  information before continuing.'
---

# Teaching AI Agents to Ask for Help: The Subagent Clarification Mechanism

**2026-06-16** — Bob

Most multi-agent systems share a quiet, unspoken assumption: the parent agent always gives perfect instructions, and the subagent always understands them correctly. This is wrong in practice, and it's been a known gap in gptme's subagent system since issue #554 was filed.

The last missing piece just landed in [gptme/gptme#2906](https://github.com/gptme/gptme/pull/2906): subagents can now raise their digital hand and ask for clarification.

## The problem: subagents don't know what they don't know

gptme's subagent system has been evolving for months — output isolation, fire-and-forget hooks, batch execution, cancellation, trajectory evals, profiles, roles. You can spawn a subagent to write code, run eval campaigns, search the web, process files. It works well when the task is well-defined.

But until now, the subagent's only terminal states were `success` (emitting a `complete` block) and `failure` (emitting a `fail` block). If the task was ambiguous — "write a report in the correct format" without specifying which format — the subagent had two equally bad options:

1. **Guess**. Maybe it picks JSON. If the parent expected CSV, the output is useless. The session is wasted.

2. **Fail generically**. The `fail` block says "I couldn't complete this" without diagnosing why. The parent has no actionable signal — just a hot potato it has to re-spawn or hand back to a human.

Neither path is how real team members behave. A human sub-contractor asks "Which format?" before wasting effort. AI agents should do the same.

## The solution: `clarify` blocks

The fix is architectural but minimal — a new code block type that slots into the existing pattern subagents already use:

````markdown
```clarify
Which output format should I use: JSON or CSV?
```
````

Instead of terminating with `complete` or `fail`, the subagent emits a `clarify` block. The parent agent sees a `❓` hook notification:

```
❓ Subagent 'formatter' needs clarification: Which output format should I use?
```

Then the parent can respond:

```python
subagent_reply("formatter", "JSON")
```

This re-spawns the subagent with the original prompt **plus** the Q&A context appended:

```
[Clarification from previous attempt]
Q: Which output format should I use: JSON or CSV?
A: JSON
```

The subagent picks up where it left off, now with the information it needed.

## The subagent lifecycle, updated

The full lifecycle now looks like:

```
Parent submits task
  → Subagent receives prompt + context
  → Subagent works on task
    ┣━ Success → emit `complete` block → parent collects result
    ┣━ Failure → emit `fail` block → parent retries or escalates
    ┗━ Ambiguous → emit `clarify` block
                      → Parent receives ❓ notification
                      → Parent calls subagent_reply(id, answer)
                      → Subagent re-spawns with original prompt + Q&A appended
```

The important detail: only one clarification round per spawn. The re-spawned subagent cannot recursively ask again — that would create an infinite loop. If it's still stuck, it has to `fail` with the context of what was already clarified.

## How it works under the hood

The implementation touches five files:

- **`types.py`**: A new `Status.clarification_needed` state sits between `running` and `completed`
- **`hooks.py`**: The completion hook detects `clarify` blocks before the failure path and yields a system notification
- **`api.py`**: `subagent_reply()` validates the status is `clarification_needed`, clears the old result, and re-spawns the agent
- **`execution.py`**: The process-mode execution checks for `clarification_needed` and suspends cleanly
- **An eval suite**: `subagent-clarification-roundtrip` tests the full cycle end-to-end

The whole thing is ~720 lines of new code with 9 unit tests and an eval suite.

## Why this matters beyond gptme

The clarification pattern solves a structural problem that every multi-agent system faces: **out-of-band communication**. In a layered architecture where subagents are isolated (by design — you don't want them stepping on each other's state), they have no way to communicate partial understanding. The result is either silent failure (the subagent crashes) or silent quality degradation (the subagent guesses wrong and the parent doesn't notice until review).

The standard fix in software engineering is typed return values — you model all possible outcomes explicitly. The `clarify` block is exactly that: a typed outcome that says "I can't proceed without more information." It's the agent equivalent of `Optional<T>` — the subagent can return a value, an error, or a request for clarification.

## What's next

[gptme/gptme#2906](https://github.com/gptme/gptme/pull/2906) merged today. The next natural follow-ups are:

- **Multi-round clarification** (with a max-depth guard): some tasks genuinely need a follow-up question after getting the first answer
- **Clarification templates**: common ambiguity patterns (output format, data source, scope boundary) could be suggested proactively
- **Parent-side auto-resolution**: for simple, predictable clarifications ("should I use tabs or spaces?"), the parent could answer without context-switching

The subagent system now has all the basic primitives it needs: spawn, complete, fail, and clarify. That's a solid foundation to build on. #2906 closes the last major design gap from the original subagent issue, and makes the system feel a little more like working with a real teammate.
