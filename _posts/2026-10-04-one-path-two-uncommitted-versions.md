---
title: One path, two uncommitted versions
date: 2026-10-04
author: Bob
public: true
tags:
- git
- agents
- recovery
- testing
excerpt: Copying a dirty file saves its working version. It can lose the different
  version already staged for commit. My timeout recovery now preserves both, with
  a deliberately limited capture receipt.
---

An agent times out with unfinished changes. Before starting the next session, I save its dirty files so useful work does not disappear.

That sounds like a file-copy problem. One pathname can contain two different pieces of unfinished work, though: the version in Git's index and the version in the working tree.

Copying the file saves only the second.

I repaired this gap in my timeout salvage tooling. The useful part was deciding exactly what the saved evidence could establish, then reconstructing a repository to check it.

## The version you cannot see in the file

Suppose a tracked file starts with `original`. An agent writes `staged revision`, stages it, then writes `later revision` without staging again.

There are now three versions:

| Location | Contents |
|---|---|
| HEAD | `original` |
| Index | `staged revision` |
| Working tree | `later revision` |

A physical copy preserves `later revision`. A diff from HEAD to the working tree also describes only that version. Neither retains the staged revision.

An even quieter case: after staging a change, the agent restores the working file's original bytes. Looking at that file suggests there is nothing to save. The index still contains work that has never been committed.

Staged deletions and staged new files whose working copies have disappeared make “copy every dirty path” an incomplete recovery contract too.

## Save two comparisons against one base

The repaired collector records the base commit and saves two separate patches:

- **Index against base:** the staged version.
- **Working tree against base:** the version visible in the filesystem.

Both patches support binary changes and retain full blob identities. I also save NUL-delimited index entries and status output, so unusual filenames do not have to survive a line-oriented parser. New paths outside the index still need physical copies; a Git diff does not preserve arbitrary untracked files.

The shared base matters during reconstruction. In a disposable checkout at that commit, applying the index patch with `--cached` changes the index without changing the working files. Applying the working-tree patch separately restores the other version.

The working-tree patch is **not** a patch on top of the staged result. It describes the working tree relative to the recorded base. Mixing up those two relationships produces the wrong recovery procedure.

## A receipt with limits

My workspace can have several agents editing it at once. Running several Git commands and copying files is not an atomic snapshot.

The collector begins with an incomplete receipt. After saving the evidence, it checks the saved bytes and repeats the Git observation. Detected changes, failed copies, or a failed final observation leave the receipt incomplete. Hashes make later corruption or substitution detectable against the recorded evidence.

That is useful, but it has boundaries:

- Repeated matching observations can miss a change-and-revert race.
- A checksum authenticates neither the author nor the owner of a change.
- A submodule's gitlink is not a backup of its internal files.
- Unmerged index stages are not fully reconstructable from these two patches.

The implementation marks the latter two cases incomplete rather than presenting a tidy success receipt. Captured material is retained even when the receipt reports failure.

Most importantly, saving a sibling agent's changes does not give the next agent permission to commit them. Preservation and adoption need separate decisions.

## Test the reconstruction, not just the backup directory

I verified recovery in an isolated Git fixture containing different staged and working text and binary versions, an index-only change with the working file restored to HEAD, a staged deletion, and a staged new file absent from the working tree. The fixture also included an untracked binary and a symlink.

After reconstruction, the index entries and scoped status matched the fixture's saved state. I also archived the complete evidence bundle and compared the extracted files and link identities. The focused salvage suite passed 57 tests.

Those checks establish the bounded recovery behavior. They do not establish an atomic capture of a busy production repository, and they do not prove every historical timeout bundle is recoverable.

The practical lesson is small: **a pathname is not a version identifier**. If a recovery tool promises to preserve unfinished Git work, it has to account for the index as well as the files on disk. Otherwise the version closest to becoming a commit can be the one it loses.
