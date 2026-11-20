/**
 * Multi-Search Utility for WMS Web-App
 *
 * Supports:
 * 1. Delimiter-separated multi-target search (comma, semicolon, newline, pipe, tab) -> OR mode
 *    Example: "NDL-001, NDL-002, BEV-003" or pasting multiple SKUs from Excel.
 * 2. Space-separated code/SKU search -> OR mode
 *    Example: "NDL-001 NDL-002 BEV-003" or "#50 #58"
 * 3. Space-separated keyword refinement -> AND mode
 *    Example: "Shin Ramyeon Black", "Buldak Cheese", "CND 001"
 * 4. In-memory multi-search matching for client-side list filtering.
 */

export interface ParsedSearch {
  mode: 'SINGLE' | 'OR' | 'AND'
  terms: string[]
  raw: string
}

/**
 * Parses user search input into structured search tokens and execution mode.
 */
export function parseMultiSearch(input?: string | null): ParsedSearch | null {
  if (!input) return null
  const clean = input.trim()
  if (!clean) return null

  // 1. Explicit delimiters: comma, semicolon, newline, tab, pipe
  if (/[,;\n\t|]/.test(clean)) {
    const terms = clean
      .split(/[,;\n\t|]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
    if (terms.length > 0) {
      return { mode: 'OR', terms, raw: clean }
    }
  }

  // 2. Space-separated tokens
  const tokens = clean
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

  if (tokens.length <= 1) {
    return { mode: 'SINGLE', terms: [clean], raw: clean }
  }

  // 3. Check if all tokens look like distinct SKUs / codes / identifiers:
  // e.g. "NDL-001", "CND-002", "#50", "LOC-A0101A01", "ORD-20261118-I5L1"
  const isAllCodeLike = tokens.every(
    (t) =>
      t.length >= 2 &&
      /^[A-Z0-9#_.-]+$/i.test(t) &&
      (t.includes('-') || t.includes('_') || t.startsWith('#') || (/\d/.test(t) && /[a-z]/i.test(t)))
  )

  if (isAllCodeLike) {
    return { mode: 'OR', terms: tokens, raw: clean }
  }

  // 4. Default to AND mode (keyword refinement across columns)
  return { mode: 'AND', terms: tokens, raw: clean }
}

/**
 * Builds PostgREST OR filter clause for a list of terms across specified columns.
 * e.g. "sku.ilike.%term1%,name_en.ilike.%term1%,sku.ilike.%term2%..."
 */
export function buildPostgrestOrString(terms: string[], columns: string[]): string {
  const clauses: string[] = []
  for (const term of terms) {
    const sanitized = term.replace(/[%]/g, '').trim()
    if (!sanitized) continue
    for (const col of columns) {
      clauses.push(`${col}.ilike.%${sanitized}%`)
    }
  }
  return clauses.join(',')
}

/**
 * Applies multi-search conditions to a Supabase PostgREST query builder.
 */
export function applyPostgrestMultiSearch<T extends { or: (clause: string) => T }>(
  query: T,
  columns: string[],
  search?: string | null
): T {
  const parsed = parseMultiSearch(search)
  if (!parsed || columns.length === 0) return query

  if (parsed.mode === 'SINGLE' || parsed.mode === 'OR') {
    const orString = buildPostgrestOrString(parsed.terms, columns)
    if (orString) {
      return query.or(orString)
    }
    return query
  }

  // AND mode: Each token must match at least one of the specified columns
  let currentQuery = query
  for (const token of parsed.terms) {
    const tokenOrString = buildPostgrestOrString([token], columns)
    if (tokenOrString) {
      currentQuery = currentQuery.or(tokenOrString)
    }
  }

  return currentQuery
}

/**
 * Evaluates whether an in-memory item matches the multi-search query.
 * Matches across an array of field strings.
 */
export function matchesMultiSearch(
  fields: (string | null | undefined)[],
  searchQuery?: string | null
): boolean {
  const parsed = parseMultiSearch(searchQuery)
  if (!parsed) return true

  const fullText = fields
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const fullTextClean = fullText.replace(/[^a-z0-9가-힣]/g, '')

  if (parsed.mode === 'SINGLE') {
    const term = parsed.terms[0].toLowerCase()
    const termClean = term.replace(/[^a-z0-9가-힣]/g, '')
    return fullText.includes(term) || (termClean.length > 0 && fullTextClean.includes(termClean))
  }

  if (parsed.mode === 'OR') {
    return parsed.terms.some((term) => {
      const t = term.toLowerCase()
      const tClean = t.replace(/[^a-z0-9가-힣]/g, '')
      return fullText.includes(t) || (tClean.length > 0 && fullTextClean.includes(tClean))
    })
  }

  // AND mode: all tokens must be found in the searchable text
  return parsed.terms.every((token) => {
    const t = token.toLowerCase()
    const tClean = t.replace(/[^a-z0-9가-힣]/g, '')
    return fullText.includes(t) || (tClean.length > 0 && fullTextClean.includes(tClean))
  })
}
