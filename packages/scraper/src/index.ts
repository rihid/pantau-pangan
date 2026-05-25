import { and, eq } from 'drizzle-orm'
import { fetchCommoditiesTree, fetchDetailGrid } from './fetcher'
import { parseCommoditiesTree, parseDetailGrid } from './parser'
import { db, closeConnection, schema } from './db'
import { mapLevelToFks } from './level-mapping'

export { mapLevelToFks } from './level-mapping'
export type { LevelFks } from './level-mapping'

const { komoditas, provinsi, kota, pasar, hargaHarian } = schema

// --- Main orchestrator ---

async function main(): Promise<void> {
  const startTime = Date.now()
  let successCount = 0
  let failCount = 0
  let totalRows = 0
  let latestDate: string | null = null

  try {
    // Step 1: Fetch and parse commodities tree
    console.log('[scraper] Fetching commodities tree...')
    const rawTree = await fetchCommoditiesTree()
    const parsedKomoditas = parseCommoditiesTree(rawTree)
    console.log(`[scraper] Parsed ${parsedKomoditas.length} komoditas`)

    // Step 2: Upsert komoditas (onConflictDoUpdate on com_id)
    for (const item of parsedKomoditas) {
      await db
        .insert(komoditas)
        .values({
          treeId: item.treeId,
          comId: item.comId,
          nama: item.nama,
          kategori: item.kategori,
        })
        .onConflictDoUpdate({
          target: komoditas.comId,
          set: {
            nama: item.nama,
            kategori: item.kategori,
            updatedAt: new Date(),
          },
        })
    }
    console.log(`[scraper] Upserted ${parsedKomoditas.length} komoditas`)

    // Get komoditas IDs from DB for FK references
    const komoditasRows = await db
      .select({ id: komoditas.id, comId: komoditas.comId })
      .from(komoditas)
    const komoditasIdMap = new Map<number, number>() // comId → db id
    for (const row of komoditasRows) {
      komoditasIdMap.set(row.comId, row.id)
    }

    // Step 3: Process each komoditas
    for (const item of parsedKomoditas) {
      try {
        console.log(`[scraper] Processing: ${item.nama} (comId=${item.comId})`)

        const rawGrid = await fetchDetailGrid(item.comId)
        const { rows } = parseDetailGrid(rawGrid, item.comId)

        if (rows.length === 0) {
          console.log(`[scraper]   No data rows for ${item.nama}`)
          successCount++
          continue
        }

        // Geographic entity resolution with in-memory Maps
        const provinsiMap = new Map<string, number>() // nama → id
        const kotaMap = new Map<string, number>() // "provinsiId:nama" → id
        const pasarMap = new Map<string, number>() // "kotaId:nama" → id

        // Pass 1: Resolve provinsi (level 1 rows)
        const level1Rows = rows.filter((r) => r.level === 1)
        for (const row of level1Rows) {
          const biId = row.id
          const nama = row.name

          const result = await db
            .insert(provinsi)
            .values({ biId, nama })
            .onConflictDoNothing({ target: provinsi.biId })
            .returning({ id: provinsi.id, nama: provinsi.nama })

          if (result.length > 0) {
            const inserted = result[0]!
            provinsiMap.set(inserted.nama, inserted.id)
          } else {
            // Already exists, query it
            const existing = await db
              .select({ id: provinsi.id, nama: provinsi.nama })
              .from(provinsi)
              .where(eq(provinsi.biId, biId))
            if (existing.length > 0) {
              const found = existing[0]!
              provinsiMap.set(found.nama, found.id)
            }
          }
        }

        // Pass 2: Resolve kota (level 2 rows)
        const level2Rows = rows.filter((r) => r.level === 2)
        for (const row of level2Rows) {
          const provinsiNama = row.category
          const provinsiId = provinsiMap.get(provinsiNama)
          if (provinsiId == null) continue // skip if parent not resolved

          const kotaNama = row.name
          const key = `${provinsiId}:${kotaNama}`

          const result = await db
            .insert(kota)
            .values({ provinsiId, nama: kotaNama })
            .onConflictDoNothing()
            .returning({ id: kota.id })

          if (result.length > 0) {
            kotaMap.set(key, result[0]!.id)
          } else {
            // Already exists, query it
            const existing = await db
              .select({ id: kota.id })
              .from(kota)
              .where(and(eq(kota.provinsiId, provinsiId), eq(kota.nama, kotaNama)))
            if (existing.length > 0) {
              kotaMap.set(key, existing[0]!.id)
            }
          }
        }

        // Pass 3: Resolve pasar (level 3 rows)
        const level3Rows = rows.filter((r) => r.level === 3)
        for (const row of level3Rows) {
          const kotaNama = row.category
          // Find kota_id by searching kotaMap for matching kota name
          let resolvedKotaId: number | null = null
          for (const [mapKey, mapId] of kotaMap) {
            if (mapKey.endsWith(`:${kotaNama}`)) {
              resolvedKotaId = mapId
              break
            }
          }
          if (resolvedKotaId == null) continue // skip if parent not resolved

          const pasarNama = row.name
          const key = `${resolvedKotaId}:${pasarNama}`

          const result = await db
            .insert(pasar)
            .values({ kotaId: resolvedKotaId, nama: pasarNama })
            .onConflictDoNothing()
            .returning({ id: pasar.id })

          if (result.length > 0) {
            pasarMap.set(key, result[0]!.id)
          } else {
            // Already exists, query it
            const existing = await db
              .select({ id: pasar.id })
              .from(pasar)
              .where(and(eq(pasar.kotaId, resolvedKotaId), eq(pasar.nama, pasarNama)))
            if (existing.length > 0) {
              pasarMap.set(key, existing[0]!.id)
            }
          }
        }

        // Step 4: Upsert harga_harian
        const komoditasId = komoditasIdMap.get(item.comId)
        if (komoditasId == null) {
          console.error(`[scraper]   Could not find komoditas DB id for comId=${item.comId}`)
          failCount++
          continue
        }

        let rowsInserted = 0
        for (const row of rows) {
          // Resolve FKs based on level
          let resolvedProvinsiId: number | null = null
          let resolvedKotaId: number | null = null
          let resolvedPasarId: number | null = null

          if (row.level === 1) {
            resolvedProvinsiId = provinsiMap.get(row.name) ?? null
          } else if (row.level === 2) {
            resolvedProvinsiId = provinsiMap.get(row.category) ?? null
            const pId = resolvedProvinsiId
            if (pId != null) {
              resolvedKotaId = kotaMap.get(`${pId}:${row.name}`) ?? null
            }
          } else if (row.level === 3) {
            // For level 3, category = kota name
            let foundKotaId: number | null = null
            for (const [mapKey, mapId] of kotaMap) {
              if (mapKey.endsWith(`:${row.category}`)) {
                foundKotaId = mapId
                // Extract provinsiId from the map key
                const provinsiIdStr = mapKey.split(':')[0]!
                resolvedProvinsiId = Number(provinsiIdStr)
                break
              }
            }
            resolvedKotaId = foundKotaId
            resolvedPasarId =
              foundKotaId != null ? (pasarMap.get(`${foundKotaId}:${row.name}`) ?? null) : null
          }

          const fks = mapLevelToFks(row.level, resolvedProvinsiId, resolvedKotaId, resolvedPasarId)

          for (const price of row.prices) {
            const tanggalStr = price.tanggal.toISOString().split('T')[0]!

            // Track latest date
            if (latestDate == null || tanggalStr > latestDate) {
              latestDate = tanggalStr
            }

            await db
              .insert(hargaHarian)
              .values({
                komoditasId,
                level: row.level,
                provinsiId: fks.provinsiId,
                kotaId: fks.kotaId,
                pasarId: fks.pasarId,
                harga: price.harga.toFixed(2),
                tanggal: tanggalStr,
              })
              .onConflictDoNothing()

            rowsInserted++
          }
        }

        totalRows += rowsInserted
        successCount++
        console.log(`[scraper]   Inserted/skipped ${rowsInserted} harga rows for ${item.nama}`)
      } catch (error) {
        failCount++
        console.error(
          `[scraper]   Error processing ${item.nama}:`,
          error instanceof Error ? error.message : error,
        )
      }
    }
  } catch (error) {
    console.error('[scraper] Fatal error:', error instanceof Error ? error.message : error)
    await closeConnection()
    process.exit(1)
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('[scraper] === Summary ===')
  console.log(`[scraper]   Komoditas succeeded: ${successCount}`)
  console.log(`[scraper]   Komoditas failed: ${failCount}`)
  console.log(`[scraper]   Total harga rows: ${totalRows}`)
  console.log(`[scraper]   Latest date: ${latestDate ?? 'none'}`)
  console.log(`[scraper]   Duration: ${duration}s`)

  await closeConnection()

  if (successCount === 0) {
    process.exit(1)
  }
  process.exit(0)
}

void main()
