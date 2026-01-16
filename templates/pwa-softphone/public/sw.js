/**
 * VueSIP PWA Softphone Service Worker
 * Handles push notifications and offline caching
 */

const CACHE_NAME = 'vuesip-softphone-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  // Skip WebSocket connections
  if (event.request.url.includes('ws://') || event.request.url.includes('wss://')) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        // Clone the response for caching
        const responseToCache = response.clone()

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      })
    })
  )
})

// Push notification event
self.addEventListener('push', (event) => {
  let data = {
    title: 'VueSIP Softphone',
    body: 'New notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'default',
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      data = { ...data, ...payload }
    } catch {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    vibrate: [200, 100, 200],
    requireInteraction: data.tag === 'incoming-call',
    actions: data.tag === 'incoming-call'
      ? [
          { action: 'answer', title: 'Answer' },
          { action: 'reject', title: 'Decline' },
        ]
      : [],
    data: data,
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification
  const action = event.action
  const data = notification.data || {}

  notification.close()

  // Handle incoming call actions
  if (data.tag === 'incoming-call' || data.type === 'incoming-call') {
    if (action === 'answer') {
      event.waitUntil(
        handleCallAction('answer', data)
      )
    } else if (action === 'reject') {
      event.waitUntil(
        handleCallAction('reject', data)
      )
    } else {
      // Default click - open app
      event.waitUntil(
        focusOrOpenApp()
      )
    }
    return
  }

  // Default click - open/focus app
  event.waitUntil(
    focusOrOpenApp()
  )
})

// Handle call actions from notification
async function handleCallAction(action, data) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  // Try to find an existing window and post message to it
  for (const client of clients) {
    if ('focus' in client) {
      await client.focus()
      client.postMessage({
        type: 'call-action',
        action: action,
        data: data,
      })
      return
    }
  }

  // No window found, open new one with action in URL
  await self.clients.openWindow(`/?action=${action}`)
}

// Focus existing window or open new one
async function focusOrOpenApp() {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  for (const client of clients) {
    if ('focus' in client) {
      return client.focus()
    }
  }

  return self.clients.openWindow('/')
}

// Notification close event
self.addEventListener('notificationclose', (event) => {
  const notification = event.notification
  const data = notification.data || {}

  // Log notification dismissal for analytics
  console.log('Notification closed:', data.tag || 'default')
})

// Message event - handle messages from app
self.addEventListener('message', (event) => {
  const message = event.data

  switch (message.type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break

    case 'CLEAR_NOTIFICATIONS':
      self.registration.getNotifications().then((notifications) => {
        notifications.forEach((n) => n.close())
      })
      break

    case 'CLEAR_NOTIFICATION_BY_TAG':
      self.registration.getNotifications({ tag: message.tag }).then((notifications) => {
        notifications.forEach((n) => n.close())
      })
      break

    default:
      console.log('Unknown message type:', message.type)
  }
})
