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
 *   logger.error('Failed to get media', formatUnknownError(error))
 * }
 * ```
 */
export function formatUnknownError(error: unknown): FormattedError {
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

/**
 * Check if an error is a network error
 *
 * @param error - The error to check
 * @returns True if the error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.name === 'NetworkError' ||
    error.name === 'TypeError' ||
    error.message.toLowerCase().includes('network') ||
    error.message.toLowerCase().includes('fetch') ||
    error.message.toLowerCase().includes('connection')
  )
}

/**
 * Check if an error is a SIP session error
 *
 * @param error - The error to check
 * @returns True if the error is a SIP session error
 */
export function isSessionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const sessionErrorNames = [
    'RequestTimeout',
    'SessionDescriptionHandlerError',
    'InviteClientError',
    'ServerError',
    'BadRequestError',
    'NotAcceptableError',
    'UnsupportedError',
  ]

  const message = error.message.toLowerCase()

  return (
    sessionErrorNames.some((name) => error.name === name) ||
    message.includes('session') ||
    message.includes('invite') ||
    message.includes('byedone') ||
    message.includes('prack') ||
    message.includes('ack')
  )
}

/**
 * Check if an error is a transport/WebSocket error
 *
 * @param error - The error to check
 * @returns True if the error is a transport error
 */
export function isTransportError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const transportErrorNames = ['TransportError', 'WebSocketError', 'ConnectionError', 'SocketError']

  const message = error.message.toLowerCase()

  return (
    transportErrorNames.some((name) => error.name === name) ||
    message.includes('websocket') ||
    message.includes('transport') ||
    message.includes('sip/tls') ||
    message.includes('tls handshake')
  )
}

/**
 * Check if an error is an authentication/authorization error
 *
 * @param error - The error to check
 * @returns True if the error is an authentication error
 */
export function isAuthenticationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const authErrorNames = [
    'Unauthorized',
    'Forbidden',
    'AuthenticationError',
    'InvalidCredentialsError',
  ]

  const message = error.message.toLowerCase()

  return (
    authErrorNames.some((name) => error.name === name) ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('authentication') ||
    message.includes('credentials') ||
    message.includes('401') ||
    message.includes('403')
  )
}

/**
 * Check if an error is a timeout error
 *
 * @param error - The error to check
 * @returns True if the error is a timeout error
 *
 * @example
 * ```typescript
 * try {
 *   await fetch('/api/endpoint', { signal: AbortSignal.timeout(5000) })
 * } catch (error) {
 *   if (isTimeoutError(error)) {
 *     console.log('Request timed out')
 *   }
 * }
 * ```
 */
export function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const timeoutErrorNames = [
    'TimeoutError',
    'AbortError', // AbortError can also indicate timeout in some contexts
    'RequestTimeout',
    'GatewayTimeout',
  ]

  const message = error.message.toLowerCase()

  return (
    timeoutErrorNames.some((name) => error.name === name) ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('deadline exceeded')
  )
}
