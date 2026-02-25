# Multi-Agent Start Prompts – Codebase Improvements

Use the prompts below to start agents on **docs/plans/2026-02-25-codebase-improvements-multiagent.md**. Each prompt is self-contained so you can paste it into a new agent (or Cursor composer) and run multiple agents in parallel.

---

## Master prompt (start here)

Copy-paste this into a **single** agent to get the full picture and then spawn or hand off work, **or** use it to brief yourself before starting multiple agents with the stream-specific prompts below.

```
We are implementing the VueSIP codebase improvement plan in parallel using multiple agents.

**Plan:** docs/plans/2026-02-25-codebase-improvements-multiagent.md
**Stream-specific prompts:** docs/plans/2026-02-25-multiagent-agent-prompts.md

**Work streams:**
- **Stream A** – Diagnostic logging cleanup (SipClient, CallSession, useSipClient, useCallSession). Safe to run first.
- **Stream B** – E2E/EventBridge isolation (new e2eHarness module; SipClient/useSipClient use it). Run after A to avoid SipClient conflicts.
- **Stream C** – EventBus typing and narrowing any (event payload map, typed on/off, composable types).
- **Stream D** – Adapter architecture: D1 = JsSipAdapter/JsSipCallSession, D2 = SipClient uses adapter (after D1), D3 = adapter tests/docs.
- **Stream E** – Public API parity script, experimental tags, README/adapter status.
- **Stream F** – Error-handling docs and optional ErrorSeverity audit.

**Parallelism:** Run A, C, E, F, and D1 in parallel. After A is done, run B. After D1 is merged, run D2 and D3.

**Your job:** [Choose one:]
1. Implement Stream [A|B|C|D1|D2|D3|E|F] using the exact prompt for that stream in docs/plans/2026-02-25-multiagent-agent-prompts.md, or
2. Start agents for streams A, C, E, F, and D1 by pasting each stream’s prompt into a new agent/composer, then start B after A completes and D2/D3 after D1 merges.

Every agent must: only touch files in their stream; run pnpm run lint, typecheck, test:unit (and E2E smoke if touching SIP core); follow AGENTS.md and push when done.
```

**Rules for all agents:**

- Implement **only** the stream you are assigned. Do not modify files outside that stream’s file list.
- Follow **AGENTS.md**: use `bd` for task tracking; at session end run quality gates and **git push**.
- Before claiming “done”: run `pnpm run lint`, `pnpm run typecheck`, `pnpm run test:unit`. If your stream touches SIP core (A, B, D), run E2E smoke if available.
- If you need to change a file that another stream owns, stop and either hand off or coordinate (see plan “Coordination and merge order”).

---

## Prompt: Stream A (Diagnostic logging cleanup)

```
You are implementing **Stream A: Diagnostic logging cleanup** from the multi-agent plan.

**Plan file:** docs/plans/2026-02-25-codebase-improvements-multiagent.md

**Your scope:** Stream A only. Do not change E2E logic, EventBus, or adapter code. Only replace unconditional console.log/console.error with the existing logger (createLogger / log) at debug or error level.

**Tasks (in order):**
1. A.1 – In src/core/SipClient.ts, replace every console.log with logger.debug and every console.error with logger.error. Remove no behavior.
2. A.2 – In src/core/CallSession.ts, replace console.log in setupEventHandlers and elsewhere with logger.debug.
3. A.3 – In src/composables/useSipClient.ts, replace all console.log with logger.debug.
4. A.4 – In src/composables/useCallSession.ts, replace all console.log/console.error with log.debug/log.error.
5. A.5 – Run pnpm run lint, pnpm run typecheck, pnpm run test:unit. Confirm no console.* remains in these four files (grep).

**Done when:** All A.1–A.5 acceptance criteria in the plan are met and you have pushed your changes. Follow AGENTS.md for landing (bd, git push).
```

---

## Prompt: Stream B (E2E / EventBridge isolation)

