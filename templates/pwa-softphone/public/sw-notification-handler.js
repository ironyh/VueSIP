/**
 * Service Worker Notification Click Handler
 * 
 * Phase 3 of Desktop Notifications Epic (VueSIP-b1z)
 * Handles notification clicks and actions (Answer/Decline) from 
 * Service Worker notifications, and routes to the app via deep links.
 */

// Handle notification clicks (both regular clicks and action buttons)
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action; // 'answer', 'decline', or '' for regular click
  const callId = notification.data?.callId;

  // Close the notification
  notification.close();

  // Build the deep link URL based on action
  let targetUrl = '/';
  if (action === 'answer') {
    targetUrl = `/?notifAction=answer${callId ? `&callId=${callId}` : ''}`;
  } else if (action === 'decline') {
    targetUrl = `/?notifAction=decline${callId ? `&callId=${callId}` : ''}`;
  } else {
    // Regular click - just open/focus
    targetUrl = `/?notifAction=open${callId ? `&callId=${callId}` : ''}`;
  }

  // Focus existing window or open new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to find an existing window and focus it
      for (const client of clientList) {
        if ('focus' in client) {
          // Navigate and focus
          return client
            .navigate(targetUrl)
            .then((navigatedClient) => navigatedClient?.focus());
        }
      }
      // No existing window - open a new one
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Handle notification close (user dismissed without action)
self.addEventListener('notificationclose', (event) => {
  // Could track analytics or cleanup here
  console.debug('[VueSIP SW] Notification closed:', event.notification.tag);
});
