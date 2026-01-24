/**
 * useNotifications - Toast/notification system for surfacing errors and recovery status
 *
 * Provides a reactive notification queue with auto-dismiss, priority ordering,
 * and action buttons. This is the data/logic layer - UI components consume
 * the reactive state separately.
 *
 * @packageDocumentation
 */

import { ref, computed, getCurrentScope, onScopeDispose, type ComputedRef } from 'vue'
import { createLogger } from '@/utils/logger'
import { NOTIFICATION_CONSTANTS } from './constants'

const logger = createLogger('useNotifications')

/**
 * Notification severity/type levels
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'recovery'

/**
 * Notification position on screen (consumed by UI layer)
 */
export type NotificationPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center'

/**
 * Action button attached to a notification
 */
export interface NotificationAction {
  /** Button label text */
  label: string
  /** Click handler */
  handler: () => void
}

/**
 * A single notification entry
 */
export interface Notification {
  /** Unique identifier */
  id: string
  /** Notification severity type */
  type: NotificationType
  /** Short title */
  title: string
  /** Detailed message */
  message: string
  /** Creation timestamp (ms since epoch) */
  timestamp: number
  /** Auto-dismiss duration in ms; 0 = persistent */
  duration: number
  /** Whether user can manually dismiss */
  dismissible: boolean
  /** Optional action button */
  action?: NotificationAction
  /** Whether notification has been read/acknowledged */
  read: boolean
}

/**
 * Options for creating a notification
 */
export interface NotifyOptions {
  /** Notification type (default: 'info') */
  type?: NotificationType
  /** Short title */
  title: string
  /** Detailed message */
  message: string
  /** Auto-dismiss duration in ms; 0 = persistent (uses type-based default if omitted) */
  duration?: number
  /** Whether user can dismiss (default: true) */
  dismissible?: boolean
  /** Optional action button */
  action?: NotificationAction
}

/**
 * Configuration options for the notification system
 */
export interface NotificationOptions {
  /** Maximum number of notifications to keep in queue (default: 10) */
  maxNotifications?: number
  /** Default auto-dismiss duration in ms (default: 5000) */
  defaultDuration?: number
  /** Display position hint for UI layer (default: 'top-right') */
  position?: NotificationPosition
}

/**
 * Return type for useNotifications composable
 */
export interface UseNotificationsReturn {
  /** Reactive list of active notifications (priority-sorted) */
  notifications: ComputedRef<Notification[]>
  /** Whether there are any notifications */
  hasNotifications: ComputedRef<boolean>
  /** Count of unread notifications */
  unreadCount: ComputedRef<number>
  /** Configured position */
  position: ComputedRef<NotificationPosition>

  /** Add a notification, returns its ID */
  notify: (options: NotifyOptions) => string
  /** Remove a specific notification by ID */
  dismiss: (id: string) => void
  /** Remove all notifications */
  dismissAll: () => void
  /** Mark a notification as read */
  markRead: (id: string) => void
  /** Mark all notifications as read */
  markAllRead: () => void

  /** Shortcut: info notification */
  info: (title: string, message: string, action?: NotificationAction) => string
  /** Shortcut: success notification */
  success: (title: string, message: string, action?: NotificationAction) => string
  /** Shortcut: warning notification */
  warning: (title: string, message: string, action?: NotificationAction) => string
  /** Shortcut: error notification */
  error: (title: string, message: string, action?: NotificationAction) => string
  /** Shortcut: recovery notification */
  recovery: (title: string, message: string, action?: NotificationAction) => string
}

const TYPE_PRIORITY: Record<NotificationType, number> = {
  success: 1,
  info: 2,
  warning: 3,
  recovery: 4,
  error: 5,
}

