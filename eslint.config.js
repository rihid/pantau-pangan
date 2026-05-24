// Konfigurasi ESLint flat config untuk monorepo Pantau Pangan.
// Single source — tidak ada eslint config per-package.
//
// Referensi:
// - https://eslint.org/docs/latest/use/configure/configuration-files
// - https://typescript-eslint.io/getting-started/typed-linting
// - https://typescript-eslint.io/packages/typescript-eslint
// - https://typescript-eslint.io/packages/parser/#projectservice
//
// Pola idiomatic typescript-eslint v8: pakai helper `tseslint.config()` dan
// scope typed linting (parserOptions.projectService + recommendedTypeChecked)
// HANYA ke file TS lewat `files` + `extends` di dalam blok yang sama.
// File JS murni (eslint.config.js, commitlint.config.js, next.config.mjs)
// di-parse oleh parser default ESLint tanpa type info — tidak ada risiko
// error "not found by project service".
// Untuk file `.ts` yang di luar tsconfig manapun (mis. root `*.config.ts`),
// kita pakai `projectService.allowDefaultProject` (catatan: glob TIDAK boleh
// `**`, hanya `*` — ini batasan typescript-eslint).
//
// Catatan: kita JANGAN allow `apps/*/*.config.ts` atau `packages/*/*.config.ts`
// di sini karena per-package `tsconfig.json` (mis. apps/web) sudah include
// `**/*.ts` lewat option `include`, sehingga file seperti `next.config.ts`
// otomatis di-parse oleh project service. Menambah pattern itu di sini akan
// memicu error "was included by allowDefaultProject but also was found in the
// project service".

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  // Block 1 — ignores global (replacement untuk .eslintignore lama).
  {
    ignores: ['**/dist/**', '**/.next/**', '**/.turbo/**', '**/node_modules/**', '**/coverage/**'],
  },

  // Block 2 — JS recommended dari @eslint/js (berlaku untuk semua file JS+TS).
  js.configs.recommended,

  // Block 3 — typed linting + rules typescript-eslint, di-scope ke file TS.
  // `extends` menggabungkan `recommendedTypeChecked` (array of configs) dan
  // semuanya dapat filter `files` di bawah ini.
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: {
          // File config TS di root yang BERADA DI LUAR tsconfig manapun.
          // Restriksi typescript-eslint: TIDAK boleh pakai `**` di sini.
          // Pattern per-workspace tidak ditambahkan supaya tidak konflik dengan
          // include `**/*.ts` di package-level tsconfig (lihat catatan di atas).
          allowDefaultProject: ['*.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },

  // Block 4 — rules global untuk semua file (JS+TS).
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Block 5 — scope override untuk apps/web (Next.js): butuh globals
  // browser (window, document, dst) DAN node (process, dst untuk server components).
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Block 6 — eslint-config-prettier WAJIB terakhir supaya rule formatting
  // bawaan ESLint/typescript-eslint dimatikan dan Prettier yang menang.
  eslintConfigPrettier,
)
