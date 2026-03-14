/**
 * VueSip Utilities
 *
 * Centralized export of all utility functions, constants, and helpers.
 *
 * @module utils
 */

// Re-export all constants
export * from './constants'

// Re-export all validators
export * from './validators'

// Re-export all formatters
export * from './formatters'

// Re-export logger
export * from './logger'

// Re-export encryption utilities
export * from './encryption'

// Re-export storage quota utilities
export * from './storageQuota'

// Re-export environment utilities
export * from './env'
export { isMobileDevice, isIOS, isAndroid, getBrowserName, getOS } from './env'

// Re-export E911 utilities
export * from './e911'

// Re-export DTMF utilities
export * from './dtmf'

// Re-export notification utilities
export * from './notifications'

// Re-export EventEmitter
export * from './EventEmitter'

// Re-export abort controller utilities
export * from './abortController'

// Re-export AMI helpers
export * from './ami-helpers'

// Re-export called identity utilities
export * from './calledIdentity'

// Re-export dialog info parser
export * from './dialogInfoParser'

// Re-export error context utilities
export {
  ErrorSeverity,
  type ErrorContext,
  type ErrorLogEntry,
  createErrorContext,
  formatError,
  createOperationTimer,
  sanitizeContext,
  extractErrorInfo,
  logErrorWithContext,
} from './errorContext'

// Re-export error helpers
export type { FormattedError } from './errorHelpers'
export {
  formatError as formatUnknownError,
  isPermissionDeniedError,
  isNotFoundError,
  isConstraintError,
} from './errorHelpers'

// Re-export diagnostics utilities
export * from './diagnostics'

// Re-export call diagnostics utilities
export * from './callDiagnostics'
