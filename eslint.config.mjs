import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// Flat-config equivalent of the old .eslintrc.json (`next lint` was removed in
// Next 16, and eslint-config-next 16 needs ESLint 9). Same rule overrides as before.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // New in eslint-plugin-react-hooks 7 (React Compiler rules). They flag patterns
      // that already exist in the app (44 hits at the Next 16 upgrade), and fixing
      // them means refactoring effects, which is a behaviour change. Kept visible as
      // warnings so the debt is tracked, not silently hidden.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
])

export default eslintConfig
