#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { rmSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const templatePathArg = process.argv[2] || 'templates/minimal'
const repoRoot = resolve(__dirname, '..')
const templateAbs = resolve(repoRoot, templatePathArg)
const tmpRoot = resolve(__dirname, '.smoke-tmp')
const tmpTemplate = resolve(tmpRoot, 'template')

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', cwd: opts.cwd || repoRoot })
}

try {
  console.log('[smoke] Cleaning temp dir')
  rmSync(tmpRoot, { recursive: true, force: true })
  mkdirSync(tmpRoot, { recursive: true })

  console.log('[smoke] Building library at root')
  sh('pnpm run build', { cwd: repoRoot })

  console.log('[smoke] Packing library tarball')
  const packOutput = execSync('pnpm pack', { cwd: repoRoot }).toString().trim()
  const tarball = packOutput.split('\n').pop().trim()
  const tarballAbs = resolve(repoRoot, tarball)
  console.log('[smoke] Tarball:', tarballAbs)

  console.log('[smoke] Copying template to temp')
  cpSync(templateAbs, tmpTemplate, { recursive: true })

  console.log('[smoke] Rewriting template dependency to tarball')
  const pkgPath = resolve(tmpTemplate, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  if (!pkg.dependencies) pkg.dependencies = {}
  pkg.dependencies['vuesip'] = `file:${tarballAbs}`
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

  console.log('[smoke] Installing and building template')
  sh('pnpm install --no-frozen-lockfile', { cwd: tmpTemplate })
  sh('pnpm run build', { cwd: tmpTemplate })

  console.log('[smoke] SUCCESS: template built against packed dist')
} catch (err) {
  console.error('[smoke] FAILED:', err)
  process.exit(1)
}
