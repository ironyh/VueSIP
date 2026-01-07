/**
 * useSessionPersistence - Call session persistence with IndexedDB
 *
 * Provides session state persistence for call recovery after page refresh
 * or network reconnection. Uses IndexedDB for reliable storage.
 *
 * @packageDocumentation
 */

import { ref, computed, onBeforeUnmount } from 'vue'
import type {
  PersistedSessionState,
  SessionPersistenceOptions,
  UseSessionPersistenceReturn,
  SavedSessionInfo,
} from '@/types/session-persistence.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useSessionPersistence')

/**
 * Default options
 */
const DEFAULT_OPTIONS = {
  storageKey: 'vuesip_session',
  maxAge: 5 * 60 * 1000, // 5 minutes
  autoRestore: false,
} as const

/**
 * Internal database configuration (kept for IndexedDB implementation)
 */
const DB_NAME = 'vuesip_sessions'
const STORE_NAME = 'sessions'

/**
 * Check if IndexedDB is available
 */
function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

/**
 * Composable for managing call session persistence
 *
 * @param options - Configuration options
 * @returns Session persistence state and methods
 *
 * @example
 * ```ts
 * const {
 *   saveSession,
 *   loadSession,
 *   clearSession,
 *   hasSavedSession,
 *   isLoading,
 *   error,
 *   savedSessionInfo
 * } = useSessionPersistence({
 *   maxAge: 300000, // 5 minutes
 *   autoRestore: false,
 *   onRestoreSuccess: (state) => console.log('Restored:', state.sessionId),
 *   onRestoreError: (err) => console.error('Restore failed:', err)
 * })
 *
 * // Save session state
 * await saveSession({
 *   sessionId: session.id,
 *   remoteUri: remoteParty.uri,
 *   callDirection: 'outbound',
 *   holdState: false,
 *   muteState: { audio: false, video: false },
 *   timestamp: Date.now()
 * })
 *
 * // Check for saved session on page load
 * const savedSession = await loadSession()
 * if (savedSession) {
 *   // Attempt to reconnect
 * }
 * ```
 */
