# Design Document: M1 — Foundation

## Overview

M1 — Foundation menyiapkan kerangka monorepo Pantau Pangan yang siap dipakai oleh M2–M7. Hasil M1 adalah **repo yang bisa di-`bun install`, di-`bun run dev`, di-`bun run build`, di-`bun run typecheck`, dan di-`bun run lint`** dengan struktur 4 package skeleton (`apps/api`, `apps/web`, `packages/shared`, `packages/scraper`) tanpa business logic apa pun di dalamnya.

Fondasi ini fokus pada tiga hal: (1) struktur monorepo Bun + Turborepo dengan dependency graph yang benar antar-package, (2) tooling code quality (TypeScript strict, ESLint flat, Prettier, Husky, commitlint, lint-staged) yang ter-wire end-to-end dari `git add` sampai `git push`, dan (3) script orchestration di root yang konsisten di semua package. M1 tidak boleh menyentuh database, scraper logic, route handler, atau komponen UI — itu semua scope milestone berikutnya.

Prinsip desainnya: **placeholder yang valid lebih baik daripada kode bermakna yang setengah jadi**. Setiap package skeleton wajib bisa di-typecheck, di-lint, dan di-build, tapi isinya minimal (entry point yang return string atau response sederhana). Dengan begitu pipeline CI/CD dan developer experience sudah teruji sejak hari pertama, dan milestone berikutnya tinggal mengisi tanpa perlu utak-atik tooling.

## Architecture

### Monorepo Topology

Repo root bertindak sebagai workspace orchestrator (Bun workspaces + Turborepo). Tidak ada source code di root — hanya konfigurasi dan script. Setiap package punya `package.json` sendiri, `tsconfig.json` yang extend dari root, dan boundary yang jelas.

```mermaid
graph TD
    Root["pantau-pangan/<br/>(workspace root)"]
    Root --> Apps["apps/"]
    Root --> Packages["packages/"]
    Root --> Tooling["Root Tooling<br/>turbo.json, eslint.config.js,<br/>.prettierrc, .husky/,<br/>commitlint.config.js, tsconfig.json"]

    Apps --> ApiApp["apps/api/<br/>(Hono + Bun placeholder)"]
    Apps --> WebApp["apps/web/<br/>(Next.js scaffold)"]

    Packages --> Shared["packages/shared/<br/>(types/utils/constants)"]
    Packages --> Scraper["packages/scraper/<br/>(Bun fetch placeholder)"]

    ApiApp -.depends on.-> Shared
    WebApp -.depends on.-> Shared
    Scraper -.depends on.-> Shared
```

### Dependency Graph antar Package

Penting untuk M1 supaya Turborepo bisa schedule build/typecheck dengan urutan yang benar.

```mermaid
graph LR
    Shared["@pantau-pangan/shared"]
    Api["@pantau-pangan/api"]
    Web["@pantau-pangan/web"]
    Scraper["@pantau-pangan/scraper"]

    Shared --> Api
    Shared --> Web
    Shared --> Scraper
```

Aturannya:

- `shared` adalah **leaf package** — tidak boleh import dari `api`, `web`, atau `scraper`.
- `api`, `web`, `scraper` boleh import dari `shared` lewat workspace protocol (`"@pantau-pangan/shared": "workspace:*"`).
- Tidak ada dependency horizontal antar `api` ↔ `web` ↔ `scraper`. Komunikasi antar `apps` lewat HTTP (di milestone berikutnya), bukan import langsung.

### Build & Task Pipeline (Turborepo)

```mermaid
graph TD
    Dev["bun run dev"] --> TurboDev["turbo run dev<br/>(persistent, parallel)"]
    TurboDev --> ApiDev["api: dev"]
    TurboDev --> WebDev["web: dev"]

    Build["bun run build"] --> TurboBuild["turbo run build<br/>(topological, cached)"]
    TurboBuild --> SharedBuild["shared: build"]
    SharedBuild --> ApiBuild["api: build"]
    SharedBuild --> WebBuild["web: build"]
    SharedBuild --> ScraperBuild["scraper: build"]

    Typecheck["bun run typecheck"] --> TurboTypecheck["turbo run typecheck<br/>(topological, cached)"]
    TurboTypecheck --> SharedTC["shared: typecheck"]
    SharedTC --> RestTC["api/web/scraper: typecheck"]

    Lint["bun run lint"] --> TurboLint["turbo run lint<br/>(parallel, cached)"]
    TurboLint --> AllLint["all packages: lint"]
```

