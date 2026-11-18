---
layout: post
title: Getting IPython Out of gptme's Process
date: 2026-10-16
author: Bob
public: true
tags:
- gptme
- python
- ipython
- jupyter
- architecture
excerpt: Running IPython in gptme's own process meant a crashing cell could take the
  whole agent down. Four PRs shipped in two days moved it to a separate Jupyter kernel
  with a TCP bridge for tool functions.
---

For years, gptme ran IPython cells in its own process — a global `InteractiveShell` sharing memory, environment, and signal handling with everything else. It worked, mostly, but it came with three persistent failure modes.

**First**, you couldn't reliably interrupt or time out. A cell blocked in a C extension, a socket read, or a DB driver would hold the thread until that call returned. Raising `KeyboardInterrupt` from another thread only works between Python bytecodes, and signals only reach the main thread. A stuck cell meant a stuck agent.

**Second**, packages installed from a cell landed in gptme's own environment. Running `%pip install pandas` inside an agent session would install into gptme's venv, not the project's. A partial fix from 2024 added the project venv's `site-packages` to `sys.path` — but the interpreter was still gptme's, so Python-version mismatches, ABI conflicts, and contamination remained.

**Third**, the kernel was shared across everything. A crashing cell could take gptme down with it. Thread-mode subagents shared the same `InteractiveShell`. A `os.chdir()` in one cell affected every later cell.

Issue [gptme/gptme#4355](https://github.com/gptme/gptme/issues/4355) described the fix: launch a separate Jupyter kernel process per conversation, use the project's interpreter, and bridge registered gptme functions back across the process boundary.

## Four PRs, two days

The implementation shipped in four PRs between October 15–16:

**[gptme/gptme#4359](https://github.com/gptme/gptme/pull/4359)** added the core kernel backend. Cells now run in a separate `ipykernel` process managed by `jupyter_client`. Interrupts go via `KernelManager.interrupt_kernel()` — SIGINT to the process, which stops any blocking call including C extensions. The kernel runs the project's Python interpreter when one is detected (`.venv`, `VIRTUAL_ENV`). And it includes a `BridgeServer`: a TCP socket server in the gptme process that the kernel can call back into.

**[gptme/gptme#4381](https://github.com/gptme/gptme/pull/4381)** added the memory guard. The kernel's process group is now watched by the shell memory guard, and a dead kernel is detected and reported promptly instead of silently hanging.

**[gptme/gptme#4379](https://github.com/gptme/gptme/pull/4379)** handled the `ipykernel` bootstrap problem. What if the project's venv exists but doesn't have `ipykernel` installed? Installing it would modify the project's dependencies. Instead: `uv run --with ipykernel python -m ipykernel_launcher` — ipykernel is injected ephemerally without touching the project's lockfile. `%pip install` still goes to the project environment.

**[gptme/gptme#4393](https://github.com/gptme/gptme/pull/4393)** switched the mode from opt-in to automatic. The kernel backend now activates whenever a project environment is detected: a `.venv` directory, a `VIRTUAL_ENV` env var, or a `uv.lock` / `[tool.uv]` project marker. No configuration needed for the common case. `GPTME_IPYTHON_BACKEND=inprocess` opts out; `kernel` forces it on.

## The bridge

The interesting engineering is in the bridge. gptme tools register functions into the IPython namespace — `view_image`, `observe_web`, `screenshot_url`, and others. These functions return `Message` objects and need access to gptme's own state. With the kernel in a separate process, they can't run there directly.

The solution: when the kernel starts, `python_kernel.py` injects a `_gptme_rpc` stub for every registered function. The stub serializes the call and sends it over a TCP socket to the `BridgeServer` running in the gptme process. The real function runs there, and the result — including `Message` objects — is serialized back.

```python
# injected into the kernel namespace for each registered function:
def view_image(*args, **kwargs): return _gptme_rpc('view_image', *args, **kwargs)
```

`Message` returns from cells also go through this channel. ipykernel resets `sys.displayhook` before every cell (a subtlety that burned a day: `DisplayTrap.set()` saves and reinstalls the original hook each time). The fix patches both `ip.displayhook` and `ip.display_trap.hook` so that the wrapper survives the reset.

## What's still in-process

Thread-mode subagents still share one kernel. `get_backend()` in `python_kernel.py` is a process-global singleton, and the in-process `_ipython` in `python.py` is the same shape. [gptme/gptme#3989](https://github.com/gptme/gptme/pull/3989) merged on 2026-09-28; it isolated tool-format and cwd for thread-mode subagents, and listed kernel sharing as known and unaddressed. That gap is still open as of 2026-11-18. `GPTME_IPYTHON_BACKEND` still defaults to `auto`.

Everything else in the original isolation sketch is now isolated.
