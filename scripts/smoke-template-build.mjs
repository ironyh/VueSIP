#!/usr/bin/env node
/**
 * Pack vuesip from repo root and build a template against the tarball (CI parity).
 * Usage:
 *   node scripts/smoke-template-build.mjs [templates/foo]
 *   node scripts/smoke-template-build.mjs --all
 */
import { execSync } from 'node:child_process'
import { existsSync, rmSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** Same order as .github/workflows/templates-smoke.yml matrix */
const SMOKE_TEMPLATE_PATHS = [
  'templates/minimal',
  'templates/basic-softphone',
  'templates/call-center',
  'templates/pwa-softphone',
  'templates/ivr-tester',
  'templates/video-room',
]

const repoRoot = resolve(__dirname, '..')
/** Under repo root so templates' vite aliases `../../dist` (from `templates/foo`) still resolve. */
const tmpRoot = join(repoRoot, '.smoke-tmp')

const argv = process.argv.slice(2)
const useAll = argv.includes('--all')
const pathArgs = argv.filter((a) => !a.startsWith('-'))

const templatesToBuild = useAll
  ? SMOKE_TEMPLATE_PATHS
  : [pathArgs[0] || 'templates/minimal']

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', cwd: opts.cwd || repoRoot })
}

/** @param {string} tarballAbs */
function tryRemoveTarball(tarballAbs) {
  try {
    if (tarballAbs && existsSync(tarballAbs)) {
      rmSync(tarballAbs, { force: true })
    }
  } catch {
    // best-effort cleanup
  }
}

let packedTarballAbs = ''

try {
  console.log('[smoke] Cleaning temp dir')
  rmSync(tmpRoot, { recursive: true, force: true })
  mkdirSync(tmpRoot, { recursive: true })

  console.log('[smoke] Building library at root')
  sh('pnpm run build', { cwd: repoRoot })

  console.log('[smoke] Packing library tarball')
  const packOutput = execSync('pnpm pack', { cwd: repoRoot }).toString().trim()
  const tarball = packOutput.split('\n').pop().trim()
  packedTarballAbs = resolve(repoRoot, tarball)
  console.log('[smoke] Tarball:', packedTarballAbs)

  for (const templatePathArg of templatesToBuild) {
    const templateAbs = resolve(repoRoot, templatePathArg)
    if (!existsSync(templateAbs)) {
      throw new Error(`Template path missing: ${templatePathArg}`)
    }

    const slug = basename(templatePathArg)
    const tmpTemplate = join(tmpRoot, slug)

    console.log(`\n[smoke] --- ${templatePathArg} ---`)
    rmSync(tmpTemplate, { recursive: true, force: true })
    mkdirSync(tmpTemplate, { recursive: true })

    console.log('[smoke] Copying template to temp')
    cpSync(templateAbs, tmpTemplate, { recursive: true })

    console.log('[smoke] Rewriting template dependency to tarball')
    const pkgPath = resolve(tmpTemplate, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    if (!pkg.dependencies) pkg.dependencies = {}
    pkg.dependencies['vuesip'] = `file:${packedTarballAbs}`
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

    console.log('[smoke] Installing and building template')
    sh('pnpm install --no-frozen-lockfile', { cwd: tmpTemplate })
    sh('pnpm run build', { cwd: tmpTemplate })
  }

  console.log('\n[smoke] SUCCESS: all requested templates built against packed dist')
} catch (err) {
  console.error('[smoke] FAILED:', err)
  process.exit(1)
} finally {
  tryRemoveTarball(packedTarballAbs)
}
