#!/usr/bin/env node
/**
 * Security audit via npm registry bulk advisory API.
 * Use while `pnpm audit` hits HTTP 410 (legacy audit endpoints retired; pnpm/pnpm#11265).
 *
 * Usage: node scripts/npm-registry-bulk-audit.mjs [low|moderate|high|critical]
 */

import { readFileSync } from 'node:fs'
import https from 'node:https'
import { resolve } from 'node:path'
import { satisfies } from 'semver'

const BULK_ENDPOINT = 'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk'
const SEVERITY_ORDER = ['low', 'moderate', 'high', 'critical']

function thresholdIndex(name) {
  const i = SEVERITY_ORDER.indexOf(name)
  if (i === -1) {
    console.error(`Unknown threshold "${name}". Use: ${SEVERITY_ORDER.join(', ')}`)
    process.exit(1)
  }
  return i
}

/**
 * Decode pnpm lockfile v9 `packages:` entry key → npm package name + version.
 * Examples: `vite@7.3.2`, `@vitejs+plugin-vue@6.0.5`, `pkg@1.0.0(peer@...)`.
 */
function decodePnpmPackageKey(rawKey) {
  const key = String(rawKey).split('(')[0].trim()
  const at = key.lastIndexOf('@')
  if (at <= 0) return null
  const version = key.slice(at + 1)
  let name = key.slice(0, at)
  if (!name || !version) return null
  if (name.startsWith('@')) {
    const m = name.match(/^@([^+]+)\+(.+)$/)
    if (m) name = `@${m[1]}/${m[2]}`
  }
  return { name, version }
}

function collectPackagesFromLockfile(lockfilePath = resolve(process.cwd(), 'pnpm-lock.yaml')) {
  let text
  try {
    text = readFileSync(lockfilePath, 'utf8')
  } catch (e) {
    console.error('Cannot read pnpm-lock.yaml:', e.message)
    process.exit(1)
  }

  const lines = text.split(/\r?\n/)
  const pkgIdx = lines.indexOf('packages:')
  if (pkgIdx === -1) {
    console.error('pnpm-lock.yaml: missing packages: section')
    process.exit(1)
  }
  const snapIdx = lines.indexOf('snapshots:', pkgIdx + 1)
  const end = snapIdx === -1 ? lines.length : snapIdx

  const merged = {}
  for (let i = pkgIdx + 1; i < end; i++) {
    const line = lines[i]
    const m = line.match(/^  (.+):\s*$/)
    if (!m) continue
    let raw = m[1].trim()
    if (
      (raw.startsWith("'") && raw.endsWith("'")) ||
      (raw.startsWith('"') && raw.endsWith('"'))
    ) {
      raw = raw.slice(1, -1)
    }
    const decoded = decodePnpmPackageKey(raw)
    if (!decoded) continue
    const { name, version } = decoded
    if (!merged[name]) merged[name] = new Set()
    merged[name].add(version)
  }

  const payload = {}
  for (const [pkg, set] of Object.entries(merged)) {
    payload[pkg] = [...set].sort()
  }
  return { payload, merged }
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const data = Buffer.from(body, 'utf8')
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 800)}`))
            return
          }
          try {
            resolve(JSON.parse(text))
          } catch (e) {
            reject(new Error(`Invalid JSON: ${e.message}`))
          }
        })
      }
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

const threshold = thresholdIndex(process.argv[2] || 'high')
const { payload, merged } = collectPackagesFromLockfile()
const pkgCount = Object.keys(payload).length
console.log(`Bulk audit: ${pkgCount} package name(s) (installed versions) → registry`)

let advisories
try {
  advisories = await postJson(BULK_ENDPOINT, JSON.stringify(payload))
} catch (e) {
  console.error('Bulk advisory request failed:', e.message)
  process.exit(1)
}

const counts = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 }
let gatedFindings = 0

for (const [pkgName, list] of Object.entries(advisories)) {
  if (!Array.isArray(list)) continue
  const ourVersions = merged[pkgName]
  if (!ourVersions || ourVersions.size === 0) continue

  for (const adv of list) {
    const sevRaw = typeof adv.severity === 'string' ? adv.severity.toLowerCase() : 'low'
    if (counts[sevRaw] !== undefined) counts[sevRaw]++
    else counts.info++

    const sevIdx = SEVERITY_ORDER.indexOf(sevRaw)
    if (sevIdx === -1 || sevIdx < threshold) continue

    const range = adv.vulnerable_versions
    if (!range || typeof range !== 'string') continue

    for (const v of ourVersions) {
      try {
        if (satisfies(v, range, { includePrerelease: true })) {
          gatedFindings++
          console.error(
            `[${sevRaw.toUpperCase()}] ${pkgName}@${v} — ${adv.title || adv.url || 'advisory'}`
          )
          break
        }
      } catch {
        /* invalid semver range from registry */
      }
    }
  }
}

console.log('Advisory totals by severity (all returned):', JSON.stringify(counts))

if (gatedFindings > 0) {
  console.error(
    `\nFailed: ${gatedFindings} installed version(s) affected at or above "${SEVERITY_ORDER[threshold]}".`
  )
  process.exit(1)
}

console.log(`OK: no installed versions affected at or above "${SEVERITY_ORDER[threshold]}".`)