export function useSessionPersistence(
  options: SessionPersistenceOptions = {}
): UseSessionPersistenceReturn {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const storageKey = config.storageKey || DEFAULT_OPTIONS.storageKey

  // State
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const currentSessionInfo = ref<SavedSessionInfo | null>(null)

  // Computed
  const hasSavedSession = computed(() => currentSessionInfo.value !== null)
  const savedSessionInfo = computed<SavedSessionInfo | null>(() => {
    if (!currentSessionInfo.value) {
      return { exists: false }
    }
    const now = Date.now()
    const age = currentSessionInfo.value.timestamp ? now - currentSessionInfo.value.timestamp : 0
    return {
      exists: true,
      sessionId: currentSessionInfo.value.sessionId,
      timestamp: currentSessionInfo.value.timestamp,
      age,
    }
  })

  // Database reference
  let db: IDBDatabase | null = null

  /**
   * Open the IndexedDB database
   */
  async function openDatabase(): Promise<IDBDatabase> {
    if (!isIndexedDBAvailable()) {
      throw new Error('IndexedDB is not available in this environment')
    }

    if (db) {
      return db
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)

      request.onerror = () => {
        logger.error('Failed to open database', { error: request.error })
        reject(new Error(`Failed to open database: ${request.error?.message || 'Unknown error'}`))
      }

      request.onsuccess = () => {
        db = request.result
        logger.debug('Database opened successfully')
        resolve(db)
      }

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result

        // Create object store if it doesn't exist
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'key' })
          logger.info('Created object store', { storeName: STORE_NAME })
        }
      }
    })
  }

  /**
   * Save session state to IndexedDB
   */
  async function saveSession(state: PersistedSessionState): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const database = await openDatabase()

      const dataToSave = {
        key: storageKey,
        ...state,
      }

      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.put(dataToSave)

        request.onsuccess = () => {
          currentSessionInfo.value = {
            exists: true,
            sessionId: state.sessionId,
            timestamp: state.timestamp,
          }
          logger.info('Session saved', { sessionId: state.sessionId })
          resolve()
        }

        request.onerror = () => {
          const saveError = new Error(
            `Failed to save session: ${request.error?.message || 'Unknown error'}`
          )
          logger.error('Failed to save session', { error: request.error })
          error.value = saveError
          reject(saveError)
        }

        transaction.onerror = () => {
          const txError = new Error(
            `Transaction failed: ${transaction.error?.message || 'Unknown error'}`
          )
          logger.error('Transaction failed', { error: transaction.error })
          error.value = txError
          reject(txError)
        }
      })
    } catch (err) {
      const saveError = err instanceof Error ? err : new Error('Failed to save session')
      error.value = saveError
      logger.error('Save session error', { error: err })
      throw saveError
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load session state from IndexedDB
   */
  async function loadSession(): Promise<PersistedSessionState | null> {
    isLoading.value = true
    error.value = null

    try {
      const database = await openDatabase()

      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(storageKey)

        request.onsuccess = () => {
          const result = request.result as (PersistedSessionState & { key: string }) | undefined

          if (!result) {
            logger.debug('No saved session found')
            currentSessionInfo.value = null
            resolve(null)
            return
          }

          // Check if session is expired
          const timestamp = result.timestamp || 0
          const now = Date.now()
          const age = now - timestamp

          if (age > (config.maxAge || DEFAULT_OPTIONS.maxAge)) {
            logger.info('Session expired', { age, maxAge: config.maxAge })
            // Clear expired session (fire and forget)
            clearSessionInternal().catch((err) => {
              logger.error('Failed to clear expired session', { error: err })
            })
            if (config.onRestoreError) {
              config.onRestoreError(new Error(`Session expired (age: ${age}ms)`))
            }
            resolve(null)
            return
          }

          // Remove the internal key field before returning
          const { key: _key, ...sessionState } = result

          logger.info('Session loaded', { sessionId: sessionState.sessionId })

          // Call success callback
          if (config.onRestoreSuccess) {
            config.onRestoreSuccess(sessionState)
          }

          resolve(sessionState)
        }

        request.onerror = () => {
          const loadError = new Error(
            `Failed to load session: ${request.error?.message || 'Unknown error'}`
          )
          logger.error('Failed to load session', { error: request.error })
          error.value = loadError
          if (config.onRestoreError) {
            config.onRestoreError(loadError)
          }
          reject(loadError)
        }

        transaction.onerror = () => {
          const txError = new Error(
            `Transaction failed: ${transaction.error?.message || 'Unknown error'}`
          )
          logger.error('Transaction failed', { error: transaction.error })
          error.value = txError
          if (config.onRestoreError) {
            config.onRestoreError(txError)
          }
          reject(txError)
        }
      })
    } catch (err) {
      const loadError = err instanceof Error ? err : new Error('Failed to load session')
      error.value = loadError
      logger.error('Load session error', { error: err })
      if (config.onRestoreError) {
        config.onRestoreError(loadError)
      }
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Internal clear session (without changing loading state)
   */
  async function clearSessionInternal(): Promise<void> {
    try {
      const database = await openDatabase()

      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(storageKey)

        request.onsuccess = () => {
          currentSessionInfo.value = null
          logger.debug('Session cleared')
          resolve()
        }

        request.onerror = () => {
          logger.error('Failed to clear session', { error: request.error })
          reject(
            new Error(`Failed to clear session: ${request.error?.message || 'Unknown error'}`)
          )
        }
      })
    } catch (err) {
      logger.error('Clear session error', { error: err })
      // Don't throw - clearing is best effort
    }
  }

  /**
   * Clear saved session from IndexedDB
   */
  async function clearSession(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      await clearSessionInternal()
    } catch (err) {
      const clearError = err instanceof Error ? err : new Error('Failed to clear session')
      error.value = clearError
      logger.error('Clear session error', { error: err })
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Cleanup database connection on unmount
   */
  onBeforeUnmount(() => {
    if (db) {
      db.close()
      db = null
    }
  })

  return {
    saveSession,
    loadSession,
    clearSession,
    hasSavedSession,
    isLoading,
    error,
    savedSessionInfo,
  }
}