```
You are implementing **Stream B: E2E / EventBridge isolation** from the multi-agent plan.

**Plan file:** docs/plans/2026-02-25-codebase-improvements-multiagent.md

**Your scope:** Stream B only. Create a single E2E helper module and refactor SipClient and useSipClient to use it. Do not change logging (that is Stream A) or adapter code (Stream D).

**Tasks (in order):**
1. B.1 – Create src/testing/e2eHarness.ts (or src/e2e/harness.ts). Export isE2EMode(), getE2EEmit(), getEventBridge(). Move the logic that currently checks window.__emitSipEvent and window.__sipEventBridge out of SipClient into this module.
2. B.2 – In src/core/SipClient.ts, replace inline E2E detection with imports from the new helper. Call isE2EMode(), getE2EEmit(), getEventBridge() instead of repeating window checks. Keep all E2E behavior (mocks, simulated events).
3. B.3 – In src/composables/useSipClient.ts, use the new E2E helper for any window.__sipEventBridge / __emitSipEvent / __sipListenersReady logic where it makes sense.
4. B.4 (optional) – Add a short note in docs/developer/architecture.md or tests/e2e/README.md describing that E2E mode is determined by the new helper.

**Done when:** B.1–B.3 (and optionally B.4) are complete, E2E smoke still passes, and you have pushed. Follow AGENTS.md for landing.
```

---

## Prompt: Stream C (EventBus typing and narrow any)

```
You are implementing **Stream C: EventBus typing and narrowing any** from the multi-agent plan.

**Plan file:** docs/plans/2026-02-25-codebase-improvements-multiagent.md

**Your scope:** Stream C only. Introduce a typed event map and use it in EventBus/composables; replace minimal any with concrete types. Do not change logging (A), E2E harness (B), or adapter (D).

**Tasks (in order):**
1. C.1 – In src/types/event-names.ts and/or src/types/events.types.ts, define SipEventPayloadMap (event name → payload type) and export SipEventName union. Reuse existing types from events.types.ts where they exist.
2. C.2 – In src/core/EventBus.ts or new TypedEventBus, add a typed on/off (and optionally emit) that use SipEventPayloadMap. Update at least one composable (e.g. useCallSession or useSipE911) to use the typed on for sip:new_session so that event payload is typed and no "as any" is needed for that event.
3. C.3 – In useSipDtmf.ts, useDialog.ts, SipClientProvider.ts, replace the minimal any (e.g. Ref<any | null> → Ref<CallSession | null>, handler (data: any) → proper payload type) and add eslint-disable only where truly necessary.

**Done when:** C.1–C.3 are complete, lint and typecheck pass, and you have pushed. Follow AGENTS.md for landing.
```

---

## Prompt: Stream D1 (Adapter – JsSipAdapter / JsSipCallSession)

```
You are implementing **Stream D.1: JsSipAdapter and JsSipCallSession** from the multi-agent plan.

**Plan file:** docs/plans/2026-02-25-codebase-improvements-multiagent.md

**Your scope:** Stream D.1 only. Implement or complete JsSipAdapter and JsSipCallSession so that all JsSIP-specific UA and call logic lives in the adapter layer. Do not refactor SipClient to use the adapter yet (that is D.2).

**Tasks (in order):**
1. Ensure src/adapters/types.ts defines ISipAdapter and ICallSession (or equivalent). Implement JsSipAdapter in src/adapters/jssip/JsSipAdapter.ts: initialize, connect, disconnect, register, unregister, call, getActiveCalls, destroy. Move JsSIP UA creation and registration from SipClient into this adapter.
2. Implement or complete JsSipCallSession in src/adapters/jssip/JsSipCallSession.ts: wrap JsSIP RTCSession; implement answer, reject, hangup, hold, mute, DTMF, transfer per ICallSession. E2E mock can stay in SipClient for now or move behind a test mode in the adapter.
3. Ensure typecheck and lint pass and that any existing adapter-level unit tests pass.

**Done when:** JsSipAdapter can connect, register, and place a call; JsSipCallSession handles answer/hangup/hold/mute/DTMF; you have pushed. Follow AGENTS.md. Do not change SipClient’s public API or its callers yet.
```

---

## Prompt: Stream D2 (SipClient uses adapter) – run after D1 is merged

```
You are implementing **Stream D.2: SipClient uses ISipAdapter** from the multi-agent plan.

**Plan file:** docs/plans/2026-02-25-codebase-improvements-multiagent.md

**Prerequisite:** Stream D.1 must be merged (JsSipAdapter and JsSipCallSession implemented).

**Your scope:** Stream D.2 only. Refactor SipClient to hold and use an ISipAdapter (JsSipAdapter by default) instead of the JsSIP UA directly. Keep the same public API and EventBus emission behavior.

**Tasks (in order):**
1. Refactor src/core/SipClient.ts to hold an ISipAdapter instance (create JsSipAdapter by default). Delegate start, stop, register, unregister, call to the adapter.
2. Keep EventBus emission in SipClient (or pass EventBus into the adapter so events still fire). Ensure sip:connected, sip:registered, sip:new_session and other events still fire so composables and E2E tests do not break.
3. Preserve E2E behavior (mock in SipClient or in adapter). Run test:unit and E2E smoke.

**Done when:** All SipClient and composable tests pass; E2E smoke passes; SipClient public API unchanged; you have pushed. Follow AGENTS.md.
```

