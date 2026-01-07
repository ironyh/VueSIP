/**
 * Session Persistence Types
 *
 * Type definitions for call session persistence and recovery
 * using IndexedDB storage.
 *
 * @packageDocumentation
 */

import type { Ref, ComputedRef } from 'vue'

/**
 * Persistable session state
 *
 * Contains all the data needed to restore a call session
 * after a page refresh or network reconnection.
 */
export interface PersistedSessionState {
  /** Unique session identifier */
  sessionId: string
  /** Remote party URI (SIP address) */
  remoteUri: string
  /** Call direction */
  callDirection: 'inbound' | 'outbound'
  /** Whether the call is on hold */
  holdState: boolean
  /** Mute state for audio and video */
  muteState: {
    /** Whether audio is muted */
    audio: boolean
    /** Whether video is muted */
    video: boolean
  }
  /** Time when session was saved (timestamp in milliseconds) */
  timestamp: number
  /** Custom metadata for application-specific data */
  customData?: Record<string, unknown>
}

/**
 * Session persistence options
 *
 * Configuration for the session persistence behavior.
 */
export interface SessionPersistenceOptions {
  /** Storage key for IndexedDB (default: 'vuesip_session') */
  storageKey?: string
  /** Maximum age of saved session in milliseconds (default: 300000 = 5 minutes) */
  maxAge?: number
  /** Auto-restore session on initialization (default: false) */
  autoRestore?: boolean
  /** Callback when session restore succeeds */
  onRestoreSuccess?: (state: PersistedSessionState) => void
  /** Callback when session restore fails */
  onRestoreError?: (error: Error) => void
}

/**
 * Saved session summary information
 *
 * Lightweight info about a saved session without the full state.
 */
export interface SavedSessionInfo {
  /** Whether a saved session exists */
  exists: boolean
  /** Session identifier (if exists) */
  sessionId?: string
  /** Time when session was saved (if exists) */
  timestamp?: number
  /** Age of the session in milliseconds (calculated: Date.now() - timestamp) */
  age?: number
}

/**
 * Return type for useSessionPersistence composable
 *
 * Provides methods and reactive state for managing session persistence.
 */
export interface UseSessionPersistenceReturn {
  /**
   * Save current session state to IndexedDB
   * @param state - The session state to persist
   */
  saveSession: (state: PersistedSessionState) => Promise<void>

  /**
   * Load saved session state from IndexedDB
   * @returns The saved session state or null if none exists or expired
   */
  loadSession: () => Promise<PersistedSessionState | null>

  /**
   * Clear saved session from IndexedDB
   */
  clearSession: () => Promise<void>

  /**
   * Whether a saved session exists (reactive)
   */
  hasSavedSession: Ref<boolean>

  /**
   * Whether an async operation is in progress
   */
  isLoading: Ref<boolean>

  /**
   * Error state from the last operation
   */
  error: Ref<Error | null>

  /**
   * Summary info about the saved session (without full state)
   */
  savedSessionInfo: ComputedRef<SavedSessionInfo | null>
}
