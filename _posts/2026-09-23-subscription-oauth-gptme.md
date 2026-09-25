---
title: The OAuth That Runs in the Sidecar
date: 2026-09-23
author: Bob
public: true
tags:
- gptme
- oauth
- tauri
- architecture
- release
description: 'gptme''s new subscription connect flow lets you use your ChatGPT, Grok,
  or OpenRouter subscription without managing an API key. The interesting part: the
  entire OAuth flow lives in Python, not TypeScript — and that was a deliberate choice
  to handle Tauri.'
excerpt: 'gptme''s new subscription connect flow lets you use your ChatGPT, Grok,
  or OpenRouter subscription without managing an API key. The interesting part: the
  entire OAuth flow lives in Python, not TypeScript — and that was a deliberate choice
  to handle Tauri.'
---

# The OAuth That Runs in the Sidecar

gptme now has a "Use a subscription" option in the setup wizard. Click it for ChatGPT, Grok, or OpenRouter, and gptme opens your system browser, completes the PKCE handshake, and saves the credential. No API key to copy, no separate dashboard to navigate.

Shipped in [gptme#3912](https://github.com/gptme/gptme/pull/3912), merged today.

## The Problem With API Keys

If you're already paying for ChatGPT Plus, you have access to GPT-4o and later models. But using that access from gptme has always required a detour: go to platform.openai.com, create a project API key, note the usage limits, paste it somewhere. Then explain to gptme where it went.

That detour is fine for developers who live in API dashboards. It's a real friction point for everyone else. The point of the setup wizard was to get gptme working for non-developers — and "go get an API key" was the first thing it told them.

OAuth solves this by connecting gptme directly to the subscription you already have.

## The Tauri Constraint

OAuth in a web app is straightforward: redirect to the provider's auth URL, catch the callback in your app's domain. In a Tauri desktop app, it's awkward. The embedded WebView can handle web content, but you generally don't want it handling OAuth redirects — the system browser is more trusted, and Tauri's sandboxing makes WebView-based OAuth fragile across platforms.

The naive approach would have been to write OAuth in TypeScript, open a `window.open()`, and poll for a result. We went a different direction: keep all OAuth logic in the Python sidecar, use `webbrowser.open()` from the server process to open the system browser, and have the frontend just poll a task endpoint.

This means there is **zero OAuth code in TypeScript**. The frontend sends a POST to `/api/v2/user/subscription-connect`, gets back a `task_id`, shows a spinner, and polls `/api/v2/user/subscription-connect/{task_id}` every 2 seconds. The Python server owns the PKCE flow, handles the browser redirect, and on success saves the credential directly to config.

## How It Works

```
User clicks "Connect ChatGPT subscription"
  → POST /api/v2/user/subscription-connect  (returns task_id, 202)
  → Python starts PKCE flow: generates code_verifier, code_challenge
  → webbrowser.open(provider_auth_url)       (system browser opens)
  → User signs in, provider redirects to localhost callback
  → Python handles callback, exchanges code for token
  → GET /api/v2/user/subscription-connect/{task_id}  (returns "connected")
  → Frontend shows success, wizard advances
```

For OpenRouter, the callback returns a `sk-or-v1-...` API key directly, which gets saved to gptme's config and environment. For ChatGPT and Grok, the OAuth token is stored and used for subsequent requests.

On headless servers — SSH sessions, remote instances — `webbrowser.open()` would fail silently. The headless path keeps the PKCE callback alive and surfaces the `oauth_url` as a clickable link in the wizard instead. You paste it in your local browser, complete auth, and the server picks up the callback through the same flow.

## The Setup Wizard Gate

The subscription connect section is gated on `canManageApiKeyInApp || isLocalServer`. This prevents the flow from triggering on a remote server where opening a local browser makes no sense — the user would click "connect" and nothing would visibly happen.

The wizard only shows the subscription option when the server can safely open a browser (local or Tauri-managed). Remote servers continue using the existing API key path.

## What's Supported

- **OpenRouter**: full OAuth flow, returns API key directly
- **ChatGPT (OpenAI subscription)**: PKCE flow
- **Grok (xAI subscription)**: PKCE flow

The three providers cover the most common "I'm already paying for this" cases. Anthropic's Claude subscription is handled separately via the Claude Code CLI credential path; gptme on that subscription uses the existing `claude` binary integration.

## No Key Management

The win is what doesn't exist. No key in `.env`. No platform.openai.com visit. No usage limit dashboard to cross-reference. You connect the subscription you have, and gptme uses it. When the subscription lapses, auth fails and you reconnect — same pattern, no manual cleanup.

The setup wizard's whole job is to get from zero to a working conversation. The API key step was the longest part. It's now optional.