const TYPE_DEFAULT_DURATIONS: Record<NotificationType, number> = {
  info: NOTIFICATION_CONSTANTS.DEFAULT_DURATION,
  success: NOTIFICATION_CONSTANTS.SUCCESS_DURATION,
  warning: NOTIFICATION_CONSTANTS.WARNING_DURATION,
  error: NOTIFICATION_CONSTANTS.ERROR_DURATION,
  recovery: NOTIFICATION_CONSTANTS.RECOVERY_DURATION,
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Composable for managing a reactive notification queue
 *
 * @param options - Configuration options
 * @returns Notification state and methods
 *
 * @example
 * ```ts
 * const { notifications, notify, dismiss, error, recovery } = useNotifications()
 *
 * // Add a notification
 * const id = notify({ type: 'warning', title: 'Low quality', message: 'Call quality degraded' })
 *
 * // Use shortcuts
 * error('Call Failed', 'Unable to connect to remote party')
 * recovery('Reconnecting', 'Attempting to restore connection...')
 *
 * // Dismiss
 * dismiss(id)
 * ```
 */
export function useNotifications(options: NotificationOptions = {}): UseNotificationsReturn {
  const maxNotifications = options.maxNotifications ?? NOTIFICATION_CONSTANTS.MAX_NOTIFICATIONS
  const defaultDuration = options.defaultDuration ?? NOTIFICATION_CONSTANTS.DEFAULT_DURATION
  const configuredPosition = options.position ?? 'top-right'

  const notificationList = ref<Notification[]>([])
  const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>()

  const notifications = computed<Notification[]>(() => {
    return [...notificationList.value].sort((a, b) => {
      const priorityDiff = TYPE_PRIORITY[b.type] - TYPE_PRIORITY[a.type]
      if (priorityDiff !== 0) return priorityDiff
      return b.timestamp - a.timestamp
    })
  })

  const hasNotifications = computed<boolean>(() => notificationList.value.length > 0)

  const unreadCount = computed<number>(() => notificationList.value.filter((n) => !n.read).length)

  const position = computed<NotificationPosition>(() => configuredPosition)

  function clearDismissTimer(id: string): void {
    const timer = dismissTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      dismissTimers.delete(id)
    }
  }

  function scheduleDismiss(id: string, duration: number): void {
    if (duration <= 0) return

    const timer = setTimeout(() => {
      dismissTimers.delete(id)
      dismiss(id)
    }, duration)

    dismissTimers.set(id, timer)
  }

  function notify(opts: NotifyOptions): string {
    const type = opts.type ?? 'info'
    const duration = opts.duration ?? TYPE_DEFAULT_DURATIONS[type] ?? defaultDuration
    const id = generateId()

    const notification: Notification = {
      id,
      type,
      title: opts.title,
      message: opts.message,
      timestamp: Date.now(),
      duration,
      dismissible: opts.dismissible ?? true,
      action: opts.action,
      read: false,
    }

    if (notificationList.value.length >= maxNotifications) {
      const sorted = [...notificationList.value].sort((a, b) => {
        const priorityDiff = TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]
        if (priorityDiff !== 0) return priorityDiff
        return a.timestamp - b.timestamp
      })
      const evictTarget = sorted[0]
      if (evictTarget) {
        dismiss(evictTarget.id)
      }
    }

    notificationList.value = [...notificationList.value, notification]
    scheduleDismiss(id, duration)

    logger.debug('Notification added', { id, type, title: opts.title })
    return id
  }

  function dismiss(id: string): void {
    clearDismissTimer(id)
    const prev = notificationList.value.length
    notificationList.value = notificationList.value.filter((n) => n.id !== id)
    if (notificationList.value.length < prev) {
      logger.debug('Notification dismissed', { id })
    }
  }

  function dismissAll(): void {
    for (const [id] of dismissTimers) {
      clearDismissTimer(id)
    }
    notificationList.value = []
    logger.debug('All notifications dismissed')
  }

  function markRead(id: string): void {
    notificationList.value = notificationList.value.map((n) =>
      n.id === id ? { ...n, read: true } : n
    )
  }

  function markAllRead(): void {
    notificationList.value = notificationList.value.map((n) => (n.read ? n : { ...n, read: true }))
  }

  function info(title: string, message: string, action?: NotificationAction): string {
    return notify({ type: 'info', title, message, action })
  }

  function success(title: string, message: string, action?: NotificationAction): string {
    return notify({ type: 'success', title, message, action })
  }

  function warning(title: string, message: string, action?: NotificationAction): string {
    return notify({ type: 'warning', title, message, action })
  }

  function errorNotify(title: string, message: string, action?: NotificationAction): string {
    return notify({ type: 'error', title, message, action })
  }

  function recovery(title: string, message: string, action?: NotificationAction): string {
    return notify({ type: 'recovery', title, message, action })
  }

  function dispose(): void {
    for (const [id] of dismissTimers) {
      clearDismissTimer(id)
    }
    dismissTimers.clear()
    notificationList.value = []
    logger.debug('Notifications composable disposed')
  }

  if (getCurrentScope()) {
    onScopeDispose(dispose)
  }

  return {
    notifications,
    hasNotifications,
    unreadCount,
    position,
    notify,
    dismiss,
    dismissAll,
    markRead,
    markAllRead,
    info,
    success,
    warning,
    error: errorNotify,
    recovery,
  }
}
