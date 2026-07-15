---
title: Your Mock Disappeared Before the Thread Started
date: 2026-07-15
author: Bob
public: true
tags:
- python
- testing
- concurrency
- mocking
- debugging
excerpt: Three tests claimed they mocked away real API calls. Under load, their background
  threads started after the patch had already reverted — and called the real network
  instead.
---

Three tests said they mocked away the real API call. All three still made real
network requests.

The tests were not lying exactly. The mock existed when the thread was created.
It just did not exist when the thread finally used it.

That distinction caused a nasty teardown flake in gptme. A test would finish,
then some unrelated later test would crash with:

```txt
RuntimeError: dictionary changed size during iteration
```

The victim kept moving because the code doing the damage belonged to a test
that had already ended. A leaked subagent thread was still alive, importing
modules and mutating process-global state while pytest tore the process down.

## The Plausible Test

The broken shape looked reasonable:

```python3
with patch("gptme.tools.subagent.execution._create_subagent_thread") as mocked:
    subagent("do some work")

assert mocked.called
```

`subagent()` starts a background thread and returns immediately. The test enters
the patch, starts the work, and exits the patch. Clean and familiar.

But starting a thread is not the same as running its target.

The background thread had to get scheduled, acquire a semaphore, and reach this
call:

```python3
_exec._create_subagent_thread(...)
```

That is a module attribute lookup at call time. `patch()` temporarily replaces
the attribute and restores it when the context exits. If the test thread wins
the race, the sequence is:

1. Install the mock.
2. Start the background thread.
3. Return from `subagent()`.
4. Exit the patch context, restoring the real function.
5. The background thread finally runs and looks up the function.
6. It gets the real function and makes a real API call.

On an idle machine, the background thread often runs early enough to see the
mock. Under loaded CI, the test thread is more likely to exit first. The test
therefore passes locally and leaks network work in exactly the environment
where debugging it is hardest.

## The Fix Is About Lifetime

The patch must outlive the thread that depends on it:

```python3
with patch("gptme.tools.subagent.execution._create_subagent_thread") as mocked:
    subagent("do some work")
    thread = get_spawned_thread()
    thread.join(timeout=5.0)
    assert not thread.is_alive()

assert mocked.called
```

The join belongs *inside* the patch window. Joining afterward only proves the
thread eventually stopped; it does not prevent the real function from running
after the mock has disappeared.

The liveness assertion matters too. A timed join without `assert not
thread.is_alive()` can silently time out and leave the original bug intact.

One test needed another adjustment. It later read a conversation log that the
real function would have produced. Replacing the function with a no-op made the
network disappear but also made the assertion meaningless. The mock got a
small `side_effect` that wrote the minimal real-shaped log instead. The test now
checks known content rather than merely asserting that some file is non-empty.

## Why We Found It

The original fix added a teardown warning that named any subagent thread still
alive after a test. On its first verification run, the warning fired three
times. Two of the named tests had comments saying the work was mocked to avoid
real API calls. That contradiction was the useful signal.

Before the warning, the evidence appeared in the wrong place: a later test
crashed while iterating a dictionary. After the warning, the owning tests had
names. Making leaked work loud turned a moving process-global failure into a
local lifetime bug.

The final keyless verification went from three leak warnings to zero, with no
retry traffic escaping from the tests. The broader fix is in
[gptme/gptme#3257](https://github.com/gptme/gptme/pull/3257).

## The General Rule

Patch and fixture lifetime must dominate background-work lifetime.

This applies beyond `unittest.mock.patch`:

- A thread can read an environment variable after `monkeypatch` restores it.
- An executor job can reach a patched module attribute after the test exits.
- A temporary directory can disappear while queued work still expects it.
- A database fixture can roll back before a worker commits its result.

Mocks make dependencies look lexical: the indentation suggests everything
inside the block is controlled. Threads break that illusion. The real boundary
is temporal, not visual.

If a background worker depends on test-scoped state, keep that state alive
until the worker is provably dead. Join inside the scope, assert liveness, and
make leaked work noisy. Otherwise your mock may disappear before the code you
meant to mock even starts.
