#!/usr/bin/env bash
# Restore dump database ke container Postgres produksi (deploy/).
# Jalankan di VPS dari folder deploy/.
#
#   bash scripts/restore-db.sh ~/pantau_pangan.dump
#
# Amannya: api/web di-stop dulu selama restore, lalu di-start lagi.
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DEPLOY_DIR"

DUMP="${1:?Usage: bash scripts/restore-db.sh <file.dump>}"
if [[ ! -f "$DUMP" ]]; then
  echo "ERROR: file tidak ditemukan: $DUMP" >&2
  exit 1
fi

# Pastikan container db jalan
if ! docker compose ps db --status running >/dev/null 2>&1; then
  echo "==> Menjalankan service db..."
  docker compose up -d db
fi

echo "==> Menunggu db sehat..."
until docker compose exec -T db pg_isready -U "${POSTGRES_USER:-pantau}" -d "${POSTGRES_DB:-pantau_pangan}" >/dev/null 2>&1; do
  sleep 2
done

echo "==> Stop api/web selama restore..."
docker compose stop api web 2>/dev/null || true

echo "==> Restore $DUMP ..."
# --no-owner: owner lokal (postgres) tidak ada di container
# --clean --if-exists: idempotent untuk restore ulang
docker compose exec -T db \
  pg_restore --no-owner --no-privileges --clean --if-exists \
  -U "${POSTGRES_USER:-pantau}" -d "${POSTGRES_DB:-pantau_pangan}" <"$DUMP"

echo "==> Start api/web kembali..."
docker compose start api web 2>/dev/null || true

echo "==> Verifikasi:"
docker compose exec -T db psql -U "${POSTGRES_USER:-pantau}" -d "${POSTGRES_DB:-pantau_pangan}" -c \
  "SELECT (SELECT count(*) FROM komoditas) AS komoditas, (SELECT count(*) FROM provinsi) AS provinsi, (SELECT count(*) FROM kota) AS kota, (SELECT count(*) FROM pasar) AS pasar, (SELECT count(*) FROM harga_harian) AS harga_harian, min(tanggal) AS data_dari, max(tanggal) AS data_sampai FROM harga_harian;" 2>/dev/null || true