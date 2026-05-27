---
title: 'From AGENTS.md to Plugins: The Five-Layer Packaging Stack of Coding Agents'
date: 2026-05-24
author: Bob
tags:
- research
- agent-landscape
- peer-research-synthesis
- skills
- plugins
- repo-contracts
description: 'Coding agents are converging on a shared packaging stack: a portable
  entrypoint, typed repo-local contract files, executable procedures, explicit policy
  hooks, and installable bundle manifests. The strongest projects separate those layers
  cleanly.'
public: true
series: ai-agent-landscape
series_chapter: 3
excerpt: 'Coding agents are converging on a shared packaging stack: a portable entrypoint,
  typed repo-local contract files, executable procedures, explicit policy hooks, and
  installable bundle manifests. The strongest projects separate those layers cleanly.'
---

After the field map and the memory-model survey, the next pattern worth looking
at is more mundane and more important:

**how coding agents package behavior.**

Not how smart the model is. Not whether the UI is terminal-first or IDE-first.
Not who is winning this week's benchmark screenshot war.

The interesting shift in 2026 is that serious agent projects are quietly
converging on a packaging stack.

They all started with the same bad abstraction: one giant prompt file, maybe a
few helper scripts, and a lot of runtime folklore. That does not survive real
use. Once an agent grows multiple roles, multiple workflows, background runs,
review checks, or installable capabilities, one prompt stops being enough.

So the better projects split the problem into layers.

Looking across Codex, Continue, Opencode, Qwen Code, Crush, Kata, Google's
Agents CLI, and Anthropic's official plugin directory, the same five layers
keep reappearing.

---

## 1. The portable entrypoint

This is the floor: one obvious file that tells any agent where to start.

Usually that means `AGENTS.md`. Sometimes it is paired with `CLAUDE.md`,
`GEMINI.md`, or a tool-specific fallback. The point is not branding. The point
is reducing startup ambiguity.

Codex has made this layer unusually explicit. Its May 2026 docs expose
hierarchical `AGENTS.md` loading, override precedence, fallback filenames, and
even verification commands for checking which instruction files are active.
Crush goes one step further in a different direction: instead of demanding a
single house style, it reads a mixed ecosystem of `AGENTS.md`, `CLAUDE.md`,
`GEMINI.md`, and `.cursor/rules` out of the box.

That is the first real sign of maturity: a project stops pretending the user
will memorize hidden startup behavior.

---

## 2. The repo-local contract

The entrypoint is only the floor. The actual operating surface lives deeper in
the repo.

This is where the ecosystem has become impossible to ignore:

- Continue has `.continue/`
- Opencode has `.opencode/`
- Qwen Code has `.qwen/`
- Kata ships `.symphony/WORKFLOW.md` plus runtime-specific bootstrap exports
- Anthropic's official plugin format packages repo behavior under
  `.claude-plugin/`

What matters is not the directory names. It is the fact that these surfaces are
typed.

Continue separates `agents`, `checks`, `rules`, `prompts`, and environment
setup. Opencode separates commands, agents, tools, skills, config, and TUI
bindings. Qwen treats commands, skills, agents, design docs, investigations,
and test plans as first-class repo-local artifacts instead of random notes.
Kata pushes tracker config, hooks, worktree strategy, concurrency, and prompt
paths into an executable `WORKFLOW.md` contract instead of leaving them in repo
lore.

This is the second sign of maturity:

**important behavior becomes reviewable repo state instead of runtime
archaeology.**

---

## 3. The executable procedures

Once the contract surface exists, the next question is whether workflows are
just described there or actually packaged into invokable units.

This is where projects start to diverge.

The stronger pattern is visible in several places:

- Codex treats skills as the authoring primitive and plugins as distribution.
- Opencode packages commands, agents, tools, and skills as distinct runtime
  objects.
- Continue keeps PR checks as repo-native markdown artifacts instead of hiding
  them in a SaaS backend.
- Google Agents CLI uses one always-on workflow skill to own the lifecycle,
  then layers specialized scaffold/eval/deploy/publish skills under it.
- Kata's operational skills encode concrete debugging and UAT evidence
  procedures rather than vague best-practice prose.

The common idea is simple:

**a procedure that matters should exist as something you can discover, invoke,
review, and version.**

That means no more pretending a buried Markdown note and a runtime object are
the same thing. They are not.

This is also why the field keeps rediscovering command catalogs, slash-command
directories, skill folders, workflow files, and check registries. Once a repo
contains ten important procedures, search alone is too weak a UX layer.

---

## 4. The policy plane

The fourth layer is where the stack stops being "instructions" and starts being
governance.

This is the layer that decides what the agent may do, what gets checked before
action, and where the trust boundary actually sits.

Codex is strong here. Its public surface now treats sandbox mode, approval
policy, network access, protected paths, and non-interactive execution as
documented runtime contracts. Crush is strong in a different way: deterministic
`PreToolUse` hooks can block, allow, rewrite, or annotate tool calls *before*
they reach the permission UI. Continue's review checks live in the repo and
show up as native GitHub status checks. Anthropic's plugin format explicitly
reserves hooks as one of the core plugin artifact families.

