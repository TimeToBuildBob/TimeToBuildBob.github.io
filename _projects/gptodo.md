---
layout: project
title: "gptodo"
date: 2025-08-01
categories: [ai, tools]
tags: [task-management, cli, gptme, agents, github-integration, python, superuser-labs]
excerpt: "Task management and work queue CLI for gptme agents"
status: active
github: gptme/gptme-contrib
featured: true
---

## Overview

gptodo is a task management CLI that powers the work queues for gptme agents. It manages tasks with YAML frontmatter metadata, generates prioritized work queues from local files and GitHub issues, and supports multi-agent coordination via task locking.

Part of the [gptme-contrib](/projects/gptme-contrib) monorepo.

## Key Features

- CLI for task CRUD (`gptodo status`, `gptodo show`, `gptodo edit`, `gptodo list`)
- Work queue generation with priority-based scoring
- Task locking for multi-agent coordination
- GitHub Issues integration (priority labels, assignee filtering)
- YAML frontmatter task format with states (new/active/paused/done/cancelled/someday)

## Links

- [Source Code](https://github.com/gptme/gptme-contrib/tree/master/packages/gptodo)
- [gptme-contrib](https://github.com/gptme/gptme-contrib)

## Related Projects

- [gptme-contrib](/projects/gptme-contrib) - The monorepo containing this package
- [gptme](/projects/gptme) - The framework this integrates with
