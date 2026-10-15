export interface PricingItem {
  uom?: string | null
  unit_price?: number | null
  box_price?: number | null
  pack_price?: number | null
}

export interface PricingOrderItem {
  uom?: string | null
  price?: number | null
  item?: PricingItem | null
}

/**
 * Calculates the effective price for an item based on its UOM:
 * - BOX: uses item.box_price (fallback: item.unit_price)
 * - PACK: uses item.pack_price || item.box_price (fallback: item.unit_price)
 * - EA: uses item.unit_price
 */
export function getItemEffectivePrice(item: PricingItem): number {
  const uom = (item.uom || '').trim().toUpperCase()

  if (uom === 'BOX') {
    const boxPrice = Number(item.box_price ?? 0)
    if (boxPrice > 0) return boxPrice
  } else if (uom === 'PACK') {
    const packPrice = Number(item.pack_price ?? 0) || Number(item.box_price ?? 0)
    if (packPrice > 0) return packPrice
  } else if (uom === 'EA') {
    const unitPrice = Number(item.unit_price ?? 0)
    if (unitPrice > 0) return unitPrice
  }

  // Fallback
  if (item.unit_price && Number(item.unit_price) > 0) {
    return Number(item.unit_price)
  }
  return Number(item.box_price || item.pack_price || 0)
}

/**
 * Calculates the effective unit price for an order line item based on its UOM:
 * 1. Prioritizes the order line's selected UOM (orderItem.uom), falling back to master item UOM.
 * 2. Matches the UOM with the corresponding master price:
 *    - BOX: uses item.box_price
 *    - PACK: uses item.pack_price || item.box_price
 *    - EA: uses item.unit_price
 * 3. Fallback:
 *    - If master item does not have a price (> 0) for the selected UOM, uses orderItem.price (transaction snapshot)
 *    - Otherwise, falls back to item.unit_price or item.box_price / item.pack_price
 */
export function getOrderItemEffectivePrice(orderItem: PricingOrderItem): number {
  const itemData = orderItem.item
  const uom = (orderItem.uom || itemData?.uom || '').trim().toUpperCase()

  if (uom === 'BOX') {
    const boxPrice = Number(itemData?.box_price ?? 0)
    if (boxPrice > 0) return boxPrice
  } else if (uom === 'PACK') {
    const packPrice = Number(itemData?.pack_price ?? 0) || Number(itemData?.box_price ?? 0)
    if (packPrice > 0) return packPrice
  } else if (uom === 'EA') {
    const unitPrice = Number(itemData?.unit_price ?? 0)
    if (unitPrice > 0) return unitPrice
  }

  // Fallback: If master item doesn't have a specific price for this UOM,
  // use the transaction price recorded on the order item itself
  if (orderItem.price && Number(orderItem.price) > 0) {
    return Number(orderItem.price)
  }

  // Fallback if specific UOM price wasn't matched or is 0
  if (itemData?.unit_price && Number(itemData.unit_price) > 0) {
    return Number(itemData.unit_price)
  }
  return Number(itemData?.box_price || itemData?.pack_price || 0)
}

