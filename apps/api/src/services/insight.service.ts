import type { InsightResponse } from '@pantau-pangan/shared'
import { hitungPerubahan } from '@pantau-pangan/shared'
import { db } from '../db'
import { komoditas, provinsi, hargaHarian, insightCache } from '../db/schema'
import { eq, and, desc, isNull } from 'drizzle-orm'
import { ApiError } from '../lib/validators'

const GENERALCOMPUTE_URL = 'https://api.generalcompute.com/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const GENERALCOMPUTE_MODEL = Bun.env.GENERALCOMPUTE_MODEL ?? 'minimax-m2.7'
const OPENROUTER_MODEL = Bun.env.OPENROUTER_MODEL ?? 'nvidia/nemotron-3-ultra-550b-a55b:free'

/** Get today's date in WIB (UTC+7) as YYYY-MM-DD string */
function getTodayWIB(): string {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().split('T')[0]!
}

export async function getInsight(
  komoditasId: number,
  provinsiId: number,
): Promise<InsightResponse> {
  const generalComputeKey = Bun.env.GENERALCOMPUTE_API_KEY
  const openRouterKey = Bun.env.OPENROUTER_API_KEY
  if (!generalComputeKey && !openRouterKey) {
    throw new ApiError(503, 'Fitur insight belum dikonfigurasi (API key LLM tidak tersedia)')
  }

  // Verify komoditas exists
  const kom = await db.select().from(komoditas).where(eq(komoditas.id, komoditasId)).limit(1)
  if (kom.length === 0) {
    throw new ApiError(404, `Komoditas dengan id ${komoditasId} tidak ditemukan`)
  }

  // 1. Cek cache — tanggal hari ini WIB
  const todayWIB = getTodayWIB()
  const cached = await db
    .select()
    .from(insightCache)
    .where(
      and(
        eq(insightCache.komoditasId, komoditasId),
        provinsiId === 0
          ? isNull(insightCache.provinsiId)
          : eq(insightCache.provinsiId, provinsiId),
        eq(insightCache.cacheDate, todayWIB),
      ),
    )
    .limit(1)

  if (cached.length > 0) {
    const cachedEntry = cached[0]!
    return {
      komoditasId,
      provinsiId: provinsiId === 0 ? null : provinsiId,
      insight: cachedEntry.insight,
      generatedAt: cachedEntry.generatedAt.toISOString(),
      cached: true,
    }
  }

  // 2. Build prompt context dari DB
  const prompt = await buildInsightPrompt(komoditasId, provinsiId, kom[0]!)

  // 3. Call LLM — General Compute utama, OpenRouter fallback
  const primary: LlmProvider = {
    name: 'General Compute',
    url: GENERALCOMPUTE_URL,
    apiKey: generalComputeKey,
    model: GENERALCOMPUTE_MODEL,
  }
  const fallback: LlmProvider = {
    name: 'OpenRouter',
    url: OPENROUTER_URL,
    apiKey: openRouterKey,
    model: OPENROUTER_MODEL,
  }

  let insight: string
  try {
    insight = await callLlmProvider(primary, prompt)
  } catch (primaryErr) {
    console.error(`General Compute gagal, fallback OpenRouter: ${(primaryErr as Error).message}`)
    try {
      insight = await callLlmProvider(fallback, prompt)
    } catch (fallbackErr) {
      console.error(`OpenRouter gagal: ${(fallbackErr as Error).message}`)
      throw new ApiError(502, 'Layanan LLM tidak tersedia')
    }
  }

  // 4. Simpan ke cache
  await db.insert(insightCache).values({
    komoditasId,
    provinsiId: provinsiId === 0 ? null : provinsiId,
    cacheDate: todayWIB,
    insight,
  })

  return {
    komoditasId,
    provinsiId: provinsiId === 0 ? null : provinsiId,
    insight,
    generatedAt: new Date().toISOString(),
    cached: false,
  }
}

