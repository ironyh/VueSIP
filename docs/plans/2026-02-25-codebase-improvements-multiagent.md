# Codebase Improvements – Multi-Agent Implementation Plan

> **For agents:** Implement only the **stream** you are assigned. Do not modify files outside your stream's file list unless the plan explicitly says "coordinate with Stream X." Run quality gates (lint, typecheck, tests) before considering your stream complete. Follow AGENTS.md for landing (bd, git push).

**Goal:** Implement the improvement opportunities from the codebase audit (diagnostic logging, E2E isolation, EventBus typing, docs/API parity, error-handling docs, adapter/docs alignment) in parallel via independent work streams.

**Architecture:** Six streams (A–F) with minimal cross-dependencies. Streams A, C, E, F can run fully in parallel. Stream B can run in parallel with A/C/E/F. Stream D is split into D1→D2→D3; D1 and D2 can run in parallel with all others once D1 is done.

**Tech stack:** Vue 3, TypeScript, Vitest, existing VueSIP logger/EventBus/adapters.

**Reference:** Audit findings summarized in this repo (conversation context or handoff doc). Adapter architecture: `src/adapters/README.md`. Developer docs: `docs/developer/README.md`.

---

## Dependency overview

```
Stream A (logging)     ──────────────────────────────────────────►  (no deps)
Stream B (E2E isolate) ──────────────────────────────────────────►  (no deps)
Stream C (EventBus)    ──────────────────────────────────────────►  (no deps)
Stream D1 (adapter)    ──────────────────────────────────────────►  (no deps)
Stream D2 (SipClient)  ◄── depends on D1 (use JsSipAdapter)
Stream D3 (tests/docs) ◄── depends on D1 (optional: D2)
Stream E (API parity)  ──────────────────────────────────────────►  (no deps)
Stream F (error docs)  ──────────────────────────────────────────►  (no deps)
```

**Safe to run in parallel:** A, B, C, E, F, and D1. After D1 is merged, D2 and D3.

---

## Stream A: Diagnostic logging cleanup

**Owner:** Agent A  
**Scope:** Replace unconditional `console.log` with `createLogger(...).debug()` (or remove). Rely on existing `setLogLevel` so production builds stay quiet.

### A.1 – Core: SipClient.ts

**Files:** `src/core/SipClient.ts`

**Tasks:**

1. Add at top (if not present): `const logger = createLogger('SipClient')`.
2. Replace every `console.log(...)` with `logger.debug(...)`. Preserve message content; remove only pure diagnostics (e.g. "E2E detection in start()", "Connection state CHANGED").
3. Replace every `console.error(...)` in this file with `logger.error(...)`.
4. Do not remove any E2E/test logic (e.g. `__emitSipEvent`, mock RTCSession); only change how it is logged.
5. Ensure no remaining `console.log` or `console.error` in this file.

**Acceptance:** `pnpm run lint` and `pnpm run typecheck` pass; `grep -n "console\." src/core/SipClient.ts` returns no matches.

### A.2 – Core: CallSession.ts

**Files:** `src/core/CallSession.ts`

**Tasks:**

1. Replace `console.log` in `setupEventHandlers()` (and anywhere else) with `logger.debug(...)` (logger already exists in file).
2. Remove or convert any `console.log` used for "CONFIRMED EVENT RECEIVED" / state debugging to `logger.debug`.
3. Ensure no remaining `console.log`/`console.error` in this file.

**Acceptance:** Lint/typecheck pass; no `console.*` in `src/core/CallSession.ts`.

### A.3 – Composables: useSipClient.ts

**Files:** `src/composables/useSipClient.ts`

**Tasks:**

1. Replace all `console.log` (e.g. EventBus initialization, "sip:connected RECEIVED", "Manual sync", "\_\_sipListenersReady") with `logger.debug(...)`.
2. Keep behavior identical; only logging mechanism changes.
3. Remove any `console.log` that only duplicates what `logger` already logs at same level.

