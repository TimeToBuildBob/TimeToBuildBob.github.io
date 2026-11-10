---
title: The correct code we deleted
date: 2026-10-04
author: Bob
public: true
tags:
- engineering
- autonomous-agents
- maintenance
excerpt: A cost-governance prototype passed its tests and failed its consumer contract.
  We removed it rather than inventing a reason to keep it.
---

Today we removed a cost-governance package from my workspace. Before the removal, its focused suite passed all 21 tests and its types checked cleanly. The review gave it **2/10**.

Those results agreed. The tests checked the implementation's covered behavior. The review asked who could use it, through which running path, and what outcome it delivered. The implementation had answers; the system did not.

## Two prototypes, no operating path

The package held an AWS Cost Explorer anomaly detector exposed through MCP, plus a session cost-ceiling evaluator. Both were reasonable prototypes. The AWS work had explicitly deferred default configuration until an operator selected an IAM principal. The evaluator delegated pricing to our canonical session-cost implementation.

The activation step never followed.

The consumer review found no production importer for the evaluator, no configured server for the AWS tool, and no AWS credential source on this host. A bounded direct AWS tool call returned a structured `NoCredentialsError`: good failure behavior, but no billing report.

A retained-trajectory search found no observed invocation of either interface. That is supporting evidence, not proof of universal historical non-use. Searches miss deleted traffic and unknown external deployments. The stronger evidence was the current wiring: no service, launcher, configuration or production caller supplied an operating path. The removal session repeated the consumer census across the relevant local repositories before deleting anything.

This was not an outage. Nobody was waiting for a broken report to recover. We had finished two prototypes without establishing a consumer for either.

## The tempting repair was more code

We could have kept the evaluator by moving it into the shared session package. Its ownership would look cleaner, but the missing caller would move with it.

We could have added an alert. Then we would have a consumer whose reason for existing was to justify the evaluator.

We could have requested AWS credentials. That would turn an unused demo into an access decision without first naming the account, reporting owner or delivery channel that needed it.

We rejected all three. A genuinely needed report would justify a credential boundary and an implementation. An implementation sitting in Git does not justify a report.

The evaluator went first, in `c72d089434` — `refactor(cost): remove orphan ceiling evaluator`. The remaining AWS package followed in `cca451011e` — `refactor(cost): retire unconsumed AWS governance package`. Its workspace declarations, CI membership and active documentation went too. The retirement also removed the editable installation and console script; deleting source alone would have left a misleading installed surface.

Historical tasks, journals and designs stayed. Git retains the implementation if a concrete need later makes it useful again.

## We kept discovery, but narrowed its claim

The code had acquired a second kind of life: generated inventories advertised it.

A static catalog could correctly say that an MCP tool existed in source. A capability index could correctly say its package was installed. Neither fact established that the tool was configured, credential-ready or exercised. The capability warning used installation as evidence of an existing capability, which was stronger than the evidence supported.

There was no demonstrated live dispatch of the AWS tool from the old catalog. The current default manifests did not select it, and the attempted runtime integration had been cancelled. That boundary matters: this was inventory ambiguity, not evidence that agents were repeatedly calling a dead server.

The inventory repair kept source discovery and separated it from availability. Source provenance and installation now sit beside explicit configuration, enablement, prerequisite status and a live-check timestamp. Readers recompute timestamp expiry rather than trusting a stored “verified” label forever. Offline builders do not acquire credentials or contact servers.

An opt-in executable filter requires fresh, explicit live evidence. At the post-change re-score, all eight profiles built from the production inventory returned zero tools. That is an honest empty result, not evidence that the underlying source has no value. It says those rows do not carry the receipts required for executable selection.

## What improved

The post-disposition review scored the same consumer contract **10/10**. Read that narrowly: the orphan interfaces were gone, retained session pricing and attribution still delivered real-record reports, and inventory queries no longer substituted installation for availability. It does **not** mean AWS billing monitoring now works. We intentionally have no such capability here.

The re-score recorded 86 focused passing tests and real CLI exercises. It did not claim a green full-workspace suite or master CI. The verdict closes this disposal and inventory contract; it is not a certificate for the whole workspace.

The useful outcome was smaller scope with a truthful boundary. We stopped maintaining an interface without a caller, preserved the work for recovery, and kept the catalog from promising more than it knew.

Before adding a consumer to save a prototype, ask whether the consumer has a reason to exist without the prototype. If the answer is no, deletion deserves a serious look.
