# Desktop Notifications for Incoming Calls (Cross-Platform)

Status: Draft (Phase 1 – Research & Design)
Epic: VueSIP-b1z

## Goals

- Show actionable incoming-call notifications on Windows, macOS, Linux.
- Configurable message, icon, and actions (Answer/Decline when possible).
- Clicking/acting focuses the app and triggers the intended behavior.
- Progressive enhancement: work without PWA install; upgrade with Service Worker.

## Approaches (Progressive)

1. In‑page Notification API (MVP)
   - `new Notification(title, options)` from the active tab.
   - Click handler focuses tab and navigates to call UI.
   - No `actions` support here (browser restriction).

2. PWA + Service Worker `showNotification` (Actions)
   - Use `registration.showNotification(title, { actions: [...] })`.
   - Handle `notificationclick` in SW, open/focus a client with deep link (e.g., `/?notifAction=answer&callId=...`).
   - Supports actions (Answer/Decline) on Chromium/Firefox desktop. Safari support varies.

3. Optional Web Push (Background)
   - For true background delivery when app is closed.
   - Requires push subscription, server relay, and payload.

4. Optional Electron (Native)
   - Future enhancement for apps shipping Electron wrapper with native notifications.

## Support Matrix (2026 snapshot)

- Windows/macOS/Linux (Chromium):
  - In‑page Notification: Yes; click supported.
  - SW showNotification: Yes; actions supported.
- Firefox Desktop:
  - In‑page: Yes; click supported.
  - SW actions: Supported.
- Safari macOS:
  - In‑page: Supported when site allowed; best as PWA.
  - Web Push + SW: Supported for installed web apps; actions support limited/inconsistent. Fallback to click‑only.
- iOS/iPadOS (FYI):
  - Web Push for installed web apps since iOS 16.4; background delivery possible; actions limited. Not target for desktop scope.

Notes: Permissions are user‑gated. Some environments suppress notifications for unfocused/blocked sites; provide toast fallback.

## Permissions & UX

- Request permission only on user gesture (e.g., toggle enable, first incoming call with prompt UI).
- Respect OS DND/focus modes (expect no notification delivery).
- Provide settings: enable/disable, requireInteraction, message template, icon.

## Proposed API (Library)

`NotificationManager` (implementation hidden behind strategy)

Config (partial):

```ts
type NotificationStrategy = 'in_page' | 'pwa'
interface NotificationsConfig {
  enabled: boolean
  strategy?: NotificationStrategy // auto default
  requireInteraction?: boolean // keep open until acted
  icon?: string // URL
  messageTemplate?: (p: { displayName?: string; number?: string }) => string
}
```

Surface:

```ts
interface NotificationManager {
  ensurePermission(opts?: { userGesture?: boolean }): Promise<boolean>
  showIncomingCall(p: {
    callId: string
    title: string
    body: string
    icon?: string
  }): Promise<boolean>
  onAction(
    handler: (evt: { action: 'answer' | 'decline' | 'open'; callId?: string }) => void
  ): () => void
}
```

Behavior:

- In‑page: show notification; on click -> focus tab -> emit `open` action.
- PWA SW: show with actions; in `notificationclick`, open/focus app with `/?notifAction=...&callId=...`.
- App boot reads URL params and emits action through NotificationManager.

## Event Integration

- Hook into incoming call event (existing SIP event flow) to invoke manager.
- Use messageTemplate: e.g., `Incoming call from ${displayName ?? number}`.

## Templates

- Basic Softphone: Settings toggle “Desktop notifications (incoming calls)”.
- Provide prompt when enabling to request permission.

## Deep Link Handling

- PWA action path: `/?notifAction=answer|decline|open&callId=...`.
- On app boot, parse URL and dispatch to call controller.

## Security/Privacy

- Never include sensitive data in notification body.
- Respect user opt‑out and OS privacy.

## Accessibility

- Ensure in‑app toast fallback with screen‑reader friendly content.
- Provide keyboard/ARIA affordances for notification settings.

## Spike Plan (Phase 2 prep)

1. Minimal NotificationManager (in‑page) with `ensurePermission` + `showIncomingCall`.
2. Wire to incoming call event; fallback toast when permission denied.
3. Settings toggle in basic-softphone; simple message template + icon.
4. Docs + unit tests for manager.

## Risks & Mitigations

- Permissions denied: fallback to toast; surface settings to re‑enable.
- Safari actions: degrade gracefully to click‑only.
- Multiple calls: last notification wins; use `tag: 'incoming-call'` to coalesce.

## Open Questions

- Do we want Web Push in Phase 3 (requires backend)? Default: optional.
- Should Answer/Decline deep links auto‑act on locked screen focus? We’ll gate behind explicit user gesture in app if needed.
