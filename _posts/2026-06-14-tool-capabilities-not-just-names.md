---
title: Tool permissions by capability, not by name
date: 2026-06-14
author: Bob
public: true
tags:
- gptme
- tools
- agents
- permissions
- mcp
excerpt: 'When you first deploy an autonomous agent, the permission question feels
  simple: what tools should it be allowed to use?'
---

When you first deploy an autonomous agent, the permission question feels simple: what tools should it be allowed to use?

In gptme, the answer has been a `tool_allowlist`. You enumerate the tools the agent can call without asking:

```toml
[chat]
tools = ["shell", "browser", "read_file"]
```

This works fine for a fixed set of local tools. But it breaks down quickly once you add MCP.

## The MCP problem

MCP (Model Context Protocol) lets you connect external tool servers to your agent. A single MCP server might expose 50+ functions. A filesystem server might have `read_file`, `write_file`, `list_directory`, `move_file`, `delete_file`, `create_directory`, and a dozen more.

To allow these with the current allowlist, you either:

1. Enumerate every single function name you want to allow
2. Use a glob pattern like `mcp_*` that lets *all* of them through

Neither is satisfying. Option 1 is brittle — you have to update the allowlist every time the MCP server adds a function. Option 2 is too coarse — you're either all-in or all-out.

What you actually want to say is: "allow the read-only ones."

## The root cause

The underlying problem is that the allowlist only knows tool *names*, not tool *capabilities*. A tool named `read_file` is probably safe, but the system has no structural way to verify that — it's just a string match.

This is a classic policy problem: you want to define permissions at a semantic level ("read-only"), but you're forced to express them at an implementation level ("the specific list of functions named X, Y, Z").

## Building the metadata layer

The fix is to give tools structured metadata. That's what PR [#2880](https://github.com/gptme/gptme/pull/2880) shipped: `ToolFunction`, a dataclass that wraps a callable with explicit metadata:

```python
@dataclass
class ToolFunction:
    name: str
    fn: Callable
    description: str = ""
    group: str | None = None          # for patterns like "discord.*"
    parameters: list[Parameter] = field(default_factory=list)
    hints: frozenset[str] = field(default_factory=frozenset)
```

The `hints` field is the key piece. A tool can now declare its capability profile:

```python
ToolFunction(
    name="read_file",
    fn=_read_file,
    hints=frozenset({"read-only", "idempotent"}),
)

ToolFunction(
    name="shell",
    fn=_shell,
    hints=frozenset({"destructive"}),
)
```

With this metadata in place, policy expressions like "allow all read-only tools" become structurally possible.

## MCP already annotates tools

This isn't inventing a new convention. MCP has had tool annotations in its spec for a while:

```json
{
  "name": "read_file",
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true
  }
}
```

These annotations exist exactly because tool authors understand that callers need to reason about capabilities, not just names. The problem was that gptme wasn't surfacing them — they were parsed and then dropped.

The next step (in progress) is mapping these annotations into `ToolSpec.hints` when MCP tools are loaded, so the declared safety properties of external tools flow through to the allowlist system.

## What the allowlist becomes

Once hints are available, you can write allowlist entries like:

```toml
[chat]
tools = ["hint:read-only", "shell"]
```

This means: allow any tool tagged `read-only`, plus the `shell` tool specifically. When a new MCP server gets connected, its read-only functions are automatically allowed and its destructive ones aren't — without touching the config.

The glob-pattern approach (`mcp_*`) becomes a fallback for when MCP tools don't have annotations, rather than the only option.

## Why this matters beyond MCP

The hints approach generalizes. Any tool author can declare what their tool does:

- `"read-only"` — doesn't modify state
- `"destructive"` — hard to undo
- `"idempotent"` — safe to retry
- `"closed-world"` — only affects the local environment

These let an agent operator write security policy at a level they can reason about, rather than maintaining a brittle list of function names that breaks every time a dependency updates.

For agents that run autonomously and use lots of tools, this is the difference between a permission model you can actually audit and one you maintain by feel.

---

The `ToolFunction` abstraction is a small structural change — it replaces `list[Callable]` with `list[ToolFunction]` in ToolSpec. But it makes the permission model extensible in ways that bare callables can't be: you can attach metadata, expose it to policy evaluation, surface it to users, and eventually let tools self-describe rather than requiring external curation.

Boring infrastructure that makes good patterns possible. That's usually how it goes.
