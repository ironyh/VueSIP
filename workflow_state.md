# Workflow State – Stream F (Error-handling and severity consistency)

## State

- State.Stream = F
- State.Owner = Agent 4
- State.Phase = BLUEPRINT
- State.Status = NEEDS_PLAN_APPROVAL
- State.UpdatedAt = 2026-02-25

## Plan

1. **Understand scope and existing docs**
   - Re-read `docs/plans/2026-02-25-codebase-improvements-multiagent.md` Stream F section.
   - Review `docs/guide/error-handling.md` and the `ErrorSeverity`/`logErrorWithContext` utilities in `src/utils/errorContext.ts`.
   - Confirm existing examples of EventBus-based error handling and how the plugin/hook system exposes error hooks in `docs/developer/architecture.md`.

2. **Design recommended application error-handling pattern (no code changes yet)**
   - Define the high-level pattern: app-level plugin or bootstrap code wires EventBus and hook-based error interception into UI toasts, telemetry, and logging.
   - Decide which events to highlight (e.g. `sip:disconnected`, `sip:registration_failed`, `call:failed`, `media:error`, generic error hook).
   - Specify how `logErrorWithContext` and `ErrorSeverity` fit: library logs structured errors; app subscribes to events and maps severity to user-facing actions.

3. **Update `docs/guide/error-handling.md` for F.1**
   - Add a new "Recommended application error-handling pattern" section near the top of the guide (after the introduction and before deep dives).
   - Document the pattern in prose: where to wire it (app initialization / plugin), which EventBus events/hooks to listen to, and how to route them to UI notifications and telemetry.
   - Include a minimal TypeScript/Vue snippet that:
     - Instantiates a VueSip EventBus or uses the provided one.
     - Registers centralized handlers for key SIP and media error events.
     - Shows how to call `logErrorWithContext` with `ErrorSeverity` in those handlers.
   - Ensure new content is consistent with existing sections on Event-based error handling and does not duplicate entire examples unnecessarily (link to later sections where appropriate).

4. **Link error-handling guide from developer docs**
   - In `docs/developer/README.md`, add an explicit bullet under "Additional Resources" or "Available Documentation" pointing to `../guide/error-handling.md` as the primary application error-handling guide.
   - Optionally add a short note or link in `docs/developer/architecture.md` under the "Plugin Architecture" or "Event System" sections directing readers to the error-handling guide's application pattern section.

5. **Define ErrorSeverity criteria for composables (prep for F.2)**
   - From `docs/guide/error-handling.md` and `src/utils/errorContext.ts`, summarize criteria for LOW/MEDIUM/HIGH/CRITICAL severities in the context of SIP operations.
   - Decide, in text, how to classify:
     - Call setup failures (e.g. `makeCall`, `answer`).
     - Call control failures (e.g. `hold`, `unhold`, `hangup`, `reject`).
     - Peripheral features (e.g. DTMF, transfers, media device enumeration).
   - Capture this mapping in a short note inside the plan and reuse it when auditing composables.

6. **Optional F.2: Severity audit in `useCallSession` and `useSipClient`**
   - In `src/composables/useCallSession.ts`, locate all `logErrorWithContext` calls and list their current `ErrorSeverity` values.
   - Compare each call site against the criteria from step 5; adjust the severity only where it is clearly misclassified (e.g. user-visible failures currently marked LOW).
   - Add a one-line comment at each updated severity site briefly explaining the choice (e.g. "HIGH: outgoing call failed and user cannot proceed").
   - Repeat the same process for `src/composables/useSipClient.ts` once logging is cleaned up by Stream A, keeping the audit strictly about severity, not about adding new logs.

7. **Verification and quality gates**
   - Run `pnpm run lint`.
   - Run `pnpm run typecheck`.
   - Run `pnpm run test:unit`.
   - If any failures are directly caused by Stream F changes, adjust docs or code accordingly and rerun until clean.

8. **Landing and tracking**
   - Use `bd` to either open or update the bead associated with Stream F, marking it in progress and then completed when all acceptance criteria are met.
   - Commit changes with a focused message (e.g. `docs: document error pattern and align severity`) including only files touched by Stream F.
   - Run `git pull --rebase`, `bd sync`, and `git push` per `AGENTS.md`, confirming the branch is up to date with origin.

## Log

- 2026-02-25: Initial Stream F plan drafted; awaiting user approval.
