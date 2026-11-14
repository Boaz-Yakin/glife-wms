/**
 * Order & Category Utility Functions
 * Pure client/server shared utility (without "use server")
 */

/**
 * Orders의 cancelled_categories 및 note에서 취소된 카테고리 목록을 안전하게 파싱합니다.
 */
export function parseCancelledCategories(rawNote?: string | null, directCancelled?: string[] | null): string[] {
  const result = new Set<string>()
  if (Array.isArray(directCancelled)) {
    directCancelled.forEach((c) => {
      if (c && typeof c === "string") result.add(c.toUpperCase().trim())
    })
  }
  if (rawNote) {
    const match = String(rawNote).match(/\[Cancelled(?:\s*Categories)?:\s*([^\]]+)\]/i)
    if (match && match[1]) {
      match[1].split(",").forEach((c) => {
        const trimmed = c.trim().toUpperCase()
        if (trimmed) result.add(trimmed)
      })
    }
  }
  return Array.from(result)
}

/**
 * 품목 카테고리를 3대 표준 대분류(GROCERY, GENERAL, FROZEN)로 정규화합니다.
 */
export function normalizeCategory(rawCat?: string | null): "GROCERY" | "GENERAL" | "FROZEN" {
  const cat = (rawCat || "").trim().toUpperCase()
  if (cat.includes("GENERAL")) return "GENERAL"
  if (cat.includes("FROZEN")) return "FROZEN"
  return "GROCERY"
}
