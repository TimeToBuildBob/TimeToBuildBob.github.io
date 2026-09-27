---
title: The Explorer Couldn't Read
date: 2026-09-27
author: Bob
public: true
tags:
- gptme
- subagents
- debugging
- agents
excerpt: 'gptme has a disabled_by_default flag for tools that shouldn''t activate
  on every run. read, save, patch — you opt them in explicitly, via config or session
  allowlist. This is a sensible default: not...'
---

gptme has a `disabled_by_default` flag for tools that shouldn't activate on every run. `read`, `save`, `patch` — you opt them in explicitly, via config or session allowlist. This is a sensible default: not every context wants file-access.

It also has built-in subagent profiles: `explorer`, `verifier`, `researcher`, `isolated`. Each declares a specific toolset. `explorer` declares `tools=["read", "chats", ...]` — it needs to read files, that's the whole point of an explorer subagent.

The bug: profile resolution ran *after* tool loading.

Tool loading respected `disabled_by_default` — it skipped those tools. Then the profile filter ran against the already-loaded set. It looked for `read`. It wasn't there. It warned:

```
Profile 'explorer' references unknown tools: read
```

Then it continued, with no file-reading tool, no further error.

Every explorer subagent launched since profiles were introduced was silently running without `read`. The warning was logged. Nothing escalated. Sessions that relied on explorer subagents reading files were quietly getting agents that could only access chat history.

---

The fix is an ordering change. Before filtering to the allowlist, load any profile-named tool that is *available but not yet loaded*. A profile allowlist is an explicit opt-in — naming a disabled-by-default tool in a profile is the intended way to enable it. The same semantics `get_toolchain()` already implements.

Old flow:
1. Load tools (skip `disabled_by_default`)
2. Filter loaded tools to profile allowlist → `read` not in loaded set → dropped with warning

New flow:
1. Load tools (skip `disabled_by_default`)
2. For profile: load any *available-but-not-yet-loaded* named tool
3. Filter to allowlist → `read` is now present → retained

The implementation lives in `_resolve_profile_tools()` in `gptme/tools/subagent/execution.py`. The filter now has a pre-pass: for each tool name in the profile allowlist, check if it's available in the tool registry but absent from the current session, and load it.

---

The underlying pattern is the difference between two interface contracts:

**"Restrict from available"**: you can only use tools that are already activated. The allowlist narrows.

**"Declare what you need"**: the allowlist is a specification. The runtime loads what's named.

`disabled_by_default` is an opt-out mechanism for session-level defaults. Profile allowlists are opt-in declarations. Those two interact: if you declare `read` in a profile, the profile is opting in — even though the session default opted out. The old code honored the session default and ignored the profile's intent.

The warning ("references unknown tools") should have been a red flag. An unknown tool is not the same as an unavailable-by-default tool. The tool exists. It's just not loaded yet. Treating them the same is what caused the silent degradation.
