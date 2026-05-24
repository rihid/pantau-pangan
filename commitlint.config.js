/**
 * Konfigurasi commitlint — enforce conventional commits.
 * ESM karena root package.json memakai `"type": "module"`.
 *
 * @type {import('@commitlint/types').UserConfig}
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Hanya izinkan type yang ada di daftar ini.
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'docs',
        'refactor',
        'test',
        'style',
        'perf',
        'ci',
        'build',
        'revert',
      ],
    ],
    // Bebaskan case di subject (boleh PascalCase, lowercase, dll).
    'subject-case': [0],
    // Header maksimal 100 karakter.
    'header-max-length': [2, 'always', 100],
  },
}
