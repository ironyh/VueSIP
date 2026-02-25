# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

Use 'bd' for task tracking

## Cursor Cloud specific instructions

### Project overview

VueSIP is a headless Vue.js component library for SIP/VoIP applications (pnpm monorepo). No external databases or services are required for development — the playground and tests use mocked SIP servers.

### Key commands

All standard dev commands are in `package.json` scripts. Quick reference:

| Task                    | Command                                               |
| ----------------------- | ----------------------------------------------------- |
| Dev server (playground) | `pnpm dev` (serves on `:5173`)                        |
| Lint                    | `pnpm lint`                                           |
| Unit tests              | `pnpm test:unit` (193 files, ~5900 tests)             |
| Integration tests       | `pnpm test:integration` (11 files, 255 tests)         |
| E2E tests (Chromium)    | `pnpm test:e2e:chromium` (54 tests; auto-starts Vite) |
| Build library           | `pnpm build`                                          |
| Type check              | `pnpm typecheck`                                      |
| Docs dev server         | `pnpm docs:dev`                                       |

### Non-obvious caveats

- **E2E tests require Playwright Chromium**: Run `pnpm exec playwright install --with-deps chromium` once after `pnpm install` if browsers are missing. The update script handles this.
- **Build before typecheck**: `pnpm typecheck` uses `tsconfig.json` which may reference `dist/` output. Run `pnpm build` first if typecheck reports missing declarations.
- **E2E tests auto-start dev server**: `pnpm test:e2e` / `pnpm test:e2e:chromium` start their own Vite server; you do NOT need to run `pnpm dev` separately for E2E.
- **lint-staged + husky**: Pre-commit hook runs `lint-staged` (ESLint + Prettier on staged `.ts`/`.vue` files). This is already configured via `.husky/pre-commit`.
- **pnpm workspace**: `examples/*` and `templates/*` are workspace packages, but the core library development only needs the root `pnpm install`.
