# Deploy Pantau Pangan ke VPS (Docker Compose)

Deploy monorepo ke satu VPS (AWS EC2 Ubuntu) dengan Docker Compose: Postgres,
API Hono (termasuk scheduler scraper), web Next.js, dan nginx reverse proxy.

```
                        ┌────────────────────────────── VPS ──────────────────────────────┐
  Browser ──:80/:443──▶ │ nginx ──▶ /api/  ──▶ api (Bun, :3001) ──▶ db (Postgres 16)     │
                        │           └───────▶ /  ────▶ web (Next, :3000)                 │
                        └────────────────────────────────────────────────────────────────┘
```

- **Scraper otomatis**: berjalan di dalam proses API (07:00 / 11:00 / 15:00 WIB).
  Selama container `api` hidup, data harian terus terkumpul.
- **Data history (Mei/Juni–sekarang)**: dipindahkan dari database lokal via
  `pg_dump` → `pg_restore` (lihat bagian "Migrasi data history").

---

## 1. Prasyarat

| Item       | Keterangan                                                        |
| ---------- | ----------------------------------------------------------------- |
| VPS        | AWS EC2 Ubuntu 22.04/24.04, min. **2 GB RAM** (4 GB disarankan)   |
| Akses      | SSH key pair (contoh: `~/Documents/eksplorasi/hermes-key.pem`)    |
| Firewall   | Security group / UFW: buka port **22**, **80**, **443**           |
| Domain     | Opsional — tanpa domain bisa akses via `http://VPS_IP`            |
| PostgreSQL | **15+** (container memakai 16; schema butuh `NULLS NOT DISTINCT`) |

> Build Next.js butuh ~2 GB RAM. Instance `t3.medium` (4 GB) atau `t4g.medium`
> (ARM, lebih murah) aman. Untuk `t3.small` (2 GB) tambah swap dulu.

## 2. Provisioning AWS EC2 (ringkas)

1. Launch instance: Ubuntu 24.04, t3.medium (atau t4g.medium).
2. Security group — inbound:
   - `22/tcp` (SSH, dari IP kamu saja)
   - `80/tcp`, `443/tcp` (web)
3. Buat/download key pair (`hermes-key.pem`), lalu `chmod 600`.
4. (Opsional) Elastic IP supaya IP tidak berubah saat restart.
5. A record domain → IP VPS (jika pakai domain).

## 3. Bootstrap server (sekali saja)

```bash
ssh -i ~/Documents/eksplorasi/hermes-key.pem ubuntu@VPS_IP

# Install Docker + clone repo + siapkan deploy/.env
bash <(curl -sL https://raw.githubusercontent.com/rihid/pantau-pangan/main/deploy/scripts/setup-vps.sh)

# Logout/login sekali agar grup docker aktif (atau: newgrp docker)
```

> Repo ini privat — VPS butuh akses. Buat **deploy key** di GitHub
> (Settings → Deploy keys) dan letakkan di `~/.ssh/`, atau clone via HTTPS
> dengan token. Alternatif: `git clone` manual lalu jalankan script.
>
> Jika `setup-vps.sh` tidak bisa diambil via raw URL (repo privat), jalankan
> langkah manual: install Docker (`curl -fsSL https://get.docker.com | sh`),
> `git clone` repo, lalu lanjut ke langkah 4.

## 4. Konfigurasi environment

```bash
cd ~/pantau-pangan/deploy
nano .env
```

Isi minimal:

```bash
POSTGRES_USER=pantau
POSTGRES_PASSWORD=<password-kuat-alfanumerik>   # tanpa karakter khusus!
POSTGRES_DB=pantau_pangan

GENERALCOMPUTE_API_KEY=gc_...
OPENROUTER_API_KEY=sk-or-...

# Tanpa domain:
NEXT_PUBLIC_API_URL=http://VPS_IP/api
# Dengan domain:
NEXT_PUBLIC_API_URL=https://pantaupangan.id/api
```

> `NEXT_PUBLIC_API_URL` di-inline saat build image web. Ganti → **rebuild**.

## 5. Build & start

