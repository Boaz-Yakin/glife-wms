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
    return { error: "필수 항목을 모두 입력해주세요." }
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
    return { error: "상품 등록에 실패했습니다: " + error.message }
  }

  revalidatePath("/master/items")
  return { success: true }
}
