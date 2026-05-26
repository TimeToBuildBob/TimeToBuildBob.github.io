import { describe, expect, it } from 'vitest'

import { isSolid, generateMap } from './map'
import {
  nextWaystoneZoneId,
  waystoneArrivalTile,
  zoneRegions,
} from './zones'

describe('waystone travel helpers', () => {
  it('cycles waystone destinations through every region', () => {
    const zones = zoneRegions()
    expect(nextWaystoneZoneId(zones[0].zoneId)).toBe(zones[1].zoneId)
    expect(nextWaystoneZoneId(zones[1].zoneId)).toBe(zones[2].zoneId)
    expect(nextWaystoneZoneId(zones[2].zoneId)).toBe(zones[0].zoneId)
  })

  it('lands every waystone arrival on a walkable tile', () => {
    const map = generateMap()

    for (const zone of zoneRegions()) {
      const arrival = waystoneArrivalTile(zone.zoneId)
      expect(isSolid(map[arrival.row][arrival.col])).toBe(false)
    }
  })
})
