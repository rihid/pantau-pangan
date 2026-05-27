import { db } from '../db'
import { komoditas, hargaHarian } from '../db/schema'
import { eq, and, desc, isNull } from 'drizzle-orm'
import { ApiError } from '../lib/validators'

export async function getHistoris(
  komoditasId: number,
  provinsiId: number,
): Promise<Array<{ tanggal: string; harga: number }>> {
  const level = provinsiId === 0 ? 0 : 1

  // Verifikasi komoditas exists
  const kom = await db.select().from(komoditas).where(eq(komoditas.id, komoditasId)).limit(1)
  if (kom.length === 0) {
    throw new ApiError(404, `Komoditas dengan id ${komoditasId} tidak ditemukan`)
  }

  const rows = await db
    .select({
      tanggal: hargaHarian.tanggal,
      harga: hargaHarian.harga,
    })
    .from(hargaHarian)
    .where(
      and(
        eq(hargaHarian.komoditasId, komoditasId),
        eq(hargaHarian.level, level),
        provinsiId === 0 ? isNull(hargaHarian.provinsiId) : eq(hargaHarian.provinsiId, provinsiId),
      ),
    )
    .orderBy(desc(hargaHarian.tanggal))
    .limit(365)

  // Return ascending order (oldest first) untuk line chart
  return rows.reverse().map((r) => ({
    tanggal: r.tanggal,
    harga: Number(r.harga),
  }))
}
