# Repository Guidelines

## Project Structure & Module Organization

- `src/`: Library source (TypeScript, Vue 3). Key areas: `core/`, `adapters/`, `providers/`, `composables/`, `stores/`, `utils/`, `components/`.
- `tests/`: Vitest and Playwright suites — `unit/`, `integration/`, `performance/`, `e2e/`, `agents/` (scenario-heavy tests), plus `tests/setup.ts`.
- `examples/` and `playground/`: Minimal demo apps for manual testing.
- `docs/`: VitePress documentation; `dist/`: build output (do not edit).

## Build, Test, and Development Commands

- Dev server: `pnpm dev` (Vite at `http://localhost:5173`).
- Build library: `pnpm build` (outputs to `dist/`).
- Unit/integration tests: `pnpm test`, `pnpm test:unit`, `pnpm test:integration`.
- E2E (Playwright): `pnpm test:e2e`, UI mode `pnpm test:e2e:ui`, report `pnpm test:e2e:report`.
- Coverage: `pnpm coverage` (Vitest V8 coverage). Lint/format: `pnpm lint`, `pnpm lint:fix`, `pnpm format`.
- Type checks: `pnpm typecheck` (tsc), `pnpm type-check` (vue-tsc).

Requirements: Node >= 20, pnpm >= 9.

## Coding Style & Naming Conventions

- TypeScript + Vue 3 (composition-first). Functions/variables camelCase; components PascalCase; test files kebab/slug with `.test.ts` or `.spec.ts`.
- Prettier (.prettierrc): 2 spaces, single quotes, no semicolons, width 100.
- ESLint: Vue 3 + TypeScript rules; no unused vars (prefix with `_` to ignore). Run `pnpm lint` before PRs.

## Testing Guidelines

- Frameworks: Vitest (unit/integration) and Playwright (E2E). Place unit tests near domain (e.g., `tests/unit/SipClient.test.ts`).
- Naming: unit/integration `*.test.ts`; E2E `*.spec.ts`. Shared E2E utilities: `tests/e2e/fixtures.ts`, `selectors.ts`.
- E2E tip: navigate using `APP_URL` from `tests/e2e/fixtures.ts`; update visual baselines with `pnpm test:e2e:visual:update`.

## Commit & Pull Request Guidelines

- Commit style follows Conventional Commit-like prefixes found in history: `fix:`, `refactor:`, `chore:`, etc. Keep messages imperative and scoped.
- PRs must include: clear description, linked issue(s), testing notes (commands + results), and screenshots for UI/demo changes. Ensure `pnpm build`, `pnpm lint`, and key tests pass.

## Security & Configuration Tips

- Do not commit secrets or SIP credentials. Use mocks and test fixtures for E2E.
- Do not edit `dist/`; commit changes in `src/` and rebuild.
- Prefer environment-agnostic selectors and centralized `SELECTORS` in E2E to reduce flakiness.