### Git Hooks Pipeline

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as Git
    participant Husky as Husky
    participant Tools as Tooling

    Dev->>Git: git commit -m "feat: ..."
    Git->>Husky: pre-commit hook
    Husky->>Tools: lint-staged<br/>(ESLint --fix + Prettier on staged files)
    alt Lint/format fail
        Tools-->>Husky: exit non-zero
        Husky-->>Git: abort commit
        Git-->>Dev: error message
    else Pass
        Tools-->>Husky: exit 0
        Husky->>Tools: commitlint --edit
        alt Commit message tidak conventional
            Tools-->>Husky: exit non-zero
            Husky-->>Git: abort commit
        else Pass
            Tools-->>Husky: exit 0
            Husky-->>Git: allow commit
        end
    end

    Dev->>Git: git push
    Git->>Husky: pre-push hook
    Husky->>Tools: bun run typecheck<br/>(turbo run typecheck)
    alt tsc --noEmit fail di salah satu package
        Tools-->>Husky: exit non-zero
        Husky-->>Git: abort push
    else Pass
        Tools-->>Husky: exit 0
        Husky-->>Git: allow push
    end
```

## Components and Interfaces

### Component 1: Root Workspace

**Purpose**: Orchestrator monorepo. Mengikat 4 package via Bun workspaces, menjalankan task lintas-package via Turborepo, dan host semua tooling shared (ESLint, Prettier, Husky, commitlint, base tsconfig).

**Interface (root `package.json` shape)**:

```pascal
STRUCTURE RootPackageJson
  name: "pantau-pangan"
  private: true
  packageManager: "bun@<pinned-version>"
  workspaces: ["apps/*", "packages/*"]

  scripts:
    "dev"         → "turbo run dev"
    "dev:api"     → "turbo run dev --filter=@pantau-pangan/api"
    "dev:web"     → "turbo run dev --filter=@pantau-pangan/web"
    "build"       → "turbo run build"
    "lint"        → "turbo run lint"
    "lint:fix"    → "turbo run lint -- --fix"
    "typecheck"   → "turbo run typecheck"
    "format"      → "prettier --write ."
    "format:check"→ "prettier --check ."
    "scrape"      → "turbo run scrape --filter=@pantau-pangan/scraper"
    "prepare"     → "husky"

  devDependencies:
    "turbo", "typescript", "@types/bun",
    "eslint", "typescript-eslint", "@eslint/js", "globals",
    "prettier", "eslint-config-prettier",
    "husky", "lint-staged",
    "@commitlint/cli", "@commitlint/config-conventional"

  "lint-staged":
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
    "*.{json,md,yml,yaml,css}": ["prettier --write"]
