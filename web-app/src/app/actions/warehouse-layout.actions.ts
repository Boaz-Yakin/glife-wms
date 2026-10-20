'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

import {
  type WarehouseStructureConfig,
  DEFAULT_WAREHOUSE_CONFIG,
  generateLocationCodes,
} from '@/types/warehouse-layout'


/**
 * Get current warehouse layout configuration by analyzing existing locations in Supabase
 */
export async function getWarehouseStructureConfigAction(): Promise<{
  success: boolean
  config: WarehouseStructureConfig
  totalLocations: number
  error?: string
}> {
  try {
    const supabase = createAdminClient()
    const { data: locRows, error } = await (supabase as any)
      .from('locations')
      .select('code, zone_type')

    if (error) {
      return {
        success: false,
        config: DEFAULT_WAREHOUSE_CONFIG,
        totalLocations: 0,
        error: error.message,
      }
    }

    if (!locRows || locRows.length === 0) {
      return {
        success: true,
        config: DEFAULT_WAREHOUSE_CONFIG,
        totalLocations: 0,
      }
    }

    // Inspect existing codes
    let maxAisleA = 1, maxBayA = 1, maxBinA = 1
    const levelsA = new Set<string>()
    let maxAisleF = 1, maxBayF = 1, maxBinF = 1
    const levelsF = new Set<string>()

    for (const loc of locRows) {
      const match = (loc.code || '').match(/^LOC-([A-Z])([0-9]{2})([0-9]{2})([A-D])([0-9]{2})$/)
      if (match) {
        const zone = match[1]
        const aisle = parseInt(match[2], 10)
        const bay = parseInt(match[3], 10)
        const level = match[4]
        const bin = parseInt(match[5], 10)

        if (zone === 'A') {
          if (aisle > maxAisleA) maxAisleA = aisle
          if (bay > maxBayA) maxBayA = bay
          if (bin > maxBinA) maxBinA = bin
          levelsA.add(level)
        } else if (zone === 'F') {
          if (aisle > maxAisleF) maxAisleF = aisle
          if (bay > maxBayF) maxBayF = bay
          if (bin > maxBinF) maxBinF = bin
          levelsF.add(level)
        }
      }
    }

    const detectedConfig: WarehouseStructureConfig = {
      zoneA: {
        zoneType: 'A',
        aisles: maxAisleA || 1,
        bays: maxBayA || 10,
        levels: levelsA.size > 0 ? levelsA.size : 3,
        bins: maxBinA || 2,
      },
      zoneF: {
        zoneType: 'F',
        aisles: maxAisleF || 1,
        bays: maxBayF || 10,
        levels: levelsF.size > 0 ? levelsF.size : 3,
        bins: maxBinF || 2,
      },
    }

    return {
      success: true,
      config: detectedConfig,
      totalLocations: locRows.length,
    }
  } catch (err: any) {
    return {
      success: false,
      config: DEFAULT_WAREHOUSE_CONFIG,
      totalLocations: 0,
      error: err.message,
    }
  }
}

/**
 * Apply new warehouse structure configuration:
 * Updates the database locations table to match the configured Zone, Aisles, Bays, Levels, and Bins.
 * Safely preserves existing inventory by re-assigning to valid active locations.
 */
