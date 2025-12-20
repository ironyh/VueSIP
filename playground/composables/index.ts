/**
 * Playground Composables
 *
 * Reusable Vue composables for the VueSIP playground application.
 */

export { useErrorNotifications } from './useErrorNotifications'
export type {
  ErrorCategory,
  ErrorSeverity,
  ErrorNotification,
} from './useErrorNotifications'

export { useConnectionManager } from './useConnectionManager'
export type {
  SavedConnection,
  ConnectionManagerState,
  ConnectionManager,
} from './useConnectionManager'