END STRUCTURE
```

**Responsibilities**:

- Mendefinisikan workspace globs (`apps/*`, `packages/*`)
- Hosting semua devDependency tooling — package anak tidak install ulang ESLint/Prettier sendiri
- Menjadi single entry point untuk semua command developer (`bun run dev`, `bun run build`, dst.)
- Pin runtime Bun version via `packageManager` field

### Component 2: Turborepo Pipeline

**Purpose**: Mengatur task dependency graph antar package, caching, dan paralelisme.

**Interface (`turbo.json` shape)**:

```pascal
STRUCTURE TurboConfig
  $schema: "https://turbo.build/schema.json"

  tasks:
    "build":
      dependsOn: ["^build"]                    // build deps dulu (topological)
      outputs: [".next/**", "!.next/cache/**", "dist/**"]
      cache: true

    "typecheck":
      dependsOn: ["^build"]                    // butuh hasil build dari shared
      outputs: []                              // tsc --noEmit, no artifacts
      cache: true

    "lint":
      dependsOn: []                            // lint independen per package
      outputs: []
      cache: true

    "dev":
      cache: false
      persistent: true                         // long-running, jangan di-cache

    "scrape":
      dependsOn: ["^build"]
      cache: false                             // side effects (network)
      persistent: false
END STRUCTURE
```

**Responsibilities**:

- Schedule `^build` topologically — `shared` build dulu sebelum `api/web/scraper`
- Cache hasil build dan lint berdasarkan content hash
- Mark `dev` sebagai `persistent` supaya Turborepo tidak coba terminate-nya
- Filter task per package via `--filter` flag (untuk `dev:api`, `dev:web`, dll.)

### Component 3: Base TypeScript Config

**Purpose**: Single source of truth untuk compiler options yang strict dan modern. Setiap package extend dari sini lalu override path-specific (rootDir, outDir, lib, jsx).

**Interface (root `tsconfig.json` shape)**:

```pascal
STRUCTURE BaseTsconfig
  compilerOptions:
    target: "ESNext"
    module: "ESNext"
    moduleResolution: "bundler"
    lib: ["ESNext"]

    strict: true
    noUncheckedIndexedAccess: true
    noImplicitOverride: true
    noFallthroughCasesInSwitch: true
    noPropertyAccessFromIndexSignature: false  // pragmatis untuk API responses

    esModuleInterop: true
    forceConsistentCasingInFileNames: true
    skipLibCheck: true
    resolveJsonModule: true
    isolatedModules: true
    verbatimModuleSyntax: true

    declaration: true
    declarationMap: true
    sourceMap: true

  exclude: ["node_modules", "dist", ".next", ".turbo"]
END STRUCTURE
```

**Responsibilities**:

- Aktifkan `strict: true` plus extra strictness flags (terutama `noUncheckedIndexedAccess` — krusial untuk parser BI nanti)
- Set `moduleResolution: "bundler"` supaya kompatibel dengan Bun, Next.js, dan workspace imports
- `verbatimModuleSyntax` mencegah type-only import bocor ke runtime — penting untuk migrasi V1→V2

### Component 4: ESLint Flat Config

**Purpose**: Lint TypeScript di seluruh monorepo dengan satu config root (flat config — tidak ada `.eslintrc` per-package).

**Interface (`eslint.config.js` shape)**:

```pascal
STRUCTURE EslintFlatConfig
  EXPORT default ARRAY OF ConfigBlock

  // Block 1: ignores global
  { ignores: ["**/dist/**", "**/.next/**", "**/.turbo/**",
              "**/node_modules/**", "**/coverage/**"] }

  // Block 2: base JS rules
  { ...js.configs.recommended }

  // Block 3: TypeScript recommended (type-checked)
  { ...tseslint.configs.recommendedTypeChecked,
    languageOptions:
      parserOptions:
        projectService: true                   // auto-detect tsconfig per file
        tsconfigRootDir: import.meta.dirname
  }

  // Block 4: project-wide rules
  { rules:
      "@typescript-eslint/no-unused-vars":
        ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
      "@typescript-eslint/consistent-type-imports": "error"
      "@typescript-eslint/no-floating-promises": "error"
      "no-console": ["warn", { allow: ["warn", "error"] }]
  }

  // Block 5: scope override untuk apps/web (Next.js + JSX)
  { files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } }
  }

  // Block 6: prettier disable conflict
  { ...eslintConfigPrettier }
END STRUCTURE
```

**Responsibilities**:

- Type-checked linting (`recommendedTypeChecked`) untuk catch bug yang `tsc` saja kelewat
- Konsisten enforce `consistent-type-imports` — wajib `import type` untuk type-only
- Disable rule yang konflik dengan Prettier (formatting jadi tanggung jawab Prettier)
- Single source — tidak ada eslint config per-package

### Component 5: Prettier Config

**Purpose**: Format file consistent di seluruh repo.

**Interface (`.prettierrc.json` shape)**:

```pascal
STRUCTURE PrettierConfig
  semi: false
  singleQuote: true
  trailingComma: "all"
  printWidth: 100
  tabWidth: 2
  arrowParens: "always"
  endOfLine: "lf"
END STRUCTURE
```

**Companion file `.prettierignore`**: ignore `node_modules`, `dist`, `.next`, `.turbo`, `coverage`, `bun.lock`, `.env*`.

**Responsibilities**:

- Format `.ts`, `.tsx`, `.json`, `.md`, `.yml`, `.css` files
- Diintegrasi ke ESLint via `eslint-config-prettier` (Prettier menang untuk formatting)
- Diintegrasi ke `lint-staged` untuk format-on-commit

### Component 6: Husky Git Hooks

**Purpose**: Pre-commit dan pre-push gate yang mencegah kode broken masuk repo.

**Interface (`.husky/` directory shape)**:

```pascal
STRUCTURE HuskyHooks
  ".husky/pre-commit":
    SEQUENCE
      EXEC "bunx lint-staged"
    END SEQUENCE

  ".husky/commit-msg":
    SEQUENCE
      EXEC "bunx commitlint --edit $1"
    END SEQUENCE

  ".husky/pre-push":
    SEQUENCE
      EXEC "bun run typecheck"
    END SEQUENCE
END STRUCTURE
```

**Bootstrap**: `bun run prepare` (alias `husky`) dijalankan otomatis lewat npm-style lifecycle saat `bun install`.

**Responsibilities**:

- Pre-commit: lint + format hanya file yang di-stage (cepat)
- Commit-msg: validasi conventional commits
- Pre-push: typecheck full monorepo (lebih lama, tapi cuma jalan saat push)
- Hooks bisa di-bypass dengan `--no-verify` untuk emergency fix (developer aware)

### Component 7: lint-staged Config

**Purpose**: Konfigurasi file mana yang di-process pre-commit, pakai tool apa.

**Interface (di root `package.json` field `lint-staged`)**:

```pascal
STRUCTURE LintStagedConfig
  "*.{ts,tsx}":
    - "eslint --fix"
    - "prettier --write"

  "*.{json,md,yml,yaml,css}":
    - "prettier --write"
END STRUCTURE
```

**Responsibilities**:

- Run hanya pada file staged (jauh lebih cepat dari full lint)
- Auto-fix lint issues yang fixable + format
- File yang di-modify oleh tool akan di-stage ulang otomatis oleh lint-staged

### Component 8: commitlint Config

**Purpose**: Enforce conventional commits supaya history bersih dan compatible dengan tooling rilis nanti.

**Interface (`commitlint.config.js` shape)**:

```pascal
STRUCTURE CommitlintConfig
  extends: ["@commitlint/config-conventional"]

  rules:
    "type-enum":
      [2, "always", [
        "feat", "fix", "chore", "docs", "refactor",
        "test", "style", "perf", "ci", "build", "revert"
      ]]
    "subject-case": [0]                        // izinkan case bebas di subject
    "header-max-length": [2, "always", 100]
END STRUCTURE
```

**Responsibilities**:

- Tolak commit dengan type tidak ada di enum
- Tolak commit message > 100 karakter di header
- Run via `commit-msg` hook

### Component 9: Package — `apps/api`

**Purpose**: Skeleton backend Hono.js + Bun. M1 hanya placeholder; logic asli di M3.

**Interface (`apps/api/package.json` shape)**:

```pascal
STRUCTURE ApiPackageJson
  name: "@pantau-pangan/api"
  private: true
  type: "module"

  scripts:
    "dev"        → "bun run --hot src/index.ts"
    "build"      → "bun build src/index.ts --outdir=dist --target=bun"
    "start"      → "bun run dist/index.js"
    "lint"       → "eslint ."
    "typecheck"  → "tsc --noEmit"

  dependencies:
    "hono": "^<latest>"
    "@pantau-pangan/shared": "workspace:*"

  devDependencies:
    "@types/bun"
END STRUCTURE
```

**Source skeleton (`apps/api/src/index.ts`)**:

```pascal
PROCEDURE main()
  app ← new Hono()

  app.GET "/" RETURNS { status: "ok", service: "pantau-pangan-api" }

  port ← Bun.env.API_PORT OR 3001
  RETURN { port: port, fetch: app.fetch }      // Bun auto-serve
END PROCEDURE
```

**Responsibilities (M1 only)**:

- Listen di port `API_PORT` (default 3001)
- Return placeholder JSON di route `/`
- Tidak ada DB connection, tidak ada cron, tidak ada services/ — itu M2/M3

### Component 10: Package — `apps/web`

**Purpose**: Skeleton frontend Next.js App Router. M1 = default scaffold yang bersih.

**Interface (`apps/web/package.json` shape)**:

```pascal
STRUCTURE WebPackageJson
  name: "@pantau-pangan/web"
  private: true

  scripts:
    "dev"        → "next dev --port 3000"
    "build"      → "next build"
    "start"      → "next start --port 3000"
    "lint"       → "eslint ."
    "typecheck"  → "tsc --noEmit"

  dependencies:
    "next": "^<latest>"
    "react": "^<latest>"
    "react-dom": "^<latest>"
    "@pantau-pangan/shared": "workspace:*"

  devDependencies:
    "@types/react", "@types/react-dom", "typescript"
END STRUCTURE
```

**Source skeleton**:

- `app/layout.tsx` — root layout minimal (HTML shell + metadata title "Pantau Pangan")
- `app/page.tsx` — placeholder "Pantau Pangan — coming soon"
- `next.config.mjs` — `transpilePackages: ["@pantau-pangan/shared"]` supaya workspace import lancar

**Responsibilities (M1 only)**:

- Render placeholder page di port 3000
- Konsumsi `NEXT_PUBLIC_API_URL` dari env (belum dipanggil, hanya di-read untuk validasi)
- Tidak ada D3, shadcn/ui, atau TanStack Query — itu M4

### Component 11: Package — `packages/shared`

**Purpose**: Tempat types/utils/constants lintas-package. M1 = shell kosong yang valid.

**Interface (`packages/shared/package.json` shape)**:

```pascal
STRUCTURE SharedPackageJson
  name: "@pantau-pangan/shared"
  private: true
  type: "module"

  // Dual export: source untuk dev (zero-build), built untuk production
  exports:
    ".":
      types:   "./dist/index.d.ts"
      default: "./dist/index.js"
  main: "./dist/index.js"
  types: "./dist/index.d.ts"

  scripts:
    "build"      → "tsc -p tsconfig.build.json"
    "lint"       → "eslint ."
    "typecheck"  → "tsc --noEmit"

  devDependencies:
    "typescript"
END STRUCTURE
```

**Source skeleton (`packages/shared/src/index.ts`)**:

```pascal
EXPORT * FROM "./types"
EXPORT * FROM "./constants"
EXPORT * FROM "./utils"
```

Tiga file (`types.ts`, `constants.ts`, `utils.ts`) dibuat dengan placeholder export kosong (`export {}`) supaya `verbatimModuleSyntax` tidak kompalin.

**Responsibilities (M1 only)**:

- Compile sukses ke `dist/`
- Tidak ada konten — types/constants/utils diisi di M2 (mis. `VOLATILITY_THRESHOLDS`)

### Component 12: Package — `packages/scraper`

**Purpose**: Skeleton scraper Bun-only. M1 = entry point yang print "scraper placeholder" lalu exit.

**Interface (`packages/scraper/package.json` shape)**:

```pascal
STRUCTURE ScraperPackageJson
  name: "@pantau-pangan/scraper"
  private: true
  type: "module"

  scripts:
    "dev"        → "bun run --hot src/index.ts"
    "build"      → "bun build src/index.ts --outdir=dist --target=bun"
    "scrape"     → "bun run src/index.ts"
    "lint"       → "eslint ."
    "typecheck"  → "tsc --noEmit"

  dependencies:
    "@pantau-pangan/shared": "workspace:*"

  devDependencies:
    "@types/bun"
END STRUCTURE
```

**Source skeleton (`packages/scraper/src/index.ts`)**:

```pascal
PROCEDURE main()
  console.log("Pantau Pangan scraper — placeholder, akan diisi di M2")
  PROCESS.exit 0
END PROCEDURE

CALL main()
```

**Responsibilities (M1 only)**:

- Bisa dijalankan via `bun run scrape` dari root
- Zero runtime dependency selain `shared` — sesuai rule AGENTS.md

## Data Models

### Model 1: Workspace Manifest Layout

```pascal
STRUCTURE WorkspaceLayout
  root: "pantau-pangan/"
  workspaces:
    - "apps/api"
    - "apps/web"
    - "packages/shared"
    - "packages/scraper"

  packageManager: "bun"                        // pinned version di root package.json
  workspaceProtocol: "workspace:*"             // semua internal dep pakai ini
END STRUCTURE
```

**Validation Rules**:

- Setiap workspace MUST punya `package.json` dengan `name` ber-prefix `@pantau-pangan/`
- Setiap workspace MUST punya `tsconfig.json` yang `extends: "../../tsconfig.json"` (atau path setara)
- Internal dependency MUST pakai `"workspace:*"` (bukan version literal atau file path)
- `name` di setiap package MUST unique

### Model 2: Tsconfig Per-Package

```pascal
STRUCTURE PackageTsconfig
  extends: "../../tsconfig.json"               // base dari root
  compilerOptions:
    rootDir: "src"
    outDir: "dist"                             // (atau ".next" untuk web — diatur Next.js sendiri)
    composite: false                           // M1: tidak pakai project references — keep simple
  include: ["src/**/*"]
  exclude: ["dist", "node_modules"]
