# Contributing to VueSip

Thanks for helping improve VueSip. This repo is a **pnpm workspace**: always install and run commands from the **repository root** unless you are intentionally working inside a single template folder.

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (see `packageManager` in root `package.json`). Enable via [Corepack](https://nodejs.org/api/corepack.html): `corepack enable`

## Setup

```bash
git clone https://github.com/ironyh/VueSIP.git
cd VueSIP
pnpm install
```

Root `pnpm install` applies workspace config and `pnpm.overrides` (including a single **Vue** resolution for the library and templates).

## Common commands

| Command                    | Purpose                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm run build`           | Build the library (`dist/`)                                                          |
| `pnpm run typecheck`       | TypeScript check (library)                                                           |
| `pnpm run lint`            | ESLint                                                                               |
| `pnpm run test:unit`       | Unit tests                                                                           |
| `pnpm run smoke:templates` | Pack library and build **all** starter templates (CI parity; can take a few minutes) |
| `pnpm run docs:build`      | VitePress docs                                                                       |

E2E: `pnpm run test:e2e` (requires Playwright browsers: `pnpm exec playwright install`).

## Pull requests

1. Branch from `main` (or `develop` if your team uses it for integration).
2. Keep changes focused; match existing style and types.
3. Run at least: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test:unit`.
4. If you touch **templates**, `src/`, or **dependencies**, run `pnpm run smoke:templates` before pushing when practical.

CI runs tests, template smoke, and (on relevant paths) E2E — see `.github/workflows/`.

## Agents and issue tracking

Maintainers using **bd** (beads): see [AGENTS.md](AGENTS.md).

## Releasing (maintainers)

See [RELEASING.md](RELEASING.md) for npm publish and GitHub Releases.

## Examples vs templates

Under `examples/`, some packages still use **Vite 5** explicitly. Starter **templates/** use the shared **pnpm catalog** for Vue, Vite, TypeScript, and `vue-tsc` (see `pnpm-workspace.yaml`). When in doubt, align new template work with the catalog versions.
