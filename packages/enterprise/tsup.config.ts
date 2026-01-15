import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'crm/index': 'src/crm/index.ts',
    'compliance/index': 'src/compliance/index.ts',
    'analytics/index': 'src/analytics/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: 'es2020',
  skipNodeModulesBundle: true,
})
