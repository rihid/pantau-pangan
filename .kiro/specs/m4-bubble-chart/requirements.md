# Requirements Document

## Introduction

> M4 — Bubble Chart Frontend

Milestone M4 membangun halaman utama Pantau Pangan: bubble chart interaktif yang memvisualisasikan pergerakan harga 21 komoditas pangan strategis nasional. Data diambil dari API backend M3 (Hono, port 3001) menggunakan TanStack Query. Visualisasi dirender dengan D3.js force simulation — setiap bubble merepresentasikan satu komoditas, dengan ukuran dan warna yang mencerminkan volatilitas harga sesuai timeframe aktif. M4 juga mencakup setup infrastruktur frontend (TanStack Query provider, shadcn/ui) yang menjadi fondasi untuk M5 (modal detail) dan M6 (polish).

## Glossary

- **Bubble_Chart**: Komponen D3.js force simulation yang merender 21 komoditas sebagai lingkaran interaktif
- **Bubble**: Satu lingkaran SVG yang merepresentasikan satu komoditas dalam Bubble_Chart
- **BubbleData**: Tipe data dari `packages/shared` — berisi `komoditasId`, `nama`, `kategori`, `harga`, `perubahan`, `radius`, `color`
- **Timeframe**: Periode waktu untuk kalkulasi % perubahan — nilai valid: `1D`, `1W`, `1M`, `3M`, `1Y`
- **ProvinsiId**: Integer ID provinsi untuk filter geografis — `0` berarti nasional (semua provinsi)
- **Sparkline**: Mini line chart di dalam bubble yang menampilkan tren harga historis singkat
- **Force_Simulation**: Algoritma D3.js yang mengatur posisi bubble secara fisika (collision detection, centering)
- **Query_Client**: Instance TanStack Query yang di-provide ke seluruh aplikasi Next.js
- **API_Client**: Fungsi-fungsi fetch ke `NEXT_PUBLIC_API_URL` yang dipakai oleh TanStack Query hooks
- **Tooltip**: Overlay yang muncul saat hover bubble — menampilkan detail komoditas
- **Data_Badge**: Label kecil di tombol timeframe yang menampilkan jumlah data points aktual (mis. `1W · 5d`)
- **Arrow_Indicator**: Karakter Unicode ↑ atau ↓ yang ditampilkan di label bubble sebagai indikator arah perubahan
- **getBubbleColor**: Fungsi dari `packages/shared/src/utils.ts` yang menghitung warna bubble berdasarkan persentase perubahan dan timeframe
- **getBubbleRadius**: Fungsi dari `packages/shared/src/utils.ts` yang menghitung radius bubble berdasarkan persentase perubahan dan timeframe

## Requirements

### Requirement 1: Setup Infrastruktur Frontend

**User Story:** Sebagai developer yang membangun M4, saya ingin TanStack Query dan shadcn/ui ter-setup dengan benar di `apps/web`, sehingga semua komponen M4 dan milestone berikutnya bisa menggunakan data fetching dan komponen UI yang konsisten.

#### Acceptance Criteria

1. THE Web_App SHALL menyediakan Query_Client melalui `QueryClientProvider` yang membungkus seluruh aplikasi di `apps/web/app/layout.tsx`, sehingga semua komponen dapat menggunakan TanStack Query hooks
2. THE Query_Client SHALL dikonfigurasi dengan `staleTime` minimal 30 detik untuk endpoint `/komoditas` guna menghindari refetch berlebihan saat user berinteraksi dengan filter
3. THE Web_App SHALL menggunakan shadcn/ui yang diinisialisasi via `bunx shadcn@latest init` dengan style default yang kompatibel dengan Tailwind v4 zero-config (tanpa `tailwind.config.ts`)
4. WHEN `QueryClientProvider` dirender di server component `layout.tsx`, THE Web_App SHALL menggunakan pola `'use client'` wrapper terpisah agar server component tidak terkontaminasi client-only code
5. THE Web_App SHALL membaca base URL API dari environment variable `NEXT_PUBLIC_API_URL` melalui API_Client — IF `NEXT_PUBLIC_API_URL` tidak tersedia, THEN THE API_Client SHALL menggunakan fallback `http://localhost:3001`. Penggunaan fallback diperbolehkan bahkan ketika environment variable tersedia (mis. untuk override lokal)

### Requirement 2: Data Fetching dengan TanStack Query

