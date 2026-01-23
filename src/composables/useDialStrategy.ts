/**
 * Dial Strategy Composable
 *
 * Provides provider-aware outbound calling strategies.
 * Automatically selects the appropriate dial strategy based on provider:
 * - Standards-based SIP INVITE for most providers
 * - REST API originate for providers like 46elks that require it
 *
 * @module composables/useDialStrategy
 */

import { ref, type Ref, type DeepReadonly, onUnmounted } from 'vue'
import type { SipClient } from '../core/SipClient'
import {
  type DialStrategy,
  type DialStrategyConfig,
  type DialResult,
  type SipInviteOptions,
  type RestOriginateOptions,
  type DialStrategyType,
} from '../types/dialStrategy.types'
import { originateCall as originate46ElksCall } from '../providers/services/elks46ApiService'

/**
 * Return type for useDialStrategy composable
 */
export interface UseDialStrategyReturn {
  /** Current strategy type */
  strategy: DeepReadonly<Ref<DialStrategyType>>
  /** Whether dialing is in progress */
  isDialing: DeepReadonly<Ref<boolean>>
  /** Last dial result */
  lastResult: DeepReadonly<Ref<DialResult | null>>
  /** Error message if dial failed */
  error: DeepReadonly<Ref<string | null>>
  /** Initialize dial strategy configuration */
  configure: (config: DialStrategyConfig) => void
  /** Dial using current strategy */
  dial: (target: string, options?: unknown) => Promise<DialResult>
  /** Reset dial state */
  reset: () => void
}

/**
 * Dial Strategy Composable
 *
 * Provides provider-aware outbound calling with automatic strategy selection.
 * Dial strategies:
 * - SIP INVITE: Standards-based (default)
 * - 46elks REST Originate: For 46elks provider
 *
 * @param sipClient - SIP client instance (for SIP INVITE strategy)
 * @returns Dial strategy state and methods
 *
 * @example
 * ```vue
 * <script setup>
 * import { useDialStrategy } from 'vuesip'
 *
 * const sipClient = ref<SipClient | null>(null)
 * const { configure, dial, isDialing, error } = useDialStrategy(sipClient)
 *
 * // Auto-detect based on provider
 * configure({ providerId: '46elks', strategy: 'auto' })
 *
 * // Dial a number
 * const result = await dial('+46700123456')
 * ```
 */
