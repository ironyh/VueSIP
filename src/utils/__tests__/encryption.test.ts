/**
 * Encryption Utilities Tests
 *
 * @module utils/__tests__/encryption.test.ts
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('encryption utilities', () => {
  // Store original crypto
  let originalCrypto: typeof globalThis.crypto

  beforeEach(() => {
    originalCrypto = globalThis.crypto
  })

  afterEach(() => {
    // Restore original crypto
    vi.stubGlobal('crypto', originalCrypto)
    vi.clearAllMocks()
  })

  describe('isCryptoAvailable', () => {
    it('should return true when crypto.subtle is available', async () => {
      const { isCryptoAvailable } = await import('../encryption')
      expect(isCryptoAvailable()).toBe(true)
    })

    it('should return false when crypto.subtle is undefined', async () => {
      vi.stubGlobal('crypto', { subtle: undefined })
      const { isCryptoAvailable } = await import('../encryption')
      expect(isCryptoAvailable()).toBe(false)
    })
  })

  describe('generateEncryptionKey', () => {
    it('should generate a key of default length', async () => {
      const { generateEncryptionKey } = await import('../encryption')

      const key = generateEncryptionKey()
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(0)
    })

    it('should generate a key of specified length', async () => {
      const { generateEncryptionKey } = await import('../encryption')

      const key = generateEncryptionKey(64)
      // base64 encoding: 64 bytes -> ~86 characters
      expect(key.length).toBeCloseTo(86, -1)
    })
  })

  describe('encrypt and decrypt round-trip', () => {
    it('should encrypt and decrypt data correctly', async () => {
      // Mock the crypto.subtle methods
      const testKey = {} as CryptoKey

      vi.stubGlobal('crypto', {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i % 256
          }
          return arr
        },
        subtle: {
          importKey: vi.fn().mockResolvedValue(testKey),
          deriveKey: vi.fn().mockResolvedValue(testKey),
          encrypt: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
          decrypt: vi
            .fn()
            .mockResolvedValue(new TextEncoder().encode(JSON.stringify({ foo: 'bar' })).buffer),
        },
      })

      const { encrypt, decrypt } = await import('../encryption')

      const originalData = { foo: 'bar' }
      const password = 'testpassword123'

      const encrypted = await encrypt(originalData, password)
      expect(encrypted).toHaveProperty('data')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('salt')
      expect(encrypted).toHaveProperty('algorithm')
      expect(encrypted).toHaveProperty('iterations')
      expect(encrypted).toHaveProperty('version')

      const decrypted = await decrypt(encrypted, password)
      expect(decrypted).toEqual(originalData)
    })

    it('should throw on encrypt when crypto not available', async () => {
      vi.stubGlobal('crypto', undefined)
      // Re-import after stubbing
      vi.resetModules()
      const { encrypt } = await import('../encryption')

      await expect(encrypt({ test: true }, 'password')).rejects.toThrow(
        'Web Crypto API is not available'
      )
    })

    it('should throw on decrypt when crypto not available', async () => {
      vi.stubGlobal('crypto', undefined)
      vi.resetModules()
      const { decrypt } = await import('../encryption')

      await expect(
        decrypt(
          {
            data: 'abc',
            iv: 'def',
            salt: 'ghi',
            algorithm: 'AES-GCM',
            iterations: 1000,
            version: 1,
          },
          'password'
        )
      ).rejects.toThrow('Web Crypto API is not available')
    })

    it('should use custom iterations when provided', async () => {
      const testKey = {} as CryptoKey
      const deriveKeyMock = vi.fn().mockResolvedValue(testKey)

      vi.stubGlobal('crypto', {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i % 256
          }
          return arr
        },
        subtle: {
          importKey: vi.fn().mockResolvedValue(testKey),
          deriveKey: deriveKeyMock,
          encrypt: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
        },
      })

      const { encrypt } = await import('../encryption')
      await encrypt({ test: true }, 'password', { iterations: 5000 })

      expect(deriveKeyMock).toHaveBeenCalled()
      // Verify iterations were passed
      const callArgs = deriveKeyMock.mock.calls[0][0]
      expect(callArgs.iterations).toBe(5000)
    })
  })

  describe('edge cases', () => {
    it('should handle empty object encryption', async () => {
      const testKey = {} as CryptoKey

      vi.stubGlobal('crypto', {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i % 256
          }
          return arr
        },
        subtle: {
          importKey: vi.fn().mockResolvedValue(testKey),
          deriveKey: vi.fn().mockResolvedValue(testKey),
          encrypt: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
        },
      })

      const { encrypt } = await import('../encryption')
      const result = await encrypt({}, 'password')

      expect(result).toHaveProperty('data')
    })

    it('should handle array data encryption', async () => {
      const testKey = {} as CryptoKey

      vi.stubGlobal('crypto', {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i % 256
          }
          return arr
        },
        subtle: {
          importKey: vi.fn().mockResolvedValue(testKey),
          deriveKey: vi.fn().mockResolvedValue(testKey),
          encrypt: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
        },
      })

      const { encrypt } = await import('../encryption')
      const result = await encrypt([1, 2, 3], 'password')

      expect(result).toHaveProperty('data')
    })
  })

  describe('hashPassword', () => {
    it('should hash a password and return hex string', async () => {
      const { hashPassword } = await import('../encryption')

      const hash = await hashPassword('testpassword')
      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(64) // SHA-256 produces 32 bytes = 64 hex chars
    })

    it('should throw when crypto not available', async () => {
      vi.stubGlobal('crypto', undefined)
      vi.resetModules()
      const { hashPassword } = await import('../encryption')

      await expect(hashPassword('password')).rejects.toThrow('Web Crypto API is not available')
    })
  })

  describe('sanitizeForLogs', () => {
    it('should return null as-is', async () => {
      const { sanitizeForLogs } = await import('../encryption')
      expect(sanitizeForLogs(null)).toBe(null)
    })

    it('should return undefined as-is', async () => {
      const { sanitizeForLogs } = await import('../encryption')
      expect(sanitizeForLogs(undefined)).toBe(undefined)
    })

    it('should return numbers as-is', async () => {
      const { sanitizeForLogs } = await import('../encryption')
      expect(sanitizeForLogs(123)).toBe(123)
    })

    it('should return booleans as-is', async () => {
      const { sanitizeForLogs } = await import('../encryption')
      expect(sanitizeForLogs(true)).toBe(true)
    })

    it('should mask password field', async () => {
      const { sanitizeForLogs } = await import('../encryption')

      const input = { username: 'alice', password: 'secret123' }
      const result = sanitizeForLogs(input) as Record<string, unknown>

      expect(result.username).toBe('alice')
      expect(result.password).toBe('***REDACTED***')
    })

    it('should mask secret field', async () => {
      const { sanitizeForLogs } = await import('../encryption')

      const input = { secret: 'mysecret', data: 'some data' }
      const result = sanitizeForLogs(input) as Record<string, unknown>

      expect(result.secret).toBe('***REDACTED***')
      expect(result.data).toBe('some data')
    })

    it('should mask token field', async () => {
      const { sanitizeForLogs } = await import('../encryption')

      const input = { token: 'abc123', data: 'some data' }
      const result = sanitizeForLogs(input) as Record<string, unknown>

      expect(result.token).toBe('***REDACTED***')
      expect(result.data).toBe('some data')
    })

    it('should mask nested password fields', async () => {
      const { sanitizeForLogs } = await import('../encryption')

      const input = {
        user: { name: 'bob', password: 'nestedsecret' },
      }
      const result = sanitizeForLogs(input) as { user: Record<string, unknown> }

      expect(result.user.name).toBe('bob')
      expect(result.user.password).toBe('***REDACTED***')
    })

    it('should handle arrays', async () => {
      const { sanitizeForLogs } = await import('../encryption')

      const input = [{ password: 'pass1' }, { password: 'pass2' }]
      const result = sanitizeForLogs(input) as Array<Record<string, unknown>>

      expect(result[0].password).toBe('***REDACTED***')
      expect(result[1].password).toBe('***REDACTED***')
    })

    it('should mask URLs with credentials', async () => {
      const { sanitizeForLogs } = await import('../encryption')

      const input = { url: 'https://user:pass@example.com/api' }
      const result = sanitizeForLogs(input) as Record<string, unknown>

      expect(result.url).toBe('https://***REDACTED***@example.com/api')
    })

    it('should mask SIP URIs with passwords', async () => {
      const { sanitizeForLogs } = await import('../encryption')

      const input = { sip: 'sip:alice:password123@example.com' }
      const result = sanitizeForLogs(input) as Record<string, unknown>

      expect(result.sip).toBe('sip:***REDACTED***@***REDACTED***')
    })

    it('should use custom replacement string', async () => {
      const { sanitizeForLogs } = await import('../encryption')

      const input = { password: 'secret' }
      const result = sanitizeForLogs(input, { replacement: '[HIDDEN]' }) as Record<string, unknown>

      expect(result.password).toBe('[HIDDEN]')
    })

    it('should respect maskSipUris option', async () => {
      const { sanitizeForLogs } = await import('../encryption')

      const input = { sip: 'sip:alice:password@example.com' }
      const result = sanitizeForLogs(input, { maskSipUris: false }) as Record<string, unknown>

      // Should not be masked when disabled
      expect(result.sip).toBe('sip:alice:password@example.com')
    })

    it('should truncate long strings', async () => {
      const { sanitizeForLogs } = await import('../encryption')

      const longString = 'a'.repeat(2000)
      const input = { data: longString }
      const result = sanitizeForLogs(input, { maxLength: 100 }) as Record<string, unknown>

      expect((result.data as string).length).toBe(103) // 100 + '...'
    })

    it('should handle case-insensitive password field', async () => {
      const { sanitizeForLogs } = await import('../encryption')

      const input = { PASSWORD: 'secret', Password: 'secret2' }
      const result = sanitizeForLogs(input) as Record<string, unknown>

      expect(result.PASSWORD).toBe('***REDACTED***')
      expect(result.Password).toBe('***REDACTED***')
    })
  })
})
