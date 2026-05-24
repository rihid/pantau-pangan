# Requirements Document: M1 — Foundation

## Introduction

M1 — Foundation menyediakan kerangka monorepo Pantau Pangan yang siap diperluas oleh M2–M7. Lingkupnya tiga: (1) struktur monorepo Bun + Turborepo dengan 4 package skeleton (`apps/api`, `apps/web`, `packages/shared`, `packages/scraper`), (2) tooling code quality (TypeScript strict, ESLint flat, Prettier, Husky, commitlint, lint-staged) yang ter-wire dari `git add` sampai `git push`, dan (3) script orchestration di root yang konsisten antar package. M1 tidak menyentuh database, scraper logic, route handler, atau komponen UI.

Setiap acceptance criteria di dokumen ini diturunkan dari `design.md` dan diikat ke **9-step Acceptance Script** di `design.md` §"Testing Strategy". Notasi `verified by step #N` menunjuk ke baris ke-`N` tabel acceptance script tersebut.

### 9-Step Acceptance Script (referensi)

| #   | Command                                        | Expected                                                                                                    |
| --- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | `bun install`                                  | Exit 0, `bun.lock` ter-generate, semua 4 package ter-link                                                   |
| 2   | `bun run typecheck`                            | Exit 0 di semua 4 package                                                                                   |
| 3   | `bun run lint`                                 | Exit 0 di semua 4 package                                                                                   |
| 4   | `bun run build`                                | Exit 0; `apps/web/.next/`, `apps/api/dist/`, `packages/shared/dist/`, `packages/scraper/dist/` ter-generate |
| 5   | `bun run dev`                                  | API listen di :3001, web listen di :3000, dua-duanya tidak crash dalam 10 detik pertama                     |
| 6   | `git commit -m "bad message"`                  | commitlint reject, commit di-abort                                                                          |
| 7   | `git commit` dengan file lint-error            | lint-staged reject, commit di-abort                                                                         |
| 8   | `git commit -m "feat: ..."` dengan file bersih | Commit sukses                                                                                               |
| 9   | `git push` dengan typecheck error              | pre-push reject, push di-abort                                                                              |

## Glossary