interface LlmProvider {
  name: string
  url: string
  apiKey: string | undefined
  model: string
}

async function callLlmProvider(provider: LlmProvider, prompt: string): Promise<string> {
  if (!provider.apiKey) throw new Error(`${provider.name}: API key tidak tersedia`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '')
      throw new Error(
        `${provider.name} error (${res.status}) model=${provider.model}: ${errorBody}`,
      )
    }

    const raw = await res.text()
    let json: {
      choices?: Array<{
        message: { content: string | null; reasoning?: string | null }
      }>
    }
    try {
      json = raw ? (JSON.parse(raw) as typeof json) : {}
    } catch {
      throw new Error(
        `${provider.name} invalid JSON (${res.status}) model=${provider.model}: ${raw.slice(0, 200)}`,
      )
    }

    const message = json.choices?.[0]?.message
    const content = (message?.content ?? message?.reasoning ?? '').trim()
    if (!content) {
      throw new Error(`${provider.name} mengembalikan respons kosong: ${raw.slice(0, 300)}`)
    }
    return content
  } finally {
    clearTimeout(timeout)
  }
}

async function buildInsightPrompt(
  komoditasId: number,
  provinsiId: number,
  kom: { nama: string; satuan: string | null },
): Promise<string> {
  const level = provinsiId === 0 ? 0 : 1

  // Ambil nama provinsi jika filter aktif
  let namaProvinsi = 'Nasional'
  if (provinsiId > 0) {
    const prov = await db.select().from(provinsi).where(eq(provinsi.id, provinsiId)).limit(1)
    if (prov[0]) namaProvinsi = prov[0].nama
  }

  // Ambil historis 30 hari terakhir
  const historis = await db
    .select({ tanggal: hargaHarian.tanggal, harga: hargaHarian.harga })
    .from(hargaHarian)
    .where(
      and(
        eq(hargaHarian.komoditasId, komoditasId),
        eq(hargaHarian.level, level),
        provinsiId === 0 ? isNull(hargaHarian.provinsiId) : eq(hargaHarian.provinsiId, provinsiId),
      ),
    )
    .orderBy(desc(hargaHarian.tanggal))
    .limit(30)

  const sorted = historis.reverse() // oldest first
  const hargaHariIni = sorted.length > 0 ? Number(sorted[sorted.length - 1]!.harga) : 0
  const hargaKemarin = sorted.length > 1 ? Number(sorted[sorted.length - 2]!.harga) : hargaHariIni
  const perubahan = hargaKemarin > 0 ? hitungPerubahan(hargaHariIni, hargaKemarin) : 0

  const historisStr = sorted
    .map((h) => `${h.tanggal}: Rp ${Number(h.harga).toLocaleString('id-ID')}`)
    .join('\n')

  return `Kamu adalah analis harga pangan Indonesia. Berikan analisis singkat dan praktis.

Data komoditas:
- Nama: ${kom.nama}
- Satuan: per ${kom.satuan ?? 'kg'}
- Jenis pasar: Tradisional
- Filter wilayah: ${namaProvinsi}

Harga terkini:
- Hari ini: Rp ${hargaHariIni.toLocaleString('id-ID')}
- Kemarin: Rp ${hargaKemarin.toLocaleString('id-ID')}
- Perubahan: ${perubahan.toFixed(2)}% (${perubahan >= 0 ? 'naik' : 'turun'})

Historis ${sorted.length} hari terakhir:
${historisStr}

Berikan analisis dalam 4 paragraf singkat (masing-masing 2-3 kalimat):
1. Analisis pergerakan harga saat ini
2. Faktor-faktor penyebab (musim, hari raya, distribusi, cuaca, dll)
3. Outlook dan prediksi tren jangka pendek
4. Saran praktis untuk konsumen

Gunakan Bahasa Indonesia yang mudah dipahami masyarakat umum.`
}
