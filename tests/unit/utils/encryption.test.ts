/**
 * Encryption utilities tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  encrypt,
  decrypt,
  isCryptoAvailable,
  generateEncryptionKey,
  hashPassword,
} from '@/utils/encryption'

//Vitest environment handles crypto

// Mock crypto.subtle
const mockSubtle = {
  importKey: vi.fn(),
  deriveKey: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  digest: vi.fn(),
}

const mockCrypto = {
  subtle: mockSubtle,
  getRandomValues: (arr: Uint8Array) => {
    // Fill with deterministic values for testing
    for (let i = 0; i < arr.length; i++) {
      arr[i] = i % 256
    }
    return arr
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  // Replace crypto with mock
  Object.defineProperty(globalThis, 'crypto', {
    value: mockCrypto,
    writable: true,
    configurable: true,
  })

  // Setup default mock implementations
  mockSubtle.importKey.mockResolvedValue({ type: 'test' })
  mockSubtle.deriveKey.mockResolvedValue({ type: 'derived' })
  mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(16))
  mockSubtle.decrypt.mockResolvedValue(new ArrayBuffer(16))
  mockSubtle.digest.mockImplementation(async (_algo: string, data: ArrayBuffer) => {
    // Return different hash based on input data
    const view = new Uint8Array(data)
    const len = Math.min(view.length, 32)
    const hash = new Uint8Array(32)
    for (let i = 0; i < len; i++) {
      hash[i] = view[i]
    }
    // Fill rest with deterministic pattern
    for (let i = len; i < 32; i++) {
      hash[i] = i
    }
    return hash.buffer
  })
})

describe('encryption', () => {
  describe('isCryptoAvailable', () => {
    it('should return true when crypto.subtle is available', () => {
      expect(isCryptoAvailable()).toBe(true)
    })
  })

  describe('encrypt/decrypt roundtrip', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const testData = { username: 'testuser', password: 'secret123' }
      const password = 'test-password'

      mockSubtle.encrypt.mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(testData)).buffer
      )

      const encrypted = await encrypt(testData, password)

      expect(encrypted).toHaveProperty('data')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('salt')
      expect(encrypted).toHaveProperty('algorithm', 'AES-GCM')
      expect(encrypted).toHaveProperty('version', 1)
    })

    it('should decrypt encrypted data back to original', async () => {
      const testData = { sipPassword: 'my-secret' }
      const password = 'encryption-key'

      const encrypted = await encrypt(testData, password)

      // Mock decrypt to return original data
      mockSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(testData)).buffer
      )

      const decrypted = await decrypt(encrypted, password)
      expect(decrypted).toEqual(testData)
    })

    it('should use custom iterations when provided', async () => {
      const testData = { value: 'test' }
      const password = 'key'
      const customIterations = 5000

      await encrypt(testData, password, { iterations: customIterations })

      expect(mockSubtle.deriveKey).toHaveBeenCalled()
    })
  })

  describe('encrypt error handling', () => {
    it('should throw when crypto is not available', async () => {
      // Temporarily make crypto unavailable
      Object.defineProperty(globalThis, 'crypto', {
        value: { subtle: undefined },
        writable: true,
        configurable: true,
      })

      await expect(encrypt({ test: 'data' }, 'password')).rejects.toThrow(
        'Web Crypto API is not available'
      )

      // Restore mock
      Object.defineProperty(globalThis, 'crypto', {
        value: mockCrypto,
        writable: true,
        configurable: true,
      })
    })

    it('should throw error when encryption fails', async () => {
      mockSubtle.encrypt.mockRejectedValue(new Error('Encryption error'))

      await expect(encrypt({ test: 'data' }, 'password')).rejects.toThrow('Encryption failed')
    })
  })

  describe('decrypt error handling', () => {
    it('should throw when crypto is not available', async () => {
      // Temporarily make crypto unavailable
      Object.defineProperty(globalThis, 'crypto', {
        value: { subtle: undefined },
        writable: true,
        configurable: true,
      })

      const encryptedData = {
        data: 'abc',
        iv: 'def',
        salt: 'ghi',
        algorithm: 'AES-GCM',
        iterations: 1000,
        version: 1,
      }

      await expect(decrypt(encryptedData, 'password')).rejects.toThrow(
        'Web Crypto API is not available'
      )

      // Restore mock
      Object.defineProperty(globalThis, 'crypto', {
        value: mockCrypto,
        writable: true,
        configurable: true,
      })
    })

    it('should throw when decryption fails', async () => {
      mockSubtle.decrypt.mockRejectedValue(new Error('Decryption error'))

      const encryptedData = {
        data: 'abc',
        iv: 'def',
        salt: 'ghi',
        algorithm: 'AES-GCM',
        iterations: 1000,
        version: 1,
      }

      await expect(decrypt(encryptedData, 'password')).rejects.toThrow('Decryption failed')
    })

    it('should fallback to default iterations for old data without iterations field', async () => {
      const encryptedData = {
        data: 'abc',
        iv: 'def',
        salt: 'ghi',
        algorithm: 'AES-GCM',
        // no iterations field - should fallback
        version: 1,
      }

      mockSubtle.decrypt.mockResolvedValue(new TextEncoder().encode('{"test":true}').buffer)

      await decrypt(encryptedData, 'password')

      // Should have called deriveKey
      expect(mockSubtle.deriveKey).toHaveBeenCalled()
    })
  })

  describe('generateEncryptionKey', () => {
    it('should generate a base64 encoded key', () => {
      const key = generateEncryptionKey()
      expect(key).toMatch(/^[A-Za-z0-9+/]+=*$/)
    })

    it('should generate key of custom length', () => {
      const key = generateEncryptionKey(64)
      // Base64 encodes 3 bytes per 4 chars, so 64 bytes = ~86 chars
      expect(key.length).toBeGreaterThan(60)
    })

    it('should throw when crypto is not available', () => {
      // Temporarily make crypto unavailable
      Object.defineProperty(globalThis, 'crypto', {
        value: { subtle: undefined },
        writable: true,
        configurable: true,
      })

      expect(() => generateEncryptionKey()).toThrow('Web Crypto API is not available')

      // Restore mock
      Object.defineProperty(globalThis, 'crypto', {
        value: mockCrypto,
        writable: true,
        configurable: true,
      })
    })
  })

  describe('hashPassword', () => {
    it('should hash password to hex string', async () => {
      const hash = await hashPassword('testpassword')
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should return consistent hash for same password', async () => {
      const hash1 = await hashPassword('password123')
      const hash2 = await hashPassword('password123')
      expect(hash1).toBe(hash2)
    })

    it('should return different hash for different passwords', async () => {
      const hash1 = await hashPassword('password1')
      const hash2 = await hashPassword('password2')
      expect(hash1).not.toBe(hash2)
    })

    it('should throw when crypto is not available', async () => {
      // Temporarily make crypto unavailable
      Object.defineProperty(globalThis, 'crypto', {
        value: { subtle: undefined },
        writable: true,
        configurable: true,
      })

      await expect(hashPassword('test')).rejects.toThrow('Web Crypto API is not available')

      // Restore mock
      Object.defineProperty(globalThis, 'crypto', {
        value: mockCrypto,
        writable: true,
        configurable: true,
      })
    })
  })
})
