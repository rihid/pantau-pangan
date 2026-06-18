# Requirements Document

## Introduction

> M5 — Modal Detail Komoditas

Milestone M5 membangun modal detail yang muncul ketika user mengklik sebuah bubble di bubble chart. Modal ini adalah titik interaksi utama untuk eksplorasi mendalam per komoditas, terdiri dari tiga panel: chart historis harga (data akumulasi DB), tabel geografis collapsible (data live dari BI via proxy), dan panel LLM insight (generate on-demand, di-cache per hari). M5 dibangun di atas fondasi M4 (TanStack Query, shadcn/ui, D3.js) dan mengonsumsi tiga endpoint API yang sudah tersedia dari M3.

## Glossary

- **Modal**: Overlay dialog yang muncul di atas bubble chart saat user mengklik sebuah Bubble — diimplementasikan menggunakan shadcn/ui `Dialog`
- **Modal_State**: State yang menyimpan komoditas yang sedang aktif di modal — `{ komoditasId: number | null, nama: string, harga: number, provinsiId: number }`
- **Chart_Historis**: Line chart D3.js yang merender data `HargaHarian[]` dari endpoint `/komoditas/:id/historis`
- **Tabel_Geografis**: Komponen tabel collapsible tree yang merender data dari endpoint `/komoditas/:id/detail` (proxy `GetDetailGridData2`)
- **Insight_Panel**: Panel yang menampilkan teks analisis dari endpoint `/komoditas/:id/insight`
- **Timeframe_Modal**: Timeframe aktif di dalam modal — terpisah dari timeframe di halaman utama — nilai valid: `1D`, `1W`, `1M`, `3M`, `1Y`
- **HargaHarian**: Array objek `{ tanggal: string, harga: number }` yang dikembalikan oleh endpoint historis
- **DetailRow**: Satu baris data dari response `GetDetailGridData2` dengan field `id`, `name`, `category`, `level`, dan key tanggal dinamis `DD/MM/YYYY`
- **TreeNode**: Node dalam tabel geografis yang bisa di-collapse/expand — level 0 = Nasional, level 1 = Provinsi, level 2 = Kota, level 3 = Pasar
- **HighLowMarker**: Penanda visual pada Chart_Historis untuk titik harga tertinggi (`max`) dan terendah (`min`) dalam data yang sedang ditampilkan
- **InsightResponse**: Objek `{ komoditasId, provinsiId, insight, generatedAt, cached }` yang dikembalikan oleh endpoint insight
- **Backdrop**: Area semi-transparan di luar Modal yang ketika diklik menutup Modal
- **ProvinsiId_Modal**: ProvinsiId yang dipakai dalam context modal — diwarisi dari filter provinsi halaman utama saat Modal dibuka

## Requirements

### Requirement 1: Pembukaan dan Penutupan Modal

**User Story:** Sebagai pengguna, saya ingin modal detail terbuka saat saya mengklik sebuah bubble dan tertutup saat saya mengklik tombol close atau backdrop, sehingga saya bisa mengeksplorasi detail komoditas tanpa meninggalkan halaman utama.

#### Acceptance Criteria

1. WHEN pengguna mengklik sebuah Bubble di bubble chart, THE Modal SHALL terbuka dengan `Modal_State` di-set ke `{ komoditasId: bubble.komoditasId, nama: bubble.nama, harga: bubble.harga, provinsiId: halaman_utama.provinsiId }` — IF Modal sudah terbuka untuk komoditas lain, THEN Modal_State SHALL diperbarui ke komoditas baru tanpa menutup dan membuka kembali modal
2. WHEN Modal terbuka, THE Web_App SHALL menginisialisasi `Timeframe_Modal` dengan nilai `1D` sebagai default — `Timeframe_Modal` adalah state lokal Modal dan tidak mempengaruhi `timeframe` di halaman utama
3. WHEN pengguna mengklik tombol close (ikon X) di dalam Modal, THE Modal SHALL tertutup
4. WHEN pengguna mengklik Backdrop di luar area konten Modal, THE Modal SHALL tertutup
5. WHEN Modal tertutup melalui cara apapun (close button, Backdrop, atau Escape), THE Modal_State SHALL di-reset ke `null`
6. WHEN Modal terbuka dan pengguna berinteraksi dengan filter di dalam Modal, THE nilai `timeframe` dan `provinsiId` di halaman utama SHALL tetap identik dengan nilai sebelum Modal dibuka
7. THE Modal SHALL diimplementasikan menggunakan shadcn/ui `Dialog` component

