/**
 * Notification Utilities
 *
 * Provides browser notification functionality for incoming calls.
 * Supports both standard Notifications API and Service Worker actions.
 *
 * @module utils/notifications
 */

/**
 * Information required to display an incoming call notification
 */
export type IncomingCallInfo = {
  /** Notification title (e.g., caller name or number) */
  title: string
  /** Notification body text */
  body: string
  /** Optional icon URL */
  icon?: string
  /** Optional call ID for tracking */
  callId?: string
}

/**
 * LocalStorage key for tracking if notifications are enabled
 */
const PERMISSION_KEY = 'vuesip_notifications_enabled'

/**
 * Check if notifications have been explicitly enabled by the user
 *
 * @returns True if notifications are enabled in localStorage
 *
 * @example
 * ```typescript
 * if (isNotificationsEnabled()) {
 *   showIncomingCallNotification({ title: 'Call', body: 'From: +1234567890' })
 * }
 * ```
 */
export function isNotificationsEnabled(): boolean {
  try {
    return localStorage.getItem(PERMISSION_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Set the notification enabled state in localStorage
 *
 * @param enabled - Whether to enable notifications
 *
 * @example
 * ```typescript
 * setNotificationsEnabled(true) // Enable notifications
 * ```
 */
export function setNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PERMISSION_KEY, enabled ? 'true' : 'false')
  } catch {
    // ignore storage errors
  }
}

/**
 * Ensure notification permission is granted
 *
 * Requests permission if not already granted. Only requests if userGesture
 * is true (browser security requirement).
 *
 * @param userGesture - Whether this was triggered by a user gesture (click, etc.)
 * @returns True if notifications are permitted
 *
 * @example
 * ```typescript
 * const allowed = await ensurePermission(true)
 * if (allowed) {
 *   showIncomingCallNotification({ title: 'Call', body: 'From: +1234567890' })
 * }
 * ```
 */
export async function ensurePermission(userGesture?: boolean): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  // Request only if we believe this was initiated by a gesture
  if (userGesture) {
    try {
      const result = await Notification.requestPermission()
      return result === 'granted'
    } catch {
      return false
    }
  }
  return false
}

/**
 * Show an incoming call notification using the standard Notifications API
 *
 * @param info - Call information to display
 * @returns True if notification was shown successfully
 *
 * @example
 * ```typescript
 * await ensurePermission(true)
 * await showIncomingCallNotification({
 *   title: 'Incoming Call',
 *   body: 'From: +1234567890',
 *   icon: '/phone-icon.png',
 *   callId: 'abc123'
 * })
 * ```
 */
export async function showIncomingCallNotification(info: IncomingCallInfo): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false
  try {
    const n = new Notification(info.title, {
      body: info.body,
      icon: info.icon,
      tag: 'incoming-call',
      requireInteraction: true,
    })
    n.onclick = () => {
      try {
        window.focus()
      } catch {
        /* no-op */
      }
      n.close()
    }
    return true
  } catch {
    return false
  }
}

/**
 * Get the Service Worker registration if available
 *
 * @returns ServiceWorkerRegistration or null if not available
 *
 * @example
 * ```typescript
 * const reg = await getSWRegistration()
 * if (reg) {
 *   console.log('SW registered:', reg.scope)
 * }
 * ```
 */
export async function getSWRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return (await navigator.serviceWorker.getRegistration()) || null
  } catch {
    return null
  }
}

/**
 * Show an incoming call notification with action buttons using Service Worker
 *
 * Provides Answer and Decline actions that can be handled by the Service Worker.
 *
 * @param info - Call information to display
 * @returns True if notification was shown successfully
 *
 * @example
 * ```typescript
 * await ensurePermission(true)
 * await showIncomingCallWithActions({
 *   title: 'Incoming Call',
 *   body: 'From: +1234567890',
 *   callId: 'abc123'
 * })
 * ```
 */
export async function showIncomingCallWithActions(info: IncomingCallInfo): Promise<boolean> {
  const reg = await getSWRegistration()
  if (!reg) return false
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false
  try {
    await reg.showNotification(info.title, {
      body: info.body,
      icon: info.icon,
      tag: 'incoming-call',
      requireInteraction: true,
      actions: [
        { action: 'answer', title: 'Answer' },
        { action: 'decline', title: 'Decline' },
      ],
      data: { callId: info.callId ?? null },
    } as NotificationOptions)
    return true
  } catch {
    return false
  }
}

/**
 * Notification strategy selection
 * - 'auto': Automatically choose best available option
 * - 'sw_actions': Use Service Worker with action buttons
 * - 'in_page': Use standard in-page notifications
 */
export type NotificationStrategy = 'auto' | 'sw_actions' | 'in_page'

/**
 * Configuration for NotificationManager
 */
export interface NotificationManagerConfig {
  /** Notification strategy to use */
  strategy?: NotificationStrategy
}

/**
 * Centralized Notification Manager
 *
 * Manages notification display with automatic strategy selection.
 * Automatically chooses between Service Worker actions and standard
 * notifications based on availability.
 *
 * @example
 * ```typescript
 * const manager = createNotificationManager({ strategy: 'auto' })
 *
 * await manager.ensurePermission(true)
 * await manager.notifyIncomingCall({
 *   title: 'Incoming Call',
 *   body: 'From: +1234567890',
 *   callId: 'abc123'
 * })
 * ```
 */
export class NotificationManager {
  private strategy: NotificationStrategy

  /**
   * Create a new NotificationManager
   *
   * @param cfg - Configuration options
   */
  constructor(cfg: NotificationManagerConfig = {}) {
    this.strategy = cfg.strategy ?? 'auto'
  }

  /**
   * Ensure notification permission is granted
   *
   * @param userGesture - Whether triggered by user gesture
   * @returns True if permissions granted
   */
  async ensurePermission(userGesture?: boolean): Promise<boolean> {
    return ensurePermission(userGesture)
  }

  /**
   * Display an incoming call notification
   *
   * Automatically selects the best strategy based on configuration
   * and availability.
   *
   * @param info - Call information to display
   * @returns True if notification shown successfully
   */
  async notifyIncomingCall(info: IncomingCallInfo): Promise<boolean> {
    const strat = await this.resolveStrategy()
    if (strat === 'sw_actions') return showIncomingCallWithActions(info)
    return showIncomingCallNotification(info)
  }

  /**
   * Resolve the actual strategy to use based on availability
   *
   * @returns The resolved notification strategy
   */
  private async resolveStrategy(): Promise<NotificationStrategy> {
    if (this.strategy === 'in_page') return 'in_page'
    if (this.strategy === 'sw_actions') {
      const reg = await getSWRegistration()
      return reg ? 'sw_actions' : 'in_page'
    }
    // auto: prefer SW actions if SW registered and permission granted
    const reg = await getSWRegistration()
    if (
      reg &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      return 'sw_actions'
    }
    return 'in_page'
  }
}

/**
 * Create a new NotificationManager instance
 *
 * @param cfg - Configuration options
 * @returns Configured NotificationManager instance
 *
 * @example
 * ```typescript
 * const manager = createNotificationManager()
 * await manager.ensurePermission(true)
 * ```
 */
export function createNotificationManager(cfg?: NotificationManagerConfig): NotificationManager {
  return new NotificationManager(cfg)
}
