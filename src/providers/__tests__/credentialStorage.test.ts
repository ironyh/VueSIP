/**
 * Credential Storage Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCredentialStorage } from '../credentialStorage'
import type { StoredCredentials } from './types'

describe('credentialStorage', () => {
  // Mock localStorage
  let localStorageMock: {
    getItem: ReturnType<typeof vi.fn>
    setItem: ReturnType<typeof vi.fn>
    removeItem: ReturnType<typeof vi.fn>
  }

  // Mock sessionStorage
  let sessionStorageMock: {
    getItem: ReturnType<typeof vi.fn>
    setItem: ReturnType<typeof vi.fn>
    removeItem: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    sessionStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }

    // @ts-ignore - Mock global objects
    global.localStorage = localStorageMock
    // @ts-ignore
    global.sessionStorage = sessionStorageMock
  })

  describe('createCredentialStorage', () => {
    describe('local storage', () => {
      it('should create local storage instance', () => {
        const storage = createCredentialStorage('local')
        expect(storage).toBeDefined()
        expect(typeof storage.save).toBe('function')
        expect(typeof storage.load).toBe('function')
        expect(typeof storage.clear).toBe('function')
      })

      it('should use custom key when provided', () => {
        const storage = createCredentialStorage('local', { key: 'custom-key' })

        const testCredentials: StoredCredentials = {
          providerId: 'test',
          values: { username: 'testuser' },
          storedAt: Date.now(),
        }

        storage.save(testCredentials)

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'custom-key',
          JSON.stringify(testCredentials)
        )
      })

      it('should use default key when not provided', () => {
        const storage = createCredentialStorage('local')

        const testCredentials: StoredCredentials = {
          providerId: 'test',
          values: { username: 'testuser' },
          storedAt: Date.now(),
        }

        storage.save(testCredentials)

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'vuesip_credentials',
          JSON.stringify(testCredentials)
        )
      })

      it('should load credentials from localStorage', () => {
        const testData: StoredCredentials = {
          providerId: 'test-provider',
          values: { username: 'testuser', password: 'testpass' },
          storedAt: Date.now(),
        }

        localStorageMock.getItem.mockReturnValue(JSON.stringify(testData))

        const storage = createCredentialStorage('local')
        const result = storage.load()

        expect(result).toEqual(testData)
      })

      it('should return null when no data stored', () => {
        localStorageMock.getItem.mockReturnValue(null)

        const storage = createCredentialStorage('local')
        const result = storage.load()

        expect(result).toBeNull()
      })

      it('should return null on parse error', () => {
        localStorageMock.getItem.mockReturnValue('invalid-json')

        const storage = createCredentialStorage('local')
        const result = storage.load()

        expect(result).toBeNull()
      })

      it('should clear credentials from localStorage', () => {
        const storage = createCredentialStorage('local')
        storage.clear()

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('vuesip_credentials')
      })
    })

    describe('session storage', () => {
      it('should create session storage instance', () => {
        const storage = createCredentialStorage('session')
        expect(storage).toBeDefined()
      })

      it('should save to sessionStorage', () => {
        const storage = createCredentialStorage('session')

        const testCredentials: StoredCredentials = {
          providerId: 'test',
          values: { username: 'testuser' },
          storedAt: Date.now(),
        }

        storage.save(testCredentials)

        expect(sessionStorageMock.setItem).toHaveBeenCalled()
      })

      it('should load from sessionStorage', () => {
        const testData: StoredCredentials = {
          providerId: 'test-provider',
          values: { username: 'testuser' },
          storedAt: Date.now(),
        }

        sessionStorageMock.getItem.mockReturnValue(JSON.stringify(testData))

        const storage = createCredentialStorage('session')
        const result = storage.load()

        expect(result).toEqual(testData)
      })

      it('should clear from sessionStorage', () => {
        const storage = createCredentialStorage('session')
        storage.clear()

        expect(sessionStorageMock.removeItem).toHaveBeenCalled()
      })
    })

    describe('none storage', () => {
      it('should create no-op storage instance', () => {
        const storage = createCredentialStorage('none')
        expect(storage).toBeDefined()
      })

      it('should not save anything', () => {
        const storage = createCredentialStorage('none')

        const testCredentials: StoredCredentials = {
          providerId: 'test',
          values: { username: 'testuser' },
          storedAt: Date.now(),
        }

        // Should not throw
        expect(() => storage.save(testCredentials)).not.toThrow()

        // localStorage should not be called
        expect(localStorageMock.setItem).not.toHaveBeenCalled()
        expect(sessionStorageMock.setItem).not.toHaveBeenCalled()
      })

      it('should always return null when loading', () => {
        const storage = createCredentialStorage('none')
        const result = storage.load()

        expect(result).toBeNull()
      })

      it('should do nothing on clear', () => {
        const storage = createCredentialStorage('none')

        // Should not throw
        expect(() => storage.clear()).not.toThrow()

        // No storage should be called
        expect(localStorageMock.removeItem).not.toHaveBeenCalled()
        expect(sessionStorageMock.removeItem).not.toHaveBeenCalled()
      })
    })

    describe('error handling', () => {
      it('should handle localStorage quota exceeded', () => {
        localStorageMock.setItem.mockImplementation(() => {
          throw new Error('Quota exceeded')
        })

        const storage = createCredentialStorage('local')

        const testCredentials: StoredCredentials = {
          providerId: 'test',
          values: { username: 'testuser' },
          storedAt: Date.now(),
        }

        // Should not throw
        expect(() => storage.save(testCredentials)).not.toThrow()
      })

      it('should handle localStorage disabled', () => {
        localStorageMock.getItem.mockImplementation(() => {
          throw new Error('Storage disabled')
        })

        const storage = createCredentialStorage('local')
        const result = storage.load()

        expect(result).toBeNull()
      })

      it('should handle clear error', () => {
        localStorageMock.removeItem.mockImplementation(() => {
          throw new Error('Storage disabled')
        })

        const storage = createCredentialStorage('local')

        // Should not throw
        expect(() => storage.clear()).not.toThrow()
      })
    })
  })
})
