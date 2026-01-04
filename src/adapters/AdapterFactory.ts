/**
 * SIP Adapter Factory
 *
 * Factory for creating SIP adapter instances based on configuration.
 * Supports multiple SIP libraries through a unified adapter interface.
 *
 * The factory provides:
 * - Dynamic library loading (code splitting)
 * - Library availability detection
 * - Adapter metadata retrieval
 * - Custom adapter support
 *
 * @packageDocumentation
 * @module adapters
 *
 * @example Basic usage with JsSIP
 * ```typescript
 * import { AdapterFactory } from '@/adapters/AdapterFactory'
 *
 * const adapter = await AdapterFactory.createAdapter(sipConfig, {
 *   library: 'jssip'
 * })
 * ```
 *
 * @example Using a custom adapter
 * ```typescript
 * const customAdapter = new MyCustomAdapter()
 * const adapter = await AdapterFactory.createAdapter(sipConfig, {
 *   library: 'custom',
 *   customAdapter
 * })
 * ```
 */

import type { ISipAdapter, AdapterConfig } from './types'
import type { SipClientConfig } from '../types'

/**
 * Factory class for creating SIP adapter instances.
 *
 * The `AdapterFactory` provides a centralized way to create adapters for
 * different SIP libraries (JsSIP, SIP.js) or custom implementations.
 * It handles dynamic imports to enable code splitting and lazy loading.
 *
 * @example Creating a JsSIP adapter
 * ```typescript
 * const adapter = await AdapterFactory.createAdapter(
 *   {
 *     uri: 'wss://sip.example.com:7443',
 *     sipUri: 'sip:user@example.com',
 *     password: 'secret'
 *   },
 *   { library: 'jssip' }
 * )
 *
 * await adapter.connect()
 * await adapter.register()
 * ```
 *
 * @example Checking library availability
 * ```typescript
 * const isJsSipAvailable = await AdapterFactory.isLibraryAvailable('jssip')
 * const libraries = await AdapterFactory.getAvailableLibraries()
 * console.log('Available libraries:', libraries) // ['jssip']
 * ```
 *
 * @see {@link ISipAdapter} for the adapter interface
 * @see {@link AdapterConfig} for configuration options
 */
export class AdapterFactory {
  /**
   * Create a SIP adapter instance
   *
   * @param sipConfig - SIP client configuration
   * @param adapterConfig - Adapter selection configuration
   * @returns Configured SIP adapter instance
   *
   * @example
   * ```typescript
   * // Using JsSIP (default)
   * const adapter = await AdapterFactory.createAdapter(sipConfig, {
   *   library: 'jssip'
   * })
   *
   * // Using SIP.js
   * const adapter = await AdapterFactory.createAdapter(sipConfig, {
   *   library: 'sipjs'
   * })
   *
   * // Using custom adapter
   * const adapter = await AdapterFactory.createAdapter(sipConfig, {
   *   library: 'custom',
   *   customAdapter: myCustomAdapter
   * })
   * ```
   */
  static async createAdapter(
    sipConfig: SipClientConfig,
    adapterConfig: AdapterConfig
  ): Promise<ISipAdapter> {
    let adapter: ISipAdapter

    switch (adapterConfig.library) {
      case 'jssip': {
        // Dynamically import JsSIP adapter
        const { JsSipAdapter } = await import('./jssip/JsSipAdapter')
        adapter = new JsSipAdapter(adapterConfig.libraryOptions)
        break
      }

      case 'sipjs': {
        // Dynamically import SIP.js adapter
        // Note: SIP.js adapter is currently a stub implementation
        const { SipJsAdapter } = await import('./sipjs/SipJsAdapter')
        adapter = new SipJsAdapter(adapterConfig.libraryOptions)
        break
      }

      case 'custom': {
        if (!adapterConfig.customAdapter) {
          throw new Error('Custom adapter must be provided when library is set to "custom"')
        }
        adapter = adapterConfig.customAdapter
        break
      }

      default: {
        const exhaustiveCheck: never = adapterConfig.library
        throw new Error(`Unsupported adapter library: ${exhaustiveCheck}`)
      }
    }

    // Initialize the adapter with SIP configuration
    await adapter.initialize(sipConfig)

    return adapter
  }

  /**
   * Check if a SIP library is available in the runtime environment.
   *
   * This method attempts to dynamically import the specified library to
   * determine if it's installed and accessible. Useful for conditional
   * logic when supporting multiple SIP libraries.
   *
   * @param library - Library name to check ('jssip' or 'sipjs')
   * @returns Promise resolving to true if the library is available
   *
   * @example
   * ```typescript
   * if (await AdapterFactory.isLibraryAvailable('jssip')) {
   *   // Use JsSIP
   *   adapter = await AdapterFactory.createAdapter(config, { library: 'jssip' })
   * } else {
   *   // Fallback or show error
   *   console.error('JsSIP is not installed')
   * }
   * ```
   */
  static async isLibraryAvailable(library: 'jssip' | 'sipjs'): Promise<boolean> {
    try {
      switch (library) {
        case 'jssip': {
          // Check if JsSIP module is available
          await import('jssip')
          return true
        }
        case 'sipjs': {
          // Check if SIP.js module is available
          const { isSipJsAvailable } = await import('./sipjs/SipJsAdapter')
          return await isSipJsAvailable()
        }
        default:
          return false
      }
    } catch {
      return false
    }
  }

