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
 * - BOX: uses item.box_price (fallback: item.unit_price)
 * - PACK: uses item.pack_price || item.box_price (fallback: item.unit_price)
 * - EA: uses item.unit_price (fallback: orderItem.price)
 */
export function getOrderItemEffectivePrice(orderItem: PricingOrderItem): number {
  const itemData = orderItem.item
  const uom = (itemData?.uom || orderItem.uom || '').trim().toUpperCase()

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

  // Fallback if specific UOM price wasn't matched or is 0
  if (itemData?.unit_price && Number(itemData.unit_price) > 0) {
    return Number(itemData.unit_price)
  }
  return Number(orderItem.price || 0)
}