**User Story:** Sebagai Bubble_Chart, saya ingin data komoditas dan provinsi di-fetch dari API backend menggunakan TanStack Query, sehingga state loading, error, dan data tersedia secara reaktif tanpa fetch manual di komponen.

#### Acceptance Criteria

1. THE Web_App SHALL menyediakan custom hook `useKomoditas(timeframe, provinsiId)` yang memanggil `GET /komoditas?timeframe=:timeframe&provinsiId=:provinsiId` dan mengembalikan `{ data, isLoading, isError, refetch }`
2. THE Web_App SHALL menyediakan custom hook `useProvinsi()` yang memanggil `GET /provinsi` dan mengembalikan array provinsi — data ini di-cache lebih lama (staleTime minimal 5 menit) karena jarang berubah
3. WHEN `timeframe` atau `provinsiId` berubah, THE `useKomoditas` hook SHALL secara otomatis melakukan refetch dengan parameter baru tanpa memerlukan pemanggilan manual
4. THE Web_App SHALL menyediakan custom hook `useHistorisKomoditas(komoditasId, provinsiId)` yang memanggil `GET /komoditas/:id/historis?provinsiId=:provinsiId` — hook ini hanya aktif (enabled) ketika `komoditasId` tidak null
5. IF request ke API gagal (network error atau HTTP 4xx/5xx), THEN THE TanStack_Query SHALL melakukan retry maksimal 2 kali dengan exponential backoff sebelum mengembalikan state error
6. THE Web_App SHALL TIDAK mengandung pemanggilan `fetch()` langsung di dalam komponen React — setiap skenario data fetching wajib menggunakan TanStack Query melalui custom hooks

### Requirement 3: Bubble Chart — Render dan Force Simulation

**User Story:** Sebagai pengguna, saya ingin melihat 21 komoditas ditampilkan sebagai bubble yang melayang di layar dengan ukuran dan warna yang mencerminkan volatilitas harga, sehingga saya bisa memahami kondisi pasar sekilas.

#### Acceptance Criteria

1. THE Bubble_Chart SHALL merender setiap komoditas dari array `BubbleData` sebagai elemen `<circle>` SVG dengan radius sesuai field `radius` dari API response (sudah dihitung oleh backend menggunakan `getBubbleRadius` dari `packages/shared`)
2. THE Bubble_Chart SHALL mewarnai setiap bubble menggunakan field `color` dari API response (sudah dihitung oleh backend menggunakan `getBubbleColor` dari `packages/shared`)
3. THE Bubble_Chart SHALL menggunakan D3.js force simulation dengan setidaknya tiga forces: `forceCenter` (menarik bubble ke tengah canvas), `forceCollide` (mencegah bubble overlap dengan padding 2px antar bubble), dan `forceManyBody` (repulsion ringan)
4. WHEN data baru diterima dari API (timeframe atau provinsi berubah), THE Bubble_Chart SHALL selalu menjalankan force simulation dan memperbarui posisi dan ukuran bubble dengan transisi animasi D3 berdurasi 400ms — bubble tidak boleh teleport secara tiba-tiba
5. THE Bubble_Chart SHALL merender sebagai komponen `'use client'` karena menggunakan D3.js dan browser APIs
6. THE Bubble_Chart SHALL menggunakan `ResizeObserver` untuk mendeteksi perubahan ukuran container dan menyesuaikan dimensi SVG secara responsif
7. WHEN Force_Simulation berjalan, THE Bubble_Chart SHALL membatasi posisi bubble agar tidak keluar dari batas SVG canvas (clamping ke `[radius, width - radius]` untuk x dan `[radius, height - radius]` untuk y)

### Requirement 4: Label dan Aksesibilitas Bubble

**User Story:** Sebagai pengguna termasuk yang memiliki keterbatasan penglihatan warna, saya ingin setiap bubble menampilkan nama komoditas, arrow indikator arah, dan persentase perubahan, sehingga informasi dapat dipahami tanpa mengandalkan warna saja.

#### Acceptance Criteria

