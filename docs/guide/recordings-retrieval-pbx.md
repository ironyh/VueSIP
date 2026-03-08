# Retrieving Call Recordings from PBX

This guide describes how to list and play call recordings from a PBX using VueSIP’s adapter-agnostic `PbxRecordingProvider` interface, the `usePbxRecordings` composable, and the FreePBX adapter.

## Overview

- **Types and interface:** `RecordingSummary`, `RecordingPlaybackInfo`, `PbxRecordingProvider` (see [PBX recording types](/composables-documented#pbx-recording-types-for-usePbxRecordings--adapters)).
- **Composable:** `usePbxRecordings(providerRef)` consumes any `PbxRecordingProvider` and exposes list/playback and error states.
- **Adapters:** Implement the provider for a specific PBX. The first supported adapter is FreePBX.

---

## Part 1 – User guide: `usePbxRecordings` with FreePBX

### Basic setup

```ts
import { shallowRef, onMounted } from 'vue'
import { createFreePbxRecordingProvider, usePbxRecordings } from 'vuesip'

const provider = shallowRef(
  createFreePbxRecordingProvider({
    baseUrl: 'https://pbx.example.com', // no trailing slash
    // Optional: fetch, getAuthHeaders for proxy/token modes
  })
)

const {
  recordings,
  totalCount,
  hasMore,
  loading,
  error,
  playbackError,
  fetchRecordings,
  getPlaybackUrl,
} = usePbxRecordings(provider)

onMounted(() => {
  // Initial page; add dateFrom/dateTo if supported by capabilities
  fetchRecordings({ limit: 20 })
})
```

### Rendering a recordings list with playback

In a Vue component template:

```vue
<template>
  <section>
    <header class="flex items-center justify-between">
      <h2>PBX Recordings</h2>
      <button type="button" :disabled="loading" @click="fetchRecordings({ limit: 20, offset: 0 })">
        Refresh
      </button>
    </header>

    <p v-if="error" class="text-red-600">{{ error }}</p>
    <p v-if="playbackError" class="text-amber-600">Playback error ({{ playbackError.code }})</p>

    <table v-if="recordings.length">
      <thead>
        <tr>
          <th>Time</th>
          <th>From</th>
          <th>To</th>
          <th>Direction</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="rec in recordings" :key="rec.id">
          <td>{{ rec.startTime }}</td>
          <td>{{ rec.callerId }}</td>
          <td>{{ rec.callee }}</td>
          <td>{{ rec.direction }}</td>
          <td>
            <button type="button" :disabled="loading" @click="onPlay(rec.id)">Play</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!loading">No recordings found.</p>

    <footer v-if="hasMore">
      <button
        type="button"
        :disabled="loading"
        @click="fetchRecordings({ limit: 20, offset: recordings.length })"
      >
        Load more
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
const onPlay = async (id: string) => {
  try {
    const url = await getPlaybackUrl(id)
    const audio = new Audio(url)
    await audio.play()
  } catch {
    // playbackError is already set by usePbxRecordings
  }
}
</script>
```

**Tips:**

- Inspect `provider.value?.capabilities` to decide whether to show date filters, paging controls, or search input.
- Use `playbackError.code` to show tailored UI for `unauthorized`, `expired`, `not_found`, or network issues.
- For cross-origin apps, prefer the backend proxy mode described below instead of exposing PBX URLs directly.

---

## Part 2 – Provider-author guide: implementing a `PbxRecordingProvider`

To add support for another PBX, implement the `PbxRecordingProvider` interface.

### Required types and contract

See [PBX recording types](/composables-documented#pbx-recording-types-for-usePbxRecordings--adapters) for full type definitions. At a minimum, your adapter must:

- Implement **`listRecordings(query: PbxRecordingListQuery)`** returning `PbxRecordingListResult`.
- Implement **`getPlaybackInfo(recordingId: string)`** returning `RecordingPlaybackInfo | null`.
- Expose a **`capabilities`** object that accurately describes what the adapter supports.

When mapping PBX data:

- Map CDR fields (time, caller, callee, direction, unique call ID) into `RecordingSummary`.
- Use `RecordingPlaybackInfo.playbackUrl` or `streamUrl` for the actual audio URL.
- Populate `RecordingPlaybackInfo.expiresAt` when URLs are short-lived, so `usePbxRecordings` can surface `expired` errors consistently.

### FreePBX adapter reference

The FreePBX adapter uses:

- **Listing:** GraphQL API `fetchAllCdrs` (see [FreePBX CDR GraphQL APIs](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/26083384/CDR+Module+GraphQL+APIs)).
- **Playback URL:** `config.php?display=cdr&action=download_audio&cdr_file=<uniqueid>` (same as used by the FreePBX CDR module).

Usage (adapter-only, without the composable) looks like:

```ts
import { createFreePbxRecordingProvider } from 'vuesip'

const provider = createFreePbxRecordingProvider({
  baseUrl: 'https://pbx.example.com', // no trailing slash
})

const result = await provider.listRecordings({
  limit: 20,
  offset: 0,
  dateFrom: new Date('2025-01-01'),
  dateTo: new Date('2025-01-31'),
})

const info = await provider.getPlaybackInfo(result.items[0].id)
// info.playbackUrl is the download URL; requires auth in cross-origin case
```

### Security checklist for adapter authors

When implementing a new adapter:

- **Auth boundaries**
  - Decide whether apps will use **same-origin session** (cookies) or a **backend proxy**; document both clearly.
  - Never hard-code credentials or tokens in the adapter.
- **Logging**
  - **Do not log** playback URLs, auth headers, tokens, or raw error messages that might contain them.
  - When propagating errors, prefer stable `PbxPlaybackErrorCode` values (`unauthorized`, `expired`, `not_found`, `network`, `unknown`) over raw messages.
- **Expiry and revocation**
  - Populate `expiresAt` when URLs are short-lived; treat past-due URLs as `expired`.
  - Make it easy for app backends to rotate tokens or proxies without breaking the adapter.
- **Network and TLS**
  - Recommend HTTPS for all recording traffic; document any PBX constraints or self-signed certificate considerations separately.

---

## Security and auth model (for app developers)

Recording retrieval supports two authentication modes. The library **does not log** playback URLs, auth headers, tokens, or error messages that might contain them.

### Supported auth modes

| Mode                              | When to use                                                                                    | Configuration                                                                                                                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Same-origin session (cookies)** | App is served from the same origin as the PBX admin (e.g. embedded in FreePBX or same domain). | Use default `fetch`; do **not** set `getAuthHeaders`. Browser sends session cookies automatically.                                                                                                                            |
| **Backend proxy**                 | App is on a different origin; you do not expose PBX URLs or tokens to the client.              | Your backend authenticates to the PBX and streams the recording. Point the adapter at your proxy base URL, or have `getPlaybackInfo` return a short-lived proxy URL from your API. Do not log proxy URLs that contain tokens. |

### Token leakage and logging

- **Adapters and composable:** Playback URLs (`playbackUrl`, `streamUrl`), auth headers, and tokens are **never** logged. On list or playback failure, only a generic error or a stable code (e.g. `unauthorized`, `expired`) is logged; raw error messages that might contain URLs or tokens are not written to logs.
- **Your app:** When implementing a backend proxy or token-based flow, avoid logging request/response bodies or headers that contain tokens or signed URLs.

### Unauthorized and expired playback

- **Unauthorized (401/403):** `usePbxRecordings.getPlaybackUrl` sets `playbackError` with code `unauthorized` and rejects. UI can prompt re-auth or switch to proxy.
- **Expired URL:** If `RecordingPlaybackInfo.expiresAt` is in the past, or the provider throws an expired response, `playbackError` is set to `expired` and the promise rejects. UI can refresh the list or request a new playback URL from your backend.

---

## Authentication and playback

Playback (and often listing) requires an authenticated context.

- **Same-origin session (cookies):** If your app is served from the same origin as the FreePBX admin (e.g. embedded in FreePBX or same domain), the browser sends the user’s session cookies with every request. Use the default `fetch` and do not set `getAuthHeaders`.
- **Cross-origin / SPA on different domain:** The download URL requires auth. Options:
  1. **Backend proxy:** Your backend authenticates to FreePBX (e.g. session or API token) and streams the recording to the client. The adapter would then point at your proxy URL, or you resolve playback through your own API that returns a short-lived URL.
  2. **Token-based auth:** If your FreePBX or an API in front of it supports tokens, use `getAuthHeaders` to add an `Authorization` (or similar) header. Note: the playback URL is still loaded by the browser (e.g. in an `<audio>` src or download link); for cross-origin, that only works if the server accepts the same token (e.g. via cookie or query param). Otherwise, use a backend proxy.

Document and implement the chosen approach in your app; the adapter only builds the URL and optional request headers for GraphQL and (if you use a custom `fetch`) for the download request.

---

## Deployment: backend proxy mode

When your app is on a different origin than the PBX, use a backend proxy so the browser never sees PBX URLs or tokens.

1. **Proxy endpoint:** Add a server route (e.g. `GET /api/recordings/:id/play`) that validates the user session or API key, fetches the recording from the PBX (using server-side auth), and streams the response to the client.
2. **Adapter config:** Use a custom provider that calls your API and returns `playbackUrl` pointing at your proxy (e.g. `https://yourapp.com/api/recordings/123/play`), or keep the FreePBX adapter with `baseUrl` set to a same-origin proxy that forwards to FreePBX; ensure the proxy does not log URLs or tokens.
3. **Short-lived URLs (optional):** For extra security, have the backend issue a short-lived signed URL or one-time token for each playback request.
4. **Logging:** Do not log request URLs, response bodies, or headers that contain tokens or signed query parameters.

---

## Capabilities

The FreePBX adapter reports:

- `listRecordings`, `getPlaybackInfo`, `downloadRecording`: supported.
- `supportsDateFilter`: yes (`dateFrom` / `dateTo`).
- `supportsSearch`, `supportsDirectionFilter`: no (GraphQL API does not expose them in the adapter’s current scope).
- `maxPageSize`: 500.

Use `provider.capabilities` to drive UI (e.g. show/hide date filter or search).

---

## Versioning policy and Definition of Done for adapters

### Versioning policy

- **Additive-only in minor releases:** New optional fields, capabilities, or helper functions may be added in minor versions as long as they do not break existing adapters or apps.
- **Breaking changes require major bump:** Any change that alters required fields, removes capabilities, or changes semantics of existing types or methods must ship in a major version with migration notes.
- **Adapter compatibility:** Adapters should continue to compile and behave correctly across minor updates; if new capabilities are introduced, they must default to safe values.

### DoD for new PBX recording adapters

An adapter is considered done when:

- **Contract:** It fully implements `PbxRecordingProvider` with accurate `capabilities`.
- **Mapping:** It correctly maps PBX CDR/recording fields into `RecordingSummary` and `RecordingPlaybackInfo`, including `expiresAt` when applicable.
- **Errors:** It surfaces stable error codes (via `PbxPlaybackErrorCode`) without leaking sensitive tokens or URLs into logs.
- **Tests:** Fixture-based tests cover nominal and edge payloads (missing recordings, expired URLs, empty lists, partial metadata).
- **Docs:** This guide is updated with:
  - A short description of the adapter and any PBX-specific quirks.
  - Notes on auth mode(s) and deployment recommendations.
- **Compatibility:** It passes unit tests and any integration smoke tests that wire it through `usePbxRecordings`.
