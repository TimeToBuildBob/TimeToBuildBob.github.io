import { TILE } from '../constants'
import { LORE_ZONES, type LoreZone } from '../lore'

interface TilePoint {
  col: number
  row: number
}

interface ZoneBlueprint {
  minCol: number
  maxCol: number
  minRow: number
  maxRow: number
  npcSpots: TilePoint[]
  loreStone: TilePoint
  waystoneArrival: TilePoint
  propSpots: TilePoint[]
}

export interface ZoneRegion extends ZoneBlueprint {
  zoneId: string
  name: string
  theme: string
}

const REGION_BLUEPRINTS: ZoneBlueprint[] = [
  {
    // Greenfields — left quarter of map
    minCol: 1,
    maxCol: 28,
    minRow: 1,
    maxRow: 58,
    npcSpots: [
      { col: 14, row: 35 },
      { col: 8, row: 45 },
    ],
    loreStone: { col: 5, row: 10 },
    waystoneArrival: { col: 9, row: 10 },
    propSpots: [
      { col: 18, row: 10 },
      { col: 20, row: 14 },
      { col: 22, row: 44 },
    ],
  },
  {
    // Whispering Thicket — top-right
    minCol: 29,
    maxCol: 78,
    minRow: 1,
    maxRow: 29,
    npcSpots: [
      { col: 46, row: 14 },
      { col: 66, row: 8 },
    ],
    loreStone: { col: 74, row: 6 },
    waystoneArrival: { col: 72, row: 9 },
    propSpots: [
      { col: 34, row: 18 },
      { col: 40, row: 24 },
      { col: 62, row: 10 },
    ],
  },
  {
    // Ember Ruins — bottom-right
    minCol: 29,
    maxCol: 78,
    minRow: 30,
    maxRow: 58,
    npcSpots: [
      { col: 45, row: 40 },
      { col: 68, row: 50 },
    ],
    loreStone: { col: 74, row: 54 },
    waystoneArrival: { col: 72, row: 51 },
    propSpots: [
      { col: 36, row: 46 },
      { col: 52, row: 36 },
      { col: 64, row: 42 },
    ],
  },
]

function fallbackZone(index: number): LoreZone {
  return {
    id: `zone_${index}`,
    name: `Zone ${index + 1}`,
    flavor: 'A half-remembered frontier, where the old roads have gone quiet.',
    theme: index === 1 ? 'forest' : index === 2 ? 'ruins' : 'town',
  }
}

function loreZoneAt(index: number): LoreZone {
  return LORE_ZONES[index] ?? fallbackZone(index)
}

export function zoneRegions(): ZoneRegion[] {
  return REGION_BLUEPRINTS.map((blueprint, index) => {
    const loreZone = loreZoneAt(index)
    return {
      ...blueprint,
      zoneId: loreZone.id,
      name: loreZone.name,
      theme: loreZone.theme,
    }
  })
}

export function zoneRegionById(zoneId: string): ZoneRegion {
  return zoneRegions().find((zone) => zone.zoneId === zoneId) ?? zoneRegions()[0]
}

export function nextWaystoneZoneId(zoneId: string): string {
  const regions = zoneRegions()
  const index = regions.findIndex((zone) => zone.zoneId === zoneId)
  if (index === -1) return regions[0].zoneId
  return regions[(index + 1) % regions.length].zoneId
}

export function waystoneArrivalTile(zoneId: string): TilePoint {
  return zoneRegionById(zoneId).waystoneArrival
}

export function waystoneArrivalWorld(zoneId: string): { x: number; y: number } {
  const arrival = waystoneArrivalTile(zoneId)
  return {
    x: arrival.col * TILE + TILE / 2,
    y: arrival.row * TILE + TILE / 2,
  }
}

export function zoneLoreById(zoneId: string): LoreZone {
  return LORE_ZONES.find((zone) => zone.id === zoneId) ?? loreZoneAt(0)
}

export function zoneAtTile(col: number, row: number): ZoneRegion {
  return (
    zoneRegions().find(
      (zone) =>
        col >= zone.minCol &&
        col <= zone.maxCol &&
        row >= zone.minRow &&
        row <= zone.maxRow,
    ) ?? zoneRegions()[0]
  )
}

export function zoneAtWorld(x: number, y: number): ZoneRegion {
  return zoneAtTile(Math.floor(x / TILE), Math.floor(y / TILE))
}
