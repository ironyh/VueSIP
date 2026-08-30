# Releasing VueSip to npm

The package **`vuesip`** is public on npm (latest published: 1.1.0). Releases
are driven by **pushing a `vX.Y.Z` tag**, which triggers the Gitea Actions
release workflow — not by manual `npm publish` from a laptop (unless you
intentionally fall back to that).

## Automated publish (recommended)

CI runs on **Gitea Actions** now (`gitea.sley.se` → repo `ironyh/VueSIP`);
GitHub Actions is retired (billing discontinued). The release workflow is
`.gitea/workflows/release.yml`.

1. **Version bump** — Update `version` in root `package.json` on `main`
   following [SemVer](https://semver.org/). Also update `CHANGELOG.md` if you
   maintain one.
2. **Push the tag** — the tag must match `package.json`:

   ```bash
   git tag v1.4.0
   git push origin v1.4.0
   ```

3. **Workflow** — `release.yml` runs on `v*` tags and:
   - verifies the tag matches `package.json` version
   - `pnpm install --frozen-lockfile`
   - `pnpm run build`, `pnpm run typecheck`, unit tests (`tests/unit`)
   - `npm publish --access public`

   Watch progress under **Actions** on gitea.sley.se.

## Required secret

In the Gitea repo: **Settings → Actions → Secrets**

- **`NPM_TOKEN`** — npm token with permission to publish the `vuesip`
  package (granular or classic). The publish step uses `NODE_AUTH_TOKEN`.

## Notes vs the old GitHub flow

- `--provenance` is dropped: provenance requires GitHub's OIDC and cannot be
  produced by Gitea Actions.
- The workflow triggers on **tag push** (Gitea's `release` event support is
  limited), so a tag alone publishes — push the tag only when the version
  bump is on `main`.

## Pre-release checklist

- [ ] `pnpm run build` succeeds; `dist/` matches `package.json` `files` / `exports`
- [ ] Full unit suite green (`node node_modules/vitest/vitest.mjs run` — ~26s)
- [ ] Tag matches `package.json` version

## Dry run locally (optional)

```bash
pnpm run build
npm pack
```

Inspect the tarball; do not publish unless you intend to.
