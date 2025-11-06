/**
 * Provider type definitions for VueSip
 * @packageDocumentation
 */

import type { InjectionKey } from 'vue'
import type {
  SipClientConfig,
  MediaConfiguration,
  UserPreferences,
  ValidationResult,
} from './config.types'

/**
 * Configuration Provider Context
 *
 * Provides configuration management functionality to child components
 */
export interface ConfigProviderContext {
  /** Current SIP configuration (readonly) */
  readonly sipConfig: SipClientConfig | null

  /** Current media configuration (readonly) */
  readonly mediaConfig: MediaConfiguration

  /** Current user preferences (readonly) */
  readonly userPreferences: UserPreferences

  /** Whether SIP configuration is set */
  readonly hasSipConfig: boolean

  /** Whether configuration is valid */
  readonly isConfigValid: boolean

  /** Last validation result */
  readonly lastValidation: ValidationResult | null

  /**
   * Set SIP configuration
   * @param config - SIP client configuration
   * @param validate - Whether to validate configuration (default: true)
   * @returns Validation result
   */
  setSipConfig(config: SipClientConfig, validate?: boolean): ValidationResult

  /**
   * Update SIP configuration (partial update)
   * @param updates - Partial SIP configuration updates
   * @param validate - Whether to validate after update (default: true)
   * @returns Validation result
   */
  updateSipConfig(updates: Partial<SipClientConfig>, validate?: boolean): ValidationResult

  /**
   * Set media configuration
   * @param config - Media configuration
   * @param validate - Whether to validate configuration (default: true)
   * @returns Validation result
   */
  setMediaConfig(config: MediaConfiguration, validate?: boolean): ValidationResult

  /**
   * Update media configuration (partial update)
   * @param updates - Partial media configuration updates
   * @param validate - Whether to validate after update (default: true)
   * @returns Validation result
   */
  updateMediaConfig(updates: Partial<MediaConfiguration>, validate?: boolean): ValidationResult

  /**
   * Set user preferences
   * @param preferences - User preferences
   */
  setUserPreferences(preferences: UserPreferences): void

  /**
   * Update user preferences (partial update)
   * @param updates - Partial user preferences updates
   */
  updateUserPreferences(updates: Partial<UserPreferences>): void

  /**
   * Validate all configurations
   * @returns Combined validation result
   */
  validateAll(): ValidationResult

  /**
   * Reset configuration to initial state
   */
  reset(): void
}

/**
 * Injection key for ConfigProvider
 */
export const CONFIG_PROVIDER_KEY: InjectionKey<ConfigProviderContext> =
  Symbol('vuesip:config-provider')

/**
 * Configuration Provider Props
 */
export interface ConfigProviderProps {
  /** Initial SIP configuration */
  sipConfig?: SipClientConfig

  /** Initial media configuration */
  mediaConfig?: MediaConfiguration

  /** Initial user preferences */
  userPreferences?: UserPreferences

  /** Whether to validate configuration on mount (default: true) */
  validateOnMount?: boolean

  /** Whether to automatically merge configuration with existing (default: false) */
  autoMerge?: boolean
}
