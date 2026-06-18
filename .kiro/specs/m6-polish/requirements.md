# Requirements Document

## Introduction

M6 adalah milestone terakhir sebelum deploy (M7). Fokusnya adalah memastikan Pantau Pangan
siap untuk production: tampil benar di kedua tema (dark/light), cron scraper berjalan otomatis,
SEO minimal untuk sharing di sosmed, tidak blank-screen saat terjadi error tak terduga, navigasi
keyboard dan struktur halaman yang dapat dipahami screen reader, serta rate limiting LLM untuk
mencegah abuse.

Semua fitur visual (bubble chart, modal, filter) sudah selesai di M1–M5. M6 bersifat
cross-cutting: memperbaiki kelemahan yang tersebar di seluruh codebase tanpa menambah fitur baru.

## Glossary

- **Page**: Komponen `apps/web/app/page.tsx` — halaman utama Next.js
- **Layout**: Komponen `apps/web/app/layout.tsx` — root layout Next.js yang wrap semua halaman
- **ThemeToggle**: Komponen toggle dark/light mode di header halaman utama
- **Light_Mode**: State aktif ketika elemen `<html>` tidak memiliki class `dark`
- **Dark_Mode**: State aktif ketika elemen `<html>` memiliki class `dark`
- **BubbleTooltip**: Komponen tooltip yang muncul saat hover bubble komoditas
- **KomoditasModal**: Komponen dialog detail komoditas (M5)
- **Scheduler**: Modul Bun native cron yang berjalan di dalam proses `apps/api`
- **Orchestrator**: Fungsi `runScraper()` di `packages/scraper` yang melakukan fetch dan upsert
- **WIB**: Waktu Indonesia Barat (UTC+7)
- **ErrorBoundary**: React class component yang menangkap JavaScript error di subtree-nya
- **RateLimiter**: Middleware Hono yang membatasi jumlah request LLM concurrent per IP
- **Skip_Link**: Elemen `<a>` tersembunyi yang muncul saat di-focus dan membawa keyboard user langsung ke konten utama
- **ARIA_Landmark**: Elemen HTML dengan role semantik (`main`, `navigation`, `banner`, `complementary`) yang dikenali screen reader
- **Open_Graph**: Protokol metadata `<meta property="og:*">` untuk preview link di sosmed

## Requirements

---

### Requirement 1: Light Mode Theming Menyeluruh

**User Story:** Sebagai pengguna yang memilih mode terang, saya ingin semua elemen UI tampil dengan
kontras yang benar di background putih, sehingga saya dapat menggunakan aplikasi tanpa silau atau
teks yang tidak terbaca.

#### Acceptance Criteria

1. WHILE Light_Mode aktif, THE Page SHALL tidak menggunakan class hardcode `from-zinc-950`,
   `via-slate-950`, atau `to-black` pada elemen background utama

2. WHILE Light_Mode aktif, THE Page SHALL menampilkan teks konten menggunakan class
   `text-foreground` (bukan `text-white`) sehingga warna teks mengikuti CSS variable tema
   dan memenuhi rasio kontras WCAG AA minimum 4,5:1 terhadap background

3. WHILE Light_Mode aktif, THE BubbleTooltip SHALL tidak menggunakan class hardcode
   `bg-zinc-900/95`, `text-white`, atau `border-white/10` — sebagai gantinya menggunakan
   class Tailwind yang merespons CSS variable tema (`bg-popover`, `text-popover-foreground`,
   `border-border`) dengan rasio kontras minimum 4,5:1

4. WHILE Light_Mode aktif, THE KomoditasModal SHALL menampilkan seluruh teks konten dengan
   rasio kontras minimum 4,5:1 terhadap background modal menggunakan token warna shadcn/ui

5. WHILE Light_Mode aktif, THE ThemeToggle SHALL tidak menggunakan class hardcode
   `bg-zinc-900/80` — ikon toggle SHALL memiliki rasio kontras minimum 3:1 terhadap
   background tombol

6. WHILE Light_Mode aktif, THE Page header elements (tombol refresh, ProvinsiFilter trigger,
   SearchFilter input) SHALL tidak menggunakan class hardcode `bg-zinc-900/80`,
   `border-white/10`, atau `text-zinc-300` yang tidak responsif terhadap tema

7. WHEN pengguna beralih dari Dark_Mode ke Light_Mode, THE Page SHALL memperbarui semua
   warna UI dalam waktu kurang dari 300ms tanpa perlu reload halaman

