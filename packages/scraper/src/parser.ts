import { parseDateKeys } from '@pantau-pangan/shared'

export interface ParsedKomoditas {
  treeId: string
  comId: number
  nama: string
  kategori: string
}

export interface ParsedGridRow {
  level: number
  id: number
  name: string
  category: string
  prices: Array<{ tanggal: Date; harga: number }>
}

export interface ParsedGridResult {
  rows: ParsedGridRow[]
  dateKeys: string[]
}

/**
 * Parse raw BI GetCommoditiesTree response into flat array of leaf komoditas.
 *
 * New API format (2025): { data: [...] } flat array with TreeID, TreeName, ParentID.
 * - Parent nodes: ParentID === null
 * - Leaf nodes: ParentID !== null, TreeID format = "parentId_comId" (e.g. "1_3")
 *
 * Legacy format: array of category nodes with nested `items`.
 */
export function parseCommoditiesTree(raw: unknown): ParsedKomoditas[] {
  // New API format: { data: [...] }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const rawObj = raw as Record<string, unknown>
    if (Array.isArray(rawObj.data)) {
      return parseCommoditiesTreeFlat(rawObj.data)
    }
    throw new Error(
      'parseCommoditiesTree: expected { data: [...] } or array, got object without data array',
    )
  }

  // Legacy format: array of category nodes with nested items
  if (!Array.isArray(raw)) {
    throw new Error('parseCommoditiesTree: expected an array of category nodes, got ' + typeof raw)
  }

  return parseCommoditiesTreeLegacy(raw)
}

/**
 * Parse new flat format (2025 API).
 * comId is extracted from TreeID: "parentId_comId" → comId = parseInt(last segment).
 */
function parseCommoditiesTreeFlat(data: unknown[]): ParsedKomoditas[] {
  // Build parent map: TreeID -> TreeName for category lookup
  const parentMap = new Map<string, string>()
  for (const node of data) {
    const n = node as Record<string, unknown>
    if (n.ParentID === null && typeof n.TreeID === 'string' && typeof n.TreeName === 'string') {
      parentMap.set(n.TreeID, n.TreeName)
    }
  }

  const results: ParsedKomoditas[] = []

  for (const node of data) {
    const n = node as Record<string, unknown>

    // Skip parent nodes
    if (n.ParentID === null) continue

    const treeId = n.TreeID
    const nama = n.TreeName
    const parentId = n.ParentID

    if (typeof treeId !== 'string' || typeof nama !== 'string' || typeof parentId !== 'string') {
      continue
    }

    // Extract comId from TreeID: "1_3" → comId = 3
    const parts = treeId.split('_')
    const comIdStr = parts[parts.length - 1]
    const comId = parseInt(comIdStr ?? '', 10)
    if (isNaN(comId)) {
      throw new Error(`parseCommoditiesTree: cannot extract comId from TreeID "${treeId}"`)
    }

    const kategori = parentMap.get(parentId) ?? parentId
    results.push({ treeId, comId, nama, kategori })
  }

  return results
}

/**
 * Legacy format: array of category nodes, each with `items` array of leaves.
 */
function parseCommoditiesTreeLegacy(raw: unknown[]): ParsedKomoditas[] {
  const results: ParsedKomoditas[] = []

  for (const node of raw) {
    if (!node || typeof node !== 'object') {
      throw new Error('parseCommoditiesTree: category node must be an object')
    }

    const nodeObj = node as Record<string, unknown>
    const kategori = nodeObj.text
    if (typeof kategori !== 'string') {
      throw new Error('parseCommoditiesTree: category node missing "text" field')
    }

    const items = nodeObj.items
    if (!items || !Array.isArray(items)) {
      // Node without items (no leaves) — skip
      continue
    }

    for (const leaf of items) {
      if (!leaf || typeof leaf !== 'object') {
        throw new Error('parseCommoditiesTree: leaf node must be an object')
      }

      const leafObj = leaf as Record<string, unknown>
      const comId = leafObj.comId
      if (comId == null || typeof comId !== 'number') {
        const leafName = typeof leafObj.text === 'string' ? leafObj.text : 'unknown'
        throw new Error(`parseCommoditiesTree: leaf "${leafName}" missing numeric "comId"`)
      }

      const treeId = leafObj.id
      if (typeof treeId !== 'string') {
        throw new Error(
          `parseCommoditiesTree: leaf with comId=${comId} missing string "id" (treeId)`,
        )
      }

      const nama = leafObj.text
      if (typeof nama !== 'string') {
        throw new Error(
          `parseCommoditiesTree: leaf with comId=${comId} missing string "text" (nama)`,
        )
      }

      results.push({ treeId, comId, nama, kategori })
    }
  }

  return results
}

/**
 * Parse a date string in DD/MM/YYYY format into a Date object (UTC midnight).
 */
function parseDateString(dateStr: string): Date {
  const [dd, mm, yyyy] = dateStr.split('/')
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)))
}

/**
 * Parse raw BI GetDetailGridData2 response into structured grid rows.
 * Input: { data: [...rows] } or raw array where each row has id, name, category, level,
 * and dynamic date keys.
 */
export function parseDetailGrid(raw: unknown, comId: number): ParsedGridResult {
  // Handle both { data: [...] } and raw array formats
  let data: unknown[]

  if (Array.isArray(raw)) {
    data = raw
  } else if (raw && typeof raw === 'object') {
    const rawObj = raw as Record<string, unknown>
    if (Array.isArray(rawObj.data)) {
      data = rawObj.data
    } else {
      throw new Error(
        `parseDetailGrid(comId=${comId}): expected array or { data: [...] }, got object without data array`,
      )
    }
  } else {
    throw new Error(
      `parseDetailGrid(comId=${comId}): expected an object with "data" field, got ${typeof raw}`,
    )
  }

  if (data.length === 0) {
    return { rows: [], dateKeys: [] }
  }

  // Extract date keys from the first row
  const firstRow = data[0] as Record<string, unknown>
  const dateKeys = parseDateKeys(firstRow)

  const rows: ParsedGridRow[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as Record<string, unknown>

    if (!row || typeof row !== 'object') {
      throw new Error(`parseDetailGrid(comId=${comId}): row at index ${i} must be an object`)
    }

    const level = row.level
    if (typeof level !== 'number') {
      throw new Error(`parseDetailGrid(comId=${comId}): row at index ${i} missing numeric "level"`)
    }

    const id = row.id
    if (typeof id !== 'number') {
      throw new Error(`parseDetailGrid(comId=${comId}): row at index ${i} missing numeric "id"`)
    }

    const name = row.name
    if (typeof name !== 'string') {
      throw new Error(`parseDetailGrid(comId=${comId}): row at index ${i} missing string "name"`)
    }

    const category = row.category
    if (typeof category !== 'string') {
      throw new Error(
        `parseDetailGrid(comId=${comId}): row at index ${i} missing string "category"`,
      )
    }

    // Extract date-price pairs
    const prices: Array<{ tanggal: Date; harga: number }> = []
    for (const key of dateKeys) {
      const value = row[key]
      if (value == null) continue
      const harga = Number(value)
      if (Number.isNaN(harga)) continue
      prices.push({ tanggal: parseDateString(key), harga })
    }

    rows.push({ level, id, name, category, prices })
  }

  return { rows, dateKeys }
}
