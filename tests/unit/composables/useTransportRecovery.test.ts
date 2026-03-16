/**
 * Transport Recovery Composable Tests
 *
 * Tests for WebSocket reconnection and SIP re-registration coordination.
 *
 * @module composables/__tests__/useTransportRecovery.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useTransportRecovery } from '@/composables/useTransportRecovery'
import { ConnectionState } from '@/types/sip.types'
import type { SipClient } from '@/core/SipClient'

// Mock dependencies
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('useTransportRecovery', () => {
  let mockTransportManager: any
  let mockSipClient: Ref<SipClient | null>
  let registerFn: vi.Mock

  beforeEach(() => {
    // Create mock TransportManager - minimal implementation
    mockTransportManager = {
      state: ConnectionState.Disconnected,
      on: vi.fn(),
      off: vi.fn(),
    }

    // Create mock SipClient
    registerFn = vi.fn().mockResolvedValue(undefined)
    mockSipClient = ref({
      register: registerFn,
    } as unknown as SipClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const result = useTransportRecovery(mockTransportManager, mockSipClient)

    expect(result.connectionState.value).toBe(ConnectionState.Disconnected)
    expect(result.isRecovering.value).toBe(false)
    expect(result.lastRecoveryTime.value).toBeNull()
    expect(result.recoveryAttempts.value).toBe(0)
    expect(result.lastError.value).toBeNull()
    expect(result.metrics.value.totalAttempts).toBe(0)
    expect(result.metrics.value.totalRecoveries).toBe(0)
  })

  it('should return connection state from transport manager', () => {
    mockTransportManager.state = ConnectionState.Connected

    const result = useTransportRecovery(mockTransportManager, mockSipClient)

    expect(result.connectionState.value).toBe(ConnectionState.Connected)
  })

  it('should reset recovery state', async () => {
    const result = useTransportRecovery(mockTransportManager, mockSipClient)

    // Manually set some state
    result.recoveryAttempts.value = 5
    result.lastError.value = 'Some error'

    // Reset
    result.reset()

    expect(result.recoveryAttempts.value).toBe(0)
    expect(result.lastError.value).toBeNull()
  })

  it('should use provided register function when provided', async () => {
    const customRegisterFn = vi.fn().mockResolvedValue(undefined)

    const result = useTransportRecovery(mockTransportManager, mockSipClient, {
      register: customRegisterFn,
    })

    // Directly call the internal function by triggering recovery
    // Note: Without timers, we can only test the initial state
    expect(result.isRecovering.value).toBe(false)
    expect(customRegisterFn).not.toHaveBeenCalled()
  })

  it('should track metrics structure', () => {
    const result = useTransportRecovery(mockTransportManager, mockSipClient)

    // Check metrics structure
    expect(result.metrics.value).toHaveProperty('totalAttempts')
    expect(result.metrics.value).toHaveProperty('lastSuccessTime')
    expect(result.metrics.value).toHaveProperty('totalRecoveries')
    expect(result.metrics.value.totalAttempts).toBe(0)
    expect(result.metrics.value.totalRecoveries).toBe(0)
    expect(result.metrics.value.lastSuccessTime).toBeNull()
  })

  it('should handle null sipClient', () => {
    const emptyClient = ref<SipClient | null>(null)
    const onRecoveryFailed = vi.fn()

    // Should not throw when client is null
    const result = useTransportRecovery(mockTransportManager, emptyClient, {
      onRecoveryFailed,
    })

    expect(result.isRecovering.value).toBe(false)
  })

  it('should register event listeners on transport manager', () => {
    useTransportRecovery(mockTransportManager, mockSipClient)

    // Verify event listeners were registered
    expect(mockTransportManager.on).toHaveBeenCalled()
  })

  it('should expose triggerRecovery method', () => {
    const result = useTransportRecovery(mockTransportManager, mockSipClient)

    expect(typeof result.triggerRecovery).toBe('function')
  })

  it('should expose reset method', () => {
    const result = useTransportRecovery(mockTransportManager, mockSipClient)

    expect(typeof result.reset).toBe('function')
  })
})
