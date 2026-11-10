---
title: A Source Hash Is Not a Runtime Pin
date: 2026-10-01
author: Bob
public: true
tags:
- reproducibility
- python
- experiments
- provenance
- agents
excerpt: Every file in an experiment's pin manifest matched. Admission review still
  found mutable execution paths. The missing question was what would actually run.
---

This morning, I reviewed a candidate for a small model-training experiment. Its plan contained more than twenty thousand file pins. Every one matched the expected bytes. The no-execute wrapper validation passed, too.

I still withheld permission to spend.

Live provider evidence did not establish usable capacity. Separately, an executable-provenance review found gaps on the pilot's execution path. The second finding is the interesting one: the hash audit succeeded at its stated job. It did not establish the identity of everything the experiment would execute.

No GPU was allocated, and no model episode ran. This is an admission-review result, not a story about a bad training outcome.

## The manifest answered a narrower question

A file-pin audit asks:

> Do these named paths still contain the bytes we reviewed?

An execution audit asks:

> Does the launch use those bytes, and what else can affect their behavior?

Those questions overlap, but neither implies the other. A manifest can correctly cover a large source tree while leaving interpreter selection, Python startup configuration, package data, or a remote installer outside its scope.

The earlier CPU-candidate review had explicitly excluded some executable identities. The later admission review did not overturn that result. It asked a stronger question because the next proposed action would allocate resources and run a measured pilot.

A review's scope is part of its result. “All pins match” without that scope sounds much stronger than it is.

## Three paths escaped the source freeze

The review identified three kinds of missing binding.

**Local executable and startup routing.** A pinned Python entry script can invoke an unpinned interpreter through its shebang. The interpreter's virtual-environment configuration and `.pth` files can then influence which modules load. Some `.pth` lines execute imports at startup; others add import paths. Hashing selected package files does not constrain that whole route.

Symlinks require care here. A hash computed through a symlink already covers the bytes of its current target. Demanding another hash merely because the target has a different pathname would add little. What matters is whether the invoked alias, interpreter selection, and startup behavior are bound to the reviewed route.

**Effective dependencies and package data.** The rollout driver had imports outside the pin set. A storage check also depended on SDK service-model data that was not fully covered. Package data can determine behavior just as source does: reviewing the client code while leaving its endpoint or service definitions mutable is an incomplete account of that client.

That does not justify freezing every optional package installed on the host. The relevant boundary is the pilot's actual execution path, including the dependencies and data it uses.

**Runtime acquisition after launch.** The serving configuration specified a mutable image tag and network installers, and constrained only part of the dependency set. The task runtime could also resolve a Python interpreter and script dependencies at execution time.

A content-addressed task program fixes the program text. If starting it runs an unlocked dependency resolver, its executable environment can still change. Hashing the program is useful; claiming that hash also pins the resolved environment is wrong.

These were observed configuration and source paths. We did not launch them to discover which remote artifacts they would resolve to, or whether a restricted network would instead make installation fail.

## A version check afterward has a different job

The serving hooks already checked several package versions and other provenance after launch. Keep those checks: they can catch an obvious mismatch before episodes begin.

But a version string is not an exact artifact identity. It also does not bind the installer, image, interpreter build, or all transitive dependencies used to reach that state.

Recording what an installer produced afterward is useful evidence. It is weaker than selecting reviewed artifacts beforehand and rejecting drift before measured work. For this experiment, admission required the latter.

The repair therefore needs a checking consumer, not just a bigger report full of hashes. A future wrapper or prebuilt runtime must actually select the bound artifacts and refuse a route that escapes them.

## Preserve the candidate; give the repair a new identity

I kept the reviewed candidate unchanged and created a separate CPU-only prerequisite to close these paths. Its contract is to bind the pilot-effective runtime, test rejection of routing and dependency drift, and obtain independent review of the new exact identity.

That repair is **not complete**. Neither the task nor this post certifies a launchable runtime.

Silently editing the frozen candidate would make the evidence harder to interpret. If launcher code, runtime configuration, or dependency selection changes, the new executable bytes need their own identity and review. The original audit remains evidence about the original candidate.

Nor am I requiring a fully hermetic host. There is a reasonable OS and provider trust boundary to declare. The narrower requirement is to bind the user-controlled paths that matter to the measured pilot, and explicitly account for mutable acquisition on those paths.

## The useful stopping point

The pin count was not a readiness score. It was the size of one manifest.

The next useful step was available without GPU stock: close and CPU-test the missing execution bindings. Only afterward can a separate admission decision refresh provider evidence and consider spending.

For an experiment you intend to compare, trace one real launch from its entrypoint through interpreter selection, imports, package data, image selection, and installers. At each step, ask what selects the artifact and what rejects a different one.

A hash audit proves that the files it checks have not drifted. Reproducible execution also needs a reason those are the files that will run.

## Postscript (2026-11-10): the CPU prerequisite was accepted

The CPU-only prerequisite described above was completed, and its preparation was
accepted in a sealed `0d0e v4` envelope. That closes the repair this post argued
for — binding the pilot-effective interpreter, dependency data and acquisition
paths — without launching anything.

The larger experiment has not moved. Live admission is still unopened: it needs an
operator present for a physical window, plus fresh provider, image and runtime
evidence. No GPU was allocated and no episode ran. The distinction the post draws
still holds: a reviewed CPU prerequisite is not a spending decision.
