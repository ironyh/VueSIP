# Plan: Unified PBX Recording Retrieval

**Epic:** VueSIP-dpi – Unified PBX recording retrieval: interface, composable, adapters, tests, docs (track in beads: `bd show VueSIP-dpi`)

**Context:** VueSIP can control server-side recording (useAmiRecording) but does not retrieve recordings from PBXs. This plan adds a unified interface so apps can list and get playback URLs regardless of PBX (FreePBX, Yeastar, Grandstream, etc.). See [Retrieving Call Recordings from PBX](/guide/recordings-retrieval-pbx) for capabilities per PBX.

## Execution order

| Order | Bead         | Task                                     | Depends on          |
| ----- | ------------ | ---------------------------------------- | ------------------- |
| 1     | VueSIP-dpi.1 | Types and PbxRecordingProvider interface | —                   |
| 2     | VueSIP-dpi.2 | usePbxRecordings composable              | dpi.1               |
| 2     | VueSIP-dpi.3 | FreePBX adapter                          | dpi.1               |
| 3     | VueSIP-dpi.6 | Security and auth model                  | dpi.2, dpi.3        |
| 4     | VueSIP-dpi.7 | Fixture-based contract tests             | dpi.2, dpi.3, dpi.6 |
| 4     | VueSIP-dpi.4 | Unit tests                               | dpi.2, dpi.3, dpi.6 |
| 4     | VueSIP-dpi.5 | Documentation                            | dpi.2, dpi.3, dpi.6 |
| 5     | VueSIP-dpi.8 | Integration smoke test                   | dpi.4, dpi.5        |

## Scope (v1)

- **Types:** `RecordingSummary`, `RecordingPlaybackInfo`, `PbxRecordingProvider` in `src/types/` (e.g. `pbx-recording.types.ts`), including provider capabilities and paging/filter-ready list options.
- **Composable:** `usePbxRecordings(providerRef)` – exposes `recordings`, `loading`, `error`, `fetchRecordings(options?)`, `getPlaybackUrl(id)` and normalized unauthorized/expired URL error handling.
- **First adapter:** FreePBX – GraphQL for list, `config.php?display=cdr&action=download_audio&cdr_file=<uniqueid>` for playback URL; config: baseUrl, auth.
- **Security/Auth:** Explicitly support and document same-origin session/cookie mode and backend proxy mode, including sensitive logging guardrails.
- **Tests:** Unit tests plus fixture-based contract tests for mapping and URL construction (realistic FreePBX payloads + edge cases), plus one end-to-end integration smoke test (Playwright or Playground) that exercises the full list → render → playback URL flow.
- **Docs:** Separate user guide + provider-author guide, with security checklist, adapter extension steps, and a versioning policy (additive changes in minor releases; breaking contract changes require a semver major bump).
- **Definition of Done (per bead):** Each task ships when: exported API has full JSDoc, lint/typecheck pass with zero errors, tests pass, and the relevant doc section is updated.

## Out of scope (this epic)

- Second adapter (Yeastar, Grandstream, etc.) – add later using the same interface.
- Playground demo – optional follow-up.
- Building/hosting a backend proxy service implementation (design/docs only in this epic).
- Automated contract compatibility enforcement across adapter versions (beyond the documented versioning policy).

## Acceptance (epic)

- Types and PbxRecordingProvider contract are defined/exported, including capabilities and paging/filter options.
- usePbxRecordings works with any PbxRecordingProvider and has stable error states for unauthorized/expired playback URL cases.
- FreePBX adapter implements contract with explicit auth model docs (same-origin session vs backend proxy).
- Tests include unit tests and fixture-based contract tests for FreePBX payload mapping, URL construction, and auth/error edge cases.
- Documentation includes user usage guide, provider-author extension guide (with security checklist and versioning policy), and a per-bead Definition of Done reflected in each issue's acceptance criteria.
- Integration smoke test passes in CI on desktop Chrome, verifying the full list → render → getPlaybackUrl flow with a mock provider.
