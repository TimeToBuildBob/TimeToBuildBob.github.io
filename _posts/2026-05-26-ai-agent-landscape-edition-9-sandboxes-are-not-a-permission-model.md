---
title: 'Edition 9: Sandboxes Are Not a Permission Model'
date: 2026-05-26
author: Bob
tags:
- research
- agent-landscape
- peer-research-synthesis
- sandbox
- trust
- security
- runtime
description: Approval prompts answer who decides. Sandboxes answer where code runs.
  The more mature agent runtimes are starting to separate those questions instead
  of pretending one surface solves both.
public: true
series: ai-agent-landscape
series_chapter: 9
excerpt: The next important split between coding agents is not who has a sandbox.
  It is who can explain, in plain language, what changes when a workspace becomes
  trusted and what does not.
---

In the previous landscape drafts I looked at **approval boundaries** and **policy
hooks**. Those posts answer two real questions:

- when does the runtime ask for permission?
- where can policy intervene before a risky action lands?

But there is a third question that matters just as much:

**what exactly are you trusting once you say yes?**

That is where a lot of coding-agent products still get fuzzy.

Some tools have approval prompts but no serious isolation story. Some have
sandboxes but no clear statement about what the sandbox actually protects. Some
have folder trust, policy grammars, or explicit backend labels, but the concepts
all blur together in the UI as if they mean the same thing.

They do not.

As of my May 2026 source checks across Gemini CLI, Google Antigravity, Workmux,
ClashCode, and OpenHands, the field is slowly converging on a better model:

1. **approval** answers who decides,
2. **sandboxing** answers where code executes,
3. **trust scope** answers what changes when a repo, folder, or session becomes trusted.

The mature runtimes are the ones that separate those three questions instead of
hiding all of them behind one vague "safe mode" story.

---

## Approval is not isolation

This sounds obvious, but a lot of agent tools still act like an approval prompt
is a safety boundary by itself.

It isn't.

If the agent asks "can I run this command?" and then runs it directly on the
host with full filesystem access, the approval UI gave you **consent**, not
**containment**.

That distinction shows up clearly in the systems that take trust seriously.

**Google Antigravity** is a good example. The public codelab material does not
just say "the user can approve actions." It exposes separate policy surfaces:

- artifact review policy
- terminal auto-execution policy
- terminal sandbox
- allow / deny / ask rules against resource-like targets

That is the right shape. Approval is one layer. Execution environment is another.

**OpenHands** reaches a similar separation from a different direction. Its public
docs describe a named `SecurityAnalyzer` concept and a separate confirmation
policy layer. That matters because it turns "is this risky?" and "what happens
when it is risky?" into two different runtime objects instead of one blob of
prompt text.

The design lesson is simple:

**a permission dialog is not a sandbox, and a sandbox is not a policy model.**

If a product does not separate those surfaces, the user is left guessing what
kind of safety promise they actually bought.

---

## Trusted folders are a different kind of trust primitive

The cleanest recent example of this came from **Gemini CLI**.

In my 2026-05-09 source check, one of the most steal-worthy operational ideas
was not a model trick or a subagent tool. It was **Trusted Folders**.

That primitive is interesting because it does not ask "should this one command
run?" It asks a higher-level question:

**should this workspace be treated as a place where broader execution is expected?**

That is a very different contract.

Per-command approval is about the current action. Folder trust is about the
standing relationship between the runtime and the workspace. It acknowledges
something true about real use:

- I may trust `~/my-app` and not trust `/tmp/random-repo`
- I may trust read/write in one folder and still want friction elsewhere
- I may want a stable trust boundary that survives beyond one chat turn

That makes folder trust closer to an operating model than a one-off safety prompt.

Google Antigravity's resource-targeted policy grammar points in the same
direction. Once permissions are expressed against things like commands, files,
and review artifacts, the runtime is no longer asking only "yes or no?" It is
starting to model **where** and **to what** the trust applies.

That is a better abstraction than global "safe mode" toggles.

The field is slowly learning that **scope** is the missing word in most approval
systems. Not just "allowed or denied," but **allowed where?**

---

## The best sandbox stories make unsafe modes loud

The strongest sandbox lesson from the recent corpus did not come from the
biggest repo. It came from smaller, sharper projects that were unusually honest
about what their runtime does not protect.

**ClashCode** is the cleanest example.

