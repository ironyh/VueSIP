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
export type { SimpleValidationResult } from './validators'

// Re-export all formatters
export * from './formatters'

// Re-export logger
export * from './logger'

// Re-export encryption utilities
export * from './encryption'
export { sanitizeForLogs } from './encryption'

// Re-export storage quota utilities
export * from './storageQuota'

// Re-export environment utilities
export * from './env'

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
  formatUnknownError,
  isPermissionDeniedError,
  isNotFoundError,
  isConstraintError,
  isNetworkError,
  isSessionError,
  isTransportError,
  isAuthenticationError,
  isTimeoutError,
  isWebRtcError,
  isSipStatusCodeError,
  isRangeError,
  isSyntaxError,
  isReferenceError,
  isInvalidAccessError,
  isDataError,
  isNotAllowedError,
  isNotSupportedError,
} from './errorHelpers'

// Re-export diagnostics utilities
export * from './diagnostics'

// Re-export call diagnostics utilities
export * from './callDiagnostics'

// Re-export call quality history utilities
export * from './callQualityHistory'

// Re-export quality report utilities
export * from './qualityReport'

// Re-export SIP URI utilities
export * from './sipUri'
