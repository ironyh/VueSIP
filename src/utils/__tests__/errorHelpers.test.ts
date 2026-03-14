/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  formatUnknownError,
  isPermissionDeniedError,
  isNotFoundError,
  isConstraintError,
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
})
