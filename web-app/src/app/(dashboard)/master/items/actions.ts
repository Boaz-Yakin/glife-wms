"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { getActiveClientAction } from "@/app/actions/client.actions"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createClient(supabaseUrl, serviceKey)
}

export async function createItemAction(formData: FormData) {
  const supabase = getAdminClient()
  
  const id = formData.get("id")?.toString()
  const sku = formData.get("sku")?.toString()
  const name_en = formData.get("name_en")?.toString()
  const upc = formData.get("upc")?.toString() || `${sku}-upc`
  const uom = formData.get("uom")?.toString()
  const unit_price = parseFloat(formData.get("unit_price")?.toString() || "0")
  const zone_type = formData.get("zone_type")?.toString()
  let manufacturer_id = formData.get("manufacturer_id")?.toString() || null
  if (manufacturer_id === "none") manufacturer_id = null
  
  // New fields
  const name_kr = formData.get("name_kr")?.toString() || null
  const category = formData.get("category")?.toString() || null
  let supplier_id = formData.get("supplier_id")?.toString() || null
  if (supplier_id === "none") supplier_id = null
  const units_per_box = parseInt(formData.get("units_per_box")?.toString() || "1")
  const pack_price = parseFloat(formData.get("pack_price")?.toString() || "0")
  const box_price = parseFloat(formData.get("box_price")?.toString() || "0")
  const min_stock_qty = parseInt(formData.get("min_stock_qty")?.toString() || "0")
  const item_volume = formData.get("item_volume") ? parseFloat(formData.get("item_volume")!.toString()) : null
  const volume_unit = formData.get("volume_unit")?.toString() || "m3"
  const shelf_life_days = formData.get("shelf_life_days") ? parseInt(formData.get("shelf_life_days")!.toString()) : null
  const desc_en = formData.get("desc_en")?.toString() || null
  const desc_kr = formData.get("desc_kr")?.toString() || null
  const image_url = formData.get("image_url")?.toString() || null
  const note = formData.get("note")?.toString() || null
  const is_active = formData.get("is_active") === "true"

  if (!sku || !name_en || !uom || !zone_type) {
    return { error: "Please enter all required fields (SKU, Name, UOM, Zone)." }
  }

  const activeClientId = await getActiveClientAction()
  if (!activeClientId) {
    return { error: "Please select a client before creating items." }
  }

  const payload = {
    client_id: activeClientId,
    sku,
    name_en,
    name_kr,
    category,
    upc,
    uom,
    units_per_box,
    unit_price,
    pack_price,
    box_price,
    zone_type,
    manufacturer_id,
    supplier_id,
    min_stock_qty,
    item_volume,
    volume_unit,
    shelf_life_days,
    desc_en,
    desc_kr,
    image_url,
    note,
    is_active,
  }

  let error;
  if (id) {
    const { error: updateError } = await (supabase as any).from("items").update(payload).eq("id", id)
    error = updateError
  } else {
    const { error: insertError } = await (supabase as any).from("items").insert([payload])
    error = insertError
  }

  if (error) {
    console.error("Create Item Error:", error)
    return { error: "Failed to register item: " + error.message }
  }

  revalidatePath("/master/items")
  return { success: true }
}

export async function bulkCreateItemsAction(items: any[]) {
  const supabase = getAdminClient()

  if (!items || items.length === 0) {
    return { error: "No items to register." }
  }

  const activeClientId = await getActiveClientAction()
  if (!activeClientId) {
    return { error: "Please select a client before importing items." }
  }

  // Pre-process items to match DB constraints
  const insertData = items.map(item => ({
    client_id: activeClientId,
    sku: item.sku?.toString(),
    upc: item.upc?.toString() || `${item.sku}-upc`, // UPC is required and UNIQUE
    name_en: item.name_en?.toString() || item.sku?.toString(),
    name_kr: item.name_kr?.toString() || null,
    item_volume: item.item_volume ? parseFloat(item.item_volume) : null,
    volume_unit: item.volume_unit?.toString() || "m3",
    desc_en: item.desc_en?.toString() || null,
    desc_kr: item.desc_kr?.toString() || null,
    category: item.category?.toString() || null,
    uom: item.uom?.toString() || "EA",
    box_price: item.box_price ? parseFloat(item.box_price) : 0,
    pack_price: item.pack_price ? parseFloat(item.pack_price) : 0,
    unit_price: item.unit_price ? parseFloat(item.unit_price) : 0,
    units_per_box: item.units_per_box ? parseInt(item.units_per_box) : 1,
    zone_type: item.zone_type?.toString() || "A",
    min_stock_qty: item.min_stock_qty ? parseInt(item.min_stock_qty) : 0,
    shelf_life_days: item.shelf_life_days ? parseInt(item.shelf_life_days) : null,
    is_active: item.is_active !== undefined ? item.is_active === 'true' || item.is_active === true : true,
    manufacturer_id: item.manufacturer_id || null,
    supplier_id: item.supplier_id || null,
    note: item.note || null
  }))

  const { error } = await (supabase as any).from("items").insert(insertData)

  if (error) {
    console.error("Bulk Create Items Error:", error)
    return { error: "Failed to bulk register items: " + error.message }
  }

  revalidatePath("/master/items")
  return { success: true }
}

export async function deleteItemAction(id: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) {
    console.error('Delete Item Error:', error)
    return { error: 'Failed to delete item: ' + error.message }
  }
  revalidatePath('/master/items')
  return { success: true }
}
