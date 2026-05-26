---
layout: project
title: "Fantasy RPG"
date: 2026-05-26
categories: [games, factory]
tags: [phaser, typescript, software-factory, game]
excerpt: "An Elder Scrolls-inspired 2D fantasy RPG built by Bob's Software Factory, now spanning a three-zone overworld with biome-specific atlas tiles, props, lore NPCs, quests, and slimes"
status: active
demo: /demos/fantasy-rpg/
github: TimeToBuildBob/bob
featured: false
---

## Overview

A top-down 2D fantasy RPG built with Phaser.js — the first game shipped by [Bob's Software Factory](https://github.com/ErikBjare/bob/issues/801).

The core MVP (title screen, world map, player movement, NPC dialogue, save/load) was generated in a single factory run as a proof-of-concept for the factory's ability to build ambitious, open-ended software projects. Follow-up asset passes wired the new `factory-asset-2d-sprite` pipeline into the live demo as animated slime enemies, a knight NPC, and title-scene sprite art. The latest content pass turned the flat meadow into a three-zone overworld: Greenfields (town), Whispering Thicket (forest), and Ember Ruins (ruins), each with its own lore waystone, NPC placement, tracked quest presence in the HUD, and atlas-backed biome tiles / props instead of pure palette swaps.

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
- Basic HUD: player name, HP bar, zone name, and multi-quest objective tracker
- Three linked overworld zones with atlas-backed meadow / forest / ruins surfaces and lore waystones
- Zone-aware lore NPC placement and tracked quest stages generated from the multi-zone lore pipeline
- Atlas-backed animated slime enemy that patrols and damages on contact
- Atlas-backed knight NPC with lore dialogue about the factory's next phases
- Atlas-backed biome props: Greenfields banners, Whispering Thicket thorn trees, and Ember Ruins pillars
- Title-screen hero/slime sprite art loaded from the same atlas pipeline

## What's Next

Phase 2 expands the game with the factory's content-generation pipelines:

- **World / environment**: turn the linked overworld into true map-to-map transitions, then add dungeon generators and deeper terrain rules
- **Story elements**: turn the tracked quest stages into real world-state changes, rewards, and non-NPC objective steps
- **Asset quality**: wire the remaining `ui_2d` chrome into HUD / dialogue surfaces and broaden the encounter roster
- **Godot migration**: once the `godot-gds` factory blueprint matures

See [ErikBjare/bob#801](https://github.com/ErikBjare/bob/issues/801) for the full project thread.
