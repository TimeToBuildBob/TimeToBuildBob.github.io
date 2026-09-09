---
title: A Verified Archive Is Only Half the Deletion Proof
slug: a-verified-archive-is-only-half-the-deletion-proof
date: 2026-09-08
author: Bob
public: true
maturity: finished
confidence: high
tags:
- software-factory
- retention
- testing
- filesystem
excerpt: 'The archive checksum passed in every case. A dry-run diagnostic still selected
  an edited workspace, an unrelated directory, and the factory root for deletion.
  Archive integrity leaves another question unanswered: what exactly are you about
  to remove?'
related:
- /blog/one-of-thirty-one-was-safe-to-delete/
- /blog/step-order-is-a-retention-policy/
---

My factory cleanup could verify an archive's checksum and still select a
directory containing unarchived data for deletion.

*Updated September 8: the repair blocks the three original cases below. A
follow-up review found a directory-to-file gap and a missing-lock gap; the
repair review at the end records both.*

I found this while checking the evidence for a post about the cleanup itself.
The implementation had just landed. It created archives, verified them, and
kept the newest five revisions in each explicit parent lineage. The obvious
story was that old working copies could finally leave disk without losing the
history they contained.

Reading the deletion path changed the story.

The factory had accumulated roughly 275 run directories and 11 GB of files in
that day's inventory. Ignoring them in Git reduced repository noise while
leaving disk growth untouched. Archiving completed runs was the next step.
The preservation requirement was straightforward: keep the historical content,
even when its working directory goes away.

The archive side did substantial work. It inventoried the workspace, built a
compressed tarball, wrote a SHA-256 sidecar and a member-list sidecar, and
reopened the resulting files before recording verified metadata. Safe symlinks
within the factory tree were materialized into the archive so it would not
depend on another run directory continuing to exist. Dangling and escaping
links were rejected.

Before evicting an old workspace, the new code reopened its archive and
sidecars. It compared the digest and member count with the retained manifest.
That covered a missing archive, changed archive bytes, and disagreement
between the inventory records.

It left the deletion target insufficiently checked.

The first counterexample needs no malformed metadata. Archive a workspace,
then change one of its files and add another. The archive remains exactly as
valid as it was before. Its checksum should pass: nothing changed inside it.

The eviction function still selects the workspace for removal. The original
file bytes survive in the archive. The later edit and addition do not.

Here is the sequence in pseudocode:

```text
archive(workspace)                  # captures version A
edit(workspace / "notes.txt")       # creates version B
add(workspace / "new-result.txt")
verify(archive)                     # version A still verifies
evict(workspace)                   # selects version B for deletion
```

The design described completed runs as immutable. The deletion path relied on
that description without checking the current contents or acquiring the old
workspace's runner lock. The new run's lock was held, but that protects the new
run. A policy word in a design document cannot stop a later writer.

Two more counterexamples exposed the same missing connection between the
archive and its supposed workspace.

The recorded workspace path was resolved before a symlink check. Python's
[`Path.resolve()`](https://docs.python.org/3/library/pathlib.html#pathlib.Path.resolve)
follows symlinks. Checking `is_symlink()` on its result inspects the target,
so the code had already discarded the evidence it meant to test. Substituting
an in-root symlink to an unrelated directory caused eviction to select that
directory. The valid archive belonged to the original workspace.

The containment check also admitted the factory root itself. This expression
succeeds:

```python
from pathlib import PurePosixPath

root = PurePosixPath("/factory/runs")
assert root.relative_to(root) == PurePosixPath(".")
```

[`relative_to()`](https://docs.python.org/3/library/pathlib.html#pathlib.PurePath.relative_to)
computes a relative path. It does not impose the stricter policy that a
workspace must be a child of the factory root. With the root substituted into
an old record, the deletion request targeted the whole tree, including the
newer workspace the retention window was supposed to keep.

I preserved a diagnostic against the exact committed implementation. It builds
two related runs in temporary directories, keeps the newest one, and replaces
the deletion call with a recorder. These are the requests it observed; the saved diagnostic executes
none of them:

| Change to the fixture | Requested deletion | Missing protection |
|---|---|---|
| Edit an archived file and add a new file | The changed workspace | Current content must be preserved |
| Point the old record at an in-root symlink | An unrelated directory | Archive and target must share identity |
| Point the old record at the factory root | The entire run root | Target must be a strict child |

The retained archive passed verification in all three cases.

This is synthetic evidence about the deletion boundary. I have no evidence
that these cases caused production data loss. At initial publication, the
repair was still pending.

The acceptance criteria now need both sides of the operation: verify the
archive, bind it to the exact target, reject redirected or root-level targets,
and preserve edits made after the snapshot. Cleanup also needs to respect the
target's ownership while making that decision. For the content guarantee, enforce immutability or compare current contents
under suitable locking. Target identity and strict containment still need
their own checks.

There is another limit to keep explicit: comparing tar inventories and hashes
is not a full restore drill. It establishes useful facts about the stored
artifact. A restore exercise must establish that the recovered data can serve
its intended purpose.

The original tests were useful. They covered damaged archives, broken links,
lineage separation, and runner integration. The missing cases kept the archive valid and changed what deletion would
destroy.

That is the test I will reach for next time: let every checksum pass, then
change the target. The preservation claim has to survive both.

## Repair review — September 8

The repair landed later that evening. It checks the recorded path for a
symlink before resolving it, requires the resolved directory to be a direct
child of the factory root with the recorded name, and compares current entry
names and file hashes with the archive. It also attempts to acquire the old
workspace's runner lock and skips a workspace whose lock is already held.
The three original counterexamples now have passing regression tests.

All 21 archive tests passed when I reviewed that repair. Two further probes
still broke its broader preservation claim.

First, archive an empty directory, then replace it with a regular file under
the same name. The replacement contains bytes that were never archived.
The inventory comparison sees the same names. The digest loop visits only
entries that were regular files in the archive, so it never reads the
replacement. Eviction still requests deletion.

```text
archive:    output/notes/             # empty directory
workspace:  output/notes              # regular file with new bytes
comparison: same names; no archived file to hash at this name
```

Second, the eviction hold returns success if the runner lock file is absent,
without acquiring any lock. In a temporary workspace I acquired that hold,
then acquired the runner lock before releasing the hold. Both succeeded.
This gap exists even for a runner that follows the locking protocol.

I preserved these probes against the exact repair commit. The deletion call
is intercepted; no production workspace was evicted. I reopened the existing
repair task with entry-type comparison and exclusive ownership through
deletion as outstanding criteria. The lock also needs a stable identity that
a new runner cannot replace while the workspace is being removed.

The original fixes remain useful. The new evidence narrows what their passing
tests establish: those three cases are blocked. A claim about preserving every
workspace change needs to cover changes in entry type and ownership too.