### Requirement 2: Header Modal

**User Story:** Sebagai pengguna, saya ingin melihat identitas komoditas dan ringkasan perubahan harga di bagian atas modal, sehingga saya langsung tahu konteks data yang sedang saya lihat.

#### Acceptance Criteria

1. THE Modal SHALL menampilkan `Modal_State.nama` di header sebagai judul utama
2. THE Modal SHALL menampilkan `Modal_State.harga` diformat sebagai `Rp X.XXX/kg` dengan separator ribuan titik dan tanpa desimal (mis. `Rp 48.350/kg`)
3. WHEN `Timeframe_Modal` aktif adalah `TF`, THE Modal SHALL menampilkan persentase perubahan harga sesuai `TF` dengan Arrow_Indicator (`↑` untuk positif, `↓` untuk negatif) dan warna: merah (`#ef4444`) atau oranye (`#f97316`) untuk naik, hijau (`#22c55e` atau `#84cc16`) untuk turun, abu (`#6b7280`) untuk `|perubahan| < VOLATILITY_THRESHOLDS[TF].stable` atau nilai `0` — nilai perubahan diformat dengan 1 desimal tanpa spasi (mis. `↑1.5%`), nilai `0%` atau stabil tidak menampilkan Arrow_Indicator
4. THE Modal SHALL menampilkan 5 tab timeframe di header: `1D`, `1W`, `1M`, `3M`, `1Y` — tab aktif mendapat background atau underline yang berbeda dari tab tidak aktif
5. WHEN pengguna mengklik tab timeframe `TF` di header Modal, THE `Timeframe_Modal` SHALL diperbarui ke nilai tab yang diklik dan data Chart_Historis SHALL di-refetch — perubahan ini TIDAK mempengaruhi `timeframe` halaman utama
6. IF `Modal_State.harga` adalah `null` atau `0`, THEN THE Modal SHALL menampilkan `Rp —` sebagai placeholder harga dan `—%` sebagai placeholder perubahan tanpa Arrow_Indicator

### Requirement 3: Chart Historis

**User Story:** Sebagai pengguna, saya ingin melihat line chart pergerakan harga historis suatu komoditas berdasarkan timeframe yang dipilih, sehingga saya bisa memahami tren harga dalam kurun waktu tertentu.

#### Acceptance Criteria

