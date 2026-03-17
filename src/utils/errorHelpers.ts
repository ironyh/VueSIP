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

/**
 * Check if an error is a WebRTC error
 *
 * @param error - The error to check
 * @returns True if the error is a WebRTC-related error
 *
 * @example
 * ```typescript
 * try {
 *   await getUserMedia({ audio: true })
 * } catch (error) {
 *   if (isWebRtcError(error)) {
 *     console.log('WebRTC error:', error.message)
 *   }
 * }
 * ```
 */
export function isWebRtcError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const webrtcErrorNames = [
    'NotReadableError',
    'AbortError', // getUserMedia aborted
    'SourceUnavailable',
    'DevicesNotFoundError',
    'PermissionDeniedError',
    'NotAllowedError',
    'OverconstrainedError',
    'TypeError', // Often used for WebRTC constraint errors
  ]

  const message = error.message.toLowerCase()
  const name = error.name

  return (
    webrtcErrorNames.includes(name) ||
    message.includes('getusermedia') ||
    message.includes('webrtc') ||
    message.includes('peerconnection') ||
    message.includes('rtcpeerconnection') ||
    message.includes('media device') ||
    message.includes('audio') ||
    message.includes('video') ||
    message.includes('constraint')
  )
}

/**
 * Common SIP status codes for error detection
 */
const SIP_STATUS_CODES = {
  /** 4xx Client Errors */
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  GONE: 410,
  CONDITIONAL_REQUEST_FAILED: 412,
  REQUEST_ENTITY_TOO_LARGE: 413,
  REQUEST_URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNSUPPORTED_URI_SCHEME: 416,
  BAD_EXTENSION: 420,
  EXTENSION_REQUIRED: 421,
  SESSION_INTERVAL_TOO_SMALL: 422,
  SESSION_INTERVAL_TOO_BIG: 423,
  BROADCAST_NOT_ALLOWED: 482,
  ANONYMITY_DISALLOWED: 483,
  /** 5xx Server Errors */
  SERVER_INTERNAL_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  SERVER_TIMEOUT: 504,
  VERSION_NOT_SUPPORTED: 505,
  MESSAGE_TOO_LARGE: 513,
} as const

/**
 * Check if an error is a SIP status code error
 *
 * @param error - The error to check
 * @param statusCodes - Optional array of status codes to match (default: all 4xx and 5xx)
 * @returns True if the error contains a SIP status code
 *
 * @example
 * ```typescript
 * try {
 *   await makeCall('sip:friend@example.com')
 * } catch (error) {
 *   if (isSipStatusCodeError(error, [401, 403, 500])) {
 *     console.log('Auth or server error')
 *   }
 * }
 * ```
 */
export function isSipStatusCodeError(error: unknown, statusCodes?: number[]): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message
  const name = error.name

  // Check if error name contains a status code (e.g., "BadRequestError", "ServerError")
  const statusCodeMatch = name.match(/\b(\d{3})\b/)
  if (statusCodeMatch && statusCodeMatch[1]) {
    const code = parseInt(statusCodeMatch[1], 10)
    if (statusCodes) {
      return statusCodes.includes(code)
    }
    return code >= 400 && code < 600
  }

  // Check if message contains a status code
  const messageCodeMatch = message.match(/\b(4\d{2}|5\d{2})\b/)
  if (messageCodeMatch && messageCodeMatch[1]) {
    const code = parseInt(messageCodeMatch[1], 10)
    if (statusCodes) {
      return statusCodes.includes(code)
    }
    return true
  }

  // Check for specific status code patterns in message
  const statusCodePatterns = [
    ...Object.values(SIP_STATUS_CODES).map((code) => code.toString()),
    '400',
    '401',
    '402',
    '403',
    '404',
    '405',
    '406',
    '407',
    '408',
    '500',
    '501',
    '502',
    '503',
    '504',
    '505',
  ]

  for (const pattern of statusCodePatterns) {
    if (message.includes(pattern)) {
      if (statusCodes) {
        const code = parseInt(pattern, 10)
        return statusCodes.includes(code)
      }
      return true
    }
  }

  return false
}

/**
 * Checks if the error is a RangeError (e.g., invalid array length, number out of range)
 *
 * @param error - The error to check
 * @returns True if the error is a RangeError
 *
 * @example
 * ```typescript
 * try {
 *   const arr = new Array(-1)
 * } catch (e) {
 *   if (isRangeError(e)) {
 *     console.log('Invalid range:', e.message)
 *   }
 * }
 * ```
 */
export function isRangeError(error: unknown): boolean {
  return error instanceof RangeError
}

/**
 * Checks if the error is a SyntaxError (e.g., invalid JSON parsing, malformed input)
 *
 * @param error - The error to check
 * @returns True if the error is a SyntaxError
 *
 * @example
 * ```typescript
 * try {
 *   JSON.parse('invalid json')
 * } catch (e) {
 *   if (isSyntaxError(e)) {
 *     console.log('Syntax error:', e.message)
 *   }
 * }
 * ```
 */
export function isSyntaxError(error: unknown): boolean {
  return error instanceof SyntaxError
}

/**
 * Checks if the error is a ReferenceError (accessing undefined variable)
 *
 * @param error - The error to check
 * @returns True if the error is a ReferenceError
 *
 * @example
 * ```typescript
 * try {
 *   console.log(undefinedVar)
 * } catch (e) {
 *   if (isReferenceError(e)) {
 *     console.log('Undefined variable:', e.message)
 *   }
 * }
 * ```
 */
export function isReferenceError(error: unknown): boolean {
  return error instanceof ReferenceError
}

/**
 * Checks if the error is a DOM InvalidAccessError
 *
 * @param error - The error to check
 * @returns True if the error is an InvalidAccessError
 *
 * @example
 * ```typescript
 * try {
 *   // Operation that fails with InvalidAccessError
 * } catch (e) {
 *   if (isInvalidAccessError(e)) {
 *     console.log('Invalid access:', e.message)
 *   }
 * }
 * ```
 */
export function isInvalidAccessError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'InvalidAccessError'
}

/**
 * Checks if the error is a DataError (IndexedDB)
 *
 * @param error - The error to check
 * @returns True if the error is a DataError
 *
 * @example
 * ```typescript
 * try {
 *   // IndexedDB operation that fails
 * } catch (e) {
 *   if (isDataError(e)) {
 *     console.log('Data error:', e.message)
 *   }
 * }
 * ```
 */
export function isDataError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'DataError'
}

/**
 * Checks if the error is a NotAllowedError (permissions denied)
 *
 * @param error - The error to check
 * @returns True if the error is a NotAllowedError
 *
 * @example
 * ```typescript
 * try {
 *   await navigator.mediaDevices.getUserMedia({ audio: true })
 * } catch (e) {
 *   if (isNotAllowedError(e)) {
 *     console.log('Permission denied:', e.message)
 *   }
 * }
 * ```
 */
export function isNotAllowedError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotAllowedError'
}

/**
 * Checks if the error is a NotSupportedError
 *
 * @param error - The error to check
 * @returns True if the error is a NotSupportedError
 *
 * @example
 * ```typescript
 * try {
 *   // Operation not supported
 * } catch (e) {
 *   if (isNotSupportedError(e)) {
 *     console.log('Not supported:', e.message)
 *   }
 * }
 * ```
 */
export function isNotSupportedError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotSupportedError'
}