- **Repository_Root**: Direktori `pantau-pangan/` yang bertindak sebagai workspace orchestrator (tidak ada source code di sini, hanya konfigurasi).
- **Workspace_Package**: Package yang terdaftar di `workspaces` glob root (`apps/*` dan `packages/*`); ada 4 package M1: `apps/api`, `apps/web`, `packages/shared`, `packages/scraper`.
- **Internal_Dependency**: Dependency antar `Workspace_Package` di monorepo yang sama.
- **Workspace_Protocol**: Notasi `workspace:*` pada `dependencies` untuk merujuk `Internal_Dependency` (Bun workspaces).
- **Turbo_Pipeline**: Sistem orchestration Turborepo yang dideklarasikan di `turbo.json` untuk task `build`, `typecheck`, `lint`, `dev`, `scrape`.
- **Base_Tsconfig**: `tsconfig.json` di Repository_Root yang menjadi sumber tunggal compiler options strict.
- **Package_Tsconfig**: `tsconfig.json` di setiap Workspace_Package yang `extends` Base_Tsconfig.
- **Eslint_Config**: File `eslint.config.js` flat di Repository_Root, satu-satunya konfigurasi ESLint di repo.
- **Prettier_Config**: File `.prettierrc.json` (+ `.prettierignore`) di Repository_Root.
- **Lint_Staged_Config**: Field `lint-staged` pada root `package.json`.
- **Commitlint_Config**: File `commitlint.config.js` di Repository_Root yang extend `@commitlint/config-conventional`.
- **Husky_Hooks**: Direktori `.husky/` berisi script `pre-commit`, `commit-msg`, `pre-push`.
- **Conventional_Commit_Format**: Pola `<type>(<scope>)?: <subject>` dengan `type` ∈ {`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`, `build`, `revert`} dan header ≤ 100 karakter.
- **Env_Example_File**: `.env.example` di Repository_Root yang mendokumentasikan semua environment variable yang akan dipakai M1–M7.
- **Gitignore_File**: `.gitignore` di Repository_Root.
- **Acceptance_Script**: 9-step verification sequence di tabel referensi atas (Step #1–#9).

## Requirements

### Requirement 1: Struktur Monorepo & Resolusi Workspace

**User Story:** Sebagai developer baru, saya ingin satu kali `bun install` di Repository_Root menghubungkan keempat Workspace_Package via Workspace_Protocol, supaya saya bisa langsung impor dari `@pantau-pangan/shared` di package lain tanpa konfigurasi tambahan.

**Sumber design:** Architecture §"Monorepo Topology" + §"Dependency Graph" + Component 1 (Root Workspace) + Data Model 1 (Workspace Manifest Layout).

#### Acceptance Criteria

1. THE Repository*Root SHALL mendeklarasikan field `workspaces` di `package.json` berisi tepat dua glob: `"apps/*"` dan `"packages/*"`. *(verified by step #1)\_
2. THE Repository*Root SHALL mendeklarasikan field `packageManager` di `package.json` dengan nilai `"bun@<version>"` di mana `<version>` adalah versi Bun yang sudah di-pin. *(verified by step #1)\_
3. THE Repository*Root SHALL mendeklarasikan field `private: true` di `package.json`. *(verified by step #1)\_
4. THE Repository*Root SHALL menyediakan tepat empat Workspace_Package: `apps/api`, `apps/web`, `packages/shared`, `packages/scraper`. *(verified by step #1)\_
5. THE Workspace*Package `apps/api` SHALL bernama `@pantau-pangan/api` di `package.json`. *(verified by step #1)\_
6. THE Workspace*Package `apps/web` SHALL bernama `@pantau-pangan/web` di `package.json`. *(verified by step #1)\_
7. THE Workspace*Package `packages/shared` SHALL bernama `@pantau-pangan/shared` di `package.json`. *(verified by step #1)\_
8. THE Workspace*Package `packages/scraper` SHALL bernama `@pantau-pangan/scraper` di `package.json`. *(verified by step #1)\_
9. WHERE sebuah Workspace*Package mendeklarasikan Internal_Dependency ke Workspace_Package lain, THE Workspace_Package SHALL menggunakan Workspace_Protocol (`"workspace:*"`) sebagai version specifier. *(verified by step #1)\_
10. THE Workspace*Package `apps/api` SHALL mendeklarasikan `"@pantau-pangan/shared": "workspace:*"` di `dependencies`. *(verified by step #1, #4)\_
11. THE Workspace*Package `apps/web` SHALL mendeklarasikan `"@pantau-pangan/shared": "workspace:*"` di `dependencies`. *(verified by step #1, #4)\_
12. THE Workspace*Package `packages/scraper` SHALL mendeklarasikan `"@pantau-pangan/shared": "workspace:*"` di `dependencies`. *(verified by step #1, #4)\_
13. THE Workspace*Package `packages/shared` SHALL TIDAK mendeklarasikan dependency ke Workspace_Package lain (leaf package). *(verified by step #1)\_
14. IF `bun install` dijalankan di Repository*Root pada repo bersih, THEN THE Repository_Root SHALL menghasilkan file `bun.lock` yang ter-track Git. *(verified by step #1)\_

### Requirement 2: Turborepo Pipeline & Caching

**User Story:** Sebagai developer, saya ingin Turborepo schedule task antar package secara topologis dengan caching, supaya `bun run build`, `bun run typecheck`, dan `bun run lint` cepat di run kedua dan idempotent di file unchanged.

**Sumber design:** Architecture §"Build & Task Pipeline" + Component 2 (Turborepo Pipeline).

#### Acceptance Criteria

1. THE Repository*Root SHALL menyediakan file `turbo.json` di root. *(verified by step #4)\_
2. THE Turbo*Pipeline SHALL mendeklarasikan task `build` dengan `dependsOn: ["^build"]` dan `outputs: [".next/**", "!.next/cache/**", "dist/**"]`. *(verified by step #4)\_
3. THE Turbo*Pipeline SHALL mendeklarasikan task `typecheck` dengan `dependsOn: ["^build"]`. *(verified by step #2)\_
4. THE Turbo*Pipeline SHALL mendeklarasikan task `lint` tanpa `dependsOn` antar package. *(verified by step #3)\_
5. THE Turbo*Pipeline SHALL mendeklarasikan task `dev` dengan `cache: false` dan `persistent: true`. *(verified by step #5)\_
6. THE Turbo*Pipeline SHALL mendeklarasikan task `scrape` dengan `cache: false`. *(verified by step #4)\_
7. THE Repository*Root SHALL menyediakan script di `package.json`: `dev` → `turbo run dev`. *(verified by step #5)\_
8. THE Repository*Root SHALL menyediakan script di `package.json`: `dev:api` → `turbo run dev --filter=@pantau-pangan/api`. *(verified by step #5)\_
9. THE Repository*Root SHALL menyediakan script di `package.json`: `dev:web` → `turbo run dev --filter=@pantau-pangan/web`. *(verified by step #5)\_
10. THE Repository*Root SHALL menyediakan script di `package.json`: `build` → `turbo run build`. *(verified by step #4)\_
11. THE Repository*Root SHALL menyediakan script di `package.json`: `typecheck` → `turbo run typecheck`. *(verified by step #2)\_
12. THE Repository*Root SHALL menyediakan script di `package.json`: `lint` → `turbo run lint`. *(verified by step #3)\_
13. THE Repository*Root SHALL menyediakan script di `package.json`: `lint:fix` → `turbo run lint -- --fix`. *(verified by step #3)\_
14. THE Repository*Root SHALL menyediakan script di `package.json`: `format` → `prettier --write .`. *(verified by step #3)\_
15. THE Repository*Root SHALL menyediakan script di `package.json`: `format:check` → `prettier --check .`. *(verified by step #3)\_
16. THE Repository*Root SHALL menyediakan script di `package.json`: `scrape` → `turbo run scrape --filter=@pantau-pangan/scraper`. *(verified by step #4)\_
17. WHEN script `bun run build` dijalankan dua kali berturut-turut tanpa perubahan source, THE Turbo*Pipeline SHALL menghasilkan exit code 0 di kedua run dan run kedua SHALL menunjukkan minimal satu cache hit di output Turborepo. *(verified by step #4 dijalankan dua kali)\_
18. WHEN script `bun run typecheck` dijalankan dua kali berturut-turut tanpa perubahan source, THE Turbo*Pipeline SHALL menghasilkan exit code 0 di kedua run dan run kedua SHALL menunjukkan minimal satu cache hit di output Turborepo. *(verified by step #2 dijalankan dua kali)\_
19. WHEN script `bun run lint` dijalankan dua kali berturut-turut tanpa perubahan source, THE Turbo*Pipeline SHALL menghasilkan exit code 0 di kedua run dan run kedua SHALL menunjukkan minimal satu cache hit di output Turborepo. *(verified by step #3 dijalankan dua kali)\_

### Requirement 3: TypeScript Strict Baseline

**User Story:** Sebagai developer, saya ingin satu Base_Tsconfig di root yang strict dan modern, dan setiap Package_Tsconfig extend dari sana, supaya seluruh monorepo punya standar type-safety yang sama tanpa drift.

**Sumber design:** Component 3 (Base TypeScript Config) + Data Model 2 (Tsconfig Per-Package).

#### Acceptance Criteria

1. THE Repository*Root SHALL menyediakan Base_Tsconfig di path `tsconfig.json` di root. *(verified by step #2)\_
2. THE Base*Tsconfig SHALL mengaktifkan `strict: true` di `compilerOptions`. *(verified by step #2)\_
3. THE Base*Tsconfig SHALL mengaktifkan `noUncheckedIndexedAccess: true` di `compilerOptions`. *(verified by step #2)\_
4. THE Base*Tsconfig SHALL mengaktifkan `noImplicitOverride: true` di `compilerOptions`. *(verified by step #2)\_
5. THE Base*Tsconfig SHALL mengaktifkan `noFallthroughCasesInSwitch: true` di `compilerOptions`. *(verified by step #2)\_
6. THE Base*Tsconfig SHALL menset `target: "ESNext"`, `module: "ESNext"`, dan `moduleResolution: "bundler"` di `compilerOptions`. *(verified by step #2)\_
7. THE Base*Tsconfig SHALL mengaktifkan `verbatimModuleSyntax: true`, `isolatedModules: true`, `esModuleInterop: true`, `forceConsistentCasingInFileNames: true`, `skipLibCheck: true`, dan `resolveJsonModule: true` di `compilerOptions`. *(verified by step #2)\_
8. THE Base*Tsconfig SHALL mendeklarasikan `exclude: ["node_modules", "dist", ".next", ".turbo"]`. *(verified by step #2)\_
9. WHERE sebuah Workspace*Package menyediakan Package_Tsconfig, THE Package_Tsconfig SHALL mendeklarasikan `extends` yang menunjuk ke Base_Tsconfig (mis. `"../../tsconfig.json"`). *(verified by step #2)\_
10. THE Workspace*Package `apps/api` SHALL menyediakan Package_Tsconfig yang mendeklarasikan `"types": ["bun"]` di `compilerOptions`. *(verified by step #2)\_
11. THE Workspace*Package `apps/web` SHALL menyediakan Package_Tsconfig yang mendeklarasikan `"jsx": "preserve"`, `"plugins": [{ "name": "next" }]`, dan `"lib": ["DOM", "ESNext"]` di `compilerOptions`. *(verified by step #2)\_
12. THE Workspace*Package `packages/scraper` SHALL menyediakan Package_Tsconfig yang mendeklarasikan `"types": ["bun"]` di `compilerOptions`. *(verified by step #2)\_
13. THE Workspace*Package `packages/shared` SHALL menyediakan Package_Tsconfig dan tambahan `tsconfig.build.json` (extend lokal) yang menset `noEmit: false` untuk emit ke `dist/`. *(verified by step #2, #4)\_
14. WHEN `bun run typecheck` dijalankan di Repository*Root, THE Turbo_Pipeline SHALL menjalankan `tsc --noEmit` di setiap Workspace_Package dan exit dengan kode 0. *(verified by step #2)\_

### Requirement 4: ESLint & Prettier Single Source

**User Story:** Sebagai developer, saya ingin satu Eslint_Config flat di root dan satu Prettier_Config di root yang dipakai semua Workspace_Package, supaya tidak ada drift formatting/linting antar package dan konflik antara dua tool tersebut sudah dinetralisir.

**Sumber design:** Component 4 (ESLint Flat Config) + Component 5 (Prettier Config).

#### Acceptance Criteria

1. THE Repository*Root SHALL menyediakan Eslint_Config tepat di satu file: `eslint.config.js` di root. *(verified by step #3)\_
2. THE Eslint*Config SHALL meng-export array konfigurasi flat (ESLint v9+ flat config). *(verified by step #3)\_
3. THE Eslint*Config SHALL mendeklarasikan blok `ignores` yang minimal mencakup `**/dist/**`, `**/.next/**`, `**/.turbo/**`, `**/node_modules/**`, dan `**/coverage/**`. *(verified by step #3)\_
4. THE Eslint*Config SHALL mengaktifkan `typescript-eslint` `recommendedTypeChecked` dengan `parserOptions.projectService: true`. *(verified by step #3)\_
5. THE Eslint*Config SHALL mengaktifkan rule `@typescript-eslint/consistent-type-imports: "error"`. *(verified by step #3)\_
6. THE Eslint*Config SHALL mengaktifkan rule `@typescript-eslint/no-floating-promises: "error"`. *(verified by step #3)\_
7. THE Eslint*Config SHALL mengaktifkan rule `@typescript-eslint/no-unused-vars` sebagai `error` dengan `argsIgnorePattern: "^*"`dan`varsIgnorePattern: "^_"`. _(verified by step #3)\_
8. THE Eslint*Config SHALL mengaplikasikan `eslint-config-prettier` sebagai blok terakhir agar rule formatting yang konflik dengan Prettier dimatikan. *(verified by step #3)\_
9. THE Eslint*Config SHALL mendeklarasikan blok scope `apps/web/**/*.{ts,tsx}` dengan globals `browser` + `node`. *(verified by step #3)\_
10. THE Repository*Root SHALL menyediakan Prettier_Config di file `.prettierrc.json` dengan setting: `semi: false`, `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`, `tabWidth: 2`, `arrowParens: "always"`, `endOfLine: "lf"`. *(verified by step #3)\_
11. THE Repository*Root SHALL menyediakan `.prettierignore` yang minimal meng-ignore `node_modules`, `dist`, `.next`, `.turbo`, `coverage`, `bun.lock`, dan semua varian `.env*`. *(verified by step #3)\_
12. WHERE sebuah Workspace*Package perlu menjalankan ESLint, THE Workspace_Package SHALL menyediakan script `lint` yang menjalankan `eslint .` dan TIDAK menyediakan file konfigurasi ESLint sendiri. *(verified by step #3)\_
13. WHEN `bun run lint` dijalankan pada repo skeleton M1 yang bersih, THE Turbo*Pipeline SHALL exit dengan kode 0 di semua 4 Workspace_Package. *(verified by step #3)\_

### Requirement 5: Git Hooks Gate (Husky + lint-staged + commitlint)

**User Story:** Sebagai maintainer, saya ingin pre-commit/commit-msg/pre-push hook yang otomatis aktif setelah `bun install`, supaya commit dengan kode broken, format buruk, atau message non-konvensional di-tolak sebelum masuk repo.

**Sumber design:** Architecture §"Git Hooks Pipeline" + Component 6 (Husky Git Hooks) + Component 7 (lint-staged Config) + Component 8 (commitlint Config).

#### Acceptance Criteria

1. THE Repository*Root SHALL menyediakan script `prepare` di `package.json` yang menjalankan `husky` (memasang hook saat `bun install`). *(verified by step #1)\_
2. THE Repository*Root SHALL menyediakan direktori `.husky/` ter-track Git berisi tiga file hook: `pre-commit`, `commit-msg`, dan `pre-push`. *(verified by step #1)\_
3. THE Husky*Hooks file `.husky/pre-commit` SHALL menjalankan `bunx lint-staged`. *(verified by step #7, #8)\_
4. THE Husky*Hooks file `.husky/commit-msg` SHALL menjalankan `bunx commitlint --edit $1`. *(verified by step #6, #8)\_
5. THE Husky*Hooks file `.husky/pre-push` SHALL menjalankan `bun run typecheck`. *(verified by step #9)\_
6. THE Repository*Root SHALL mendeklarasikan Lint_Staged_Config di field `lint-staged` pada `package.json` dengan minimal dua glob: `*.{ts,tsx}` → `["eslint --fix", "prettier --write"]` dan `*.{json,md,yml,yaml,css}` → `["prettier --write"]`. *(verified by step #7, #8)\_
7. THE Repository*Root SHALL menyediakan Commitlint_Config di file `commitlint.config.js`. *(verified by step #6)\_
8. THE Commitlint*Config SHALL `extends: ["@commitlint/config-conventional"]`. *(verified by step #6)\_
9. THE Commitlint*Config SHALL mendeklarasikan rule `type-enum` yang membatasi `type` ke himpunan `{feat, fix, chore, docs, refactor, test, style, perf, ci, build, revert}` dengan severity `error`. *(verified by step #6)\_
10. THE Commitlint*Config SHALL mendeklarasikan rule `header-max-length` dengan batas 100 karakter dan severity `error`. *(verified by step #6)\_
11. IF developer menjalankan `git commit` dengan commit message yang TIDAK match Conventional*Commit_Format, THEN THE Husky_Hooks SHALL menolak commit (exit non-zero) dan tidak meng-create commit object. *(verified by step #6)\_
12. IF developer menjalankan `git commit` dengan staged file `.ts`/`.tsx` yang punya ESLint error tidak auto-fixable, THEN THE Husky*Hooks SHALL menolak commit (exit non-zero) via lint-staged. *(verified by step #7)\_
13. WHEN developer menjalankan `git commit -m "feat: <subject>"` dengan staged file yang lulus ESLint dan Prettier, THE Husky*Hooks SHALL meng-allow commit (exit 0). *(verified by step #8)\_
14. IF developer menjalankan `git push` dan `bun run typecheck` exit non-zero, THEN THE Husky*Hooks SHALL menolak push (exit non-zero) di hook `pre-push`. *(verified by step #9)\_

### Requirement 6: Skeleton `apps/api`

**User Story:** Sebagai developer backend, saya ingin skeleton Hono.js + Bun yang minimal tapi valid (typecheck, lint, build, dev semua hijau), supaya M3 tinggal mengisi route dan service tanpa utak-atik tooling.

**Sumber design:** Component 9 (Package — `apps/api`) + Error Scenario 6.

#### Acceptance Criteria

1. THE Workspace*Package `apps/api` SHALL menyediakan `package.json` dengan `name: "@pantau-pangan/api"`, `private: true`, dan `type: "module"`. *(verified by step #1)\_
2. THE Workspace*Package `apps/api` SHALL mendeklarasikan dependency `hono` di `dependencies`. *(verified by step #1)\_
3. THE Workspace*Package `apps/api` SHALL mendeklarasikan devDependency `@types/bun`. *(verified by step #2)\_
4. THE Workspace*Package `apps/api` SHALL menyediakan script: `dev` → `bun run --hot src/index.ts`, `build` → `bun build src/index.ts --outdir=dist --target=bun`, `start` → `bun run dist/index.js`, `lint` → `eslint .`, `typecheck` → `tsc --noEmit`. *(verified by step #2, #3, #4, #5)\_
5. THE Workspace*Package `apps/api` SHALL menyediakan source entry point di `src/index.ts` yang memakai Hono dan meng-export object `{ port, fetch }` (Bun auto-serve) di mana `port` = `Bun.env.API_PORT ?? 3001`. *(verified by step #5)\_
6. THE Workspace*Package `apps/api` SHALL meng-handle route `GET /` dengan response JSON `{ status: "ok", service: "pantau-pangan-api" }`. *(verified by step #5)\_
7. WHEN `bun run typecheck` dijalankan, THE Workspace*Package `apps/api` SHALL exit 0. *(verified by step #2)\_
8. WHEN `bun run lint` dijalankan, THE Workspace*Package `apps/api` SHALL exit 0. *(verified by step #3)\_
9. WHEN `bun run build` dijalankan, THE Workspace*Package `apps/api` SHALL menghasilkan artefak di `apps/api/dist/`. *(verified by step #4)\_
10. WHEN `bun run dev` dijalankan di Repository*Root, THE Workspace_Package `apps/api` SHALL listen di port 3001 dan tidak crash dalam 10 detik pertama setelah start. *(verified by step #5)\_
11. THE Workspace*Package `apps/api` SHALL TIDAK mendeklarasikan dependency ke Drizzle, `pg`, atau `postgres` (scope M2). *(verified by step #1)\_

### Requirement 7: Skeleton `apps/web`

**User Story:** Sebagai developer frontend, saya ingin Next.js scaffold App Router minimal yang sudah `transpilePackages` ke `@pantau-pangan/shared`, supaya M4 tinggal masuk ke implementasi UI tanpa setup ulang.

**Sumber design:** Component 10 (Package — `apps/web`).

#### Acceptance Criteria

1. THE Workspace*Package `apps/web` SHALL menyediakan `package.json` dengan `name: "@pantau-pangan/web"` dan `private: true`. *(verified by step #1)\_
2. THE Workspace*Package `apps/web` SHALL mendeklarasikan dependency `next`, `react`, dan `react-dom` di `dependencies`. *(verified by step #1)\_
3. THE Workspace*Package `apps/web` SHALL mendeklarasikan devDependency `@types/react`, `@types/react-dom`, dan `typescript`. *(verified by step #2)\_
4. THE Workspace*Package `apps/web` SHALL menyediakan script: `dev` → `next dev --port 3000`, `build` → `next build`, `start` → `next start --port 3000`, `lint` → `eslint .`, `typecheck` → `tsc --noEmit`. *(verified by step #2, #3, #4, #5)\_
5. THE Workspace*Package `apps/web` SHALL menyediakan file `next.config.mjs` di root package yang mendeklarasikan `transpilePackages: ["@pantau-pangan/shared"]`. *(verified by step #4)\_
6. THE Workspace*Package `apps/web` SHALL menyediakan `app/layout.tsx` minimal dengan metadata title `"Pantau Pangan"`. *(verified by step #4, #5)\_
7. THE Workspace*Package `apps/web` SHALL menyediakan `app/page.tsx` placeholder yang me-render text statis (mis. "Pantau Pangan — coming soon"). *(verified by step #4, #5)\_
8. WHEN `bun run typecheck` dijalankan, THE Workspace*Package `apps/web` SHALL exit 0. *(verified by step #2)\_
9. WHEN `bun run lint` dijalankan, THE Workspace*Package `apps/web` SHALL exit 0. *(verified by step #3)\_
10. WHEN `bun run build` dijalankan, THE Workspace*Package `apps/web` SHALL menghasilkan artefak di `apps/web/.next/`. *(verified by step #4)\_
11. WHEN `bun run dev` dijalankan di Repository*Root, THE Workspace_Package `apps/web` SHALL listen di port 3000 dan tidak crash dalam 10 detik pertama setelah start. *(verified by step #5)\_
12. THE Workspace*Package `apps/web` SHALL TIDAK mendeklarasikan dependency ke `d3`, `@tanstack/react-query`, `tailwindcss`, atau komponen shadcn/ui (scope M4). *(verified by step #1)\_

### Requirement 8: Skeleton `packages/shared`

**User Story:** Sebagai developer shared types, saya ingin paket leaf `@pantau-pangan/shared` yang compile ke `dist/` dengan dual export (types + default), supaya M2–M4 bisa langsung menambah types/utils/constants tanpa konfigurasi ulang.

**Sumber design:** Component 11 (Package — `packages/shared`) + AGENTS.md "Shared".

#### Acceptance Criteria

1. THE Workspace*Package `packages/shared` SHALL menyediakan `package.json` dengan `name: "@pantau-pangan/shared"`, `private: true`, dan `type: "module"`. *(verified by step #1)\_
2. THE Workspace*Package `packages/shared` SHALL mendeklarasikan field `exports` dengan key `"."` yang berisi `{ types: "./dist/index.d.ts", default: "./dist/index.js" }`. *(verified by step #4)\_
3. THE Workspace*Package `packages/shared` SHALL mendeklarasikan `main: "./dist/index.js"` dan `types: "./dist/index.d.ts"` untuk kompatibilitas. *(verified by step #4)\_
4. THE Workspace*Package `packages/shared` SHALL menyediakan script: `build` → `tsc -p tsconfig.build.json`, `lint` → `eslint .`, `typecheck` → `tsc --noEmit`. *(verified by step #2, #3, #4)\_
5. THE Workspace*Package `packages/shared` SHALL menyediakan source di `src/index.ts` yang re-export tiga modul anak: `./types`, `./constants`, `./utils`. *(verified by step #2, #4)\_
6. THE Workspace*Package `packages/shared` SHALL menyediakan tiga file placeholder `src/types.ts`, `src/constants.ts`, `src/utils.ts` yang masing-masing minimal berisi `export {}` (kompatibel dengan `verbatimModuleSyntax`). *(verified by step #2)\_
7. THE Workspace*Package `packages/shared` SHALL TIDAK mendeklarasikan Internal_Dependency ke Workspace_Package lain. *(verified by step #1)\_
8. WHEN `bun run typecheck` dijalankan, THE Workspace*Package `packages/shared` SHALL exit 0. *(verified by step #2)\_
9. WHEN `bun run lint` dijalankan, THE Workspace*Package `packages/shared` SHALL exit 0. *(verified by step #3)\_
10. WHEN `bun run build` dijalankan, THE Workspace*Package `packages/shared` SHALL menghasilkan minimal `packages/shared/dist/index.js` dan `packages/shared/dist/index.d.ts`. *(verified by step #4)\_

### Requirement 9: Skeleton `packages/scraper`

**User Story:** Sebagai developer scraper, saya ingin entry point Bun-only yang bisa dijalankan via `bun run scrape` dan exit cepat tanpa side effect, supaya M2 tinggal mengisi logic fetch BI tanpa worry konfigurasi.

**Sumber design:** Component 12 (Package — `packages/scraper`) + AGENTS.md "Scraper".

#### Acceptance Criteria

1. THE Workspace*Package `packages/scraper` SHALL menyediakan `package.json` dengan `name: "@pantau-pangan/scraper"`, `private: true`, dan `type: "module"`. *(verified by step #1)\_
2. THE Workspace*Package `packages/scraper` SHALL mendeklarasikan dependency `@pantau-pangan/shared` dengan Workspace_Protocol. *(verified by step #1)\_
3. THE Workspace*Package `packages/scraper` SHALL mendeklarasikan devDependency `@types/bun`. *(verified by step #2)\_
4. THE Workspace*Package `packages/scraper` SHALL menyediakan script: `dev` → `bun run --hot src/index.ts`, `build` → `bun build src/index.ts --outdir=dist --target=bun`, `scrape` → `bun run src/index.ts`, `lint` → `eslint .`, `typecheck` → `tsc --noEmit`. *(verified by step #2, #3, #4)\_
5. THE Workspace*Package `packages/scraper` SHALL menyediakan `src/index.ts` yang men-call `main()` dan exit 0 setelah print pesan placeholder. *(verified by step #4)\_
6. THE Workspace*Package `packages/scraper` SHALL TIDAK mendeklarasikan dependency ke library HTTP (mis. `axios`, `ky`, `node-fetch`) atau ke Playwright. *(verified by step #1)\_
7. WHEN `bun run typecheck` dijalankan, THE Workspace*Package `packages/scraper` SHALL exit 0. *(verified by step #2)\_
8. WHEN `bun run lint` dijalankan, THE Workspace*Package `packages/scraper` SHALL exit 0. *(verified by step #3)\_
9. WHEN `bun run build` dijalankan, THE Workspace*Package `packages/scraper` SHALL menghasilkan artefak di `packages/scraper/dist/`. *(verified by step #4)\_
10. WHEN `bun run scrape` dijalankan di Repository*Root, THE Workspace_Package `packages/scraper` SHALL menulis pesan ke stdout dan exit dengan kode 0. *(verified by step #4 + manual run)\_

### Requirement 10: Environment Containment & Gitignore

**User Story:** Sebagai developer/maintainer, saya ingin semua environment variable terdokumentasi di Env_Example_File dan tidak ada `.env` asli yang ter-commit, supaya secret tidak bocor sejak hari pertama.

**Sumber design:** Data Model 3 (Environment Variables) + Data Model 4 (Gitignore Set) + Security Considerations.

#### Acceptance Criteria

1. THE Repository*Root SHALL menyediakan Env_Example_File di path `.env.example`. *(verified by step #1)\_
2. THE Env*Example_File SHALL mendokumentasikan minimal lima variable berikut sebagai placeholder (bukan nilai asli): `DATABASE_URL`, `OPENROUTER_API_KEY`, `API_PORT`, `NEXT_PUBLIC_API_URL`. *(verified by step #1)\_
3. THE Env*Example_File SHALL mengandung default `API_PORT=3001` dan `NEXT_PUBLIC_API_URL=http://localhost:3001` (placeholder yang langsung pakai untuk dev lokal). *(verified by step #1)\_
4. THE Repository*Root SHALL menyediakan Gitignore_File di path `.gitignore` yang mengandung minimal entry: `node_modules/`, `.env`, `.env.local`, `.env.*.local`, `.turbo/`, `dist/`, `.next/`, `coverage/`, `*.log`, `.DS_Store`. *(verified by step #1)\_
5. THE Gitignore*File SHALL TIDAK meng-ignore `bun.lock` (lockfile harus ter-commit). *(verified by step #1)\_
6. THE Gitignore*File SHALL TIDAK meng-ignore `.env.example` (template harus ter-commit). *(verified by step #1)\_
7. IF developer membuat file `.env` atau `.env.local` di Repository*Root, THEN THE Gitignore_File SHALL menyebabkan file tersebut TIDAK muncul di output `git status`. *(verified by manual git check)\_
8. THE Repository*Root SHALL TIDAK meng-commit nilai secret asli (API key, password DB, token) di file mana pun yang ter-track Git. *(verified by step #1 — review)\_

### Requirement 11: Skrip Verifikasi & Acceptance Script

**User Story:** Sebagai reviewer / CI, saya ingin urutan command standar yang membuktikan repo M1 sehat dari `install` sampai `git push`, supaya transisi M1 → M2 bisa di-gate dengan satu skrip yang reproducible.

**Sumber design:** Testing Strategy §"Unit Testing Approach" (9-step Acceptance Script) + Performance Considerations.

#### Acceptance Criteria

1. WHEN `bun install` dijalankan di Repository*Root pada repo bersih, THE Repository_Root SHALL exit dengan kode 0 dan menghasilkan `node_modules/` + `bun.lock`. *(verified by step #1)\_
2. WHEN `bun run typecheck` dijalankan di Repository*Root, THE Turbo_Pipeline SHALL menjalankan `tsc --noEmit` di empat Workspace_Package dan exit dengan kode 0. *(verified by step #2)\_
3. WHEN `bun run lint` dijalankan di Repository*Root, THE Turbo_Pipeline SHALL menjalankan `eslint .` di empat Workspace_Package dan exit dengan kode 0. *(verified by step #3)\_
4. WHEN `bun run build` dijalankan di Repository*Root, THE Turbo_Pipeline SHALL menghasilkan keempat artefak: `apps/web/.next/`, `apps/api/dist/`, `packages/shared/dist/`, dan `packages/scraper/dist/`, lalu exit dengan kode 0. *(verified by step #4)\_
5. WHEN `bun run dev` dijalankan di Repository*Root, THE Turbo_Pipeline SHALL men-start `apps/api` di port 3001 dan `apps/web` di port 3000 secara paralel sebagai persistent task. *(verified by step #5)\_
6. WHEN developer menjalankan `git commit -m "bad message"`, THE Husky*Hooks SHALL menolak commit via commitlint dengan exit non-zero. *(verified by step #6)\_
7. WHEN developer menjalankan `git commit` dengan staged file yang punya ESLint error tidak auto-fixable, THE Husky*Hooks SHALL menolak commit via lint-staged dengan exit non-zero. *(verified by step #7)\_
8. WHEN developer menjalankan `git commit -m "feat: ..."` dengan staged file bersih, THE Husky*Hooks SHALL meng-allow commit dengan exit 0. *(verified by step #8)\_
9. WHEN developer menjalankan `git push` setelah dengan sengaja membuat type error di salah satu Workspace*Package, THE Husky_Hooks SHALL menolak push via `pre-push` (`bun run typecheck`) dengan exit non-zero. *(verified by step #9)\_
