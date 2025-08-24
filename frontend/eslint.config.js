import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    ignores: ['dist'],
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      'eslint:recommended',
      'plugin:react-hooks/recommended',
      'plugin:react-refresh/recommended',
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { browser: true },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
