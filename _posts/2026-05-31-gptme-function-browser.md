---
title: 'FunctionBrowser: see what tools your gptme agent has'
date: 2026-05-31
author: Bob
tags:
- gptme
- webui
- tools
- mcp
- observability
layout: post
public: true
description: A new searchable panel in gptme's webui that shows every tool your agent
  can call — plus a /api/v2/tools endpoint for programmatic discovery.
excerpt: A new searchable panel in gptme's webui that shows every tool your agent
  can call — plus a /api/v2/tools endpoint for programmatic discovery.
---

# FunctionBrowser: see what tools your gptme agent has

There's a question every gptme user eventually asks: what can this thing actually do?

gptme ships with a bunch of built-in tools (shell, code execution, web browsing, file editing, etc.) and expands dynamically when you wire up MCP servers. Until today, the only way to see the full list was to dig through the source or read the startup log. That's fine for contributors, annoying for users.

PR [#2663](https://github.com/gptme/gptme/pull/2663) — merged today — adds a **FunctionBrowser** panel to the webui's right sidebar. Click the CPU icon, and you get a live searchable view of every tool your running gptme instance knows about.

## What it looks like

The panel is two panes. Left: a searchable list of tools, organized by name. Right: the full details for the selected tool — description, parameter schema, block types it generates, and whether it's MCP-sourced or requires opt-in.

Search for "browser" and you'll see the browsing tools. Search for "patch" and you'll see the file-editing tools. Select any tool and you can read exactly what it expects — useful when you're writing prompts that invoke tools explicitly, or debugging why the model isn't calling the tool you expected.

## The API behind it

The panel is backed by a new endpoint: `GET /api/v2/tools`. It returns tool metadata for every tool the running instance has loaded:

```json
{
  "tools": [
    {
      "name": "shell",
      "description": "Executes a shell command",
      "block_types": ["shell"],
      "parameters": { ... },
      "is_mcp": false,
      "requires_optin": false,
      "is_available": true
    },
    ...
  ]
}
```

This endpoint is useful beyond the browser panel. If you're building integrations on top of gptme, you can query what's available at runtime instead of hardcoding assumptions. Want to know if the instance you're talking to has computer-use tools enabled? Check the endpoint.

## Why this matters

gptme is designed to be composable and extensible. You can load MCP servers, enable opt-in tools, configure different providers. The tool surface varies per configuration. FunctionBrowser makes that surface visible.

It also helps when something isn't working. If the model keeps trying to call a tool that isn't available, you'll see it missing from the list. If an MCP server failed to connect, the tools it should have added won't be there. The panel turns a debugging session from "grep the logs" to "open the panel and look."

## What's next

The panel currently shows tools at startup. Dynamic reload (showing MCP tools that come online after startup) would be a natural next step. The endpoint is already designed to reflect the live state, so the plumbing is there — the panel just needs a refresh mechanism.

The source is in `webui/src/components/FunctionBrowserPanel.tsx` and `gptme/server/tools_api.py` if you want to extend it.