END STRUCTURE
```

**Validation Rules**:

- `apps/web/tsconfig.json` punya tambahan: `"jsx": "preserve"`, `"plugins": [{ "name": "next" }]`, `"lib": ["DOM", "ESNext"]`
- `apps/api/tsconfig.json` dan `packages/scraper/tsconfig.json` punya `"types": ["bun"]`
- `packages/shared/tsconfig.build.json` extend dari `tsconfig.json` lokal dengan `noEmit: false` untuk emit `dist/`

### Model 3: Environment Variables

Sesuai PRD §8 dan AGENTS.md, M1 hanya bikin `.env.example` (file `.env` itu sendiri tidak di-commit).

```pascal
STRUCTURE EnvExample
  // apps/api
  DATABASE_URL: "postgresql://user:pass@localhost:5432/pantau_pangan"
  OPENROUTER_API_KEY: "sk-or-..."
  API_PORT: "3001"

  // apps/web
  NEXT_PUBLIC_API_URL: "http://localhost:3001"
END STRUCTURE
```

**Validation Rules**:

- `.env.example` di-commit, `.env` tidak (`.gitignore`)
- Semua variable yang akan dipakai di M2–M7 didaftarkan di sini sejak M1 supaya developer onboarding cepat
- Tidak ada secret asli di `.env.example` — hanya placeholder/format

### Model 4: Gitignore Set

```pascal
STRUCTURE GitignoreEntries
  - "node_modules/"
  - ".env"
  - ".env.local"
  - ".env.*.local"
  - ".turbo/"
  - "dist/"
  - ".next/"
  - "coverage/"
  - "*.log"
  - ".DS_Store"
  - "bun.lock"                                 // OPSIONAL: keep di repo? lihat keputusan
