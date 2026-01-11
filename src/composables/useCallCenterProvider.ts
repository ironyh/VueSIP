/**
 * Call Center Provider Composable
 *
 * Factory composable that creates and manages call center provider instances.
 * Handles provider lifecycle and exposes reactive state.
 *
 * @module composables/useCallCenterProvider
 */

import {
  ref,
  computed,
  shallowRef,
  onUnmounted,
  type Ref,
  type ComputedRef,
  type ShallowRef,
} from 'vue'
import type {
  CallCenterProvider,
  CallCenterCapabilities,
  ProviderConfig,
} from '@/providers/call-center/types'
import { createAsteriskAdapter } from '@/providers/call-center/adapters/asterisk'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useCallCenterProvider')

/**
 * Return type for useCallCenterProvider
 */
export interface UseCallCenterProviderReturn {
  /** The provider instance */
  provider: ShallowRef<CallCenterProvider | null>
  /** Provider capabilities */
  capabilities: ComputedRef<CallCenterCapabilities | null>
  /** Whether provider is connected */
  isConnected: Ref<boolean>
  /** Loading state */
  isLoading: Ref<boolean>
  /** Error message if any */
  error: Ref<string | null>
  /** Connect to provider */
  connect: () => Promise<void>
  /** Disconnect from provider */
  disconnect: () => Promise<void>
}

/**
 * Create provider instance based on config type
 */
function createProvider(type: ProviderConfig['type']): CallCenterProvider {
  switch (type) {
    case 'asterisk':
      return createAsteriskAdapter()
    case 'freeswitch':
      throw new Error('FreeSWITCH adapter not yet implemented')
    case 'cloud':
      throw new Error('Cloud adapter not yet implemented')
    case 'custom':
      throw new Error('Custom adapter requires manual provider injection')
    default:
      throw new Error(`Unsupported provider type: ${type}`)
  }
}

/**
 * Call Center Provider factory composable
 *
 * Creates and manages a call center provider instance based on configuration.
 * Handles connection lifecycle and provides reactive state.
 *
 * @param config - Provider configuration
 * @returns Provider instance and reactive state
 *
 * @example
 * ```typescript
 * const { provider, connect, disconnect, isConnected } = useCallCenterProvider({
 *   type: 'asterisk',
 *   connection: { host: 'pbx.example.com', port: 5038, username: 'admin', secret: 'pass' },
 *   agent: { id: 'agent-001', extension: 'PJSIP/1001', name: 'John Doe' },
 *   defaultQueues: ['support', 'sales'],
 * })
 *
 * await connect()
 * ```
 */
export function useCallCenterProvider(config: ProviderConfig): UseCallCenterProviderReturn {
  const provider = shallowRef<CallCenterProvider | null>(null)
  const isConnected = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Create provider instance
  try {
    provider.value = createProvider(config.type)
    logger.info(`Created ${config.type} provider`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create provider'
    logger.error(message)
    throw new Error(message)
  }

  const capabilities = computed(() => provider.value?.capabilities ?? null)

  async function connect(): Promise<void> {
    if (!provider.value) {
      error.value = 'Provider not initialized'
      return
    }

    if (isConnected.value) {
      logger.warn('Already connected')
      return
    }

    isLoading.value = true
    error.value = null

    try {
      await provider.value.connect(config)
      isConnected.value = true
      logger.info('Provider connected')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Connection failed'
      logger.error('Connection failed:', error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function disconnect(): Promise<void> {
    if (!provider.value || !isConnected.value) {
      return
    }

    isLoading.value = true

    try {
      await provider.value.disconnect()
      isConnected.value = false
      logger.info('Provider disconnected')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Disconnect failed'
      logger.error('Disconnect failed:', error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (isConnected.value) {
      disconnect().catch((err) => {
        logger.error('Cleanup disconnect failed:', err)
      })
    }
  })

  return {
    provider,
    capabilities,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
  }
}
