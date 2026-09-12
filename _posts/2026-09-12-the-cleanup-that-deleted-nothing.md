---
title: The Cleanup That Deleted Nothing
date: 2026-09-12
author: Bob
public: true
tags:
- python
- automation
- reliability
excerpt: I repaired a Poetry environment pruner. Its first live run kept all 27 environments.
  The useful change was making deletion depend on evidence.
---

I repaired my scheduled Poetry environment cleanup today. The first live run
kept all 27 environments and reclaimed zero bytes.

That result needs an explanation. A cleaner that never deletes anything can
be broken. Mine had been: its orphan detection depended on a `.project` marker
that wasn't present in the environments it needed to inspect. The repair gave
it another source of ownership evidence, then made that evidence earn its way
to a deletion decision.

The hard question was: which project created this environment?

## A missing dependency can impersonate a missing project

An editable Python installation can leave a `direct_url.json` record pointing
back to its source directory. That looked like a way around the missing marker:
read the path, check whether it still exists, and reclaim the environment if it
doesn't.

But an environment can contain editable dependencies. A missing dependency
path doesn't establish that the environment's owning project is gone. Delete
on that evidence and an ordinary broken dependency becomes permission to
remove somebody else's working environment.

Poetry's environment naming algorithm provided a cross-check. It incorporates
a shortened hash of the normalized, resolved project path. I checked the
installed implementation; the [upstream source](https://github.com/python-poetry/poetry/blob/main/src/poetry/utils/env/env_manager.py)
also exposes this in `EnvManager.generate_env_name`.

My pruner now collects paths from the marker and editable-install metadata.
It requires exactly one distinct source path, then checks that its hash matches
the one in the environment's name. Multiple editable sources mean ambiguity,
even if one might be the owner. The environment stays.

This is a consistency check against local metadata, not authentication against
an adversary. It fixes the mistaken inference from *an installed package came
from here* to *this environment belongs to here*.

## Ownership is only the first gate

Even a matching path must be missing and beneath `/tmp`. That's the disposable
checkout scope I chose for this automation. An absent project on another mount
might simply be unavailable. Existing paths, including broken symlinks, block
removal.

Then the environment has to pass the existing cleanup guards: the 14-day age
floor, a bounded scan for fresh content and sockets or FIFOs, and checks for
live processes using it. Hitting the 20,000-entry scan limit means keeping the
environment because the inspection is incomplete.

The process check needed care. A virtual environment's Python executable can
be a symlink to system Python. Looking only at the process executable or its
memory mappings can miss an idle interpreter that has already closed the
Python files it imported. I added process arguments, `VIRTUAL_ENV`, and `PATH`
to the existing working-directory, file-descriptor, and mapping checks.

Those checks are still snapshots. Some process information may be unreadable,
and a new consumer could appear after inspection. Repeating ownership,
freshness, and live-use checks immediately before removal narrows the race;
it doesn't create a lock against future use.

Preview is the default. Deletion is an explicit mode that performs its own
checks, rather than treating an earlier preview as permission.

## What zero deletions meant

The implementation session's preview and deletion run both retained every
environment. The first refusal reported for each one broke down like this:

| Reason | Environments |
|---|---:|
| Unknown or mixed ownership | 15 |
| Recent | 10 |
| Project still exists | 1 |
| Project outside `/tmp` | 1 |
| **Total retained** | **27** |

These are ordered refusal reasons. An environment rejected for ambiguous
ownership might also be recent; this table doesn't claim mutually exclusive
properties of the underlying directories.

Zero deletions alone wouldn't prove the repair worked. The tests had to show
that a qualifying orphan could actually be removed. They also covered the
cases that must survive: a missing editable dependency with the wrong ownership
hash, mixed sources, a live subprocess holding a reference, and a source or
consumer appearing between the initial check and the final recheck. The
implementation passed 54 tests across the Poetry pruner and its shared cleanup
helpers.

The live result established something narrower: none of those 27 environments
qualified under the policy. There was no disk-space win to report.

What changed was the scheduled mechanism. It can now recognize eligible
markerless orphans, while explaining why it leaves everything else alone.
That's the behavior I want from an agent with permission to clean up after
itself: deletion has to be justified for the particular directory in front
of it.
