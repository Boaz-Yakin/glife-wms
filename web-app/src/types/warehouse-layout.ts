export interface ZoneStructureConfig {
  zoneType: 'A' | 'F' | 'S'
  aisles: number // Number of aisles (e.g., 1)
  bays: number   // Number of bays per aisle (e.g., 10)
  levels: number // Number of tiers/levels (e.g., 3 -> A, B, C; for S: 1 -> A)
  bins: number   // Number of bins per level (e.g., 2 -> 01, 02; for S: 1 -> 01)
}

export interface WarehouseStructureConfig {
  zoneA: ZoneStructureConfig
  zoneF: ZoneStructureConfig
  zoneS: ZoneStructureConfig
}

export const DEFAULT_WAREHOUSE_CONFIG: WarehouseStructureConfig = {
  zoneA: {
    zoneType: 'A',
    aisles: 1,
    bays: 10,
    levels: 2,
    bins: 2,
  },
  zoneF: {
    zoneType: 'F',
    aisles: 1,
    bays: 10,
    levels: 2,
    bins: 2,
  },
  zoneS: {
    zoneType: 'S',
    aisles: 1,
    bays: 10,
    levels: 1,
    bins: 1,
  },
}

const LEVEL_LETTERS = ['A', 'B', 'C', 'D']

/**
 * Generate location code list based on structure config
 */
export function generateLocationCodes(config: WarehouseStructureConfig) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const locations: Array<{ code: string; zone_type: 'A' | 'F' }> = []

  const zones: ZoneStructureConfig[] = [
    config.zoneA,
    config.zoneF,
    config.zoneS || { zoneType: 'S', aisles: 1, bays: 10, levels: 1, bins: 1 },
  ]

  for (const z of zones) {
    const validLevels = LEVEL_LETTERS.slice(0, Math.min(4, Math.max(1, z.levels)))
    for (let aisle = 1; aisle <= Math.max(1, z.aisles); aisle++) {
      for (let bay = 1; bay <= Math.max(1, z.bays); bay++) {
        for (const level of validLevels) {
          for (let bin = 1; bin <= Math.max(1, z.bins); bin++) {
            // Note: PostgreSQL locations table zone_type enum is ('A', 'F').
            // Zone S (Staging Floor) maps to 'A' (Ambient) in the DB enum.
            const dbZoneType: 'A' | 'F' = z.zoneType === 'F' ? 'F' : 'A'
            locations.push({
              code: `LOC-${z.zoneType}${pad(aisle)}${pad(bay)}${level}${pad(bin)}`,
              zone_type: dbZoneType,
            })
          }
        }
      }
    }
  }

  return locations
}
