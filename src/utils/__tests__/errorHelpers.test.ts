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
  isTimeoutError,
  isWebRtcError,
  isSipStatusCodeError,
  isRangeError,
  isSyntaxError,
  isReferenceError,
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

  describe('isTimeoutError', () => {
    it('should return true for TimeoutError', () => {
      const error = new Error('Operation timed out')
      error.name = 'TimeoutError'
      expect(isTimeoutError(error)).toBe(true)
    })

    it('should return true for error with name AbortError', () => {
      const error = new Error('The operation was aborted')
      error.name = 'AbortError'
      expect(isTimeoutError(error)).toBe(true)
    })

    it('should return true for RequestTimeout error', () => {
      const error = new Error('Request timeout')
      error.name = 'RequestTimeout'
      expect(isTimeoutError(error)).toBe(true)
    })

    it('should return true for GatewayTimeout error', () => {
      const error = new Error('Gateway Timeout')
      error.name = 'GatewayTimeout'
      expect(isTimeoutError(error)).toBe(true)
    })

    it('should return true when message includes "timeout"', () => {
      const error = new Error('Connection timeout after 30s')
      expect(isTimeoutError(error)).toBe(true)
    })

    it('should return true when message includes "timed out"', () => {
      const error = new Error('Request timed out')
      expect(isTimeoutError(error)).toBe(true)
    })

    it('should return true when message includes "deadline exceeded"', () => {
      const error = new Error('Deadline exceeded')
      expect(isTimeoutError(error)).toBe(true)
    })

    it('should return false for non-timeout errors', () => {
      const error = new Error('Some other error')
      expect(isTimeoutError(error)).toBe(false)
    })

    it('should return false for non-Error values', () => {
      expect(isTimeoutError('string')).toBe(false)
      expect(isTimeoutError(null)).toBe(false)
      expect(isTimeoutError(42)).toBe(false)
    })
  })

  describe('isWebRtcError', () => {
    it('should return true for NotReadableError', () => {
      const error = new Error('Device not readable')
      error.name = 'NotReadableError'
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return true for AbortError', () => {
      const error = new Error('Operation aborted')
      error.name = 'AbortError'
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return true for SourceUnavailable', () => {
      const error = new Error('Source unavailable')
      error.name = 'SourceUnavailable'
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return true for DevicesNotFoundError', () => {
      const error = new Error('No devices found')
      error.name = 'DevicesNotFoundError'
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return true for PermissionDeniedError', () => {
      const error = new Error('Permission denied')
      error.name = 'PermissionDeniedError'
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return true for NotAllowedError', () => {
      const error = new Error('Not allowed')
      error.name = 'NotAllowedError'
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return true for OverconstrainedError', () => {
      const error = new Error('Constraints not satisfied')
      error.name = 'OverconstrainedError'
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return true when message includes "getusermedia"', () => {
      const error = new Error('getUserMedia failed: Permission denied')
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return true when message includes "webrtc"', () => {
      const error = new Error('WebRTC connection failed')
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return true when message includes "peerconnection"', () => {
      const error = new Error('RTCPeerConnection failed')
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return true when message includes "rtcpeerconnection"', () => {
      const error = new Error('RTCPeerConnection is not defined')
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return true when message includes "media device"', () => {
      const error = new Error('No media device found')
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return true when message includes "audio" or "video"', () => {
      const error = new Error('Failed to access audio device')
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return true when message includes "constraint"', () => {
      const error = new Error('Audio constraint not satisfied')
      expect(isWebRtcError(error)).toBe(true)
    })

    it('should return false for non-WebRTC errors', () => {
      const error = new Error('Some other error')
      expect(isWebRtcError(error)).toBe(false)
    })

    it('should return false for non-Error values', () => {
      expect(isWebRtcError('string')).toBe(false)
      expect(isWebRtcError(null)).toBe(false)
      expect(isWebRtcError(42)).toBe(false)
    })
  })

  describe('isSipStatusCodeError', () => {
    it('should return true when message contains 4xx status code', () => {
      const error = new Error('SIP request failed with 403 Forbidden')
      expect(isSipStatusCodeError(error)).toBe(true)
    })

    it('should return true when message contains 5xx status code', () => {
      const error = new Error('SIP server error 503 Service Unavailable')
      expect(isSipStatusCodeError(error)).toBe(true)
    })

    it('should return true for specific status code patterns in message', () => {
      const error = new Error('Call failed: 404 Not Found')
      expect(isSipStatusCodeError(error)).toBe(true)
    })

    it('should return true for 401 Unauthorized in message', () => {
      const error = new Error('Authentication required: 401')
      expect(isSipStatusCodeError(error)).toBe(true)
    })

    it('should return true for 500 Server Error in message', () => {
      const error = new Error('Internal server error: 500')
      expect(isSipStatusCodeError(error)).toBe(true)
    })

    it('should return true for well-known SIP error names in message', () => {
      const error = new Error('486 Busy Here')
      expect(isSipStatusCodeError(error)).toBe(true)
    })

    it('should return true for 408 Request Timeout in message', () => {
      const error = new Error('408 Request Timeout')
      expect(isSipStatusCodeError(error)).toBe(true)
    })

    it('should filter by specific status codes when provided', () => {
      const error = new Error('Request failed with 403')
      expect(isSipStatusCodeError(error, [401, 403, 500])).toBe(true)
    })

    it('should return false when status code not in filter', () => {
      const error = new Error('Request failed with 404')
      expect(isSipStatusCodeError(error, [401, 403, 500])).toBe(false)
    })

    it('should return true for 4xx range when no filter and code in range', () => {
      const error = new Error('Bad request: 408')
      expect(isSipStatusCodeError(error)).toBe(true)
    })

    it('should return true for 5xx range when no filter and code in range', () => {
      const error = new Error('Server error: 504')
      expect(isSipStatusCodeError(error)).toBe(true)
    })

    it('should return false for non-SIP errors', () => {
      const error = new Error('Some generic error')
      expect(isSipStatusCodeError(error)).toBe(false)
    })

    it('should return false for non-Error values', () => {
      expect(isSipStatusCodeError('string')).toBe(false)
      expect(isSipStatusCodeError(null)).toBe(false)
      expect(isSipStatusCodeError(42)).toBe(false)
      expect(isSipStatusCodeError({})).toBe(false)
    })

    it('should handle errors without status codes in name or message', () => {
      const error = new Error('Network connectivity lost')
      expect(isSipStatusCodeError(error)).toBe(false)
    })

    it('should return true for BAD_REQUEST pattern from SIP_STATUS_CODES', () => {
      const error = new Error('400 Bad Request')
      expect(isSipStatusCodeError(error)).toBe(true)
    })

    it('should return true for NOT_FOUND pattern from SIP_STATUS_CODES', () => {
      const error = new Error('404 Not Found')
      expect(isSipStatusCodeError(error)).toBe(true)
    })

    it('should return true for SERVER_INTERNAL_ERROR pattern from SIP_STATUS_CODES', () => {
      const error = new Error('500 Server Internal Error')
      expect(isSipStatusCodeError(error)).toBe(true)
    })
  })

  describe('isRangeError', () => {
    it('should return true for RangeError instance', () => {
      const error = new RangeError('Invalid length')
      expect(isRangeError(error)).toBe(true)
    })

    it('should return true for built-in RangeError', () => {
      try {
        // eslint-disable-next-line no-new
        new Array(-1)
      } catch (e) {
        expect(isRangeError(e)).toBe(true)
      }
    })

    it('should return false for other Error types', () => {
      expect(isRangeError(new Error())).toBe(false)
      expect(isRangeError(new TypeError())).toBe(false)
      expect(isRangeError(new SyntaxError())).toBe(false)
    })

    it('should return false for non-Error values', () => {
      expect(isRangeError('string')).toBe(false)
      expect(isRangeError(null)).toBe(false)
      expect(isRangeError(undefined)).toBe(false)
      expect(isRangeError({})).toBe(false)
    })
  })

  describe('isSyntaxError', () => {
    it('should return true for SyntaxError instance', () => {
      const error = new SyntaxError('Invalid syntax')
      expect(isSyntaxError(error)).toBe(true)
    })

    it('should return true for JSON.parse SyntaxError', () => {
      try {
        JSON.parse('invalid json')
      } catch (e) {
        expect(isSyntaxError(e)).toBe(true)
      }
    })

    it('should return false for other Error types', () => {
      expect(isSyntaxError(new Error())).toBe(false)
      expect(isSyntaxError(new TypeError())).toBe(false)
      expect(isSyntaxError(new RangeError())).toBe(false)
    })

    it('should return false for non-Error values', () => {
      expect(isSyntaxError('string')).toBe(false)
      expect(isSyntaxError(null)).toBe(false)
      expect(isSyntaxError(undefined)).toBe(false)
      expect(isSyntaxError({})).toBe(false)
    })
  })

  describe('isReferenceError', () => {
    it('should return true for ReferenceError instance', () => {
      const error = new ReferenceError('Undefined variable')
      expect(isReferenceError(error)).toBe(true)
    })

    it('should return false for other Error types', () => {
      expect(isReferenceError(new Error())).toBe(false)
      expect(isReferenceError(new TypeError())).toBe(false)
      expect(isReferenceError(new RangeError())).toBe(false)
    })

    it('should return false for non-Error values', () => {
      expect(isReferenceError('string')).toBe(false)
      expect(isReferenceError(null)).toBe(false)
      expect(isReferenceError(undefined)).toBe(false)
      expect(isReferenceError({})).toBe(false)
    })
  })
})
