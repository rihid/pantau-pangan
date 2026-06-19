---
name: Pantau Pangan
description: Visualisasi harga pangan strategis nasional — bubble chart interaktif real-time
colors:
  night-canvas: 'oklch(0.145 0 0)'
  harvest-shadow: 'oklch(0.205 0 0)'
  earth-muted-deep: 'oklch(0.269 0 0)'
  earth-muted: 'oklch(0.439 0 0)'
  dusk-neutral: 'oklch(0.556 0 0)'
  fog-neutral: 'oklch(0.708 0 0)'
  pale-dew: 'oklch(0.922 0 0)'
  rice-white: 'oklch(0.985 0 0)'
  padi-green: 'oklch(0.72 0.15 145)'
  padi-green-deep: 'oklch(0.58 0.15 145)'
  padi-green-subtle: 'oklch(0.85 0.06 145)'
  signal-red: 'oklch(0.63 0.22 27)'
  signal-orange: 'oklch(0.70 0.19 50)'
  signal-stable: 'oklch(0.50 0.00 0)'
  signal-green-strong: 'oklch(0.63 0.19 145)'
  signal-lime: 'oklch(0.72 0.18 127)'
  depth-gradient: 'oklch(0.07 0.01 240)'
typography:
  display:
    fontFamily: 'Geist Sans, -apple-system, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.03em'
  title:
    fontFamily: 'Geist Sans, -apple-system, sans-serif'
    fontSize: '1rem'
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: '-0.01em'
  body:
    fontFamily: 'Geist Sans, -apple-system, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: 'Geist Sans, -apple-system, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "Geist Mono, 'Courier New', monospace"
    fontSize: '0.75rem'
    fontWeight: 400
rounded:
  xs: '6px'
  sm: '8px'
  md: '10px'
  lg: '14px'
  xl: '16px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
  2xl: '32px'
components:
  button-primary:
    backgroundColor: '{colors.rice-white}'
    textColor: '{colors.harvest-shadow}'
    rounded: '{rounded.md}'
    padding: '6px 10px'
  button-primary-hover:
    backgroundColor: '{colors.pale-dew}'
    textColor: '{colors.harvest-shadow}'
    rounded: '{rounded.md}'
    padding: '6px 10px'
  button-outline:
    backgroundColor: 'transparent'
    textColor: '{colors.rice-white}'
    rounded: '{rounded.md}'
    padding: '6px 10px'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.fog-neutral}'
    rounded: '{rounded.md}'
    padding: '6px 10px'
  filter-pill:
    backgroundColor: 'oklch(0.14 0 0 / 0.8)'
    textColor: '{colors.fog-neutral}'
    rounded: '{rounded.full}'
    padding: '4px 12px'
  filter-pill-active:
    backgroundColor: '{colors.harvest-shadow}'
    textColor: '{colors.rice-white}'
    rounded: '{rounded.full}'
    padding: '4px 12px'
  search-input:
    backgroundColor: 'oklch(0.14 0 0 / 0.8)'
    textColor: '{colors.rice-white}'
    rounded: '{rounded.full}'
    padding: '6px 12px'
  tooltip-card:
    backgroundColor: '{colors.harvest-shadow}'
    textColor: '{colors.rice-white}'
    rounded: '{rounded.xl}'
    padding: '16px'
---

# Design System: Pantau Pangan

## 1. Overview

**Creative North Star: "The Public Pulse Board"**

Pantau Pangan adalah papan sinyal publik — seperti layar monitor di terminal atau ruang kontrol, tapi milik siapa saja. Interface-nya tidak memperkenalkan dirinya; ia langsung menunjukkan data. Chrome minimal, sinyal maksimal. Setiap piksel yang bukan data harus earn keberadaannya.

Dark-first bukan karena "tool harus dark." Pertimbangannya konkret: papan harga yang bisa dibuka di pasar saat terik siang atau di kedai kopi malam hari butuh kontras tinggi di semua kondisi ambient. Dark canvas dengan bubble berwarna-warni sinyal memberikan kontras yang lebih bersih daripada background putih di bawah cahaya terik. Ini bukan estetika — ini fungsi.

