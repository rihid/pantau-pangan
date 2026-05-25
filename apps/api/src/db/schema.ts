import {
  pgTable,
  serial,
  varchar,
  integer,
  smallint,
  numeric,
  date,
  text,
  timestamp,
  unique,
  check,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// komoditas — master data 21 komoditas BI
export const komoditas = pgTable('komoditas', {
  id: serial('id').primaryKey(),
  treeId: varchar('tree_id', { length: 10 }).notNull(),
  comId: integer('com_id').notNull().unique(),
  nama: varchar('nama', { length: 100 }).notNull(),
  kategori: varchar('kategori', { length: 50 }).notNull(),
  satuan: varchar('satuan', { length: 20 }).default('kg'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// provinsi — 34 provinsi dari BI
export const provinsi = pgTable('provinsi', {
  id: serial('id').primaryKey(),
  biId: integer('bi_id').notNull().unique(),
  nama: varchar('nama', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// kota — kota/kabupaten, FK ke provinsi
export const kota = pgTable(
  'kota',
  {
    id: serial('id').primaryKey(),
    provinsiId: integer('provinsi_id')
      .notNull()
      .references(() => provinsi.id),
    nama: varchar('nama', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('kota_provinsi_nama_uniq').on(t.provinsiId, t.nama)],
)

// pasar — pasar tradisional, FK ke kota
export const pasar = pgTable(
  'pasar',
  {
    id: serial('id').primaryKey(),
    kotaId: integer('kota_id')
      .notNull()
      .references(() => kota.id),
    nama: varchar('nama', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('pasar_kota_nama_uniq').on(t.kotaId, t.nama)],
)

// harga_harian — fact table semua level (0-3)
export const hargaHarian = pgTable(
  'harga_harian',
  {
    id: serial('id').primaryKey(),
    komoditasId: integer('komoditas_id')
      .notNull()
      .references(() => komoditas.id),
    level: smallint('level').notNull(),
    provinsiId: integer('provinsi_id').references(() => provinsi.id),
    kotaId: integer('kota_id').references(() => kota.id),
    pasarId: integer('pasar_id').references(() => pasar.id),
    harga: numeric('harga', { precision: 12, scale: 2 }).notNull(),
    tanggal: date('tanggal').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'chk_level_fk',
      sql`
    (level = 0 AND provinsi_id IS NULL AND kota_id IS NULL AND pasar_id IS NULL) OR
    (level = 1 AND provinsi_id IS NOT NULL AND kota_id IS NULL AND pasar_id IS NULL) OR
    (level = 2 AND provinsi_id IS NOT NULL AND kota_id IS NOT NULL AND pasar_id IS NULL) OR
    (level = 3 AND provinsi_id IS NOT NULL AND kota_id IS NOT NULL AND pasar_id IS NOT NULL)
  `,
    ),
    unique('harga_harian_upsert_uniq')
      .on(t.komoditasId, t.level, t.provinsiId, t.kotaId, t.pasarId, t.tanggal)
      .nullsNotDistinct(),
    index('idx_harga_komoditas_level_tanggal').on(t.komoditasId, t.level, t.tanggal),
    index('idx_harga_komoditas_level_prov_tanggal')
      .on(t.komoditasId, t.level, t.provinsiId, t.tanggal)
      .where(sql`level >= 1`),
  ],
)

// insight_cache — LLM response cache
export const insightCache = pgTable(
  'insight_cache',
  {
    id: serial('id').primaryKey(),
    komoditasId: integer('komoditas_id')
      .notNull()
      .references(() => komoditas.id),
    provinsiId: integer('provinsi_id').references(() => provinsi.id),
    cacheDate: date('cache_date').notNull(),
    insight: text('insight').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('insight_cache_upsert_uniq')
      .on(t.komoditasId, t.provinsiId, t.cacheDate)
      .nullsNotDistinct(),
    index('idx_insight_lookup').on(t.komoditasId, t.provinsiId, t.cacheDate),
  ],
)