export async function applyWarehouseStructureAction(
  config: WarehouseStructureConfig,
  reseedSampleInventory: boolean = true
) {
  try {
    const supabase = createAdminClient()

    // 1. Generate target location codes
    const targetLocations = generateLocationCodes(config)
    const targetCodeSet = new Set(targetLocations.map((l) => l.code))

    // 2. Fetch existing locations and inventory
    const { data: existingLocs, error: fetchLocErr } = await (supabase as any)
      .from('locations')
      .select('id, code, zone_type')

    if (fetchLocErr) {
      return { success: false, error: fetchLocErr.message }
    }

    const existingLocMap = new Map<string, string>() // code -> id
    const existingIdMap = new Map<string, string>() // id -> code
    ;(existingLocs || []).forEach((l: any) => {
      existingLocMap.set(l.code, l.id)
      existingIdMap.set(l.id, l.code)
    })

    // 3. Determine additions and removals
    const locationsToInsert = targetLocations.filter((l) => !existingLocMap.has(l.code))
    const locationsToRemove = (existingLocs || []).filter((l: any) => !targetCodeSet.has(l.code))

    // 4. Insert new locations first
    let newInsertedLocs: any[] = []
    if (locationsToInsert.length > 0) {
      // Insert in chunks of 100 to avoid payload size issues
      const chunkSize = 100
      for (let i = 0; i < locationsToInsert.length; i += chunkSize) {
        const chunk = locationsToInsert.slice(i, i + chunkSize)
        const { data: inserted, error: insertErr } = await (supabase as any)
          .from('locations')
          .insert(chunk)
          .select('id, code, zone_type')

        if (insertErr) {
          console.error('Error inserting locations chunk:', insertErr)
          return { success: false, error: insertErr.message }
        }
        if (inserted) {
          newInsertedLocs = newInsertedLocs.concat(inserted)
          inserted.forEach((l: any) => {
            existingLocMap.set(l.code, l.id)
            existingIdMap.set(l.id, l.code)
          })
        }
      }
    }

    // 5. Check if any existing inventory needs migration from deprecated locations
    const { data: currentInvs } = await (supabase as any)
      .from('inventory')
      .select('id, item_id, location_id, on_hand_qty, allocated_qty')

    if (currentInvs && currentInvs.length > 0) {
      const validLocationIds = new Set(Array.from(existingLocMap.entries())
        .filter(([code]) => targetCodeSet.has(code))
        .map(([, id]) => id))

      // Fallback target: first available valid location in Zone A / Zone F
      const firstValidLocA = targetLocations.find((l) => l.zone_type === 'A')
      const firstValidLocIdA = firstValidLocA ? existingLocMap.get(firstValidLocA.code) : null
      const firstValidLocF = targetLocations.find((l) => l.zone_type === 'F')
      const firstValidLocIdF = firstValidLocF ? existingLocMap.get(firstValidLocF.code) : null

      for (const inv of currentInvs) {
        if (!validLocationIds.has(inv.location_id)) {
          // Re-route orphan inventory to a valid location in the new structure
          const oldCode = existingIdMap.get(inv.location_id) || ''
          const isF = oldCode.startsWith('LOC-F')
          const targetLocId = (isF ? firstValidLocIdF : firstValidLocIdA) || Array.from(validLocationIds)[0]

          if (targetLocId) {
            await (supabase as any)
              .from('inventory')
              .update({ location_id: targetLocId })
              .eq('id', inv.id)
          }
        }
      }
    }

    // 6. Safely delete obsolete locations
    if (locationsToRemove.length > 0) {
      const removeIds = locationsToRemove.map((l: any) => l.id)
      const { error: delErr } = await (supabase as any)
        .from('locations')
        .delete()
        .in('id', removeIds)

      if (delErr) {
        console.warn('Warning when deleting obsolete locations:', delErr.message)
      }
    }

    // 7. Reseed balanced sample inventory if requested, or clear all inventory to reset to empty warehouse
    if (reseedSampleInventory) {
      const { data: items } = await (supabase as any)
        .from('items')
        .select('id, sku')
        .limit(16)

      if (items && items.length > 0) {
        // Distribute items across the newly configured bays
        const sampleAssignments = [
          { code: 'LOC-A0101A01', qty: 45, itemIdx: 0 },
          { code: 'LOC-A0101A02', qty: 30, itemIdx: 1 },
          { code: 'LOC-A0102A01', qty: 25, itemIdx: 2 },
          { code: 'LOC-A0103B01', qty: 50, itemIdx: 3 },
          { code: 'LOC-A0104A01', qty: 80, itemIdx: 4 },
          { code: 'LOC-A0105B02', qty: 60, itemIdx: 5 },
          { code: 'LOC-A0106A01', qty: 35, itemIdx: 6 },
          { code: 'LOC-A0107C01', qty: 40, itemIdx: 7 },
          { code: 'LOC-A0108A02', qty: 20, itemIdx: 8 },
          { code: 'LOC-A0110A01', qty: 15, itemIdx: 9 },
          { code: 'LOC-F0101A01', qty: 55, itemIdx: 10 },
          { code: 'LOC-F0102B01', qty: 40, itemIdx: 11 },
          { code: 'LOC-F0105A01', qty: 28, itemIdx: 12 },
          { code: 'LOC-F0110A01', qty: 35, itemIdx: 13 },
        ]

        const inventoryToUpsert: any[] = []
        for (const assign of sampleAssignments) {
          const locId = existingLocMap.get(assign.code)
          const item = items[assign.itemIdx % items.length]
          if (locId && item) {
            inventoryToUpsert.push({
              item_id: item.id,
              location_id: locId,
              on_hand_qty: assign.qty,
              allocated_qty: 0,
            })
          }
        }

        if (inventoryToUpsert.length > 0) {
          await (supabase as any)
            .from('inventory')
            .upsert(inventoryToUpsert, { onConflict: 'item_id,location_id' })
        }
      }
    } else {
      // When unchecked, clear all inventory to reset all racks to empty
      const { error: clearInvErr } = await (supabase as any)
        .from('inventory')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (clearInvErr) {
        console.error('Error clearing inventory:', clearInvErr)
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/master/locations')
    revalidatePath('/inventory')

    const invMsg = reseedSampleInventory
      ? 'Sample inventory distributed across bays.'
      : 'All inventory cleared (all racks reset to empty).'

    return {
      success: true,
      totalLocations: targetLocations.length,
      insertedCount: locationsToInsert.length,
      removedCount: locationsToRemove.length,
      message: `Successfully updated warehouse layout: ${targetLocations.length} locations configured. ${invMsg}`,
    }
  } catch (err: any) {
    console.error('applyWarehouseStructureAction exception:', err)
    return { success: false, error: err.message || 'Unknown error occurred.' }
  }
}

/**
 * Legacy compatibility alias
 */
export async function seedStandardWarehouseLocationsAction() {
  return applyWarehouseStructureAction(DEFAULT_WAREHOUSE_CONFIG, true)
}
