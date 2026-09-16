"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function createItemAction(formData: FormData) {
  const supabase = await createClient()
  
  const sku = formData.get("sku")?.toString()
  const name_en = formData.get("name_en")?.toString()
  const upc = formData.get("upc")?.toString() || null
  const uom = formData.get("uom")?.toString()
  const unit_price = parseFloat(formData.get("unit_price")?.toString() || "0")
  const zone_type = formData.get("zone_type")?.toString()
  const manufacturer_id = formData.get("manufacturer_id")?.toString() || null

  if (!sku || !name_en || !uom || !zone_type) {
    return { error: "Please enter all required fields." }
  }

  const { error } = await (supabase as any).from("items").insert([
    {
      sku,
      name_en,
      upc,
      uom,
      unit_price,
      zone_type,
      manufacturer_id,
      is_active: true
    }
  ])

  if (error) {
    console.error("Create Item Error:", error)
    return { error: "Failed to register item: " + error.message }
  }

  revalidatePath("/master/items")
  return { success: true }
}

export async function bulkCreateItemsAction(items: any[]) {
  const supabase = await createClient()

  if (!items || items.length === 0) {
    return { error: "No items to register." }
  }

  // Pre-process items to match DB constraints
  const insertData = items.map(item => ({
    sku: item.sku?.toString(),
    upc: item.upc?.toString() || `${item.sku}-upc`, // UPC is required and UNIQUE
    name_en: item.name_en?.toString() || item.sku?.toString(),
    name_kr: item.name_kr?.toString() || null,
    item_volume: item.item_volume ? parseFloat(item.item_volume) : null,
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
