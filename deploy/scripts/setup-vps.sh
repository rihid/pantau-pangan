#!/usr/bin/env bash
# Bootstrap server Ubuntu (AWS EC2) untuk Pantau Pangan:
#   1. Install Docker Engine + Compose plugin
#   2. Clone repo (branch main)
#   3. Siapkan deploy/.env dari template
#
# Jalankan SEKALI di VPS sebagai user dengan sudo (default: ubuntu).
# Setelah selesai: isi deploy/.env, lalu ikuti langkah build di README.
#
#   bash setup-vps.sh [repo_url] [branch]
#   repo_url default: git@github.com:rihid/pantau-pangan.git
#   NOTE: repo privat — VPS butuh SSH key (deploy key) atau HTTPS + token.
set -euo pipefail

REPO_URL="${1:-git@github.com:rihid/pantau-pangan.git}"
BRANCH="${2:-main}"

echo "==> [1/3] Install Docker Engine + Compose plugin"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "    Docker sudah terpasang: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "    User '$USER' ditambahkan ke grup docker."
  echo "    NOTE: logout/login (atau 'newgrp docker') agar grup aktif."
fi

echo "==> [2/3] Clone repo (branch $BRANCH)"
if [[ -d pantau-pangan/.git ]]; then
  echo "    Repo sudah ada — pull terbaru."
  cd pantau-pangan
  git fetch origin
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL"
  cd pantau-pangan
fi

echo "==> [3/3] Siapkan deploy/.env"
cd deploy
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "    Template dibuat: $(pwd)/.env"
else
  echo "    deploy/.env sudah ada — tidak diubah."
fi

echo
echo "SELESAI. Langkah berikutnya:"
echo "  1. nano deploy/.env   # isi password DB, LLM key, NEXT_PUBLIC_API_URL"
echo "  2. docker compose up -d --build"
echo "  3. Restore data history: bash scripts/restore-db.sh ~/pantau_pangan.dump"
echo "     (backup dibuat lokal via bash deploy/scripts/backup-dev-db.sh)"