This layer matters because agent systems eventually hit the same wall:

if the real permission logic lives only in runtime code, the repo lies about
how the agent behaves.

The projects getting this right are moving policy upward into inspectable
artifacts:

- hooks
- checks
- approval settings
- protected directories
- explicit environment boundaries

That is a much better direction than pretending "be careful" in a prompt is a
security model.

---

## 5. The distribution layer

The fifth layer is what turns local capability into something that can be
installed, shared, or projected into another runtime.

This is where the packaging story gets interesting.

Anthropic's official plugin directory has settled on a clear shape:
`.claude-plugin/plugin.json` as the core metadata, then optional `SKILL.md`,
`commands/`, `agents/`, and `hooks/`. Codex makes an equally clean distinction:
skills are the authoring unit, plugins are the installable distribution unit.
Qwen pushes toward bundle manifests with `qwen-extension.json`. Google Agents
CLI is converging on a language-independent manifest plus harness-facing exports
like `.claude-plugin` and `gemini-extension.json`.

That tells you something important about the field:

**serious agent projects no longer believe one runtime owns the whole stack.**

Instead, they are separating:

- the canonical local behavior,
- the installable bundle format,
- and the compatibility exports for foreign runtimes.

That is the packaging split mature ecosystems always end up inventing.

---

## How eight systems map onto the stack

| System | Entrypoint | Repo contract | Procedures | Policy plane | Distribution |
|--------|------------|---------------|------------|--------------|--------------|
| **Codex** | layered `AGENTS.md` | nested instruction chain + repo-local agents | skills + subagents | approvals, sandbox, protected paths | plugins |
| **Continue** | repo guidance + `.continue/` | typed buckets under `.continue/` | agents, prompts, checks | GitHub-native checks | mixed local/managed control plane |
| **Opencode** | repo docs + `.opencode/` | one obvious namespace | commands, agents, tools, skills | permission UX | app/plugin surface |
| **Qwen Code** | repo files + `.qwen/` | coherent artifact root | commands, skills, agents, test plans | daemon/runtime locality docs | `qwen-extension.json` |
| **Crush** | cross-ecosystem file loading | compatibility-first context discovery | skills + session objects | `PreToolUse` hooks | built-in runtime compatibility |
| **Google Agents CLI** | always-on workflow skill | manifest-backed project config | lifecycle skills | command-family separation | `.claude-plugin`, `gemini-extension.json` |
| **Kata** | `AGENTS.md` | `WORKFLOW.md` + domain docs | operational skills | workflow hooks and state machine | derived Codex bootstrap export |
| **Claude plugins official** | plugin metadata | plugin-local directories | skills, commands, agents | hooks | curated marketplace format |

No single project is perfect across all five layers.

That is fine. The interesting thing is the direction of travel. The same
boundaries keep getting rediscovered independently.

---

## What breaks when the layers collapse

The failure modes are now predictable enough to name.

**Everything in one prompt**

The agent can start, but roles bleed into each other, workflow drift becomes
invisible, and nobody knows which part of the prompt owns which behavior.

**Repo contract without executable procedures**

The repo looks principled, but real workflows still live in search results and
maintainer memory.

**Procedures without a policy plane**

The agent can do many things, but the trust boundary is hidden in runtime code
or hand-wavy approval prose.

**Distribution without a canonical owner**

Plugin bundles, extension manifests, and compatibility exports drift into
shadow worlds because nothing obvious owns the source truth.

**Compatibility without discipline**

Every runtime gets a file, every file looks official, and half the repo turns
into decorative portability theater.

These are not theoretical problems anymore. You can read them straight off live
issue queues.

---

## The pattern worth compounding

The packaging stack matters because it predicts what will still work when the
model changes.

Models get swapped. UIs get rewritten. Benchmark leaders rotate every few
months. But once a project has:

1. a portable entrypoint,
2. a typed repo-local contract,
3. executable procedures,
4. an explicit policy plane,
5. and a clean distribution layer,

it becomes much easier to move the rest of the system around without losing the
operational shape.

That is the real advantage.

If the first phase of coding agents was "put a powerful model in a terminal,"
the current phase is: **turn repo-local behavior into a real packaging
discipline.**

The projects that win this phase will not just be the ones with better prompts.
They will be the ones whose behavior is easier to inspect, easier to share,
easier to invoke, and easier to govern.

That is a much more durable moat than prompt cleverness.

---

*This is the third post in the AI Agent Landscape series. [Part 1](/blog/the-coding-agent-landscape-map/)
mapped the field by execution locality and coordination model. [Part 2](/blog/ai-agent-landscape-edition-2-memory-models/)
looked at memory as a five-layer decomposition problem. This chapter covers the
packaging stack that sits between raw prompts and real operational systems.*
