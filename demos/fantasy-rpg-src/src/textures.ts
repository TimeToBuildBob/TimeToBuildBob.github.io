// All art is drawn at runtime with Graphics + generateTexture so the build
// ships no binary assets and works fully offline.

import Phaser from 'phaser'
import {
  DIRECTIONS,
  HERO_ANIM_KEY,
  HERO_FRAME_COUNT,
  PALETTE,
  SLIME_ANIM_KEY,
  SLIME_FRAME_COUNT,
  TEX,
  TILE,
  heroFrameKey,
  playerFrameKey,
  slimeFrameKey,
  walkAnimKey,
  type CharacterPalette,
  type Direction,
} from './constants'

const CHAR_W = 24
const CHAR_H = 32

/** Run a draw callback on a throwaway Graphics object and bake it to a texture. */
function bakeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
): void {
  if (scene.textures.exists(key)) return
  const g = scene.make.graphics({}, false)
  draw(g)
  g.generateTexture(key, width, height)
  g.destroy()
}

function drawGrass(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x4a7a3a, 1).fillRect(0, 0, TILE, TILE)
  g.fillStyle(0x55883f, 1)
  for (const [x, y] of [
    [4, 6],
    [20, 10],
    [12, 22],
    [26, 26],
    [8, 28],
  ]) {
    g.fillRect(x, y, 3, 3)
  }
  g.fillStyle(0x3f6b32, 1)
  for (const [x, y] of [
    [16, 4],
    [2, 18],
    [28, 14],
  ]) {
    g.fillRect(x, y, 2, 2)
  }
}

function drawGrassAlt(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x55883f, 1).fillRect(0, 0, TILE, TILE)
  g.fillStyle(0x6a9a4c, 1)
  for (const [x, y] of [
    [6, 8],
    [22, 22],
    [14, 16],
  ]) {
    g.fillRect(x, y, 3, 3)
  }
  // A couple of little flowers for variety.
  g.fillStyle(0xf0d860, 1).fillCircle(9, 11, 2)
  g.fillStyle(0xe06a6a, 1).fillCircle(24, 7, 2)
}

function drawForest(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x244a2d, 1).fillRect(0, 0, TILE, TILE)
  g.fillStyle(0x315f39, 1)
  for (const [x, y, r] of [
    [6, 7, 4],
    [20, 9, 5],
    [14, 23, 4],
    [27, 18, 3],
  ]) {
    g.fillCircle(x, y, r)
  }
  g.fillStyle(0x19351f, 1)
  g.fillRect(10, 12, 2, 7)
  g.fillRect(21, 14, 2, 6)
}

function drawForestAlt(g: Phaser.GameObjects.Graphics): void {
  drawForest(g)
  g.fillStyle(0x3f7a47, 1)
  g.fillCircle(9, 25, 3)
  g.fillCircle(24, 24, 2)
  g.fillStyle(0xbadf8a, 1).fillRect(15, 7, 2, 2)
}

function drawRuins(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x6d685e, 1).fillRect(0, 0, TILE, TILE)
  g.fillStyle(0x817b70, 1)
  for (const [x, y, w, h] of [
    [0, 0, 16, 8],
    [17, 7, 15, 9],
    [3, 19, 14, 11],
    [19, 20, 10, 10],
  ]) {
    g.fillRect(x, y, w, h)
  }
  g.lineStyle(1, 0x4d473f, 1)
  g.lineBetween(11, 0, 8, TILE)
  g.lineBetween(23, 0, 27, TILE)
}

function drawRuinsAlt(g: Phaser.GameObjects.Graphics): void {
  drawRuins(g)
  g.lineStyle(2, 0xb68c52, 0.8)
  g.strokeCircle(8, 8, 4)
  g.strokeCircle(23, 23, 3)
}

function drawWall(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x6b5436, 1).fillRect(0, 0, TILE, TILE)
  g.fillStyle(0x8a6e44, 1).fillRect(0, 0, TILE, 7) // lit top edge
  g.lineStyle(2, 0x4a3a25, 1).strokeRect(1, 1, TILE - 2, TILE - 2)
  g.lineStyle(1, 0x4a3a25, 1)
  g.lineBetween(0, 16, TILE, 16)
  g.lineBetween(16, 0, 16, 16)
  g.lineBetween(8, 16, 8, TILE)
  g.lineBetween(24, 16, 24, TILE)
}

