import type { InsightResponse } from '@pantau-pangan/shared'
import { hitungPerubahan } from '@pantau-pangan/shared'
import { db } from '../db'
import { komoditas, provinsi, hargaHarian, insightCache } from '../db/schema'
import { eq, and, desc, isNull } from 'drizzle-orm'
import { ApiError } from '../lib/validators'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

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
  const apiKey = Bun.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new ApiError(503, 'Fitur insight belum dikonfigurasi (OPENROUTER_API_KEY tidak tersedia)')
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

  // 3. Call OpenRouter
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      throw new ApiError(502, 'Layanan LLM (OpenRouter) tidak tersedia')
    }

    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>
    }
    const insight = json.choices[0]!.message.content

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
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof ApiError) throw err
    throw new ApiError(502, 'Layanan LLM (OpenRouter) tidak tersedia atau timeout')
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
