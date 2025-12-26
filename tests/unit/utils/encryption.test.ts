/**
 * Encryption utilities unit tests
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  isCryptoAvailable,
  encrypt,
  decrypt,
  generateEncryptionKey,
  hashPassword,
} from '@/utils/encryption'
import type { EncryptedData } from '@/types/storage.types'

describe('encryption utils', () => {
  describe('isCryptoAvailable', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should return true when crypto.subtle is available', () => {
      expect(isCryptoAvailable()).toBe(true)
    })

    it('should return false when crypto is undefined', () => {
      vi.stubGlobal('crypto', undefined)
      expect(isCryptoAvailable()).toBe(false)
    })

    it('should return false when crypto.subtle is undefined', () => {
      vi.stubGlobal('crypto', { subtle: undefined })
      expect(isCryptoAvailable()).toBe(false)
    })
  })

  describe('encrypt', () => {
    const password = 'test-password-123'
    const testData = { user: 'alice', token: 'secret123' }

    it('should encrypt data successfully', async () => {
      const encrypted = await encrypt(testData, password)

      expect(encrypted).toBeDefined()
      expect(encrypted.data).toBeTypeOf('string')
      expect(encrypted.iv).toBeTypeOf('string')
      expect(encrypted.salt).toBeTypeOf('string')
      expect(encrypted.algorithm).toBe('AES-GCM')
      expect(encrypted.iterations).toBeTypeOf('number')
      expect(encrypted.version).toBe(1)
    })

    it('should encrypt with custom options', async () => {
      const encrypted = await encrypt(testData, password, {
        iterations: 5000,
        algorithm: 'AES-GCM',
      })

      expect(encrypted.iterations).toBe(5000)
      expect(encrypted.algorithm).toBe('AES-GCM')
    })

    it('should produce different encrypted outputs for same data', async () => {
      const encrypted1 = await encrypt(testData, password)
      const encrypted2 = await encrypt(testData, password)

      // Different IV and salt = different encrypted output
      expect(encrypted1.data).not.toBe(encrypted2.data)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
      expect(encrypted1.salt).not.toBe(encrypted2.salt)
    })

    it('should encrypt different data types', async () => {
      const stringData = 'test string'
      const numberData = 12345
      const arrayData = [1, 2, 3]
      const objectData = { nested: { value: 'test' } }

      const encryptedString = await encrypt(stringData, password)
      const encryptedNumber = await encrypt(numberData, password)
      const encryptedArray = await encrypt(arrayData, password)
      const encryptedObject = await encrypt(objectData, password)

      expect(encryptedString.data).toBeDefined()
      expect(encryptedNumber.data).toBeDefined()
      expect(encryptedArray.data).toBeDefined()
      expect(encryptedObject.data).toBeDefined()
    })

    it('should throw error when crypto is not available', async () => {
      vi.stubGlobal('crypto', undefined)

      await expect(encrypt(testData, password)).rejects.toThrow('Web Crypto API is not available')

      vi.unstubAllGlobals()
    })

    it('should throw error when encryption fails', async () => {
      const mockSubtle = {
        importKey: vi.fn().mockRejectedValue(new Error('Import key failed')),
        deriveKey: vi.fn(),
        encrypt: vi.fn(),
      }
      const mockCrypto = { subtle: mockSubtle, getRandomValues: vi.fn() }
      vi.stubGlobal('crypto', mockCrypto)

      await expect(encrypt(testData, password)).rejects.toThrow('Encryption failed')

      vi.unstubAllGlobals()
    })
  })

  describe('decrypt', () => {
    const password = 'test-password-123'
    const testData = { user: 'alice', token: 'secret123' }

    it('should decrypt data successfully', async () => {
      const encrypted = await encrypt(testData, password)
      const decrypted = await decrypt<typeof testData>(encrypted, password)

      expect(decrypted).toEqual(testData)
    })

    it('should decrypt with correct iterations from encrypted data', async () => {
      const customIterations = 5000
      const encrypted = await encrypt(testData, password, { iterations: customIterations })
      const decrypted = await decrypt<typeof testData>(encrypted, password)

      expect(decrypted).toEqual(testData)
    })

    it('should decrypt when iterations match default', async () => {
      const encrypted = await encrypt(testData, password, { iterations: 100000 })
      const decrypted = await decrypt<typeof testData>(encrypted, password)
      expect(decrypted).toEqual(testData)
    })

    it('should decrypt different data types', async () => {
      const stringData = 'test string'
      const numberData = 12345
      const arrayData = [1, 2, 3]

      const encryptedString = await encrypt(stringData, password)
      const encryptedNumber = await encrypt(numberData, password)
      const encryptedArray = await encrypt(arrayData, password)

      expect(await decrypt<string>(encryptedString, password)).toBe(stringData)
      expect(await decrypt<number>(encryptedNumber, password)).toBe(numberData)
      expect(await decrypt<number[]>(encryptedArray, password)).toEqual(arrayData)
    })

    it('should throw error when crypto is not available', async () => {
      const encrypted = await encrypt(testData, password)

      vi.stubGlobal('crypto', undefined)

      await expect(decrypt(encrypted, password)).rejects.toThrow('Web Crypto API is not available')

      vi.unstubAllGlobals()
    })

    it('should throw error with wrong password', async () => {
      const encrypted = await encrypt(testData, password)

      await expect(decrypt(encrypted, 'wrong-password')).rejects.toThrow('Decryption failed')
    })

    it('should throw error when decryption fails', async () => {
      const encrypted = await encrypt(testData, password)

      // Corrupt the encrypted data
      const corruptedEncrypted: EncryptedData = {
        ...encrypted,
        data: encrypted.data.slice(0, -10) + 'corrupted',
      }

      await expect(decrypt(corruptedEncrypted, password)).rejects.toThrow('Decryption failed')
    })

    it('should throw error with invalid base64', async () => {
      const encrypted = await encrypt(testData, password)

      const invalidEncrypted: EncryptedData = {
        ...encrypted,
        data: 'not-valid-base64!!!',
      }

      await expect(decrypt(invalidEncrypted, password)).rejects.toThrow('Decryption failed')
    })
  })

  describe('encrypt/decrypt round-trip', () => {
    const password = 'test-password-123'

    it('should encrypt and decrypt complex nested objects', async () => {
      const complexData = {
        user: {
          id: 123,
          name: 'Alice',
          roles: ['admin', 'user'],
          metadata: {
            created: new Date().toISOString(),
            tags: ['tag1', 'tag2'],
          },
        },
        settings: {
          theme: 'dark',
          notifications: true,
        },
      }

      const encrypted = await encrypt(complexData, password)
      const decrypted = await decrypt<typeof complexData>(encrypted, password)

      expect(decrypted).toEqual(complexData)
    })

    it('should handle empty objects', async () => {
      const emptyData = {}
      const encrypted = await encrypt(emptyData, password)
      const decrypted = await decrypt<typeof emptyData>(encrypted, password)

      expect(decrypted).toEqual(emptyData)
    })

    it('should handle null values', async () => {
      const nullData = { value: null }
      const encrypted = await encrypt(nullData, password)
      const decrypted = await decrypt<typeof nullData>(encrypted, password)

      expect(decrypted).toEqual(nullData)
    })

    it('should handle arrays', async () => {
      const arrayData = [1, 'two', { three: 3 }, [4, 5]]
      const encrypted = await encrypt(arrayData, password)
      const decrypted = await decrypt<typeof arrayData>(encrypted, password)

      expect(decrypted).toEqual(arrayData)
    })
  })

  describe('generateEncryptionKey', () => {
    it('should generate a random encryption key', () => {
      const key = generateEncryptionKey()

      expect(key).toBeDefined()
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(0)
    })

    it('should generate keys with custom length', () => {
      const key16 = generateEncryptionKey(16)
      const key64 = generateEncryptionKey(64)

      expect(key16).toBeDefined()
      expect(key64).toBeDefined()
      // Base64 encoded, so length will be different
      expect(key64.length).toBeGreaterThan(key16.length)
    })

    it('should generate different keys on each call', () => {
      const key1 = generateEncryptionKey()
      const key2 = generateEncryptionKey()

      expect(key1).not.toBe(key2)
    })

    it('should throw error when crypto is not available', () => {
      vi.stubGlobal('crypto', undefined)

      expect(() => generateEncryptionKey()).toThrow('Web Crypto API is not available')

      vi.unstubAllGlobals()
    })
  })

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'test-password-123'
      const hash = await hashPassword(password)

      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      // SHA-256 produces 64 character hex string
      expect(hash.length).toBe(64)
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true)
    })

    it('should produce consistent hashes for same password', async () => {
      const password = 'test-password-123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different passwords', async () => {
      const password1 = 'test-password-123'
      const password2 = 'different-password'

      const hash1 = await hashPassword(password1)
      const hash2 = await hashPassword(password2)

      expect(hash1).not.toBe(hash2)
    })

    it('should hash empty string', async () => {
      const hash = await hashPassword('')

      expect(hash).toBeDefined()
      expect(hash.length).toBe(64)
    })

    it('should hash long passwords', async () => {
      const longPassword = 'a'.repeat(1000)
      const hash = await hashPassword(longPassword)

      expect(hash).toBeDefined()
      expect(hash.length).toBe(64)
    })

    it('should throw error when crypto is not available', async () => {
      vi.stubGlobal('crypto', undefined)

      await expect(hashPassword('test')).rejects.toThrow('Web Crypto API is not available')

      vi.unstubAllGlobals()
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle very large data encryption', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: 'x'.repeat(100),
        })),
      }

      const password = 'test-password'
      const encrypted = await encrypt(largeData, password)
      const decrypted = await decrypt<typeof largeData>(encrypted, password)

      expect(decrypted.items.length).toBe(1000)
      expect(decrypted).toEqual(largeData)
    })

    it('should handle unicode characters', async () => {
      const unicodeData = {
        text: '你好世界 🌍 Здравствуй мир',
        emoji: '😀🎉🔥',
      }

      const password = 'test-password'
      const encrypted = await encrypt(unicodeData, password)
      const decrypted = await decrypt<typeof unicodeData>(encrypted, password)

      expect(decrypted).toEqual(unicodeData)
    })

    it('should handle special characters in password', async () => {
      const data = { test: 'value' }
      const specialPassword = 'p@$$w0rd!#%^&*()'

      const encrypted = await encrypt(data, specialPassword)
      const decrypted = await decrypt<typeof data>(encrypted, specialPassword)

      expect(decrypted).toEqual(data)
    })
  })
})
