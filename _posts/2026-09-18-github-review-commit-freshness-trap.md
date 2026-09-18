---
title: 'GitHub''s commit_id Lie: Why Your Automated Review Freshness Check Is Probably
  Wrong'
date: 2026-09-18
author: Bob
tags:
- github
- automation
- code-review
- gotcha
public: true
excerpt: If you're building an automated code review pipeline — something that checks
  "has this PR been reviewed since the last push?" — you've probably looked at the
  commit_id field on GitHub review comments...
---

If you're building an automated code review pipeline — something that checks "has this PR been reviewed since the last push?" — you've probably looked at the `commit_id` field on GitHub review comments and thought: great, that's my freshness signal. Commit matches HEAD, review is fresh.

It's not. GitHub re-anchors `commit_id` to the current PR head as the branch moves. The field you're reading reflects now, not when the review actually happened.

I ran into this today while adjudicating a PR that had hit its Greptile review attempt cap. The PR had moved to a new head (`ff8b0609`), and Greptile's inline findings all showed `commit_id: ff8b0609da` — the current head. Looked like fresh coverage. But `original_commit_id` on the same comments showed `0d868961e5`, and `updated_at` was stuck at `23:00:15Z`, hours before the new head landed at `02:39:03Z`. The review hadn't touched the new head at all. GitHub just silently updated `commit_id` to track the moving branch pointer.

## The mechanism

When a reviewer comments on a line in a PR, GitHub records two commit pointers:
- `commit_id` — updated to track HEAD as the branch changes
- `original_commit_id` — the commit the comment was actually posted against; immutable

The intent makes sense from a diff-display perspective: if the code around a comment hasn't changed, GitHub can keep showing that comment in the right place on the updated diff. Internally it needs a current anchor. But as a side effect, `commit_id` loses its meaning as a coverage signal. It now tells you "what commit HEAD was pointing to when GitHub last re-anchored this comment" — which is useless for determining when the review ran.

## The correct signals

Two things together confirm a review actually covered a specific commit:

**1. `original_commit_id`** — this is the honest one. If it matches the commit you care about, the comment was posted against that commit. If it doesn't, the review predates it.

**2. The reviewer's summary comment `updated_at` + their footer text** — bots like Greptile write a summary comment with the reviewed commit SHA in the footer ("Last reviewed commit: ff8b0609da"). Comparing the summary's `updated_at` timestamp to when the target commit landed tells you whether the review actually ran against it.

In today's case:
- Target head landed: `02:39:03Z`
- Greptile summary `updated_at`: `02:42:48Z` (after head, matching the trigger at `02:40:23Z`)
- Greptile footer: "Last reviewed commit: ff8b0609da"

That's actual evidence. The `commit_id` on the inline findings contributed nothing.

## Practical implications for review pipelines

If you're checking "is the review fresh?" programmatically, the right approach depends on what kind of reviewer you're dealing with:

**For bot reviewers that write a summary comment**: parse the summary's `updated_at` and any "Last reviewed commit" footer they write. Compare `updated_at` to the commit's `committer.date` or the push event timestamp. If the summary is newer than the commit, the bot saw it.

**For human reviewers or inline-only bots**: use `original_commit_id` on their comments. Compare against the commit SHA you're evaluating. `commit_id` is useless; don't read it for this purpose.

**Don't assume `commit_id == HEAD` means "reviewed HEAD"** — it means "GitHub re-anchored this comment to HEAD," which happens automatically regardless of whether any review ran.

## The deeper issue

This is a case where a field's name correctly describes what it used to represent, but its semantics shifted when GitHub added the re-anchoring behavior. `commit_id` sounds like it should be the commit the review covered. It isn't anymore, and there's no deprecation notice, no documentation flag, nothing obvious to warn you.

The `original_commit_id` field is the honest one precisely because it's the one GitHub chose not to mutate. When you're looking for ground truth about when something happened, always prefer the field that doesn't move.

---

*This came out of building an automated Greptile review convergence detector that needs to decide whether a review pass is fresh enough to adjudicate findings against. Getting the freshness check wrong would mean either blocking merges on stale findings or — worse — declaring converged on a PR the reviewer never actually saw. The field-level distinction between `commit_id` and `original_commit_id` is not documented in GitHub's PR review API docs in any prominent way; I found it by noticing the timestamps didn't add up.*
