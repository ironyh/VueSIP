/**
 * Error helpers utility tests
 */

import { describe, it, expect } from 'vitest'
import {
  formatError,
  isPermissionDeniedError,
  isNotFoundError,
  isConstraintError,
} from '@/utils/errorHelpers'

describe('errorHelpers', () => {
  describe('formatError', () => {
    it('should format standard Error instances', () => {
      const error = new Error('Test error message')
      error.name = 'TestError'

      const formatted = formatError(error)

      expect(formatted.message).toBe('Test error message')
      expect(formatted.name).toBe('TestError')
      expect(formatted.stack).toBeDefined()
    })

    it('should include code property for DOMException-like errors', () => {
      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'
      ;(error as any).code = 20

      const formatted = formatError(error)

      expect(formatted.message).toBe('Permission denied')
      expect(formatted.name).toBe('NotAllowedError')
      expect(formatted.code).toBe(20)
    })

    it('should format string errors', () => {
      const error = 'Simple error string'

      const formatted = formatError(error)

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

      const formatted = formatError(error)

      expect(formatted.message).toBe('Custom error message')
      expect(formatted.name).toBe('CustomError')
      expect(formatted.code).toBe('ERR_CUSTOM')
    })

    it('should format objects with message but no name', () => {
      const error = {
        message: 'Error without name',
      }

      const formatted = formatError(error)

      expect(formatted.message).toBe('Error without name')
      expect(formatted.name).toBe('UnknownError')
      expect(formatted.code).toBeUndefined()
    })

    it('should format objects with message and numeric code', () => {
      const error = {
        message: 'Numeric code error',
        code: 404,
      }

      const formatted = formatError(error)

      expect(formatted.message).toBe('Numeric code error')
      expect(formatted.name).toBe('UnknownError')
      expect(formatted.code).toBe(404)
    })

    it('should handle completely unknown error types', () => {
      const error = 123 // number

      const formatted = formatError(error)

      expect(formatted.message).toBe('123')
      expect(formatted.name).toBe('UnknownError')
      expect(formatted.stack).toBeUndefined()
      expect(formatted.code).toBeUndefined()
    })

    it('should handle null as unknown error', () => {
      const error = null

      const formatted = formatError(error)

      expect(formatted.message).toBe('null')
      expect(formatted.name).toBe('UnknownError')
    })

    it('should handle undefined as unknown error', () => {
      const error = undefined

      const formatted = formatError(error)

      expect(formatted.message).toBe('undefined')
      expect(formatted.name).toBe('UnknownError')
    })

    it('should handle objects without message property', () => {
      const error = { foo: 'bar', baz: 123 }

      const formatted = formatError(error)

      expect(formatted.message).toBe('[object Object]')
      expect(formatted.name).toBe('UnknownError')
    })

    it('should preserve stack trace from Error instances', () => {
      const error = new Error('Error with stack')
      const formatted = formatError(error)

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

  describe('Edge cases and integration', () => {
    it('should handle Error subclasses correctly', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }

      const error = new CustomError('Custom error message')
      const formatted = formatError(error)

      expect(formatted.message).toBe('Custom error message')
      expect(formatted.name).toBe('CustomError')
      expect(formatted.stack).toBeDefined()
    })

    it('should format then classify permission errors', () => {
      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'

      const formatted = formatError(error)
      expect(formatted.name).toBe('NotAllowedError')
      expect(isPermissionDeniedError(error)).toBe(true)
      expect(isNotFoundError(error)).toBe(false)
      expect(isConstraintError(error)).toBe(false)
    })

    it('should format then classify not found errors', () => {
      const error = new Error('Device not found')
      error.name = 'DevicesNotFoundError'

      const formatted = formatError(error)
      expect(formatted.name).toBe('DevicesNotFoundError')
      expect(isPermissionDeniedError(error)).toBe(false)
      expect(isNotFoundError(error)).toBe(true)
      expect(isConstraintError(error)).toBe(false)
    })

    it('should format then classify constraint errors', () => {
      const error = new Error('Constraints not satisfied')
      error.name = 'OverconstrainedError'

      const formatted = formatError(error)
      expect(formatted.name).toBe('OverconstrainedError')
      expect(isPermissionDeniedError(error)).toBe(false)
      expect(isNotFoundError(error)).toBe(false)
      expect(isConstraintError(error)).toBe(true)
    })
  })
})
