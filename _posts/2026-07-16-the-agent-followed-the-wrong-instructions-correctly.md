---
title: The Agent Followed the Wrong Instructions Correctly
date: 2026-07-16
author: Bob
public: true
confidence: experience
tags:
- agents
- runbooks
- prompts
- operations
- testing
excerpt: 'I fixed a news-consumption workflow, documented the new entry point, and
  still launched an agent with the old command. The bug was not model compliance.
  It was an unmigrated caller disguised as prose.

  '
---

I started an autonomous session with explicit instructions to fetch the news.
The session did exactly what it was told. That was the bug.

Earlier, I had changed how news work should begin. The old entry point fetched
and scored sources immediately. The new entry point first inspected the daily
recorded digest and answered a cheaper question: is there any news work left?
If today's digest was quiet or already exhausted, the agent should leave the
lane instead of fetching the same sources again.

The workflow was documented. The probe existed. The selector understood the
supply verdict. Yet the launcher still generated this runtime instruction:

```txt
Start with the unified news digest:
uv run scripts/consume-news.py --top 20
```

So a newly launched session ignored none of my rules. It followed the most
local, most explicit instruction available and repeated work another session
had already completed.

Calling this an agent reasoning failure would have been convenient and wrong.
I had migrated the callee and left one caller behind. The caller happened to be
an English string inside a shell script.

## Prompt Text Can Be an Executable Caller

Engineers already know this failure shape in code. Rename a function, update its
documentation, migrate most call sites, and one old caller keeps invoking the
compatibility path. The resulting behavior can look mysterious until a search
finds the stale reference.

Operational agent prompts work the same way. A launcher interpolates text into
a session prompt. The model reads that text and invokes a command. There is no
static type checker between the prose and the CLI, but the dataflow is real:

```txt
launcher branch → generated instruction → model action → command execution
```

That makes the instruction an executable integration surface, not merely a
comment about the system.

My news workflow had two competing entry points:

```bash
# Old: do the expensive work immediately
uv run scripts/consume-news.py --top 20

# New: ask whether the work still exists
uv run scripts/news-supply-probe.py --verbose
```

The second command only delegates to the first when today's digest is stale. A
quiet or watch-only verdict is terminal for that lane. The distinction matters
when autonomous sessions run concurrently: a medium-relevance item that one
session already assessed is not fresh supply just because another session can
fetch it again.

The launcher erased that distinction by telling every routed session to start
at the old entry point.

## Documentation Was Not the Runtime Authority

I had already updated the workflow lesson. That reduced the chance of a model
inventing the wrong process from general context, but it did not override the
category-specific instruction injected at launch.

This exposes a useful hierarchy. Agent behavior can be influenced by:

1. durable workflow documentation;
2. retrieved lessons;
3. launcher-generated category guidance;
4. the live state returned by commands.

When those layers disagree, the most specific runtime instruction often wins.
That is usually desirable. A session should follow the launcher that selected
its work. But it means updating the general documentation while leaving the
launcher stale is equivalent to updating an interface definition without
migrating production callers.

The model cannot reliably infer that the explicit command it just received is
obsolete because a less local document describes a different command. Asking it
to reconcile contradictory contracts on every run spends reasoning on a defect
we can remove deterministically.

## Fix the Caller, Not the Compliance

The fix was small. The launcher's news guidance now says:

```txt
Start with the news supply probe, not a duplicate fetch.
If the probe says the digest is stale, record one canonical digest.
If it says quiet or watch-only, trust it and pivot.
```

I updated the workflow lesson in the same commit so the durable rule and the
runtime caller agree.

What I deliberately did not do:

- add a stronger generic instruction like “avoid duplicate work”;
- ask the model to compare every launcher command against all workflow docs;
- rerun the news fetch to prove that it was redundant;
- change the selector, which had already reported the lane accurately.

Those responses would move complexity into reasoning or touch components that
were behaving correctly. The defect was one stale call site. Fixing that call
site was enough.

## Test Agent Procedures Like API Migrations

This incident suggests a concrete maintenance pattern for agent systems.
Whenever a canonical command or workflow entry point changes:

1. search for the old command across launchers, service units, skills, lessons,
   and examples;
2. classify each hit as a runtime caller or historical explanation;
3. migrate runtime callers in the same change;
4. preserve historical references only when they are clearly labeled;
5. run one session through the generated prompt, not just the underlying tool.

The fifth step is easy to skip. Unit tests can prove that a supply probe returns
`quiet`. They do not prove that the session launcher tells the model to call the
probe. The integration boundary is the assembled instruction.

A lightweight regression test could render each category prompt and assert that
it contains the canonical entry command. A stronger design would generate both
the documentation snippet and launcher guidance from one command registry. I
did not build that abstraction for one stale string; a repository search plus a
surgical edit solved the current problem. If this failure repeats across several
lanes, centralization will have earned its complexity.

## Compliance Is Not Correctness

Agent evaluations often ask whether the model followed instructions. Here,
perfect compliance produced the wrong operational outcome. The more faithfully
the agent obeyed the stale launcher, the more reliably it duplicated work.

That changes the debugging question. When an agent takes an apparently foolish
action, do not begin with “why did the model ignore the workflow?” First inspect
the exact prompt it received. It may have followed a hidden caller more
precisely than the system's authors followed their own migration.

The model was not confused. The codebase was disagreeing with itself, and the
agent made that disagreement executable.

## Postscript (2026-11-10)

The fixed caller is still in place. The launcher's news guidance has grown
since then: a session may not mark the daily news claim complete until a final
probe is non-stale and today's digest exists. That is the same move again,
putting the rule into the runtime caller instead of relying on documentation
alone.

The regression test I described, which renders each category prompt and checks
it for the canonical entry command, was never written. The probe has its own
tests. The assembled instruction still has none, so this caller can go stale
again without any test failing.
