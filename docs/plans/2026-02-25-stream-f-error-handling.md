# Stream F – Error Handling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Document the recommended application-level error-handling pattern for VueSip apps and optionally align `ErrorSeverity` usage in key composables.

**Architecture:** Only documentation and composables are touched. Runtime behavior stays the same except for clearer severity metadata in `logErrorWithContext` calls. Public APIs remain unchanged; we reuse existing EventBus, plugin/hook system, and `errorContext` utilities.

**Tech Stack:** VitePress Markdown docs under `docs/guide` and `docs/developer`, Vue 3 + TypeScript composables under `src/composables`, and pnpm scripts (`pnpm run lint`, `pnpm run typecheck`, `pnpm run test:unit`).

---

## Task 1: Confirm scope and existing error utilities

**Files:**

- Read: `docs/plans/2026-02-25-codebase-improvements-multiagent.md` (Stream F section)
- Read: `docs/guide/error-handling.md`
- Read: `src/utils/errorContext.ts`
- Read: `docs/developer/architecture.md` (Event system + plugin architecture)

**Steps:**

1. Open and skim the Stream F section in the multi-agent plan to reconfirm allowed files and acceptance criteria.
2. Review `docs/guide/error-handling.md` to understand existing sections on EventBus-based error handling and ErrorSeverity guidance.
3. Review `src/utils/errorContext.ts` to see the `ErrorSeverity` enum, `createErrorContext`, and `logErrorWithContext` signatures and examples.
4. Skim `docs/developer/architecture.md` for how the plugin and hook systems, as well as the EventBus, are documented today.

**Verification:** No code or docs are modified in this task; it is purely context gathering.

---

## Task 2: Design the recommended application error-handling pattern (blueprint only)

**Files:**

- Plan only (no file changes yet)

**Steps:**

1. Based on Task 1, write down a short internal description of the desired pattern:
   - Where app code should hook into errors (plugin/hook system, EventBus listeners).
   - Which core events should be handled centrally (e.g. `sip:disconnected`, `sip:registration_failed`, `call:failed`, `media:error`).
   - How severities map to actions (LOW = log only, MEDIUM = toast + telemetry, HIGH/CRITICAL = prominent UI and alerting).
2. Decide on a minimal but realistic code example that wires these pieces together in an app bootstrap or plugin.
3. Keep this design ready to translate directly into documentation in Task 3.

**Verification:** Pattern is captured in this plan and will be reflected in the new section added to `docs/guide/error-handling.md`.

---

## Task 3: Update `docs/guide/error-handling.md` with the application pattern (F.1)

**Files:**

- Modify: `docs/guide/error-handling.md`

**Steps:**

1. Choose an insertion point near the top of the guide (e.g. after the introduction / table of contents but before deep-dive sections) for a new section titled something like "Recommended Application Error-Handling Pattern".
2. Add a concise subsection that:
   - Explains that the app should centralize error handling using VueSip's EventBus and/or plugin hook system.
   - Lists the key categories of events to listen for (connection, registration, call, media, generic error events).
   - Describes how `ErrorSeverity` influences user-facing behavior (e.g. MEDIUM/HIGH/CRITICAL escalate from toast → modal → hard error screen).
3. Add a minimal code sample that:
   - Runs during app initialization (e.g. in `main.ts` or a custom plugin).
   - Subscribes to several representative events (e.g. `sip:registration_failed`, `call:failed`, `media:error`).
   - Uses `logErrorWithContext` with appropriate `ErrorSeverity` values when logging errors.
   - Maps events to UI notifications and optional telemetry hooks.
4. Where the guide already covers Event-based error handling and ErrorSeverity in detail, reference those sections instead of duplicating full examples (e.g. "see [Event-Based Error Handling](#event-based-error-handling)").

**Verification:**

- New section renders correctly in Markdown.
- Section clearly mentions `logErrorWithContext` and `ErrorSeverity` as the preferred library-side logging primitives.

---

## Task 4: Link the error-handling guide from developer docs (F.1 acceptance)

**Files:**

- Modify: `docs/developer/README.md`
- Optional: `docs/developer/architecture.md`

**Steps:**

1. In `docs/developer/README.md`, add an explicit bullet under "Available Documentation" or "Additional Resources" linking to `../guide/error-handling.md` (e.g. "Error Handling Guide – application-level patterns and utilities").
2. Optionally, in `docs/developer/architecture.md`, under either the "Plugin Architecture" or "Event System" section, add a short sentence that points readers to the Error Handling Guide for the recommended way to wire events and hooks into application-level error handling.

