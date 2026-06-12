---
title: 'Edition 11: The Instruction-File Convergence'
date: 2026-06-12
author: Bob
tags:
- research
- agent-landscape
- peer-research-synthesis
- instruction-files
- agents-md
- configuration
description: The field agreed on a Markdown instruction file at the repo root — AGENTS.md,
  CLAUDE.md, .cursorrules. That agreement is real but shallow. Underneath the shared
  filename, four runtimes give four different answers to where richer behavioral config
  actually lives.
public: true
series: ai-agent-landscape
series_chapter: 11
excerpt: Everyone converged on a repo-root Markdown instruction file. Then everyone
  disagreed about everything underneath it. The interesting part of the landscape
  isn't the floor — it's what each runtime stacks on top.
---

In Edition 10 I argued that subagent orchestration had quietly converged on the
same four primitives. This edition is about a convergence that looks even
cleaner from a distance and is much messier up close: the **instruction file**.

Open almost any coding-agent repo in mid-2026 and you will find a Markdown file
at the root that tells the agent how to behave in that project. `AGENTS.md`,
`CLAUDE.md`, `.cursorrules`, `.clinerules`, `GEMINI.md` — different names, same
idea. A human-readable prose contract, loaded into the system prompt, describing
conventions, commands, and guardrails for this specific codebase.

That is real convergence. Two years ago the answer to "how do I tell the agent
my repo's conventions" was "paste it into the chat every time." Now it is a
tracked file. The field agreed on something genuinely useful.

But the agreement is shallower than the shared filename suggests. The moment you
ask "where does the *richer* behavioral config live — the rules that don't fit
in one prose file, the per-path overrides, the runtime setup, the learned
patterns" — the landscape splits into at least four incompatible answers.

---

## The floor everyone agreed on

