/**
 * Push Notifications Composable
 * Handles push notification registration and display for incoming calls
 */
import { ref, computed, onMounted } from 'vue'

export interface PushNotificationOptions {
  body?: string
  icon?: string
  tag?: string
  requireInteraction?: boolean
  vibrate?: number[]
  actions?: { action: string; title: string }[]
  data?: Record<string, unknown>
}

export function usePushNotifications() {
  const permission = ref<NotificationPermission>('default')
  const isSupported = ref(false)
  const subscription = ref<PushSubscription | null>(null)

  // Check if notifications are supported
  onMounted(() => {
    isSupported.value = 'Notification' in window && 'serviceWorker' in navigator
    if (isSupported.value) {
      permission.value = Notification.permission
    }
  })

  const isPermissionGranted = computed(() => permission.value === 'granted')
  const isPermissionDenied = computed(() => permission.value === 'denied')

  /**
   * Request notification permission from the user
   */
  async function requestPermission(): Promise<NotificationPermission> {
    if (!isSupported.value) {
      console.warn('Push notifications not supported')
      return 'denied'
    }

    try {
      const result = await Notification.requestPermission()
      permission.value = result
      return result
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return 'denied'
    }
  }

  /**
   * Show a notification
   */
  async function showNotification(
    title: string,
    options: PushNotificationOptions = {}
  ): Promise<void> {
    if (!isSupported.value || !isPermissionGranted.value) {
      console.warn('Cannot show notification: permission not granted')
      return
    }

    const defaultOptions: PushNotificationOptions = {
      icon: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options,
    }

    try {
      // Try to use service worker notification for better reliability
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, defaultOptions)
    } catch {
      // Fallback to regular notification
      new Notification(title, defaultOptions)
    }
  }

  /**
   * Subscribe to push notifications (for server-side push)
   */
  async function subscribeToPush(vapidPublicKey?: string): Promise<PushSubscription | null> {
    if (!isSupported.value) {
      return null
    }

    try {
      const registration = await navigator.serviceWorker.ready

      // Check for existing subscription
      let existingSubscription = await registration.pushManager.getSubscription()

      if (existingSubscription) {
        subscription.value = existingSubscription
        return existingSubscription
      }

      // Create new subscription if VAPID key provided
      if (vapidPublicKey) {
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
        subscription.value = newSubscription
        return newSubscription
      }

      return null
    } catch (error) {
      console.error('Failed to subscribe to push:', error)
      return null
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async function unsubscribeFromPush(): Promise<boolean> {
    if (subscription.value) {
      try {
        await subscription.value.unsubscribe()
        subscription.value = null
        return true
      } catch (error) {
        console.error('Failed to unsubscribe from push:', error)
        return false
      }
    }
    return true
  }

  /**
   * Show incoming call notification with actions
   */
  async function showIncomingCallNotification(
    callerName: string,
    callerNumber?: string,
    calledLine?: string
  ): Promise<void> {
    await showNotification('Incoming Call', {
      body: [callerName, callerNumber, calledLine ? `Line: ${calledLine}` : '']
        .filter(Boolean)
        .join('\n'),
      tag: 'incoming-call',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      actions: [
        { action: 'answer', title: 'Answer' },
        { action: 'reject', title: 'Decline' },
      ],
      data: {
        type: 'incoming-call',
        callerName,
        callerNumber,
        calledLine,
      },
    })
  }

  /**
   * Clear all notifications
   */
  async function clearNotifications(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready
      const notifications = await registration.getNotifications()
      notifications.forEach((notification) => notification.close())
    } catch (error) {
      console.error('Failed to clear notifications:', error)
    }
  }

  return {
    // State
    permission,
    isSupported,
    isPermissionGranted,
    isPermissionDenied,
    subscription,

    // Methods
    requestPermission,
    showNotification,
    showIncomingCallNotification,
    subscribeToPush,
    unsubscribeFromPush,
    clearNotifications,
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