1. WHEN `Modal_State.komoditasId` di-set dan `Timeframe_Modal` berubah, THE Chart_Historis SHALL me-fetch data dari `GET /komoditas/:id/historis?provinsiId=:provinsiId` — selanjutnya THE Chart_Historis SHALL memfilter array `HargaHarian[]` yang dikembalikan untuk menampilkan hanya titik dalam rentang `TIMEFRAME_DAYS[Timeframe_Modal]` hari ke belakang dari tanggal terbaru (filtering dilakukan client-side)
2. THE Chart_Historis SHALL merender hasil filter sebagai line chart D3.js dengan sumbu X (tanggal, diformat `DD/MM`) dan sumbu Y (harga Rupiah, diformat integer dengan separator ribuan) — library chart lain tidak digunakan
3. WHEN data yang dirender memiliki lebih dari satu titik, THE Chart_Historis SHALL menampilkan HighLowMarker berupa lingkaran berwarna (radius 5px) pada titik harga tertinggi dan terendah, disertai label teks berisi nilai harga diformat `Rp X.XXX` di samping marker
4. THE Chart_Historis SHALL menghitung HighLowMarker berdasarkan array yang sudah difilter sesuai `Timeframe_Modal` — IF array yang difilter memiliki tepat satu titik, THEN HighLowMarker tidak ditampilkan
5. WHEN `Timeframe_Modal` berubah, THE Chart_Historis SHALL memperbarui domain sumbu X dan garis chart menggunakan `d3.transition().duration(300)` — titik data baru muncul dengan transisi yang smooth
6. WHILE data Chart_Historis sedang di-fetch, THE Chart_Historis SHALL menampilkan skeleton loading state berupa garis horizontal dan dua blok abu di posisi sumbu yang beranimasi `animate-pulse`
7. IF request historis gagal setelah retry maksimal (sesuai Requirement 6 AC 7), THEN THE Chart_Historis SHALL menampilkan pesan error dengan tombol "Coba lagi" di dalam area chart
8. IF data historis yang dikembalikan adalah array kosong, THEN THE Chart_Historis SHALL menampilkan pesan "Data historis belum tersedia" di dalam area chart — ini bukan error state dan tidak menampilkan tombol retry
9. THE Chart_Historis SHALL memfilter data menggunakan `TIMEFRAME_DAYS` dari `@pantau-pangan/shared/constants`: `1D` = 1 hari, `1W` = 7 hari, `1M` = 30 hari, `3M` = 90 hari, `1Y` = 365 hari — jika data kurang dari durasi penuh, gunakan semua data yang tersedia (graceful degradation, konsisten dengan M4)

### Requirement 4: Tabel Geografis

**User Story:** Sebagai pengguna, saya ingin melihat breakdown harga 5 hari terakhir dari level nasional hingga pasar dalam bentuk tabel collapsible, sehingga saya bisa mengidentifikasi variasi harga antar wilayah.

#### Acceptance Criteria

1. WHEN Modal terbuka, THE Tabel_Geografis SHALL me-fetch data dari `GET /komoditas/:id/detail?provinsiId=:provinsiId` dan merender data tersebut sebagai tree collapsible dengan hierarki Nasional (level 0) → Provinsi (level 1) → Kota (level 2) → Pasar (level 3)
2. THE Tabel_Geografis SHALL menampilkan tepat 5 kolom tanggal yang diparse dari key dinamis response BI dengan regex `/^\d{2}\/\d{2}\/\d{4}$/` — kolom diurutkan ascending (tanggal terlama di kiri, terbaru di kanan)
3. WHEN pengguna mengklik baris TreeNode level Nasional, Provinsi, atau Kota, THE Tabel_Geografis SHALL toggle state expand/collapse node tersebut — child rows ditampilkan atau disembunyikan tanpa re-fetch; baris Pasar (level 3) tidak memiliki child dan tidak bisa di-expand
4. THE Tabel_Geografis SHALL merender baris Nasional (level 0) dalam state expanded by default saat pertama kali ditampilkan — semua Provinsi awalnya collapsed
5. WHEN pengguna mengklik header kolom tanggal untuk pertama kali, THE Tabel_Geografis SHALL mengurutkan baris pada level yang sama secara descending (harga tertinggi di atas) — klik berikutnya pada kolom yang sama toggle ke ascending; klik pada kolom berbeda reset ke descending; sebelum interaksi pertama, urutan baris mengikuti urutan dari response API
6. THE Tabel_Geografis SHALL memformat nilai harga di setiap sel sebagai bilangan integer dengan separator ribuan (mis. `48.350`) — tanpa prefix "Rp"; IF nilai harga untuk sel tertentu adalah `null` atau tidak tersedia, THEN sel tersebut menampilkan `—`
7. WHILE data Tabel_Geografis sedang di-fetch, THE Tabel_Geografis SHALL menampilkan skeleton loading state berupa 5 baris tabel abu yang beranimasi `animate-pulse`
8. IF request detail geografis gagal setelah retry maksimal, THEN THE Tabel_Geografis SHALL menampilkan pesan error dengan tombol "Coba lagi" di dalam area tabel

