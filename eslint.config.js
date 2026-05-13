import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // `any` defeats the strict TS checks we just enabled — keep it banned
      // so it doesn't sneak back in via quick fixes.
      '@typescript-eslint/no-explicit-any': 'error',
      // Surface unawaited promises in mutation/error paths.
      '@typescript-eslint/no-floating-promises': 'off', // requires type-aware lint
    },
  },
])
