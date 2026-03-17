/**
 * usePushNotifications - PWA Push Notification helpers for VueSIP
 *
 * Provides composable utilities for push notification registration and management
 * in PWA contexts. Leverages isPWA() and isServiceWorkerSupported() utilities.
 *
 * @packageDocumentation
 */

import { ref, computed, getCurrentScope, onScopeDispose, type ComputedRef } from 'vue'
import { createLogger } from '@/utils/logger'
import { isPWA, isServiceWorkerSupported } from '@/utils/env'

const logger = createLogger('usePushNotifications')

/**
 * Push notification permission status
 */
export type PushPermissionStatus = 'default' | 'granted' | 'denied'

/**
 * Service worker registration information
 */
export interface ServiceWorkerRegistrationInfo {
  /** The service worker scope */
  scope: string
  /** The service worker script URL */
  scriptURL: string
  /** Current state of the service worker */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any
}

/**
 * Push subscription information
 */
export interface PushSubscriptionInfo {
  /** The subscription endpoint */
  endpoint: string
  /** Optional expiration time */
  expirationTime: number | null
  /** The p256dh key (base64) */
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Options for initializing push notifications
 */
export interface UsePushNotificationsOptions {
  /** Path to the service worker file (default: '/sw.js') */
  serviceWorkerPath?: string
  /** Callback when push notification is received */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPush?: (event: any) => void
  /** Callback when notification click is handled */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onNotificationClick?: (event: any) => void
}

/**
 * Return type for usePushNotifications composable
 */
export interface UsePushNotificationsReturn {
  /** Whether PWA mode is active */
  isInPWA: ComputedRef<boolean>
  /** Whether service workers are supported */
  isSupported: ComputedRef<boolean>
  /** Current push notification permission status */
  permissionStatus: ComputedRef<PushPermissionStatus>
  /** Whether push notifications are available (PWA + supported + granted) */
  isAvailable: ComputedRef<boolean>
  /** Active service worker registration */
  registration: ComputedRef<ServiceWorkerRegistrationInfo | null>
  /** Current push subscription */
  subscription: ComputedRef<PushSubscriptionInfo | null>
  /** Whether initialization is in progress */
  isInitializing: ComputedRef<boolean>
  /** Error message if initialization failed */
  error: ComputedRef<string | null>