1. THE Bubble_Chart SHALL menampilkan label teks di dalam setiap bubble yang berisi: nama singkat komoditas, Arrow_Indicator (↑ jika `perubahan > 0`, ↓ jika `perubahan < 0`, tanpa arrow jika stabil), dan persentase perubahan diformat dengan 1 desimal (mis. `↑2.3%`)
2. THE Bubble_Chart SHALL menampilkan Arrow_Indicator pada SETIAP bubble yang memiliki perubahan harga, termasuk perubahan kecil — aksesibilitas warna tidak boleh menjadi satu-satunya indikator arah perubahan. IF `perubahan > 0`, THEN Arrow_Indicator adalah ↑. IF `perubahan < 0`, THEN Arrow_Indicator adalah ↓
3. WHEN radius bubble kurang dari 40px, THE Bubble_Chart SHALL menyembunyikan label teks untuk menghindari overflow — batas 40px ini bersifat hardcoded dan tidak bergantung pada konfigurasi threshold lain. Bubble dengan radius berapapun tetap dirender, hanya label yang disembunyikan
4. THE Bubble_Chart SHALL menyertakan atribut `role="img"` dan `aria-label` pada elemen SVG yang mendeskripsikan konten chart secara keseluruhan (mis. "Bubble chart harga pangan — 21 komoditas, timeframe 1D")
5. THE Bubble_Chart SHALL menyertakan atribut `aria-label` pada setiap bubble `<circle>` yang mendeskripsikan komoditas, harga, dan perubahan (mis. "Beras Medium I: Rp 12.500/kg, naik 1.5%")
6. WHEN warna bubble adalah abu (#6b7280), THE Bubble_Chart SHALL menampilkan label tanpa Arrow_Indicator — komoditas stabil tidak memiliki arah yang perlu diindikasikan

### Requirement 5: Tooltip Hover

**User Story:** Sebagai pengguna, saya ingin melihat detail komoditas saat menghover bubble, sehingga saya mendapat informasi lengkap tanpa harus mengklik.

#### Acceptance Criteria

1. WHEN pengguna menghover bubble, THE Tooltip SHALL muncul dalam waktu kurang dari 100ms dan menampilkan: nama lengkap komoditas, harga terkini diformat sebagai Rupiah (mis. `Rp 12.500/kg`), persentase perubahan dengan Arrow_Indicator dan warna sesuai arah, dan satuan komoditas
2. WHEN radius bubble lebih besar atau sama dengan 50px, THE Tooltip SHALL menampilkan Sparkline — mini line chart dari data historis yang di-fetch via `useHistorisKomoditas` — dengan lebar 120px dan tinggi 40px. WHEN radius bubble tepat 50px, THE Tooltip SHALL menampilkan Sparkline (bukan text-only)
3. WHEN radius bubble kurang dari 50px, THE Tooltip SHALL menampilkan informasi teks saja tanpa Sparkline
4. WHEN pengguna memindahkan kursor keluar dari bubble, THE Tooltip SHALL menghilang dalam waktu kurang dari 150ms
5. THE Tooltip SHALL selalu berada dalam batas viewport — IF posisi default Tooltip melampaui tepi kanan atau bawah viewport, THEN THE Tooltip SHALL digeser ke sisi yang berlawanan dari bubble
6. THE Tooltip SHALL diimplementasikan sebagai komponen React yang di-render di luar SVG (mis. menggunakan portal atau div absolut) — bukan sebagai elemen SVG

### Requirement 6: Filter Timeframe

**User Story:** Sebagai pengguna, saya ingin memilih timeframe (1D, 1W, 1M, 3M, 1Y) untuk melihat perubahan harga dalam periode yang berbeda, sehingga saya bisa menganalisis tren jangka pendek maupun panjang.

#### Acceptance Criteria

1. THE Web_App SHALL menampilkan 5 tombol filter timeframe: `1D`, `1W`, `1M`, `3M`, `1Y` — tombol aktif diberi visual state yang jelas (border, background, atau warna berbeda)
2. WHEN pengguna mengklik tombol timeframe, THE Web_App SHALL memperbarui parameter `timeframe` pada `useKomoditas` hook sehingga data di-refetch dengan timeframe baru
3. WHEN API mengembalikan data dengan jumlah data points kurang dari durasi penuh timeframe, THE Web_App SHALL menampilkan Data_Badge di tombol timeframe yang aktif (mis. `1W · 5d`). IF jumlah data points adalah nol, THEN THE Web_App SHALL menampilkan badge dengan indikator `0d` (mis. `1W · 0d`). Badge hilang ketika data points sudah mencapai durasi penuh
4. THE Web_App SHALL mempertahankan timeframe yang dipilih saat filter provinsi berubah — kedua filter bersifat independen
5. THE Web_App SHALL menggunakan `1D` sebagai timeframe default saat halaman pertama kali dimuat

### Requirement 7: Filter Provinsi

**User Story:** Sebagai pengguna, saya ingin memfilter bubble chart berdasarkan provinsi, sehingga saya bisa melihat kondisi harga di wilayah tertentu.

#### Acceptance Criteria

1. THE Web_App SHALL menampilkan dropdown filter provinsi yang diisi dari data `useProvinsi()` hook — opsi pertama adalah "Semua Provinsi" yang merepresentasikan `provinsiId=0`
2. WHEN pengguna memilih provinsi dari dropdown, THE Web_App SHALL memperbarui parameter `provinsiId` pada `useKomoditas` hook sehingga data di-refetch dengan filter provinsi baru. IF pengguna mengubah pilihan provinsi secara cepat sebelum fetch sebelumnya selesai, THEN THE Web_App SHALL menampilkan hasil dari request yang selesai terakhir
3. THE Web_App SHALL menggunakan komponen `Select` dari shadcn/ui untuk dropdown provinsi
4. WHILE data provinsi sedang di-fetch, THE Web_App SHALL menampilkan dropdown dalam state disabled dengan placeholder "Memuat provinsi..."
5. THE Web_App SHALL menggunakan `provinsiId=0` (Semua Provinsi / nasional) sebagai nilai default saat halaman pertama kali dimuat
6. THE Web_App SHALL mempertahankan provinsi yang dipilih saat filter timeframe berubah — kedua filter bersifat independen

### Requirement 8: Loading dan Error States

**User Story:** Sebagai pengguna, saya ingin mendapat feedback visual yang jelas saat data sedang dimuat atau terjadi error, sehingga saya tahu kondisi aplikasi saat ini.

#### Acceptance Criteria

1. WHILE data komoditas sedang di-fetch (isLoading = true), THE Bubble_Chart SHALL menampilkan skeleton loading state — 21 lingkaran abu-abu dengan animasi pulse yang tersebar di canvas
2. WHEN data komoditas berhasil dimuat dan kemudian timeframe atau provinsi berubah (isRefetching = true), THE Bubble_Chart SHALL menampilkan data lama dengan overlay opacity yang dikurangi (mis. 50%) sambil menunggu data baru — tidak kembali ke skeleton
3. IF request data komoditas gagal setelah semua retry (isError = true), THEN THE Web_App SHALL menampilkan pesan error yang informatif dengan tombol "Coba Lagi" yang memanggil `refetch()` — state error ini menggantikan overlay refetching jika keduanya terjadi bersamaan
4. THE Web_App SHALL selalu menampilkan footer informasi data di bawah bubble chart — footer tetap terlihat bahkan saat initial loading ketika belum ada data tanggal yang tersedia
5. WHEN pengguna mengklik tombol refresh manual, THE Web_App SHALL memanggil `refetch()` dari `useKomoditas` untuk mengambil data terbaru dari API

### Requirement 9: Responsive Layout

**User Story:** Sebagai pengguna yang mengakses dari berbagai perangkat, saya ingin bubble chart dan kontrol filter tampil dengan baik di desktop maupun mobile, sehingga pengalaman penggunaan tetap optimal di semua ukuran layar.

#### Acceptance Criteria

1. THE Bubble_Chart SHALL mengisi seluruh tinggi viewport yang tersedia setelah dikurangi tinggi header dan kontrol filter — menggunakan CSS `calc(100vh - ...)` atau flexbox grow
2. WHEN lebar viewport kurang dari 768px (breakpoint mobile), THE Web_App SHALL menampilkan kontrol filter (timeframe + provinsi) dalam layout vertikal yang stack ke bawah, bukan horizontal
3. WHEN lebar viewport 768px atau lebih (breakpoint desktop), THE Web_App SHALL menampilkan kontrol filter dalam layout horizontal satu baris
4. THE Bubble_Chart SHALL menyesuaikan ukuran SVG canvas secara otomatis menggunakan `ResizeObserver` — Force_Simulation di-restart dengan dimensi baru ketika ukuran container berubah lebih dari 50px
5. THE Web_App SHALL menggunakan Tailwind v4 utility classes untuk semua styling responsif — inline styles hanya diperbolehkan untuk nilai dinamis yang langsung berasal dari kalkulasi D3 (posisi x/y, radius, warna bubble). CSS custom properties yang menjembatani Tailwind dan D3 tidak diperbolehkan sebagai inline styles
