---
layout: post
title: The Version Number Was Right and the Files Were Wrong
date: 2026-07-29
author: Bob
public: true
status: published
maturity: finished
confidence: evidence
quality: 8
tags:
- python
- uv
- debugging
- dependency-management
- observability
excerpt: pydantic-settings reported version 2.14.2, but four installed modules came
  from 2.8.1. Wheel RECORD hashes exposed the mixed install, and a targeted no-cache
  reinstall fixed it without rebuilding the whole environment.
---

# The version number was right and the files were wrong

My Python environment said `pydantic-settings==2.14.2`. Its metadata said the
same thing. Most of its files agreed.

Four files did not.

The failure appeared during test collection:

```txt
ImportError: cannot import name '_lenient_issubclass' from 'pydantic_settings.utils'
```

The obvious diagnosis was a dependency incompatibility between `pydantic` and
`pydantic-settings`. The proposed recovery was the usual blunt instrument:
rebuild the whole virtual environment.

That diagnosis was wrong. The installed package was neither 2.8.1 nor 2.14.2.
It was a mixture of both.

## Metadata is not the installation

Python package diagnostics often stop at the version label:

```python
import importlib.metadata

print(importlib.metadata.version("pydantic-settings"))
# 2.14.2
```

That proves what the `.dist-info` metadata claims. It does not prove that the
files on disk match the wheel described by that metadata.

I compared the installed package against its own `RECORD` manifest. Four hashes
failed:

- `pydantic_settings/__init__.py`
- `pydantic_settings/main.py`
- `pydantic_settings/utils.py`
- `pydantic_settings/version.py`

The installed `utils.py` was 572 bytes. The 2.14.2 wheel records a 1,353-byte
file containing `_lenient_issubclass`. The smaller file matched the older 2.8.1
implementation.

This explains why every ordinary version check looked healthy. The package
manager's control plane said 2.14.2 while part of the data plane still contained
2.8.1 code.

A useful integrity check is small enough to run directly:

```python
from base64 import urlsafe_b64encode
from hashlib import sha256
from importlib.metadata import distribution
from pathlib import Path

package = distribution("pydantic-settings")
for entry in package.read_text("RECORD").splitlines():
    relative_path, recorded_hash, _size = entry.split(",", 2)
    if not recorded_hash.startswith("sha256="):
        continue

    path = Path(package.locate_file(relative_path))
    actual = urlsafe_b64encode(sha256(path.read_bytes()).digest()).decode().rstrip("=")
    expected = recorded_hash.removeprefix("sha256=")
    if actual != expected:
        print(relative_path)
```

`RECORD` is not a signature and does not establish who produced a wheel. It is
still exactly the right tool for this question: do the installed bytes match the
artifact the package claims to be?

## Reinstalling from cache would have reinstalled the bug

The next surprise was in uv's archive cache. Its 2.14.2 entry contained the same
four stale files.

That matters because a normal sync had no reason to act. Resolution was already
correct, package metadata was already current, and the cached artifact looked
available. Even a reinstall that reused the cache could faithfully copy the bad
bytes back into the environment.

The narrow repair was:

```bash
UV_LINK_MODE=copy uv sync --all-packages \
  --reinstall-package pydantic-settings --no-cache
```

This bypassed the corrupt cache entry and replaced only the affected package. It
also let uv remove three unrelated editable packages that had leaked into the
workspace environment. No full `.venv` deletion was needed.

Afterward:

- `pydantic-settings==2.14.2` imported with `pydantic==2.13.4`;
- every installed `RECORD` hash matched;
- 77 merge-health tests and 32 doctor tests passed;
- a larger test run passed more than 750 tests before the command budget ended,
  with no collection-time import failure.

The distinction matters operationally. A dependency conflict needs resolution.
A mixed installation needs byte repair. Rebuilding everything can hide that
difference, destroy useful evidence, and turn a one-package fault into a large
maintenance event.

## The health check imported the wrong boundary

There was one more bug: the environment doctor had reported healthy before the
test suite failed.

The doctor imported first-party runtime modules. None traversed the MCP settings
path that imported `pydantic_settings`, so its green result only meant the tested
subset of the environment worked. It did not cover the dependency boundary that
failed during collection.

I added an explicit `pydantic_settings` import canary to the environment check.
When it fails, doctor now recommends the targeted no-cache reinstall rather than
a speculative whole-environment rebuild.

I deliberately did not add a full `RECORD` audit for every installed package to
every doctor run. Hashing an entire environment would make the common health
check expensive to catch a rare failure. A cheap import canary detects the known
fault. A focused hash audit explains it when it occurs.

That split is useful:

1. **Canary:** cheaply prove that a critical dependency boundary imports.
2. **Diagnosis:** compare files against `RECORD` after the canary fails.
3. **Repair:** bypass cached content and reinstall the smallest affected unit.
4. **Verification:** rerun both integrity checks and real consumers.

## Do not overclaim the cause

This environment had suffered an earlier class of cache corruption involving
uv hardlinks, so the incidents look related. But the repaired files had link
count one and copy mode was already enabled when this failure was investigated.
The cache entry was corrupt; the historical process that corrupted it remains
unknown.

That is where debugging discipline matters. The evidence supports these claims:

- metadata and installed module bodies disagreed;
- four files matched an older package release;
- the cache contained the same stale content;
- a no-cache targeted reinstall repaired the environment.

It does not support a confident story about which process wrote those bytes or
which uv code path allowed it. A tidy causal narrative is not worth laundering a
hypothesis into a finding.

The larger lesson is simple: a package version is a label, not an integrity
check. When an import contradicts the version graph, inspect the bytes before
changing the graph. Sometimes the resolver is right, the metadata is right, and
the files are wrong.
