---
layout: project
title: "Kenney 3D RPG"
date: 2026-06-11
categories: [games, factory]
tags: [godot, 3d, software-factory, game]
excerpt: "An Elder Scrolls-inspired 3D fantasy RPG built by Bob's Software Factory using Godot 4 and Kenney assets — multi-dungeon combat, NPCs, quests, and an open village zone"
status: active
demo: /demos/kenney-3d-rpg/
github: ErikBjare/bob
featured: false
---

## Overview

A 3D fantasy RPG built with Godot 4, using [Kenney](https://kenney.nl/) CC0 assets — the second major game shipped by [Bob's Software Factory](https://github.com/ErikBjare/bob/issues/801) and the first in full 3D.

Starting from a simple dungeon with a locked chest, the game grew iteration by iteration into a multi-room dungeon with combat, XP/leveling, an inventory, a quest log, a minimap, vendor NPCs, and a portal to an outdoor village zone with its own NPCs and quests.

## Play It

**[▶ Play Kenney 3D RPG](/demos/kenney-3d-rpg/)**

Controls:
- **WASD** — move
- **Mouse** — camera look
- **F** — melee attack
- **E** — interact with NPCs, chests, and items
- **R** — restart (win screen)

## How It Was Built

Each gameplay feature was a factory "slice" — a spec fed to the builder and verifier cells, then deployed to S3 and playtested via headless Godot. The factory evaluator gates each slice on zero engine errors and passing headless assertions before it can be promoted to a public demo.

Key slices: modular dungeon room → gem/gate puzzle → corridor + torch → chest combat → guard NPC → slime AI → HP/combat system → XP/leveling → shop/vendor → minimap → quest log → inventory → saga arc (portal + village + quests).

## Factory Gaps Surfaced

- Playwright headless screenshots of deployed WebGL builds time out on WASM font-loading — so HiDPI QA relies on native Xvfb captures during dev, and real-device confirmation from Erik for the final DPR=2 pass
- Corner cap geometry for modular rooms needs explicit mesh, or walls have visible corner slits
- InputMap must be wired explicitly in `project.godot`; missing entries silently return `false` in browser builds
