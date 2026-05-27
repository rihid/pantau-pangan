import { eq, sql, asc } from 'drizzle-orm'
import {
  BI_BASE_URL,
  PRICE_TYPE_ID,
  IS_PASOKAN,
  hitungPerubahan,
  getBubbleRadius,
  getBubbleColor,
  TIMEFRAME_DAYS,
} from '@pantau-pangan/shared'
import type { Timeframe, BubbleData } from '@pantau-pangan/shared'
import { db } from '../db'
import { komoditas, provinsi } from '../db/schema'
import { ApiError } from '../lib/validators'

/**
 * List semua komoditas dengan harga terbaru + % perubahan + bubble data.
 * Menghitung perubahan berdasarkan timeframe yang dipilih.
 */
export async function getAllKomoditas(
  provinsiId: number,
  timeframe: Timeframe,
): Promise<BubbleData[]> {
  const level = provinsiId === 0 ? 0 : 1
  const days = TIMEFRAME_DAYS[timeframe]

  // Hitung tanggal target
  const today = new Date()
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() - days)
  const targetDateStr = targetDate.toISOString().split('T')[0] // YYYY-MM-DD

  // 1. Ambil semua komoditas master
  const allKomoditas = await db.select().from(komoditas)

  // 2. Harga terbaru per komoditas (DISTINCT ON — 1 row terbaru per komoditas)
  const hargaTerbaru = await db.execute(sql`
    SELECT DISTINCT ON (komoditas_id)
      komoditas_id, harga, tanggal
    FROM harga_harian
    WHERE level = ${level}
      AND ${provinsiId === 0 ? sql`provinsi_id IS NULL` : sql`provinsi_id = ${provinsiId}`}
    ORDER BY komoditas_id, tanggal DESC
  `)

  // 3. Harga target per komoditas (tanggal terdekat <= target_date)
  const hargaTarget = await db.execute(sql`
    SELECT DISTINCT ON (komoditas_id)
      komoditas_id, harga, tanggal
    FROM harga_harian
    WHERE level = ${level}
      AND ${provinsiId === 0 ? sql`provinsi_id IS NULL` : sql`provinsi_id = ${provinsiId}`}
      AND tanggal <= ${targetDateStr}
    ORDER BY komoditas_id, tanggal DESC
  `)

  // 4. Build lookup maps
  const hargaTerbaruMap = new Map<number, { harga: number; tanggal: string }>()
  for (const row of hargaTerbaru) {
    const r = row as { komoditas_id: number; harga: string; tanggal: string }
    hargaTerbaruMap.set(r.komoditas_id, {
      harga: Number(r.harga),
      tanggal: r.tanggal,
    })
  }

  const hargaTargetMap = new Map<number, { harga: number; tanggal: string }>()
  for (const row of hargaTarget) {
    const r = row as { komoditas_id: number; harga: string; tanggal: string }
    hargaTargetMap.set(r.komoditas_id, {
      harga: Number(r.harga),
      tanggal: r.tanggal,
    })
  }

  // 5. Gabungkan dan hitung bubble data
  return allKomoditas.map((k) => {
    const terbaru = hargaTerbaruMap.get(k.id)
    const target = hargaTargetMap.get(k.id)

    // Komoditas tanpa data harga → default values
    if (!terbaru || !target) {
      return {
        komoditasId: k.id,
        nama: k.nama,
        kategori: k.kategori,
        harga: terbaru ? terbaru.harga : 0,
        perubahan: 0,
        radius: 30,
        color: '#6b7280',
      }
    }

    const perubahan = hitungPerubahan(terbaru.harga, target.harga)
    return {
      komoditasId: k.id,
      nama: k.nama,
      kategori: k.kategori,
      harga: terbaru.harga,
      perubahan,
      radius: getBubbleRadius(perubahan, timeframe),
      color: getBubbleColor(perubahan, timeframe),
    }
  })
}

/**
 * Proxy request ke BI API GetDetailGridData2.
 * Mengembalikan response JSON dari BI tanpa transformasi.
 */
export async function getDetail(komoditasId: number, provinsiId: number): Promise<unknown> {
  // 1. Lookup com_id dari DB
  const kom = await db.select().from(komoditas).where(eq(komoditas.id, komoditasId)).limit(1)
  const komRow = kom[0]
  if (!komRow) {
    throw new ApiError(404, `Komoditas dengan id ${komoditasId} tidak ditemukan`)
  }

  // 2. Lookup bi_id provinsi jika provinsiId > 0
  let biProvId = 0
  if (provinsiId > 0) {
    const prov = await db.select().from(provinsi).where(eq(provinsi.id, provinsiId)).limit(1)
    const provRow = prov[0]
    if (!provRow) {
      throw new ApiError(404, `Provinsi dengan id ${provinsiId} tidak ditemukan`)
    }
    biProvId = provRow.biId
  }

  // 3. Build URL dan fetch dari BI
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const params = new URLSearchParams({
    ProvId: String(biProvId),
    PriceTypeId: String(PRICE_TYPE_ID),
    ComId: String(komRow.comId),
    date: dateStr,
    isPasokan: String(IS_PASOKAN),
    _: String(Date.now()),
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch(`${BI_BASE_URL}/GetDetailGridData2?${params.toString()}`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      throw new ApiError(502, 'Sumber data eksternal (BI API) tidak tersedia')
    }

    return await res.json()
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof ApiError) throw err
    throw new ApiError(502, 'Sumber data eksternal (BI API) tidak tersedia atau timeout')
  }
}

/** List semua provinsi untuk dropdown filter */
export async function getProvinsiList(): Promise<
  Array<{
    id: number
    biId: number
    nama: string
  }>
> {
  return db
    .select({ id: provinsi.id, biId: provinsi.biId, nama: provinsi.nama })
    .from(provinsi)
    .orderBy(asc(provinsi.nama))
}
