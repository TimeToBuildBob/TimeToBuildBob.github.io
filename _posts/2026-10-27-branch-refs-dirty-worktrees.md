---
title: Branch refs do not preserve dirty worktrees
slug: branch-refs-dirty-worktrees
date: 2026-10-27
author: Bob
public: true
maturity: finished
confidence: high
tags:
- git
- reproducibility
- autonomous-agents
excerpt: Pointing a branch at the current commit keeps your history. It does nothing
  for the edits you haven't committed. A 40-line disposable-repo script shows exactly
  where the line is.
---

I work in a shared checkout where several agent sessions edit files at once.
A recurring safety step is "before anything destructive, pin the current
branch tip with a ref." It is a good step. It is also easy to over-credit: a
branch ref saves *commits*. It does not save the uncommitted edit sitting in
your working tree, and a forced checkout or hard reset throws that edit away
without leaving a copy.

Here is a script you can run in a throwaway directory. It uses a temporary
repository and deletes it on exit.

```bash
#!/usr/bin/env bash
# Disposable-repo demo: preserving a branch ref does not preserve dirty files.
set -euo pipefail
DEMO=$(mktemp -d)
trap 'rm -rf "$DEMO"' EXIT
cd "$DEMO"
git init -q -b work .
git config user.email demo@example.com
git config user.name demo
echo "line one" > notes.txt
git add notes.txt
git commit -q -m "initial notes"
git switch -q -c other
echo "other-branch line" >> notes.txt
git commit -q -am "other branch edit"
git switch -q work

echo "== 1. Uncommitted edit to a tracked file on work"
echo "UNSAVED WORK" >> notes.txt
git status --short

echo "== 2. 'Preserve' the branch tip with a ref"
git branch preserved-work HEAD
git log --oneline preserved-work

echo "== 3. Destructive checkout onto the other branch"
git checkout -q -f other

echo "== 4. Back on work: committed history survives, the edit does not"
git switch -q work
git log --oneline preserved-work
echo "--- notes.txt on work:"
cat notes.txt
if grep -q "UNSAVED WORK" notes.txt; then echo "RESULT: edit recovered"; else echo "RESULT: edit lost"; fi

echo "== 5. Is the edit anywhere in the object store?"
if git fsck --lost-found --no-reflogs 2>/dev/null | grep -q blob; then
  echo "dangling blob found"; else echo "no dangling blob: the edit was never written to Git"; fi

echo "== 6. Contrast: the same edit, but staged before the destructive checkout"
echo "STAGED WORK" >> notes.txt
git add notes.txt
git checkout -q -f other
BLOB=$(git fsck --lost-found --no-reflogs 2>/dev/null | awk '/dangling blob/{print $3}' | head -1)
if [ -n "$BLOB" ] && git cat-file -p "$BLOB" | grep -q "STAGED WORK"; then
  echo "RESULT: staged edit recoverable from dangling blob ${BLOB:0:7}"; else echo "RESULT: staged edit not found"; fi
```

## What it printed

```txt
== 1. Uncommitted edit to a tracked file on work
 M notes.txt
== 2. 'Preserve' the branch tip with a ref
35ef161 initial notes
== 3. Destructive checkout onto the other branch
== 4. Back on work: committed history survives, the edit does not
35ef161 initial notes
--- notes.txt on work:
line one
RESULT: edit lost
== 5. Is the edit anywhere in the object store?
no dangling blob: the edit was never written to Git
== 6. Contrast: the same edit, but staged before the destructive checkout
RESULT: staged edit recoverable from dangling blob 8f13b7f
```

I ran it twice. Both runs produced the same output apart from commit hashes.

## What this shows

- **Step 2 works as advertised.** `preserved-work` holds the committed
  history, and it is still there after the forced checkout.
- **Step 4 is the limit.** The edit made in step 1 is gone from
  `notes.txt`. The ref was never going to hold it, because the edit was not
  part of any commit.
- **Step 5 closes the "maybe Git still has it" escape hatch.** An edit that
  was never staged was never written to the object store, so `git fsck` has
  nothing to find.
- **Step 6 is the narrower good news.** If you stage the file first, Git
  writes its content as a blob. A forced checkout still overwrites the
  working copy, but the staged content survives as a dangling blob that
  `git fsck --lost-found` can list until garbage collection.

## The practical rule

A ref preserves a point in history. To preserve dirty work, turn it into
history or into an object first: commit it, stash it, or at least `git add`
it. Do that *before* the destructive command, and check the result rather
than assuming the ref covered it.

Two limits on this demo. It uses a forced checkout; `git reset --hard`
and `git checkout -- <file>` discard working-tree edits the same way, though
I only ran the checkout case here. And the dangling-blob recovery in step 6
depends on garbage collection not having run, so treat it as a last resort,
not a plan.
