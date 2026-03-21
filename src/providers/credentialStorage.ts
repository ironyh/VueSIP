/**
 * Credential Storage
 *
 * Handles persistence of provider credentials with multiple storage options.
 * Supports localStorage, sessionStorage, and no-storage modes.
 */

import type { StorageType, StoredCredentials } from './types'
import { createLogger } from '../utils/logger'

const logger = createLogger('providers:credentialStorage')

/** Storage configuration options */
export interface StorageOptions {
  /** Custom storage key (default: 'vuesip_credentials') */
  key?: string
}

/** Credential storage interface */
export interface CredentialStorage {
  /** Save credentials to storage */
  save(credentials: StoredCredentials): void
  /** Load credentials from storage */
  load(): StoredCredentials | null
  /** Clear stored credentials */
  clear(): void
}

const DEFAULT_STORAGE_KEY = 'vuesip_credentials'

/**
 * Create a credential storage instance
 * @param type - Storage type ('local', 'session', or 'none')
 * @param options - Storage configuration options
 * @returns Credential storage interface
 */
export function createCredentialStorage(
  type: StorageType,
  options: StorageOptions = {}
): CredentialStorage {
  const key = options.key || DEFAULT_STORAGE_KEY

  if (type === 'none') {
    return createNoneStorage()
  }

  const storage = type === 'local' ? localStorage : sessionStorage
  return createWebStorage(storage, key)
}

/**
 * Validate a raw parsed object matches StoredCredentials shape.
 * Guards against tampered or corrupted storage returning partial data.
 */
function isStoredCredentials(raw: unknown): raw is StoredCredentials {
  if (!raw || typeof raw !== 'object') return false
  const obj = raw as Record<string, unknown>
  if (typeof obj.providerId !== 'string' || obj.providerId.length === 0) return false
  if (typeof obj.values !== 'object' || obj.values === null || Array.isArray(obj.values))
    return false
  if (typeof obj.storedAt !== 'number' || !Number.isFinite(obj.storedAt)) return false
  // Values must be a Record<string, string>
  for (const v of Object.values(obj.values as Record<string, unknown>)) {
    if (typeof v !== 'string') return false
  }
  return true
}

/**
 * Create a web storage (localStorage/sessionStorage) based storage
 */
function createWebStorage(storage: Storage, key: string): CredentialStorage {
  return {
    save(credentials: StoredCredentials): void {
      try {
        storage.setItem(key, JSON.stringify(credentials))
      } catch {
        // Storage might be full or disabled - fail silently
        logger.warn('Failed to save credentials to storage')
      }
    },

    load(): StoredCredentials | null {
      try {
        const data = storage.getItem(key)
        if (!data) return null
        const parsed = JSON.parse(data)
        if (!isStoredCredentials(parsed)) {
          logger.warn('Stored credentials have invalid shape — clearing corrupted entry', {
            actualType: typeof parsed,
          })
          storage.removeItem(key)
          return null
        }
        return parsed
      } catch {
        // Invalid JSON or storage error — clear corrupted entry and return null
        try {
          storage.removeItem(key)
        } catch {
          /* ignore */
        }
        return null
      }
    },

    clear(): void {
      try {
        storage.removeItem(key)
      } catch {
        // Storage error - fail silently
      }
    },
  }
}

/**
 * Create a no-op storage (for 'none' type)
 */
function createNoneStorage(): CredentialStorage {
  return {
    save(): void {
      // No-op - don't persist
    },
    load(): StoredCredentials | null {
      return null
    },
    clear(): void {
      // No-op
    },
  }
}
