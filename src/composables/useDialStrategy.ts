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

import { ref, type Ref, type DeepReadonly } from 'vue'
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
   * Create 46elks REST originate strategy
   */
  const elksRestOriginateStrategy: DialStrategy = {
    type: 'rest-originate',
    requiresRestApi: true,
    canHandle: (providerId: string) => providerId === '46elks',
    dial: async (options: unknown): Promise<DialResult> => {
      const opts = options as RestOriginateOptions

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
   * Available strategies
   */
  const strategies: Record<DialStrategyType, DialStrategy> = {
    'sip-invite': sipInviteStrategy,
    'rest-originate': elksRestOriginateStrategy,
  }

  /**
   * Get strategy for provider ID
   */
  function getStrategyForProvider(providerId: string): DialStrategyType {
    if (elksRestOriginateStrategy.canHandle(providerId)) {
      return 'rest-originate'
    }
    return 'sip-invite'
  }

  /**
   * Configure dial strategy
   *
   * @param config - Strategy configuration
   */
  function configure(configInput: DialStrategyConfig): void {
    config.value = configInput

    if (configInput.autoDetect) {
      strategy.value = getStrategyForProvider(configInput.providerId)
    } else {
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
        error: 'Dial strategy not configured',
      }
    }

    isDialing.value = true
    error.value = null
    lastResult.value = null

    try {
      const currentStrategy = strategies[strategy.value]

      if (strategy.value === 'rest-originate' && config.value.providerId === '46elks') {
        const restOptions: RestOriginateOptions = options as RestOriginateOptions
        const result = await currentStrategy.dial(restOptions)
        lastResult.value = result
        if (!result.success) {
          error.value = result.error || 'Dial failed'
        }
        return result
      }

      const sipOptions: SipInviteOptions = {
        target,
        extraHeaders: (options as SipInviteOptions)?.extraHeaders,
      }
      const result = await currentStrategy.dial(sipOptions)
      lastResult.value = result
      if (!result.success) {
        error.value = result.error || 'Dial failed'
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
    isDialing.value = false
    lastResult.value = null
    error.value = null
  }

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
