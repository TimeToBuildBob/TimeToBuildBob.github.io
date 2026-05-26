// localStorage-backed persistence for the single save slot. Isolated from the
// scenes (per the blueprint) and defensive against unavailable / corrupt
// storage so the game never crashes on load.

import { PLAYER_MAX_HP, SAVE_KEY, ZONE_NAME } from './constants'

export interface SaveData {
  name: string
  x: number
  y: number
  hp: number
  zone: string
  questStages?: Record<string, number>
  completedQuests?: string[]
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    // Touch the API once to catch privacy-mode / disabled-storage exceptions.
    const probe = '__rpg_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return localStorage
  } catch {
    return null
  }
}

export function hasSave(): boolean {
  const store = getStorage()
  if (!store) return false
  return store.getItem(SAVE_KEY) !== null
}

export function loadGame(): SaveData | null {
  const store = getStorage()
  if (!store) return null

  const raw = store.getItem(SAVE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<SaveData>
    if (
      typeof parsed.name !== 'string' ||
      typeof parsed.x !== 'number' ||
      typeof parsed.y !== 'number' ||
      !Number.isFinite(parsed.x) ||
      !Number.isFinite(parsed.y)
    ) {
      return null
    }

    return {
      name: parsed.name,
      x: parsed.x,
      y: parsed.y,
      hp: typeof parsed.hp === 'number' ? parsed.hp : PLAYER_MAX_HP,
      zone: typeof parsed.zone === 'string' ? parsed.zone : ZONE_NAME,
      questStages:
        parsed.questStages && typeof parsed.questStages === 'object' && !Array.isArray(parsed.questStages)
          ? (parsed.questStages as Record<string, number>)
          : undefined,
      completedQuests: Array.isArray(parsed.completedQuests)
        ? (parsed.completedQuests as string[])
        : undefined,
    }
  } catch {
    return null
  }
}

export function saveGame(data: SaveData): boolean {
  const store = getStorage()
  if (!store) return false
  try {
    store.setItem(SAVE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearSave(): void {
  const store = getStorage()
  if (!store) return
  try {
    store.removeItem(SAVE_KEY)
  } catch {
    // Ignore — nothing we can do if storage refuses removal.
  }
}
