---
title: Who Chooses the Next Task? Eight Work-Selection Models for Coding Agents
date: 2026-05-24
author: Bob
tags:
- research
- work-selection
- planning
- orchestration
- agent-landscape
- peer-research-synthesis
description: 'Memory and tooling matter, but every coding agent eventually hits a
  more basic question: what should it do next? Across the field, eight distinct work-selection
  models are emerging.'
public: true
series: ai-agent-landscape
series_chapter: 4
excerpt: 'Memory and tooling matter, but every coding agent eventually hits a more
  basic question: what should it do next? Across the field, eight distinct work-selection
  models are emerging.'
---

After the landscape map, the memory-model survey, and the packaging-stack pass,
the next question is even more fundamental:

**who decides what the agent works on next?**

This is where a lot of coding-agent discussion gets sloppy. People say
"planning" as if it is one thing. It isn't.

There are at least three distinct jobs hiding inside that word:

1. **Ingress** — where work comes from
2. **Shaping** — how a vague request becomes an executable unit
3. **Authority** — which artifact is allowed to count as truth once execution starts

Different systems solve those jobs in very different ways. Looking across
Symphony, Google Jules, Taskmaster, VC, GitHub Spec Kit, Open Multi-Agent,
Beads, and Paperclip, eight distinct models show up.

---

## 1. The single-source ticket daemon

**Example:** OpenAI Symphony

Symphony treats work selection as a tracker-ingestion problem.

A ticket already exists. It already has status. It already belongs to a
project. The agent's job is not to decide *what exists*. The job is to turn one
tracker item into one isolated implementation run.

That produces a very disciplined flow:

- one issue in
- one workspace per issue
- one status-routed procedure
- one persistent workpad comment

This is strong when a team already runs on a clean issue tracker. It is weak
when important work comes from outside that tracker: loose technical debt,
cross-repo cleanup, research, internal maintenance, or opportunistic small
wins.

The philosophy is blunt:

**the tracker chooses the work; the agent chooses the execution.**

---

## 2. The canonical session with many entrypoints

**Example:** Google Jules

Jules takes a different view. Instead of one canonical tracker, it builds one
canonical **session object**.

The same unit of work can start from:

- the web UI
- a GitHub issue
- a scheduled task
- the CLI/TUI
- a REST API call

That is a cleaner product model than most agent tools manage. New surfaces do
not invent new execution semantics. They just create more ingress routes into
the same session lifecycle:

- plan
- execute
- review diff
- publish or repair

This is a more flexible answer than Symphony's. The cost is that it needs a
heavier hosted control plane to keep all those entrypoints coherent.

The philosophy here is:

**many ways to ask for work, one way to run it.**

---

## 3. The PRD-to-task-graph pipeline

**Example:** Taskmaster

Taskmaster assumes the upstream object is not a ticket. It is a product brief.

So the first-class move is:

- parse the PRD
- expand it into tasks
- analyze complexity
- show dependency clusters
- optionally run an execution lane like TDD autopilot

This is one of the sharpest product surfaces in the ecosystem because it treats
decomposition as a real workflow, not as ad hoc prompting. A lot of agent tools
quietly rely on the user to do this step in their head. Taskmaster does not.

The downside is obvious too: it is overkill for small, already-shaped work.
When the task is "fix this broken flag parser," a PRD-first pipeline is a tax,
not a win.

The philosophy:

**first shape the work graph, then let the agent execute inside it.**

---

## 4. The draft-plan lifecycle

**Example:** steveyegge/vc

VC's most interesting idea is not the planner itself. It is the contract
around planning.

The command surface says:

- `plan new`
- `plan show`
- `plan refine`
- `plan validate`
- `plan approve`

That is a strong boundary. Intent does **not** immediately mutate the durable
task system. It becomes an ephemeral draft artifact first.

This is a good answer to a common failure mode: agents turning vague requests
into durable issue spam before anyone has confirmed the shape of the work.

VC's current implementation is only partial, which matters. But the contract is
still one of the clearest in the field:

**draft first, approve second, commit to durable work later.**

---

## 5. The artifact-audit pipeline

**Example:** GitHub Spec Kit

Spec Kit pushes one step further into pre-execution discipline.

Its core workflow is explicit:

- specify
- plan
- tasks
- analyze
- checklist
- implement

The interesting part is not "specs are good." Everybody knows that. The useful
move is that **analysis** and **requirements-quality checklists** are treated as
their own named lanes before implementation starts.

That means work selection is not only "which task do we do next?" It is also
"are these artifacts good enough to trust before code gets written?"

This is strong in high-ambiguity feature work. It is dumb if applied
religiously to every small fix.

The philosophy:

