/**
 * useSettings - Main settings orchestrator composable
 *
 * Provides unified interface for settings management, integrating the
 * Pinia store with persistence layer, validation, and change tracking.
 *
 * @module composables/useSettings
 */

import { computed, watch, onMounted, onUnmounted, type ComputedRef, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore, type SettingsSchema, type SipAccount } from '@/stores/settingsStore'
import { useSettingsPersistence } from './useSettingsPersistence'
import type {
  MediaConfiguration,
  UserPreferences,
  ExtendedRTCConfiguration
} from '@/types/config.types'
import { createLogger } from '@/utils/logger'

const log = createLogger('UseSettings')

// ============================================================================
// Type Definitions
// ============================================================================

export interface UseSettingsReturn {
  // State (reactive)
  settings: Ref<SettingsSchema>
  isLoading: ComputedRef<boolean>
  isSaving: Ref<boolean>
  isDirty: Ref<boolean>
  isValid: ComputedRef<boolean>
  lastSaved: Ref<Date | null>
  validationErrors: Ref<any[]>

  // Computed settings
  activeAccount: ComputedRef<SipAccount | null>
  enabledAccounts: ComputedRef<SipAccount[]>
  mediaConfiguration: ComputedRef<MediaConfiguration>
  rtcConfiguration: ComputedRef<ExtendedRTCConfiguration>
  userPreferences: ComputedRef<UserPreferences>

  // Settings operations
  updateSettings: (partial: Partial<SettingsSchema>) => void
  save: () => Promise<boolean>
  load: () => Promise<boolean>
  reset: () => Promise<boolean>
  validate: () => any[]

  // Account management
  addAccount: (account: Omit<SipAccount, 'id'>) => SipAccount
  updateAccount: (id: string, updates: Partial<SipAccount>) => void
  removeAccount: (id: string) => void
  setActiveAccount: (id: string | null) => void

  // Import/Export
  exportSettings: () => void
  importSettings: (file: File) => Promise<boolean>

  // Auto-save control
  enableAutoSave: () => void
  disableAutoSave: () => void
  setAutoSaveDelay: (delayMs: number) => void

