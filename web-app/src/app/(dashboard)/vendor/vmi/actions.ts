"use server"

import {
  getVendorVmiStock,
  getVendorAsnList,
  createVendorAsnAction,
} from "@/services/vendor-vmi.service"

export async function fetchVmiStockAction(partnerId?: string) {
  return await getVendorVmiStock(partnerId)
}

export async function fetchAsnListAction(partnerId?: string) {
  return await getVendorAsnList(partnerId)
}

export async function submitAsnServerAction(params: {
  partnerId: string
  expectedDeliveryDate: string
  carrierName?: string
  trackingNumber?: string
  note?: string
  items: Array<{
    itemId: string
    expectedQty: number
    lotNo?: string
    expirationDate?: string
  }>
}) {
  return await createVendorAsnAction(params)
}