**Acceptance:** Lint/typecheck pass; no `console.*` in `src/composables/useSipClient.ts`.

### A.4 – Composables: useCallSession.ts

**Files:** `src/composables/useCallSession.ts`

**Tasks:**

1. Replace all `console.log` / `console.error` (e.g. makeCall STARTING/COMPLETED/FAILED, session cleared, media acquired) with `log.debug(...)` or `log.error(...)` (composable already has `log`).
2. Ensure no remaining `console.*` in this file.

**Acceptance:** Lint/typecheck pass; no `console.*` in `src/composables/useCallSession.ts`.

### A.5 – Verification

Run once after A.1–A.4:

- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test:unit` (or a relevant subset)
- Optional: run E2E smoke test to ensure E2E paths still work (logs may be quieter).

**Stream A done when:** All A.1–A.5 acceptance criteria met and changes pushed.

---

## Stream B: E2E / EventBridge isolation

**Owner:** Agent B  
**Scope:** Extract E2E/EventBridge detection and simulation into a dedicated module; have SipClient and composables call into it. Single place for "test mode" detection.

### B.1 – New E2E helper module

**Files:** Create `src/testing/e2eHarness.ts` (or `src/e2e/harness.ts` if you prefer a flatter name).

**Tasks:**

1. Add a new module that:
   - Exports `isE2EMode(): boolean` – true when `typeof window !== 'undefined'` and (`window.__emitSipEvent === 'function'` or `window.__sipEventBridge` is defined). Move logic from current `SipClient`/composables into this.
   - Exports `getE2EEmit(): ((event: string, data?: unknown) => void) | null` – returns `window.__emitSipEvent` if function, else null.
   - Exports `getEventBridge(): EventBus | undefined` – returns `window.__sipEventBridge` if defined.
   - Document that this module is for E2E/test harness only; production behavior is unchanged.
2. Do not change any EventBus or SipClient API surface; only the place where "are we in E2E?" and "where do we emit for tests?" are answered.

**Acceptance:** New file exists; no other files modified yet; `pnpm run typecheck` passes.

### B.2 – SipClient uses E2E helper

**Files:** `src/core/SipClient.ts`

**Tasks:**

1. Replace inline E2E detection (e.g. `typeof (window as ...).__emitSipEvent === 'function'`) with imports from the new E2E helper. Call `isE2EMode()`, `getE2EEmit()`, `getEventBridge()` instead of repeating window checks.
2. Keep all existing E2E behavior (mock RTCSession, simulated events, etc.); only centralize detection and emit access.
3. Remove duplicate comments that repeated "E2E detection" logic; one comment referencing the helper is enough.

**Acceptance:** SipClient still passes existing E2E tests; typecheck and lint pass.

### B.3 – useSipClient uses E2E helper

**Files:** `src/composables/useSipClient.ts`

**Tasks:**

1. Replace any `window.__sipEventBridge` / `window.__emitSipEvent` / `__sipListenersReady` checks with calls to the new E2E helper where it makes sense (e.g. EventBus selection can stay as-is, but "are we in test mode?" can use `isE2EMode()` for logging or guards).
2. Prefer minimal change: only use the helper for detection so that future changes to "what is E2E?" happen in one file.

**Acceptance:** Lint/typecheck pass; E2E tests that rely on useSipClient still pass.

### B.4 – Optional: document test mode

**Files:** `docs/developer/architecture.md` or `tests/e2e/README.md`

**Tasks:**

1. Add a short subsection or note: "E2E test mode is determined by `src/testing/e2eHarness.ts` (or equivalent). Playwright/integration tests set `window.__sipEventBridge` / `__emitSipEvent` so the app can be driven and asserted on."

**Stream B done when:** B.1–B.3 (and optionally B.4) complete; E2E smoke still green; changes pushed.

---

## Stream C: EventBus typing and narrowing `any`

**Owner:** Agent C  
**Scope:** Introduce a typed EventBus surface for the most-used SIP events; narrow composable parameters from `any` to concrete types where easy.

### C.1 – Typed event map (source of truth)

**Files:** `src/types/event-names.ts` and/or `src/types/events.types.ts`

**Tasks:**

1. Define a single type map, e.g. `SipEventPayloadMap`, that maps event names to payload types (e.g. `'sip:connected'` → `void`, `'sip:disconnected'` → `{ error?: string }`, `'sip:registered'` → `{ uri: string; expires?: number }`, `'sip:new_session'` → `{ originator?: string; callId?: string; ... }`). Use existing types from `events.types.ts` where they exist.
2. Export a union of SIP event names that are part of this map (e.g. `SipEventName`).
3. Document that new SIP events should add an entry to this map so EventBus can stay typed.

**Acceptance:** Types compile; no behavior change yet.

### C.2 – Typed EventBus interface (optional wrapper)

**Files:** `src/core/EventBus.ts` or new `src/core/TypedEventBus.ts`

**Tasks:**

1. Either extend the existing EventBus or add a thin wrapper that exposes:
   - `on<K extends keyof SipEventPayloadMap>(event: K, handler: (payload: SipEventPayloadMap[K]) => string): string`
   - Same for `off`, `emit` if you add a typed emit.
2. Goal: composables that currently do `eventBus.on('sip:new_session' as any, (event: any) => ...)` can do `eventBus.on('sip:new_session', (event) => ...)` with `event` typed.
3. Keep backward compatibility: existing untyped `on(event: string, ...)` can remain if the current EventBus is used widely with string events.

**Acceptance:** At least one composable (e.g. useCallSession or useSipE911) is updated to use the typed `on` for `sip:new_session`; no `as any` for that event; typecheck passes.

### C.3 – Narrow composable `any` (discrete files)

**Files:**

- `src/composables/useSipDtmf.ts` – change `Ref<any | null>` to `Ref<CallSession | null>` (or the interface type from `call.types`) if the composable only needs session methods.
- `src/composables/useDialog.ts` – replace `(data: any)` with a type from events.types or a local interface for dialog NOTIFY payloads.
- `src/providers/SipClientProvider.ts` – replace `(data?: any)` in event handlers with the correct payload type from the new event map.

**Tasks:**

1. For each file, replace the minimal set of `any` with the correct type; add eslint-disable only where truly necessary (e.g. JsSIP internal).
2. Prefer types from `src/types/events.types.ts` or the new `SipEventPayloadMap`.

**Acceptance:** Lint and typecheck pass; no new `any` unless justified in a comment.

**Stream C done when:** C.1–C.3 complete; tests pass; changes pushed.

---

## Stream D: Adapter architecture (Phase 2/3)

**Owner:** Agent D (or D1/D2/D3 split across agents)  
**Scope:** Extract JsSIP-specific code from SipClient into JsSipAdapter/JsSipCallSession; refactor SipClient to use ISipAdapter; update tests and docs.

**Dependency:** D2 and D3 depend on D1. D1 has no dependencies on other streams.

### D.1 – JsSipAdapter and JsSipCallSession (implement / complete)

**Files:**

- `src/adapters/jssip/JsSipAdapter.ts`
- `src/adapters/jssip/JsSipCallSession.ts`
- `src/adapters/types.ts` (ensure ISipAdapter / ICallSession match)

**Tasks:**

1. Ensure `JsSipAdapter` implements `ISipAdapter` (from `src/adapters/types.ts` or equivalent): initialize, connect, disconnect, register, unregister, call, getActiveCalls, destroy. Move JsSIP UA creation, WebSocket, and registration logic from `SipClient` into `JsSipAdapter`.
2. Ensure `JsSipCallSession` implements `ICallSession` and wraps a JsSIP RTCSession. Move call lifecycle (answer, reject, hangup, hold, mute, DTMF, transfer) from `CallSession` into this adapter session class, or keep `CallSession` as the public class and have it delegate to an adapter session – whichever matches the existing `src/adapters/README.md` design.
3. E2E mock behavior: either keep it in SipClient for now or move it into JsSipAdapter behind a "test mode" so that D2 can switch SipClient to "use JsSipAdapter" without breaking E2E.
4. All existing unit tests for SIP connection and calls that currently target SipClient should pass against JsSipAdapter (or SipClient using JsSipAdapter) by the end of D2.

**Acceptance:** JsSipAdapter can connect, register, and place a call; JsSipCallSession (or equivalent) handles answer/hangup/hold/mute/DTMF; typecheck and lint pass; existing tests updated if they target SipClient internals.

### D.2 – SipClient uses ISipAdapter

**Files:** `src/core/SipClient.ts`

**Tasks:**

1. Refactor SipClient to hold an `ISipAdapter` (created as JsSipAdapter by default) instead of directly holding JsSIP UA.
2. Delegate start/stop/register/unregister/call to the adapter. Keep the same public API (e.g. `start()`, `stop()`, `register()`, `call(target, options)`).
3. Keep EventBus emission in SipClient (or in the adapter with EventBus passed in – match existing event flow). Ensure events like `sip:connected`, `sip:registered`, `sip:new_session` still fire so composables and E2E tests do not break.
4. Preserve E2E behavior: if E2E mock is in SipClient, keep it; if moved to JsSipAdapter, ensure SipClient still uses the adapter in a way that E2E tests can still inject or detect mock.

**Acceptance:** All SipClient-level and composable-level tests pass; E2E smoke passes; no change to public API of SipClient or composables.

### D.3 – Tests and docs for adapter

**Files:**

- `tests/unit/adapters/` (add or extend tests for JsSipAdapter / JsSipCallSession)
- `src/adapters/README.md`
- `README.md` (optional: short line under Architecture)

**Tasks:**

1. Add or extend unit tests for JsSipAdapter: connect, register, call, getActiveCalls (mock JsSIP UA).
2. Update `src/adapters/README.md` status: mark JsSIP adapter as "Implemented" and Phase 2/3 as done; Phase 4 (SIP.js) still planned.
3. Optionally add one sentence to main README: "SIP is accessed via an adapter (JsSIP implemented; SIP.js planned)."

**Acceptance:** New or updated tests pass; adapter README and main README reflect current state; changes pushed.

**Stream D done when:** D.1, D.2, and D.3 are complete and merged. D1 and D2 can be separate PRs if needed.

---

## Stream E: Public API and docs parity

**Owner:** Agent E  
**Scope:** Script to check exported composables vs docs; tag experimental APIs in JSDoc; small README/table fixes.

### E.1 – Export parity script

**Files:** Create `scripts/check-exports.ts` (or `.mjs`).

**Tasks:**

1. Script reads:
   - Exports from `src/index.ts` (or `src/composables/index.ts`) – e.g. by parsing or by loading the built package and reading `Object.keys(require('vuesip')` or equivalent.
   - A list of composable names that the docs claim (e.g. from README or a small JSON/markdown list in `docs/`).
2. Script reports:
   - Exported but not documented.
   - Documented but not exported.
3. Add `pnpm run check:exports` (or `docs:check-exports`) in `package.json` that runs this script. Prefer no runtime dependency on the built bundle (e.g. use static analysis or a simple re-export list file).

**Acceptance:** Running the script produces a clear diff/list; CI can run it (optional to fail the build on mismatch).

### E.2 – Tag experimental / preview APIs

**Files:** `src/index.ts`, `src/codecs/index.ts`, any module that exports "preview" or "experimental" features.

**Tasks:**

1. In JSDoc for codecs export and any other preview surface, add `@experimental` or `@remarks This API is preview and may change.`
2. In README or docs table, add a note (e.g. "Codecs: preview") so users know which composables are stable vs preview.

**Acceptance:** JSDoc and README clearly mark experimental/preview exports.

### E.3 – README and adapter status alignment

**Files:** `README.md`, `src/adapters/README.md`

**Tasks:**

1. In README "Features" or "Architecture", ensure the line about "JsSIP or SIP.js adapters" is accurate (e.g. "JsSIP adapter implemented; SIP.js planned").
2. In `src/adapters/README.md`, ensure "Adapter Implementation Status" and "Implementation Roadmap" match current code (e.g. JsSIP done, SIP.js planned).

**Stream E done when:** E.1–E.3 done; script runs; docs aligned; changes pushed.

---

## Stream F: Error-handling and severity consistency

**Owner:** Agent F  
**Scope:** Document recommended error/hook pattern for apps; optionally align ErrorSeverity usage in a few high-impact composables.

### F.1 – Document error notification pattern

**Files:** `docs/guide/` (new or existing) – e.g. `docs/guide/error-handling.md` or a section in `docs/developer/architecture.md`.

**Tasks:**

1. Add a short section: "Recommended error handling for applications."
2. Content: use VueSip's plugin/hook system or EventBus to listen for `sip:error` / `registration_failed` / call failures; map to app-level toasts, telemetry, or logging. Include a minimal code sample (e.g. register a plugin that logs or shows a toast on error).
3. Mention `logErrorWithContext` and `ErrorSeverity` for library-side logging.

**Acceptance:** Doc exists and is linked from developer README or architecture.

### F.2 – Optional: severity audit in composables

**Files:** `src/composables/useCallSession.ts`, `src/composables/useSipClient.ts`

**Tasks:**

1. Review calls to `logErrorWithContext(..., ErrorSeverity.XXX)`: ensure "user-facing" failures (e.g. makeCall failed, answer failed, registration failed) use HIGH or CRITICAL; internal or recoverable use MEDIUM/LOW.
2. Change only severity levels where clearly wrong; add a one-line comment where you set severity explaining why.

**Acceptance:** No behavior change; only clearer severity and a short comment; lint/typecheck pass.

**Stream F done when:** F.1 (and optionally F.2) complete; changes pushed.

---

## Coordination and merge order

- **No merge order required** for A, B, C, E, F relative to each other. Merge in any order.
- **D:** Merge D1 first, then D2, then D3 (or D1+D2 together, then D3).
- If two agents touch the same file (e.g. both A and B touch `SipClient.ts`), assign the file to one stream only. Recommendation: **Stream A** owns logging changes in `SipClient.ts`; **Stream B** owns E2E helper usage in `SipClient.ts` – so either A finishes SipClient first and B then adds the E2E helper calls, or B does B.1 first and then A and B both edit SipClient (A: logging, B: E2E import). To avoid conflicts, prefer **A before B** for `SipClient.ts`: complete Stream A first, then Stream B updates SipClient to use the E2E helper.
- **Quality gates (all streams):** Before marking done, run: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test:unit`. If the project has E2E smoke, run it for streams that touch SIP core (A, B, D).

---

## Agent assignment summary

| Stream | Description                     | Suggested agent | Can run in parallel with                  |
| ------ | ------------------------------- | --------------- | ----------------------------------------- |
| A      | Diagnostic logging cleanup      | Agent 1         | B, C, E, F, D1                            |
| B      | E2E/EventBridge isolation       | Agent 2         | A, C, E, F, D1 (do after A for SipClient) |
| C      | EventBus typing, narrow any     | Agent 3         | A, B, E, F, D1                            |
| D1     | JsSipAdapter / JsSipCallSession | Agent 4         | A, B, C, E, F                             |
| D2     | SipClient uses adapter          | Agent 5         | After D1                                  |
| D3     | Adapter tests and docs          | Agent 5 or 6    | After D1 (or D2)                          |
| E      | API parity script and docs      | Agent 6         | A, B, C, F, D1                            |
| F      | Error-handling docs             | Agent 7         | A, B, C, E, D1                            |

Run A first if you want to avoid SipClient merge conflicts with B; then run B, C, E, F, D1 in parallel. After D1 is merged, run D2 and D3.
