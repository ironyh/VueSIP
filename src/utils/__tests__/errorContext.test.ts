/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  ErrorSeverity,
  createErrorContext,
  formatError,
  createOperationTimer,
  sanitizeContext,
  extractErrorInfo,
  logErrorWithContext,
} from '../errorContext'

describe('errorContext', () => {
  describe('createErrorContext', () => {
    it('should create basic error context', () => {
      const ctx = createErrorContext('makeCall', 'useCallSession', ErrorSeverity.HIGH)
      expect(ctx.operation).toBe('makeCall')
      expect(ctx.component).toBe('useCallSession')
      expect(ctx.severity).toBe(ErrorSeverity.HIGH)
      expect(ctx.timestamp).toBeInstanceOf(Date)
    })

    it('should include optional fields when provided', () => {
      const ctx = createErrorContext('makeCall', 'useCallSession', ErrorSeverity.HIGH, {
        context: { target: 'sip:user@domain.com' },
        state: { connected: true },
        duration: 1234,
        userId: 'user123',
      })
      expect(ctx.context).toEqual({ target: 'sip:user@domain.com' })
      expect(ctx.state).toEqual({ connected: true })
      expect(ctx.duration).toBe(1234)
      expect(ctx.userId).toBe('user123')
    })

    it('should include stack when requested', () => {
      const ctx = createErrorContext('makeCall', 'useCallSession', ErrorSeverity.HIGH, {
        includeStack: true,
      })
      expect(ctx.stack).toBeDefined()
      expect(typeof ctx.stack).toBe('string')
    })

    it('should not include stack by default', () => {
      const ctx = createErrorContext('makeCall', 'useCallSession', ErrorSeverity.HIGH)
      expect(ctx.stack).toBeUndefined()
    })
  })

  describe('formatError', () => {
    it('should format error with context', () => {
      const ctx = createErrorContext('makeCall', 'useCallSession', ErrorSeverity.HIGH)
      const error = new Error('Test error')
      const entry = formatError('Failed to make call', error, ctx)

      expect(entry.message).toBe('Failed to make call')
      expect(entry.context).toBe(ctx)
      expect(entry.error).toBe(error)
    })

    it('should handle non-Error objects', () => {
      const ctx = createErrorContext('makeCall', 'useCallSession', ErrorSeverity.HIGH)
      const entry = formatError('Failed', { reason: 'unknown' }, ctx)
      expect(entry.error).toEqual({ reason: 'unknown' })
    })
  })

  describe('createOperationTimer', () => {
    it('should create timer and return elapsed time', () => {
      const timer = createOperationTimer()
      expect(timer.elapsed).toBeDefined()
      expect(typeof timer.elapsed()).toBe('number')
    })

    it('should return increasing elapsed times', () => {
      const timer = createOperationTimer()
      const first = timer.elapsed()
      // Small delay
      const start = Date.now()
      while (Date.now() - start < 10) {
        /* busy wait */
      }
      const second = timer.elapsed()
      expect(second).toBeGreaterThanOrEqual(first)
    })
  })

  describe('sanitizeContext', () => {
    it('should redact password field', () => {
      const input = { username: 'alice', password: 'secret123' }
      const result = sanitizeContext(input)
      expect(result.username).toBe('alice')
      expect(result.password).toBe('[REDACTED]')
    })

    it('should redact token field', () => {
      const input = { apiKey: 'secret-key', data: 'value' }
      const result = sanitizeContext(input)
      expect(result.apiKey).toBe('[REDACTED]')
      expect(result.data).toBe('value')
    })

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: 'alice',
          password: 'secret',
        },
      }
      const result = sanitizeContext(input)
      expect((result.user as Record<string, unknown>).name).toBe('alice')
      expect((result.user as Record<string, unknown>).password).toBe('[REDACTED]')
    })

    it('should handle arrays', () => {
      const input = {
        users: [
          { name: 'alice', password: 'secret1' },
          { name: 'bob', password: 'secret2' },
        ],
      }
      const result = sanitizeContext(input)
      const users = result.users as Array<Record<string, unknown>>
      expect(users[0].password).toBe('[REDACTED]')
      expect(users[1].password).toBe('[REDACTED]')
    })

    it('should handle case-insensitive keys', () => {
      const input = { PASSWORD: 'secret', Token: 'token123' }
      const result = sanitizeContext(input)
      expect(result.PASSWORD).toBe('[REDACTED]')
      expect(result.Token).toBe('[REDACTED]')
    })

    it('should handle keys with prefixes/suffixes', () => {
      const input = { my_password: 'secret', token_old: 'token' }
      const result = sanitizeContext(input)
      expect(result.my_password).toBe('[REDACTED]')
      expect(result.token_old).toBe('[REDACTED]')
    })

    it('should handle authorization header', () => {
      const input = { authorization: 'Bearer token123' }
      const result = sanitizeContext(input)
      expect(result.authorization).toBe('[REDACTED]')
    })

    it('should detect circular references', () => {
      const circular: Record<string, unknown> = { value: 'test' }
      circular.self = circular
      const result = sanitizeContext(circular)
      expect(result.self).toEqual({ '[Circular]': true })
    })

    it('should handle empty objects', () => {
      const result = sanitizeContext({})
      expect(result).toEqual({})
    })

    it('should pass through non-sensitive keys', () => {
      const input = { name: 'alice', email: 'alice@example.com', age: 30 }
      const result = sanitizeContext(input)
      expect(result).toEqual(input)
    })
  })

  describe('extractErrorInfo', () => {
    it('should extract info from Error', () => {
      const error = new Error('Test error')
      const info = extractErrorInfo(error)
      expect(info.name).toBe('Error')
      expect(info.message).toBe('Test error')
      expect(info.stack).toBeDefined()
    })

    it('should extract info from DOMException', () => {
      const error = new DOMException('Not found', 'NotFoundError')
      const info = extractErrorInfo(error)
      expect(info.name).toBe('NotFoundError')
      expect(info.message).toBe('Not found')
      expect(info.code).toBeDefined()
    })

    it('should extract info from plain object', () => {
      const error = { name: 'CustomError', message: 'Custom message', code: 500 }
      const info = extractErrorInfo(error)
      expect(info.name).toBe('CustomError')
      expect(info.message).toBe('Custom message')
      expect(info.code).toBe(500)
    })

    it('should handle unknown errors', () => {
      const info = extractErrorInfo('string error')
      expect(info.name).toBe('UnknownError')
      expect(info.message).toBe('string error')
    })

    it('should handle null/undefined', () => {
      const info1 = extractErrorInfo(null)
      expect(info1.message).toBe('null')

      const info2 = extractErrorInfo(undefined)
      expect(info2.message).toBe('undefined')
    })
  })

  describe('logErrorWithContext', () => {
    it('should log error with sanitized context', () => {
      const mockLogger = {
        error: vi.fn(),
      }
      const error = new Error('Test error')

      logErrorWithContext(
        mockLogger,
        'Failed operation',
        error,
        'makeCall',
        'useCallSession',
        ErrorSeverity.HIGH,
        {
          context: { target: 'sip:user@domain.com', password: 'secret' },
          duration: 1000,
        }
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed operation',
        expect.objectContaining({
          context: expect.objectContaining({
            target: 'sip:user@domain.com',
          }),
          errorInfo: expect.objectContaining({
            name: 'Error',
            message: 'Test error',
          }),
        })
      )
    })

    it('should include state in log', () => {
      const mockLogger = {
        error: vi.fn(),
      }

      logErrorWithContext(
        mockLogger,
        'Failed',
        'error',
        'makeCall',
        'useCallSession',
        ErrorSeverity.MEDIUM,
        {
          state: { connected: true, userId: 'user123' },
        }
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed',
        expect.objectContaining({
          state: { connected: true, userId: 'user123' },
        })
      )
    })

    it('should sanitize sensitive data in context', () => {
      const mockLogger = {
        error: vi.fn(),
      }

      logErrorWithContext(
        mockLogger,
        'Failed',
        'error',
        'makeCall',
        'useCallSession',
        ErrorSeverity.LOW,
        {
          context: { apiKey: 'secret-key' },
        }
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed',
        expect.objectContaining({
          context: expect.objectContaining({
            apiKey: '[REDACTED]',
          }),
        })
      )
    })
  })

  describe('ErrorSeverity', () => {
    it('should have all severity levels', () => {
      expect(ErrorSeverity.LOW).toBe('low')
      expect(ErrorSeverity.MEDIUM).toBe('medium')
      expect(ErrorSeverity.HIGH).toBe('high')
      expect(ErrorSeverity.CRITICAL).toBe('critical')
    })
  })
})
