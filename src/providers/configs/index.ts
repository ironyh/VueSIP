/**
 * Provider Configs Index
 *
 * Barrel export for all built-in provider configurations.
 * Exports individual providers and a combined array for easy access.
 *
 * @module providers/configs
 */

// Individual provider exports
export { ownPbxProvider } from './own-pbx'
export { elks46Provider } from './46elks'
export { telnyxProvider } from './telnyx'
export { voipmsProvider } from './voipms'

// Import for array construction
import { ownPbxProvider } from './own-pbx'
import { elks46Provider } from './46elks'
import { telnyxProvider } from './telnyx'
import { voipmsProvider } from './voipms'
import type { ProviderConfig } from '../types'

/**
 * Array of all built-in provider configurations.
 * Own PBX is first as it's the default/generic option.
 *
 * Order:
 * 1. own-pbx - Generic SIP (default, most flexible)
 * 2. 46elks - Swedish VoIP provider
 * 3. telnyx - Cloud communications platform
 * 4. voipms - Wholesale VoIP provider (requires gateway)
 */
export const builtInProviders: ProviderConfig[] = [
  ownPbxProvider,
  elks46Provider,
  telnyxProvider,
  voipmsProvider,
]
