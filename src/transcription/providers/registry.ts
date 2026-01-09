/**
 * Transcription provider registry
 * @packageDocumentation
 */

import type {
  TranscriptionProvider,
  ProviderOptions,
} from '@/types/transcription.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('ProviderRegistry')

/**
 * Factory function type for creating provider instances
 */
export type ProviderFactory = () => TranscriptionProvider

/**
 * Registry for managing transcription providers
 *
 * @example
 * ```ts
 * const registry = new ProviderRegistry()
 * registry.register('web-speech', () => new WebSpeechProvider())
 * const provider = await registry.get('web-speech', { language: 'en-US' })
 * ```
 */
export class ProviderRegistry {
  private factories = new Map<string, ProviderFactory>()
  private instances = new Map<string, TranscriptionProvider>()

  /**
   * Register a provider factory
   * @param name - Unique provider name
   * @param factory - Factory function that creates provider instances
   * @throws Error if provider name already registered
   */
  register(name: string, factory: ProviderFactory): void {
    if (this.factories.has(name)) {
      throw new Error(`Provider "${name}" is already registered`)
    }
    this.factories.set(name, factory)
    logger.debug('Provider registered', { name })
  }

  /**
   * Check if a provider is registered
   * @param name - Provider name to check
   */
  has(name: string): boolean {
    return this.factories.has(name)
  }

  /**
   * Get or create a provider instance
   * @param name - Provider name
   * @param options - Provider initialization options
   * @returns Initialized provider instance
   * @throws Error if provider not found
   */
  async get(name: string, options: ProviderOptions = {}): Promise<TranscriptionProvider> {
    // Return cached instance if available
    const cached = this.instances.get(name)
    if (cached) {
      return cached
    }

    // Get factory
    const factory = this.factories.get(name)
    if (!factory) {
      throw new Error(`Provider "${name}" not found. Available: ${this.getAvailable().join(', ')}`)
    }

    // Create and initialize instance
    const provider = factory()
    await provider.initialize(options)
    this.instances.set(name, provider)

    logger.info('Provider initialized', { name, capabilities: provider.capabilities })
    return provider
  }

  /**
   * Get list of registered provider names
   */
  getAvailable(): string[] {
    return Array.from(this.factories.keys())
  }

  /**
   * Dispose all cached provider instances
   */
  dispose(): void {
    for (const [name, provider] of this.instances) {
      try {
        provider.dispose()
        logger.debug('Provider disposed', { name })
      } catch (error) {
        logger.error('Error disposing provider', { name, error })
      }
    }
    this.instances.clear()
  }

  /**
   * Remove a cached provider instance (forces re-creation on next get)
   * @param name - Provider name
   */
  remove(name: string): void {
    const instance = this.instances.get(name)
    if (instance) {
      instance.dispose()
      this.instances.delete(name)
    }
  }
}

/**
 * Global provider registry singleton
 */
export const providerRegistry = new ProviderRegistry()
