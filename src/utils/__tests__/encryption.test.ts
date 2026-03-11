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
})
