/**
 * Provider Registry
 *
 * Central registry for managing SIP provider configurations.
 * Supports registration, lookup, and management of providers.
 */

import type { ProviderConfig } from './types'

/** Options for provider registration */
export interface RegisterOptions {
  /** Force overwrite if provider already exists */
  force?: boolean
}

/** Internal provider storage */
const providers = new Map<string, ProviderConfig>()

/**
 * Register a provider configuration
 * @param config - Provider configuration to register
 * @param options - Registration options
 * @throws Error if provider ID already exists and force is not true
 */
export function registerProvider(config: ProviderConfig, options: RegisterOptions = {}): void {
  if (providers.has(config.id) && !options.force) {
    throw new Error(`Provider with ID "${config.id}" is already registered`)
  }
  providers.set(config.id, config)
}

/**
 * Get a provider by ID
 * @param id - Provider ID to lookup
 * @returns Provider configuration or undefined if not found
 */
export function getProvider(id: string): ProviderConfig | undefined {
  return providers.get(id)
}

/**
 * Get all registered providers
 * @returns Array of all registered provider configurations
 */
export function getAllProviders(): ProviderConfig[] {
  return Array.from(providers.values())
}

/**
 * Remove a provider by ID
 * @param id - Provider ID to remove
 * @returns true if provider was removed, false if it didn't exist
 */
export function removeProvider(id: string): boolean {
  return providers.delete(id)
}

/**
 * Reset the registry (clear all providers)
 * Primarily used for testing
 */
export function resetRegistry(): void {
  providers.clear()
}
