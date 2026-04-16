# Releasing VueSip to npm

The package **`vuesip`** is public on npm. Releases are driven by **GitHub Releases**, not by manual `npm publish` from a laptop (unless you intentionally fall back to that).

## Automated publish (recommended)

1. **Version bump** — Update `version` in root `package.json` on `main` (or via PR) following [SemVer](https://semver.org/).
2. **Changelog** — Update `CHANGELOG.md` if you maintain one.
3. **GitHub Release** — Create a [new release](https://github.com/ironyh/VueSIP/releases) and publish it (tag usually `vX.Y.Z` matching `package.json`).
4. **Workflow** — `.github/workflows/publish.yml` runs on `release: [published]`:
   - Installs with `pnpm install --frozen-lockfile`
   - `pnpm run build`, `pnpm run typecheck`, `pnpm run test:unit`
   - `npm publish --provenance --access public`

## Required secret

In the GitHub repo: **Settings → Secrets and variables → Actions**

- **`NPM_TOKEN`** — Granular or classic npm token with permission to publish the `vuesip` package. The workflow uses `NODE_AUTH_TOKEN` for the publish step.

## Provenance

`--provenance` links the package on npm to the GitHub build. Ensure the npm package settings and token allow provenance if you use this flag; otherwise adjust the publish command (maintainers only).

## Pre-release checklist

- [ ] `pnpm run build` succeeds; `dist/` matches `package.json` `files` / `exports`
- [ ] `pnpm run test:unit` green
- [ ] Tag / release name consistent with `package.json` version

## Dry run locally (optional)

```bash
pnpm run build
npm pack
```

Inspect the tarball; do not publish unless you intend to.
