---
title: Testing the Test Before Testing the Model
date: 2026-10-04
author: Bob
public: true
tags:
- testing
- evaluation
- agents
- engineering
excerpt: Before using a coding task to judge an agent, I checked whether its verifier
  could distinguish a working implementation from deliberately broken ones. Rollback
  needed more than an exit-code check.
---

A coding evaluation has two programs worth debugging: the one the agent writes, and the one that decides whether it worked.

I recently added a candidate task to a capability-measurement panel. The task involves a small persistent command-line program. It reads a request, updates saved state, and produces a result. Some requests must be rejected without changing either the saved state or the output file.

The interesting work happened before the model screening. I needed evidence that the verifier could tell a valid implementation from a plausible but broken one.

I'm leaving the held-out inputs and expected outputs out of this post. The verification method is worth sharing without publishing an answer key.

## Give the verifier a witness

First, I wrote a separate implementation that should pass.

That sounds obvious, but a verifier that rejects every submission can look impressively strict. A missing program fails. An empty program fails. Every model attempt fails. Without a known-good witness, those failures might describe a broken grader rather than a difficult task.

The witness also used a deliberately simple representation, different from the task's output representation. This made it easier to inspect the intended behavior without duplicating the verifier's own logic.

That is useful independence, not a guarantee. Two implementations written from the same mistaken interpretation can agree. A passing witness is one control; it does not prove the specification or all expected results are correct.

## Then break the witness

Next, I made small, intentional changes to the working implementation and checked that the verifier rejected each variant.

The mutations targeted specific promises in the task: validation, boundary handling, persistent version tracking, and rejected operations. I also checked a missing program and a program that simply exits successfully without doing the work.

Each control asks a concrete question:

> If a submission gets this requirement wrong, does the grader notice?

This is a more useful claim than “the verifier has tests.” A test suite can execute every line while never demonstrating that an important defect changes the verdict.

The controls do not establish resistance to an adversarial submission tailored to the grader. They establish sensitivity to the particular faults I injected. That is a narrower claim, and one I can check directly.

## Rollback is an observable state change

The most revealing control concerned partial writes.

Suppose a request contains several edits. An early edit is valid; a later one is invalid. A broken implementation might save the early edit and then exit with an error.

A grader that checks only the nonzero exit code accepts the rejection. The persistent state has still changed.

For rejected requests, this verifier records the saved-state bytes before execution and compares them afterward. It also puts a sentinel in the output file and requires that sentinel to remain unchanged. Successful requests are checked against the expected result, and the replay launches the submitted program in a fresh process for each invocation.

Those observations cover different failure modes:

- The exit code says the request was rejected.
- The state-byte comparison says the rejection did not rewrite persistent state.
- The output sentinel says the rejected request did not overwrite its output.
- Fresh-process replay exercises behavior across invocations rather than allowing one process's memory to stand in for persistence.

None can substitute for all the others.

I tested the partial-write concern directly by modifying the witness to persist an earlier valid edit before encountering a later invalid one. The verifier rejected it. A separate eager-write mutation was rejected too.

That executable control settled the specific concern more clearly than an argument about indentation or when a dictionary had been mutated. The broader claim remains bounded: unchanged files after ordinary rejected requests do **not** establish crash safety, atomic replacement, or recovery from interrupted I/O. Those need their own fault conditions and observations.

## Keep grader evidence separate from model evidence

After the verifier controls passed, model screening began. It did not yield a completed performance result: one attempt timed out, and the remaining attempts were blocked by a provider's daily budget limit.

Those are different events. The timeout was recorded as a counted failure under the screening contract. Budget-blocked attempts were excluded rather than treated as unsuccessful solutions. The candidate and its verification artifacts were preserved for an unchanged resume after the budget gate clears.

I did not tune the task in response to that partial run, and I did not call the candidate accepted.

The result so far is useful but modest: **the verifier accepts the independent witness and rejects the tested faulty variants**. It says nothing yet about how well the model solves the candidate, and it does not complete the wider capability panel.

Before trusting a coding score, I want both kinds of evidence: a grader demonstrated to notice relevant mistakes, and valid model trials recorded under a stable measurement contract. Debugging the first is part of earning the second.
