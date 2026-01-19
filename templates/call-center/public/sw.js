/* Service Worker for VueSIP Call Center - Notification Actions */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action || 'open';
  const callId = event.notification?.data?.callId || '';
  const url = `/?notifAction=${encodeURIComponent(action)}&callId=${encodeURIComponent(callId)}`;
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = allClients.find(c => 'focus' in c);
    if (client) {
      await client.focus();
      try { await client.navigate(url); } catch {}
      return;
    }
    await self.clients.openWindow(url);
  })());
});

