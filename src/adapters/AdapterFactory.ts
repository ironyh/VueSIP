/**
 * SIP Adapter Factory
 *
 * Factory for creating SIP adapter instances based on configuration.
 * Supports multiple SIP libraries through a unified adapter interface.
 */

import type { ISipAdapter, AdapterConfig } from './types'
import type { SipClientConfig } from '../types'

/**
 * Adapter Factory Class
 *
 * Creates and configures SIP adapter instances based on the selected library.
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
   * Check if a SIP library is available
   *
   * @param library - Library name to check
   * @returns True if the library adapter is available
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
   * Get available SIP libraries
   *
   * @returns Array of available library names
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
   * Get adapter information
   *
   * @param library - Library to get info for
   * @returns Adapter metadata
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
 * Convenience function to create an adapter
 *
 * @param sipConfig - SIP client configuration
 * @param library - SIP library to use (default: 'jssip')
 * @returns Configured SIP adapter instance
 */
export async function createSipAdapter(
  sipConfig: SipClientConfig,
  library: 'jssip' | 'sipjs' = 'jssip'
): Promise<ISipAdapter> {
  return AdapterFactory.createAdapter(sipConfig, { library })
}
