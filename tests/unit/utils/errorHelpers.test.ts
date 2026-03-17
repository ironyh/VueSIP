/**
 * Error helpers utility tests
 */

import { describe, it, expect } from 'vitest'
import {
  formatUnknownError,
  isPermissionDeniedError,
  isNotFoundError,
  isConstraintError,
  isNetworkError,
  isSessionError,
  isTransportError,
  isAuthenticationError,
} from '@/utils/errorHelpers'

describe('errorHelpers', () => {
  describe('formatUnknownError', () => {
    it('should format standard Error instances', () => {
      const error = new Error('Test error message')
      error.name = 'TestError'

      const formatted = formatUnknownError(error)

      expect(formatted.message).toBe('Test error message')
      expect(formatted.name).toBe('TestError')
      expect(formatted.stack).toBeDefined()
    })

    it('should include code property for DOMException-like errors', () => {
      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'
      ;(error as any).code = 20

      const formatted = formatUnknownError(error)

      expect(formatted.message).toBe('Permission denied')
      expect(formatted.name).toBe('NotAllowedError')
      expect(formatted.code).toBe(20)
    })

    it('should format string errors', () => {
      const error = 'Simple error string'

      const formatted = formatUnknownError(error)

      expect(formatted.message).toBe('Simple error string')
      expect(formatted.name).toBe('StringError')
      expect(formatted.stack).toBeUndefined()
      expect(formatted.code).toBeUndefined()
    })

    it('should format objects with message property', () => {
      const error = {
        message: 'Custom error message',
        name: 'CustomError',
        code: 'ERR_CUSTOM',
      }

      const formatted = formatUnknownError(error)

      expect(formatted.message).toBe('Custom error message')
      expect(formatted.name).toBe('CustomError')
      expect(formatted.code).toBe('ERR_CUSTOM')
    })

    it('should format objects with message but no name', () => {
      const error = {
        message: 'Error without name',
      }

      const formatted = formatUnknownError(error)

      expect(formatted.message).toBe('Error without name')
      expect(formatted.name).toBe('UnknownError')
      expect(formatted.code).toBeUndefined()
    })

    it('should format objects with message and numeric code', () => {
      const error = {
        message: 'Numeric code error',
        code: 404,
      }

      const formatted = formatUnknownError(error)

      expect(formatted.message).toBe('Numeric code error')
      expect(formatted.name).toBe('UnknownError')
      expect(formatted.code).toBe(404)
    })

    it('should handle completely unknown error types', () => {
      const error = 123 // number

      const formatted = formatUnknownError(error)

      expect(formatted.message).toBe('123')
      expect(formatted.name).toBe('UnknownError')
      expect(formatted.stack).toBeUndefined()
      expect(formatted.code).toBeUndefined()
    })

    it('should handle null as unknown error', () => {
      const error = null

      const formatted = formatUnknownError(error)

      expect(formatted.message).toBe('null')
      expect(formatted.name).toBe('UnknownError')
    })

    it('should handle undefined as unknown error', () => {
      const error = undefined

      const formatted = formatUnknownError(error)

      expect(formatted.message).toBe('undefined')
      expect(formatted.name).toBe('UnknownError')
    })

    it('should handle objects without message property', () => {
      const error = { foo: 'bar', baz: 123 }

      const formatted = formatUnknownError(error)

      expect(formatted.message).toBe('[object Object]')
      expect(formatted.name).toBe('UnknownError')
    })

    it('should preserve stack trace from Error instances', () => {
      const error = new Error('Error with stack')
      const formatted = formatUnknownError(error)

      expect(formatted.stack).toBeTruthy()
      expect(formatted.stack).toContain('Error')
    })
  })

  describe('isPermissionDeniedError', () => {
    it('should return true for NotAllowedError', () => {
      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'

      expect(isPermissionDeniedError(error)).toBe(true)
    })

    it('should return true for PermissionDeniedError', () => {
      const error = new Error('Permission denied')
      error.name = 'PermissionDeniedError'

      expect(isPermissionDeniedError(error)).toBe(true)
    })

    it('should return true for SecurityError', () => {
      const error = new Error('Security error')
      error.name = 'SecurityError'

      expect(isPermissionDeniedError(error)).toBe(true)
    })

    it('should return false for other error names', () => {
      const error = new Error('Some other error')
      error.name = 'OtherError'

      expect(isPermissionDeniedError(error)).toBe(false)
    })

    it('should return false for non-Error objects', () => {
      expect(isPermissionDeniedError('NotAllowedError')).toBe(false)
      expect(isPermissionDeniedError({ name: 'NotAllowedError' })).toBe(false)
      expect(isPermissionDeniedError(null)).toBe(false)
      expect(isPermissionDeniedError(undefined)).toBe(false)
      expect(isPermissionDeniedError(123)).toBe(false)
    })
  })

  describe('isNotFoundError', () => {
    it('should return true for NotFoundError', () => {
      const error = new Error('Not found')
      error.name = 'NotFoundError'

      expect(isNotFoundError(error)).toBe(true)
    })

    it('should return true for DevicesNotFoundError', () => {
      const error = new Error('Devices not found')
      error.name = 'DevicesNotFoundError'

      expect(isNotFoundError(error)).toBe(true)
    })

    it('should return false for other error names', () => {
      const error = new Error('Some other error')
      error.name = 'OtherError'

      expect(isNotFoundError(error)).toBe(false)
    })

    it('should return false for permission errors', () => {
      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'

      expect(isNotFoundError(error)).toBe(false)
    })

    it('should return false for non-Error objects', () => {
      expect(isNotFoundError('NotFoundError')).toBe(false)
      expect(isNotFoundError({ name: 'NotFoundError' })).toBe(false)
      expect(isNotFoundError(null)).toBe(false)
      expect(isNotFoundError(undefined)).toBe(false)
      expect(isNotFoundError(123)).toBe(false)
    })
  })

  describe('isConstraintError', () => {
    it('should return true for OverconstrainedError', () => {
      const error = new Error('Overconstrained')
      error.name = 'OverconstrainedError'

      expect(isConstraintError(error)).toBe(true)
    })

    it('should return true for ConstraintNotSatisfiedError', () => {
      const error = new Error('Constraint not satisfied')
      error.name = 'ConstraintNotSatisfiedError'

      expect(isConstraintError(error)).toBe(true)
    })

    it('should return true for NotReadableError', () => {
      const error = new Error('Not readable')
      error.name = 'NotReadableError'

      expect(isConstraintError(error)).toBe(true)
    })

    it('should return false for other error names', () => {
      const error = new Error('Some other error')
      error.name = 'OtherError'

      expect(isConstraintError(error)).toBe(false)
    })

    it('should return false for permission errors', () => {
      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'

      expect(isConstraintError(error)).toBe(false)
    })

    it('should return false for not found errors', () => {
      const error = new Error('Not found')
      error.name = 'NotFoundError'

      expect(isConstraintError(error)).toBe(false)
    })

    it('should return false for non-Error objects', () => {
      expect(isConstraintError('OverconstrainedError')).toBe(false)
      expect(isConstraintError({ name: 'OverconstrainedError' })).toBe(false)
      expect(isConstraintError(null)).toBe(false)
      expect(isConstraintError(undefined)).toBe(false)
      expect(isConstraintError(123)).toBe(false)
    })
  })

  describe('isNetworkError', () => {
    it('should return true for NetworkError', () => {
      const error = new Error('Network failure')
      error.name = 'NetworkError'

      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true for TypeError', () => {
      const error = new TypeError('Type error')

      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true when message includes "network"', () => {
      const error = new Error('Network connection lost')

      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true when message includes "fetch"', () => {
      const error = new Error('Failed to fetch resource')

      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true when message includes "connection"', () => {
      const error = new Error('Connection refused')

      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true for case-insensitive message matching', () => {
      const error = new Error('NETWORK FAILURE')

      expect(isNetworkError(error)).toBe(true)
    })

    it('should return false for other errors without network-related message', () => {
      const error = new Error('Something went wrong')
      error.name = 'OtherError'

      expect(isNetworkError(error)).toBe(false)
    })

    it('should return false for permission errors', () => {
      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'

      expect(isNetworkError(error)).toBe(false)
    })

    it('should return false for not found errors', () => {
      const error = new Error('Not found')
      error.name = 'NotFoundError'

      expect(isNetworkError(error)).toBe(false)
    })

    it('should return false for non-Error objects', () => {
      expect(isNetworkError('string')).toBe(false)
      expect(isNetworkError({ message: 'Network error' })).toBe(false)
      expect(isNetworkError(null)).toBe(false)
      expect(isNetworkError(undefined)).toBe(false)
      expect(isNetworkError(42)).toBe(false)
    })
  })

  describe('isSessionError', () => {
    it('should return true for RequestTimeout', () => {
      const error = new Error('Request timeout')
      error.name = 'RequestTimeout'

      expect(isSessionError(error)).toBe(true)
    })

    it('should return true for SessionDescriptionHandlerError', () => {
      const error = new Error('SDP error')
      error.name = 'SessionDescriptionHandlerError'

      expect(isSessionError(error)).toBe(true)
    })

    it('should return true for InviteClientError', () => {
      const error = new Error('Invite failed')
      error.name = 'InviteClientError'

      expect(isSessionError(error)).toBe(true)
    })

    it('should return true for ServerError', () => {
      const error = new Error('Server error')
      error.name = 'ServerError'

      expect(isSessionError(error)).toBe(true)
    })

    it('should return true for BadRequestError', () => {
      const error = new Error('Bad request')
      error.name = 'BadRequestError'

      expect(isSessionError(error)).toBe(true)
    })

    it('should return true for NotAcceptableError', () => {
      const error = new Error('Not acceptable')
      error.name = 'NotAcceptableError'

      expect(isSessionError(error)).toBe(true)
    })

    it('should return true for UnsupportedError', () => {
      const error = new Error('Not supported')
      error.name = 'UnsupportedError'

      expect(isSessionError(error)).toBe(true)
    })

    it('should return true when message includes "session"', () => {
      const error = new Error('Session terminated unexpectedly')

      expect(isSessionError(error)).toBe(true)
    })

    it('should return true when message includes "invite"', () => {
      const error = new Error('Invite transaction failed')

      expect(isSessionError(error)).toBe(true)
    })

    it('should return true when message includes "byedone"', () => {
      const error = new Error('byedone received')

      expect(isSessionError(error)).toBe(true)
    })

    it('should return true when message includes "prack"', () => {
      const error = new Error('PRACK failed')

      expect(isSessionError(error)).toBe(true)
    })

    it('should return true when message includes "ack"', () => {
      const error = new Error('ACK not received')

      expect(isSessionError(error)).toBe(true)
    })

    it('should return false for other errors without session-related message', () => {
      const error = new Error('Something went wrong')
      error.name = 'OtherError'

      expect(isSessionError(error)).toBe(false)
    })

    it('should return false for permission errors', () => {
      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'

      expect(isSessionError(error)).toBe(false)
    })

    it('should return false for non-Error objects', () => {
      expect(isSessionError('string')).toBe(false)
      expect(isSessionError({ message: 'Session error' })).toBe(false)
      expect(isSessionError(null)).toBe(false)
      expect(isSessionError(undefined)).toBe(false)
      expect(isSessionError(42)).toBe(false)
    })
  })

  describe('isTransportError', () => {
    it('should return true for TransportError', () => {
      const error = new Error('Transport failed')
      error.name = 'TransportError'

      expect(isTransportError(error)).toBe(true)
    })

    it('should return true for WebSocketError', () => {
      const error = new Error('WebSocket error')
      error.name = 'WebSocketError'

      expect(isTransportError(error)).toBe(true)
    })

    it('should return true for ConnectionError', () => {
      const error = new Error('Connection failed')
      error.name = 'ConnectionError'

      expect(isTransportError(error)).toBe(true)
    })

    it('should return true for SocketError', () => {
      const error = new Error('Socket error')
      error.name = 'SocketError'

      expect(isTransportError(error)).toBe(true)
    })

    it('should return true when message includes "websocket"', () => {
      const error = new Error('WebSocket connection closed')

      expect(isTransportError(error)).toBe(true)
    })

    it('should return true when message includes "transport"', () => {
      const error = new Error('Transport layer error')

      expect(isTransportError(error)).toBe(true)
    })

    it('should return true when message includes "sip/tls"', () => {
      const error = new Error('SIP/TLS connection failed')

      expect(isTransportError(error)).toBe(true)
    })

    it('should return true when message includes "tls handshake"', () => {
      const error = new Error('TLS handshake timeout')

      expect(isTransportError(error)).toBe(true)
    })

    it('should return false for other errors without transport-related message', () => {
      const error = new Error('Something went wrong')
      error.name = 'OtherError'

      expect(isTransportError(error)).toBe(false)
    })

    it('should return false for session errors', () => {
      const error = new Error('Session terminated')
      error.name = 'RequestTimeout'

      expect(isTransportError(error)).toBe(false)
    })

    it('should return false for non-Error objects', () => {
      expect(isTransportError('string')).toBe(false)
      expect(isTransportError({ message: 'Transport error' })).toBe(false)
      expect(isTransportError(null)).toBe(false)
      expect(isTransportError(undefined)).toBe(false)
      expect(isTransportError(42)).toBe(false)
    })
  })

  describe('isAuthenticationError', () => {
    it('should return true for Unauthorized', () => {
      const error = new Error('Unauthorized')
      error.name = 'Unauthorized'

      expect(isAuthenticationError(error)).toBe(true)
    })

    it('should return true for Forbidden', () => {
      const error = new Error('Forbidden')
      error.name = 'Forbidden'

      expect(isAuthenticationError(error)).toBe(true)
    })

    it('should return true for AuthenticationError', () => {
      const error = new Error('Authentication failed')
      error.name = 'AuthenticationError'

      expect(isAuthenticationError(error)).toBe(true)
    })

    it('should return true for InvalidCredentialsError', () => {
      const error = new Error('Invalid credentials')
      error.name = 'InvalidCredentialsError'

      expect(isAuthenticationError(error)).toBe(true)
    })

    it('should return true when message includes "unauthorized"', () => {
      const error = new Error('User is unauthorized')

      expect(isAuthenticationError(error)).toBe(true)
    })

    it('should return true when message includes "forbidden"', () => {
      const error = new Error('Access forbidden')

      expect(isAuthenticationError(error)).toBe(true)
    })

    it('should return true when message includes "authentication"', () => {
      const error = new Error('Authentication required')

      expect(isAuthenticationError(error)).toBe(true)
    })

    it('should return true when message includes "credentials"', () => {
      const error = new Error('Invalid credentials provided')

      expect(isAuthenticationError(error)).toBe(true)
    })

    it('should return true when message includes "401"', () => {
      const error = new Error('HTTP 401 Unauthorized')

      expect(isAuthenticationError(error)).toBe(true)
    })

    it('should return true when message includes "403"', () => {
      const error = new Error('HTTP 403 Forbidden')

      expect(isAuthenticationError(error)).toBe(true)
    })

    it('should return false for other errors without auth-related message', () => {
      const error = new Error('Something went wrong')
      error.name = 'OtherError'

      expect(isAuthenticationError(error)).toBe(false)
    })

    it('should return false for session errors', () => {
      const error = new Error('Session timeout')
      error.name = 'RequestTimeout'

      expect(isAuthenticationError(error)).toBe(false)
    })

    it('should return false for non-Error objects', () => {
      expect(isAuthenticationError('string')).toBe(false)
      expect(isAuthenticationError({ message: 'Auth error' })).toBe(false)
      expect(isAuthenticationError(null)).toBe(false)
      expect(isAuthenticationError(undefined)).toBe(false)
      expect(isAuthenticationError(42)).toBe(false)
    })
  })

  describe('Edge cases and integration', () => {
    it('should handle Error subclasses correctly', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }

      const error = new CustomError('Custom error message')
      const formatted = formatUnknownError(error)

      expect(formatted.message).toBe('Custom error message')
      expect(formatted.name).toBe('CustomError')
      expect(formatted.stack).toBeDefined()
    })

    it('should format then classify permission errors', () => {
      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'

      const formatted = formatUnknownError(error)
      expect(formatted.name).toBe('NotAllowedError')
      expect(isPermissionDeniedError(error)).toBe(true)
      expect(isNotFoundError(error)).toBe(false)
      expect(isConstraintError(error)).toBe(false)
    })

    it('should format then classify not found errors', () => {
      const error = new Error('Device not found')
      error.name = 'DevicesNotFoundError'

      const formatted = formatUnknownError(error)
      expect(formatted.name).toBe('DevicesNotFoundError')
      expect(isPermissionDeniedError(error)).toBe(false)
      expect(isNotFoundError(error)).toBe(true)
      expect(isConstraintError(error)).toBe(false)
    })

    it('should format then classify constraint errors', () => {
      const error = new Error('Constraints not satisfied')
      error.name = 'OverconstrainedError'

      const formatted = formatUnknownError(error)
      expect(formatted.name).toBe('OverconstrainedError')
      expect(isPermissionDeniedError(error)).toBe(false)
      expect(isNotFoundError(error)).toBe(false)
      expect(isConstraintError(error)).toBe(true)
    })
  })
})
