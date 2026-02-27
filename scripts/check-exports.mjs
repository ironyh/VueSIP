#!/usr/bin/env node
/**
 * Export parity check: compares composables exported from the package
 * with composables documented in README (and optionally docs/composables-documented.json).
 *
 * Reports:
 * - Exported but not documented
 * - Documented but not exported
 *
 * Usage: pnpm run check:exports
 * Set CHECK_EXPORTS_STRICT=1 to exit with code 1 on any mismatch.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Only match useXxx inside export { ... } to avoid comments (e.g. useSipConnection)
function getExportedComposables() {
  const set = new Set()
  const composablesPath = join(ROOT, 'src/composables/index.ts')
  const codecsPath = join(ROOT, 'src/codecs/index.ts')

  for (const path of [composablesPath, codecsPath]) {
    const content = readFileSync(path, 'utf-8')
    // Match lines that look like "export { ... useXxx ... }" or "export { useXxx, ..."
    const exportBlockRe = /export\s*\{([^}]+)\}/g
    let block
    while ((block = exportBlockRe.exec(content)) !== null) {
      const re = /\b(use[A-Z][a-zA-Z0-9]*)\b/g
      let m
      while ((m = re.exec(block[1])) !== null) set.add(m[1])
    }
  }

  return set
}

function getDocumentedComposables() {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf-8')
  const set = new Set()
  // README "All Composables by Category" uses: - `useSipClient` - ...
  const re = /-\s*`(use[A-Z][a-zA-Z0-9]*)`\s*[-–]/g
  for (const match of readme.matchAll(re)) {
    set.add(match[1])
  }
  // useCodecs is mentioned in Features / Codecs (preview) section
  if (readme.includes('`useCodecs`')) set.add('useCodecs')

  try {
    const mdPath = join(ROOT, 'docs/composables-documented.md')
    const md = readFileSync(mdPath, 'utf-8')
    for (const line of md.split('\n')) {
      const t = line.trim()
      if (t.startsWith('#') || !t) continue
      const m = t.match(/^use[A-Z][a-zA-Z0-9]*$/)
      if (m) set.add(m[0])
    }
  } catch {
    // Optional: docs/composables-documented.md not required
  }

  return set
}

function main() {
  const exported = getExportedComposables()
  const documented = getDocumentedComposables()

  const exportedNotDoc = [...exported].filter((x) => !documented.has(x)).sort()
  const docNotExported = [...documented].filter((x) => !exported.has(x)).sort()

  const strict = process.env.CHECK_EXPORTS_STRICT === '1'

  console.log('=== Export parity (composables) ===\n')

  if (exportedNotDoc.length > 0) {
    console.log('Exported but not documented:')
    exportedNotDoc.forEach((name) => console.log('  -', name))
    console.log('')
  }

  if (docNotExported.length > 0) {
    console.log('Documented but not exported:')
    docNotExported.forEach((name) => console.log('  -', name))
    console.log('')
  }

  if (exportedNotDoc.length === 0 && docNotExported.length === 0) {
    console.log('OK: Export parity between package and docs.')
    process.exit(0)
    return
  }

  console.log(
    `Summary: ${exportedNotDoc.length} exported-but-not-documented, ${docNotExported.length} documented-but-not-exported.`
  )
  if (strict) {
    process.exit(1)
  }
  process.exit(0)
}

main()
