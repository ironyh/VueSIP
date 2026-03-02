# Workflow State – Stream D1 (JsSipAdapter / JsSipCallSession)

## State – Stream D1 (JsSipAdapter / JsSipCallSession)

- State.Stream = D1
- State.Owner = Agent 5
- State.Phase = BLUEPRINT
- State.Status = NEEDS_PLAN_APPROVAL
- State.UpdatedAt = 2026-02-25

## Plan – Stream D1

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

## Log – Stream D1

- 2026-02-25: Initial Stream D1 plan drafted by Agent 5; awaiting user approval.

---

## State – VueSIP-dpi.5 (PBX recording documentation)

- State.Bead = VueSIP-dpi.5
- State.Owner = Agent (Cursor)
- State.Phase = BLUEPRINT
- State.Status = NEEDS_PLAN_APPROVAL
- State.UpdatedAt = 2026-03-02

## Plan – VueSIP-dpi.5

1. **Review current PBX recording docs and implementation**
   - Re-read `docs/plans/2026-02-pbx-recording-retrieval.md` to confirm dpi.5 scope and dependencies.
   - Review `docs/guide/recordings-retrieval-pbx.md` and `docs/composables-documented.md` to see what is already documented for `usePbxRecordings`, PBX recording types, and the FreePBX adapter.
   - Skim `src/types/pbx-recording.types.ts`, `src/pbx-adapters/freepbx.ts`, and `src/composables/usePbxRecordings.ts` (or equivalent) just enough to align docs with the current API and error-handling behavior.

2. **Design documentation structure**
   - Decide how to structure `docs/guide/recordings-retrieval-pbx.md` so it clearly separates:
     - A **user guide** for app developers using `usePbxRecordings` with the FreePBX adapter.
     - A **provider-author guide** for implementing new `PbxRecordingProvider` adapters.
   - Identify where to place the **security checklist**, **versioning policy** (additive-only in minor, breaking changes require major), and a concise **Definition of Done (DoD)** for future adapters.

3. **Implement user guide track**
   - Update the guide with a concrete `usePbxRecordings` usage example that wires a `createFreePbxRecordingProvider` instance into the composable and renders a recordings list with playback actions and basic error handling.
   - Document recommended UI patterns for paging, date filtering (when capabilities allow), unauthorized/expired playback handling, and same-origin vs backend-proxy auth choices, reusing the existing security section where possible.

4. **Implement provider-author guide track**
   - Add a provider-author section that explains how to implement a new `PbxRecordingProvider`:
     - Required and optional methods and capabilities.
     - How to map PBX-specific CDR/recording payloads to `RecordingSummary` and `RecordingPlaybackInfo`.
     - How to surface stable `PbxPlaybackErrorCode` values without leaking sensitive details.
   - Embed a **security checklist** (auth modes, token handling, logging hygiene, expiry behavior) and an explicit **versioning policy** for adapter contracts.
   - Capture a short **DoD checklist** for future adapters that mirrors the bead’s acceptance criteria (types aligned, capabilities reported, tests/fixtures in place, docs updated).

5. **Cross-links and API parity**
   - Ensure `docs/composables-documented.md` and any relevant API docs reference the updated guide and clearly label `usePbxRecordings` as the primary entrypoint for PBX recording retrieval.
   - Add or update cross-links from `docs/guide/index.md`, `docs/adapters/README.md`, or similar navigation so that both app developers and adapter authors can find the new content.

6. **Verification and landing**
   - Run `pnpm run lint`, `pnpm run test:unit`, and any docs build or link-check command used in this repo (e.g. `pnpm run docs:build` if present) to ensure the new documentation does not break the site or tests.
   - Update bead `VueSIP-dpi.5` via `bd` to in_progress/closed as appropriate, then commit the changes with a focused message and land them according to `AGENTS.md` (`git pull --rebase`, `bd sync`, `git push`).

## Log – VueSIP-dpi.5

- 2026-03-02: Initial documentation plan drafted for PBX recording retrieval (user + provider-author guides); ready to execute.
