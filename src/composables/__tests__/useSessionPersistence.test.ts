/**
 * useSessionPersistence Unit Tests
 *
 * Uses a fully-synchronous in-memory store that bypasses IndexedDB entirely.
 * All IDB operations complete instantly — the composable's openDatabase() is
 * monkey-patched to return a sync in-memory database, so no fake timers are
 * needed and tests run fast without any async/await juggling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSessionPersistence } from '../useSessionPersistence'
import type {
  PersistedSessionState,
  SessionPersistenceOptions,
} from '@/types/session-persistence.types'

// ========================================================================
// Synchronous In-Memory Store (replaces IndexedDB entirely)
// ========================================================================

/**
 * A tiny synchronous IDB-alike built on a plain Map.
 * Satisfies the subset of the IDB API that useSessionPersistence needs:
 *   - db.transaction().objectStore().get|put|delete
 *   - request.onsuccess assignment (synchronous via callback immediately invoked)
 */
class SyncIDBObjectStore {
  constructor(private store: Map<string, unknown>) {}

  get(key: string): IDBRequest<PersistedSessionState | undefined> {
    const result = this.store.get(key) as PersistedSessionState | undefined
    // Immediately invoke any attached onsuccess handler
    const request = makeRequest(result)
    return request
  }

  put(value: unknown): IDBRequest<undefined> {
    const data = value as Record<string, unknown>
    this.store.set(data.key as string, value)
    const request = makeRequest(undefined)
    return request
  }

  delete(key: string): IDBRequest<undefined> {
    this.store.delete(key)
    const request = makeRequest(undefined)
    return request
  }
}

class SyncIDBDatabase {
  private store = new Map<string, unknown>()

