# Dokumen Requirements — M3 API

## Pendahuluan

Milestone M3 membangun REST API layer menggunakan Hono.js di `apps/api`. API ini menjadi jembatan antara data yang sudah terakumulasi di PostgreSQL (hasil scraper M2) dengan frontend bubble chart (M4+). Terdapat 5 endpoint utama yang menyediakan data komoditas, historis harga, detail geografis (proxy BI), insight LLM, dan daftar provinsi. Arsitektur mengikuti pola thin route handler + service layer untuk memudahkan migrasi ke tRPC di V2.

## Glosarium

- **API**: Hono.js REST server yang berjalan di `apps/api` pada port 3001
- **Komoditas_Service**: Service layer yang menangani logika bisnis terkait data komoditas dan harga
- **Insight_Service**: Service layer yang menangani logika bisnis terkait LLM insight dan caching
- **Harga_Service**: Service layer yang menangani query historis harga dari database
- **Route_Handler**: Fungsi tipis di Hono.js yang menerima request, mendelegasikan ke service, dan mengembalikan response JSON
- **Timeframe**: Periode waktu untuk kalkulasi persentase perubahan harga — nilai valid: `1D`, `1W`, `1M`, `3M`, `1Y`
- **ProvinsiId**: Integer ID provinsi untuk filter geografis — `0` berarti nasional (semua provinsi)
- **Level**: Tingkat granularitas data harga — `0` = nasional, `1` = provinsi, `2` = kota, `3` = pasar
- **BI_API**: API publik Bank Indonesia PIHPS di `bi.go.id/hargapangan`
- **OpenRouter**: Provider LLM yang diakses via `OPENROUTER_API_KEY` untuk generate insight
- **Insight_Cache**: Tabel database yang menyimpan hasil LLM per (komoditas_id, provinsi_id, cache_date)
- **Drizzle**: ORM yang digunakan untuk semua query database
- **BubbleData**: Tipe data yang berisi komoditas + harga terbaru + persentase perubahan + radius + warna bubble

## Requirements

### Requirement 1: Endpoint List Komoditas

**User Story:** Sebagai frontend bubble chart, saya ingin mendapatkan daftar semua komoditas beserta harga terbaru dan persentase perubahan per timeframe, sehingga saya bisa merender bubble chart dengan ukuran dan warna yang tepat.

#### Acceptance Criteria

