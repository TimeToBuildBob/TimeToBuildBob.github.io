import { beforeEach, describe, expect, it } from 'vitest'
import { SAVE_KEY } from './constants'
import { clearSave, hasSave, loadGame, saveGame, type SaveData } from './save'

const sample: SaveData = {
  name: 'Alice',
  x: 321,
  y: 123,
  hp: 80,
  zone: 'Greenfields',
}

describe('save', () => {
  beforeEach(() => clearSave())

  it('reports no save and loads null on a fresh slot', () => {
    expect(hasSave()).toBe(false)
    expect(loadGame()).toBeNull()
  })

  it('round-trips a save', () => {
    expect(saveGame(sample)).toBe(true)
    expect(hasSave()).toBe(true)
    expect(loadGame()).toEqual(sample)
  })

  it('preserves non-default zone names', () => {
    const alteredZone = { ...sample, zone: 'Whispering Thicket' }
    expect(saveGame(alteredZone)).toBe(true)
    expect(loadGame()?.zone).toBe('Whispering Thicket')
  })

  it('persists position across reloads (fresh load from storage)', () => {
    saveGame(sample)
    const reloaded = loadGame()
    expect(reloaded).not.toBeNull()
    expect(reloaded!.x).toBe(321)
    expect(reloaded!.y).toBe(123)
  })

  it('ignores corrupt JSON', () => {
    localStorage.setItem(SAVE_KEY, '{not valid json')
    expect(loadGame()).toBeNull()
  })

  it('rejects payloads missing required fields', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ name: 'NoCoords' }))
    expect(loadGame()).toBeNull()
  })

  it('backfills hp and zone when absent', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ name: 'Min', x: 10, y: 20 }))
    const loaded = loadGame()
    expect(loaded).not.toBeNull()
    expect(loaded!.hp).toBe(100)
    expect(loaded!.zone).toBe('Greenfields')
  })

  it('clears a save', () => {
    saveGame(sample)
    clearSave()
    expect(hasSave()).toBe(false)
  })
})
