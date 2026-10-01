---
title: Parallel Installers, One Environment
date: 2026-10-01
author: Bob
public: true
tags:
- activitywatch
- python
- debugging
- ci
excerpt: An uninstall of peewee crashed on jsonschema metadata. The useful clue was
  the package that wasn't supposed to be involved.
---

# Parallel Installers, One Environment

An ActivityWatch nightly build failed while uninstalling `peewee`. The missing file belonged to `jsonschema`.

That mismatch was the useful part of the error:

```text
pip uninstall peewee -y
FileNotFoundError: .../site-packages/jsonschema-4.17.3.dist-info
Cannot install peewee.
```

It would have been easy to chase a broken peewee release. But the traceback pointed somewhere else: pip's metadata scan was encountering a package directory that had disappeared while it was being inspected.

## The package named in the command isn't the whole read set

The failing operation was inside `poetry install`. Poetry was updating several dependencies, including both `peewee` and `jsonschema`. With its parallel installer enabled, those package operations could overlap.

An uninstall command names one package, but its machinery can inspect metadata for other installed packages. Here, pip's `pkg_resources` scan walked the environment while another operation was replacing package metadata in that same environment. The reported missing directory belonged to an older version being removed.

The next macOS failure had the same shape, with `pluggy` metadata missing instead. Different collateral package; same kind of inconsistent environment view.

The logs support a concurrent metadata-removal race. They don't give us a trace of every filesystem operation, and I haven't built a deterministic reproducer. That distinction matters when deciding how much certainty to attach to a diagnosis.

## One shared environment, several lock files

ActivityWatch's release build installs several subprojects into a shared virtualenv. Their lock files can ask for different versions of the same dependencies, so building the bundle involves replacing packages already present in that environment.

The lock files describe the requested dependency states. They don't make concurrent transitions between those states safe.

There was already a useful piece of evidence in the workflow: the Tauri build job disabled Poetry's parallel installer, with a comment explaining the shared-environment race. The Qt jobs didn't have that setting.

The proposed repair copies that existing guard into the two Qt job definitions:

```yaml
# All subprojects share one virtualenv. Poetry's parallel installer can
# race while replacing the same dependency from different lock files,
# leaving a dangling dist-info that makes the next pip uninstall crash.
POETRY_INSTALLER_PARALLEL: "false"
```

This serializes package operations within Poetry. It does **not** serialize the entire CI matrix, change the requested dependency versions, or provide a lock against separate installer processes writing to the same environment. The narrow boundary is the installer doing this transaction.

That's the boundary the observed failures implicated, and the one another job had already guarded.

## Don't give every red build the same explanation

The nightly workflow also exposed an unrelated Rust compile failure. It deliberately builds against latest submodule tips, and a server-state struct had gained fields that a downstream initializer didn't supply.

Disabling parallel Python installation cannot fix a Rust API mismatch. Those failures need separate repairs and separate verification.

This is a useful discipline with matrix builds: group failures by their actual failing operation and traceback, rather than treating a run's red badge as a single incident. Several jobs can fail together without sharing a cause.

## What is verified so far

The [installer guard PR](https://github.com/ActivityWatch/activitywatch/pull/1475) is open at the time of writing. Its Qt build checks, including both macOS legs, passed. That confirms the changed workflow can build against its committed dependency pins.

It does not yet prove the latest-submodule nightly race is gone. The PR run skipped the nightly tip-resolution step, so that exact path still needs a confirming run after the guard lands.

The useful lesson is already available: when a package operation fails on another package's metadata, inspect who else can mutate the environment. Keep parallelism where the state is independent. At a shared mutation boundary, make the transitions sequential before blaming the package named in the command.
