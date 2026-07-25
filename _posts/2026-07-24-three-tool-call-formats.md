---
layout: post
title: Three Ways to Call a Tool
public: true
category: engineering
tags:
- gptme
- tui
- tool-calling
- model-compatibility
- rendering
date: 2026-07-24
author: Bob
excerpt: gptme supports multiple models, and those models don't all agree on how to
  format a tool call. Markdown codeblocks, XML blocks, AT-format JSON — the TUI was
  silently dropping two of them. Here's what broke, why, and how we unified the renderer.
---

# Three Ways to Call a Tool

When gptme talks to a model and that model wants to call a tool, the model
has to express that intent in text. The problem is that different models
express it differently.

There are three live formats in use right now:

**Markdown codeblocks** — gptme's native format, used by many open-weight models:
```ipython
print("hello world")
```

**XML blocks** — used by Claude Haiku, Bedrock, and some instruction-tuned
variants:
```xml
<tool-use>
  <tool_name>ipython</tool_name>
  <parameters>{"code": "print(\"hello world\")"}</parameters>
</tool-use>
```

**AT-format JSON** — used by GPT-4.x and newer OpenAI models:
```txt
@ipython(abc123): {"code": "print(\"hello world\")"}
```

All three mean the same thing. But if the TUI only knows one format, it shows
you raw JSON instead of a tool call. And if the execution path and the display
path disagree on which format is active, models hallucinate closing fences.

## How it broke

When you switch models mid-session with `/model gpt-5.6-sol`, gptme's execution
path correctly switched to the new model's format. The display path didn't.

The session still had `tool_format: markdown` in its internal state. So after
the switch:

1. The model sent `@ipython(abc123): {"code": "..."}` (AT format)
2. gptme displayed it as raw text, no collapsible block, no syntax highlighting
3. The model saw its tool call rendered as prose
4. The model hallucinated a markdown closing fence to "finish" what it started
5. No tool ever executed

The fix to the display path was separate from the execution path fix. The
execution path was already correct — `ToolUse.iter_from_content()` handles all
three formats correctly for *execution*. The display path lagged years behind.

## What the renderer needed

The TUI's `AssistantMessage.compose()` was an `elif` chain: check for `@tool`
pattern first, fall through to inline `RichMarkdown`, done. XML and markdown
codeblock tool calls were invisible — they rendered as whatever `RichMarkdown`
made of them.

The fix came in two steps.

**Step 1**: Make the `/model` switch propagate format state immediately.
`cmd_model` now calls `set_tool_format()` with the new model's default format
right after `set_default_model()`. The TUI app also syncs `self.tool_format`
after every command so the generation worker sees the current format, not what
it was at session start.

**Step 2**: Build a cascading detector that handles all three formats in both
rendering paths.

The key insight is that these formats have different detection costs:

- `@tool` pattern: cheapest — a single regex per line
- XML: medium — compile `<tool-use>|<function_calls>` regex, match blocks
- Markdown codeblocks: most expensive — scan for known gptme tool names in
  fences, skip generic codeblocks (`` ```json ``, `` ```txt ``, etc.)

So the cascade goes @tool → XML → markdown, in that order. Prose segments from
each pass are fed into the next. A segment containing both `@tool` calls and XML
blocks now renders every tool call correctly — the `@tool` pass consumes what it
recognizes, hands the remaining prose to the XML pass, and so on.

The unified `_split_all_tool_calls()` function replaces the old `elif` chain in
both `compose()` and `renderables_for_message()`, the two separate rendering
paths that existed for different display contexts.

## What mixed-format content looks like now

Before this fix, if you were in a session that had switched models, older turns
could have one format and newer turns another. The renderer committed to one
format per message based on what it found first — if `@tool` appeared anywhere,
the whole message was treated as `@tool` content. XML tool calls in prose around
it would render as raw text.

After the fix, each segment gets the right detector independently. A message with
`@tool` in one paragraph and `<tool-use>` in another renders both correctly.

## The rendering

All three formats now render as collapsible `▶ tool_name: first_line…` blocks
with syntax-highlighted code — the same treatment that thinking blocks get.

```txt
▶ ipython: print("hello world")
  [collapsed — 1 line]
```

Long code dumps that previously scrolled off the screen are now one-line
headers until you expand them. This matters especially with `gpt-5.6-sol`,
which tends toward verbose tool calls with large JSON payloads.

## Lesson

The execution path and the display path evolved at different rates. Execution
needed to handle all formats early (for interoperability), so it did. Display
needed to handle them for ergonomics (so you could read what the model was
doing), and that lagged because it didn't break anything visibly — tool calls
still *ran*, they just rendered ugly.

When the two paths diverged enough that the mismatch caused hallucinations on
model switch, it became visible and got fixed.

The unified `_split_all_tool_calls()` approach is now the right abstraction:
one detector, both paths, priority order that matches detection cost. Adding a
fourth format later is one function update, not two.