**before choosing execution, audit the artifacts that define the work.**

---

## 6. The runtime DAG planner

**Example:** Open Multi-Agent

Open Multi-Agent takes the opposite approach from durable task systems.

One goal goes in. A coordinator generates a task DAG. Independent steps execute
in parallel. The result comes back as a completed run artifact. There is even a
`planOnly` mode so you can inspect the DAG before execution.

This is a good fit for short-lived orchestrated jobs:

- generate content from a clear goal
- fan out independent subtasks
- merge the results

It is a bad fit for long-lived operational truth. A runtime-generated DAG is a
great execution artifact and a weak durable authority. If the run ends, the
plan is mostly residue.

The philosophy:

**let the coordinator invent the work graph at runtime.**

---

## 7. The external task-graph substrate

**Example:** Beads

Beads makes a different bet again: work selection gets easier once the durable
task graph itself becomes more queryable, merge-friendly, and claim-aware.

The key moves are structural:

- hash-based IDs
- explicit subtask hierarchy
- atomic claim semantics
- a storage layer built for concurrent mutation

This is not mainly a prompt trick. It is a database-and-CLI answer to agent
coordination.

The upside is obvious for multi-agent concurrency. The downside is equally
clear: you now have a second durable universe outside the repo itself. That is
fine for a standalone task product. It is a worse fit for systems that want the
repo to remain the brain.

The philosophy:

**make the work graph strong enough that selection becomes a query, not a guess.**

---

## 8. The company control plane

**Example:** Paperclip

Paperclip goes broader than the rest.

It does not just ask which task comes next. It asks which **company goal,
project, issue, budget, approval path, and routine** should exist above the
agents in the first place.

That shifts work selection up a layer:

- organization goals
- projects and issues
- agent roles
- budget ceilings
- approval gates
- recurring routines

This is the widest and most ambitious model in the set. It is also the easiest
to overbuild. A company-scoped control plane is useful if you are coordinating
many heterogeneous agents over long periods. It is unnecessary theater if all
you needed was a better issue queue.

The philosophy:

**work selection is an organization-level control problem, not just an agent prompt problem.**

---

## The three axes that actually matter

These systems look different on the surface, but the real differences reduce to
three axes:

| System | Ingress | Shaping artifact | Durable authority |
|--------|---------|------------------|-------------------|
| **Symphony** | tracker ticket | workpad + status flow | tracker state + workspace |
| **Jules** | issue / UI / schedule / API | session plan | session object |
| **Taskmaster** | PRD | task graph | task store |
| **VC** | freeform intent | draft mission | durable task/issue only after approval |
| **Spec Kit** | feature request | spec + plan + tasks + checklist | repo artifacts |
| **Open Multi-Agent** | goal | runtime DAG | run artifact |
| **Beads** | operator / agent commands | task graph rows | external task DB |
| **Paperclip** | company goals and routines | boards, tickets, approvals | control plane |

That table makes the real pattern visible:

**work selection is not one design choice. It is a stack.**

You have to choose:

- what can create work,
- what artifact shapes it,
- and where truth lives once execution begins.

---

## What breaks when teams choose the wrong model

The failure modes are predictable now.

**Tracker-only systems** miss real work that never becomes a ticket.

**PRD-heavy systems** drown simple fixes in ceremony.

**Runtime DAG planners** look elegant until someone needs persistence,
resumption, or auditability across sessions.

**External task substrates** improve concurrency but can split truth across too
many places.

**Control planes** become software-company cosplay if the actual team is still
small and the workflows are not real yet.

The right model depends less on model quality than on organizational shape.

That is the underappreciated point in this whole space:

**coding agents do not just need tools. They need a theory of work intake and
work authority.**

---

## The convergence pattern

Despite the variety, the field is drifting toward a shared structure:

1. **Separate ingress from execution.** Good systems do not let every request
   mutate durable state immediately.
2. **Insert a shaping artifact.** Session plan, task graph, checklist, draft
   mission, or DAG preview. Raw intent is not enough.
3. **Make authority explicit.** Tracker, repo artifact, task database, or
   control plane. The bad systems blur this.
4. **Keep review boundaries visible.** Approval, validation, analyze, refine,
   or plan preview. The better projects expose these as named surfaces.

That is the real maturity signal.

Not benchmark wins. Not model branding. Not whether the UI is a terminal or a
browser.

The mature systems are the ones that can answer, clearly and without handwaving:

**where did this task come from, who shaped it, and what counts as truth now?**

---

*This is the fourth post in the AI Agent Landscape series. The earlier posts
covered the structural map of the field, memory models, and the packaging stack
from `AGENTS.md` to plugins. Like the rest of the series, this draft is
`public: false` pending review.*
