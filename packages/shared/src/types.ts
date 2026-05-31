// Database entity types
export interface Komoditas {
  id: number
  treeId: string
  comId: number
  nama: string
  kategori: string
  satuan: string
}

export interface Provinsi {
  id: number
  biId: number
  nama: string
}

export interface Kota {
  id: number
  provinsiId: number
  nama: string
}

export interface Pasar {
  id: number
  kotaId: number
  nama: string
}

export interface HargaHarian {
  id: number
  komoditasId: number
  level: number
  provinsiId: number | null
  kotaId: number | null
  pasarId: number | null
  harga: number
  tanggal: string
}

// BI API response types
export interface BiCommodityTreeNode {
  id: string
  text: string
  expanded?: boolean
  items?: BiCommodityTreeLeaf[]
}

export interface BiCommodityTreeLeaf {
  id: string
  text: string
  comId: number
}

export type BiCommodityTreeResponse = BiCommodityTreeNode[]

export interface BiDetailGridRow {
  id: number
  name: string
  category: string
  level: number
  [dateKey: string]: unknown
}

export interface BiDetailGridResponse {
  data: BiDetailGridRow[]
}

// Computed types
export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y'

export interface BubbleData {
  komoditasId: number
  nama: string
  kategori: string
  harga: number
  perubahan: number
  radius: number
  color: string
}

export interface InsightResponse {
  komoditasId: number
  provinsiId: number | null
  insight: string
  generatedAt: string
  cached: boolean
}

/**
 * Informasi rentang data yang tersedia di DB.
 * Dipakai FE untuk disable timeframe yang datanya tidak cukup.
 */
export interface DataRangeResponse {
  /** Tanggal data tertua yang tersedia (YYYY-MM-DD), null jika belum ada data */
  oldestDate: string | null
  /** Tanggal data terbaru yang tersedia (YYYY-MM-DD), null jika belum ada data */
  newestDate: string | null
  /** Jumlah hari data yang tersedia (selisih oldest–newest) */
  availableDays: number
}
