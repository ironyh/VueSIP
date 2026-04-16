# CI & template workflow — backlog

Snabba förbättringar som redan är gjorda (referens):

- **`pnpm-lock.yaml` / `pnpm-workspace.yaml`** i path-filters för _Deploy Starter Templates_ och _Template Smoke (PR)_ så dependency-ändringar triggar samma jobb som `package.json`.
- **`scripts/write-dist-package-json.mjs`** + `pnpm run write-dist-package` — en källa till sanning för `dist/package.json` som CI använder vid `file:../../dist` (ersätter duplicerade heredocs).
- **`pnpm/action-setup@v3`** i `.github/workflows/test.yml` (enhetligt inom den filen med övriga steg).

## Nästa steg (medel insats)

1. **PR `test.yml` vs `templates-smoke.yml`**  
   Huvud-PR-workflow kör bara `smoke:template:minimal`. Överväg att utöka path-triggers så `pnpm-lock.yaml` alltid kör `templates-smoke`, eller lägg ett rot-script som loopar alla mallar (samma lista som smoke-matrisen) för lokal parity.

2. **Dokumentation för utvecklare**  
   I `AGENTS.md` eller här: efter dependency-ändring, kör **`pnpm install` från repo-root** så `vue`-override och workspace löses konsekvent; undvik enbart `pnpm install` under `templates/...` om det skapar en andra Vue-upplösning.

3. **`pnpm/action-setup` repo-wide**  
   Fler workflows använder fortfarande `@v2` eller `@v4` (t.ex. `security.yml`, `e2e-tests.yml`, `bundle-size.yml`, `publish.yml`, `enterprise-pack.yml`, `flaky-test-detector.yml`). Välj en målversion och migrera i batch när det passar.

## Större refaktor

4. **Återanvändbar workflow** för “checkout → pnpm → install → build library → write-dist-package → upload `vuesip-dist` artifact” så `deploy-templates.yml` och `templates-smoke.yml` (och ev. release) delar samma definition.

5. **`.gitignore`**  
   Om `pnpm` ibland skapar **`.pnpm-store/`** i repo-root, lägg till i `.gitignore` för att undvika oavsiktliga commits.

6. **pnpm catalog** (valfritt)  
   Gemensam Vue-version via `pnpm-workspace.yaml` catalog kan komplettera `overrides` och göra mallars `package.json` enklare att hålla i synk.
