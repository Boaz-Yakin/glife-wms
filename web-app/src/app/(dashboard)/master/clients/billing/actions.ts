"use server"

import {
  saveClientBillingContract,
  triggerDailySettlementCalculationAction,
  generateClientInvoiceCsv,
  getClientMonthlySettlement,
} from "@/services/three-pl-billing.service"

export async function saveClientContractAction(formData: FormData) {
  const clientId = formData.get("client_id") as string
  const dailyPallet = parseFloat(formData.get("daily_pallet_storage_fee") as string) || 800
  const dailyChilled = parseFloat(formData.get("daily_chilled_pallet_fee") as string) || 1500
  const dailyCbm = parseFloat(formData.get("daily_cbm_storage_fee") as string) || 1200
  const inboundBox = parseFloat(formData.get("inbound_handling_fee_per_box") as string) || 150
  const pickingEa = parseFloat(formData.get("outbound_picking_fee_per_ea") as string) || 100
  const packingOrder = parseFloat(formData.get("packing_fee_per_order") as string) || 500

  return await saveClientBillingContract({
    client_id: clientId,
    daily_pallet_storage_fee: dailyPallet,
    daily_chilled_pallet_fee: dailyChilled,
    daily_cbm_storage_fee: dailyCbm,
    inbound_handling_fee_per_box: inboundBox,
    outbound_picking_fee_per_ea: pickingEa,
    packing_fee_per_order: packingOrder,
  })
}

export async function runManualCalculationAction(date?: string) {
  return await triggerDailySettlementCalculationAction(date)
}

export async function downloadInvoiceCsvAction(clientId: string, month: string) {
  return await generateClientInvoiceCsv(clientId, month)
}

export async function fetchClientSettlementAction(clientId: string, month: string) {
  return await getClientMonthlySettlement(clientId, month)
}