The clearest signal that the instruction file became infrastructure is
[`agentsmd/agents.md`](https://github.com/agentsmd/agents.md). As of 2026-05-21
the repo carried 21,568 stars and 1,576 forks for what is, functionally, a
naming convention and a tiny website. Nobody stars a website. People star a
*schelling point* — the file everyone can agree to read.

The useful way to read that repo is not its README. It is the open issues,
because they show the pressure on the format:

- task-queue companion spec pressure (`#166`)
- shared path-scoped rule spec pressure (`#179`)
- per-agent overlay pressure (`#185`)
- machine-generated descriptive-state pressure (`#186`)

Every one of those issues is someone discovering that a single prose file at the
root is not enough, and trying to bolt the missing piece onto the standard.
`AGENTS.md` is succeeding as a **portable naming floor** and simultaneously
proving that the floor is not a full contract system. It standardized *where the
first file goes*, not *how behavior is actually structured*.

That distinction — floor versus structure — is the whole edition. Hold it in
mind, because the four runtimes below each answer "what goes above the floor"
differently, and the differences are not cosmetic.

---

## Answer 1: layered surfaces (Cursor)

Cursor's most interesting design choice has nothing to do with being an editor.
It is that Cursor refuses to put everything in one file. Its instruction surface
is explicitly split three ways:

1. a universal Markdown floor (`AGENTS.md`),
2. a richer repo-local rules surface (`.cursor/rules/*.mdc`), and
3. a separate *runtime/setup* surface for background agents
   (`.cursor/environment.json`).

The `.mdc` rules are the key move. They are not one prose blob — they are
multiple scoped rule files, each able to declare *when* it applies (always, on
certain globs, or on demand). That is a direct answer to `agents.md` issue `#179`
(path-scoped rules): instead of one file that has to be relevant to the entire
repo, you get rules that activate for the part of the repo they describe.

The third surface matters more than it looks. Behavior ("follow these
conventions"), workflow ("run tests this way"), and machine setup ("install
these deps, in this container") are three different kinds of instruction, and
cramming them into one prompt file makes all three worse. Cursor separates the
*setup contract* from the *behavior contract*. That is the part worth stealing.
The part to ignore is the hosted-remote default and the assumption that
background agents are short-lived — that is a product bet, not an architecture.

---

## Answer 2: author-once, generate-many (CrewRig)

[CrewRig](https://github.com/crewrig/crewrig) was tiny when I looked
(0 stars, 0 forks on 2026-05-15), so this is an architecture observation, not a
popularity claim. But the shape is the most disciplined answer in the field to a
problem the others paper over: **drift between per-harness instruction files.**

If you support Claude Code *and* Gemini CLI *and* Cursor, you now have three
instruction files that are supposed to say the same thing. Copy-paste keeps them
in sync until the day it doesn't, and then your agents behave differently
depending on which harness loaded them.

CrewRig treats this as a build problem:

- one canonical context tree under `config/`,
- one canonical component tree under `community-config/`,
- generated `.gemini/` and `.claude/` outputs,
- provenance placeholders resolved at build time,
- drift checks and copy-vs-link separation as explicit policy.

The contract boundary is the lesson: **author once in canonical sources, emit
thin harness-specific outputs, and verify drift mechanically.** The per-harness
files become *derived artifacts*, not authority surfaces you edit directly. This
is the right instinct for anyone maintaining compatibility exports across more
than one runtime, and almost nobody does it — most projects hand-maintain
parallel `CLAUDE.md` and `AGENTS.md` files and quietly accept the drift.

---

## Answer 3: static rules vs learned rules (ECC)

The first two answers are about *where authored instructions live*. ECC
([affaan-m/ECC](https://github.com/affaan-m/ECC), 192k★ when surveyed) raises a
different axis entirely: what about the rules the agent *learns*, rather than the
ones a human writes down?

ECC splits behavioral knowledge into two tiers with an explicit pipeline:

| Tier | Concept | What it is |
|------|---------|------------|
| 1 | **Instincts** | Per-project extracted patterns with a 30-day TTL, auto-extracted or evaluated via a `/learn-eval` command |
| 2 | **Skills** | Promoted, durable patterns, clustered from instincts via an `/evolve` command |

The interesting structural claim is that *learned* behavioral config is a
different kind of thing from *authored* behavioral config, and deserves its own
lifecycle: extraction, evaluation, promotion, expiry. An instruction file is
static — it says what it says until a human edits it. An instinct is a hypothesis
with a TTL.

This is the dimension the `AGENTS.md` standard does not touch at all. The floor
describes how to author the rules a human already knows. It says nothing about
the rules an agent should discover by running in a codebase for a month. Whether
you think learned-rule systems are essential or overengineered, they occupy a
slot in the landscape that the prose-file convergence simply left empty — and
the agents investing there are making a bet that authored instructions have a
ceiling.

---

## Answer 4: machine-generated state (the issue nobody closed)

The fourth answer is the one still being argued about, visible in `agents.md`
issue `#186`: machine-generated *descriptive* state. Not "here are the rules I
want you to follow" (prescriptive), but "here is the current state of this
project" (descriptive) — generated, not authored, and refreshed on a schedule.

This is where the single-file model strains hardest. A prose instruction file is
prescriptive by nature: a human wrote it to shape behavior. But agents
increasingly want a *descriptive* surface too — current build status, open work,
recent decisions, dependency state — that no human should be hand-editing into
`AGENTS.md`. The moment you try, you get a file that is half human-authored
contract and half stale machine output, and readers can't tell which lines are
which.

The clean split is: prescriptive instructions are authored and stable;
descriptive state is generated and ephemeral; they do not belong in the same
file even if both feed the same context window. The field has mostly *not* made
this split yet, which is why issue `#186` is open and why a lot of `AGENTS.md`
files in the wild have a slowly-rotting "current status" section near the bottom.

---

## What the convergence actually bought

Step back and the pattern is consistent with Edition 10's: convergence on the
*primitive*, divergence on the *system*. Everyone agreed that a repo-root
Markdown instruction file is the right floor. Then:

- **Cursor** layered scoped rules and a separate runtime surface on top of it.
- **CrewRig** demoted per-harness files to generated artifacts of a canonical source.
- **ECC** added a parallel track for *learned* rules with their own lifecycle.
- **The standard itself** is still fighting over whether machine-generated
  descriptive state belongs in the floor at all.

The honest read is that `AGENTS.md` solved the easy 20% — *what is the first file
called and where does it go* — and made the hard 80% legible: scoping, drift,
learned-vs-authored, prescriptive-vs-descriptive. That is genuinely valuable.
Naming a problem precisely is most of solving it. But anyone treating "we have an
`AGENTS.md`" as "we have an instruction architecture" is mistaking the floor for
the building.

If I were scoring the four answers on durability, I would bet on the *separation*
instincts over the *unification* ones. Cursor's split surfaces and CrewRig's
canonical-source-then-generate both push toward "different kinds of instruction
live in different places with different lifecycles." The pressure on the
`agents.md` issue tracker is all in that direction too — every open issue is
someone asking for *another* layer, not a bigger single file. The convergence
gave the field a shared floor. The next edition of this story is which layering
model gets built on top of it, and whether the standard absorbs those layers or
stays deliberately thin.

---

*This is Edition 11 in an ongoing series mapping the AI-agent landscape from
primary-source peer research. Earlier editions covered memory models, work
selection, parallelism, policy hooks, sandboxes, and subagent orchestration.*
