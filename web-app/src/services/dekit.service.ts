import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ItemConversionInfo {
  parentItemId: string
  parentSku: string
  parentName: string
  childItemId: string
  childSku: string
  childName: string
  flavour: string
  conversionRatio: number
  targetLocationCode: string
}

export interface DekitResult {
  success: boolean
  parentSku?: string
  childSku?: string
  parentDeducted?: number
  childAdded?: number
  targetLocation?: string
  error?: string
}

const TARGET_LOCATION_CODE = 'LOC-S0105A01'
const DEFAULT_CONVERSION_RATIO = 5

function normalizeFlavour(str: string | null | undefined): string {
  if (!str) return ''
  const clean = str.trim().toLowerCase()
  if (clean.includes('habanero')) return 'habanero'
  if (clean.includes('cream carbonara')) return 'cream carbonara'
  if (clean.includes('carbonara')) return 'carbonara'
  if (clean.includes('2x spicy') || clean.includes('2xspicy')) return '2x spicy'
  if (clean.includes('cheese')) return 'cheese'
  if (clean.includes('rose') || clean.includes('rosé')) return 'rose'
  if (clean.includes('quatro') || clean.includes('quattro')) return 'quatro'
  if (clean.includes('original')) return 'original'
  return clean
}

/**
 * Fetch or build flavor-matched Multi <-> Single conversions map
 */
export async function getBuldakConversionMap(): Promise<{
  parentToChild: Map<string, ItemConversionInfo>
  childToParent: Map<string, ItemConversionInfo>
}> {
  const supabase = createAdminClient()

  // 1. First attempt to read from item_conversions table if available
  const { data: convData, error: convErr } = await (supabase as any)
    .from('item_conversions')
    .select(`
      parent_item_id,
      child_item_id,
      conversion_ratio,
      parent:parent_item_id ( id, sku, name_en, desc_en ),
      child:child_item_id ( id, sku, name_en, desc_en )
    `)

  const parentToChild = new Map<string, ItemConversionInfo>()
  const childToParent = new Map<string, ItemConversionInfo>()

  if (!convErr && convData && convData.length > 0) {
    for (const row of convData) {
      const p = row.parent
      const c = row.child
      if (!p || !c) continue

      const info: ItemConversionInfo = {
        parentItemId: p.id,
        parentSku: p.sku,
        parentName: p.name_en,
        childItemId: c.id,
        childSku: c.sku,
        childName: c.name_en,
        flavour: c.desc_en || p.desc_en || '',
        conversionRatio: row.conversion_ratio || DEFAULT_CONVERSION_RATIO,
        targetLocationCode: TARGET_LOCATION_CODE,
      }
      parentToChild.set(p.id, info)
      childToParent.set(c.id, info)
    }
    return { parentToChild, childToParent }
  }

  // 2. Fallback: dynamically match items by flavour desc_en
  const { data: buldakItems, error: itemsErr } = await (supabase as any)
    .from('items')
    .select('id, sku, name_en, desc_en')
    .ilike('name_en', '%buldak%')

  if (itemsErr || !buldakItems) {
    return { parentToChild, childToParent }
  }

  const multiItems: Array<{ id: string; sku: string; name_en: string; desc_en: string | null; flavourKey: string }> = []
  const singleItems: Array<{ id: string; sku: string; name_en: string; desc_en: string | null; flavourKey: string }> = []

  for (const it of buldakItems) {
    const nameLower = (it.name_en || '').toLowerCase()
    const flavourKey = normalizeFlavour(it.desc_en)
    if (nameLower.includes('multi')) {
      multiItems.push({ ...it, flavourKey })
    } else if (nameLower.includes('single')) {
      singleItems.push({ ...it, flavourKey })
    }
  }

  for (const multi of multiItems) {
    const matchedSingle = singleItems.find(
      s => s.flavourKey === multi.flavourKey || (multi.flavourKey === 'habanero' && s.flavourKey.includes('habanero'))
    )
    if (matchedSingle) {
      const info: ItemConversionInfo = {
        parentItemId: multi.id,
        parentSku: multi.sku,
        parentName: multi.name_en,
        childItemId: matchedSingle.id,
        childSku: matchedSingle.sku,
        childName: matchedSingle.name_en,
        flavour: matchedSingle.desc_en || multi.desc_en || '',
        conversionRatio: DEFAULT_CONVERSION_RATIO,
        targetLocationCode: TARGET_LOCATION_CODE,
      }
      parentToChild.set(multi.id, info)
      childToParent.set(matchedSingle.id, info)
    }
  }

  return { parentToChild, childToParent }
}

/**
 * Execute Manual De-kitting (방법 1)
 * Multi Npk -> Single (N*5 EA) into LOC-S0105A01
 */
