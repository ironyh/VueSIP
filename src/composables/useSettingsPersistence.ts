/**
 * useSettingsPersistence - Settings persistence layer with encryption
 *
 * Handles localStorage operations, versioning, migration, encryption,
 * and error recovery for application settings.
 *
 * @module composables/useSettingsPersistence
 */

import { ref, type Ref } from 'vue'
import type { SettingsSchema, SipAccount } from '@/stores/settingsStore'
import { createLogger } from '@/utils/logger'

const log = createLogger('SettingsPersistence')

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'vuesip_settings'
const STORAGE_VERSION_KEY = 'vuesip_settings_version'
const ENCRYPTION_KEY = 'vuesip_encryption_key'
const MAX_STORAGE_SIZE = 5 * 1024 * 1024 // 5MB quota management

// ============================================================================
// Type Definitions
// ============================================================================

interface StorageMetadata {
  version: number
  encrypted: boolean
  timestamp: number
  checksum?: string
}

interface MigrationResult {
  success: boolean
  fromVersion: number
  toVersion: number
  errors: string[]
}

// Encryption support for future enhancement
// interface EncryptionResult {
//   success: boolean
//   data?: string
//   error?: string
// }

// ============================================================================
// Encryption/Decryption (Simple implementation - enhance for production)
// ============================================================================

/**
 * Simple XOR-based encryption for sensitive data
 * NOTE: This is a basic implementation. For production, use Web Crypto API
 * with proper key derivation (PBKDF2) and AES-GCM encryption
 */
function simpleEncrypt(data: string, key: string): string {
  try {
    const encrypted = Array.from(data)
      .map((char, i) => {
        const keyChar = key.charCodeAt(i % key.length)
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar)
      })
      .join('')

    return btoa(encrypted)
  } catch (error) {
    log.error('Encryption failed:', error)
    throw new Error('Encryption failed')
  }
}

/**
 * Decrypt XOR-encrypted data
 */
function simpleDecrypt(encrypted: string, key: string): string {
  try {
    const decoded = atob(encrypted)
    return Array.from(decoded)
      .map((char, i) => {
        const keyChar = key.charCodeAt(i % key.length)
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar)
      })
      .join('')
  } catch (error) {
    log.error('Decryption failed:', error)
    throw new Error('Decryption failed')
  }
}

/**
 * Get or create encryption key
 */
function getEncryptionKey(): string {
  let key = localStorage.getItem(ENCRYPTION_KEY)

  if (!key) {
    // Generate random key
    key = Array.from({ length: 32 }, () => Math.random().toString(36).charAt(2)).join('')

    localStorage.setItem(ENCRYPTION_KEY, key)
    log.info('Generated new encryption key')
  }

  return key
}

/**
 * Encrypt sensitive account data
 */
function encryptAccountData(account: SipAccount): SipAccount {
  const key = getEncryptionKey()

  return {
    ...account,
    password: simpleEncrypt(account.password, key),
    authorizationUsername: account.authorizationUsername
      ? simpleEncrypt(account.authorizationUsername, key)
      : undefined,
  }
}

/**
 * Decrypt sensitive account data
 */
function decryptAccountData(account: SipAccount): SipAccount {
  const key = getEncryptionKey()

  try {
    return {
      ...account,
      password: simpleDecrypt(account.password, key),
      authorizationUsername: account.authorizationUsername
        ? simpleDecrypt(account.authorizationUsername, key)
        : undefined,
    }
  } catch (error) {
    log.error('Failed to decrypt account data:', error)
    // Return account with empty password on decryption failure
    return {
      ...account,
      password: '',
      authorizationUsername: undefined,
    }
  }
}

// ============================================================================
// Storage Operations
// ============================================================================

/**
 * Check available storage quota
 */
async function checkStorageQuota(): Promise<{ available: number; used: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate()
      return {
        available: estimate.quota || 0,
        used: estimate.usage || 0,
      }
    } catch (error) {
      log.warn('Failed to estimate storage:', error)
    }
  }

  // Fallback: calculate from localStorage
  let used = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const value = localStorage.getItem(key)
      used += key.length + (value?.length || 0)
    }
  }

  return { available: MAX_STORAGE_SIZE, used }
}

/**
 * Save settings to localStorage with encryption
 */
async function saveToStorage(settings: SettingsSchema): Promise<boolean> {
  try {
    // Check storage quota
    const { available, used } = await checkStorageQuota()
    const settingsSize = JSON.stringify(settings).length

    if (used + settingsSize > available) {
      log.error('Storage quota exceeded')
      throw new Error('Storage quota exceeded')
    }

    // Encrypt sensitive data (passwords)
    const encryptedSettings: SettingsSchema = {
      ...settings,
      accounts: settings.accounts.map(encryptAccountData),
    }

    // Create metadata
    const metadata: StorageMetadata = {
      version: settings.version,
      encrypted: true,
      timestamp: Date.now(),
      checksum: generateChecksum(JSON.stringify(encryptedSettings)),
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedSettings))
    localStorage.setItem(STORAGE_VERSION_KEY, JSON.stringify(metadata))

    log.info('Settings saved to storage', { version: settings.version })
    return true
  } catch (error) {
    log.error('Failed to save settings:', error)
    return false
  }
}

/**
 * Load settings from localStorage with decryption
 */