Its design notes make the execution backend explicit:

- `shuru` microVM on Apple Silicon
- `docker` on Linux
- `local` with no isolation

The important move is not that it supports multiple backends. The important move
is that **local is named as unsafe**.

That sounds trivial until you compare it to the rest of the market, where unsafe
fallbacks are often buried behind phrases like "for compatibility" or "when the
sandbox is unavailable." ClashCode turns the lack of isolation into front-door
product truth.

That is cool. More tools should do it.

The same principle shows up in **Workmux**, though from an operator-workflow
angle instead of a safety-doc angle. Workmux supports optional sandboxing in
containers or Lima VMs, but it keeps the sandboxed and unsandboxed lanes inside
the same lifecycle surface: spawn, monitor, merge, clean up.

That matters because the useful product promise is not merely "we have a sandbox."
It is:

**the workflow still makes sense when the backend changes.**

If a sandboxed path requires a totally different operator ritual, most users
fall back to the unsandboxed path the moment they hit friction. Then the safe
mode becomes demoware and the unsafe mode becomes production reality.

So there are really two separate wins here:

1. **runtime honesty**: say clearly when execution is not isolated
2. **workflow parity**: keep the same operator vocabulary across isolated and non-isolated backends

Without both, "sandbox support" is often just a brochure feature.

---

## The trust stack is becoming visible

Looking across these projects, the useful abstraction is not "which agent has a
sandbox?" The useful abstraction is a **trust stack** with four layers:

### 1. Policy surface

What can inspect or block an action?

Examples:

- OpenHands confirmation policy + security analyzer
- Antigravity allow/deny/ask resource rules
- hook systems that block before tool use

### 2. Trust scope

Where does the standing trust apply?

Examples:

- Gemini CLI Trusted Folders
- repo- or workspace-level policy targets
- artifact review scopes in Antigravity

### 3. Execution backend

Where does the command actually run?

Examples:

- ClashCode `local` vs Docker vs microVM
- Workmux unsandboxed worktree vs container / Lima-backed lane

### 4. Runtime honesty

Can the user tell which mode they are in, what it implies, and what it does not?

This is the layer the industry still underinvests in. Many tools technically
have two or three of the layers above, but the user-facing story is still muddy.
The runtime knows more than the operator does.

That is backwards.

---

## What does not work

The current wave of agent tooling is clarifying the good patterns partly because
the bad ones are so obvious now.

### Prompt-only safety

"The system prompt told the model to be careful" is not a serious trust model.

If safety depends on the model continuing to interpret fuzzy language correctly
under pressure, the control surface is too soft.

### Silent unsandboxed fallback

If the sandbox fails and the product quietly runs the same command on the host,
the product just changed its security contract without asking.

That is worse than having no sandbox at all, because it creates a false sense of
protection.

### Global trust toggles

"Auto approve everything" is sometimes operationally necessary. But as a trust
model it is blunt and low-information. It tells the runtime nothing about which
repo, folder, tool family, or backend the user actually trusts.

### Sandboxes as isolated demos

If the safe path only works in a carefully curated demo flow while the normal
workflow still assumes direct host execution, the sandbox is not part of the
product. It is a side quest.

---

## What the next generation probably looks like

The emerging direction is clearer now than it was a few months ago.

The stronger coding-agent runtimes are probably the ones that do all of this at once:

1. **Name unsafe execution plainly**.
   "Local mode is not a sandbox" is a better contract than polite ambiguity.

2. **Separate approval from containment**.
   Keep per-tool or per-resource approval, but do not pretend it answers the
   isolation question.

3. **Scope trust to real workspaces**.
   Folder-, repo-, and artifact-level trust is more realistic than one giant
   session-wide toggle.

4. **Keep the operator workflow stable across backends**.
   Sandboxed and unsandboxed lanes should share the same lifecycle vocabulary,
   or the safe path will rot.

5. **Expose the trust stack in the UI**.
   Users should know: what is trusted, what is sandboxed, what is merely approved,
   and what is running directly on the host.

That last point is the real product gap.

The agent market spent 2024 and 2025 proving that models can edit files and run
commands. The harder 2026 problem is teaching users what the runtime is actually
promising when it does those things.

That is not a model-quality problem. It is a contract-design problem.

And the projects getting ahead are the ones treating trust as a first-class
runtime surface instead of a vibe.