export async function executeManualDekit({
  parentItemId,
  parentQty,
  operatorId,
  fromLocationId,
}: {
  parentItemId: string
  parentQty: number
  operatorId?: string
  fromLocationId?: string
}): Promise<DekitResult> {
  if (parentQty <= 0) {
    return { success: false, error: 'Quantity must be greater than zero.' }
  }

  const supabase = createAdminClient()

  // 1. Try RPC first if migration is active
  try {
    const { data: rpcData, error: rpcErr } = await (supabase as any).rpc('dekit_multi_to_single', {
      p_parent_item_id: parentItemId,
      p_parent_qty: parentQty,
      p_operator_id: operatorId || null,
      p_from_location_id: fromLocationId || null,
    })

    if (!rpcErr && rpcData) {
      if (typeof rpcData === 'object' && rpcData.success) {
        return {
          success: true,
          parentSku: rpcData.parent_sku,
          childSku: rpcData.child_sku,
          parentDeducted: rpcData.parent_deducted,
          childAdded: rpcData.child_added,
          targetLocation: rpcData.target_location,
        }
      }
      if (typeof rpcData === 'object' && rpcData.error) {
        return { success: false, error: rpcData.error }
      }
    }
  } catch {
    // Fall back to direct application-level execution
  }

  // 2. Fallback: application-level de-kitting logic
  const { parentToChild } = await getBuldakConversionMap()
  const conv = parentToChild.get(parentItemId)
  if (!conv) {
    return { success: false, error: 'No de-kitting conversion found for this Multi item.' }
  }

  // Find target location LOC-S0105A01
  const { data: targetLoc, error: locErr } = await (supabase as any)
    .from('locations')
    .select('id, code')
    .eq('code', TARGET_LOCATION_CODE)
    .single()

  if (locErr || !targetLoc) {
    return { success: false, error: `Target location ${TARGET_LOCATION_CODE} not found.` }
  }

  // Check parent available stock
  let invQuery = (supabase as any)
    .from('inventory')
    .select('id, location_id, on_hand_qty, allocated_qty, client_id')
    .eq('item_id', parentItemId)

  if (fromLocationId) {
    invQuery = invQuery.eq('location_id', fromLocationId)
  }

  const { data: parentInvs, error: pInvErr } = await invQuery
  if (pInvErr || !parentInvs || parentInvs.length === 0) {
    return { success: false, error: 'No inventory found for this parent item.' }
  }

  const totalAvail = parentInvs.reduce(
    (acc: number, row: any) => acc + Math.max(0, (row.on_hand_qty || 0) - (row.allocated_qty || 0)),
    0
  )

  if (totalAvail < parentQty) {
    return {
      success: false,
      error: `Insufficient available Multi stock. Available: ${totalAvail}, Requested: ${parentQty}`,
    }
  }

  // Deduct parent inventory across slots
  let remainingToDeduct = parentQty
  let clientId = parentInvs[0]?.client_id || null

  for (const slot of parentInvs) {
    const slotAvail = Math.max(0, (slot.on_hand_qty || 0) - (slot.allocated_qty || 0))
    if (slotAvail <= 0) continue

    const deductHere = Math.min(remainingToDeduct, slotAvail)
    const newQty = slot.on_hand_qty - deductHere

    await (supabase as any)
      .from('inventory')
      .update({ on_hand_qty: newQty, updated_at: new Date().toISOString() })
      .eq('id', slot.id)

    // Log parent adjustment
    await (supabase as any).from('inventory_adjustments').insert({
      inventory_id: slot.id,
      adjusted_by: operatorId || null,
      previous_qty: slot.on_hand_qty,
      new_qty: newQty,
      reason: `DE-KITTING: Converted ${deductHere}x ${conv.parentSku} to ${conv.childSku}`,
    })

    remainingToDeduct -= deductHere
    if (remainingToDeduct <= 0) break
  }

  // Add child inventory at target location (LOC-S0105A01)
  const childAddedQty = parentQty * conv.conversionRatio

  const { data: existingChildInv } = await (supabase as any)
    .from('inventory')
    .select('id, on_hand_qty')
    .eq('item_id', conv.childItemId)
    .eq('location_id', targetLoc.id)
    .single()

  let childInvId: string
  if (existingChildInv) {
    const prev = existingChildInv.on_hand_qty || 0
    const next = prev + childAddedQty
    await (supabase as any)
      .from('inventory')
      .update({ on_hand_qty: next, updated_at: new Date().toISOString() })
      .eq('id', existingChildInv.id)
    childInvId = existingChildInv.id

    await (supabase as any).from('inventory_adjustments').insert({
      inventory_id: childInvId,
      adjusted_by: operatorId || null,
      previous_qty: prev,
      new_qty: next,
      reason: `DE-KITTING: Produced +${childAddedQty}x ${conv.childSku} from ${conv.parentSku}`,
    })
  } else {
    const { data: newChildInv } = await (supabase as any)
      .from('inventory')
      .insert({
        item_id: conv.childItemId,
        location_id: targetLoc.id,
        client_id: clientId,
        on_hand_qty: childAddedQty,
        allocated_qty: 0,
      })
      .select('id')
      .single()

    childInvId = newChildInv?.id

    if (childInvId) {
      await (supabase as any).from('inventory_adjustments').insert({
        inventory_id: childInvId,
        adjusted_by: operatorId || null,
        previous_qty: 0,
        new_qty: childAddedQty,
        reason: `DE-KITTING: Produced +${childAddedQty}x ${conv.childSku} from ${conv.parentSku}`,
      })
    }
  }

  return {
    success: true,
    parentSku: conv.parentSku,
    childSku: conv.childSku,
    parentDeducted: parentQty,
    childAdded: childAddedQty,
    targetLocation: TARGET_LOCATION_CODE,
  }
}