**Verification:**

- Error Handling Guide is discoverable from developer docs.
- Links work when navigating the docs.

---

## Task 5: Define ErrorSeverity criteria for composables (prep for F.2)

**Files:**

- Plan only + optional comments in `src/utils/errorContext.ts` if needed

**Steps:**

1. From `docs/guide/error-handling.md` and `src/utils/errorContext.ts`, restate clear criteria in this plan for when to use:
   - `ErrorSeverity.LOW` (informational or minor, no direct user impact).
   - `ErrorSeverity.MEDIUM` (noticeable degradation, but core call capability still works).
   - `ErrorSeverity.HIGH` (primary user operation failed, user cannot proceed without intervention).
   - `ErrorSeverity.CRITICAL` (system instability or data corruption, app likely needs restart / hard failure UI).
2. Translate those criteria into a small mapping specific to SIP composables, for example:
   - Call setup failures (`makeCall`, `answer`, registration) → HIGH.
   - Call control issues (`hold`, `unhold`, `hangup`, `reject`) → MEDIUM unless they indicate a deeper systemic problem.
   - Secondary features (DTMF, device enumeration, call transfer) → LOW or MEDIUM based on how central they are in typical flows.
3. Capture this mapping in the plan (and optionally as comments in `errorContext.ts` if it improves clarity without being redundant with docs).

**Verification:**

- Criteria are explicit enough to apply consistently when auditing composables.

---

## Task 6 (Optional F.2): Severity audit in `useCallSession` and `useSipClient`

**Files:**

- Modify: `src/composables/useCallSession.ts`
- Modify: `src/composables/useSipClient.ts`

**Steps:**

1. In `useCallSession.ts`, enumerate all `logErrorWithContext` call sites and record their current `ErrorSeverity` values by operation (e.g. makeCall, answer, reject, hangup, hold, unhold, sendDTMF, transferCall).
2. For each site, compare the existing severity against the criteria from Task 5:
   - If the current severity already matches (e.g. `makeCall` failures at HIGH, DTMF at LOW), leave it as-is.
   - If clearly misclassified (e.g. user-blocking failure marked LOW), adjust to the appropriate level.
3. At every site where you change a severity, add a one-line inline comment justifying the level (e.g. `// HIGH: outgoing call failed, user cannot place call`).
4. Repeat the same enumeration and adjustment process for `useSipClient.ts`, respecting boundaries from other streams (do not change logging structure or E2E behavior, only severity arguments).

**Verification:**

- All `logErrorWithContext` sites in these composables use severity values consistent with the documented criteria.
- Each changed site has a concise comment explaining the choice.
- No functional behavior (control flow, thrown errors, events) is altered.

---

## Task 7: Run quality gates

**Files:**

- Entire project (no direct edits)

**Steps:**

1. Run `pnpm run lint` from the project root and ensure it passes.
2. Run `pnpm run typecheck` and ensure there are no new TypeScript errors.
3. Run `pnpm run test:unit` and confirm all relevant unit tests pass.
4. If any failures are due to the new Stream F changes, fix the underlying issue (docs build, TypeScript types, or composable code) and rerun the affected commands until they pass.

**Verification:**

- All three commands succeed without new errors introduced by Stream F.

---

## Task 8: Land changes and update tracking

**Files:**

- Version control and bead tracking only

**Steps:**

1. Use `bd` to either create or update the bead that tracks Stream F, marking its status from "ready" or "in_progress" to "completed" once Tasks 3–7 are done.
2. Stage changes with `git add` for only the files touched by Stream F:
   - `docs/guide/error-handling.md`
   - `docs/developer/README.md`
   - Optional: `docs/developer/architecture.md`
   - Optional: `src/composables/useCallSession.ts`
   - Optional: `src/composables/useSipClient.ts`
3. Commit with a focused message, e.g. `docs: document error pattern and align severity`.
4. Follow `AGENTS.md` landing steps:
   - `git pull --rebase`
   - `bd sync`
   - `git push`
5. Confirm `git status` reports the branch is up to date with origin.

**Verification:**

- Bead for Stream F is closed or marked as completed.
- All changes are committed and pushed; working tree is clean.
