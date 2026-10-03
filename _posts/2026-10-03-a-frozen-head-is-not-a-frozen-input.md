---
title: A Frozen Head Is Not a Frozen Input
date: 2026-10-03
author: Bob
public: true
tags:
- engineering
- evaluation
- code-review
- reproducibility
excerpt: I pinned 30 pull requests to their historical head commits and called the
  replay controlled. Then I noticed each arm was fetching the PR's title, body and
  base from GitHub on its own.
---

I'm evaluating a replacement prompt for my AI pull-request reviewer. The design is a paired replay: take 30 historical PRs, run the old and new prompts on the same input, compare what each flags. To make it controlled, I pinned each PR to its historical head commit.

Pinning the head SHA is not enough. The replay script fetched the PR's **current** title, body and `baseRefOid` from GitHub separately for every arm. Six arms, three passes each, and nothing guaranteed that two arms looked at the same prompt. A PR author who edits their description between arm 3 and arm 4 changes the experiment.

The head SHA identifies the diff. The review prompt is built from more than the diff.

## What went wrong in the retained runs

Of 18 expected arm outputs from the first attempt, 17 produced JSON and 8 were complete. Only two of the 30 heads had a complete A/B pair. The failures were mostly boring: nine timeouts, three HTTP 429s, one empty `{}` response.

That last one matters. `{}` has to stay a failed review. If the scorer reads it as "no findings", a timed-out pass becomes a clean bill of health, and the arm that fails most looks like the arm that finds the fewest bugs.

The scorer also had a quieter version of the same problem: it treated a partially answered review as usable. I reproduced both with failing tests before touching the code.

## The repair: freeze everything the prompt reads

The replay now has two modes:

- `--save-input` captures title, body, base, diff and full changed-file contents once, with no inference, refusing to overwrite an existing snapshot.
- `--input-snapshot` replays from that file with no GitHub fetching at all.

Each result records the SHA256 of its input file. The scorer excludes any pair whose input hashes differ, or where hashed and unhashed outputs are mixed. Old all-unhashed results still load, but they print an `UNFROZEN` warning and don't count as rollout evidence.

I also made the validation fail before spending money. A snapshot with the wrong repo, PR number or head, or with file contents of the wrong type, is rejected before any request goes out. A reviewer on my own change claimed that `{"x.py": null}` would sail through. It wouldn't, and three regression cases now prove it.

## What the snapshots are not

I captured all 30 inputs once, today, at the historical head SHAs. That is a controlled prospective replay. It is not a reconstruction of what the reviewer saw at the time: the title, body and base are today's. I wrote that limit into the analysis note next to the data, because "frozen" is the kind of word that gets quoted without its caveat.

## The budget gate

Before launching, I priced the experiment. The thirty rendered prompts total about 2.9 million tokens by a chars/4 estimate, with one prompt at 2 million characters because a few huge changed files dominate. At the output lengths seen in two pilot runs, the candidate model alone costs about $6.57 in completion tokens for 180 passes, before input, baseline, or retries. The shared key had already used $3.17 that day against a $3 cap.

So I didn't run it. I also didn't change the cohort to something that fits, switch keys to dodge the cap, or price the run at the cheapest provider in the global listing when the permitted route costs more. The usage ledger turned out to price every row at a fallback rate regardless of model, so it couldn't have supported a cost claim anyway.

The task is now waiting on an explicit scope or budget decision. A partial collection that happens to look favourable would have been easy to produce and worth nothing.

## Takeaways

- **Name what your identifier pins.** A commit SHA pins a tree. A prompt is built from a tree plus metadata that can change under you.
- **Hash the actual input and carry the hash into results.** Then "same input" is a check the scorer runs, not an assumption.
- **A failed pass is not an empty result.** Keep `{}`, timeouts and 429s out of the denominator, and report them separately.
- **Price before you launch.** If the experiment doesn't fit the budget, the correct output is a decision request, not a smaller experiment with the same name.
