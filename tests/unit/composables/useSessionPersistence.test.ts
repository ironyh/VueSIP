/**
 * useSessionPersistence composable unit tests
 * Tests for session persistence with IndexedDB
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useSessionPersistence } from '@/composables/useSessionPersistence'
import type { PersistedSessionState } from '@/types/session-persistence.types'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock IndexedDB
const createMockIndexedDB = () => {
  let store: Record<string, any> = {}

  const mockTransaction = {
    objectStore: vi.fn(() => ({
      get: vi.fn((key: string) => {
        const request = {
          result: store[key] ? { ...store[key] } : undefined,
          onsuccess: null as ((e: Event) => void) | null,
          onerror: null as ((e: Event) => void) | null,
        }
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({} as Event)
          }
        }, 0)
        return request
      }),
      put: vi.fn((value: any) => {
        const key = value.key || 'vuesip_session'
        store[key] = { ...value }
        const request = {
          onsuccess: null as ((e: Event) => void) | null,
          onerror: null as ((e: Event) => void) | null,
        }
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({} as Event)
          }
        }, 0)
        return request
      }),
      delete: vi.fn((key: string) => {
        delete store[key]
        const request = {
          onsuccess: null as ((e: Event) => void) | null,
          onerror: null as ((e: Event) => void) | null,
        }
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({} as Event)
          }
        }, 0)
        return request
      }),
    })),
    oncomplete: null as (() => void) | null,
    onerror: null as ((e: Event) => void) | null,
  }

  const mockDB = {
    transaction: vi.fn(() => mockTransaction),
    objectStoreNames: { contains: vi.fn(() => true) },
    createObjectStore: vi.fn(),
    close: vi.fn(),
  }

  const mockRequest = {
    result: mockDB,
    onsuccess: null as ((e: Event) => void) | null,
    onerror: null as ((e: Event) => void) | null,
    onupgradeneeded: null as ((e: Event) => void) | null,
  }

  const mockIndexedDB = {
    open: vi.fn(() => {
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: mockDB } } as unknown as Event)
        }
      }, 0)
      return mockRequest
    }),
    deleteDatabase: vi.fn(),
  }

  return {
    mockIndexedDB,
    mockDB,
    mockRequest,
    mockTransaction,
    clearStore: () => {
      store = {}
    },
    getStore: () => store,
    setStore: (data: Record<string, any>) => {
      store = data
    },
  }
}

describe('useSessionPersistence', () => {
  let mockIDB: ReturnType<typeof createMockIndexedDB>
  let originalIndexedDB: IDBFactory | undefined

  beforeEach(() => {
    vi.useFakeTimers()
    mockIDB = createMockIndexedDB()
    originalIndexedDB = globalThis.indexedDB

    // Set up mock IndexedDB
    Object.defineProperty(globalThis, 'indexedDB', {
      value: mockIDB.mockIndexedDB,
      writable: true,
      configurable: true,
    })

    mockIDB.clearStore()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()

    // Restore original IndexedDB
    if (originalIndexedDB !== undefined) {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: originalIndexedDB,
        writable: true,
        configurable: true,
      })
    }
  })

  // ==========================================================================
  // Initialization
  // ==========================================================================
  describe('Initialization', () => {
    it('should return all expected methods and properties', () => {
      const result = useSessionPersistence()

      expect(result.saveSession).toBeDefined()
      expect(typeof result.saveSession).toBe('function')
      expect(result.loadSession).toBeDefined()
      expect(typeof result.loadSession).toBe('function')
      expect(result.clearSession).toBeDefined()
      expect(typeof result.clearSession).toBe('function')
      expect(result.hasSavedSession).toBeDefined()
      expect(result.isLoading).toBeDefined()
      expect(result.error).toBeDefined()
      expect(result.savedSessionInfo).toBeDefined()
    })

    it('should initialize with hasSavedSession as false', () => {
      const { hasSavedSession } = useSessionPersistence()
      expect(hasSavedSession.value).toBe(false)
    })

    it('should initialize with isLoading as false', () => {
      const { isLoading } = useSessionPersistence()
      expect(isLoading.value).toBe(false)
    })

    it('should initialize with error as null', () => {
      const { error } = useSessionPersistence()
      expect(error.value).toBeNull()
    })

    it('should initialize with savedSessionInfo as empty', () => {
      const { savedSessionInfo } = useSessionPersistence()
      expect(savedSessionInfo.value?.exists).toBe(false)
    })

    it('should accept custom options', () => {
      const { hasSavedSession } = useSessionPersistence({
        storageKey: 'custom_key',
        maxAge: 60000,
        autoRestore: false,
      })

      expect(hasSavedSession.value).toBe(false)
    })
  })

  // ==========================================================================
  // Save Session
  // ==========================================================================
  describe('saveSession', () => {
    it('should save session state to IndexedDB', async () => {
      const { saveSession, hasSavedSession } = useSessionPersistence()

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123',
        remoteUri: 'sip:bob@example.com',
        callDirection: 'outbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: Date.now(),
      }

      const savePromise = saveSession(sessionState)
      await vi.runAllTimersAsync()
      await savePromise

      expect(hasSavedSession.value).toBe(true)
    })

    it('should preserve timestamp when saving', async () => {
      const { saveSession, loadSession } = useSessionPersistence()

      const now = Date.now()
      vi.setSystemTime(now)

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123',
        remoteUri: 'sip:test@example.com',
        callDirection: 'outbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: now,
      }

      const savePromise = saveSession(sessionState)
      await vi.runAllTimersAsync()
      await savePromise

      const loadPromise = loadSession()
      await vi.runAllTimersAsync()
      const loaded = await loadPromise

      expect(loaded?.timestamp).toBe(now)
    })

    it('should update savedSessionInfo after saving', async () => {
      const { saveSession, savedSessionInfo } = useSessionPersistence()

      const now = Date.now()
      vi.setSystemTime(now)

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-456',
        remoteUri: 'sip:test@example.com',
        callDirection: 'outbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: now,
      }

      const savePromise = saveSession(sessionState)
      await vi.runAllTimersAsync()
      await savePromise
      await nextTick()

      expect(savedSessionInfo.value?.exists).toBe(true)
      expect(savedSessionInfo.value?.sessionId).toBe('test-call-456')
      expect(savedSessionInfo.value?.timestamp).toBe(now)
    })

    it('should set isLoading to true during save operation', async () => {
      const { saveSession, isLoading } = useSessionPersistence()

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123',
        remoteUri: 'sip:test@example.com',
        callDirection: 'outbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: Date.now(),
      }

      const savePromise = saveSession(sessionState)

      // isLoading should be true immediately after calling save
      expect(isLoading.value).toBe(true)

      await vi.runAllTimersAsync()
      await savePromise

      expect(isLoading.value).toBe(false)
    })

  })

  // ==========================================================================
  // Load Session
  // ==========================================================================
  describe('loadSession', () => {
    it('should return saved session state', async () => {
      const { saveSession, loadSession } = useSessionPersistence()

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123',
        remoteUri: 'sip:bob@example.com',
        callDirection: 'outbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: Date.now(),
      }

      const savePromise = saveSession(sessionState)
      await vi.runAllTimersAsync()
      await savePromise

      const loadPromise = loadSession()
      await vi.runAllTimersAsync()
      const loaded = await loadPromise

      expect(loaded).not.toBeNull()
      expect(loaded?.sessionId).toBe('test-call-123')
      expect(loaded?.remoteUri).toBe('sip:bob@example.com')
    })

    it('should return null if no session is saved', async () => {
      const { loadSession } = useSessionPersistence()

      const loadPromise = loadSession()
      await vi.runAllTimersAsync()
      const loaded = await loadPromise

      expect(loaded).toBeNull()
    })

    it('should set isLoading to true during load operation', async () => {
      const { loadSession, isLoading } = useSessionPersistence()

      const loadPromise = loadSession()

      expect(isLoading.value).toBe(true)

      await vi.runAllTimersAsync()
      await loadPromise

      expect(isLoading.value).toBe(false)
    })

    it('should call onRestoreSuccess callback when session is loaded', async () => {
      const onRestoreSuccess = vi.fn()
      const { saveSession, loadSession } = useSessionPersistence({
        onRestoreSuccess,
      })

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123',
        remoteUri: 'sip:test@example.com',
        callDirection: 'outbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: Date.now(),
      }

      const savePromise = saveSession(sessionState)
      await vi.runAllTimersAsync()
      await savePromise

      const loadPromise = loadSession()
      await vi.runAllTimersAsync()
      const loaded = await loadPromise

      expect(loaded).not.toBeNull()
      expect(onRestoreSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'test-call-123' })
      )
    })

    it('should not call onRestoreError callback when no session exists', async () => {
      const onRestoreError = vi.fn()
      const { loadSession } = useSessionPersistence({
        onRestoreError,
      })

      const loadPromise = loadSession()
      await vi.runAllTimersAsync()
      const result = await loadPromise

      expect(result).toBeNull()
      expect(onRestoreError).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Clear Session
  // ==========================================================================
  describe('clearSession', () => {
    it('should clear saved session', async () => {
      const { saveSession, clearSession, hasSavedSession } = useSessionPersistence()

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123',
        remoteUri: 'sip:test@example.com',
        callDirection: 'outbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: Date.now(),
      }

      const savePromise = saveSession(sessionState)
      await vi.runAllTimersAsync()
      await savePromise

      expect(hasSavedSession.value).toBe(true)

      const clearPromise = clearSession()
      await vi.runAllTimersAsync()
      await clearPromise

      expect(hasSavedSession.value).toBe(false)
    })

    it('should clear savedSessionInfo after clearing', async () => {
      const { saveSession, clearSession, savedSessionInfo } = useSessionPersistence()

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123',
        remoteUri: 'sip:test@example.com',
        callDirection: 'outbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: Date.now(),
      }

      const savePromise = saveSession(sessionState)
      await vi.runAllTimersAsync()
      await savePromise
      await nextTick()

      expect(savedSessionInfo.value?.exists).toBe(true)

      const clearPromise = clearSession()
      await vi.runAllTimersAsync()
      await clearPromise
      await nextTick()

      expect(savedSessionInfo.value?.exists).toBe(false)
    })

    it('should set isLoading to true during clear operation', async () => {
      const { saveSession, clearSession, isLoading } = useSessionPersistence()

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123',
        remoteUri: 'sip:test@example.com',
        callDirection: 'outbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: Date.now(),
      }

      const savePromise = saveSession(sessionState)
      await vi.runAllTimersAsync()
      await savePromise

      const clearPromise = clearSession()

      expect(isLoading.value).toBe(true)

      await vi.runAllTimersAsync()
      await clearPromise

      expect(isLoading.value).toBe(false)
    })

    it('should not throw when clearing non-existent session', async () => {
      const { clearSession, error } = useSessionPersistence()

      const clearPromise = clearSession()
      await vi.runAllTimersAsync()
      await clearPromise

      expect(error.value).toBeNull()
    })
  })

  // ==========================================================================
  // Session Expiry
  // ==========================================================================
  describe('Session Expiry', () => {
    it('should return null for expired sessions', async () => {
      const maxAge = 60000 // 1 minute
      const { saveSession, loadSession } = useSessionPersistence({ maxAge })

      const startTime = Date.now()
      vi.setSystemTime(startTime)

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123', remoteUri: 'sip:test@example.com', callDirection: 'outbound' as const, holdState: false, muteState: { audio: false, video: false }, timestamp: Date.now(),
      }

      const savePromise = saveSession(sessionState)
      await vi.runAllTimersAsync()
      await savePromise

      // Advance time beyond maxAge
      vi.setSystemTime(startTime + maxAge + 1000)

      const loadPromise = loadSession()
      await vi.runAllTimersAsync()
      const loaded = await loadPromise

      expect(loaded).toBeNull()
    })

    it('should return session if not expired', async () => {
      const maxAge = 60000 // 1 minute
      const { saveSession, loadSession } = useSessionPersistence({ maxAge })

      const startTime = Date.now()
      vi.setSystemTime(startTime)

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123', remoteUri: 'sip:test@example.com', callDirection: 'outbound' as const, holdState: false, muteState: { audio: false, video: false }, timestamp: Date.now(),
      }

      const savePromise = saveSession(sessionState)
      await vi.runAllTimersAsync()
      await savePromise

      // Advance time but stay within maxAge
      vi.setSystemTime(startTime + maxAge - 1000)

      const loadPromise = loadSession()
      await vi.runAllTimersAsync()
      const loaded = await loadPromise

      expect(loaded).not.toBeNull()
      expect(loaded?.sessionId).toBe('test-call-123')
    })

    it('should use default maxAge of 5 minutes', async () => {
      const { saveSession, loadSession } = useSessionPersistence()

      const startTime = Date.now()
      vi.setSystemTime(startTime)

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123', remoteUri: 'sip:test@example.com', callDirection: 'outbound' as const, holdState: false, muteState: { audio: false, video: false }, timestamp: Date.now(),
      }

      const savePromise = saveSession(sessionState)
      await vi.runAllTimersAsync()
      await savePromise

      // Advance time to 4 minutes (should still be valid)
      vi.setSystemTime(startTime + 4 * 60 * 1000)

      const loadPromise1 = loadSession()
      await vi.runAllTimersAsync()
      const loaded1 = await loadPromise1

      expect(loaded1).not.toBeNull()

      // Advance time to 6 minutes from original start (should be expired)
      vi.setSystemTime(startTime + 6 * 60 * 1000)

      const loadPromise2 = loadSession()
      await vi.runAllTimersAsync()
      const loaded2 = await loadPromise2

      expect(loaded2).toBeNull()
    })

    it('should clear expired session on load attempt', async () => {
      const maxAge = 60000 // 1 minute
      const { saveSession, loadSession, hasSavedSession } = useSessionPersistence({
        maxAge,
      })

      const startTime = Date.now()
      vi.setSystemTime(startTime)

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123', remoteUri: 'sip:test@example.com', callDirection: 'outbound' as const, holdState: false, muteState: { audio: false, video: false }, timestamp: Date.now(),
      }

      const savePromise = saveSession(sessionState)
      await vi.runAllTimersAsync()
      await savePromise

      expect(hasSavedSession.value).toBe(true)

      // Advance time beyond maxAge
      vi.setSystemTime(startTime + maxAge + 1000)

      const loadPromise = loadSession()
      await vi.runAllTimersAsync()
      await loadPromise

      // Session should be cleared because it was expired
      expect(hasSavedSession.value).toBe(false)
    })
  })

  // ==========================================================================
  // Error Handling
  // ==========================================================================
  describe('Error Handling', () => {
    it('should handle IndexedDB not available gracefully', async () => {
      // Remove IndexedDB
      Object.defineProperty(globalThis, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const { saveSession, error } = useSessionPersistence()

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123', remoteUri: 'sip:test@example.com', callDirection: 'outbound' as const, holdState: false, muteState: { audio: false, video: false }, timestamp: Date.now(),
      }

      try {
        await saveSession(sessionState)
      } catch {
        // Expected to throw
      }

      expect(error.value).not.toBeNull()
      expect(error.value?.message).toContain('IndexedDB')
    })

    it('should set error when database open fails', async () => {
      // Make database open fail
      mockIDB.mockIndexedDB.open = vi.fn(() => {
        const request = {
          result: null,
          error: new Error('Database open failed'),
          onsuccess: null as ((e: Event) => void) | null,
          onerror: null as ((e: Event) => void) | null,
          onupgradeneeded: null as ((e: Event) => void) | null,
        }
        // Use queueMicrotask to ensure proper async handling
        queueMicrotask(() => {
          if (request.onerror) {
            request.onerror({ target: request } as unknown as Event)
          }
        })
        return request
      })

      const { saveSession, error } = useSessionPersistence()

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123', remoteUri: 'sip:test@example.com', callDirection: 'outbound' as const, holdState: false, muteState: { audio: false, video: false }, timestamp: Date.now(),
      }

      // Use expect().rejects to properly handle async rejection
      await expect(saveSession(sessionState)).rejects.toThrow()

      // Error should be set
      expect(error.value).not.toBeNull()
    })

    it('should clear error on successful operation', async () => {
      // First create a new instance that will fail
      Object.defineProperty(globalThis, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const { saveSession, error } = useSessionPersistence()

      try {
        await saveSession({ callId: 'test' })
      } catch {
        // Expected
      }

      expect(error.value).not.toBeNull()

      // Restore IndexedDB
      Object.defineProperty(globalThis, 'indexedDB', {
        value: mockIDB.mockIndexedDB,
        writable: true,
        configurable: true,
      })

      // Create new instance for successful operation
      const { loadSession, error: error2 } = useSessionPersistence()

      // Successful load should have null error
      const loadPromise = loadSession()
      await vi.runAllTimersAsync()
      await loadPromise

      expect(error2.value).toBeNull()
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle sequential save calls', async () => {
      const { saveSession, hasSavedSession, savedSessionInfo } = useSessionPersistence()

      const session1: PersistedSessionState = {
        sessionId: 'call-1',
        remoteUri: 'sip:test1@example.com',
        callDirection: 'outbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: Date.now(),
      }
      const session2: PersistedSessionState = {
        sessionId: 'call-2',
        remoteUri: 'sip:test2@example.com',
        callDirection: 'outbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: Date.now(),
      }

      // Save first session
      const promise1 = saveSession(session1)
      await vi.runAllTimersAsync()
      await promise1

      expect(hasSavedSession.value).toBe(true)
      expect(savedSessionInfo.value?.sessionId).toBe('call-1')

      // Save second session (overwrites first)
      const promise2 = saveSession(session2)
      await vi.runAllTimersAsync()
      await promise2

      expect(hasSavedSession.value).toBe(true)
      expect(savedSessionInfo.value?.sessionId).toBe('call-2')
    })

    it('should handle save then load sequence', async () => {
      const { saveSession, loadSession } = useSessionPersistence()

      const sessionState: PersistedSessionState = {
        sessionId: 'test-call-123',
        remoteUri: 'sip:test@example.com',
        callDirection: 'outbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: Date.now(),
      }

      // Save first
      const savePromise = saveSession(sessionState)
      await vi.runAllTimersAsync()
      await savePromise

      // Then load
      const loadPromise = loadSession()
      await vi.runAllTimersAsync()
      const loaded = await loadPromise

      expect(loaded?.sessionId).toBe('test-call-123')
    })

    it('should handle session with all required fields', async () => {
      const { saveSession, loadSession } = useSessionPersistence()

      const minimalSession: PersistedSessionState = {
        sessionId: 'minimal-call',
        remoteUri: 'sip:minimal@example.com',
        callDirection: 'outbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: Date.now(),
      }

      const savePromise = saveSession(minimalSession)
      await vi.runAllTimersAsync()
      await savePromise

      const loadPromise = loadSession()
      await vi.runAllTimersAsync()
      const loaded = await loadPromise

      expect(loaded?.sessionId).toBe('minimal-call')
    })

    it('should handle session with empty remoteUri', async () => {
      const { saveSession, loadSession } = useSessionPersistence()

      const sessionWithEmptyStrings: PersistedSessionState = {
        sessionId: 'test-id',
        remoteUri: '',
        callDirection: 'inbound',
        holdState: false,
        muteState: { audio: false, video: false },
        timestamp: Date.now(),
      }

      const savePromise = saveSession(sessionWithEmptyStrings)
      await vi.runAllTimersAsync()
      await savePromise

      const loadPromise = loadSession()
      await vi.runAllTimersAsync()
      const loaded = await loadPromise

      expect(loaded?.sessionId).toBe('test-id')
      expect(loaded?.remoteUri).toBe('')
    })
  })
})
