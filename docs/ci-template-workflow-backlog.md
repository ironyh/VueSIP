# CI & template workflow — backlog

Snabba förbättringar som redan är gjorda (referens):

- **`pnpm-lock.yaml` / `pnpm-workspace.yaml`** i path-filters för _Deploy Starter Templates_ och _Template Smoke (PR)_ så dependency-ändringar triggar samma jobb som `package.json`.
- **Lokal smoke** använder katalogen **`.smoke-tmp/`** i repo-root (inte under `scripts/`) så mallars Vite-alias `../../dist` fortsätter matcha djupet som under `templates/<namn>`.
- **`scripts/write-dist-package-json.mjs`** + `pnpm run write-dist-package` — en källa till sanning för `dist/package.json` som CI använder vid `file:../../dist` (ersätter duplicerade heredocs).
- **`pnpm/action-setup@v3`** i alla `.github/workflows/*.yml` (tidigare blandat `@v2` / `@v4` i vissa jobb).
- **`reusable-build-vuesip-dist.yml`** — gemensam build + `vuesip-dist` artifact för deploy- och smoke-workflows.
- **`.pnpm-store/`** i `.gitignore`.

## Nästa steg (medel insats)

1. ~~**PR `test.yml` vs `templates-smoke.yml`**~~ **(gjort)**  
   `pnpm run smoke:templates` (`scripts/smoke-template-build.mjs --all`) bygger alla mallar mot en packad dist; PR-jobbet `template-smoke` i `test.yml` kör detta. Path-filtrerad `templates-smoke.yml` finns kvar för snabbare feedback när bara vissa paths ändras.

2. ~~**Dokumentation för utvecklare**~~ **(delvis)**  
   `AGENTS.md` beskriver repo-root `pnpm install` och `pnpm run smoke:templates`. Utöka vid behov i README/CONTRIBUTING när externa bidrägare tillkommer.

3. ~~**`pnpm/action-setup` repo-wide**~~ **(gjort)**  
   Alla GitHub Actions-workflows använder nu **`pnpm/action-setup@v3`** (tidigare `@v2` / `@v4` i bl.a. `security.yml`, `e2e-tests.yml`, `bundle-size.yml`, `publish.yml`, `enterprise-pack.yml`, `flaky-test-detector.yml`).

## Större refaktor

4. ~~**Återanvändbar workflow**~~ **(gjort)**  
   `.github/workflows/reusable-build-vuesip-dist.yml` — anropas från `deploy-templates.yml` och `templates-smoke.yml`. Andra workflows (t.ex. release) kan återanvända samma fil vid behov.

5. ~~**`.gitignore`**~~ **(gjort)**  
   **`.pnpm-store/`** ignoreras om pnpm skapar lokal store i repo-root.

6. ~~**pnpm catalog**~~ **(gjort)**  
   `pnpm-workspace.yaml` definierar **`catalog:`** för `vue`, `typescript`, `vite`, `vue-tsc`, `@vitejs/plugin-vue`; starter **templates/** använder `catalog:`. **`pnpm.overrides.vue`** finns kvar som säkerhetsnät. **examples/** kan fortfarande pinna Vite 5 separat.
