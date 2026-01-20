import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const templateRoot = path.resolve(__dirname, '..')
const srcDir = path.join(templateRoot, 'functions')
const outDir = path.join(templateRoot, 'dist', 'functions')

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const e of entries) {
    const from = path.join(src, e.name)
    const to = path.join(dest, e.name)
    if (e.isDirectory()) {
      copyDirRecursive(from, to)
      continue
    }
    if (e.isFile()) {
      fs.copyFileSync(from, to)
    }
  }
}

// Cloudflare Pages Functions are discovered relative to the deployed directory.
// Our deploy workflow uploads `dist/`, so copy `functions/` into `dist/functions/`.
if (!fs.existsSync(srcDir)) {
  process.exit(0)
}

fs.rmSync(outDir, { recursive: true, force: true })
copyDirRecursive(srcDir, outDir)