async function loadFromStorage(): Promise<SettingsSchema | null> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    const metadataStr = localStorage.getItem(STORAGE_VERSION_KEY)

    if (!data) {
      log.info('No settings found in storage')
      return null
    }

    const settings: SettingsSchema = JSON.parse(data)
    const metadata: StorageMetadata = metadataStr ? JSON.parse(metadataStr) : null

    // Verify checksum if available
    if (metadata?.checksum) {
      const actualChecksum = generateChecksum(data)
      if (actualChecksum !== metadata.checksum) {
        log.warn('Settings checksum mismatch - data may be corrupted')
      }
    }

    // Decrypt sensitive data
    if (metadata?.encrypted) {
      settings.accounts = settings.accounts.map(decryptAccountData)
    }

    log.info('Settings loaded from storage', { version: settings.version })
    return settings
  } catch (error) {
    log.error('Failed to load settings:', error)
    return null
  }
}

/**
 * Clear all settings from storage
 */
function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(STORAGE_VERSION_KEY)
  log.info('Settings cleared from storage')
}

// ============================================================================
// Migration
// ============================================================================

/**
 * Migrate settings from old version to new version
 */
function migrateSettings(
  oldSettings: Record<string, unknown>,
  fromVersion: number,
  toVersion: number
): MigrationResult {
  const errors: string[] = []
  const migratedSettings: Record<string, unknown> = { ...oldSettings }

  log.info(`Migrating settings from v${fromVersion} to v${toVersion}`)

  try {
    // Version 0 → 1: Initial structure (no migration needed yet)
    if (fromVersion === 0 && toVersion >= 1) {
      // Add any new fields with defaults
      log.info('Migration 0→1: No changes needed')
    }

    // Future migrations would go here
    // Example:
    // if (fromVersion === 1 && toVersion >= 2) {
    //   migratedSettings.newField = defaultValue
    // }

    migratedSettings.version = toVersion

    return {
      success: errors.length === 0,
      fromVersion,
      toVersion,
      errors,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMsg)
    log.error('Migration failed:', error)

    return {
      success: false,
      fromVersion,
      toVersion,
      errors,
    }
  }
}

/**
 * Migrate from legacy settings format (if exists)
 */
function migrateLegacySettings(): SettingsSchema | null {
  try {
    // Check for old config format
    const oldConfig = localStorage.getItem('sip_config')
    if (!oldConfig) return null

    const legacy = JSON.parse(oldConfig)
    log.info('Found legacy settings, migrating...')

    // Convert to new format (example - adjust based on actual legacy format)
    const migrated: Partial<SettingsSchema> = {
      version: 1,
      accounts: legacy.accounts || [],
      audio: legacy.audioSettings || {},
      video: legacy.videoSettings || {},
      // ... map other fields
      lastModified: new Date(),
    }

    // Remove legacy key after successful migration
    localStorage.removeItem('sip_config')
    log.info('Legacy settings migrated successfully')

    return migrated as SettingsSchema
  } catch (error) {
    log.error('Legacy migration failed:', error)
    return null
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate simple checksum for data integrity
 */
function generateChecksum(data: string): string {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(16)
}

/**
 * Export settings as JSON file
 */
function exportSettings(settings: SettingsSchema): void {
  try {
    const exportData = {
      ...settings,
      // Remove encrypted passwords for export
      accounts: settings.accounts.map(({ password: _password, ...account }) => ({
        ...account,
        password: '***REMOVED***',
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `vuesip-settings-${Date.now()}.json`
    link.click()

    URL.revokeObjectURL(url)
    log.info('Settings exported successfully')
  } catch (error) {
    log.error('Failed to export settings:', error)
  }
}

/**
 * Import settings from JSON file
 */
async function importSettings(file: File): Promise<SettingsSchema | null> {
  try {
    const text = await file.text()
    const imported = JSON.parse(text)

    log.info('Settings imported from file')
    return imported as SettingsSchema
  } catch (error) {
    log.error('Failed to import settings:', error)
    return null
  }
}

// ============================================================================
// Composable
// ============================================================================

export interface UseSettingsPersistenceReturn {
  isLoading: Ref<boolean>
  lastError: Ref<string | null>
  save: (settings: SettingsSchema) => Promise<boolean>
  load: () => Promise<SettingsSchema | null>
  clear: () => void
  migrate: (
    settings: Record<string, unknown>,
    fromVersion: number,
    toVersion: number
  ) => MigrationResult
  migrateLegacy: () => SettingsSchema | null
  exportToFile: (settings: SettingsSchema) => void
  importFromFile: (file: File) => Promise<SettingsSchema | null>
  checkQuota: () => Promise<{ available: number; used: number }>
}

/**
 * Settings persistence composable
 */
export function useSettingsPersistence(): UseSettingsPersistenceReturn {
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  /**
   * Save settings to storage
   */
  async function save(settings: SettingsSchema): Promise<boolean> {
    isLoading.value = true
    lastError.value = null

    try {
      const success = await saveToStorage(settings)
      if (!success) {
        lastError.value = 'Failed to save settings'
      }
      return success
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Unknown error'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load settings from storage
   */
  async function load(): Promise<SettingsSchema | null> {
    isLoading.value = true
    lastError.value = null

    try {
      // Try loading from current storage
      let settings = await loadFromStorage()

      // If not found, try migrating legacy settings
      if (!settings) {
        settings = migrateLegacySettings()
      }

      return settings
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Unknown error'
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    lastError,
    save,
    load,
    clear: clearStorage,
    migrate: migrateSettings,
    migrateLegacy: migrateLegacySettings,
    exportToFile: exportSettings,
    importFromFile: importSettings,
    checkQuota: checkStorageQuota,
  }
}
