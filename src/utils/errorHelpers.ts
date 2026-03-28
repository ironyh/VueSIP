/**
 * Error handling utilities
 * @packageDocumentation
 */

/**
 * Formatted error information
 */
export interface FormattedError {
  /** Error message */
  message: string
  /** Error name/type */
  name: string
  /** Stack trace if available */
  stack?: string
  /** Error code if available (from DOMException, etc.) */
  code?: string | number
}

/**
 * Format an unknown error into a structured object
 * Handles Error instances, DOMExceptions, and unknown values
 *
 * @param error - The error to format
 * @returns Formatted error information
 *
 * @example
 * ```ts
 * try {
 *   await getUserMedia()
 * } catch (error: unknown) {
 *   logger.error('Failed to get media', formatError(error))
 * }
 * ```
 */
export function formatError(error: unknown): FormattedError {
  // Handle standard Error instances
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      // DOMException and other error types may have a code property
      code: (error as unknown as { code?: string | number }).code,
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      name: 'StringError',
    }
  }

  // Handle objects with message property
  if (error && typeof error === 'object' && 'message' in error) {
    return {
      message: String(error.message),
      name: 'name' in error ? String(error.name) : 'UnknownError',
      code: 'code' in error ? (error.code as string | number) : undefined,
    }
  }

  // Fallback for completely unknown error types
  return {
    message: String(error),
    name: 'UnknownError',
  }
}

/**
 * Check if an error is a permission denied error
 *
 * @param error - The error to check
 * @returns True if the error is a permission denied error
 */
export function isPermissionDeniedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.name === 'NotAllowedError' ||
    error.name === 'PermissionDeniedError' ||
    error.name === 'SecurityError'
  )
}

/**
 * Check if an error is a not found error
 *
 * @param error - The error to check
 * @returns True if the error is a not found error
 */
export function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError'
}

/**
 * Check if an error is a constraint error
 *
 * @param error - The error to check
 * @returns True if the error is a constraint error
 */
export function isConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.name === 'OverconstrainedError' ||
    error.name === 'ConstraintNotSatisfiedError' ||
    error.name === 'NotReadableError'
  )
}
