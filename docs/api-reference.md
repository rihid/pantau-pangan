# BI PIHPS API Reference
> Dokumentasi teknis endpoint Bank Indonesia — Pusat Informasi Harga Pangan Strategis Nasional  
> Dikumpulkan melalui inspeksi Network Tab browser pada bi.go.id/hargapangan

**Base URL:** `https://www.bi.go.id/hargapangan/WebSite/Home`  
**Auth:** Semua endpoint public, tidak butuh session, cookie, atau API key  
**Format response:** `application/json`  
**Verified:** 22 Mei 2026

---

## Parameter Fix (selalu dikirim)

| Parameter | Nilai | Keterangan |
|---|---|---|
| `PriceTypeId` | `1` | Pasar Tradisional — satu-satunya yang kita pakai |
| `isPasokan` | `1` | Filter pasokan aktif |

---

## Endpoint yang Dipakai

### 1. `GetCommoditiesTree`

**Kegunaan:** Master data semua komoditas beserta hierarki kategori parent-child.  
**Kapan dipakai:** Seed DB saat pertama deploy, dan periodic sync (komoditas jarang berubah).

**Request:**
```
GET {BASE_URL}/GetCommoditiesTree?_={timestamp}
```

| Param | Tipe | Keterangan |
|---|---|---|
| `_` | number | Unix timestamp, dipakai sebagai cache buster |

**Contoh URL:**
```
https://www.bi.go.id/hargapangan/WebSite/Home/GetCommoditiesTree?_=1779570224425
```

**Struktur response:**
```json
[
  {
    "id": "1",
    "text": "Beras",
    "expanded": true,
    "items": [
      { "id": "1_1", "text": "Beras Kualitas Bawah I", "comId": 1 },
      { "id": "1_2", "text": "Beras Kualitas Bawah II", "comId": 2 },
      { "id": "1_3", "text": "Beras Kualitas Medium I", "comId": 3 },
      { "id": "1_4", "text": "Beras Kualitas Medium II", "comId": 4 },
      { "id": "1_5", "text": "Beras Kualitas Super I", "comId": 5 },
      { "id": "1_6", "text": "Beras Kualitas Super II", "comId": 6 }
    ]
  }
]
```

**Catatan:**
- `id` pada parent = nomor kategori (string)
- `id` pada leaf = `"{kategori}_{urutan}"` (string)
- `comId` pada leaf = integer, ini yang dipakai sebagai `ComId` di endpoint lain
- Node parent tidak punya `comId`
- Total: 10 kategori, 21 komoditas leaf

**Daftar 21 komoditas leaf:**

| comId | Nama | Kategori |
|---|---|---|
| 1 | Beras Kualitas Bawah I | Beras |
| 2 | Beras Kualitas Bawah II | Beras |
| 3 | Beras Kualitas Medium I | Beras |
| 4 | Beras Kualitas Medium II | Beras |
| 5 | Beras Kualitas Super I | Beras |
| 6 | Beras Kualitas Super II | Beras |
| 7 | Daging Ayam Ras Segar | Daging Ayam |
| 8 | Daging Sapi Kualitas 1 | Daging Sapi |
| 9 | Daging Sapi Kualitas 2 | Daging Sapi |
| 10 | Telur Ayam Ras Segar | Telur Ayam |
| 11 | Bawang Merah Ukuran Sedang | Bawang Merah |
| 12 | Bawang Putih Ukuran Sedang | Bawang Putih |
| 13 | Cabai Merah Besar | Cabai Merah |
| 14 | Cabai Merah Keriting | Cabai Merah |
| 15 | Cabai Rawit Hijau | Cabai Rawit |
| 16 | Cabai Rawit Merah | Cabai Rawit |
| 17 | Minyak Goreng Curah | Minyak Goreng |
| 18 | Minyak Goreng Kemasan Bermerk 1 | Minyak Goreng |
| 19 | Minyak Goreng Kemasan Bermerk 2 | Minyak Goreng |
| 20 | Gula Pasir Kualitas Premium | Gula Pasir |
| 21 | Gula Pasir Lokal | Gula Pasir |

---

### 2. `GetDetailGridData2`

**Kegunaan:** Harga 5 hari terakhir per komoditas, breakdown lengkap nasional → provinsi → kota → pasar.  
**Kapan dipakai:**
1. **Scraper harian** — ambil harga terbaru semua level, simpan ke DB
2. **Modal detail FE** — tabel geografis live saat bubble diklik

**Request:**
```
GET {BASE_URL}/GetDetailGridData2?ProvId={provId}&PriceTypeId=1&ComId={comId}&date={date}&isPasokan=1&_={timestamp}
```

| Param | Tipe | Keterangan |
|---|---|---|
| `ComId` | integer | ID komoditas dari `GetCommoditiesTree` |
| `ProvId` | integer | `0` = semua provinsi. ID provinsi untuk filter spesifik |
| `PriceTypeId` | integer | Fix `1` = Pasar Tradisional |
| `isPasokan` | integer | Fix `1` |
| `date` | string | Format: `"22 May 2026"` (bahasa Inggris). **⚠️ Param ini tidak berpengaruh** — response selalu return 5 hari terakhir dari server |
| `_` | number | Cache buster timestamp |

**⚠️ Perilaku penting:**
- Parameter `date` **diabaikan oleh server** — response selalu berisi 5 hari kalender terakhir dari data terbaru BI, bukan berdasarkan `date` yang dikirim
- Tidak ada cara untuk query historis lebih dari 5 hari — itulah kenapa kita akumulasi sendiri di DB

