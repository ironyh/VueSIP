/**
 * Credential Storage
 *
 * Handles persistence of provider credentials with multiple storage options.
 * Supports localStorage, sessionStorage, and no-storage modes.
 */

import type { StorageType, StoredCredentials } from './types'

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
 * Create a web storage (localStorage/sessionStorage) based storage
 */
function createWebStorage(storage: Storage, key: string): CredentialStorage {
  return {
    save(credentials: StoredCredentials): void {
      try {
        storage.setItem(key, JSON.stringify(credentials))
      } catch {
        // Storage might be full or disabled - fail silently
        console.warn('Failed to save credentials to storage')
      }
    },

    load(): StoredCredentials | null {
      try {
        const data = storage.getItem(key)
        if (!data) return null
        return JSON.parse(data) as StoredCredentials
      } catch {
        // Invalid JSON or storage error - return null
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
