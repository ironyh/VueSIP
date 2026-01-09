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
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'vuesip_credentials',
        expect.any(String)
      )
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
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'vuesip_credentials',
        expect.any(String)
      )
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
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'custom_key',
        expect.any(String)
      )
    })
  })
})
