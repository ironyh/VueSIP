# Workflow State – Stream D1 (JsSipAdapter / JsSipCallSession)

## State

- State.Stream = D1
- State.Owner = Agent 5
- State.Phase = BLUEPRINT
- State.Status = NEEDS_PLAN_APPROVAL
- State.UpdatedAt = 2026-02-25

## Plan

1. **Reconfirm scope and existing implementation**
   - Re-read `docs/plans/2026-02-25-codebase-improvements-multiagent.md` Stream D section, focusing on D.1.
   - Review the current adapter architecture docs and types: `src/adapters/README.md`, `src/adapters/types.ts`, `src/adapters/jssip/JsSipAdapter.ts`, and `src/adapters/jssip/JsSipCallSession.ts`.
   - Scan `src/core/SipClient.ts` and `src/core/CallSession.ts` just enough to understand which responsibilities are intended to move into adapters in D2/D3, but do not refactor those core files as part of D1.

2. **Adapter/interface contract audit (`ISipAdapter` vs `JsSipAdapter`)**
   - Compare the `ISipAdapter` interface in `src/adapters/types.ts` with the public surface of `JsSipAdapter` (properties, methods, and events).
   - Identify any gaps or mismatches (e.g. missing methods, unused interface members, type/signature differences, inconsistent metadata such as version fields).
   - Decide and document the minimal, backwards-compatible code changes (if any) required in `JsSipAdapter` to fully honor the `ISipAdapter` contract without altering `SipClient` behavior.

3. **Call session contract audit (`ICallSession` vs `JsSipCallSession`)**
   - Compare `ICallSession` in `src/adapters/types.ts` with `JsSipCallSession` to ensure all required properties and methods are implemented with appropriate semantics.
   - Note where the legacy `CallSession` in `src/core/CallSession.ts` exposes additional data or behavior that should remain in core vs. move into adapter land in later phases (D2/D3).
   - Plan minimal D1 changes to `JsSipCallSession` (if needed) so it cleanly implements `ICallSession` while staying compatible with existing usage and tests.

4. **E2E / test-mode behavior decision for adapters**
   - Locate existing E2E/test-mode hooks (e.g. `window.__emitSipEvent`, EventBridge integration) in core (`SipClient`, `CallSession`) and confirm whether any such behavior already exists in adapter code.
   - Decide, in this plan, that D1 will keep E2E/mock behavior anchored in core (so that E2E paths continue to work unchanged), and only introduce adapter-level hooks if strictly necessary for future D2 refactors.
   - Document the chosen approach in this plan so Stream D2 knows exactly where to plug adapter usage into existing E2E/test-mode logic without breaking tests.

5. **Targeted D1 implementation adjustments (adapter-only)**
   - Apply any small, targeted adjustments identified in steps 2–4 to `JsSipAdapter` and/or `JsSipCallSession` (e.g. filling minor interface gaps, tightening types, polishing error handling or metadata) without changing core module APIs.
   - Keep all changes backward compatible with current `SipClient` and composables: no public API changes, no re‑wiring of core call flows, and no movement of responsibilities that are explicitly assigned to Stream D2.

6. **Testing and verification for adapter layer**
   - Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run test:unit` to verify that the adapter changes are type-safe, lint‑clean, and do not break existing tests that implicitly exercise JsSIP via `SipClient`.
   - If adapter-focused unit tests already exist, review which behaviors they cover and ensure any D1 changes keep them green; if they do not exist, identify 1–2 small, high‑value adapter tests that can be safely added later under Stream D3.

7. **Landing and coordination**
   - Keep all `SipClient` and `CallSession` refactoring out of scope for D1; treat those as Stream D2 responsibilities.
   - Once adapter-level changes are complete and quality gates are green, summarize the final `JsSipAdapter` / `JsSipCallSession` surface and E2E/test-mode expectations in a short note (either appended to `src/adapters/README.md` or captured for the D2/D3 streams).
   - Use `bd` to update the bead for Stream D1 as in progress and then completed, and land the work following `AGENTS.md` (commit with a focused message, `git pull --rebase`, `bd sync`, `git push`).

## Log

- 2026-02-25: Initial Stream D1 plan drafted by Agent 5; awaiting user approval.