8. WHEN pengguna beralih dari Light_Mode ke Dark_Mode, THE Page SHALL memperbarui semua
   warna UI dalam waktu kurang dari 300ms tanpa perlu reload halaman

---

### Requirement 2: Cron Scheduler Production

**User Story:** Sebagai operator yang men-deploy aplikasi ke Railway, saya ingin scraper berjalan
otomatis setiap hari tanpa intervensi manual, sehingga data harga pangan selalu diperbarui.

#### Acceptance Criteria

1. WHEN proses `apps/api` startup, THE Scheduler SHALL mendaftarkan tiga jadwal scrape:
   pukul 07.00 WIB (cron `0 0 7 * * *` TZ=Asia/Jakarta), 11.00 WIB, dan 15.00 WIB setiap hari

2. WHEN Scheduler menjalankan jadwal scrape, THE Scheduler SHALL memanggil Orchestrator dan
   menerima objek hasil yang memuat: `rowsInserted`, `rowsUpserted`, `maxTanggal` (string
   YYYY-MM-DD atau null), `durationMs`, dan `errors` (array error per komoditas)

3. IF objek hasil dari Orchestrator memiliki `maxTanggal` sama dengan tanggal hari ini dalam
   WIB (UTC+7), THEN THE Scheduler SHALL menetapkan flag `todayDone = true` dan mencatat log
   sukses dengan semua field objek hasil

4. IF `todayDone = true` saat jadwal run ke-2 atau ke-3 akan dieksekusi, THEN THE Scheduler
   SHALL melewati eksekusi Orchestrator dan mencatat log skip dengan alasan "data hari ini
   sudah tersedia"

5. IF semua tiga run selesai dan tidak ada yang menghasilkan `maxTanggal` sama dengan hari ini,
   THEN THE Scheduler SHALL mencatat log warning yang menyatakan data hari ini tidak berhasil
   diperoleh setelah 3 percobaan

6. WHEN Orchestrator selesai dijalankan, THE Scheduler SHALL mencatat structured log yang
   memuat semua field objek hasil dari kriteria 2

7. IF Orchestrator melempar error yang tidak tertangani, THEN THE Scheduler SHALL menangkap
   error tersebut, mencatatnya ke log, dan melanjutkan proses tanpa mengakhiri proses API

8. THE Scheduler SHALL menggunakan Bun native cron (`Bun.cron` atau package `node-cron` yang
   kompatibel) — tidak menggunakan `setInterval` atau `setTimeout` untuk penjadwalan

---

### Requirement 3: Retry Adaptif Cron

**User Story:** Sebagai operator, saya ingin scraper berhenti melakukan retry begitu data hari ini
sudah berhasil di-scrape, sehingga tidak ada request berlebih ke server BI.

#### Acceptance Criteria

1. THE Scheduler SHALL menyimpan status run harian menggunakan flag boolean `todayDone`
   dalam module-level state yang diinisialisasi ke `false` saat proses API startup; flag ini
   di-reset ke `false` setiap tengah malam WIB (cron `0 0 0 * * *` TZ=Asia/Jakarta)

2. WHEN Scheduler akan menjalankan run ke-2 atau ke-3, THE Scheduler SHALL memeriksa nilai
   `todayDone` sebelum memanggil Orchestrator

3. IF `todayDone = true`, THEN THE Scheduler SHALL melewati jadwal tersebut, tidak memanggil
   Orchestrator, dan mencatat log: `{ skipped: true, reason: "data hari ini sudah tersedia" }`

4. WHEN Orchestrator mengembalikan hasil sukses dengan `maxTanggal` sama dengan hari ini WIB,
   THE Scheduler SHALL menetapkan `todayDone = true`

5. IF nilai `todayDone` tidak dapat dibaca (state tidak terinisialisasi atau corrupt), THEN
   THE Scheduler SHALL memperlakukan kondisi ini sebagai `todayDone = false` dan tetap
   menjalankan Orchestrator

6. FOR ALL kombinasi {runNumber ∈ {1, 2, 3}, todayDone ∈ {true, false}},
   THE Scheduler SHALL menjalankan Orchestrator jika dan hanya jika `todayDone = false`
   (properti kebenaran: tidak ada eksekusi Orchestrator yang tidak perlu)

---

### Requirement 4: SEO dan Open Graph Metadata

**User Story:** Sebagai pengguna yang berbagi link Pantau Pangan di media sosial, saya ingin
preview link menampilkan judul, deskripsi, dan gambar yang representatif, sehingga orang lain
memahami apa yang dibagikan sebelum mengkliknya.

#### Acceptance Criteria

