import { eq, sql, asc, min, max } from 'drizzle-orm'
import {
  BI_BASE_URL,
  PRICE_TYPE_ID,
  IS_PASOKAN,
  hitungPerubahan,
  getBubbleRadius,
  getBubbleColor,
  TIMEFRAME_DAYS,
  BUBBLE_MIN_RADIUS,
} from '@pantau-pangan/shared'
import type { Timeframe, BubbleData, DataRangeResponse } from '@pantau-pangan/shared'
import { db } from '../db'
import { komoditas, provinsi, hargaHarian } from '../db/schema'
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

  // 3. Harga target per komoditas
  // Untuk 1D: bandingkan harga terbaru vs harga sebelumnya (row ke-2 terbaru)
  // Untuk timeframe lain: cari tanggal terdekat <= today - days
  let hargaTarget

  if (timeframe === '1D') {
    // Ambil 2 tanggal terbaru per komoditas, lalu pakai yang ke-2 sebagai target
    hargaTarget = await db.execute(sql`
      SELECT DISTINCT ON (komoditas_id)
        komoditas_id, harga, tanggal
      FROM harga_harian
      WHERE level = ${level}
        AND ${provinsiId === 0 ? sql`provinsi_id IS NULL` : sql`provinsi_id = ${provinsiId}`}
        AND tanggal < (
          SELECT MAX(tanggal)
          FROM harga_harian h2
          WHERE h2.komoditas_id = harga_harian.komoditas_id
            AND h2.level = ${level}
            AND ${provinsiId === 0 ? sql`h2.provinsi_id IS NULL` : sql`h2.provinsi_id = ${provinsiId}`}
        )
      ORDER BY komoditas_id, tanggal DESC
    `)
  } else {
    const today = new Date()
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() - TIMEFRAME_DAYS[timeframe])
    const targetDateStr = targetDate.toISOString().split('T')[0] // YYYY-MM-DD

    hargaTarget = await db.execute(sql`
      SELECT DISTINCT ON (komoditas_id)
        komoditas_id, harga, tanggal
      FROM harga_harian
      WHERE level = ${level}
        AND ${provinsiId === 0 ? sql`provinsi_id IS NULL` : sql`provinsi_id = ${provinsiId}`}
        AND tanggal <= ${targetDateStr}
      ORDER BY komoditas_id, tanggal DESC
    `)
  }

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
  // Hitung perubahan dulu untuk semua komoditas, lalu cari max untuk normalisasi radius
  const perubahans = allKomoditas.map((k) => {
    const terbaru = hargaTerbaruMap.get(k.id)
    const target = hargaTargetMap.get(k.id)
    if (!terbaru || !target) return 0
    return hitungPerubahan(terbaru.harga, target.harga)
  })

  const maxAbsPersen = Math.max(...perubahans.map(Math.abs), 0)

  return allKomoditas.map((k, i) => {
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
        radius: BUBBLE_MIN_RADIUS,
        color: '#6b7280',
      }
    }

    const perubahan = perubahans[i] ?? 0
    return {
      komoditasId: k.id,
      nama: k.nama,
      kategori: k.kategori,
      harga: terbaru.harga,
      perubahan,
      radius: getBubbleRadius(perubahan, timeframe, maxAbsPersen),
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

/**
 * Kembalikan rentang tanggal data yang tersedia di DB untuk level nasional.
 * Dipakai FE untuk disable timeframe yang datanya tidak cukup.
 */
export async function getDataRange(provinsiId: number): Promise<DataRangeResponse> {
  const level = provinsiId === 0 ? 0 : 1

  const result = await db
    .select({
      oldest: min(hargaHarian.tanggal),
      newest: max(hargaHarian.tanggal),
    })
    .from(hargaHarian)
    .where(
      provinsiId === 0
        ? eq(hargaHarian.level, level)
        : sql`${hargaHarian.level} = ${level} AND ${hargaHarian.provinsiId} = ${provinsiId}`,
    )

  const row = result[0]
  const oldest = row?.oldest ?? null
  const newest = row?.newest ?? null

  let availableDays = 0
  if (oldest && newest) {
    const msPerDay = 1000 * 60 * 60 * 24
    availableDays = Math.round((new Date(newest).getTime() - new Date(oldest).getTime()) / msPerDay)
  }

  return { oldestDate: oldest, newestDate: newest, availableDays }
}