  /** Initialize push notification system */
  initialize: () => Promise<boolean>
  /** Request push notification permission */
  requestPermission: () => Promise<PushPermissionStatus>
  /** Subscribe to push notifications */
  subscribe: () => Promise<PushSubscriptionInfo | null>
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>
  /** Show a local notification (for testing) */
  showNotification: (title: string, options?: PushNotificationOptions) => Promise<void>
}

/**
 * Options for showNotification
 * Extends the standard Notification options for Service Worker notifications
 */
export interface PushNotificationOptions {
  /** Notification body text */
  body?: string
  /** Notification icon URL */
  icon?: string
  /** Notification badge URL */
  badge?: string
  /** Notification tag (for grouping) */
  tag?: string
  /** Whether notification requires interaction */
  requireInteraction?: boolean
  /** Custom data to attach */
  data?: unknown
  /** Actions for the notification */
  actions?: Array<{ action: string; title: string; icon?: string }>
  /** Vibration pattern */
  vibrate?: number | number[]
  /** Notification language */
  lang?: string
  /** Notification direction */
  dir?: 'ltr' | 'rtl' | 'auto'
  /** Notification timestamp */
  timestamp?: number
  /** Notification silent flag */
  silent?: boolean
  /** Notification noscreen flag */
  noscreen?: boolean
  /** Notification sticky flag */
  sticky?: boolean
  /** Notification local only */
  localOnly?: boolean
  /** Notification category */
  category?: string
  /** Notification priority */
  priority?: 'high' | 'normal' | 'low'
}

/**
 * Composable for PWA push notification management
 *
 * @param options - Configuration options
 * @returns Push notification state and methods
 *
 * @example
 * ```ts
 * const {
 *   isAvailable,
 *   isSupported,
 *   permissionStatus,
 *   initialize,
 *   requestPermission,
 *   subscribe,
 *   unsubscribe
 * } = usePushNotifications({
 *   serviceWorkerPath: '/sw.js',
 *   onPush: (event) => {
 *     console.log('Push received:', event.data?.json())
 *   }
 * })
 *
 * // Check availability
 * if (isSupported.value) {
 *   await initialize()
 *   if (permissionStatus.value === 'default') {
 *     const status = await requestPermission()
 *     if (status === 'granted') {
 *       const sub = await subscribe()
 *       // Send subscription to your server
 *     }
 *   }
 * }
 * ```
 */
export function usePushNotifications(
  options: UsePushNotificationsOptions = {}
): UsePushNotificationsReturn {
  const serviceWorkerPath = options.serviceWorkerPath ?? '/sw.js'

  const _isInitializing = ref(false)
  const _error = ref<string | null>(null)
  const _registration = ref<ServiceWorkerRegistrationInfo | null>(null)
  const _subscription = ref<PushSubscriptionInfo | null>(null)

  const isInPWA = computed<boolean>(() => isPWA())

  const isSupported = computed<boolean>(() => isServiceWorkerSupported())

  const permissionStatus = computed<PushPermissionStatus>(() => {
    if (typeof window === 'undefined' || !isSupported.value) {
      return 'denied'
    }
    return (Notification.permission as PushPermissionStatus) || 'default'
  })

  const isAvailable = computed<boolean>(
    () => isInPWA.value && isSupported.value && permissionStatus.value === 'granted'
  )

  const isInitializing = computed<boolean>(() => _isInitializing.value)

  const error = computed<string | null>(() => _error.value)

  const registration = computed<ServiceWorkerRegistrationInfo | null>(() => _registration.value)

  const subscription = computed<PushSubscriptionInfo | null>(() => _subscription.value)

  /**
   * Request push notification permission from the user
   */
  async function requestPermission(): Promise<PushPermissionStatus> {
    if (!isSupported.value) {
      _error.value = 'Service workers are not supported in this browser'
      return 'denied'
    }

    try {
      const permission = await Notification.requestPermission()
      logger.debug('Push permission requested', { permission })
      return permission as PushPermissionStatus
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      _error.value = `Failed to request permission: ${message}`
      logger.error('Failed to request push permission', { error: message })
      return 'denied'
    }
  }

  /**
   * Initialize the service worker registration
   */
  async function initialize(): Promise<boolean> {
    if (_isInitializing.value) {
      logger.debug('Already initializing')
      return false
    }

    _isInitializing.value = true
    _error.value = null

    try {
      if (!isSupported.value) {
        throw new Error('Service workers are not supported in this browser')
      }

      if (!isInPWA.value) {
        logger.debug('Not running in PWA mode, but proceeding with SW registration')
      }

      // Register the service worker
      const reg = await navigator.serviceWorker.register(serviceWorkerPath, {
        scope: '/',
      })

      _registration.value = {
        scope: reg.scope,
        scriptURL: reg.active?.scriptURL ?? reg.installing?.scriptURL ?? '',
        state: reg.active?.state ?? reg.installing?.state ?? 'installed',
      }

      logger.debug('Service worker registered', { scope: reg.scope })

      // Set up push event listener
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reg.addEventListener('push', (event: any) => {
        logger.debug('Push event received', { hasData: !!event.data })
        if (options.onPush && event.data) {
          options.onPush(event)
        }
      })

      // Set up notification click listener
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reg.addEventListener('notificationclick', (event: any) => {
        logger.debug('Notification click received', { action: event.action })
        if (options.onNotificationClick) {
          options.onNotificationClick(event)
        }
      })

      // Check for existing subscription
      const existingSub = await reg.pushManager.getSubscription()
      if (existingSub) {
        _subscription.value = {
          endpoint: existingSub.endpoint,
          expirationTime: existingSub.expirationTime,
          keys: {
            p256dh: existingSub.toJSON().keys?.p256dh ?? '',
            auth: existingSub.toJSON().keys?.auth ?? '',
          },
        }
        logger.debug('Existing push subscription found', { endpoint: existingSub.endpoint })
      }

      _isInitializing.value = false
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      _error.value = `Initialization failed: ${message}`
      logger.error('Push notification initialization failed', { error: message })
      _isInitializing.value = false
      return false
    }
  }

  /**
   * Subscribe to push notifications
   */
  async function subscribe(): Promise<PushSubscriptionInfo | null> {
    if (!isSupported.value) {
      _error.value = 'Service workers are not supported'
      return null
    }

    if (!_registration.value) {
      const initialized = await initialize()
      if (!initialized) {
        return null
      }
    }

    if (permissionStatus.value !== 'granted') {
      const perm = await requestPermission()
      if (perm !== 'granted') {
        _error.value = 'Push permission not granted'
        return null
      }
    }

    try {
      // Get the VAPID public key from environment or use a default
      // In production, this should be configured via environment variables
      const vapidKey =
        typeof import.meta !== 'undefined'
          ? (import.meta as unknown as { env?: { VITE_VAPID_PUBLIC_KEY?: string } }).env
              ?.VITE_VAPID_PUBLIC_KEY
          : undefined

      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) {
        throw new Error('No service worker registration found')
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey ? urlBase64ToUint8Array(vapidKey) : undefined,
      })

      _subscription.value = {
        endpoint: sub.endpoint,
        expirationTime: sub.expirationTime,
        keys: {
          p256dh: sub.toJSON().keys?.p256dh ?? '',
          auth: sub.toJSON().keys?.auth ?? '',
        },
      }

      logger.debug('Push subscription created', { endpoint: sub.endpoint })
      return _subscription.value
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      _error.value = `Subscription failed: ${message}`
      logger.error('Push subscription failed', { error: message })
      return null
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async function unsubscribe(): Promise<boolean> {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) {
        logger.debug('No service worker registration to unsubscribe')
        _subscription.value = null
        return true
      }

      const sub = await reg.pushManager.getSubscription()
      if (!sub) {
        logger.debug('No active subscription to unsubscribe')
        _subscription.value = null
        return true
      }

      const success = await sub.unsubscribe()
      if (success) {
        _subscription.value = null
        logger.debug('Push subscription removed')
      }
      return success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      _error.value = `Unsubscribe failed: ${message}`
      logger.error('Push unsubscribe failed', { error: message })
      return false
    }
  }

  /**
   * Show a local notification (for testing)
   */
  async function showNotification(title: string, opts?: PushNotificationOptions): Promise<void> {
    if (!isSupported.value) {
      throw new Error('Service workers not supported')
    }

    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) {
      throw new Error('No service worker registration')
    }

    // Cast to NotificationOptions to satisfy ServiceWorkerRegistration.showNotification type
    // This is safe because PushNotificationOptions is designed to be compatible
    await reg.showNotification(title, {
      body: opts?.body,
      icon: opts?.icon ?? '/icon-192.png',
      badge: opts?.badge ?? '/badge-72.png',
      tag: opts?.tag,
      requireInteraction: opts?.requireInteraction,
      data: opts?.data,
      vibrate: opts?.vibrate,
      lang: opts?.lang,
      dir: opts?.dir,
      timestamp: opts?.timestamp,
      silent: opts?.silent,
      noscreen: opts?.noscreen,
      sticky: opts?.sticky,
      localOnly: opts?.localOnly,
      category: opts?.category,
      priority: opts?.priority,
    } as NotificationOptions)

    logger.debug('Notification shown', { title })
  }

  /**
   * Cleanup on scope dispose
   */
  function dispose(): void {
    _isInitializing.value = false
    _error.value = null
    // Note: We keep registration and subscription - they're managed separately
    logger.debug('usePushNotifications disposed')
  }

  if (getCurrentScope()) {
    onScopeDispose(dispose)
  }

  return {
    isInPWA,
    isSupported,
    permissionStatus,
    isAvailable,
    registration,
    subscription,
    isInitializing,
    error,
    initialize,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
  }
}

/**
 * Convert URL-safe base64 string to Uint8Array
 * Used for VAPID key conversion
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
