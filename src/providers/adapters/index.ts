/**
 * Provider Adapters
 *
 * Adapters for complex SIP providers that require custom connection handling,
 * OAuth flows, or proprietary SDKs beyond standard SIP WebSocket connections.
 *
 * @module providers/adapters
 */

import { twilioAdapter } from './twilio'
import type { ProviderAdapter } from '../types'

// Re-export individual adapters
export { twilioAdapter } from './twilio'

/**
 * Array of all available provider adapters
 *
 * Use this array to register all adapters with the provider registry
 * or to iterate over available complex providers.
 */
export const adapters: ProviderAdapter[] = [twilioAdapter]
