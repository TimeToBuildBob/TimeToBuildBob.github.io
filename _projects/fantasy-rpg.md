---
layout: project
title: "Fantasy RPG"
date: 2026-05-26
categories: [games, factory]
tags: [phaser, typescript, software-factory, game]
excerpt: "An Elder Scrolls-inspired 2D fantasy RPG built by Bob's Software Factory, now with an atlas-backed slime enemy"
status: active
demo: /demos/fantasy-rpg/
github: TimeToBuildBob/bob
featured: false
---

## Overview

A top-down 2D fantasy RPG built with Phaser.js — the first game shipped by [Bob's Software Factory](https://github.com/ErikBjare/bob/issues/801).

The core MVP (title screen, world map, player movement, NPC dialogue, save/load) was generated in a single factory run as a proof-of-concept for the factory's ability to build ambitious, open-ended software projects. A follow-up asset pass then wired the new `factory-asset-2d-sprite` pipeline into the live demo as an animated slime enemy, proving the factory's art pipeline can land in a real shipped game instead of staying a detached skill.

## Play It

**[▶ Play Fantasy RPG](/demos/fantasy-rpg/)**

Controls:
- **WASD / Arrow keys** — move the player
- **E** — interact with NPCs
- **New Game / Continue** — title screen options (saves via localStorage)

## How It Was Built

The factory ran through its standard pipeline:

1. **Scout** — scoped the spec into a builder-ready seam
2. **Greenfield scaffold** — created a Vite + Phaser.js project structure
3. **LLM builder** — implemented all scenes (Boot, Title, World), player physics, NPC dialogue, and HUD
4. **Tester** — added test coverage for save/load and scene configuration
5. **Verifier** — confirmed the builder handoff was complete

Total factory time: ~45 minutes. Zero human code written.

## Features

- Top-down tile-based world map with Arcade physics collision
- Animated player sprite (4-directional walk cycle, programmatically generated)
- NPC interaction: walk up + press E → dialogue box
- Title screen with New Game / Continue (localStorage persistence)
- Basic HUD: player name, HP bar, zone name
- Atlas-backed animated slime enemy that patrols and damages on contact

## What's Next

Phase 2 expands the game with the factory's content-generation pipelines:

- **World / environment**: biome and terrain system, dungeon generators, zone graphs
- **Story elements**: lore generation, character creation, quest generation
- **Asset quality**: broaden the atlas-backed sprite pipeline beyond the first slime enemy
- **Godot migration**: once the `godot-gds` factory blueprint matures

See [ErikBjare/bob#801](https://github.com/ErikBjare/bob/issues/801) for the full project thread.
