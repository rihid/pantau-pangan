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
 * Input: array of category nodes, each with `items` array of leaves.
 */
export function parseCommoditiesTree(raw: unknown): ParsedKomoditas[] {
  if (!Array.isArray(raw)) {
    throw new Error('parseCommoditiesTree: expected an array of category nodes, got ' + typeof raw)
  }

  const results: ParsedKomoditas[] = []

  for (const node of raw) {
    if (!node || typeof node !== 'object') {
      throw new Error('parseCommoditiesTree: category node must be an object')
    }

    const kategori = (node as Record<string, unknown>).text
    if (typeof kategori !== 'string') {
      throw new Error('parseCommoditiesTree: category node missing "text" field')
    }

    const items = (node as Record<string, unknown>).items
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
 * Input: { data: [...rows] } where each row has id, name, category, level, and dynamic date keys.
 */
export function parseDetailGrid(raw: unknown, comId: number): ParsedGridResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error(
      `parseDetailGrid(comId=${comId}): expected an object with "data" field, got ${typeof raw}`,
    )
  }

  const rawObj = raw as Record<string, unknown>
  const data = rawObj.data

  if (!Array.isArray(data)) {
    throw new Error(
      `parseDetailGrid(comId=${comId}): "data" field must be an array, got ${typeof data}`,
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
