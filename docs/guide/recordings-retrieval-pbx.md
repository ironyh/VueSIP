# Retrieving Call Recordings from PBX

This guide describes how to list and play call recordings from a PBX using VueSIP’s adapter-agnostic **PbxRecordingProvider** interface and the **FreePBX** adapter.

## Overview

- **Types and interface:** `RecordingSummary`, `RecordingPlaybackInfo`, `PbxRecordingProvider` (see [PBX recording types](/docs/composables-documented.md#pbx-recording-types-for-usePbxRecordings--adapters)).
- **Composable:** `usePbxRecordings(providerRef)` (when implemented) will consume any `PbxRecordingProvider` and expose list/playback and error states.
- **Adapters:** Implement the provider for a specific PBX. The first supported adapter is **FreePBX**.

## FreePBX adapter

The FreePBX adapter uses:

- **Listing:** GraphQL API `fetchAllCdrs` (see [FreePBX CDR GraphQL APIs](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/26083384/CDR+Module+GraphQL+APIs)).
- **Playback URL:** `config.php?display=cdr&action=download_audio&cdr_file=<uniqueid>` (same as used by the FreePBX CDR module).

### Usage

```typescript
import { createFreePbxRecordingProvider } from 'vuesip'

const provider = createFreePbxRecordingProvider({
  baseUrl: 'https://pbx.example.com', // no trailing slash
})

// List recordings (with optional date range and paging)
const result = await provider.listRecordings({
  limit: 20,
  offset: 0,
  dateFrom: new Date('2025-01-01'),
  dateTo: new Date('2025-01-31'),
})
// result.items are RecordingSummary[]; result.totalCount, result.hasMore

// Get playback URL for a recording (id is the FreePBX uniqueid)
const info = await provider.getPlaybackInfo(result.items[0].id)
// info.playbackUrl is the download URL; requires auth in cross-origin case
```

### Configuration

| Option           | Description                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `baseUrl`        | FreePBX admin base URL (e.g. `https://pbx.example.com`). No trailing slash.                    |
| `fetch`          | Optional custom `fetch` (e.g. for tests or wrapping with auth).                                |
| `getAuthHeaders` | Optional function returning headers for token-based auth. Omit when using same-origin session. |

## Security and auth model

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

- **Unauthorized (401/403):** `getPlaybackUrl` sets `playbackError` with code `unauthorized` and rejects. UI can prompt re-auth or switch to proxy.
- **Expired URL:** If `RecordingPlaybackInfo.expiresAt` is in the past, or the provider throws an expired response, `playbackError` is set to `expired` and the promise rejects. UI can refresh the list or request a new playback URL from your backend.

## Authentication and playback

Playback (and often listing) requires an authenticated context.

- **Same-origin session (cookies):** If your app is served from the same origin as the FreePBX admin (e.g. embedded in FreePBX or same domain), the browser sends the user’s session cookies with every request. Use the default `fetch` and do not set `getAuthHeaders`.
- **Cross-origin / SPA on different domain:** The download URL requires auth. Options:
  1. **Backend proxy:** Your backend authenticates to FreePBX (e.g. session or API token) and streams the recording to the client. The adapter would then point at your proxy URL, or you resolve playback through your own API that returns a short-lived URL.
  2. **Token-based auth:** If your FreePBX or an API in front of it supports tokens, use `getAuthHeaders` to add an `Authorization` (or similar) header. Note: the playback URL is still loaded by the browser (e.g. in an `<audio>` src or download link); for cross-origin, that only works if the server accepts the same token (e.g. via cookie or query param). Otherwise, use a backend proxy.

Document and implement the chosen approach in your app; the adapter only builds the URL and optional request headers for GraphQL and (if you use a custom `fetch`) for the download request.

## Deployment: backend proxy mode

When your app is on a different origin than the PBX, use a backend proxy so the browser never sees PBX URLs or tokens.

1. **Proxy endpoint:** Add a server route (e.g. `GET /api/recordings/:id/play`) that validates the user session or API key, fetches the recording from the PBX (using server-side auth), and streams the response to the client.
2. **Adapter config:** Use a custom provider that calls your API and returns `playbackUrl` pointing at your proxy (e.g. `https://yourapp.com/api/recordings/123/play`), or keep the FreePBX adapter with `baseUrl` set to a same-origin proxy that forwards to FreePBX; ensure the proxy does not log URLs or tokens.
3. **Short-lived URLs (optional):** For extra security, have the backend issue a short-lived signed URL or one-time token for each playback request.
4. **Logging:** Do not log request URLs, response bodies, or headers that contain tokens or signed query parameters.

## Capabilities

The FreePBX adapter reports:

- `listRecordings`, `getPlaybackInfo`, `downloadRecording`: supported.
- `supportsDateFilter`: yes (`dateFrom` / `dateTo`).
- `supportsSearch`, `supportsDirectionFilter`: no (GraphQL API does not expose them in the adapter’s current scope).
- `maxPageSize`: 500.

Use `provider.capabilities` to drive UI (e.g. show/hide date filter or search).