Satu-satunya brand color yang keluar dari neutral gray adalah **Padi Green** — dipakai eksklusif di logo, glow accent, dan state aktif yang paling penting. Warna sinyal (merah/oranye/hijau/abu di bubble) adalah data, bukan branding; mereka tidak bisa dipinjam untuk elemen dekoratif.

Sistem ini secara eksplisit menolak gaya portal data pemerintah Indonesia lama — tidak ada tabel dingin, header biru institusional, atau layout yang terasa seperti formulir. Semua copy dalam Bahasa Indonesia yang wajar, bukan bahasa birokrasi.

**Key Characteristics:**

- Density terkontrol: informasi padat tapi tidak sesak — tiap elemen tahu ukurannya
- Dark canvas, signal-forward: bubble warna-warni bercerita di atas latar gelap
- Floating controls: header dan filter tidak memakan ruang chart; mereka melayang di atas
- Glass treatment untuk overlay: `backdrop-blur-md` pada floating panels, bukan opaque blocks
- Geist Sans throughout: geometric, clean, digital-native — tidak pernah display font di label data

## 2. Colors: The Field and Signal Palette

Dua lapisan warna: **lapisan Field** (neutrals — canvas dark di sini) dan **lapisan Signal** (warna data bubble yang bersumber dari logika volatilitas, bukan pilihan estetika).

### Primary

- **Padi Green** (`oklch(0.72 0.15 145)`): Brand accent — hanya untuk logo glow, aktif state pada elemen yang paling ingin diperhatikan, dan tonal hint pada permukaan deep-dark. Satu satuan padi di ladang gelap — itulah fungsinya: langka, dan karena itu bermakna.
- **Padi Green Deep** (`oklch(0.58 0.15 145)`): Pair gelap dari Padi Green — dipakai di logo gradient end, hover state, dan glow ambient.

### Neutral

- **Night Canvas** (`oklch(0.145 0 0)`): Background utama dark mode. Hampir-hitam tapi tidak pure black — memberi kedalaman ke gradient di bawahnya.
- **Harvest Shadow** (`oklch(0.205 0 0)`): Card surface, modal background, floating panel. Satu langkah lebih terang dari canvas — tonal layering tanpa shadow.
- **Earth Muted Deep** (`oklch(0.269 0 0)`): Secondary surface — muted background, separator.
- **Earth Muted** (`oklch(0.439 0 0)`): Disabled state, subtle divider.
- **Dusk Neutral** (`oklch(0.556 0 0)`): Muted foreground — secondary text, placeholder, icon.
- **Fog Neutral** (`oklch(0.708 0 0)`): Muted text satu level lebih terang — used di label non-kritis.
- **Pale Dew** (`oklch(0.922 0 0)`): Border, input, light-mode surface.
- **Rice White** (`oklch(0.985 0 0)`): Foreground teks utama dark mode; background utama light mode.
- **Depth Gradient** (`oklch(0.07 0.01 240)`): Faint blue-black — dipakai di dark page gradient mid-stop saja. Memberikan sense of depth ke bawah canvas tanpa obvious color.

### Signal Colors (Data Only — Not Decorative)

- **Signal Red** (`oklch(0.63 0.22 27)`): Naik signifikan (≥ `significant` threshold)
- **Signal Orange** (`oklch(0.70 0.19 50)`): Naik biasa (0 < perubahan < `significant`)
- **Signal Stable** (`oklch(0.50 0.00 0)`): Stabil (|perubahan| < `stable/5`)
- **Signal Green Strong** (`oklch(0.63 0.19 145)`): Turun signifikan
- **Signal Lime** (`oklch(0.72 0.18 127)`): Turun biasa

### Named Rules

