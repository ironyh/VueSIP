// ESLint 9 Flat Config
// Migration from .eslintrc.cjs to flat config format

import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

// ============================================================================
// Shared Constants - DRY principle for repeated configurations
// ============================================================================

/** Browser globals available in all environments */
const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  performance: 'readonly',
  DOMException: 'readonly',
  AbortController: 'readonly',
  AbortSignal: 'readonly',
}

/** Node.js globals for server-side and build tools */
const nodeGlobals = {
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  module: 'readonly',
  require: 'readonly',
  global: 'readonly',
  Buffer: 'readonly',
}

/** Vitest testing globals */
const testGlobals = {
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  vi: 'readonly',
}

/** Combined globals for different contexts */
const allGlobals = { ...browserGlobals, ...nodeGlobals, ...testGlobals }

/** Standard TypeScript parser options */
const tsParserOptions = {
  ecmaVersion: 2020,
  sourceType: 'module',
}

/** Vue parser options extending TypeScript */
const vueParserOptions = {
  ...tsParserOptions,
  parser: tsparser,
  extraFileExtensions: ['.vue'],
}

/** Unused vars rule configuration */
const unusedVarsRule = [
  'error',
  {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
  },
]

/** Unused vars rule for Vue (without caughtErrors) */
const unusedVarsRuleVue = [
  'error',
  {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
  },
]

/** Vue 3 base rules shared across all Vue configs */
const vueBaseRules = {
  'vue/multi-word-component-names': 'off',
  'vue/require-default-prop': 'off',
  'vue/require-explicit-emits': 'error',
  'vue/no-unused-vars': 'error',
  'vue/html-indent': ['error', 2],
  'vue/max-attributes-per-line': 'off',
  'vue/singleline-html-element-content-newline': 'off',
  'vue/html-self-closing': [
    'error',
    {
      html: { void: 'always', normal: 'never', component: 'always' },
      svg: 'always',
      math: 'always',
    },
  ],
}

/** Relaxed rules for non-production code (tests, playground, examples) */
const relaxedTypeScriptRules = {
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/explicit-module-boundary-types': 'off',
  '@typescript-eslint/no-unused-vars': unusedVarsRule,
  'no-console': 'off',
  'no-debugger': 'off',
  'no-undef': 'off',
  'no-unused-vars': 'off',
}

/** Relaxed rules for non-production Vue files */
const relaxedVueRules = {
  ...vueBaseRules,
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-unused-vars': unusedVarsRuleVue,
  'no-console': 'off',
  'no-debugger': 'off',
  'no-undef': 'off',
  'no-unused-vars': 'off',
}

// ============================================================================
// ESLint Configuration
// ============================================================================

export default [
  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.d.ts',
      'coverage/**',
      '.nuxt/**',
      '.output/**',
      'playwright-report/**',
      'test-results/**',
      // VitePress generated files - cache, build output, and temp files
      'docs/.vitepress/cache/**',
      'docs/.vitepress/dist/**',
      'docs/.vitepress/.temp/**',
      '.vitepress/cache/**',
      '.vitepress/dist/**',
      '.vitepress/.temp/**',
      // Templates are standalone projects with their own ESLint configs
      'templates/**',
    ],
  },

  // TypeScript files configuration (production - strict rules)
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: tsParserOptions,
      globals: allGlobals,
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': unusedVarsRule,
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },

  // Test files - relaxed typing rules for mocks and test utilities
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: tsParserOptions,
      globals: allGlobals,
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: relaxedTypeScriptRules,
  },

  // Playground files - relaxed rules for demo/development flexibility
  {
    files: ['playground/**/*.ts', 'playground/**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: tsParserOptions,
      globals: browserGlobals,
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: relaxedTypeScriptRules,
  },

  // Examples files - relaxed rules for simplified learning code
  {
    files: ['examples/**/*.ts', 'examples/**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: tsParserOptions,
      globals: browserGlobals,
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: relaxedTypeScriptRules,
  },

  // Vue files (production src/) - strict rules
  {
    files: ['src/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: vueParserOptions,
      globals: browserGlobals,
    },
    plugins: {
      vue: pluginVue,
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...vueBaseRules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': unusedVarsRuleVue,
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },

  // Vue files (playground) - relaxed rules
  {
    files: ['playground/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: vueParserOptions,
      globals: browserGlobals,
    },
    plugins: {
      vue: pluginVue,
      '@typescript-eslint': tseslint,
    },
    rules: relaxedVueRules,
  },

  // Vue files (examples) - relaxed rules
  {
    files: ['examples/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: vueParserOptions,
      globals: browserGlobals,
    },
    plugins: {
      vue: pluginVue,
      '@typescript-eslint': tseslint,
    },
    rules: relaxedVueRules,
  },
]