**Contoh URL:**
```
https://www.bi.go.id/hargapangan/Website/Home/GetDetailGridData2?ProvId=0&PriceTypeId=1&ComId=7&date=22%20May%202026&isPasokan=1&_=1779570026797
```

**Struktur response:**
```json
{
  "data": [
    {
      "id": 0,
      "name": "Semua Provinsi",
      "category": "0",
      "level": 0,
      "18/05/2026": 48350.0,
      "19/05/2026": 47800.0,
      "20/05/2026": 48100.0,
      "21/05/2026": 48200.0,
      "22/05/2026": 48350.0
    },
    {
      "id": 1,
      "name": "Aceh",
      "category": "0",
      "level": 1,
      "18/05/2026": 35100.0,
      "19/05/2026": 35100.0,
      "20/05/2026": 34950.0,
      "21/05/2026": 34950.0,
      "22/05/2026": 34950.0
    },
    {
      "id": 1,
      "name": "Kota Banda Aceh",
      "category": "Aceh",
      "level": 2,
      "18/05/2026": 36250.0,
      "19/05/2026": 36250.0,
      "20/05/2026": 36250.0,
      "21/05/2026": 36250.0,
      "22/05/2026": 36250.0
    },
    {
      "id": 1,
      "name": "Pasar Peunayong",
      "category": "Kota Banda Aceh",
      "level": 3,
      "18/05/2026": 35750.0,
      "19/05/2026": 35750.0,
      "20/05/2026": 35750.0,
      "21/05/2026": 35750.0,
      "22/05/2026": 35750.0
    }
  ]
}
```

**Field penting:**

| Field | Keterangan |
|---|---|
| `level` | `0` = nasional, `1` = provinsi, `2` = kota/kabupaten, `3` = pasar |
| `name` | Nama entitas pada level tersebut |
| `category` | Nama parent — `"0"` untuk nasional, nama provinsi untuk kota, nama kota untuk pasar |
| `id` | ID entitas — **perhatian: tidak unik antar level**, hanya unik dalam satu level |
| `"{DD/MM/YYYY}"` | Key dinamis berisi harga (float) pada tanggal tersebut. Selalu ada 5 key tanggal |

**Cara parsing kolom tanggal:**
```typescript
// Key tanggal adalah dynamic key dengan format "DD/MM/YYYY"
// Cara identify: filter key yang match pattern tanggal
const dateKeys = Object.keys(row).filter(k => /^\d{2}\/\d{2}\/\d{4}$/.test(k))
const sortedDates = dateKeys.sort() // ascending
const latestDate = sortedDates[sortedDates.length - 1]  // harga terbaru
const prevDate = sortedDates[sortedDates.length - 2]    // harga kemarin
const hargaHariIni = row[latestDate]
const hargaKemarin = row[prevDate]
const perubahan = ((hargaHariIni - hargaKemarin) / hargaKemarin) * 100
```

---

## Endpoint yang Tidak Dipakai

| Endpoint | Alasan |
|---|---|
| `GetChartData` | `tempId` adalah session-based UUID yang di-generate BI per session — berbeda setiap kali halaman dibuka dan wajib ada. Tidak bisa di-hardcode, tidak bisa diakses dari server. Sparkline bubble dibangun dari `harga_harian` DB sendiri |
| `GetHistogramData` | Return `[]` — data sudah cukup dari `GetDetailGridData2` |
| `GetType` | Hardcode `PriceTypeId=1` (Pasar Tradisional) |
| `GetProvinceAll` | Hanya return satu provinsi by filter ID — list provinsi sudah ada di `GetDetailGridData2` level 1 |
| `GetDummyMarkerForLegend` | UI legend peta choropleth BI, tidak relevan untuk project ini |

---

## Cara Fetch (Scraper)

Semua endpoint bisa di-hit dengan **Bun native fetch**, tanpa library tambahan:

```typescript
const BASE_URL = 'https://www.bi.go.id/hargapangan/WebSite/Home'

async function fetchDetailGrid(comId: number, provId = 0) {
  const params = new URLSearchParams({
    ProvId: String(provId),
    PriceTypeId: '1',
    ComId: String(comId),
    date: new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric'
    }),
    isPasokan: '1',
    _: String(Date.now()),
  })

  const res = await fetch(`${BASE_URL}/GetDetailGridData2?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ComId=${comId}`)
  return res.json()
}
```

**Headers yang perlu dikirim:** Tidak ada header khusus yang diperlukan. Request tanpa header pun berhasil (confirmed dari testing).

**Rate limiting:** Tidak ada rate limiting yang terdeteksi, tapi sebaiknya tambahkan delay kecil (100–200ms) antar request sebagai courtesy.

---

## Catatan Tambahan

- BI update data **setiap hari termasuk weekend**
- Waktu update belum deterministik — scraper jalan dengan **retry adaptif jam 07.00 / 11.00 / 15.00 WIB**: setiap run cek apakah `MAX(tanggal)` dalam response sudah == hari ini, kalau belum lanjut ke run berikutnya. Upsert idempotent jadi aman dijalankan ulang.
- Format tanggal di URL: `GetDetailGridData2` pakai bahasa Inggris (`22 May 2026`), bukan Indonesia
- Semua harga dalam satuan **Rupiah per Kg** kecuali ada keterangan lain di field `denomination`
- **Provinsi:** Per Mei 2026, BI PIHPS masih mengenal **34 provinsi** (Papua & Papua Barat saja, belum mengikuti pemekaran wilayah Papua terbaru). Aplikasi mengikuti taksonomi BI apa adanya — tidak melakukan mapping/split sendiri.