```bash
cd ~/pantau-pangan/deploy
docker compose up -d --build

docker compose ps                 # semua service harus healthy
curl http://VPS_IP/api/           # → {"status":"ok","service":"pantau-pangan-api"}
curl -I http://VPS_IP/            # → 200 (halaman web)
```

## 6. Migrasi data history (Mei/Juni → produksi) ⭐

Data ~398k baris `harga_harian` (2026-05-21 s.d. sekarang) ada di Postgres lokal.
Pindahkan dengan `pg_dump` (custom format) + `pg_restore`.

**Lokal (mesin kamu):**

```bash
cd ~/Documents/eksplorasi/pantau-pangan
bash deploy/scripts/backup-dev-db.sh pantau_pangan.dump

scp -i ~/Documents/eksplorasi/hermes-key.pem \
  pantau_pangan.dump ubuntu@VPS_IP:~/
```

**VPS:**

```bash
cd ~/pantau-pangan/deploy
bash scripts/restore-db.sh ~/pantau_pangan.dump
```

Script restore: stop `api`/`web` → `pg_restore --no-owner --clean` → start lagi →
print verifikasi (jumlah baris + rentang tanggal).

> Aman dijalankan kapan pun: semua insert scraper memakai
> `ON CONFLICT DO NOTHING`, jadi tidak ada duplikat setelah restore.
> `insight_cache` ikut terbawa (ephemeral — regenerasi otomatis).

## 7. SSL (Let's Encrypt) — opsional tapi disarankan

Prasyarat: domain sudah A record → VPS, dan `docker compose up -d` sudah jalan
(nginx aktif di :80).

```bash
cd ~/pantau-pangan/deploy

# 1. Terbitkan sertifikat (webroot — nginx sudah melayani /.well-known)
docker compose --profile tools run --rm certbot certonly \
  --webroot -w /var/www/certbot -d pantaupangan.id -d www.pantaupangan.id

# 2. Aktifkan konfigurasi SSL
cd nginx/conf.d
mv default.conf default.conf.http-backup
#   edit ssl.conf.example → ganti DOMAIN dengan domain asli
mv ssl.conf.example ssl.conf
cd ../..
docker compose exec nginx nginx -s reload
```

**Renewal otomatis** (crontab `ubuntu`):

```bash
crontab -e
# tambahkan:
0 3 * * * cd /home/ubuntu/pantau-pangan/deploy && docker compose --profile tools run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload
```

## 8. Operasional harian

| Aksi                   | Perintah                                                                      |
| ---------------------- | ----------------------------------------------------------------------------- |
| Lihat status           | `docker compose ps`                                                           |
| Log API / scraper      | `docker compose logs -f api`                                                  |
| Log web                | `docker compose logs -f web`                                                  |
| Jalankan scrape manual | `docker compose exec api bun run dist/index.js` (bundled CLI)                 |
| Backup DB produksi     | `docker compose exec -T db pg_dump -U pantau -Fc pantau_pangan > backup.dump` |
| Update deploy          | `git pull && docker compose up -d --build`                                    |
| Migration schema baru  | `docker compose --profile tools run --rm migrate`                             |

> Migration future: `migrate` menjalankan `drizzle-kit migrate` dari repo
> (sudah ada migration `0000`). Karena restore membawa `__drizzle_migrations`,
> hanya migration baru yang akan diterapkan.

## 9. Troubleshooting

| Gejala                        | Penyebab umum                               | Solusi                                            |
| ----------------------------- | ------------------------------------------- | ------------------------------------------------- |
| `curl :80` timeout            | Security group belum buka 80                | Buka port 80/443 di SG                            |
| `502 Bad Gateway` di `/api/`  | API belum healthy                           | `docker compose logs api`; tunggu start_period    |
| Build OOM (`Killed`)          | RAM < 2 GB                                  | Tambah swap: `sudo fallocate -l 2G /swapfile`     |
| Data tidak bertambah harian   | Container `api` tidak hidup 24/7            | `docker compose up -d`; cek `logs api` jam 07 WIB |
| `pg_restore` error owner      | Owner dump (`postgres`) beda dari container | Sudah ditangani `--no-owner`                      |
| Password dengan `@`/`#` gagal | Karakter khusus merusak connection string   | Ganti password alfanumerik                        |