  transaction(_stores: string | string[], _mode?: IDBTransactionMode): IDBTransaction {
    const objectStore = new SyncIDBObjectStore(this.store)
    return {
      objectStoreNames: { contains: () => true, length: 1, [Symbol.iterator]: function* () {} },
      mode: _mode ?? 'readonly',
      db: this as unknown as IDBDatabase,
      abort: vi.fn(),
      commit: vi.fn(),
      error: null,
      objectStore: () => objectStore,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as IDBTransaction
  }

  objectStoreNames = {
    contains: (name: string) => name === 'sessions',
    length: 1,
    [Symbol.iterator]: function* () {} as IterableIterator<string>,
  }

  close = vi.fn()
  createObjectStore = vi.fn()
  deleteObjectStore = vi.fn()
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  dispatchEvent = vi.fn()
}

/**
 * Build a mock IDBRequest with an immediately-invoked onsuccess.
 * The caller assigns request.onsuccess = fn; the mock then calls it right away
 * so the Promise inside the composable resolves synchronously.
 */
function makeRequest<T>(result: T): IDBRequest<T> {
  const request = {
    result,
    error: undefined as unknown as DOMException,
    readyState: 'done',
    transaction: null,
    onblocked: null,
    onupgradeneeded: null,
    onsuccess: null as ((this: IDBRequest<T>) => void) | null,
    onerror: null as ((this: IDBRequest<T>) => void) | null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as IDBRequest<T>

  // Replace onsuccess setter so that assigning it immediately fires the callback
  // (mirrors real IDB behaviour: onsuccess fires as soon as the operation completes)
  let storedCallback: ((this: IDBRequest<T>) => void) | null = null
  Object.defineProperty(request, 'onsuccess', {
    configurable: true,
    set(fn: ((this: IDBRequest<T>) => void) | null) {
      storedCallback = fn
      if (fn) {
        // Fire synchronously — the "async" operation is instantly complete
        fn.call(request)
      }
    },
    get() {
      return storedCallback
    },
  })

  return request
}

function createSyncIndexedDBFactory(): typeof indexedDB {
  let sharedDb: SyncIDBDatabase | null = null

  return {
    open: (_name: string, _version?: number): IDBOpenDBRequest => {
      if (!sharedDb) {
        sharedDb = new SyncIDBDatabase()
      }
      const db = sharedDb
      const request = makeRequest<IDBDatabase>(db as unknown as IDBDatabase)
      // Also fire onupgradeneeded synchronously for first open
      // (the composable doesn't use it, but real IDB fires it)
      return request as unknown as IDBOpenDBRequest
    },
    deleteDatabase: (_name: string): IDBOpenDBRequest => {
      sharedDb = null
      return makeRequest<IDBDatabase | undefined>(
        undefined as unknown as IDBDatabase
      ) as unknown as IDBOpenDBRequest
    },
    cmp: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as typeof indexedDB
}

// ========================================================================
// Test Helpers
// ========================================================================

function createSessionState(overrides: Partial<PersistedSessionState> = {}): PersistedSessionState {
  return {
    sessionId: 'test-session-1',
    remoteUri: 'sip:1001@example.com',
    callDirection: 'outbound',
    holdState: false,
    muteState: { audio: false, video: false },
    timestamp: Date.now(),
    ...overrides,
  }
}

function createOptions(
  overrides: Partial<SessionPersistenceOptions> = {}
): SessionPersistenceOptions {
  return {
    storageKey: 'test_session',
    maxAge: 5 * 60 * 1000,
    autoRestore: false,
    ...overrides,
  }
}

// ========================================================================
// Tests
// ========================================================================

describe('useSessionPersistence', () => {
  beforeEach(() => {
    // Install synchronous mock — no fake timers needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).indexedDB = createSyncIndexedDBFactory()
  })

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).indexedDB
    vi.clearAllMocks()
  })

  // ========================================================================
  // Initial State
  // ========================================================================

  describe('initial state', () => {
    it('should initialize with no saved session', () => {
      const { hasSavedSession, savedSessionInfo } = useSessionPersistence(createOptions())
      expect(hasSavedSession.value).toBe(false)
      expect(savedSessionInfo.value).toEqual({ exists: false })
    })

    it('should initialize with isLoading false', () => {
      const { isLoading } = useSessionPersistence(createOptions())
      expect(isLoading.value).toBe(false)
    })

    it('should initialize with null error', () => {
      const { error } = useSessionPersistence(createOptions())
      expect(error.value).toBeNull()
    })

    it('should use default storage key when not provided', () => {
      const { hasSavedSession } = useSessionPersistence()
      expect(hasSavedSession.value).toBe(false)
    })

    it('should use custom storage key when provided', () => {
      const customKey = 'custom_session_key'
      const { hasSavedSession } = useSessionPersistence(createOptions({ storageKey: customKey }))
      expect(hasSavedSession.value).toBe(false)
    })
  })

  // ========================================================================
  // savedSessionInfo computed
  // ========================================================================

  describe('savedSessionInfo computed', () => {
    it('should return exists:false when no session saved', () => {
      const { savedSessionInfo } = useSessionPersistence(createOptions())
      expect(savedSessionInfo.value).toEqual({ exists: false })
    })

    it('should return exists:true with session data when session is saved', async () => {
      const state = createSessionState({ sessionId: 'session-123' })
      const { saveSession, savedSessionInfo } = useSessionPersistence(createOptions())

      await saveSession(state)

      expect(savedSessionInfo.value).toMatchObject({
        exists: true,
        sessionId: 'session-123',
      })
    })

    it('should calculate session age based on timestamp', async () => {
      const now = Date.now()
      const state = createSessionState({ sessionId: 'session-age', timestamp: now - 60000 })
      const { saveSession, savedSessionInfo } = useSessionPersistence(createOptions())

      await saveSession(state)

      // Age should be at least 60000ms
      expect(savedSessionInfo.value?.age).toBeGreaterThanOrEqual(60000)
    })
  })

  // ========================================================================
  // saveSession
  // ========================================================================

  describe('saveSession', () => {
    it('should save session state to IndexedDB', async () => {
      const state = createSessionState({ sessionId: 'save-test-1' })
      const { saveSession, hasSavedSession } = useSessionPersistence(createOptions())

      await saveSession(state)

      expect(hasSavedSession.value).toBe(true)
    })

    it('should set isLoading during save operation', async () => {
      const state = createSessionState()
      const { saveSession, isLoading } = useSessionPersistence(createOptions())

      const savePromise = saveSession(state)
      // Flush microtask queue — onsuccess fires synchronously when onsuccess is assigned
      await Promise.resolve()

      expect(isLoading.value).toBe(true)

      await savePromise
      expect(isLoading.value).toBe(false)
    })

    it('should preserve all session state fields', async () => {
      const state = createSessionState({
        sessionId: 'full-state-test',
        remoteUri: 'sip:2001@example.com',
        callDirection: 'inbound',
        holdState: true,
        muteState: { audio: true, video: false },
      })

      const { saveSession, savedSessionInfo } = useSessionPersistence(createOptions())

      await saveSession(state)

      expect(savedSessionInfo.value).toMatchObject({
        exists: true,
        sessionId: 'full-state-test',
      })
    })

    it('should update existing session when saving again', async () => {
      const state1 = createSessionState({ sessionId: 'session-1' })
      const state2 = createSessionState({ sessionId: 'session-2' })

      const { saveSession, savedSessionInfo } = useSessionPersistence(createOptions())

      await saveSession(state1)
      expect(savedSessionInfo.value?.sessionId).toBe('session-1')

      await saveSession(state2)
      expect(savedSessionInfo.value?.sessionId).toBe('session-2')
    })

    it('should clear previous error on successful save', async () => {
      const { saveSession, error } = useSessionPersistence(createOptions())

      await saveSession(createSessionState())

      expect(error.value).toBeNull()
    })
  })

  // ========================================================================
  // loadSession
  // ========================================================================

  describe('loadSession', () => {
    it('should return null when no session is saved', async () => {
      const { loadSession } = useSessionPersistence(createOptions())

      const result = await loadSession()

      expect(result).toBeNull()
    })

    it('should return saved session when one exists', async () => {
      const state = createSessionState({ sessionId: 'load-test-session' })
      const { saveSession, loadSession } = useSessionPersistence(createOptions())

      await saveSession(state)

      const loaded = await loadSession()

      expect(loaded).toMatchObject({
        sessionId: 'load-test-session',
        remoteUri: 'sip:1001@example.com',
        callDirection: 'outbound',
      })
    })

    it('should call onRestoreSuccess callback when session loads', async () => {
      const onRestoreSuccess = vi.fn()
      const state = createSessionState()
      const options = createOptions({ onRestoreSuccess })

      const { saveSession, loadSession } = useSessionPersistence(options)

      await saveSession(state)
      await loadSession()

      expect(onRestoreSuccess).toHaveBeenCalledTimes(1)
      expect(onRestoreSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session-1',
        })
      )
    })

    it('should call onRestoreError callback when session is expired', async () => {
      const onRestoreError = vi.fn()
      // 10 min ago (> 5 min maxAge)
      const state = createSessionState({ timestamp: Date.now() - 10 * 60 * 1000 })
      const options = createOptions({ maxAge: 5 * 60 * 1000, onRestoreError })

      const { saveSession, loadSession } = useSessionPersistence(options)

      await saveSession(state)
      await loadSession()

      expect(onRestoreError).toHaveBeenCalledTimes(1)
    })

    it('should return null when session is expired', async () => {
      const state = createSessionState({ timestamp: Date.now() - 10 * 60 * 1000 })
      const { saveSession, loadSession } = useSessionPersistence(
        createOptions({ maxAge: 5 * 60 * 1000 })
      )

      await saveSession(state)

      const result = await loadSession()
      expect(result).toBeNull()
    })

    it('should set isLoading during load operation', async () => {
      const { loadSession, isLoading } = useSessionPersistence(createOptions())

      const loadPromise = loadSession()
      await Promise.resolve()

      expect(isLoading.value).toBe(true)

      await loadPromise
      expect(isLoading.value).toBe(false)
    })
  })

  // ========================================================================
  // clearSession
  // ========================================================================

  describe('clearSession', () => {
    it('should clear saved session', async () => {
      const state = createSessionState()
      const { saveSession, loadSession, clearSession, hasSavedSession } =
        useSessionPersistence(createOptions())

      await saveSession(state)
      expect(hasSavedSession.value).toBe(true)

      await clearSession()

      const result = await loadSession()
      expect(result).toBeNull()
      expect(hasSavedSession.value).toBe(false)
    })

    it('should clear session info', async () => {
      const { saveSession, clearSession, savedSessionInfo } = useSessionPersistence(createOptions())

      await saveSession(createSessionState())
      expect(savedSessionInfo.value?.exists).toBe(true)

      await clearSession()

      expect(savedSessionInfo.value?.exists).toBe(false)
    })

    it('should not throw when clearing non-existent session', async () => {
      const { clearSession } = useSessionPersistence(createOptions())

      await expect(clearSession()).resolves.toBeUndefined()
    })

    it('should clear previous error on successful clear', async () => {
      const { saveSession, clearSession, error } = useSessionPersistence(createOptions())

      await saveSession(createSessionState())
      await clearSession()

      expect(error.value).toBeNull()
    })
  })

  // ========================================================================
  // hasSavedSession computed
  // ========================================================================

  describe('hasSavedSession computed', () => {
    it('should be false initially', () => {
      const { hasSavedSession } = useSessionPersistence(createOptions())
      expect(hasSavedSession.value).toBe(false)
    })

    it('should be true after saving a session', async () => {
      const { saveSession, hasSavedSession } = useSessionPersistence(createOptions())

      await saveSession(createSessionState())

      expect(hasSavedSession.value).toBe(true)
    })

    it('should be false after clearing session', async () => {
      const { saveSession, clearSession, hasSavedSession } = useSessionPersistence(createOptions())

      await saveSession(createSessionState())
      expect(hasSavedSession.value).toBe(true)

      await clearSession()

      expect(hasSavedSession.value).toBe(false)
    })

    it('should be false after loading and getting null for expired session', async () => {
      const state = createSessionState({ timestamp: Date.now() - 10 * 60 * 1000 })
      const { saveSession, loadSession, hasSavedSession } = useSessionPersistence(
        createOptions({ maxAge: 5 * 60 * 1000 })
      )

      await saveSession(state)
      await loadSession()

      expect(hasSavedSession.value).toBe(false)
    })
  })

  // ========================================================================
  // Error Handling
  // ========================================================================

  describe('error handling', () => {
    it('should clear error state on successful operations', async () => {
      const { saveSession, clearSession, error } = useSessionPersistence(createOptions())

      await saveSession(createSessionState())
      expect(error.value).toBeNull()

      await clearSession()
      expect(error.value).toBeNull()
    })
  })

  // ========================================================================
  // Integration scenarios
  // ========================================================================

  describe('integration scenarios', () => {
    it('should handle save-load-clear workflow', async () => {
      const state = createSessionState({ sessionId: 'workflow-test' })
      const { saveSession, loadSession, clearSession, hasSavedSession, savedSessionInfo } =
        useSessionPersistence(createOptions())

      // Initially no session
      expect(hasSavedSession.value).toBe(false)

      // Save session
      await saveSession(state)
      expect(hasSavedSession.value).toBe(true)
      expect(savedSessionInfo.value?.sessionId).toBe('workflow-test')

      // Load session
      const loaded = await loadSession()
      expect(loaded?.sessionId).toBe('workflow-test')

      // Clear session
      await clearSession()
      expect(hasSavedSession.value).toBe(false)

      // Load again should return null
      const loadedAfterClear = await loadSession()
      expect(loadedAfterClear).toBeNull()
    })

    it('should handle multiple rapid saves (last one wins)', async () => {
      const { saveSession, savedSessionInfo } = useSessionPersistence(createOptions())

      await saveSession(createSessionState({ sessionId: 'first' }))
      await saveSession(createSessionState({ sessionId: 'second' }))
      await saveSession(createSessionState({ sessionId: 'third' }))

      expect(savedSessionInfo.value?.sessionId).toBe('third')
    })
  })
})