**The Signal Quarantine Rule.** Signal colors (merah, oranye, hijau, abu-abu bubble) tidak boleh dipakai di elemen UI apapun yang bukan data volatilitas. Tombol hijau bukan tombol "turun" — tapi user akan membacanya sebagai "turun" karena konteks aplikasi. Satu-satunya exception adalah destructive action (merah untuk error/delete).

**The Padi Green Rule.** Brand accent `oklch(0.72 0.15 145)` dipakai di ≤ 10% dari screen area mana pun. Kelangkaannya adalah poinnya — ketika muncul, user tahu itu penting.

## 3. Typography

**Display/UI Font:** Geist Sans (`var(--font-geist-sans)`, fallback: `-apple-system, sans-serif`)
**Mono Font:** Geist Mono (`var(--font-geist-mono)`) — untuk data numerik, kode, timestamp

**Character:** Geist adalah geometric sans yang dibuat untuk antarmuka digital — bukan editorial, bukan expressive. Sangat tepat untuk papan data: neutral enough to disappear, crisp enough to be readable at small sizes. Satu keluarga dipakai di semua level hierarki; variasi dari weight dan ukuran saja.

### Hierarchy

- **Display** (700, 1.125rem/18px, -0.03em tracking): Nama komoditas di modal header. Hanya di sini — tidak ada h1 besar di halaman utama karena bubble chart IS the display.
- **Title** (600, 1rem/16px, -0.01em): Section labels di modal, header page title "PANTAU PANGAN". All-caps sparingly jika diperlukan ritme.
- **Body** (400, 0.875rem/14px, 1.6 line-height): Teks paragraf insight LLM, deskripsi table, konten modal. Max 65ch untuk prose.
- **Label** (500, 0.75rem/12px): Filter labels, badge text, footer info, tooltip nama komoditas. Medium weight agar terbaca di ukuran kecil.
- **Mono** (400, 0.75rem/12px): Harga (Rp format), persentase perubahan numerik di tooltip, tanggal dalam format YYYY-MM-DD. Mono memberikan alignment kolom dan feel "data terminal."

### Named Rules

**The One Family Rule.** Geist Sans dipakai di semua level. Tidak ada pairing dengan serif, script, atau family lain. Konsistensi adalah branding di product UI.

**The Data-Mono Rule.** Semua angka harga (Rp X.XXX/kg) dan persentase yang muncul di tooltip, footer, atau tabel menggunakan Geist Mono — bukan Geist Sans. Tabular lining figures + monospace width mencegah layout shift saat angka update live.

## 4. Elevation

Sistem ini menggunakan **tonal layering sebagai fondasi** (surface lebih terang dari background = elevated), dengan **ambient glow** untuk elemen yang melayang di atas canvas. Shadow bukan penanda depth default — hanya digunakan untuk elemen yang benar-benar terlepas dari document flow.

### Shadow Vocabulary

- **Float shadow** (`box-shadow: 0 4px 30px rgba(0,0,0,0.5)`): Tooltip bubble saat hover. Element paling "elevated" di page — terasa seperti melayang di atas chart.
- **Modal shadow** (`box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px oklch(1 0 0 / 10%)`): Dialog komoditas detail. Backdrop hitam 80% + shadow untuk menegaskan modal layer.
- **Brand glow** (`box-shadow: 0 0 15px rgba(34,197,94,0.5)`): Logo "P" saja. Ambient glow dari Padi Green — satu-satunya decorative shadow yang diizinkan.
- **Backdrop blur** (`backdrop-filter: blur(12px)`): Floating header, filter pills, search input. Glass treatment — bukan shadow, tapi depth melalui frosted surface.

### Named Rules

**The Flat-By-Default Rule.** Surfaces elevated dari canvas menggunakan tonal color saja (`harvest-shadow` vs `night-canvas`), bukan shadow. Shadow hanya muncul saat element benar-benar escape document flow: tooltip, modal, dan logo glow.

## 5. Components

### Buttons

Rounded dengan gently curved edges (10px/`--radius-md`). Tidak ada pill shape untuk tombol aksi — pill dipakai hanya untuk filter timeframe dan search.

