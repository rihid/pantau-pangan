# Product

## Register

product

## Users

Tiga segmen utama, semua berbagi konteks yang sama: mereka mengakses Pantau Pangan di browser, biasanya ingin tahu sekilas apakah harga pangan naik atau turun hari ini.

- **Masyarakat umum** — ibu rumah tangga, konsumen sehari-hari yang ingin tahu apakah harga bahan pokok naik sebelum belanja. Tidak familiar dengan data pemerintah, tidak tahu PIHPS itu apa.
- **Jurnalis dan peneliti** — butuh gambaran cepat tren harga untuk artikel atau laporan. Tidak ingin buka portal BI yang lambat dan berbentuk tabel.
- **Pelaku usaha kecil** — pedagang atau pengolah yang margin-nya tipis dan sensitif terhadap pergerakan harga komoditas.

Job-to-be-done tunggal yang menyatukan ketiganya: **"buka, lihat sekilas, langsung nangkap mana yang naik dan turun."**

## Product Purpose

Pantau Pangan memvisualisasikan pergerakan harga 21 komoditas pangan strategis nasional (data Bank Indonesia PIHPS) dalam bentuk bubble chart interaktif — terinspirasi CryptoBubbles.net.

Masalah yang diselesaikan: data ini tersedia publik, tapi disajikan BI dalam format tabel yang tidak intuitif dan tidak memberikan gambaran cepat. Pantau Pangan mengubah tabel menjadi sinyal visual: bubble besar + merah = naik signifikan, bubble hijau = turun.

Sukses = user bisa membaca situasi harga pangan nasional dalam 5 detik pertama tanpa perlu membaca satu pun angka.

Wujud konkretnya di dashboard: verdict otomatis ("Pasar didominasi kenaikan — 12/21 naik"), bar proporsi naik/turun/stabil, dan daftar Top Movers. Arah pasar terbaca sebelum mata menyentuh bubble chart — ini ekspresi langsung dari job-to-be-done "buka, lihat sekilas, langsung nangkap mana yang naik dan turun."

## Brand Personality

**Segar · Awas · Informatif**

- **Segar**: Data selalu update. Interface terasa hidup, aktif — bukan snapshot yang usang.
- **Awas**: Monitoring-native. Selalu siap menangkap perubahan dan mengangkat sinyal penting ke permukaan.
- **Informatif**: Clear, tidak verbose. Angka dan tren berbicara sendiri; chrome dan ornamen dibuat seminimal mungkin.

Voice: langsung, faktual, Bahasa Indonesia yang wajar — bukan bahasa institusi, bukan bahasa startup.

## Anti-references

- **Portal data pemerintah Indonesia lama** (mis. data.go.id era lawas, PIHPS BI sendiri) — kaku, institutional, tidak personal, terasa seperti database dump bukan tool yang peduli pada pengguna.
- Jangan ada header bergaris-garis tabel yang dingin, warna biru institusional standar, atau layout yang terasa seperti formulir.

## Design Principles

1. **Sinyal dulu, chrome belakangan.** Setiap elemen harus earn keberadaannya. Kalau sebuah elemen tidak membantu user membaca data lebih cepat atau lebih jelas, ia tidak boleh ada.

2. **Warna adalah data, bukan dekorasi.** Hijau/merah/oranye/abu di bubble masing-masing punya makna spesifik. Jangan pakai warna yang sama di elemen UI lain untuk alasan estetika — itu mengaburkan sinyal.

3. **Akrab, bukan intimidating.** Data berat disajikan ringan. Public tool — bukan Bloomberg Terminal. Jargon teknis disimpan di tooltip atau modal, tidak di permukaan utama.

4. **Live feel.** Interface harus terasa seperti sesuatu yang bergerak dan bernapas — bubble yang mengambang, data yang bisa di-refresh, waktu update yang tertera jelas. Bukan screenshot.

5. **Transparansi data.** User selalu bisa tahu: data ini dari mana, seberapa fresh, dan seberapa coverage-nya (footer + badge timeframe). Kepercayaan dibangun dari transparansi, bukan desain yang mahal.

## Accessibility & Inclusion

- Target: **WCAG 2.1 AA**
- Color-blind safe wajib: setiap bubble yang punya warna status (naik/turun) harus juga punya arrow text (↑/↓) dan label persentase — warna bukan satu-satunya sinyal.
- Keyboard navigable: semua filter dan kontrol dapat diakses tanpa mouse.
- Reduced motion: animasi fisika bubble harus dihormati oleh `prefers-reduced-motion`.
- Bahasa Indonesia di semua copy — termasuk error state dan tooltip.
