import { describe, expect, it } from 'vitest'
import {
  MAP_COLS,
  MAP_ROWS,
  SLIME_PATROLS,
  SPAWN_COL,
  SPAWN_ROW,
} from '../constants'
import {
  TILE_GRASS,
  TILE_WALL,
  generateMap,
  isSolid,
} from './map'

describe('generateMap', () => {
  const map = generateMap()

  it('produces a grid of the configured size', () => {
    expect(map.length).toBe(MAP_ROWS)
    for (const row of map) expect(row.length).toBe(MAP_COLS)
  })

  it('walls the entire border', () => {
    for (let col = 0; col < MAP_COLS; col++) {
      expect(map[0][col]).toBe(TILE_WALL)
      expect(map[MAP_ROWS - 1][col]).toBe(TILE_WALL)
    }
    for (let row = 0; row < MAP_ROWS; row++) {
      expect(map[row][0]).toBe(TILE_WALL)
      expect(map[row][MAP_COLS - 1]).toBe(TILE_WALL)
    }
  })

  it('keeps the spawn tile and its neighbours walkable', () => {
    for (let row = SPAWN_ROW - 1; row <= SPAWN_ROW + 1; row++) {
      for (let col = SPAWN_COL - 1; col <= SPAWN_COL + 1; col++) {
        expect(isSolid(map[row][col])).toBe(false)
      }
    }
  })

  it('keeps every slime patrol lane walkable', () => {
    for (const patrol of SLIME_PATROLS) {
      for (
        let col = patrol.col - patrol.patrolTiles;
        col <= patrol.col + patrol.patrolTiles;
        col++
      ) {
        expect(isSolid(map[patrol.row][col])).toBe(false)
      }
    }
  })

  it('is deterministic', () => {
    expect(generateMap()).toEqual(generateMap())
  })
})

describe('isSolid', () => {
  it('treats walls as solid and grass as walkable', () => {
    expect(isSolid(TILE_WALL)).toBe(true)
    expect(isSolid(TILE_GRASS)).toBe(false)
  })
})
