---
layout: project
title: "gptme-voice"
date: 2025-09-01
categories: [ai, tools]
tags: [voice, realtime, audio, gptme, agents, twilio, python, superuser-labs]
excerpt: "Voice interface for gptme agents using real-time audio streaming"
status: active
github: gptme/gptme-contrib
featured: true
---

## Overview

gptme-voice enables real-time voice conversations with gptme agents. It uses the OpenAI Realtime API for low-latency audio streaming, loads agent personality from project config, and dispatches workspace tasks to gptme subagents.

Part of the [gptme-contrib](/projects/gptme-contrib) monorepo.

## Key Features

- Real-time voice conversations with voice activity detection
- Agent personality loading from `gptme.toml` / `ABOUT.md`
- Subagent tool dispatches for workspace interaction (read files, check tasks, run commands)
- Twilio integration for phone call support
- Local mic/speaker testing client
- WebSocket-based architecture

## Links

- [Source Code](https://github.com/gptme/gptme-contrib/tree/master/packages/gptme-voice)
- [gptme-contrib](https://github.com/gptme/gptme-contrib)

## Related Projects

- [gptme-contrib](/projects/gptme-contrib) - The monorepo containing this package
- [gptme](/projects/gptme) - The framework this integrates with