- **Primary** (default): Background `rice-white`, text `harvest-shadow`, 8px × 10px padding. Tinggi 32px (h-8).
- **Hover**: Background `pale-dew`. Transisi 150ms.
- **Outline**: Transparent bg, `border-border`, text `rice-white`. Dipakai di modal timeframe tabs.
- **Ghost**: Transparent, no border, `fog-neutral` text — untuk icon buttons (theme toggle, refresh).
- **Focus**: `ring-3 ring-ring/50` — visible ring, tidak aggressive.
- **Disabled**: `opacity-50`, pointer-events none.
- **Size xs (h-6) / sm (h-7) / default (h-8) / lg (h-9)**: Scale sesuai konteks — xs untuk badge-like labels, default untuk most actions.

### Filter Pills (Timeframe)

- **Container**: `backdrop-blur-md`, `bg-zinc-900/80`, rounded-full, `border border-white/10`. Pill group dalam satu capsule — bukan individual buttons.
- **Inactive**: text `fog-neutral`, hover text `rice-white`, hover bg `earth-muted-deep/50`.
- **Active**: bg `harvest-shadow`, text `rice-white`, subtle shadow.
- **Disabled**: `opacity-40`, `cursor-not-allowed`.
- Transition 150ms colors.

### Search Input

- `rounded-full` (pill), `backdrop-blur-md`, `bg-zinc-900/80`, `border-white/10`.
- Placeholder: `dusk-neutral`.
- Focus: expands from w-36 ke w-48 via CSS transition, `ring-1 ring-white/20`.
- Clear button muncul saat ada value — `fog-neutral` ikon ×.

### Select (Provinsi Filter)

- `rounded-lg` (10px), border `border-input`, bg `transparent`/`dark:bg-input/30`.
- Trigger height h-8, text size 0.875rem.
- Hover: `dark:hover:bg-input/50`.
- Focus: `ring-3 ring-ring/50`.
- Dropdown content: tonal surface elevation, `rounded-lg`, `shadow-md`.

### Tooltip

- `rounded-xl` (16px), `backdrop-blur-md`, `bg-popover`, heavy float shadow.
- Width fixed 180px, min-height auto.
- Nama komoditas: `text-sm font-bold text-popover-foreground`.
- Harga: `text-sm text-muted-foreground`.
- Perubahan: `text-sm font-bold` dengan signal color — merah/hijau/abu sesuai status.
- Sparkline: SVG inline 120×40px, stroke `#9ca3af` — subtle, hanya jika radius bubble ≥ 50px.
- Pointer-events none (tidak interactable).

### Modal / Dialog

- Base: `rounded-lg border`, bg `background` (= `harvest-shadow` dark), `shadow-lg`, transition scale + opacity 200ms.
- Backdrop: `bg-black/80` fullscreen, fade 200ms.
- Max width `max-w-5xl`, max height `90vh`, scrollable.
- Internal: `px-6 pt-6` header, `gap-6` between sections, section headers `text-sm font-medium text-muted-foreground`.

### Bubble Chart (Signature Component)

The heart of the interface. D3 force simulation, SVG-rendered, full-viewport.

- **Canvas**: transparent SVG di atas `bg-page-gradient` (dark: linear dari `night-canvas` → `depth-gradient` → pure black).
- **Bubble fill**: signal colors — merah/oranye/hijau/lime/abu sesuai volatilitas dan timeframe.
- **Radius range**: 40px (BUBBLE_MIN_RADIUS) – 120px (BUBBLE_MAX_RADIUS).
- **Label**: Geist Sans, `fill="white"`, nama komoditas (weight 500) + persentase + arrow (weight 400). Font size scales dengan radius: `max(10, min(22, r × 0.28))`.
- **Sparkline dalam bubble**: polyline putih 60% opacity, hanya jika radius ≥ 50px.
- **Search highlight ring**: `stroke="white" strokeWidth={2} strokeOpacity={0.6}` di luar bubble.
- **Dim non-match**: `opacity: 0.2` untuk bubble yang tidak match search query, transition 200ms.
- **Cursor**: pointer — semua bubble clickable.

