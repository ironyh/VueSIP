#!/usr/bin/env node
/**
 * Writes dist/package.json for CI "file:../../dist" installs.
 * Paths are repo-root package.json fields with ./dist/ stripped so they resolve inside dist/.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

/** @param {string} p */
function stripDistPrefix(p) {
  if (typeof p !== 'string') return p
  if (p.startsWith('./dist/')) return `./${p.slice('./dist/'.length)}`
  if (p.startsWith('dist/')) return `./${p.slice('dist/'.length)}`
  return p
}

/** @param {unknown} exp */
function mapExports(exp) {
  if (!exp || typeof exp !== 'object' || Array.isArray(exp)) return exp
  /** @type {Record<string, unknown>} */
  const out = {}
  for (const [key, val] of Object.entries(exp)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      /** @type {Record<string, unknown>} */
      const inner = {}
      for (const [k, v] of Object.entries(val)) {
        inner[k] = typeof v === 'string' ? stripDistPrefix(v) : v
      }
      out[key] = inner
    } else {
      out[key] = val
    }
  }
  return out
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const distPkg = {
  name: pkg.name,
  version: pkg.version,
  type: pkg.type || 'module',
  main: stripDistPrefix(pkg.main),
  module: stripDistPrefix(pkg.module),
  types: stripDistPrefix(pkg.types),
  exports: mapExports(pkg.exports),
}

if (pkg.sideEffects !== undefined) {
  distPkg.sideEffects = pkg.sideEffects
}

for (const k of Object.keys(distPkg)) {
  if (distPkg[k] === undefined) delete distPkg[k]
}

const outPath = join(root, 'dist', 'package.json')
writeFileSync(outPath, `${JSON.stringify(distPkg, null, 2)}\n`, 'utf8')
console.log('Wrote', outPath)
