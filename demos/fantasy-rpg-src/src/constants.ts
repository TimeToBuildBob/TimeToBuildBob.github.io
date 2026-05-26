// Central place for tunable values, texture keys and tiny helpers shared across
// scenes. Kept framework-agnostic (no Phaser imports) so it can be unit tested
// and imported from anywhere without side effects.

export type Direction = 'down' | 'up' | 'left' | 'right'

export const DIRECTIONS: Direction[] = ['down', 'up', 'left', 'right']

/** Pixel size of a single map tile. */
export const TILE = 32

/** World size, in tiles. Larger than the viewport so the camera scrolls. */
export const MAP_COLS = 80
export const MAP_ROWS = 60

export const WORLD_WIDTH = TILE * MAP_COLS
export const WORLD_HEIGHT = TILE * MAP_ROWS

/** Fixed game resolution; the canvas is scaled to fit the window. */
export const VIEW_WIDTH = 800
export const VIEW_HEIGHT = 600

export const ZONE_NAME = 'Greenfields'
export const DEFAULT_NAME = 'Hero'

export const PLAYER_SPEED = 170
export const PLAYER_MAX_HP = 100
export const INTERACT_DISTANCE = 60
export const SLIME_DAMAGE = 8
export const SLIME_DAMAGE_COOLDOWN_MS = 700
export const SLIME_MAX_HP = 3
export const PLAYER_ATTACK_DAMAGE = 1
export const ATTACK_RANGE = 52
export const ATTACK_COOLDOWN_MS = 380
/** Slimes chase the player when within this many pixels, else they patrol. */
export const SLIME_AGGRO_RADIUS = 120
/** Chase speed — below PLAYER_SPEED (170) so the player can still outrun them. */
export const SLIME_CHASE_SPEED = 95
export const HERO_ANIM_KEY = 'hero-loop'
export const HERO_FRAME_COUNT = 8
export const SLIME_ANIM_KEY = 'slime-wobble'
export const SLIME_FRAME_COUNT = 4
export const TILE_VARIANT_COUNT = 4
export const PROP_VARIANT_COUNT = 3

/** Player spawn, expressed in tile coordinates (must be a walkable tile). */
export const SPAWN_COL = 3
export const SPAWN_ROW = 3
export const SPAWN_X = SPAWN_COL * TILE + TILE / 2
export const SPAWN_Y = SPAWN_ROW * TILE + TILE / 2

/** localStorage key for the single save slot. */
export const SAVE_KEY = 'fantasy-rpg:save:v1'

export const SCENE_KEYS = {
  boot: 'Boot',
  title: 'Title',
  world: 'World',
} as const

/** Texture keys generated at runtime in BootScene. */
export const TEX = {
  grass: 'tile-grass',
  grassAlt: 'tile-grass-alt',
  forest: 'tile-forest',
  forestAlt: 'tile-forest-alt',
  ruins: 'tile-ruins',
  ruinsAlt: 'tile-ruins-alt',
  wall: 'tile-wall',
  heroAtlas: 'hero-atlas',
  meadowAtlas: 'meadow-tile-atlas',
  forestAtlas: 'forest-tile-atlas',
  flagstoneAtlas: 'flagstone-tile-atlas',
  npcMarin: 'npc-marin',
  npcGuard: 'npc-guard',
  slimeAtlas: 'slime-atlas',
  slimeFallback: 'slime-fallback',
  thornTreeAtlas: 'thorn-tree-atlas',
  ruinPillarAtlas: 'ruin-pillar-atlas',
  bannerAtlas: 'castle-banner-atlas',
} as const

/** Render ordering so entities sit above tiles and UI above everything. */
export const DEPTH = {
  tiles: 0,
  walls: 1,
  scenery: 3,
  enemy: 4,
  npc: 5,
  player: 6,
  hint: 20,
  hud: 1000,
  dialogue: 1001,
} as const

export const SLIME_PATROLS = [
  { col: 7, row: 20, patrolTiles: 3, speed: 32, startLeft: false },
  { col: 12, row: 40, patrolTiles: 3, speed: 30, startLeft: true },
  { col: 20, row: 8, patrolTiles: 3, speed: 34, startLeft: false },
  { col: 15, row: 52, patrolTiles: 3, speed: 28, startLeft: false },
  { col: 38, row: 8, patrolTiles: 3, speed: 34, startLeft: true },
  { col: 50, row: 14, patrolTiles: 3, speed: 32, startLeft: false },
  { col: 65, row: 6, patrolTiles: 3, speed: 30, startLeft: true },
  { col: 42, row: 45, patrolTiles: 3, speed: 28, startLeft: false },
  { col: 55, row: 28, patrolTiles: 3, speed: 36, startLeft: true },
  { col: 70, row: 35, patrolTiles: 3, speed: 34, startLeft: false },
  { col: 60, row: 52, patrolTiles: 2, speed: 30, startLeft: true },
  { col: 75, row: 50, patrolTiles: 2, speed: 32, startLeft: false },
] as const

/** Colour palettes for the programmatically drawn characters. */
export const PALETTE = {
  player: { body: 0x3a6ea5, skin: 0xe0b088, hair: 0x5a3a22, legs: 0x2c4a6e },
  marin: { body: 0x9a3b3b, skin: 0xe0b088, hair: 0x2a2a2a, legs: 0x5a2222 },
  guard: { body: 0x3b7a4a, skin: 0xe0b088, hair: 0x33240f, legs: 0x244a2a },
} as const

export type CharacterPalette = (typeof PALETTE)[keyof typeof PALETTE]

export function playerFrameKey(dir: Direction, step: number): string {
  return `player-${dir}-${step}`
}

export function heroFrameKey(step: number): string {
  return `hero_${step}`
}

export function walkAnimKey(dir: Direction): string {
  return `walk-${dir}`
}

export function slimeFrameKey(step: number): string {
  return `slime_${step}`
}

export function meadowTileFrame(step: number): string {
  return `meadow_tile_${step}`
}

export function forestTileFrame(step: number): string {
  return `forest_tile_${step}`
}

export function flagstoneTileFrame(step: number): string {
  return `flagstone_tile_${step}`
}

export function thornTreeFrame(step: number): string {
  return `thorn_tree_${step}`
}

export function ruinPillarFrame(step: number): string {
  return `ruin_pillar_${step}`
}

export function castleBannerFrame(step: number): string {
  return `castle_banner_${step}`
}
