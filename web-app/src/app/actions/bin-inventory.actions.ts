'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveClientAction } from './client.actions'

export interface AssignableItem {
  id: string
  sku: string
  name_en: string
  category: string | null
  uom: string
  unit_price: number
}

/**
 * Search items for bin assignment
 */
export async function searchAssignableItemsAction(query: string = ''): Promise<{
  success: boolean
  items: AssignableItem[]
  error?: string
}> {
  try {
    const supabase = createAdminClient()
    const activeClientId = await getActiveClientAction()

    let dbQuery = (supabase as any)
      .from('items')
      .select('id, sku, name_en, category, uom, unit_price')
      .order('sku', { ascending: true })
      .limit(30)

    if (activeClientId) {
      dbQuery = dbQuery.eq('client_id', activeClientId)
    }

    if (query.trim()) {
      const q = query.trim()
      dbQuery = dbQuery.or(`sku.ilike.%${q}%,name_en.ilike.%${q}%`)
    }

    const { data, error } = await dbQuery

    if (error) {
      console.error('searchAssignableItemsAction error:', error)
      return { success: false, items: [], error: error.message }
    }

    const items: AssignableItem[] = (data || []).map((it: any) => ({
      id: it.id,
      sku: it.sku,
      name_en: it.name_en,
      category: it.category || null,
      uom: it.uom || 'EA',
      unit_price: Number(it.unit_price || 0),
    }))

    return { success: true, items }
  } catch (err: any) {
    console.error('searchAssignableItemsAction exception:', err)
    return { success: false, items: [], error: err.message || 'Unknown error' }
  }
}

export interface AssignItemToBinParams {
  locationCode: string
  itemId: string
  qty: number
  replaceExisting?: boolean // If true, removes existing items in this bin first
}

/**
 * Directly assign or update item stock in a specific warehouse bin
 */
export async function assignItemToBinAction(params: AssignItemToBinParams): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const { locationCode, itemId, qty, replaceExisting = true } = params
    const supabase = createAdminClient()
    const activeClientId = await getActiveClientAction()

    if (!locationCode) return { success: false, error: 'Location code is required.' }
    if (!itemId) return { success: false, error: 'Item ID is required.' }
    if (qty < 0) return { success: false, error: 'Quantity cannot be negative.' }

    // 1. Find location id by code
    const { data: loc, error: locErr } = await (supabase as any)
      .from('locations')
      .select('id, code')
      .eq('code', locationCode)
      .single()

    if (locErr || !loc) {
      return { success: false, error: `Location not found: ${locationCode}` }
    }

    // 2. If qty is 0, delete inventory for this item at this location
    if (qty === 0) {
      await (supabase as any)
        .from('inventory')
        .delete()
        .eq('location_id', loc.id)
        .eq('item_id', itemId)

      revalidatePath('/dashboard')
      revalidatePath('/master/locations')
      revalidatePath('/inventory')

      return {
        success: true,
        message: `Cleared item from bin ${locationCode}.`,
      }
    }

    // 3. If replaceExisting is true, clear any other items stored in this bin
    if (replaceExisting) {
      await (supabase as any)
        .from('inventory')
        .delete()
        .eq('location_id', loc.id)
        .neq('item_id', itemId)
    }

    // 4. Upsert inventory record
    const inventoryData: any = {
      item_id: itemId,
      location_id: loc.id,
      on_hand_qty: qty,
      allocated_qty: 0,
    }

    if (activeClientId) {
      inventoryData.client_id = activeClientId
    }

    const { error: upsertErr } = await (supabase as any)
      .from('inventory')
      .upsert(inventoryData, { onConflict: 'item_id,location_id' })

    if (upsertErr) {
      console.error('assignItemToBinAction upsert error:', upsertErr)
      return { success: false, error: upsertErr.message }
    }

    revalidatePath('/dashboard')
    revalidatePath('/master/locations')
    revalidatePath('/inventory')

    return {
      success: true,
      message: `Successfully allocated ${qty} units to ${locationCode}.`,
    }
  } catch (err: any) {
    console.error('assignItemToBinAction exception:', err)
    return { success: false, error: err.message || 'Unknown error' }
  }
}

/**
 * Clear all inventory in a specific bin
 */
export async function clearBinInventoryAction(locationCode: string): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    const { data: loc, error: locErr } = await (supabase as any)
      .from('locations')
      .select('id')
      .eq('code', locationCode)
      .single()

    if (locErr || !loc) {
      return { success: false, error: `Location not found: ${locationCode}` }
    }

    const { error: delErr } = await (supabase as any)
      .from('inventory')
      .delete()
      .eq('location_id', loc.id)

    if (delErr) {
      return { success: false, error: delErr.message }
    }

    revalidatePath('/dashboard')
    revalidatePath('/master/locations')
    revalidatePath('/inventory')

    return {
      success: true,
      message: `Cleared all inventory from ${locationCode}.`,
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' }
  }
}
