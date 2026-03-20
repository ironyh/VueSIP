import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createCredentialStorage } from '../../../src/providers/credentialStorage'
import type { StoredCredentials } from '../../../src/providers/types'

describe('credentialStorage', () => {
  const mockCredentials: StoredCredentials = {
    providerId: 'test-provider',
    values: {
      username: 'testuser',
      password: 'testpass',
    },
    storedAt: Date.now(),
  }

  describe('localStorage storage', () => {
    let storage: ReturnType<typeof createCredentialStorage>
    let localStorageMock: Record<string, string>

    beforeEach(() => {
      localStorageMock = {}
      vi.stubGlobal('localStorage', {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key]
        }),
      })
      storage = createCredentialStorage('local')
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should save credentials to localStorage', () => {
      storage.save(mockCredentials)
      expect(localStorage.setItem).toHaveBeenCalledWith('vuesip_credentials', expect.any(String))
    })

    it('should load credentials from localStorage', () => {
      localStorageMock['vuesip_credentials'] = JSON.stringify(mockCredentials)
      const loaded = storage.load()
      expect(loaded).toEqual(mockCredentials)
    })

    it('should return null when no credentials stored', () => {
      const loaded = storage.load()
      expect(loaded).toBeNull()
    })

    it('should clear credentials from localStorage', () => {
      localStorageMock['vuesip_credentials'] = JSON.stringify(mockCredentials)
      storage.clear()
      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })

    it('should handle invalid JSON gracefully', () => {
      localStorageMock['vuesip_credentials'] = 'invalid-json'
      const loaded = storage.load()
      expect(loaded).toBeNull()
    })
  })

  describe('sessionStorage storage', () => {
    let storage: ReturnType<typeof createCredentialStorage>
    let sessionStorageMock: Record<string, string>

    beforeEach(() => {
      sessionStorageMock = {}
      vi.stubGlobal('sessionStorage', {
        getItem: vi.fn((key: string) => sessionStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          sessionStorageMock[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete sessionStorageMock[key]
        }),
      })
      storage = createCredentialStorage('session')
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should save credentials to sessionStorage', () => {
      storage.save(mockCredentials)
      expect(sessionStorage.setItem).toHaveBeenCalledWith('vuesip_credentials', expect.any(String))
    })

    it('should load credentials from sessionStorage', () => {
      sessionStorageMock['vuesip_credentials'] = JSON.stringify(mockCredentials)
      const loaded = storage.load()
      expect(loaded).toEqual(mockCredentials)
    })
  })

  describe('none storage', () => {
    let storage: ReturnType<typeof createCredentialStorage>

    beforeEach(() => {
      storage = createCredentialStorage('none')
    })

    it('should not persist credentials', () => {
      storage.save(mockCredentials)
      const loaded = storage.load()
      expect(loaded).toBeNull()
    })

    it('should do nothing on clear', () => {
      expect(() => storage.clear()).not.toThrow()
    })
  })

  describe('custom storage key', () => {
    let storage: ReturnType<typeof createCredentialStorage>
    let localStorageMock: Record<string, string>

    beforeEach(() => {
      localStorageMock = {}
      vi.stubGlobal('localStorage', {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key]
        }),
      })
      storage = createCredentialStorage('local', { key: 'custom_key' })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should use custom storage key', () => {
      storage.save(mockCredentials)
      expect(localStorage.setItem).toHaveBeenCalledWith('custom_key', expect.any(String))
    })
  })

  // ---------------------------------------------------------------------------
  // isStoredCredentials structural validation — VueSIP-ftup
  // Covers: missing providerId, empty providerId, non-string providerId,
  // missing values, null values, array values, missing storedAt, non-number
  // storedAt, and values with non-string entries.
  // ---------------------------------------------------------------------------
  describe('isStoredCredentials structural validation', () => {
    let storage: ReturnType<typeof createCredentialStorage>
    let localStorageMock: Record<string, string>

    beforeEach(() => {
      localStorageMock = {}
      vi.stubGlobal('localStorage', {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key]
        }),
      })
      storage = createCredentialStorage('local')
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    const validEntry = (overrides: Partial<StoredCredentials> = {}): StoredCredentials => ({
      providerId: 'test-provider',
      values: { username: 'user', password: 'pass' },
      storedAt: Date.now(),
      ...overrides,
    })

    it('should accept a valid StoredCredentials object', () => {
      localStorageMock['vuesip_credentials'] = JSON.stringify(validEntry())
      expect(storage.load()).toMatchObject({ providerId: 'test-provider' })
    })

    it('should reject and clear when providerId is missing', () => {
      localStorageMock['vuesip_credentials'] = JSON.stringify(
        validEntry({ providerId: undefined as unknown as string })
      )
      expect(storage.load()).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })

    it('should reject and clear when providerId is an empty string', () => {
      localStorageMock['vuesip_credentials'] = JSON.stringify(validEntry({ providerId: '' }))
      expect(storage.load()).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })

    it('should reject and clear when providerId is a non-string', () => {
      localStorageMock['vuesip_credentials'] = JSON.stringify(
        validEntry({ providerId: 123 as unknown as string })
      )
      expect(storage.load()).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })

    it('should reject and clear when values is missing', () => {
      const raw = { providerId: 'p', storedAt: Date.now() }
      localStorageMock['vuesip_credentials'] = JSON.stringify(raw)
      expect(storage.load()).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })

    it('should reject and clear when values is null', () => {
      localStorageMock['vuesip_credentials'] = JSON.stringify(
        validEntry({ values: null as unknown as Record<string, string> })
      )
      expect(storage.load()).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })

    it('should reject and clear when values is an array', () => {
      localStorageMock['vuesip_credentials'] = JSON.stringify(
        validEntry({ values: ['username', 'password'] as unknown as Record<string, string> })
      )
      expect(storage.load()).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })

    it('should reject and clear when storedAt is missing', () => {
      const raw = { providerId: 'p', values: { username: 'u' } }
      localStorageMock['vuesip_credentials'] = JSON.stringify(raw)
      expect(storage.load()).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })

    it('should reject and clear when storedAt is a non-number', () => {
      localStorageMock['vuesip_credentials'] = JSON.stringify(
        validEntry({ storedAt: '2024-01-01' as unknown as number })
      )
      expect(storage.load()).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })

    it('should reject and clear when storedAt is Infinity', () => {
      localStorageMock['vuesip_credentials'] = JSON.stringify(validEntry({ storedAt: Infinity }))
      expect(storage.load()).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })

    it('should reject and clear when a value entry is a non-string', () => {
      localStorageMock['vuesip_credentials'] = JSON.stringify(
        validEntry({ values: { username: 'user', password: 999 as unknown as string } })
      )
      expect(storage.load()).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })

    it('should reject and clear when the top-level stored value is null', () => {
      localStorageMock['vuesip_credentials'] = 'null'
      expect(storage.load()).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })

    it('should reject and clear when the top-level stored value is a primitive', () => {
      localStorageMock['vuesip_credentials'] = '"just a string"'
      expect(storage.load()).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })
  })
})
