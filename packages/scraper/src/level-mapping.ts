export interface LevelFks {
  provinsiId: number | null
  kotaId: number | null
  pasarId: number | null
}

/**
 * Map a row's level to the correct FK values for harga_harian.
 * Level 0: all null
 * Level 1: provinsi_id set, rest null
 * Level 2: provinsi_id + kota_id set, pasar_id null
 * Level 3: all set
 */
export function mapLevelToFks(
  level: number,
  resolvedProvinsiId: number | null,
  resolvedKotaId: number | null,
  resolvedPasarId: number | null,
): LevelFks {
  switch (level) {
    case 0:
      return { provinsiId: null, kotaId: null, pasarId: null }
    case 1:
      return { provinsiId: resolvedProvinsiId, kotaId: null, pasarId: null }
    case 2:
      return { provinsiId: resolvedProvinsiId, kotaId: resolvedKotaId, pasarId: null }
    case 3:
      return { provinsiId: resolvedProvinsiId, kotaId: resolvedKotaId, pasarId: resolvedPasarId }
    default:
      return { provinsiId: null, kotaId: null, pasarId: null }
  }
}
