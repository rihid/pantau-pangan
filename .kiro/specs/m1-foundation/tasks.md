# Implementation Plan: M1 — Foundation (v2)

## Overview

Versi ini menulis ulang task list M1 berdasarkan tiga prinsip:

1. **Self-verify per task** — setiap task wajib menjalankan verifikasi sendiri (`bun run lint`, `typecheck`, `build`, atau test runtime sesuai konteks) sebelum dianggap selesai. Error harus ketemu cepat, bukan terkubur sampai akhir.
2. **Latest version** — instalasi dependency pakai `bun add` dengan range terbuka (mis. `bun add hono` tanpa pin manual). Tidak hardcode `^4.6.0` dan sebagainya. Sub-agent dilarang edit `package.json` dependencies langsung untuk menambah package — gunakan `bun add` / `bun add -d`.
3. **Reference docs resmi terbaru** — sebelum menulis konfigurasi tool tertentu, sub-agent WAJIB cek dokumentasi resmi terbaru via `web_fetch` atau `remote_web_search` dan ikuti pattern idiomatic yang direkomendasikan, bukan tebakan dari memory.

### Auto-recover Policy

Saat self-verify gagal: sub-agent boleh **auto-recover sampai 2 attempt** (cek docs lagi, coba pattern alternatif). Hanya stop ke orchestrator setelah attempt ke-2 masih gagal, dengan analisis root cause yang jelas.

### Catatan PBT

PBT TIDAK applicable untuk M1 (IaC/tooling). Verifikasi sepenuhnya via self-verify per task + integration test akhir di Task 10.

### Dokumentasi Sumber

Saat sub-agent perlu cek docs, sumber prioritas (cek tanggal terbaru):

- Bun: https://bun.sh/docs
- Turborepo: https://turborepo.com/docs (atau turbo.build/repo/docs)
- ESLint flat config: https://eslint.org/docs/latest/use/configure/configuration-files
- typescript-eslint v8: https://typescript-eslint.io/getting-started/typed-linting
- Husky v9+: https://typicode.github.io/husky/
- lint-staged: https://github.com/lint-staged/lint-staged
- commitlint: https://commitlint.js.org/guides/getting-started.html
- Next.js (App Router): https://nextjs.org/docs
- Hono: https://hono.dev/docs

### Dependency Graph antar Task

```
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
```

Versi v2 sengaja serial (bukan paralel) supaya setiap task self-verify dengan state yang stabil. Task 10 = integration test acceptance final (gabungan dari 9-step lama, tapi sebagian besar sudah dicover oleh self-verify per task).

## Tasks

