#!/usr/bin/env bash
# Backup database dev lokal (sumber data history) → file dump (custom format).
# Jalankan di mesin lokal (repo root). Membaca DATABASE_URL dari .env.
#
#   bash deploy/scripts/backup-dev-db.sh [output.dump]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="$ROOT_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE tidak ditemukan. Copy dari .env.example dulu." >&2
  exit 1
fi

DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
if [[ -z "$DATABASE_URL" ]]; then
  echo "ERROR: DATABASE_URL tidak ditemukan di $ENV_FILE." >&2
  exit 1
fi

OUT="${1:-pantau_pangan.dump}"

echo "Backup: $DATABASE_URL"
echo "Output: $OUT"
pg_dump "$DATABASE_URL" --format=custom --file="$OUT"

echo "Selesai. Ukuran: $(du -h "$OUT" | cut -f1)"
echo "Transfer ke VPS: scp -i ~/Documents/eksplorasi/hermes-key.pem \"$OUT\" ubuntu@VPS_IP:~/"