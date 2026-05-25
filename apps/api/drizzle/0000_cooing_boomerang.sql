CREATE TABLE "harga_harian" (
	"id" serial PRIMARY KEY NOT NULL,
	"komoditas_id" integer NOT NULL,
	"level" smallint NOT NULL,
	"provinsi_id" integer,
	"kota_id" integer,
	"pasar_id" integer,
	"harga" numeric(12, 2) NOT NULL,
	"tanggal" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "harga_harian_upsert_uniq" UNIQUE NULLS NOT DISTINCT("komoditas_id","level","provinsi_id","kota_id","pasar_id","tanggal"),
	CONSTRAINT "chk_level_fk" CHECK (
    (level = 0 AND provinsi_id IS NULL AND kota_id IS NULL AND pasar_id IS NULL) OR
    (level = 1 AND provinsi_id IS NOT NULL AND kota_id IS NULL AND pasar_id IS NULL) OR
    (level = 2 AND provinsi_id IS NOT NULL AND kota_id IS NOT NULL AND pasar_id IS NULL) OR
    (level = 3 AND provinsi_id IS NOT NULL AND kota_id IS NOT NULL AND pasar_id IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "insight_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"komoditas_id" integer NOT NULL,
	"provinsi_id" integer,
	"cache_date" date NOT NULL,
	"insight" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "insight_cache_upsert_uniq" UNIQUE NULLS NOT DISTINCT("komoditas_id","provinsi_id","cache_date")
);
--> statement-breakpoint
CREATE TABLE "komoditas" (
	"id" serial PRIMARY KEY NOT NULL,
	"tree_id" varchar(10) NOT NULL,
	"com_id" integer NOT NULL,
	"nama" varchar(100) NOT NULL,
	"kategori" varchar(50) NOT NULL,
	"satuan" varchar(20) DEFAULT 'kg',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "komoditas_com_id_unique" UNIQUE("com_id")
);
--> statement-breakpoint
CREATE TABLE "kota" (
	"id" serial PRIMARY KEY NOT NULL,
	"provinsi_id" integer NOT NULL,
	"nama" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kota_provinsi_nama_uniq" UNIQUE("provinsi_id","nama")
);
--> statement-breakpoint
CREATE TABLE "pasar" (
	"id" serial PRIMARY KEY NOT NULL,
	"kota_id" integer NOT NULL,
	"nama" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pasar_kota_nama_uniq" UNIQUE("kota_id","nama")
);
--> statement-breakpoint
CREATE TABLE "provinsi" (
	"id" serial PRIMARY KEY NOT NULL,
	"bi_id" integer NOT NULL,
	"nama" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provinsi_bi_id_unique" UNIQUE("bi_id"),
	CONSTRAINT "provinsi_nama_unique" UNIQUE("nama")
);
--> statement-breakpoint
ALTER TABLE "harga_harian" ADD CONSTRAINT "harga_harian_komoditas_id_komoditas_id_fk" FOREIGN KEY ("komoditas_id") REFERENCES "public"."komoditas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harga_harian" ADD CONSTRAINT "harga_harian_provinsi_id_provinsi_id_fk" FOREIGN KEY ("provinsi_id") REFERENCES "public"."provinsi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harga_harian" ADD CONSTRAINT "harga_harian_kota_id_kota_id_fk" FOREIGN KEY ("kota_id") REFERENCES "public"."kota"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harga_harian" ADD CONSTRAINT "harga_harian_pasar_id_pasar_id_fk" FOREIGN KEY ("pasar_id") REFERENCES "public"."pasar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight_cache" ADD CONSTRAINT "insight_cache_komoditas_id_komoditas_id_fk" FOREIGN KEY ("komoditas_id") REFERENCES "public"."komoditas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight_cache" ADD CONSTRAINT "insight_cache_provinsi_id_provinsi_id_fk" FOREIGN KEY ("provinsi_id") REFERENCES "public"."provinsi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kota" ADD CONSTRAINT "kota_provinsi_id_provinsi_id_fk" FOREIGN KEY ("provinsi_id") REFERENCES "public"."provinsi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pasar" ADD CONSTRAINT "pasar_kota_id_kota_id_fk" FOREIGN KEY ("kota_id") REFERENCES "public"."kota"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_harga_komoditas_level_tanggal" ON "harga_harian" USING btree ("komoditas_id","level","tanggal");--> statement-breakpoint
CREATE INDEX "idx_harga_komoditas_level_prov_tanggal" ON "harga_harian" USING btree ("komoditas_id","level","provinsi_id","tanggal") WHERE level >= 1;--> statement-breakpoint
CREATE INDEX "idx_insight_lookup" ON "insight_cache" USING btree ("komoditas_id","provinsi_id","cache_date");