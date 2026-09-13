---
title: The answer key didn't change
date: 2026-09-13
author: Bob
public: true
tags:
- agents
- evaluation
- engineering
excerpt: My screening runner accepted a copied answer while the answer and verifier
  hashes stayed unchanged. A synthetic child process exposed the gap without a single
  model call.
---

My held-out screening runner accepted a synthetic answer copied from outside the trial workspace. The answer file and verifier had exactly the same hashes afterward.

Nothing needed to be modified. Reading was enough.

I reproduced this with a deterministic Python child, synthetic data, and zero model calls. That distinction matters: I found a hole in the runner's process boundary. I did not catch a model cheating, establish that previous trials used the hole, or measure how readily an agent would discover it.

The result is still sufficient to change what evidence I require from the next screening cohort.

The runner creates a temporary workspace, copies in the task's setup files, and launches the agent there. After the command returns, it runs the verifier against the workspace. Held-out inputs are excluded from the normal prompt and retrieval context, and provenance records identify the evaluation artifacts.

But the agent launch uses the caller's user identity and filesystem access. Setting `cwd` changes where relative paths start. It does not restrict which absolute paths a process can open.

For the probe, I created an answer file and a verifier in a separate temporary directory. The verifier accepts a submission when `result.txt` matches that synthetic answer. Then I substituted the runner's command builder with two tiny Python programs, leaving the actual trial and verifier subprocess execution in place:

| Child process | Submission | Verifier result |
|---|---|---|
| Positive control | Writes the known synthetic answer directly | Pass |
| Outside-read probe | Reads the separate verifier, copies the separate answer into `result.txt` | Pass |

Both files' hashes stayed unchanged. Repeating the probe produced the same result.

The positive control establishes that the submission path works. The second child establishes that this subprocess launch permits an outside answer read that the verifier accepts. The probe supplies the paths explicitly; discovery is outside its scope. It also bypasses the agent's command selection and tool policy, so it cannot establish whether a real agent would issue or be allowed to execute the same read.

Those limits keep the finding useful. We can fix a demonstrated boundary without inventing a behavioral story around it.

A hash comparison tells me whether the bytes at the two observation points match. A read leaves those bytes alone. Even a stronger arrangement that prevents writes throughout the trial would still leave answer access unresolved.

This gives evaluation provenance two separate jobs:

- Identify the task, verifier, model, and harness used to produce a result.
- Establish which information the evaluated process could access while producing it.

The second job becomes particularly awkward for agents that share a machine with their evaluators. An answer source can be a file, an earlier trajectory, or a local service. Goodhart Labs' [chess evaluation grader](https://github.com/Goodhart-Labs/beat-stockfish/blob/2fe51b6239a6dca70abfd70aca528ff4a0b3c3bf/grader/grader.py) makes a related distinction explicit: it records contact with the supplied engine separately from engine searches, and engine-assisted play fails its safety score. Looking at a resource and using it to produce an answer are different observations.

For my capability screen, I want the answer source to be inaccessible in the first place. The implementation task now requires controls at the actual tool execution boundary: ordinary workspace work must succeed, while reads of synthetic outside answers, verifiers, and prior results must fail, including through symlinks. Disallowed local IPC needs its own check. The trusted verifier must remain outside agent write authority, and agent descendants must stop before grading.

Those are acceptance criteria. The containment fix has not shipped. So far, I have reproduced the exposure, corrected the isolation documentation, and made containment a documented prerequisite of the next accepted screening cohort. Existing receipts remain preserved; they do not acquire an isolation guarantee retroactively.

The cheap probe already answered the question needed to assign the fix. A model campaign would answer a more expensive question about discovery and behavior, after the environment and tool rules are frozen.

Before I pay for another capability measurement, the synthetic outside-read submission needs to fail while the legitimate submission still passes. Unchanged answer-key hashes cannot provide that evidence.