- [x] 1. Init root workspace minimal + verify Bun runtime
  - Cek versi Bun terpasang (`bun --version`). Pin ke versi tersebut di field `packageManager` (`bun@<version>`).
  - Buat root `package.json` minimal: `name: "pantau-pangan"`, `private: true`, `type: "module"`, `packageManager`, `workspaces: ["apps/*", "packages/*"]`. Belum ada scripts atau dependencies.
  - Buat `.gitignore` dengan entry: `node_modules/`, `.env`, `.env.local`, `.env.*.local`, `.turbo/`, `dist/`, `.next/`, `coverage/`, `*.log`, `.DS_Store`. JANGAN ignore `bun.lock`, `bun.lockb`, atau `.env.example`.
  - Buat `.env.example` minimal: `DATABASE_URL`, `OPENROUTER_API_KEY`, `API_PORT=3001`, `NEXT_PUBLIC_API_URL=http://localhost:3001`. Komentar Bahasa Indonesia, no real secret.
  - **Self-verify:**
    - `bun --version` exit 0.
    - `bun -e "console.log(JSON.parse(await Bun.file('package.json').text()).workspaces)"` print `["apps/*", "packages/*"]`.
    - `cat .gitignore | grep -E "^(node_modules/|\.env)$"` match.
    - `cat .env.example | grep -E "^(DATABASE_URL|OPENROUTER_API_KEY|API_PORT|NEXT_PUBLIC_API_URL)="` count == 4.
  - **Docs to consult:** Bun workspaces (https://bun.sh/docs/install/workspaces).
  - **Dependency:** none.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 2. Install + config TypeScript base + Turborepo (latest)
  - Cek dulu **dokumentasi terbaru Turborepo 2.x** (https://turborepo.com/docs) untuk format `turbo.json` yang current. Konfirmasi key (`tasks` vs `pipeline`), schema URL, dan field per-task (`dependsOn`, `outputs`, `cache`, `persistent`).
  - Install dengan `bun add -d typescript @types/bun turbo` di root. Jangan pin manual.
  - Buat root `tsconfig.json` (Base_Tsconfig) sesuai design.md Component 3: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`, `target: "ESNext"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `verbatimModuleSyntax: true`, `isolatedModules: true`, `esModuleInterop: true`, `forceConsistentCasingInFileNames: true`, `skipLibCheck: true`, `resolveJsonModule: true`, `lib: ["ESNext"]`, `declaration: true`, `declarationMap: true`, `sourceMap: true`, `exclude: ["node_modules", "dist", ".next", ".turbo"]`.
  - Buat `turbo.json` mengikuti format yang **kamu konfirmasi dari docs**. Tasks: `build` (`dependsOn: ["^build"]`, `outputs: [".next/**", "!.next/cache/**", "dist/**"]`), `typecheck` (`dependsOn: ["^build"]`, `outputs: []`), `lint` (`outputs: []`), `dev` (`cache: false`, `persistent: true`), `scrape` (`dependsOn: ["^build"]`, `cache: false`).
  - Tambah scripts ke root `package.json`: `dev` → `turbo run dev`, `dev:api` → `turbo run dev --filter=@pantau-pangan/api`, `dev:web` → `turbo run dev --filter=@pantau-pangan/web`, `build` → `turbo run build`, `lint` → `turbo run lint`, `lint:fix` → `turbo run lint -- --fix`, `typecheck` → `turbo run typecheck`, `format` → `prettier --write .`, `format:check` → `prettier --check .`, `scrape` → `turbo run scrape --filter=@pantau-pangan/scraper`.
  - **Self-verify:**
    - `bun install` exit 0, `bun.lock`/`bun.lockb` ter-generate.
    - `bun -e "console.log(JSON.parse(await Bun.file('turbo.json').text()))"` parse sukses.
    - `bunx turbo --version` print versi (mengkonfirmasi turbo executable).
    - `bunx tsc --version` print versi 5.x.
    - `bunx turbo run typecheck` exit 0 (TIDAK error walau belum ada package — Turbo akan log "no tasks to run" karena workspace kosong).
  - **Docs to consult:** Turborepo getting started (https://turborepo.com/docs/getting-started/installation), turbo.json reference (https://turborepo.com/docs/reference/configuration), TypeScript tsconfig (https://www.typescriptlang.org/tsconfig).
  - **Dependency:** Task 1.
  - _Requirements: 2.1–2.16, 3.1–3.8_

- [x] 3. Install + config ESLint flat + Prettier (latest, idiomatic typescript-eslint v8)
  - **WAJIB cek docs typescript-eslint v8 terbaru** (https://typescript-eslint.io/getting-started/typed-linting dan https://typescript-eslint.io/packages/typescript-eslint/) untuk pola flat config idiomatic. Khusus perhatikan:
    - Penggunaan `tseslint.config()` helper (vs spread biasa)
    - `parserOptions.projectService` untuk auto-detect tsconfig
    - `allowDefaultProject` option untuk file di luar TS project (mis. `*.config.{js,mjs,cjs,ts}`)
  - Install: `bun add -d eslint typescript-eslint @eslint/js globals prettier eslint-config-prettier`. Tanpa pin manual.
  - Buat `eslint.config.js` flat config menggunakan helper `tseslint.config()` jika dokumentasi merekomendasikan. Pastikan:
    - Block ignores: `**/dist/**`, `**/.next/**`, `**/.turbo/**`, `**/node_modules/**`, `**/coverage/**`.
    - Block JS recommended.
    - Block TS recommendedTypeChecked DENGAN `parserOptions.projectService` configured agar **menerima file config** (mis. `eslint.config.js`, `commitlint.config.js`, `next.config.mjs`, `*.config.ts`) tanpa error "not found by project service". Gunakan opsi `allowDefaultProject` atau pattern setara dari docs terbaru.
    - Block project-wide rules: `@typescript-eslint/no-unused-vars` (error, ignore `^_`), `@typescript-eslint/consistent-type-imports` (error), `@typescript-eslint/no-floating-promises` (error), `no-console` (warn, allow `warn`/`error`).
    - Block scope override `apps/web/**/*.{ts,tsx}` dengan globals browser + node.
    - Block `eslintConfigPrettier` di posisi terakhir.
  - Buat `.prettierrc.json`: `semi: false`, `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`, `tabWidth: 2`, `arrowParens: "always"`, `endOfLine: "lf"`.
  - Buat `.prettierignore`: `node_modules`, `dist`, `.next`, `.turbo`, `coverage`, `bun.lock`, `bun.lockb`, `.env`, `.env.*`, `!.env.example`.
  - **Self-verify:**
    - `bunx eslint --version` print v9.x.
    - `bunx prettier --version` print v3.x.
    - `bunx eslint eslint.config.js` exit 0 (config file me-lint dirinya sendiri TANPA error parse-related).
    - `bunx eslint .` exit 0 (root, no source files lain — must lulus karena belum ada package).
    - `bunx prettier --check .` exit 0 atau report only style issues di docs (PRD/CLAUDE/etc), JANGAN error config.
  - **Docs to consult:** ESLint flat config migration guide (https://eslint.org/docs/latest/use/configure/migration-guide), typescript-eslint v8 typed linting (https://typescript-eslint.io/getting-started/typed-linting), Prettier configuration (https://prettier.io/docs/en/configuration.html).
  - **Dependency:** Task 2.
  - _Requirements: 4.1–4.13_

- [x] 4. Install + config Husky + lint-staged + commitlint (latest, Husky v9+ idiomatic)
  - **WAJIB cek docs Husky v9+** (https://typicode.github.io/husky/get-started.html) untuk format hook file terbaru — Husky v9+ TIDAK pakai shebang `#!/usr/bin/env sh`, hanya command langsung. Konfirmasi.
  - Install: `bun add -d husky lint-staged @commitlint/cli @commitlint/config-conventional`.
  - Tambah field `lint-staged` ke root `package.json`: `*.{ts,tsx}` → `["eslint --fix", "prettier --write"]`, `*.{json,md,yml,yaml,css}` → `["prettier --write"]`.
  - Tambah script `prepare` → `husky` di root `package.json`.
  - Buat `commitlint.config.js` (ESM karena root `type: "module"`): `extends: ['@commitlint/config-conventional']`, rule `type-enum` (`feat`/`fix`/`chore`/`docs`/`refactor`/`test`/`style`/`perf`/`ci`/`build`/`revert`), `subject-case: [0]`, `header-max-length: [2, 'always', 100]`.
  - Inisialisasi Husky: `bunx husky init` (atau cara yang docs rekomendasi). Ini akan generate `.husky/pre-commit` default — REPLACE isinya dengan `bunx lint-staged`.
  - Buat `.husky/commit-msg` dengan content `bunx commitlint --edit "$1"`.
  - Buat `.husky/pre-push` dengan content `bun run typecheck`.
  - `chmod +x .husky/pre-commit .husky/commit-msg .husky/pre-push`.
  - Run `bun install` lagi untuk trigger lifecycle `prepare`.
  - **Self-verify:**
    - `git config core.hooksPath` print `.husky/_` (Husky v9+ default).
    - `cat .husky/pre-commit` mengandung `bunx lint-staged`.
    - `cat .husky/commit-msg` mengandung `bunx commitlint --edit`.
    - `cat .husky/pre-push` mengandung `bun run typecheck`.
    - File hook executable: `test -x .husky/pre-commit && test -x .husky/commit-msg && test -x .husky/pre-push`.
    - `bunx commitlint --version` print v19+.
    - Test commitlint langsung: `echo "bad message" | bunx commitlint` exit non-zero. Test format conventional: `echo "feat: test" | bunx commitlint` exit 0.
  - **Docs to consult:** Husky v9 init (https://typicode.github.io/husky/get-started.html), lint-staged setup (https://github.com/lint-staged/lint-staged#configuration), commitlint config (https://commitlint.js.org/reference/configuration.html).
  - **Dependency:** Task 3.
  - _Requirements: 5.1–5.10_

- [x] 5. Skeleton `packages/shared` (leaf) + self-verify build
  - Buat folder `packages/shared/{package.json, tsconfig.json, tsconfig.build.json, src/{index.ts, types.ts, constants.ts, utils.ts}}`.
  - `packages/shared/package.json`: `name: "@pantau-pangan/shared"`, `private`, `type: "module"`, `main: "./dist/index.js"`, `types: "./dist/index.d.ts"`, `exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } }`, scripts: `build` → `tsc -p tsconfig.build.json`, `lint` → `eslint .`, `typecheck` → `tsc --noEmit`. Jangan tambah devDependency lokal (TypeScript akan resolve dari root).
  - `tsconfig.json` extends `../../tsconfig.json`, `rootDir: "src"`, `outDir: "dist"`, `include: ["src/**/*"]`.
  - `tsconfig.build.json` extends `./tsconfig.json`, `noEmit: false`, `declaration: true`.
  - `src/index.ts` re-export `./types`, `./constants`, `./utils`. Tiga file lain isi `export {}`.
  - Run `bun install` di root supaya workspace ter-link.
  - **Self-verify (jalankan dari root):**
    - `bun install` exit 0; `node_modules/@pantau-pangan/shared` adalah symlink ke `packages/shared`.
    - `bun --filter=@pantau-pangan/shared run typecheck` exit 0.
    - `bun --filter=@pantau-pangan/shared run lint` exit 0.
    - `bun --filter=@pantau-pangan/shared run build` exit 0; verify `packages/shared/dist/index.js` dan `packages/shared/dist/index.d.ts` ada.
  - **Docs to consult:** Bun workspaces filter (https://bun.sh/docs/install/workspaces), TypeScript project references basic (https://www.typescriptlang.org/docs/handbook/project-references.html).
  - **Dependency:** Task 4.
  - _Requirements: 1.7, 1.13, 8.1–8.10_

- [x] 6. Skeleton `apps/api` via `bun create hono` (template `bun`) + adapt ke monorepo
  - Cek docs Hono terbaru (https://hono.dev/docs/getting-started/bun) untuk konfirmasi template name dan struktur output `bun create hono`.
  - **Scaffold via CLI resmi:** `bun create hono@latest apps/api --template bun --pm bun --install`. Ini akan generate `apps/api/` dengan struktur Hono official (package.json, tsconfig.json, src/index.ts).
  - **Adapt ke monorepo kita:**
    - Edit `apps/api/package.json`: rename `name` ke `@pantau-pangan/api`, set `private: true`, set `type: "module"`. Pertahankan dependency Hono yang scaffold install (latest version dari registry).
    - Tambah `@pantau-pangan/shared@workspace:*` ke dependencies via `bun add @pantau-pangan/shared@workspace:* --cwd apps/api` (atau cara setara yang docs Bun rekomendasi).
    - Tambah scripts kalau belum ada: `dev` → `bun run --hot src/index.ts`, `build` → `bun build src/index.ts --outdir=dist --target=bun`, `start` → `bun run dist/index.js`, `lint` → `eslint .`, `typecheck` → `tsc --noEmit`.
    - Edit `apps/api/tsconfig.json`: pastikan extends `../../tsconfig.json` + tambah `compilerOptions.types: ["bun"]`. Kalau scaffold kasih config terpisah tanpa extends, REPLACE dengan versi yang extends root supaya strict baseline kepakai.
    - **Sesuaikan source `apps/api/src/index.ts`** ke format yang spec kita pakai: route `GET /` → `c.json({ status: 'ok', service: 'pantau-pangan-api' })`, default export `{ port: Number(Bun.env.API_PORT) || 3001, fetch: app.fetch }`. Ganti default scaffold (yang biasanya `Hono.get('/', (c) => c.text('Hello Hono!'))`).
    - Hapus file lain yang tidak relevan (mis. `.gitignore` per-package, `README.md` scaffold, `tsconfig.json` per-package yang tidak extends root).
  - **Self-verify:**
    - `bun --filter=@pantau-pangan/api run typecheck` exit 0.
    - `bun --filter=@pantau-pangan/api run lint` exit 0 (root flat config harus cover apps/api/src tanpa file ESLint per-package).
    - `bun --filter=@pantau-pangan/api run build` exit 0; `apps/api/dist/index.js` ada.
    - **Runtime test:** start `bun --filter=@pantau-pangan/api run dev` via `control_bash_process` action=start. Tunggu 5 detik. `curl -s http://localhost:3001/` → expect JSON `{"status":"ok","service":"pantau-pangan-api"}`. Stop process via `control_bash_process` action=stop.
  - **Docs to consult:** Hono getting-started Bun (https://hono.dev/docs/getting-started/bun), Bun create command (https://bun.sh/docs/cli/bun-create), Bun bundler (https://bun.sh/docs/bundler).
  - **Dependency:** Task 5.
  - _Requirements: 1.5, 1.10, 3.10, 6.1–6.11_

- [x] 7. Skeleton `apps/web` via `create-next-app` (TS + Tailwind + App Router) + adapt ke monorepo
  - Cek docs Next.js terbaru (https://nextjs.org/docs/app/getting-started/installation) untuk versi stable terkini (v15+) dan flag CLI `create-next-app` yang current. Konfirmasi compatibility dengan Bun runtime.
  - **Scaffold via CLI resmi:** Run dari workspace root:
    ```
    bunx create-next-app@latest apps/web \
      --typescript \
      --eslint \
      --tailwind \
      --app \
      --no-src-dir \
      --import-alias "@/*" \
      --use-bun \
      --skip-install
    ```
    Flag `--skip-install` supaya Bun workspace resolver tidak konflik; install dilakukan via `bun install` dari root setelah package.json di-adjust.
  - **Adapt ke monorepo kita:**
    - Edit `apps/web/package.json`: rename `name` ke `@pantau-pangan/web`, pastikan `private: true`. Pertahankan deps Next/React/Tailwind dari scaffold.
    - Tambah `@pantau-pangan/shared@workspace:*` ke dependencies.
    - Tambah scripts standar kalau belum ada: `typecheck` → `tsc --noEmit` (Next scaffold biasanya tidak include ini).
    - **HAPUS ESLint config per-package** yang scaffold generate (`apps/web/eslint.config.mjs` atau `apps/web/.eslintrc.json`). Sesuai keputusan: single source ESLint = root `eslint.config.js`.
    - Edit `apps/web/tsconfig.json`: pastikan extends `../../tsconfig.json` (kalau scaffold tidak extend, REPLACE dengan versi yang extends root + Next-specific options: `jsx: "preserve"`, `lib: ["DOM", "DOM.Iterable", "ESNext"]`, `plugins: [{ "name": "next" }]`, `allowJs: true`, `incremental: true`, `noEmit: true`, `paths: { "@/*": ["./*"] }`).
    - Pastikan `next.config.mjs` (ESM) ada dengan `transpilePackages: ['@pantau-pangan/shared']`. Kalau scaffold kasih `next.config.ts`, BIARKAN itu (Next 15+ support TS config) tapi tambahkan `transpilePackages` ke config-nya.
    - Edit `app/layout.tsx`: ganti metadata title/description ke "Pantau Pangan", `lang="id"`.
    - Edit `app/page.tsx`: ganti default scaffold content ke placeholder minimal "Pantau Pangan — coming soon".
    - Hapus file scaffold yang tidak relevan (mis. file gambar default Next, `apps/web/.gitignore` kalau redundant dengan root, file demo CSS yang tidak dipakai).
    - Run `bun install` di root untuk resolve workspace.
  - **Self-verify:**
    - `bun --filter=@pantau-pangan/web run typecheck` exit 0.
    - `bun --filter=@pantau-pangan/web run lint` exit 0 — root flat config HARUS cover apps/web tanpa per-package config. Ini titik krusial — kalau gagal karena typescript-eslint v8 strict mode, baca error, ikuti auto-recover policy (cek docs typescript-eslint untuk `allowDefaultProject`).
    - `bun --filter=@pantau-pangan/web run build` exit 0; `apps/web/.next/` ada.
    - **Runtime test:** start `bun --filter=@pantau-pangan/web run dev` background via `control_bash_process` action=start. Tunggu 10 detik (Next.js cold start). `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → expect `200`. Stop process.
  - **Docs to consult:** Next.js installation manual (https://nextjs.org/docs/app/getting-started/installation), `create-next-app` flags (https://nextjs.org/docs/app/api-reference/cli/create-next-app), Next + Bun guide (https://bun.sh/guides/ecosystem/nextjs), transpilePackages (https://nextjs.org/docs/app/api-reference/next-config-js/transpilePackages).
  - **Dependency:** Task 6.
  - _Requirements: 1.6, 1.11, 3.11, 7.1–7.12_

- [x] 8. Skeleton `packages/scraper` (Bun fetch native) + self-verify run
  - Buat folder `packages/scraper/{package.json, tsconfig.json, src/index.ts}`.
  - `package.json`: `name: "@pantau-pangan/scraper"`, `private`, `type: "module"`, scripts: `dev`, `build`, `scrape` → `bun run src/index.ts`, `lint`, `typecheck`. Tanpa HTTP library — Bun fetch native zero dep.
  - Install: `bun add @pantau-pangan/shared@workspace:* --filter=@pantau-pangan/scraper`.
  - `tsconfig.json` extends root, `types: ["bun"]`.
  - `src/index.ts`:

    ```typescript
    function main(): void {
      console.warn('Pantau Pangan scraper — placeholder, akan diisi di M2')
    }

    main()
    ```

    Pakai `console.warn` (sesuai rule ESLint).

  - **Self-verify:**
    - `bun --filter=@pantau-pangan/scraper run typecheck` exit 0.
    - `bun --filter=@pantau-pangan/scraper run lint` exit 0.
    - `bun --filter=@pantau-pangan/scraper run build` exit 0; `packages/scraper/dist/` ada.
    - **Runtime test:** `bun run scrape` (dari root) → expect stderr/stdout berisi "placeholder, akan diisi di M2", exit 0.
    - Verifikasi tidak ada HTTP lib forbidden: `grep -E "axios|ky|node-fetch|got|superagent|playwright" packages/scraper/package.json` → no match.
  - **Docs to consult:** Bun fetch (https://bun.sh/docs/api/fetch), AGENTS.md "Yang Tidak Boleh Dilakukan".
  - **Dependency:** Task 7.
  - _Requirements: 1.8, 1.12, 3.12, 9.1–9.10_

- [x] 9. Cross-package integration verify (sebelum hook gate test)
  - Run di root **berurutan**, semua wajib exit 0:
    - `bun install` (verifikasi clean state, semua workspace ter-link).
    - `bun run typecheck` — RUN 1 (cold): exit 0. RUN 2: cache hit Turborepo (output ada `cached` atau `>>> FULL TURBO`).
    - `bun run lint` — RUN 1: exit 0. RUN 2: cache hit.
    - `bun run build` — RUN 1: exit 0; verifikasi 4 artifact (apps/web/.next/, apps/api/dist/, packages/shared/dist/, packages/scraper/dist/) semua ada. RUN 2: cache hit.
    - `bun run dev` background → tunggu 10 detik → curl :3001 dan :3000 sukses → stop.
  - Untuk cache hit verification, parse output Turborepo (cari string `cached` atau `FULL TURBO`).
  - Kalau ada lint warning yang muncul di skeleton, evaluasi: kalau itu false positive akibat config, kembali ke Task 3 fix. Kalau lint error legit, perbaiki source.
  - **Self-verify:** Output di-collect ke laporan ringkas Bahasa Indonesia (table pass/fail per substep dengan bukti).
  - **Dependency:** Task 8.
  - _Requirements: 1.14, 2.17–2.19, 3.14, 6.7–6.10, 7.8–7.11, 8.8–8.10, 9.7–9.10, 11.1–11.5_

- [x] 10. Git hook gate verification (4 hook tests + cleanup)
  - Buat branch sementara dari main: `git checkout -b acceptance-test`. Pastikan working tree bersih.
  - **Test 1 — commitlint reject bad message:**
    - `echo "export {}" > acceptance-dummy.ts && git add acceptance-dummy.ts`
    - `git commit -m "bad message"` → expect exit non-zero, commitlint reject.
    - Verify `git log -1 --oneline` masih commit lama.
  - **Test 2 — lint-staged reject lint error:**
    - Buat `acceptance-lint-fail.ts` dengan floating promise (`async function f() { return 1 }; f()` + `export {}`).
    - `git add acceptance-lint-fail.ts && git commit -m "feat: test lint reject"` → expect exit non-zero.
  - **Test 3 — clean commit succeeds:**
    - `rm acceptance-lint-fail.ts acceptance-dummy.ts`
    - `echo "export const ok = true" > acceptance-clean.ts && git add acceptance-clean.ts`
    - `git commit -m "feat: test acceptance"` → expect exit 0.
  - **Test 4 — pre-push reject typecheck error:**
    - Tulis type error sengaja di `packages/shared/src/utils.ts`: `export const x: number = 'string'`.
    - `git add packages/shared/src/utils.ts && git commit -m "feat: bad type" --no-verify` (skip pre-commit untuk uji pre-push specifically).
    - Setup remote dummy: `git init --bare /tmp/pantau-pangan-bare.git && git remote add dummy /tmp/pantau-pangan-bare.git`.
    - `git push dummy acceptance-test` → expect exit non-zero (pre-push hook menolak).
  - **Cleanup wajib (tidak boleh dilewat):**
    - `git checkout main && git branch -D acceptance-test`
    - `git remote remove dummy && rm -rf /tmp/pantau-pangan-bare.git`
    - Hapus dummy files yang masih ada di working tree.
    - `git status` harus bersih.
    - **Restore `packages/shared/src/utils.ts`** ke `export {}` original.
  - **Self-verify:** Laporan ringkas 4 test pass/fail dengan exit code di tiap step. Cleanup verified.
  - **Dependency:** Task 9.
  - _Requirements: 5.11–5.14, 11.6–11.9_

## Notes

- Semua task v2 ini punya self-verify built-in. Kalau gagal, sub-agent boleh auto-recover sampai 2 attempt sebelum stop.
- Konsisten pakai `bun add` / `bun add -d` untuk install — JANGAN edit `package.json` dependencies manual.
- Konsisten pakai `bun --filter=<name> run <script>` untuk per-workspace command.
- Sub-agent WAJIB cek docs URL yang disebut di tiap task sebelum nulis config — ini mengantisipasi breaking changes terbaru di typescript-eslint, Husky, Next.js, dll.
- Untuk runtime test (Task 6, 7, 9), gunakan `control_bash_process` action=start/stop, JANGAN execute_bash karena dev server long-running.
- Output laporan & komentar selalu Bahasa Indonesia.