export function useDialStrategy(sipClient: Ref<SipClient | null>): UseDialStrategyReturn {
  const strategy = ref<DialStrategyType>('sip-invite')
  const isDialing = ref(false)
  const lastResult = ref<DialResult | null>(null)
  const error = ref<string | null>(null)
  const config = ref<DialStrategyConfig | null>(null)

  /**
   * Create SIP INVITE strategy
   */
  const sipInviteStrategy: DialStrategy = {
    type: 'sip-invite',
    requiresRestApi: false,
    canHandle: () => true, // Default strategy, handles all
    dial: async (options: unknown): Promise<DialResult> => {
      const opts = options as SipInviteOptions

      if (!sipClient.value) {
        return {
          success: false,
          error: 'SIP client not initialized',
        }
      }

      if (!sipClient.value.makeCall) {
        return {
          success: false,
          error: 'SipClient.makeCall() is not implemented',
        }
      }

      try {
        const callId = await sipClient.value.makeCall(opts.target, {
          video: false,
          extraHeaders: opts.extraHeaders,
        })
        return {
          success: true,
          callId,
        }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'SIP INVITE failed',
        }
      }
    },
  }

  /**
   * Validate RestOriginateOptions
   */
  function validateRestOriginateOptions(
    options: unknown,
    providerId: string
  ): options is RestOriginateOptions {
    if (!options || typeof options !== 'object') {
      return false
    }
    const opts = options as Partial<RestOriginateOptions>
    return (
      !!opts.apiUsername &&
      !!opts.apiPassword &&
      !!opts.callerId &&
      !!opts.webrtcNumber &&
      !!opts.destination &&
      opts.providerId === providerId
    )
  }

  /**
   * Create 46elks REST originate strategy
   */
  const elksRestOriginateStrategy: DialStrategy = {
    type: 'rest-originate',
    requiresRestApi: true,
    canHandle: (providerId: string) => providerId === '46elks',
    dial: async (options: unknown): Promise<DialResult> => {
      // Type guard validation
      if (!options || typeof options !== 'object') {
        return {
          success: false,
          error: 'Invalid options: must be an object',
        }
      }

      const opts = options as Partial<RestOriginateOptions>

      // Validate required fields
      if (!opts.apiUsername || !opts.apiPassword) {
        return {
          success: false,
          error: 'Missing API credentials (apiUsername, apiPassword)',
        }
      }

      if (!opts.callerId || !opts.webrtcNumber || !opts.destination) {
        return {
          success: false,
          error: 'Missing required fields (callerId, webrtcNumber, destination)',
        }
      }

      try {
        const result = await originate46ElksCall({
          credentials: {
            username: opts.apiUsername,
            password: opts.apiPassword,
          },
          callerId: opts.callerId,
          webrtcNumber: opts.webrtcNumber,
          destination: opts.destination,
        })
        return {
          success: true,
          callId: result.id,
        }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : '46elks REST originate failed',
        }
      }
    },
  }

  /**
   * Strategy registry - extensible pattern for adding new strategies
   */
  const strategyRegistry: DialStrategy[] = [sipInviteStrategy, elksRestOriginateStrategy]

  /**
   * Available strategies (indexed by type for fast lookup)
   */
  const strategies: Record<DialStrategyType, DialStrategy> = {
    'sip-invite': sipInviteStrategy,
    'rest-originate': elksRestOriginateStrategy,
  }

  /**
   * Get strategy for provider ID using registry pattern
   * Checks all registered strategies to find the best match
   */
  function getStrategyForProvider(providerId: string): DialStrategyType {
    // Find first strategy that can handle this provider
    const matchingStrategy = strategyRegistry.find((s) => s.canHandle(providerId))
    if (matchingStrategy) {
      return matchingStrategy.type
    }
    // Default to SIP INVITE if no match
    return 'sip-invite'
  }

  /**
   * Configure dial strategy
   *
   * @param configInput - Strategy configuration
   * @throws Error if trying to configure during active dialing
   */
  function configure(configInput: DialStrategyConfig): void {
    if (isDialing.value) {
      throw new Error('Cannot change dial strategy while dialing is in progress')
    }

    config.value = configInput

    if (configInput.autoDetect) {
      strategy.value = getStrategyForProvider(configInput.providerId)
    } else {
      // Validate that the strategy exists
      if (!strategies[configInput.strategy]) {
        throw new Error(`Unknown dial strategy: ${configInput.strategy}`)
      }
      strategy.value = configInput.strategy
    }
  }

  /**
   * Dial using current strategy
   *
   * @param target - Target to call (phone number or SIP URI)
   * @param options - Strategy-specific options
   * @returns Dial result
   */
  async function dial(target: string, options?: unknown): Promise<DialResult> {
    if (!config.value) {
      return {
        success: false,
        error: 'Dial strategy not configured. Call configure() first.',
      }
    }

    if (isDialing.value) {
      return {
        success: false,
        error: 'Dial already in progress',
      }
    }

    isDialing.value = true
    error.value = null
    lastResult.value = null

    try {
      const currentStrategy = strategies[strategy.value]

      if (!currentStrategy) {
        throw new Error(`Strategy '${strategy.value}' not found`)
      }

      // Build options based on strategy type
      let strategyOptions: unknown

      if (strategy.value === 'rest-originate') {
        // For REST originate, merge options with providerId from config
        if (!options || typeof options !== 'object') {
          return {
            success: false,
            error: 'REST originate requires options object with API credentials',
          }
        }

        const restOpts = options as Partial<RestOriginateOptions>
        strategyOptions = {
          ...restOpts,
          providerId: config.value.providerId,
        } as RestOriginateOptions

        // Validate options
        if (!validateRestOriginateOptions(strategyOptions, config.value.providerId)) {
          return {
            success: false,
            error: 'Invalid REST originate options. Missing required fields.',
          }
        }
      } else {
        // For SIP INVITE, build options from target
        strategyOptions = {
          target,
          extraHeaders: (options as SipInviteOptions)?.extraHeaders,
        } as SipInviteOptions
      }

      const result = await currentStrategy.dial(strategyOptions)
      lastResult.value = result

      if (!result.success) {
        error.value = result.error || 'Dial failed'
      } else {
        // Clear error on success
        error.value = null
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Dial failed'
      error.value = errorMessage
      lastResult.value = {
        success: false,
        error: errorMessage,
      }
      return lastResult.value
    } finally {
      isDialing.value = false
    }
  }

  /**
   * Reset dial state
   */
  function reset(): void {
    if (isDialing.value) {
      // Don't reset during active dialing
      return
    }
    isDialing.value = false
    lastResult.value = null
    error.value = null
  }

  // Cleanup on unmount
  onUnmounted(() => {
    // Reset state but don't interrupt active dialing
    if (!isDialing.value) {
      reset()
    }
  })

  return {
    strategy: strategy as DeepReadonly<Ref<DialStrategyType>>,
    isDialing: isDialing as DeepReadonly<Ref<boolean>>,
    lastResult: lastResult as DeepReadonly<Ref<DialResult | null>>,
    error: error as DeepReadonly<Ref<string | null>>,
    configure,
    dial,
    reset,
  }
}
