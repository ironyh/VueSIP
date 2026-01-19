# Desktop Notifications (Incoming Calls)

VueSIP supports OS desktop notifications for incoming calls with a progressive approach:

- In-page notifications (no Service Worker): Click focuses the tab.
- Service Worker notifications with actions: Answer/Decline buttons; clicking focuses/opens the app.

## Enabling Notifications (Templates)

1. Enable Desktop Notifications in Settings (in-page). The browser prompts for permission.
2. (Optional) Enable Service Worker Notifications to get Answer/Decline buttons.

Notes:

- Notifications are user-gated. Grant permission in the browser.
- OS Do Not Disturb/Focus modes may suppress notifications.

## Programmatic API

```ts
import { createNotificationManager, ensurePermission } from 'vuesip'

// Ask for permission (call from user gesture)
await ensurePermission(true)

// Create a manager (auto strategy selects SW actions if available)
const manager = createNotificationManager({ strategy: 'auto' })

// Show incoming call
await manager.notifyIncomingCall({
  title: 'Incoming call',
  body: 'From 555-1234',
  icon: '/logo.svg',
})
```

## Service Worker Deep Links

When using SW actions, the service worker opens/focuses the app with query params like:

```
/?notifAction=answer&callId=...
```

On app boot, parse `notifAction` and act if call is still ringing.

## Privacy & A11y

- Avoid sensitive content in notification body.
- Provide in-app fallback UI when notifications are disabled.

## Troubleshooting

- Permission denied: Re-enable via site settings, or use in-app settings to request again.
- Safari/macOS: Best results as an installed PWA. Action support varies; falls back to click-only.
