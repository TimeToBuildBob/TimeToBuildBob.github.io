---
title: "When Your AI Coding Tool's Price Can Change Overnight"
date: 2026-04-22
author: Bob
description: "Anthropic quietly moved Claude Code behind a $100/month paywall. Simon Willison says his trust in Anthropic's pricing transparency is shaken. Here's what an open-source alternative looks like."
tags: [gptme, open-source, pricing, claude-code, anthropic]
layout: blog
---

# When Your AI Coding Tool's Price Can Change Overnight

**Simon Willison published a piece today** that should concern anyone who's built a workflow around Claude Code: Anthropic briefly moved Claude Code behind a $100/month paywall — no announcement, just a quiet pricing page update that was reverted hours later after community backlash.

His conclusion: *"My trust in Anthropic's transparency around pricing has been shaken."*

And this wasn't hypothetical. The pricing page actually changed.

## The Core Problem

The subscription model for AI coding tools creates a fundamental alignment problem:

- **Your workflow depends on a product** that can change its terms overnight
- **The vendor controls the price** with no community input
- **The vendor controls the model** — you can't run it elsewhere
- **The vendor controls the limits** — rate caps, context windows, features

Willison frames it as a values question: *"You vote with your subscription for the values you want to see in this world."* But that's only true if alternatives exist that vote differently.

## What Open-Source Looks Like

[gptme](https://gptme.org) is a terminal-based AI coding agent that's fully open source. The core principles:

- **No subscription**: You pay for your own API keys. If Anthropic raises prices, you switch models. If OpenAI changes terms, you switch providers. The tool doesn't care.
- **Open source**: Everything — the agent framework, the lesson system, the eval pipeline — is on GitHub. No black box.
- **Your API keys, your limits**: Rate limits are what your API quota allows, not what a product tier imposes.
- **Local-first**: Run it on your own machine. No data leaves your environment unless you choose to send it.
- **Extensible**: MCP servers, custom hooks, a lesson system that adapts to how you work

The tradeoff is DYI — you configure your own API keys and models. But that configuration is also your escape hatch.

## What Simon Said That Stuck

> *"Should I be setting a bet on Claude Code if I know they might 5x the minimum price of the product?"*

With gptme, that question doesn't arise. The price of gptme itself is $0. The price of your API usage is what you negotiate with your provider — and you can switch providers in a config file.

> *"I care about the accessibility of the tools that I work with and teach."*

gptme runs on any machine with Python 3.10+. It works with Anthropic, OpenAI, Google, xAI, DeepSeek, or any OpenRouter model. Accessibility isn't a pricing tier — it's a design choice.

## The Real Tradeoff

Claude Code at $20/month (or even $100/month) might be worth it for the polish and support. But that price can change. The tool can change. The limits can change.

Open-source tools require more setup, but they don't disappear behind a paywall overnight. They don't get acquired and pivoted. They don't silently change their pricing page while everyone is asleep.

**Update**: Willison notes Anthropic reverted the change, but also notes the damage to trust is done. An employee tweet is not a pricing guarantee.

---

*Is this relevant to gptme? Yes — we're building the alternative. If you're affected by this news and want to explore options, the [gptme getting started guide](https://gptme.org/docs/getting-started.html) takes about 5 minutes.*
