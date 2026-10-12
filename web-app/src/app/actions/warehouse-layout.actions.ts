'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function seedStandardWarehouseLocationsAction() {
  try {
    const supabase = createAdminClient()

    // 1. Check if locations already exist
    const { count: existingCount, error: countErr } = await (supabase as any)
      .from('locations')
      .select('*', { count: 'exact', head: true })

    if (countErr) {
      console.error('Error checking existing locations:', countErr)
      return { success: false, error: countErr.message }
    }

    if (existingCount && existingCount > 0) {
      return {
        success: true,
        count: existingCount,
        message: `Warehouse already has ${existingCount} locations configured.`,
      }
    }

    // 2. Generate standard locations
    // Code regex constraint: ^LOC-[A-Z][0-9]{2}[0-9]{2}[A-D][0-9]{2}$
    const pad = (n: number) => String(n).padStart(2, '0')
    const levels = ['A', 'B', 'C', 'D']
    const bins = ['01', '02']

    const locationsToInsert: Array<{
      code: string
      zone_type: 'A' | 'F'
    }> = []

    // Zone A: 3 Aisles, 3 Bays each, 4 Levels, 2 Bins = 72 locations
    for (let aisle = 1; aisle <= 3; aisle++) {
      for (let bay = 1; bay <= 3; bay++) {
        for (const level of levels) {
          for (const bin of bins) {
            locationsToInsert.push({
              code: `LOC-A${pad(aisle)}${pad(bay)}${level}${bin}`,
              zone_type: 'A',
            })
          }
        }
      }
    }

    // Zone F (Cold Storage): 1 Aisle, 2 Bays, 4 Levels, 2 Bins = 16 locations
    for (let bay = 1; bay <= 2; bay++) {
      for (const level of levels) {
        for (const bin of bins) {
          locationsToInsert.push({
            code: `LOC-F01${pad(bay)}${level}${bin}`,
            zone_type: 'F',
          })
        }
      }
    }

    const { data: insertedLocations, error: insertLocErr } = await (supabase as any)
      .from('locations')
      .insert(locationsToInsert)
      .select('id, code, zone_type')

    if (insertLocErr) {
      console.error('Error inserting locations:', insertLocErr)
      return { success: false, error: insertLocErr.message }
    }

    // 3. Seed sample inventory from existing items to bring the layout map alive
    const { data: existingItems } = await (supabase as any)
      .from('items')
      .select('id, sku, zone_type')
      .limit(16)

    if (existingItems && existingItems.length > 0 && insertedLocations) {
      const locMap = new Map<string, string>()
      insertedLocations.forEach((loc: any) => {
        locMap.set(loc.code, loc.id)
      })

      // Get first active client if available
      const { data: clients } = await (supabase as any)
        .from('clients')
        .select('id')
        .limit(1)
      const clientId = clients?.[0]?.id || null

      const inventoryToInsert: Array<{
        item_id: string
        location_id: string
        on_hand_qty: number
        allocated_qty: number
        client_id?: string | null
      }> = []

      // Distribute items across select rack locations
      const sampleAssignments = [
        { code: 'LOC-A0101A01', qty: 45, itemIdx: 0 },
        { code: 'LOC-A0101A02', qty: 30, itemIdx: 1 },
        { code: 'LOC-A0101B01', qty: 25, itemIdx: 2 },
        { code: 'LOC-A0101B02', qty: 50, itemIdx: 3 },
        { code: 'LOC-A0101C01', qty: 80, itemIdx: 4 },
        { code: 'LOC-A0101D01', qty: 60, itemIdx: 5 },
        // A0102: Moderate load
        { code: 'LOC-A0102A01', qty: 35, itemIdx: 6 },
        { code: 'LOC-A0102B01', qty: 40, itemIdx: 7 },
        { code: 'LOC-A0102C02', qty: 20, itemIdx: 8 },
        // A0201: Light load
        { code: 'LOC-A0201A01', qty: 15, itemIdx: 9 },
        // Zone F Cold Storage
        { code: 'LOC-F0101A01', qty: 55, itemIdx: 10 },
        { code: 'LOC-F0101B01', qty: 40, itemIdx: 11 },
      ]

      for (const assign of sampleAssignments) {
        const locId = locMap.get(assign.code)
        const item = existingItems[assign.itemIdx % existingItems.length]
        if (locId && item) {
          inventoryToInsert.push({
            item_id: item.id,
            location_id: locId,
            on_hand_qty: assign.qty,
            allocated_qty: 0,
            ...(clientId ? { client_id: clientId } : {}),
          })
        }
      }

      if (inventoryToInsert.length > 0) {
        await (supabase as any)
          .from('inventory')
          .upsert(inventoryToInsert, { onConflict: 'item_id,location_id' })
      }
    }

    revalidatePath('/dashboard')
    return {
      success: true,
      count: locationsToInsert.length,
      message: `Successfully seeded ${locationsToInsert.length} standard warehouse locations.`,
    }
  } catch (err: any) {
    console.error('seedStandardWarehouseLocationsAction exception:', err)
    return { success: false, error: err.message || 'Unknown error occurred.' }
  }
}