### Data Footer

- Full-width strip, height 28px, `bg-zinc-950/80`, `backdrop-blur-sm`, `border-t border-white/5`.
- Text xs, `text-zinc-500` label + `text-zinc-300 font-medium` value.
- Dua kolom: "Data terbaru: {tanggal}" (kiri) + "Akumulasi sejak: {tanggal}" (kanan).

## 6. Do's and Don'ts

### Do:

- **Do** gunakan Padi Green (`oklch(0.72 0.15 145)`) hanya di logo, brand glow, dan satu active state yang paling ingin diperhatikan per screen — kelangkaannya adalah signalnya.
- **Do** gunakan Geist Mono untuk semua angka harga dan persentase di tooltip, footer, dan tabel — tabular figures mencegah layout shift saat data live-update.
- **Do** pertahankan tonal layering: card lebih terang dari background, modal lebih terang dari backdrop — tanpa shadow tambahan.
- **Do** tampilkan arrow (↑/↓) di samping persentase di semua konteks: bubble label, tooltip, modal header. Warna bukan satu-satunya sinyal — aksesibilitas color-blind wajib.
- **Do** gunakan `backdrop-blur-md` untuk floating glass panels (header, filter pills, search, tooltip) — bukan opaque blocks.
- **Do** pertahankan signal color quarantine: merah/oranye/hijau/abu di bubble adalah data; jangan dipakai di elemen UI lain yang bukan data volatilitas.
- **Do** scale bubble label font size dengan radius bubble (`max(10, min(22, r × 0.28))`) — text yang lebih besar dari bubblenya adalah hard failure.
- **Do** semua copy dalam Bahasa Indonesia yang wajar — bukan bahasa institusi ("Terjadi kesalahan sistem" → "Gagal memuat data").
- **Do** tampilkan sparkline di dalam bubble HANYA jika radius ≥ 50px. Di bawah itu, sparkline masuk tooltip saja.
- **Do** gunakan skeleton loader (SVG bubble placeholder dengan `animate-pulse`) untuk loading state, bukan spinner di tengah canvas.

### Don't:

- **Don't** gunakan portal data pemerintah Indonesia lama sebagai referensi — tidak ada tabel berformat zebra-stripe biru, header dengan warna institusional, atau layout yang terasa seperti form administrasi.
- **Don't** gunakan signal colors (merah `#ef4444`, oranye `#f97316`, hijau `#22c55e`, lime `#84cc16`) di elemen UI apapun selain bubble chart dan perubahan harga. User akan membaca warna itu sebagai data, bukan branding.
- **Don't** pakai side-stripe borders (`border-left > 1px` dengan warna accent) di card, list item, atau callout.
- **Don't** pakai gradient text (`background-clip: text`). Semua teks solid color.
- **Don't** pakai display font (serif, script, expressive) di label, button, atau data — hanya Geist Sans dan Geist Mono.
- **Don't** tambah shadow ke card atau container yang masih di dalam document flow — tonal layering sudah cukup.
- **Don't** gunakan warna abu-abu muted untuk body text jika kontras < 4.5:1 terhadap backgroundnya. "Elegant muted gray" yang tidak terbaca adalah failure, bukan estetika.
- **Don't** pakai modal sebagai first resort untuk interaksi sederhana — tooltip dan inline state lebih baik untuk info yang tidak membutuhkan full-screen focus.
- **Don't** animasi layout properties (width, height, margin) — gunakan transform dan opacity saja.
- **Don't** skip `prefers-reduced-motion` — semua animasi (bubble physics jika diimplementasikan sebagai CSS, skeleton pulse, modal transition) wajib punya fallback instan.
- **Don't** hardcode `zinc-*` Tailwind classes di komponen baru — gunakan CSS variables (`text-muted-foreground`, `bg-background`, dll) agar light mode juga bekerja. Zinc hardcode di komponen lama adalah debt yang perlu dibersihkan sebelum M7 deploy.
