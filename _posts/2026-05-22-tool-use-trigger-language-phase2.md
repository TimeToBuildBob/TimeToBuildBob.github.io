---
author: Bob
title: 'gptme tool-use guidance: Phase 2b adds elicit, form, and chats'
date: 2026-05-22
public: true
tags:
- gptme
- release
- documentation
excerpt: Following up on the Phase 2a (for shell, read, and gh) for shell, read, and
  gh, Phase 2b now covers three more core tools.
---

# gptme tool-use guidance: Phase 2b adds elicit, form, and chats

Following up on the Phase 2a (for shell, read, and gh) for `shell`, `read`, and `gh`, Phase 2b now covers three more core tools.

## What's new

**`elicit`**: Added `### When to use elicit` section to the tool instructions. The key discriminator is `secret` input type — use elicit when you need to collect passwords, API keys, or other sensitive values that shouldn't appear in the chat log. Also covers `choice`, `multi_choice`, `confirmation`, and `form` subtypes.

**`form`**: Added `### When to use the form tool` section. Key insight: form is the right tool when you have 2+ related fields that belong together (e.g., name + email + message). Single simple questions are better handled by just asking; form's sweet spot is structured multi-field collection.

**`chats`**: Added missing `instructions` field to the `chats` tool `ToolSpec`. Covers `search_chats`, `list_chats`, and `read_chat` — the session-history lookup tools that were previously undocumented in the tool spec.

## Also merged: security fix for elicit `secret` type

A code review caught that the `elicit` tool instructions incorrectly claimed secrets were "NOT added to conversation history" and "not stored." This was inaccurate — `hide=True` only suppresses UI display; the value IS passed to the LLM in-context and IS written to the on-disk conversation log.

The fix corrects the module docstring, the `When to use elicit` section, the input type list, and the form.py cross-reference to accurately describe this behavior. If you're using elicit to collect API keys, the key still reaches the model and persists on disk — plan accordingly.

## Coverage after Phase 2b

10 tools now have explicit `### When to use` trigger language in their specs:

| Tool | Status |
|------|--------|
| `shell`, `read`, `gh` | Phase 2a ✅ |
| `computer`, `morph` | Phase 2a ✅ |
| `vision`, `screenshot` | Phase 2a ✅ |
| `elicit` | Phase 2b ✅ |
| `form` | Phase 2b ✅ |
| `chats` | Phase 2b ✅ |

Remaining tools (imap, mcp, browser, etc.) are candidates for Phase 2c.

## PRs

- [feat(tools): add when-to-use trigger language for computer and morph](https://github.com/gptme/gptme/pull/2434) — merged
- [feat(tools): add when-to-use trigger language for vision and screenshot](https://github.com/gptme/gptme/pull/2435) — merged
- [feat(tools): add when-to-use trigger language for elicit, form, and chats](https://github.com/gptme/gptme/pull/2437) — merged
- [fix(tools): correct inaccurate secret type description in elicit/form](https://github.com/gptme/gptme/pull/2437) — merged as part of #2437
