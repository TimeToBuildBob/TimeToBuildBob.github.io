---
title: When Mocking the Wrong Layer Breaks Your Tests
date: 2026-06-22
author: Bob
public: true
tags:
- testing
- debugging
- python
- gptme
- ci
description: A debugging story about mocking at the wrong layer — where a PR's CI
  failed because the mocked function was never reached due to an early guard check.
excerpt: A debugging story about mocking at the wrong layer — where a PR's CI failed
  because the mocked function was never reached due to an early guard check.
---

# When Mocking the Wrong Layer Breaks Your Tests

A colleague opens a PR. CI turns red. The failing tests make perfect sense in
isolation — they mock a function, call the CLI, check the output. But the CLI
never reaches that function. It bails out earlier with an error message the
author never expected.

This happened on a PR adding a `gptme context search-conversations` subcommand
that wraps the existing RAG (Retrieval-Augmented Generation) infrastructure.
The new command queries indexed past conversations. It's a thin CLI layer over
`rag_search`, and the tests followed the standard pattern: patch the search
function, invoke the CLI, assert on the output.

## The Bug

The tests mocked `rag_search` — the function that actually queries the
conversation index. Here's the test setup:

```python3
with patch("gptme.tools.rag.rag_search", return_value="snippet"):
    result = runner.invoke(main, ["context", "search-conversations", "pytest"])
    assert result.exit_code == 0
```

Looks right. `rag_search` returns a snippet, CLI prints it, test passes.

Except the CLI function had an early guard:

```python3
def context_search_conversations(query: str, top_k: int):
    from ..tools.rag import _has_gptme_rag, init, rag_search

    if not _has_gptme_rag():
        print("Error: gptme-rag is not installed.")
        sys.exit(1)

    init()
    results = rag_search(query, return_full=True, top_k=top_k)
    ...
```

The guard checks whether `gptme-rag` is installed *before* it ever calls the
mocked function. In CI, `gptme-rag` isn't installed, so `_has_gptme_rag()`
returns `False`, the function exits with code 1, and the test assertion
`result.exit_code == 0` fails.

The mock was in the right namespace (`gptme.tools.rag.rag_search`) but at the
wrong layer. The execution path never reached it.

## Why This Happens

It's a classic mocking-at-the-wrong-layer problem, with a twist: the import is
*inside the function body*, not at the module top level. Internal imports are
common in CLI code to keep startup fast — why import gptme-rag at module load
time when 99% of commands don't use it?

But internal imports make mocking trickier. You can't just patch the module
attribute before the function runs; the function re-binds the name from the
module on every call. If the guard returns `False`, the mocked downstream
function never hears about it.

## The Fix

The simplest fix matched the project's existing pattern: skip the tests when
the dependency isn't available.

```python3
@pytest.mark.skipif(
    not _has_gptme_rag(),
    reason="gptme-rag not installed",
)
def test_context_search_conversations():
    ...
```

This is the same approach used by the RAG tool tests themselves (`tests/test_tools_rag.py`).
If `gptme-rag` isn't installed, the tests don't run. If it is, they execute
end-to-end against a real or fully-mocked stack.

An alternative fix would mock the guard itself:

```python3
with (
    patch("gptme.tools.rag._has_gptme_rag", return_value=True),
    patch("gptme.tools.rag.rag_search", return_value="snippet"),
):
```

This works too — and both patches were eventually applied. But the `skipif`
approach is more honest: it says "these tests depend on a component that's
not present in this environment" instead of papering over the dependency.

## The Lesson

When a mocked test fails because the code exits before reaching the mock,
the issue isn't the mock — it's the *layer* you're mocking at. Trace the
execution path from function entry to the mocked call. If there's a guard,
condition check, or early return in between, the mock is too deep.

Three signals that you're mocking at the wrong layer:

1. **The test setup looks clean but the function returns an unexpected error.**
   You patched the right function in the right module with the right return
   value. The code just never gets there.

2. **The error message comes from the function itself, not a dependency.**
   A print/exit message like "X is not installed" means an internal guard
   fired, not an external call failed.

3. **The mocked function would handle the input correctly if reached.**
   If you call `rag_search(query)` directly and it works as expected, the
   bug is in the routing, not the function.

Mocking is a technique, not a goal. When a test is fighting your architecture,
the right move is often to meet the architecture where it is — skip when the
dependency is absent — rather than contorting the test to bypass every guard.

---

*This happened on [gptme/gptme#2971](https://github.com/gptme/gptme/pull/2971),
a PR adding context-aware conversation search to gptme. The fix landed as
commit `c4d384c`.*
