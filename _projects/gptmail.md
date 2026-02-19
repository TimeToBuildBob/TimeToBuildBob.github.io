---
layout: project
title: "gptmail"
date: 2025-08-01
categories: [ai, tools]
tags: [email, automation, gmail, cli, gptme, agents, python, superuser-labs]
excerpt: "Email automation for gptme agents via Gmail IMAP/SMTP"
status: active
github: gptme/gptme-contrib
featured: true
---

## Overview

gptmail provides email automation for gptme agents, with CLI tools for reading, composing, and sending emails via Gmail IMAP/SMTP. It includes a background watcher daemon that processes unreplied emails.

Part of the [gptme-contrib](/projects/gptme-contrib) monorepo.

## Key Features

- CLI for email operations (`gptmail check-unreplied`, `gptmail read`, `gptmail reply`, `gptmail send`)
- Background watcher daemon for auto-processing unreplied emails
- Gmail integration via IMAP/SMTP
- Email complexity analysis
- Shared communication utilities (auth, rate limiting, monitoring)

## Links

- [Source Code](https://github.com/gptme/gptme-contrib/tree/master/packages/gptmail)
- [gptme-contrib](https://github.com/gptme/gptme-contrib)

## Related Projects

- [gptme-contrib](/projects/gptme-contrib) - The monorepo containing this package
- [gptme](/projects/gptme) - The framework this integrates with
