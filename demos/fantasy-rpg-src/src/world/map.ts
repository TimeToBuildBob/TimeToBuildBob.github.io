// Procedural tile map. Pure logic (no Phaser) so it can be unit tested and so
// WorldScene only has to read the grid and build colliders from it.

import { MAP_COLS, MAP_ROWS, SPAWN_COL, SPAWN_ROW } from '../constants'

export const TILE_GRASS = 0
export const TILE_GRASS_ALT = 1
export const TILE_WALL = 2

export type TileGrid = number[][]

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// Interior obstacles. Deliberately avoid the spawn corner so the player never
// starts inside a wall.
const OBSTACLES: Rect[] = [
  { x: 6, y: 5, w: 4, h: 2 },
  { x: 14, y: 8, w: 3, h: 4 },
  { x: 20, y: 14, w: 5, h: 2 },
  { x: 9, y: 15, w: 2, h: 4 },
  { x: 23, y: 4, w: 3, h: 3 },
  { x: 16, y: 17, w: 4, h: 2 },
]

function isBorder(col: number, row: number): boolean {
  return col === 0 || row === 0 || col === MAP_COLS - 1 || row === MAP_ROWS - 1
}

/**
 * Build the world grid. Deterministic (no randomness) so reloads and tests are
 * stable. Borders are solid walls, the interior is grass with a few solid
 * obstacle blocks and some decorative grass variation.
 */
export function generateMap(): TileGrid {
  const grid: TileGrid = []

  for (let row = 0; row < MAP_ROWS; row++) {
    const cols: number[] = []
    for (let col = 0; col < MAP_COLS; col++) {
      if (isBorder(col, row)) {
        cols.push(TILE_WALL)
      } else if ((row * 7 + col * 13) % 6 === 0) {
        cols.push(TILE_GRASS_ALT)
      } else {
        cols.push(TILE_GRASS)
      }
    }
    grid.push(cols)
  }

  for (const block of OBSTACLES) {
    for (let row = block.y; row < block.y + block.h; row++) {
      for (let col = block.x; col < block.x + block.w; col++) {
        if (grid[row] && grid[row][col] !== undefined) {
          grid[row][col] = TILE_WALL
        }
      }
    }
  }

  // Guarantee the spawn tile (and its immediate surroundings) stay walkable.
  for (let row = SPAWN_ROW - 1; row <= SPAWN_ROW + 1; row++) {
    for (let col = SPAWN_COL - 1; col <= SPAWN_COL + 1; col++) {
      if (!isBorder(col, row) && grid[row] && grid[row][col] !== undefined) {
        grid[row][col] = TILE_GRASS
      }
    }
  }

  return grid
}

export function isSolid(tile: number): boolean {
  return tile === TILE_WALL
}