### Requirement 5: Insight Panel LLM

**User Story:** Sebagai pengguna, saya ingin mendapat analisis LLM tentang pergerakan harga komoditas yang sedang saya lihat, sehingga saya memahami konteks dan mendapat saran praktis.

#### Acceptance Criteria

1. WHEN Modal terbuka untuk komoditas X dengan ProvinsiId_Modal P, THE Insight_Panel SHALL secara otomatis memulai fetch ke `GET /komoditas/:id/insight?provinsiId=:provinsiId` tanpa interaksi user tambahan
2. WHILE request insight sedang diproses, THE Insight_Panel SHALL menampilkan skeleton loading state dengan animasi `animate-pulse` — IF request belum selesai setelah 35 detik, THEN THE Insight_Panel SHALL berhenti menunggu dan beralih ke error state dengan pesan timeout
3. WHEN InsightResponse diterima dengan `cached: true`, THE Insight_Panel SHALL menampilkan teks insight beserta label kecil `"Dari cache · DD/MM/YYYY"` (tanggal dari field `generatedAt` diformat `DD/MM/YYYY`) untuk memberi transparansi kepada user
4. WHEN InsightResponse diterima dengan `cached: false`, THE Insight_Panel SHALL menampilkan teks insight tanpa label cache
5. THE Insight_Panel SHALL merender teks insight dengan cara membagi string pada delimiter `\n\n` menjadi array, kemudian merender setiap elemen sebagai elemen `<p>` dengan margin bawah `1rem` — jika teks tidak mengandung `\n\n`, render sebagai satu `<p>`
6. IF request insight gagal (HTTP error, timeout 35 detik, atau network error), THEN THE Insight_Panel SHALL menampilkan pesan "Insight tidak tersedia saat ini" dengan tombol "Coba lagi" — WHEN tombol "Coba lagi" diklik, THE Insight_Panel SHALL kembali ke skeleton loading state dan me-retry request; fallback ini tidak boleh menutup Modal atau menginterupsi komponen lain
7. THE Insight_Panel SHALL TIDAK me-refetch insight saat `Timeframe_Modal` berubah — insight berbasis komoditas + provinsi + hari, bukan timeframe

### Requirement 6: Data Fetching dan Caching

**User Story:** Sebagai developer yang membangun M5, saya ingin semua data fetching modal menggunakan TanStack Query dengan caching yang tepat, sehingga navigasi antar komoditas terasa responsif dan tidak membebani API.

#### Acceptance Criteria

1. THE Web_App SHALL menyediakan custom hook `useHistorisModal(komoditasId, timeframe, provinsiId)` yang memanggil `GET /komoditas/:id/historis?provinsiId=:provinsiId` — hook ini hanya aktif (`enabled`) ketika `komoditasId` tidak `null`
2. THE Web_App SHALL menyediakan custom hook `useDetailGeografis(komoditasId, provinsiId)` yang memanggil `GET /komoditas/:id/detail?provinsiId=:provinsiId` — hook ini hanya aktif ketika `komoditasId` tidak `null`; hook SHALL menggunakan `queryKey: ['detail-geografis', komoditasId, provinsiId]`
3. THE Web_App SHALL menyediakan custom hook `useInsight(komoditasId, provinsiId)` yang memanggil `GET /komoditas/:id/insight?provinsiId=:provinsiId` — hook ini hanya aktif ketika `komoditasId` tidak `null`; hook SHALL menggunakan `queryKey: ['insight', komoditasId, provinsiId]`
4. THE `useHistorisModal` hook SHALL menggunakan `queryKey: ['historis-modal', komoditasId, timeframe, provinsiId]` sehingga perubahan timeframe atau provinsiId otomatis memicu refetch
5. THE `useDetailGeografis` hook SHALL menggunakan `staleTime` minimal 30 detik — data detail geografis tidak perlu di-refetch setiap kali Modal dibuka untuk komoditas yang sama
6. THE `useInsight` hook SHALL menggunakan `staleTime` minimal 5 menit — insight sudah di-cache di backend per hari, tapi frontend cache menghindari request berulang dalam satu sesi
7. IF request ke endpoint apapun gagal dengan network error atau HTTP 5xx, THEN THE TanStack_Query SHALL melakukan retry maksimal 2 kali dengan exponential backoff (percobaan 1: tunggu 1 detik, percobaan 2: tunggu 2 detik, cap 30 detik) sebelum mengembalikan state error — HTTP 4xx tidak di-retry karena merupakan client error