---

## Prompt: Stream D3 (Adapter tests and docs) – run after D1 or D2

```
You are implementing **Stream D.3: Adapter tests and docs** from the multi-agent plan.

**Plan file:** docs/plans/2026-02-25-codebase-improvements-multiagent.md

**Prerequisite:** Stream D.1 (and ideally D.2) merged.

**Your scope:** Stream D.3 only. Add or extend unit tests for the adapter; update adapter README and optionally main README.

**Tasks (in order):**
1. Add or extend tests in tests/unit/adapters/ for JsSipAdapter (connect, register, call, getActiveCalls with mocked JsSIP UA).
2. Update src/adapters/README.md: set JsSIP adapter status to "Implemented", mark Phase 2/3 done, Phase 4 (SIP.js) planned.
3. Optionally add one sentence to README.md under Architecture: "SIP is accessed via an adapter (JsSIP implemented; SIP.js planned)."

**Done when:** New/updated tests pass; adapter and main README reflect current state; you have pushed. Follow AGENTS.md.
```

---

## Prompt: Stream E (Public API and docs parity)

```
You are implementing **Stream E: Public API and docs parity** from the multi-agent plan.

**Plan file:** docs/plans/2026-02-25-codebase-improvements-multiagent.md

**Your scope:** Stream E only. Add a check script for export parity; tag experimental APIs; align README and adapter status text.

**Tasks (in order):**
1. E.1 – Create scripts/check-exports.ts (or .mjs) that compares exports from the package (or src/composables/index.ts) with composables listed in docs. Report exported-but-not-documented and documented-but-not-exported. Add pnpm run check:exports (or docs:check-exports) in package.json.
2. E.2 – In src/index.ts and src/codecs/index.ts (and any other preview surface), add @experimental or @remarks for preview APIs. In README or docs table, note which composables are preview/experimental.
3. E.3 – In README.md and src/adapters/README.md, ensure "JsSIP or SIP.js" and "Adapter Implementation Status" / "Implementation Roadmap" match current code (JsSIP implemented, SIP.js planned).

**Done when:** Script runs; experimental APIs tagged; README and adapter docs aligned; you have pushed. Follow AGENTS.md.
```

---

## Prompt: Stream F (Error-handling docs and severity)

```
You are implementing **Stream F: Error-handling and severity consistency** from the multi-agent plan.

**Plan file:** docs/plans/2026-02-25-codebase-improvements-multiagent.md

**Your scope:** Stream F only. Document the recommended error/hook pattern; optionally adjust ErrorSeverity in a few composables.

**Tasks (in order):**
1. F.1 – Add docs/guide/error-handling.md (or a section in docs/developer/architecture.md) describing "Recommended error handling for applications": use plugin/hook or EventBus to listen for sip:error / registration_failed / call failures; map to toasts/telemetry; include a minimal code sample. Mention logErrorWithContext and ErrorSeverity. Link from developer README or architecture.
2. F.2 (optional) – In useCallSession.ts and useSipClient.ts, review logErrorWithContext(..., ErrorSeverity.XXX): set user-facing failures (makeCall, answer, registration) to HIGH/CRITICAL; internal/recoverable to MEDIUM/LOW. Add a one-line comment where you set severity.

**Done when:** F.1 (and optionally F.2) is complete and you have pushed. Follow AGENTS.md.
```

---

## Suggested parallel runs

**First wave (no dependencies):** Start these in separate agents at the same time.

- **Agent 1:** Stream A (logging)
- **Agent 2:** Stream C (EventBus typing)
- **Agent 3:** Stream E (API parity)
- **Agent 4:** Stream F (error-handling docs)
- **Agent 5:** Stream D1 (adapter implementation)

**Second wave (after A and D1):**

- **Agent 6:** Stream B (E2E isolation) – do after Stream A to avoid SipClient merge conflicts.
- **Agent 7:** Stream D2 (SipClient uses adapter) – do after D1 is merged.
- **Agent 8:** Stream D3 (adapter tests/docs) – do after D1 or D2.

Use the exact prompts above for each agent so each one has a single, clear stream and file list.