function drawSlimeFallback(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x5abf63, 1).fillEllipse(12, 15, 18, 14)
  g.fillStyle(0x79db86, 1).fillEllipse(12, 11, 12, 8)
  g.fillStyle(0x1a1a1a, 1)
  g.fillRect(8, 11, 2, 2)
  g.fillRect(14, 11, 2, 2)
  g.lineStyle(1, 0x2f7f40, 1)
  g.strokeEllipse(12, 15, 18, 14)
}

/** Draw a tiny humanoid facing `dir`. `step` toggles the walk-cycle legs. */
function drawCharacter(
  g: Phaser.GameObjects.Graphics,
  palette: CharacterPalette,
  dir: Direction,
  step: number,
): void {
  // Legs (alternate which one is forward to fake a stride).
  const aLift = step === 0 ? 2 : 0
  const bLift = step === 0 ? 0 : 2
  g.fillStyle(palette.legs, 1)
  g.fillRect(5, 26 - aLift, 5, 6 + aLift)
  g.fillRect(14, 26 - bLift, 5, 6 + bLift)

  // Torso.
  g.fillStyle(palette.body, 1).fillRect(4, 12, 16, 15)

  // Head + hair.
  g.fillStyle(palette.skin, 1).fillRect(6, 2, 12, 12)
  g.fillStyle(palette.hair, 1)
  if (dir === 'up') {
    // Facing away — back of the head is mostly hair.
    g.fillRect(6, 2, 12, 9)
  } else {
    g.fillRect(6, 2, 12, 4)
  }

  // Eyes indicate facing direction.
  g.fillStyle(0x1a1a1a, 1)
  if (dir === 'down') {
    g.fillRect(9, 9, 2, 2)
    g.fillRect(13, 9, 2, 2)
  } else if (dir === 'left') {
    g.fillRect(8, 9, 2, 2)
  } else if (dir === 'right') {
    g.fillRect(14, 9, 2, 2)
  }
}

/** Create every texture the game needs. Safe to call more than once. */
export function createTextures(scene: Phaser.Scene): void {
  bakeTexture(scene, TEX.grass, TILE, TILE, drawGrass)
  bakeTexture(scene, TEX.grassAlt, TILE, TILE, drawGrassAlt)
  bakeTexture(scene, TEX.forest, TILE, TILE, drawForest)
  bakeTexture(scene, TEX.forestAlt, TILE, TILE, drawForestAlt)
  bakeTexture(scene, TEX.ruins, TILE, TILE, drawRuins)
  bakeTexture(scene, TEX.ruinsAlt, TILE, TILE, drawRuinsAlt)
  bakeTexture(scene, TEX.wall, TILE, TILE, drawWall)
  bakeTexture(scene, TEX.slimeFallback, 24, 24, drawSlimeFallback)

  bakeTexture(scene, TEX.npcMarin, CHAR_W, CHAR_H, (g) =>
    drawCharacter(g, PALETTE.marin, 'down', 0),
  )
  bakeTexture(scene, TEX.npcGuard, CHAR_W, CHAR_H, (g) =>
    drawCharacter(g, PALETTE.guard, 'down', 0),
  )

  for (const dir of DIRECTIONS) {
    for (let step = 0; step < 2; step++) {
      bakeTexture(scene, playerFrameKey(dir, step), CHAR_W, CHAR_H, (g) =>
        drawCharacter(g, PALETTE.player, dir, step),
      )
    }
  }
}

/** Register the 4-directional walk animations from the baked player frames. */
export function createAnimations(scene: Phaser.Scene): void {
  for (const dir of DIRECTIONS) {
    const key = walkAnimKey(dir)
    if (scene.anims.exists(key)) continue
    scene.anims.create({
      key,
      frames: [
        { key: playerFrameKey(dir, 0) },
        { key: playerFrameKey(dir, 1) },
      ],
      frameRate: 6,
      repeat: -1,
    })
  }
}

export function createAtlasAnimations(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.heroAtlas) && !scene.anims.exists(HERO_ANIM_KEY)) {
    scene.anims.create({
      key: HERO_ANIM_KEY,
      frames: Array.from({ length: HERO_FRAME_COUNT }, (_, idx) => ({
        key: TEX.heroAtlas,
        frame: heroFrameKey(idx),
      })),
      frameRate: 7,
      repeat: -1,
    })
  }

  if (!scene.textures.exists(TEX.slimeAtlas) || scene.anims.exists(SLIME_ANIM_KEY)) {
    return
  }

  scene.anims.create({
    key: SLIME_ANIM_KEY,
    frames: Array.from({ length: SLIME_FRAME_COUNT }, (_, idx) => ({
      key: TEX.slimeAtlas,
      frame: slimeFrameKey(idx),
    })),
    frameRate: 6,
    repeat: -1,
    yoyo: true,
  })
}
