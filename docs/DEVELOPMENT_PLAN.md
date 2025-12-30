# Unified Development Plan

This document aligns core development workflows around pnpm and defines a logical, fast feedback loop for smarter building.

## Core Workflows

- Lint: `pnpm lint` (auto-fix: `pnpm lint:fix`)
- TypeScript: `pnpm typecheck` and Vue SFC types: `pnpm type-check`
- Tests: `pnpm test` (unit/integration); E2E: `pnpm test:e2e`, UI: `pnpm test:e2e:ui`, report: `pnpm test:e2e:report`, visuals: `pnpm test:e2e:visual:update`
- Coverage: `pnpm coverage` (and `pnpm coverage:unit` if needed)
- Dev server: `pnpm dev` (http://localhost:5173)
- Build: `pnpm build`

## Smarter Build Order

1. Lint fast: `pnpm lint` (fail fast on syntax/style)
2. Types next: `pnpm typecheck && pnpm type-check`
3. Run unit tests: `pnpm test:unit`
4. Run integration tests: `pnpm test:integration`
5. Build: `pnpm build`
6. Run E2E when UI/workflow changes: `pnpm test:e2e`
7. Coverage gates (optional): `pnpm coverage`

Rationale: cheapest checks first (lint, types) → targeted tests → broader tests → build and E2E. This shortens iteration time and reduces noisy failures late in the cycle.

## Pre-Commit Checklist

- `pnpm lint` shows 0 errors (warnings OK unless policy requires 0)
- `pnpm typecheck && pnpm type-check` pass
- Local tests relevant to the change pass (`pnpm test:unit` and/or `pnpm test:integration`)

Optional (for larger changes):

- `pnpm build` to ensure no build regressions
- `pnpm test:e2e` for UI flows touched by the change

## CI Pass Gate (recommended)

- Lint: `pnpm lint`
- Types: `pnpm typecheck && pnpm type-check`
- Tests: `pnpm test`
- Coverage threshold: `pnpm coverage` (e.g., branches ≥ 75%)
- Build: `pnpm build`

## Error Handling Guidance

- Prefer guard clauses and typed returns over throwing in composables to avoid UI crashes.
- If throwing is necessary, use consistent error types and add unit tests for thrown paths.
- Keep reactivity intact: avoid replacing refs/computed with plain locals.

## E2E Guidelines

- Navigate via shared fixtures and selectors; use `pnpm test:e2e`.
- Visual updates: `pnpm test:e2e:visual:update` when intentional UI changes occur.
- Use environment-agnostic selectors; centralize in selectors utilities.

## Command Cheat Sheet

- Lint quick fix: `pnpm lint:fix`
- Full validation: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- Focus a unit test file: `pnpm test -- tests/unit/SomeFile.test.ts`
- Run Playwright UI: `pnpm test:e2e:ui`

## Related Docs

- `docs/hive-mind/coder-preparation.md`
- `docs/CI_FIX_PLAN.md`
- `docs/PHASE_3_MIGRATION_ROADMAP.md`
- `docs/PHASE_3_WEEK_1_EXECUTION_PLAN.md`