END STRUCTURE
```

**Validation Rules**:

- `bun.lock` — **commit** (deterministic install, sesuai best practice Bun)
- `.env*` selain `.env.example` — **never commit**
- Build artifacts (`dist/`, `.next/`, `.turbo/`) — never commit

## Error Handling

### Error Scenario 1: `bun install` gagal di salah satu workspace

**Condition**: Workspace protocol salah, package name tidak ber-prefix `@pantau-pangan/`, atau registry timeout.

**Response**: Bun output error message yang menyebut package mana yang bermasalah. Exit code non-zero.

**Recovery**: Developer cek `package.json` package terkait, perbaiki `name`/`workspaces` glob, jalankan ulang `bun install`. M1 design wajib memastikan resolusi workspace bekerja sebelum dianggap selesai.

### Error Scenario 2: `bun run typecheck` gagal di package downstream karena `shared` belum dibuild

**Condition**: `apps/api` import dari `@pantau-pangan/shared`, tapi `shared/dist/` belum di-generate (mis. setelah `git clean`).

**Response**: TypeScript error "Cannot find module '@pantau-pangan/shared'". Turborepo `dependsOn: ["^build"]` di task `typecheck` mencegah ini di pipeline normal.

**Recovery**: Jalankan `bun run build` dulu, atau pastikan Turborepo cache valid. Untuk dev workflow, `next.config.mjs` pakai `transpilePackages` dan API/scraper Bun bisa resolve workspace source langsung.

### Error Scenario 3: Pre-commit hook reject commit karena ESLint error

**Condition**: File staged punya lint error yang tidak auto-fixable (mis. `no-floating-promises`).

**Response**: `lint-staged` exit non-zero, commit di-abort, error message ditampilkan ke developer.

**Recovery**: Developer fix error manual, `git add` ulang, commit lagi. Tidak ada bypass otomatis — gate ini sengaja "keras".

### Error Scenario 4: Pre-push hook reject push karena typecheck fail

**Condition**: Code sudah di-commit (sintaks valid, lint pass) tapi type error saat full typecheck (mis. assignment cross-package yang salah).

**Response**: `bun run typecheck` exit non-zero, push di-abort.

**Recovery**: Developer fix type error, commit lagi (atau amend), push ulang. Bisa di-bypass dengan `git push --no-verify` untuk emergency.

### Error Scenario 5: commitlint reject commit message

**Condition**: Commit message tidak match `<type>(<scope>): <subject>` atau type tidak ada di enum.

**Response**: `commitlint` exit non-zero dengan pesan yang menjelaskan rule yang dilanggar. Commit di-abort, **tapi staging tetap utuh** (developer tinggal edit message).

**Recovery**: `git commit -m "feat: ..."` ulang dengan format yang benar.

### Error Scenario 6: `bun run dev` — salah satu app crash, yang lain tetap jalan

**Condition**: API crash karena typo di placeholder, web tetap jalan.

**Response**: Turborepo persistent task akan tampilkan log API error. Web tetap jalan di port 3000.

**Recovery**: Developer perbaiki error, Bun `--hot` reload otomatis. Tidak perlu restart `turbo run dev`.

## Testing Strategy

### Unit Testing Approach

M1 fokus pada **fondasi**, bukan logic. Karena itu unit test untuk source code skeleton tidak diperlukan (tidak ada logic untuk di-test). Yang perlu diverifikasi: **tooling pipeline bekerja end-to-end**.

Verifikasi M1 dilakukan via **acceptance script** — kumpulan command yang harus exit 0:

| #   | Command                                            | Expected                                                                                                                                           |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `bun install`                                      | Exit 0, `bun.lock` ter-generate, semua 4 package ter-link                                                                                          |
| 2   | `bun run typecheck`                                | Exit 0 di semua 4 package                                                                                                                          |
| 3   | `bun run lint`                                     | Exit 0 di semua 4 package                                                                                                                          |
| 4   | `bun run build`                                    | Exit 0; `apps/web/.next/` ter-generate, `apps/api/dist/` ter-generate, `packages/shared/dist/` ter-generate, `packages/scraper/dist/` ter-generate |
| 5   | `bun run dev` (terminate manual)                   | API listen di :3001, web listen di :3000, dua-duanya tidak crash dalam 10 detik pertama                                                            |
| 6   | `git commit -m "bad message"`                      | commitlint reject, commit di-abort                                                                                                                 |
| 7   | `git commit -m "feat: ..."` dengan file lint-error | lint-staged reject, commit di-abort                                                                                                                |
| 8   | `git commit -m "feat: ..."` dengan file bersih     | Commit sukses                                                                                                                                      |
| 9   | `git push` dengan typecheck error                  | pre-push reject, push di-abort                                                                                                                     |

### Property-Based Testing Approach

**Tidak applicable untuk M1.** Foundation/tooling adalah konfigurasi deklaratif — tidak ada fungsi pure dengan input/output universal yang bermakna untuk di-test secara property-based. Sesuai panduan workflow, IaC dan setup configuration **bukan** target PBT.

PBT akan masuk mulai M2 (scraper parser → round-trip property), M3 (API serialization), dan kalkulasi bubble (M4) dimana logic universal-nya jelas.

**Property Test Library**: TBD di M2 (kandidat: `fast-check` — TypeScript-native, kompatibel dengan Bun test runner).

### Integration Testing Approach

M1 punya satu integration test implisit: **acceptance script di atas**. Itu sudah cukup. Integration test berbasis HTTP (API ↔ DB ↔ scraper) datang di M3.

## Performance Considerations

- **Turborepo cache** — `build`, `lint`, `typecheck` semua cached. Run kedua di file unchanged harus selesai < 1 detik.
- **lint-staged** memproses hanya staged files — pre-commit harus selesai < 5 detik untuk diff tipikal.
- **Pre-push typecheck** akan jalan full monorepo. Dengan TS strict + 4 package, target < 15 detik (Turborepo cache membantu).
- **Bun install** harus selesai < 30 detik untuk fresh install (tergantung network).

Catatan: angka di atas adalah target soft. Kalau ada yang melebar di M1 nanti, dokumentasikan di README untuk awareness developer.

## Security Considerations

- **`.env` tidak boleh di-commit** — `.gitignore` wajib include semua varian `.env*` kecuali `.env.example`.
- **`packageManager` field di `package.json`** pin Bun version supaya semua kontributor pakai versi sama (mencegah drift).
- **`bun.lock` di-commit** — deterministic install, mencegah supply-chain surprise.
- **Husky hooks tidak boleh di-bypass otomatis** — `--no-verify` hanya untuk emergency manual.
- **commitlint** mendorong history yang auditable — penting untuk traceability bug nanti.
- M1 belum punya secret asli (DB, OpenRouter). Saat M2+ menambah, JANGAN inline value di code; selalu via `Bun.env` / `process.env` dari `.env`.

## Dependencies

### Runtime / Tooling Wajib

| Dependency                      | Versi                | Lokasi      | Catatan                             |
| ------------------------------- | -------------------- | ----------- | ----------------------------------- |
| Bun                             | latest stable        | system      | Pin via root `packageManager` field |
| Node typings                    | melalui `@types/bun` | root        | Tidak install Node.js terpisah      |
| TypeScript                      | latest stable        | root devDep | Single version di seluruh monorepo  |
| Turborepo                       | latest stable        | root devDep |                                     |
| ESLint                          | v9+ (flat config)    | root devDep |                                     |
| typescript-eslint               | latest               | root devDep |                                     |
| Prettier                        | v3+                  | root devDep |                                     |
| eslint-config-prettier          | latest               | root devDep |                                     |
| Husky                           | v9+                  | root devDep |                                     |
| lint-staged                     | latest               | root devDep |                                     |
| @commitlint/cli                 | latest               | root devDep |                                     |
| @commitlint/config-conventional | latest               | root devDep |                                     |

### Per-Package Runtime

| Package            | Runtime Dep                                                    |
| ------------------ | -------------------------------------------------------------- |
| `apps/api`         | `hono`, `@pantau-pangan/shared`                                |
| `apps/web`         | `next`, `react`, `react-dom`, `@pantau-pangan/shared`          |
| `packages/shared`  | (none)                                                         |
| `packages/scraper` | `@pantau-pangan/shared` (zero HTTP library — Bun fetch native) |

### Yang JANGAN Dipasang di M1

- ❌ Drizzle ORM, `pg`, `postgres` — masuk M2
- ❌ shadcn/ui, Tailwind, D3, TanStack Query — masuk M4
- ❌ OpenRouter SDK — masuk M5
- ❌ Playwright atau library scraping lain — selamanya tidak dipakai (sesuai AGENTS.md)
- ❌ Vitest / Jest — kalau testing diperlukan di M2+, default ke Bun test runner

## Correctness Properties

> Untuk M1, "correctness" diukur sebagai **invariant struktural** repo, bukan property runtime.
> Semua property di sini akan di-validate di Phase 2 (Requirements) dan dipetakan ke acceptance criteria.

### Property 1: Workspace Resolution Invariant

Untuk setiap package internal di `apps/*` dan `packages/*`, jika ia mendeklarasikan dependency ke package internal lain, dependency itu MUST resolved via Bun workspace protocol (`workspace:*`) — bukan dari registry, bukan dari relative path.

**Validates: Requirements 1.9, 1.10, 1.11, 1.12, 1.13**

### Property 2: Pipeline Idempotence

Untuk setiap script di root (`build`, `lint`, `typecheck`), menjalankannya dua kali berturut-turut tanpa perubahan source MUST menghasilkan exit code yang sama (0) dan run kedua MUST lebih cepat dari run pertama (Turborepo cache hit).

**Validates: Requirements 2.17, 2.18, 2.19**

### Property 3: Hook Gate Completeness

Setiap commit yang lulus `git commit` MUST: (a) punya commit message conventional (match `^(feat|fix|chore|docs|refactor|test|style|perf|ci|build|revert)(\(.+\))?: .+`), DAN (b) staged files-nya lulus ESLint + Prettier. Setiap push yang lulus `git push` MUST lulus `tsc --noEmit` di seluruh monorepo.

**Validates: Requirements 5.3, 5.4, 5.5, 5.11, 5.12, 5.13, 5.14, 11.6, 11.7, 11.8, 11.9**

### Property 4: Strictness Inheritance

Untuk setiap `tsconfig.json` per-package, ia MUST extend root `tsconfig.json` sehingga `strict: true` dan `noUncheckedIndexedAccess: true` aktif di semua package — kecuali ada override eksplisit yang didokumentasikan.

**Validates: Requirements 3.2, 3.3, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14**

### Property 5: Secret Containment

`.env`, `.env.local`, dan varian-nya MUST tidak pernah di-track Git. Setiap variabel environment yang dirujuk di code MUST didokumentasikan di `.env.example` dengan placeholder (bukan nilai asli).

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8**

### Property 6: Placeholder Validity

Untuk setiap package skeleton, source-nya MUST: (a) compile dengan `tsc --noEmit` exit 0, (b) lulus `eslint .`, dan (c) untuk `apps/api` dan `apps/web`, bisa di-start via `dev` script tanpa crash dalam 10 detik pertama.

**Validates: Requirements 6.7, 6.8, 6.10, 7.8, 7.9, 7.11, 8.8, 8.9, 9.7, 9.8, 11.2, 11.3, 11.5**