  // Storage info
  getStorageQuota: () => Promise<{ available: number; used: number; percentage: number }>
  clearStorage: () => void
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Main settings management composable
 *
 * @example
 * ```typescript
 * const {
 *   settings,
 *   activeAccount,
 *   updateSettings,
 *   save,
 *   load
 * } = useSettings()
 *
 * // Update audio settings
 * updateSettings({
 *   audio: {
 *     ...settings.value.audio,
 *     microphoneVolume: 85
 *   }
 * })
 *
 * // Save changes
 * await save()
 * ```
 */
export function useSettings(): UseSettingsReturn {
  const store = useSettingsStore()
  const persistence = useSettingsPersistence()

  // Get reactive refs from store
  const {
    settings,
    isLoading: storeLoading,
    isSaving,
    isDirty,
    lastSaved,
    validationErrors,
    autoSaveEnabled,
    autoSaveDelay,
    activeAccount,
    enabledAccounts,
    isValid,
    mediaConfiguration,
    rtcConfiguration,
    userPreferences
  } = storeToRefs(store)

  // Combined loading state
  const isLoading = computed(() => storeLoading.value || persistence.isLoading.value)

  // ==========================================================================
  // Settings Operations
  // ==========================================================================

  /**
   * Update settings
   */
  function updateSettings(partial: Partial<SettingsSchema>): void {
    store.updateSettings(partial)
    log.debug('Settings updated', Object.keys(partial))
  }

  /**
   * Save settings to storage
   */
  async function save(): Promise<boolean> {
    log.info('Saving settings...')

    // Validate before saving
    const errors = store.validateSettings()
    if (errors.some((e: any) => e.severity === 'error')) {
      log.error('Cannot save invalid settings', errors)
      return false
    }

    isSaving.value = true

    try {
      const success = await persistence.save(settings.value)

      if (success) {
        isDirty.value = false
        lastSaved.value = new Date()
        log.info('Settings saved successfully')
      } else {
        log.error('Failed to save settings')
      }

      return success
    } catch (error) {
      log.error('Error saving settings:', error)
      return false
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Load settings from storage
   */
  async function load(): Promise<boolean> {
    log.info('Loading settings...')
    storeLoading.value = true

    try {
      const loaded = await persistence.load()

      if (loaded) {
        // Validate loaded settings
        const currentVersion = settings.value.version
        if (loaded.version !== currentVersion) {
          log.info(`Migrating settings from v${loaded.version} to v${currentVersion}`)
          const migrationResult = persistence.migrate(loaded, loaded.version, currentVersion)

          if (!migrationResult.success) {
            log.error('Migration failed:', migrationResult.errors)
            return false
          }
        }

        // Update store with loaded settings
        Object.assign(settings.value, loaded)
        isDirty.value = false
        lastSaved.value = new Date(loaded.lastModified)

        // Validate loaded settings
        store.validateSettings()

        log.info('Settings loaded successfully')
        return true
      } else {
        log.info('No saved settings found, using defaults')
        return false
      }
    } catch (error) {
      log.error('Error loading settings:', error)
      return false
    } finally {
      storeLoading.value = false
    }
  }

  /**
   * Reset settings to defaults
   */
  async function reset(): Promise<boolean> {
    log.info('Resetting settings to defaults...')

    try {
      store.resetSettings()
      const success = await save()

      if (success) {
        log.info('Settings reset successfully')
      }

      return success
    } catch (error) {
      log.error('Error resetting settings:', error)
      return false
    }
  }

  /**
   * Validate current settings
   */
  function validate(): any[] {
    return store.validateSettings()
  }

  // ==========================================================================
  // Account Management
  // ==========================================================================

  /**
   * Add SIP account
   */
  function addAccount(account: Omit<SipAccount, 'id'>): SipAccount {
    const newAccount = store.addAccount(account)
    log.info(`Account added: ${newAccount.name}`)
    return newAccount
  }

  /**
   * Update SIP account
   */
  function updateAccount(id: string, updates: Partial<SipAccount>): void {
    store.updateAccount(id, updates)
    log.info(`Account updated: ${id}`)
  }

  /**
   * Remove SIP account
   */
  function removeAccount(id: string): void {
    store.removeAccount(id)
    log.info(`Account removed: ${id}`)
  }

  /**
   * Set active account
   */
  function setActiveAccount(id: string | null): void {
    store.setActiveAccount(id)
    log.info(`Active account set: ${id}`)
  }

  // ==========================================================================
  // Import/Export
  // ==========================================================================

  /**
   * Export settings to file
   */
  function exportSettings(): void {
    persistence.exportToFile(settings.value)
    log.info('Settings exported')
  }

  /**
   * Import settings from file
   */
  async function importSettings(file: File): Promise<boolean> {
    log.info('Importing settings from file...')

    try {
      const imported = await persistence.importFromFile(file)

      if (imported) {
        // Validate imported settings
        Object.assign(settings.value, imported)
        const errors = store.validateSettings()

        if (errors.some((e: any) => e.severity === 'error')) {
          log.error('Imported settings are invalid', errors)
          return false
        }

        // Save imported settings
        const success = await save()

        if (success) {
          log.info('Settings imported successfully')
        }

        return success
      }

      return false
    } catch (error) {
      log.error('Error importing settings:', error)
      return false
    }
  }

  // ==========================================================================
  // Auto-save Control
  // ==========================================================================

  /**
   * Enable auto-save
   */
  function enableAutoSave(): void {
    autoSaveEnabled.value = true
    log.info('Auto-save enabled')
  }

  /**
   * Disable auto-save
   */
  function disableAutoSave(): void {
    autoSaveEnabled.value = false
    log.info('Auto-save disabled')
  }

  /**
   * Set auto-save delay
   */
  function setAutoSaveDelay(delayMs: number): void {
    if (delayMs < 100 || delayMs > 10000) {
      log.warn('Auto-save delay should be between 100ms and 10000ms')
      return
    }

    autoSaveDelay.value = delayMs
    log.info(`Auto-save delay set to ${delayMs}ms`)
  }

  // ==========================================================================
  // Storage Info
  // ==========================================================================

  /**
   * Get storage quota information
   */
  async function getStorageQuota(): Promise<{
    available: number
    used: number
    percentage: number
  }> {
    const quota = await persistence.checkQuota()
    return {
      ...quota,
      percentage: (quota.used / quota.available) * 100
    }
  }

  /**
   * Clear all settings from storage
   */
  function clearStorage(): void {
    persistence.clear()
    store.resetSettings()
    log.info('Storage cleared')
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Auto-save watcher
   */
  let saveWatcher: ReturnType<typeof watch> | null = null

  onMounted(async () => {
    log.info('Settings composable mounted')

    // Load settings on mount
    await load()

    // Setup auto-save watcher
    if (autoSaveEnabled.value) {
      saveWatcher = watch(
        () => settings.value,
        () => {
          if (isDirty.value && autoSaveEnabled.value) {
            save()
          }
        },
        { deep: true }
      )
    }
  })

  onUnmounted(() => {
    log.info('Settings composable unmounted')

    // Stop auto-save watcher
    if (saveWatcher) {
      saveWatcher()
      saveWatcher = null
    }

    // Save dirty settings on unmount
    if (isDirty.value) {
      save()
    }
  })

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    settings,
    isLoading,
    isSaving,
    isDirty,
    isValid,
    lastSaved,
    validationErrors,

    // Computed
    activeAccount,
    enabledAccounts,
    mediaConfiguration,
    rtcConfiguration,
    userPreferences,

    // Operations
    updateSettings,
    save,
    load,
    reset,
    validate,

    // Account management
    addAccount,
    updateAccount,
    removeAccount,
    setActiveAccount,

    // Import/Export
    exportSettings,
    importSettings,

    // Auto-save
    enableAutoSave,
    disableAutoSave,
    setAutoSaveDelay,

    // Storage
    getStorageQuota,
    clearStorage
  }
}