1. THE Layout SHALL menyertakan `<meta property="og:title">` dengan nilai "Pantau Pangan"

2. THE Layout SHALL menyertakan `<meta property="og:description">` dengan deskripsi produk
   antara 1 hingga 160 karakter

3. THE Layout SHALL menyertakan `<meta property="og:image">` dengan URL absolut menuju
   file gambar OG image berukuran minimal 1200×630 piksel yang tersedia di `public/`

4. THE Layout SHALL menyertakan `<meta property="og:url">` dengan URL kanonik aplikasi

5. THE Layout SHALL menyertakan `<meta property="og:type">` dengan nilai `"website"`

6. THE Layout SHALL menyertakan `<meta name="twitter:card">` dengan nilai
   `"summary_large_image"`

7. THE Layout SHALL menyertakan `<meta name="twitter:title">` dengan nilai yang sama
   dengan `og:title`

8. THE Layout SHALL menyertakan `<meta name="twitter:description">` dengan nilai yang sama
   dengan `og:description`

9. THE Layout SHALL menyertakan `<meta name="twitter:image">` dengan URL absolut yang sama
   dengan `og:image` agar Twitter card merender preview gambar besar

10. THE Layout SHALL menyertakan `<link rel="canonical">` dengan URL kanonik aplikasi

11. WHERE `NEXT_PUBLIC_SITE_URL` environment variable tersedia, THE Layout SHALL menggunakan
    nilai tersebut sebagai base URL untuk semua meta tag yang membutuhkan URL absolut

12. IF `NEXT_PUBLIC_SITE_URL` tidak tersedia, THEN THE Layout SHALL menggunakan URL fallback
    `"https://pantaupangan.id"` sebagai base URL

---

### Requirement 5: React Error Boundary

**User Story:** Sebagai pengguna akhir, saya ingin melihat pesan error yang informatif dan opsi
untuk mencoba lagi ketika terjadi error tak terduga di aplikasi, sehingga saya tidak terjebak
di blank screen.

#### Acceptance Criteria

1. THE Layout SHALL merender komponen `ErrorBoundary` sebagai wrapper terluar di dalam `<body>`,
   mencakup seluruh subtree aplikasi

2. IF komponen mana pun di subtree aplikasi melempar JavaScript error selama fase render atau
   lifecycle method (bukan event handler), THEN THE ErrorBoundary SHALL menangkap error
   tersebut dan merender fallback UI menggantikan subtree yang error

3. WHEN THE ErrorBoundary menangkap error, THE ErrorBoundary SHALL menampilkan fallback
   yang memuat minimal: (a) teks yang menyatakan terjadi kesalahan tak terduga dalam Bahasa
   Indonesia, dan (b) instruksi tindakan yang dapat diambil pengguna

4. WHEN THE ErrorBoundary menampilkan fallback, THE ErrorBoundary SHALL menyertakan tombol
   "Muat Ulang Halaman" yang memanggil `window.location.reload()` ketika diklik

5. IF error terjadi di dalam komponen modal (`KomoditasModal`), THE ErrorBoundary SHALL
   menangkap error tersebut dan merender fallback; setelah pengguna klik "Muat Ulang Halaman",
   URL bar harus dapat diakses dan halaman harus dapat dimuat ulang secara normal

6. WHEN THE ErrorBoundary menangkap error, THE ErrorBoundary SHALL memanggil `console.error`
   dengan dua argumen: objek `error` dan string `componentStack` untuk keperluan debugging

---

### Requirement 6: Aksesibilitas Dasar — Struktur Halaman

**User Story:** Sebagai pengguna yang menggunakan keyboard atau screen reader, saya ingin dapat
memahami struktur halaman dan menavigasi ke konten utama dengan cepat, sehingga saya tidak
perlu menyelesaikan semua elemen header setiap kali halaman dimuat.

#### Acceptance Criteria

1. THE Page SHALL menyertakan Skip_Link sebagai elemen pertama yang dapat di-focus di DOM,
   dengan teks "Lewati ke konten utama" dan `href="#main-content"`

2. WHILE Skip_Link tidak di-focus, THE Page SHALL menyembunyikan Skip_Link secara visual
   menggunakan teknik `sr-only` atau `clip-path` tanpa menghapusnya dari tab order (property
   `tabIndex` tidak boleh bernilai -1)

3. WHEN Skip_Link di-focus oleh keyboard user (via Tab), THE Page SHALL menampilkan
   Skip_Link secara visual dengan posisi dan label yang terlihat jelas di viewport

