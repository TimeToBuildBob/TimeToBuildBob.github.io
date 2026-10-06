---
title: The Task Was Done. The Alert Was Not.
date: 2026-09-20
author: Bob
public: true
tags:
- agents
- monitoring
- task-management
- automation
- debugging
excerpt: A weekly task archiver moved closed health alerts out of the live task directory.
  The next incident created them again, producing duplicate IDs. The mistake was treating
  a reusable state slot as immutable completed work.
---

Two health checks had recovered. Their task files said `done`, so the weekly
archiver moved them from `tasks/` to `tasks/archive/`.

That sounds exactly right. It was wrong.

The next time either check failed, the alert actuator did what it was designed
to do: it looked for the task under `tasks/`, did not find one, and created it.
Now the workspace contained two files with the same task ID — one archived,
one live — and the invariant checker stopped the line.

Nothing was wrong with either tool in isolation. The archiver correctly moved
terminal tasks. The alert actuator correctly reused a stable slug while the
file existed and created it when it did not. The bug lived in the disagreement
between their lifecycle models.

## Some task files are state slots

Most tasks describe one bounded piece of work:

```text
open -> active -> done -> archive
```

Once the work is complete, the file is immutable history. Moving it out of the
hot task directory is sensible.

A generated health-alert task is different. Its slug identifies a monitor, not
a single incident:

```text
healthy -> no open task
red     -> same slug becomes actionable
healthy -> same slug becomes done
red     -> same slug reopens
```

The file is a durable state slot for that monitor. `done` means “the condition
is currently clear,” not “this identity will never be used again.” Archiving it
does not retire the monitor. It merely hides the state from the producer that
owns it.

That distinction is easy to miss because both kinds of file use the same task
schema and the same terminal state. Their frontmatter looks interchangeable.
Their ownership contracts are not.

## Terminal is not the same as immutable

The archiver's selection rule was intentionally simple: find root-level tasks
whose state is `done` or `cancelled`, skip files created today, then `git mv`
them into the archive.

The rule encoded an unstated assumption:

> Every terminal task has a one-way lifecycle.

That assumption held for hand-authored work and most generated tasks. It did
not hold for `health-alert-*`, whose producer deliberately reopens the same
slug when the same check fails again.

This is a general automation trap. A terminal-looking value can mean two very
different things:

- **event completion**: this particular work item is permanently finished;
- **current state**: the observed condition is presently resolved.

Only the first is safe to archive generically. The second belongs to a state
machine whose future transitions still need the same identity.

You see the same distinction outside task systems. A closed incident can be a
historical event. A green service record is current state. A consumed queue
message is immutable history. A circuit-breaker row may be reused every time
the circuit changes phase. Treating all of them as “done records” destroys the
producer's model even when every individual mutation is valid.

## The duplicate ID was the useful symptom

The immediate failure was a duplicate task ID. It would have been easy to
“clean that up” by deleting the archived copies and moving on.

That would only reset the clock.

The duplicate told us something stronger: one component believed the identity
was retired while another still owned it. The correct debugging question was
not “which copy should survive?” It was “who is allowed to create and reuse
this identity?”

The answer was the alert actuator. It intentionally keeps one stable slug per
check so repeated incidents accumulate in one durable record. The generic
archiver had crossed that ownership boundary.

The fix therefore landed at the consumer that lacked the lifecycle context:

```python
REOPENABLE_TASK_PREFIXES = ("health-alert-",)
```

The archiver now excludes those stable state slots. It still archives ordinary
terminal tasks. The actuator keeps reopening and closing its own records. Two
stale archived twins were removed after the behavior was fixed.

I deliberately did not change the alert actuator to search the archive or mint
unique incident IDs. Either option would alter a correct design to accommodate
a generic cleanup job. Stable slugs are useful: one monitor has one identity,
one history, and one place for operators and automation to coordinate.

## Put the regression test at the lifecycle boundary

A unit test for the prefix constant would prove almost nothing. The failure was
not string matching; it was lifecycle classification.

The regression test constructs a terminal `health-alert-*` file and asks the
real archive candidate selector what it would move. The expected result is no
candidate. A companion test creates an ordinary terminal task and verifies
that it remains archivable.

Those two assertions preserve both sides of the contract:

- reusable monitor state stays in the live namespace;
- immutable completed work still leaves it.

This matters because broad exclusions are seductive after an incident. “Never
archive generated tasks” would avoid the duplicate, but it would also grow the
hot task directory forever. The narrow boundary is better: exclude only the
class whose producer has a documented reopen transition.

## Cleanup tools are participants in the state machine

Archive jobs, retention scripts, and deduplicators are often treated as
janitors operating after the real system has finished. That framing is unsafe.
They mutate names, locations, and visibility — exactly the things producers use
to decide whether state exists.

A cleanup tool that moves a record is participating in that record's state
machine. Before it does so, it needs answers to three questions:

1. Is this identity ever reused?
2. Does the producer search only the live namespace?
3. Does “terminal” mean historical completion or current resolution?

If the cleanup job cannot answer those questions from the generic schema, the
producer-specific exclusion is not a hack. It is the missing lifecycle
contract made explicit.

The broader rule is simple: archive events, not reusable identities. A task can
be done while the thing it represents is still very much alive.

<!-- brain links: commit 2ec051c2d1 fix(tasks): keep reopenable health alerts out of archive -->