### Requirement 7: Aksesibilitas Modal

**User Story:** Sebagai pengguna termasuk yang menggunakan teknologi assistif, saya ingin modal dapat dioperasikan dengan keyboard dan screen reader, sehingga fitur ini inklusif.

#### Acceptance Criteria

1. THE Modal SHALL menggunakan atribut `role="dialog"` dan `aria-modal="true"` pada elemen container Modal
2. WHEN Modal terbuka, THE Web_App SHALL memindahkan fokus keyboard ke elemen pertama yang dapat menerima fokus di dalam Modal
3. WHEN Modal terbuka, THE Web_App SHALL menjebak fokus keyboard di dalam Modal — `Tab` pada elemen terakhir SHALL memindahkan fokus ke elemen pertama; `Shift+Tab` pada elemen pertama SHALL memindahkan fokus ke elemen terakhir
4. WHEN pengguna menekan tombol `Escape`, THE Modal SHALL tertutup
5. THE Chart_Historis SHALL menyertakan atribut `role="img"` dan `aria-label` yang mendeskripsikan konten chart dalam format: `"Line chart harga {nama_komoditas} — {n} hari terakhir"` di mana `{n}` adalah jumlah titik data yang sedang dirender
6. THE Tabel_Geografis SHALL menggunakan elemen `<table>` semantik dengan `<thead>` berisi `<th scope="col">` untuk setiap kolom tanggal dan `<th scope="row">` untuk kolom nama wilayah, serta `<tbody>` untuk semua baris data

### Requirement 8: Responsive Layout Modal

**User Story:** Sebagai pengguna yang mengakses dari berbagai perangkat, saya ingin modal tampil dengan baik di desktop maupun mobile, sehingga semua panel dapat diakses tanpa harus zoom atau scroll horizontal.

#### Acceptance Criteria

1. IF lebar viewport kurang dari 768px, THEN THE Modal SHALL menggunakan layout vertikal dengan tiga panel ditumpuk ke bawah (Chart_Historis → Tabel_Geografis → Insight_Panel) — Modal SHALL memiliki tinggi maksimal `90vh` dengan overflow-y scroll di dalam konten Modal
2. IF lebar viewport 768px atau lebih, THEN THE Modal SHALL menggunakan layout dua kolom: Chart_Historis mengisi lebar penuh di baris pertama, kemudian Tabel_Geografis (60% lebar) dan Insight_Panel (40% lebar) berdampingan di baris kedua
3. THE Modal SHALL membatasi lebar maksimalnya pada `max-w-5xl` Tailwind (setara `64rem`) — pada viewport lebih lebar dari 1280px, Modal tidak melebar melebihi nilai ini
4. IF konten Tabel_Geografis lebih lebar dari container-nya, THEN THE Tabel_Geografis SHALL memiliki overflow-x auto di dalam areanya sendiri sehingga tabel bisa di-scroll horizontal — scroll ini tidak menyebabkan scroll pada Modal atau halaman
5. THE Modal SHALL menggunakan Tailwind v4 utility classes untuk semua styling responsif — inline style hanya diperbolehkan untuk nilai yang berasal dari kalkulasi D3 (mis. koordinat SVG, dimensi skala, transformasi koordinat pada elemen SVG/canvas)