1. WHEN request `GET /komoditas` diterima tanpa query params, THE Komoditas_Service SHALL mengembalikan array seluruh 21 komoditas dengan field: `komoditasId`, `nama`, `kategori`, `harga` (harga pada MAX(tanggal) di DB untuk level 0), `perubahan` (persentase perubahan timeframe `1D`), `radius`, dan `color`
2. WHEN request `GET /komoditas?timeframe=1W` diterima, THE Komoditas_Service SHALL menghitung persentase perubahan menggunakan harga pada tanggal target `hari_ini - 7 hari` (atau tanggal terdekat yang tersedia di DB sebelum target)
3. WHEN request `GET /komoditas?provinsiId=5` diterima dengan provinsiId selain 0, THE Komoditas_Service SHALL mengembalikan data harga level 1 yang difilter berdasarkan provinsi_id tersebut
4. WHEN request `GET /komoditas?provinsiId=0` diterima, THE Komoditas_Service SHALL mengembalikan data harga level 0 (nasional)
5. THE Komoditas_Service SHALL menghitung persentase perubahan menggunakan fungsi `hitungPerubahan` dari `packages/shared`
6. IF tidak ada data harga pada tanggal target yang tepat, THEN THE Komoditas_Service SHALL menggunakan harga pada tanggal terdekat sebelum target (MAX(tanggal) WHERE tanggal <= target_date) yang tersedia di database
7. IF query param `timeframe` berisi nilai selain `1D`, `1W`, `1M`, `3M`, atau `1Y`, THEN THE Route_Handler SHALL mengembalikan HTTP 400 dengan pesan error yang menyebutkan nama parameter yang invalid dan daftar nilai yang diterima
8. IF query param `provinsiId` berisi nilai non-integer atau negatif, THEN THE Route_Handler SHALL mengembalikan HTTP 400 dengan pesan error yang menyebutkan nama parameter yang invalid dan constraint yang dilanggar
9. THE Route_Handler SHALL mendelegasikan seluruh logika bisnis ke Komoditas_Service tanpa mengandung query database secara langsung
10. THE Komoditas_Service SHALL menghitung field `radius` menggunakan fungsi `getBubbleRadius` dan field `color` menggunakan fungsi `getBubbleColor` dari `packages/shared` berdasarkan nilai perubahan dan timeframe yang aktif
11. IF suatu komoditas tidak memiliki data harga sama sekali di database untuk level dan provinsi yang diminta, THEN THE Komoditas_Service SHALL tetap menyertakan komoditas tersebut dalam response dengan nilai `harga` = 0, `perubahan` = 0, `radius` = nilai minimum (30), dan `color` = warna stabil (#6b7280)

### Requirement 2: Endpoint Historis Harga

**User Story:** Sebagai modal detail di frontend, saya ingin mendapatkan data historis harga suatu komoditas dari database, sehingga saya bisa merender line chart pergerakan harga.

#### Acceptance Criteria

1. WHEN request `GET /komoditas/:id/historis` diterima, THE Harga_Service SHALL mengembalikan array objek dengan field `tanggal` (format ISO date string YYYY-MM-DD) dan `harga` (number), diurutkan berdasarkan tanggal ascending, dibatasi maksimal 365 data point terakhir
2. WHEN request diterima dengan `provinsiId=0` atau tanpa query param provinsiId, THE Harga_Service SHALL mengembalikan data harga level 0 (nasional)
3. WHEN request diterima dengan `provinsiId` selain 0, THE Harga_Service SHALL mengembalikan data harga level 1 yang difilter berdasarkan provinsi_id tersebut
4. IF komoditas dengan id yang diminta tidak ditemukan di database, THEN THE Route_Handler SHALL mengembalikan HTTP 404 dengan pesan error yang mengindikasikan komoditas tidak ditemukan
5. IF parameter `:id` bukan integer positif, THEN THE Route_Handler SHALL mengembalikan HTTP 400 dengan pesan error yang mengindikasikan parameter id tidak valid
6. IF query param `provinsiId` berisi nilai non-integer atau negatif, THEN THE Route_Handler SHALL mengembalikan HTTP 400 dengan pesan error yang mengindikasikan provinsiId tidak valid
7. IF komoditas ditemukan tetapi tidak memiliki data harga untuk level dan provinsi yang diminta, THEN THE Harga_Service SHALL mengembalikan HTTP 200 dengan array kosong
8. THE Route_Handler SHALL mendelegasikan seluruh logika bisnis ke Harga_Service tanpa mengandung query database secara langsung

### Requirement 3: Endpoint Detail Geografis

**User Story:** Sebagai tabel geografis di modal detail, saya ingin mendapatkan data harga 5 hari terakhir dengan breakdown nasional → provinsi → kota → pasar secara live dari BI, sehingga saya bisa menampilkan tabel collapsible yang selalu up-to-date.

#### Acceptance Criteria

1. WHEN request `GET /komoditas/:id/detail` diterima, THE Komoditas*Service SHALL melakukan proxy request ke endpoint `GetDetailGridData2` BI API menggunakan `com_id` dari komoditas yang diminta, dengan menyertakan parameter `date` (tanggal hari ini format bahasa Inggris) dan `*` (Unix timestamp sebagai cache buster)
2. THE Komoditas_Service SHALL mengirim parameter fix `PriceTypeId=1` dan `isPasokan=1` ke BI API pada setiap proxy request
3. WHEN request diterima dengan `provinsiId=0` atau tanpa query param provinsiId, THE Komoditas_Service SHALL mengirim `ProvId=0` ke BI API (semua provinsi)
4. WHEN request diterima dengan `provinsiId` selain 0 dan provinsi tersebut ditemukan di tabel provinsi, THE Komoditas_Service SHALL mengirim `ProvId` sesuai `bi_id` dari tabel provinsi ke BI API
5. WHEN BI API mengembalikan HTTP 200 dengan body JSON valid, THE Komoditas_Service SHALL meneruskan data tersebut ke client tanpa transformasi struktur
6. IF BI API mengembalikan HTTP status selain 200 atau tidak merespons dalam waktu 10 detik, THEN THE Komoditas_Service SHALL mengembalikan HTTP 502 dengan pesan error yang menjelaskan bahwa sumber data eksternal tidak tersedia
7. WHEN komoditas dengan id yang diminta tidak ditemukan di database, THE Route_Handler SHALL mengembalikan HTTP 404 dengan pesan error yang menjelaskan bahwa komoditas tidak ditemukan
8. IF query param `provinsiId` berisi nilai non-integer atau negatif, THEN THE Route_Handler SHALL mengembalikan HTTP 400 dengan pesan error yang menjelaskan format provinsiId yang valid
9. IF query param `provinsiId` berisi integer positif yang tidak ditemukan di tabel provinsi, THEN THE Route_Handler SHALL mengembalikan HTTP 404 dengan pesan error yang menjelaskan bahwa provinsi tidak ditemukan
10. WHEN parameter path `:id` bukan integer valid, THE Route_Handler SHALL mengembalikan HTTP 400 dengan pesan error yang menjelaskan format id yang valid
11. THE Route_Handler SHALL mendelegasikan seluruh logika bisnis ke Komoditas_Service tanpa mengandung query database atau HTTP call secara langsung

### Requirement 4: Endpoint LLM Insight

**User Story:** Sebagai panel insight di modal detail, saya ingin mendapatkan analisis LLM tentang pergerakan harga suatu komoditas, sehingga pengguna mendapat konteks dan saran praktis.

#### Acceptance Criteria

1. WHEN request `GET /komoditas/:id/insight` diterima dan cache valid ditemukan untuk (komoditas_id, provinsi_id, tanggal_hari_ini_WIB), THE Insight_Service SHALL mengembalikan response JSON dengan field `komoditasId`, `provinsiId`, `insight`, `generatedAt`, dan `cached: true` tanpa memanggil LLM
2. WHEN request diterima dan cache tidak ditemukan atau expired (cache_date bukan hari ini WIB), THE Insight_Service SHALL memanggil OpenRouter API untuk generate insight baru dan mengembalikan response JSON dengan field `komoditasId`, `provinsiId`, `insight`, `generatedAt`, dan `cached: false`
3. WHEN insight baru berhasil di-generate, THE Insight_Service SHALL menyimpan hasil ke tabel insight_cache dengan cache_date = tanggal hari ini WIB
4. THE Insight_Service SHALL membangun prompt LLM yang berisi: nama komoditas, satuan, filter wilayah (provinsi atau "Nasional"), harga hari ini, harga kemarin, persentase perubahan, arah perubahan, dan data historis maksimal 30 hari terakhir yang tersedia di database
5. WHEN request diterima dengan `provinsiId=0` atau tanpa query param, THE Insight_Service SHALL menggunakan data harga level 0 (nasional) dan menyimpan cache dengan provinsi_id NULL
6. WHEN request diterima dengan `provinsiId` selain 0, THE Insight_Service SHALL menggunakan data harga level 1 yang difilter berdasarkan provinsi_id tersebut
7. IF OpenRouter API mengembalikan error atau tidak merespons dalam waktu 30 detik, THEN THE Insight_Service SHALL mengembalikan HTTP 502 dengan pesan error yang menjelaskan bahwa layanan LLM tidak tersedia
8. IF environment variable `OPENROUTER_API_KEY` tidak tersedia, THEN THE Insight_Service SHALL mengembalikan HTTP 503 dengan pesan bahwa fitur insight belum dikonfigurasi
9. IF komoditas dengan id yang diminta tidak ditemukan di database, THEN THE Route_Handler SHALL mengembalikan HTTP 404 dengan pesan error yang menjelaskan bahwa komoditas tidak ditemukan
10. THE Route_Handler SHALL mendelegasikan seluruh logika bisnis ke Insight_Service tanpa mengandung logika LLM atau query database secara langsung
11. IF data harga hari ini belum tersedia di database untuk komoditas dan level yang diminta, THEN THE Insight_Service SHALL menggunakan harga pada tanggal terakhir yang tersedia sebagai harga terkini dalam prompt LLM

### Requirement 5: Endpoint List Provinsi

**User Story:** Sebagai dropdown filter provinsi di frontend, saya ingin mendapatkan daftar semua provinsi yang tersedia, sehingga pengguna bisa memilih filter geografis.

#### Acceptance Criteria

1. WHEN request `GET /provinsi` diterima, THE Komoditas_Service SHALL mengembalikan array seluruh provinsi dari tabel provinsi, diurutkan berdasarkan field `nama` secara ascending (A-Z), dengan HTTP status 200
2. THE Komoditas_Service SHALL mengembalikan setiap provinsi sebagai objek JSON dengan tepat 3 field: `id` (serial primary key), `biId` (integer BI identifier), dan `nama` (string nama provinsi) — tanpa field `createdAt`
3. WHEN tabel provinsi kosong (belum ada data seed), THE Komoditas_Service SHALL mengembalikan array kosong `[]` dengan HTTP status 200
4. THE Route_Handler SHALL mendelegasikan seluruh logika bisnis ke Komoditas_Service tanpa mengandung query database secara langsung

### Requirement 6: Arsitektur Thin Route Handler

**User Story:** Sebagai developer yang akan melakukan migrasi ke tRPC di V2, saya ingin route handler hanya berisi parsing request dan delegasi ke service, sehingga service function bisa langsung di-wrap ke tRPC procedure tanpa refactor.

#### Acceptance Criteria

1. THE API SHALL memisahkan route handler di folder `src/routes/` dan business logic di folder `src/services/`
2. THE Route_Handler SHALL hanya melakukan: parsing path params dan query params, validasi tipe dan range input, pemanggilan satu service function, dan pengembalian response JSON — tanpa mengandung import dari `drizzle-orm` atau melakukan HTTP request ke external service
3. THE Komoditas_Service, Harga_Service, dan Insight_Service SHALL menerima parameter primitif (number, string) bukan objek request Hono — sehingga bisa dipanggil dari tRPC procedure tanpa modifikasi
4. THE API SHALL menggunakan Drizzle ORM untuk semua query database di dalam service layer
5. THE Route_Handler SHALL tidak mengandung lebih dari 15 baris kode efektif (tidak termasuk import dan blank lines) per endpoint handler

### Requirement 7: Validasi Input dan Error Handling

**User Story:** Sebagai consumer API, saya ingin mendapatkan error response yang konsisten dan informatif, sehingga saya bisa menangani error dengan tepat di frontend.

#### Acceptance Criteria

1. THE API SHALL mengembalikan response error dalam format JSON: `{ "error": string, "status": number }` di mana field `error` berisi pesan yang mendeskripsikan penyebab error dan field `status` berisi HTTP status code yang sama dengan response status
2. WHEN parameter path `:id` adalah integer valid tetapi tidak ditemukan di database, THE API SHALL mengembalikan HTTP 404 dengan field `error` yang menyebutkan resource yang tidak ditemukan
3. WHEN query param `timeframe` berisi nilai selain `1D`, `1W`, `1M`, `3M`, `1Y`, atau WHEN param `:id` bukan integer positif, atau WHEN `provinsiId` bukan integer non-negatif, THE API SHALL mengembalikan HTTP 400 dengan field `error` yang menyebutkan parameter mana yang tidak valid
4. IF terjadi error internal yang tidak terduga, THEN THE API SHALL mengembalikan HTTP 500 dengan field `error` berisi pesan generik tanpa mengekspos stack trace, nama tabel, atau detail query database
5. THE API SHALL mengembalikan header `Content-Type: application/json` pada semua response termasuk response sukses dan error

### Requirement 8: Konfigurasi dan Health Check

**User Story:** Sebagai operator yang men-deploy API, saya ingin endpoint health check dan konfigurasi yang jelas, sehingga saya bisa memverifikasi API berjalan dengan benar.

#### Acceptance Criteria

1. WHEN request `GET /` diterima, THE API SHALL mengembalikan HTTP 200 dengan response body JSON `{ "status": "ok", "service": "pantau-pangan-api" }`
2. THE API SHALL membaca port dari environment variable `API_PORT` dan melakukan parsing ke integer — IF `API_PORT` tidak tersedia atau bukan angka valid, THEN THE API SHALL menggunakan default port 3001
3. THE API SHALL membaca connection string database dari environment variable `DATABASE_URL`
4. IF `DATABASE_URL` tidak tersedia atau bernilai empty string saat startup, THEN THE API SHALL gagal start (process exit dengan exit code non-zero) dan mencetak pesan error ke stderr yang menyebutkan bahwa `DATABASE_URL` wajib dikonfigurasi
