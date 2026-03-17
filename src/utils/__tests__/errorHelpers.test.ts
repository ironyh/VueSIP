/**
 * @vitest-environment jsdom
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
} from '../errorHelpers'

describe('errorHelpers', () => {
  describe('formatUnknownError', () => {
    it('should format a standard Error', () => {
      const error = new Error('Test error message')
      const result = formatUnknownError(error)

      expect(result.message).toBe('Test error message')
      expect(result.name).toBe('Error')
      expect(result.stack).toBeDefined()
    })

    it('should format a DOMException with code', () => {
      const error = new DOMException('Permission denied', 'NotAllowedError')
      const result = formatUnknownError(error)

      expect(result.message).toBe('Permission denied')
      expect(result.name).toBe('NotAllowedError')
      expect(result.code).toBeDefined()
    })

    it('should format a string error', () => {
      const result = formatUnknownError('Simple error string')

      expect(result.message).toBe('Simple error string')
      expect(result.name).toBe('StringError')
    })

    it('should format an object with message property', () => {
      const error = { message: 'Object error', name: 'CustomError', code: 42 }
      const result = formatUnknownError(error)

      expect(result.message).toBe('Object error')
      expect(result.name).toBe('CustomError')
      expect(result.code).toBe(42)
    })

    it('should handle completely unknown error', () => {
      const result = formatUnknownError(null)

      expect(result.message).toBe('null')
      expect(result.name).toBe('UnknownError')
    })

    it('should handle number error', () => {
      const result = formatUnknownError(404)

      expect(result.message).toBe('404')
      expect(result.name).toBe('UnknownError')
    })
  })

  describe('isPermissionDeniedError', () => {
    it('should return true for NotAllowedError', () => {
      const error = new Error('Denied')
      error.name = 'NotAllowedError'
      expect(isPermissionDeniedError(error)).toBe(true)
    })

    it('should return true for PermissionDeniedError', () => {
      const error = new Error('Denied')
      error.name = 'PermissionDeniedError'
      expect(isPermissionDeniedError(error)).toBe(true)
    })

    it('should return true for SecurityError', () => {
      const error = new Error('Security')
      error.name = 'SecurityError'
      expect(isPermissionDeniedError(error)).toBe(true)
    })

    it('should return false for other errors', () => {
      const error = new Error('Other')
      expect(isPermissionDeniedError(error)).toBe(false)
    })

    it('should return false for non-Error values', () => {
      expect(isPermissionDeniedError('string')).toBe(false)
      expect(isPermissionDeniedError(null)).toBe(false)
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

    it('should return false for other errors', () => {
      const error = new Error('Other')
      expect(isNotFoundError(error)).toBe(false)
    })
  })

  describe('isConstraintError', () => {
    it('should return true for OverconstrainedError', () => {
      const error = new Error('Constraint')
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

    it('should return false for other errors', () => {
      const error = new Error('Other')
      expect(isConstraintError(error)).toBe(false)
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

    it('should return false for other errors without network-related message', () => {
      const error = new Error('Something went wrong')
      expect(isNetworkError(error)).toBe(false)
    })

    it('should return false for non-Error values', () => {
      expect(isNetworkError('string')).toBe(false)
      expect(isNetworkError(null)).toBe(false)
      expect(isNetworkError(42)).toBe(false)
    })
  })

  describe('isSessionError', () => {
    it('should return true for RequestTimeout error', () => {
      const error = new Error('Request timeout')
      error.name = 'RequestTimeout'
      expect(isSessionError(error)).toBe(true)
    })

    it('should return true for SessionDescriptionHandlerError', () => {
      const error = new Error('SDP error')
      error.name = 'SessionDescriptionHandlerError'
      expect(isSessionError(error)).toBe(true)
    })

    it('should return true when message includes "session"', () => {
      const error = new Error('Session terminated')
      expect(isSessionError(error)).toBe(true)
    })

    it('should return true when message includes "invite"', () => {
      const error = new Error('INVITE failed')
      expect(isSessionError(error)).toBe(true)
    })

    it('should return true when message includes "bye" or "byedone"', () => {
      const error = new Error('BYE failed - byedone timeout')
      expect(isSessionError(error)).toBe(true)
    })

    it('should return true when message includes "prack"', () => {
      const error = new Error('PRACK failed')
      expect(isSessionError(error)).toBe(true)
    })

    it('should return true when message includes "ack"', () => {
      const error = new Error('ACK timeout')
      expect(isSessionError(error)).toBe(true)
    })

    it('should return false for non-session errors', () => {
      const error = new Error('Some other error')
      expect(isSessionError(error)).toBe(false)
    })

    it('should return false for non-Error values', () => {
      expect(isSessionError('string')).toBe(false)
      expect(isSessionError(null)).toBe(false)
    })
  })

  describe('isTransportError', () => {
    it('should return true for TransportError', () => {
      const error = new Error('Transport error')
      error.name = 'TransportError'
      expect(isTransportError(error)).toBe(true)
    })

    it('should return true for WebSocketError', () => {
      const error = new Error('WebSocket closed')
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
      const error = new Error('WebSocket connection failed')
      expect(isTransportError(error)).toBe(true)
    })

    it('should return true when message includes "tls handshake"', () => {
      const error = new Error('TLS handshake timeout')
      expect(isTransportError(error)).toBe(true)
    })

    it('should return true when message includes "transport"', () => {
      const error = new Error('Transport unavailable')
      expect(isTransportError(error)).toBe(true)
    })

    it('should return true when message includes "sip/tls"', () => {
      const error = new Error('SIP/TLS connection failed')
      expect(isTransportError(error)).toBe(true)
    })

    it('should return false for non-transport errors', () => {
      const error = new Error('Some other error')
      expect(isTransportError(error)).toBe(false)
    })

    it('should return false for non-Error values', () => {
      expect(isTransportError('string')).toBe(false)
      expect(isTransportError(null)).toBe(false)
    })
  })

  describe('isAuthenticationError', () => {
    it('should return true for Unauthorized error', () => {
      const error = new Error('Unauthorized')
      error.name = 'Unauthorized'
      expect(isAuthenticationError(error)).toBe(true)
    })

    it('should return true for Forbidden error', () => {
      const error = new Error('Forbidden')
      error.name = 'Forbidden'
      expect(isAuthenticationError(error)).toBe(true)
    })

    it('should return true when message includes "unauthorized"', () => {
      const error = new Error('User is unauthorized')
      expect(isAuthenticationError(error)).toBe(true)
    })

    it('should return true when message includes "credentials"', () => {
      const error = new Error('Invalid credentials')
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

    it('should return false for non-auth errors', () => {
      const error = new Error('Some other error')
      expect(isAuthenticationError(error)).toBe(false)
    })

    it('should return false for non-Error values', () => {
      expect(isAuthenticationError('string')).toBe(false)
      expect(isAuthenticationError(null)).toBe(false)
    })
  })
})