  /**
   * Get all available SIP libraries in the current environment.
   *
   * Checks all supported SIP libraries and returns an array of those
   * that are installed and accessible. Useful for building UI that
   * lets users select their preferred library.
   *
   * @returns Promise resolving to array of available library names
   *
   * @example
   * ```typescript
   * const libraries = await AdapterFactory.getAvailableLibraries()
   * console.log('Available:', libraries)
   * // Output: ['jssip'] if only JsSIP is installed
   *
   * // Use first available library
   * if (libraries.length > 0) {
   *   const adapter = await AdapterFactory.createAdapter(config, {
   *     library: libraries[0]
   *   })
   * }
   * ```
   */
  static async getAvailableLibraries(): Promise<Array<'jssip' | 'sipjs'>> {
    const libraries: Array<'jssip' | 'sipjs'> = []

    if (await AdapterFactory.isLibraryAvailable('jssip')) {
      libraries.push('jssip')
    }

    if (await AdapterFactory.isLibraryAvailable('sipjs')) {
      libraries.push('sipjs')
    }

    return libraries
  }

  /**
   * Get adapter metadata without fully initializing.
   *
   * Returns information about the specified adapter including adapter
   * name, version, and underlying library version. Useful for displaying
   * library information in UIs or for debugging.
   *
   * @param library - Library to get info for ('jssip' or 'sipjs')
   * @returns Promise resolving to adapter metadata, or null if unavailable
   *
   * @example
   * ```typescript
   * const info = await AdapterFactory.getAdapterInfo('jssip')
   * if (info) {
   *   console.log(`Using ${info.libraryName} v${info.libraryVersion}`)
   *   console.log(`Adapter: ${info.adapterName} v${info.adapterVersion}`)
   * }
   * // Output:
   * // Using JsSIP v3.10.0
   * // Adapter: JsSIP Adapter v1.0.0
   * ```
   */
  static async getAdapterInfo(library: 'jssip' | 'sipjs'): Promise<{
    adapterName: string
    adapterVersion: string
    libraryName: string
    libraryVersion: string
  } | null> {
    try {
      // Get adapter class without full initialization
      switch (library) {
        case 'jssip': {
          const { JsSipAdapter } = await import('./jssip/JsSipAdapter')
          const adapter = new JsSipAdapter()
          return {
            adapterName: adapter.adapterName,
            adapterVersion: adapter.adapterVersion,
            libraryName: adapter.libraryName,
            libraryVersion: adapter.libraryVersion,
          }
        }
        case 'sipjs': {
          const { SipJsAdapter } = await import('./sipjs/SipJsAdapter')
          const adapter = new SipJsAdapter()
          return {
            adapterName: adapter.adapterName,
            adapterVersion: adapter.adapterVersion,
            libraryName: adapter.libraryName,
            libraryVersion: adapter.libraryVersion,
          }
        }
        default:
          return null
      }
    } catch {
      return null
    }
  }
}

/**
 * Convenience function to create a SIP adapter with minimal configuration.
 *
 * This is a simplified wrapper around `AdapterFactory.createAdapter()` for
 * common use cases where only the library selection is needed.
 *
 * @param sipConfig - SIP client configuration (server, credentials, etc.)
 * @param library - SIP library to use (default: 'jssip')
 * @returns Promise resolving to a configured, initialized SIP adapter
 *
 * @example Basic usage with defaults (JsSIP)
 * ```typescript
 * import { createSipAdapter } from '@/adapters/AdapterFactory'
 *
 * const adapter = await createSipAdapter({
 *   uri: 'wss://sip.example.com:7443',
 *   sipUri: 'sip:user@example.com',
 *   password: 'secret'
 * })
 *
 * await adapter.connect()
 * await adapter.register()
 * ```
 *
 * @example Explicitly selecting SIP.js
 * ```typescript
 * const adapter = await createSipAdapter(sipConfig, 'sipjs')
 * ```
 *
 * @see {@link AdapterFactory.createAdapter} for more configuration options
 */
export async function createSipAdapter(
  sipConfig: SipClientConfig,
  library: 'jssip' | 'sipjs' = 'jssip'
): Promise<ISipAdapter> {
  return AdapterFactory.createAdapter(sipConfig, { library })
}
