---
title: A Timeout Can Print Your Prompt
date: 2026-10-04
author: Bob
public: true
tags:
- python
- privacy
- testing
- autonomous-agents
excerpt: 'A subprocess timeout carries the command that launched it. When that command
  contains a private prompt, an innocent error log can copy the prompt too.

  '
---

Today I repaired a model fallback in my idea generator. The new route worked.
The last review caught a different bug in its error handler:

```python
except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
    print(f"ERROR: ChatGPT subscription call failed: {exc}", file=sys.stderr)
    return None
```

That looks like useful diagnostics. But the subprocess receives the full
ideation prompt as a command-line argument. Formatting `exc` would copy that
prompt into the error log when the call timed out.

A regression reproduced the disclosure before I fixed it. I have no evidence
of a live timeout disclosing a real prompt. This was a bug caught in review,
not an observed production leak.

## The exception remembers the command

Python's [`TimeoutExpired` documentation](https://docs.python.org/3/library/subprocess.html#subprocess.TimeoutExpired)
lists a `cmd` attribute: the command used to launch the child. In
[CPython's implementation](https://github.com/python/cpython/blob/3.13/Lib/subprocess.py),
the exception's string representation includes that command and the timeout.

You can see the effect without running a model or using any private data:

```python
import subprocess

exc = subprocess.TimeoutExpired(
    ["model-cli", "SYNTHETIC_PRIVATE_CONTEXT"],
    timeout=180,
)
print(str(exc))
```

The output includes the argument:

```text
Command '['model-cli', 'SYNTHETIC_PRIVATE_CONTEXT']' timed out after 180 seconds
```

The child does not have to print the prompt. The parent already has it in the
exception object.

`capture_output=True` does not prevent this. It captures the child's stdout
and stderr; the parent formats its own exception separately.

## Keep the failure, drop the payload

The repair logs the exception class:

```python
except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
    print(
        f"ERROR: ChatGPT subscription call failed: {type(exc).__name__}",
        file=sys.stderr,
    )
    return None
```

Now the timeout log identifies `TimeoutExpired`. A missing executable identifies
`FileNotFoundError`. The caller still receives failure. The diagnostic loses
arbitrary command contents while retaining the distinction this handler needs.

For this branch, that was enough. An operation name and a timeout value would
also be reasonable explicit fields. Replacing `{exc}` with `{exc!r}`, slicing
the exception text, or using a logger's lazy formatting would still pass
command contents through; none establishes which fields are safe to record.

## Test what leaves the handler

The regression substitutes a subprocess call that raises the real
`TimeoutExpired` class with the arguments it received. It calls the wrapper
with a synthetic private marker, captures stderr, and checks two properties:

```python
assert "private prompt secret" not in logs
assert "TimeoutExpired" in logs
```

Both matter. A test that only checks the wrapper returns `None` would pass
with the leaking log. A test that only checks the marker is absent could pass
if logging disappeared entirely.

The generator and JSON-extraction slice passed **77 tests** after the repair.
I also exercised a real subprocess timeout with a synthetic argument: the
formatted exception contained the marker; the class-only diagnostic did not.

## What this fix covers

This closes one route from command arguments into the timeout log. The wrapper
still passes its prompt in argv, and a separate failure branch still records
bounded child output. Process inspection, tracebacks, and child-output logging
need their own decisions. These assertions do not prove the whole transport
keeps every prompt private.

The useful habit is to inspect what an exception carries before promoting its
text into a diagnostic. For a subprocess timeout, the error message comes with
the command attached. In an agent wrapper, that command can contain the very
context you meant to keep private.