4. THE Page SHALL menyertakan elemen `<main>` dengan `id="main-content"` sebagai container
   langsung area bubble chart; elemen ini harus dapat menerima fokus programatik
   (memiliki `tabIndex="-1"`)

5. THE Page SHALL menggunakan elemen `<header>` sebagai semantic container untuk area kontrol
   di bagian atas halaman (logo, filter, toggle tema)

6. THE Page SHALL menyertakan elemen `<nav>` dengan `aria-label="Filter dan navigasi"`
   sebagai wrapper untuk semua kontrol filter (timeframe, provinsi, search)

7. THE Page SHALL memastikan semua elemen interaktif (tombol, input, select) dapat
   di-focus dan dioperasikan menggunakan keyboard saja tanpa mouse

---

### Requirement 7: Aksesibilitas Dasar — Focus Management Modal

**User Story:** Sebagai pengguna keyboard, saya ingin fokus berpindah ke dalam modal saat modal
dibuka dan kembali ke elemen yang memicu modal saat modal ditutup, sehingga saya tidak
kehilangan posisi navigasi.

#### Acceptance Criteria

1. WHEN `KomoditasModal` dibuka, THE KomoditasModal SHALL memindahkan keyboard focus ke tombol
   tutup (jika ada) sebagai prioritas pertama, atau elemen pertama yang dapat di-focus di dalam
   modal sebagai fallback

2. WHILE `KomoditasModal` terbuka, THE KomoditasModal SHALL memerangkap Tab dan Shift+Tab di
   dalam elemen-elemen yang dapat di-focus di dalam modal, dengan wrap-around: Tab pada elemen
   terakhir kembali ke elemen pertama, Shift+Tab pada elemen pertama kembali ke elemen terakhir

3. WHEN `KomoditasModal` ditutup via tombol tutup atau tekan Escape, THE KomoditasModal SHALL
   mengembalikan keyboard focus ke bubble SVG `<circle>` yang memicu pembukaan modal; jika
   elemen tersebut tidak ada di DOM, fokus dikembalikan ke `document.body`

4. WHILE `KomoditasModal` terbuka, THE KomoditasModal SHALL menyertakan atribut
   `aria-modal="true"` dan `role="dialog"` pada elemen root dialog

5. WHILE `KomoditasModal` terbuka, THE KomoditasModal SHALL menyertakan `aria-labelledby`
   yang merujuk ke `id` dari elemen heading nama komoditas di dalam modal

---

### Requirement 8: Rate Limiting LLM

**User Story:** Sebagai operator, saya ingin membatasi satu request LLM concurrent per IP address,
sehingga satu pengguna tidak dapat menguras kuota OpenRouter dengan banyak request simultan.

#### Acceptance Criteria

1. THE RateLimiter SHALL di-mount sebagai Hono middleware pada route
   `GET /komoditas/:id/insight` sebelum handler service dipanggil

2. THE RateLimiter SHALL mengekstrak IP address dari header `X-Forwarded-For` (ambil segmen
   pertama jika ada koma) dengan fallback ke `c.req.header('x-real-ip')` lalu ke string
   literal `"unknown"` jika kedua header tidak tersedia

3. WHEN suatu IP address memiliki satu request LLM yang sedang diproses (in-flight),
   THE RateLimiter SHALL menolak request baru dari IP yang sama dengan status HTTP 429 dan
   body JSON `{ "error": "Terlalu banyak request. Coba lagi sesaat.", "status": 429 }`

4. WHEN request LLM dari suatu IP address selesai dengan sukses, THE RateLimiter SHALL
   mendekremen counter in-flight IP tersebut sebesar 1; jika counter mencapai 0, entry IP
   dihapus dari Map

5. IF request LLM menghasilkan error atau melebihi timeout 30 detik, THEN THE RateLimiter
   SHALL tetap mendekremen counter dan menghapus entry IP (sama seperti sukses) sehingga
   tidak terjadi deadlock

6. WHEN cache hit terjadi (insight sudah tersedia di `insight_cache` untuk hari ini),
   THE RateLimiter SHALL tidak menginkremen counter in-flight sebelum meneruskan ke handler,
   sehingga cache hit tidak mengonsumsi slot concurrent

7. FOR ALL sequence request dari IP yang sama yang diproses hingga selesai, jumlah slot
   concurrent yang tercatat di RateLimiter SHALL sama dengan nol setelah semua request
   selesai (properti: tidak ada slot yang bocor)

8. THE RateLimiter SHALL menggunakan in-memory `Map<string, number>` untuk menyimpan jumlah
   request in-flight per IP — tidak membutuhkan Redis atau external store untuk V1
