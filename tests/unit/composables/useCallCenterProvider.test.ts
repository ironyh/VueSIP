// tests/unit/composables/useCallCenterProvider.test.ts
import { describe, it, expect, vi } from 'vitest'
import { useCallCenterProvider } from '@/composables/useCallCenterProvider'
import type { ProviderConfig } from '@/providers/call-center/types'

vi.mock('@/providers/call-center/adapters/asterisk', () => ({
  createAsteriskAdapter: vi.fn(() => ({
    id: 'asterisk',
    name: 'Asterisk AMI',
    capabilities: { supportsQueues: true },
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockResolvedValue({ agentId: 'test', status: 'available', queues: [] }),
    logout: vi.fn().mockResolvedValue(undefined),
    onStateChange: vi.fn(() => () => {}),
    onQueueEvent: vi.fn(() => () => {}),
  })),
}))

describe('useCallCenterProvider', () => {
  const asteriskConfig: ProviderConfig = {
    type: 'asterisk',
    connection: { host: 'localhost', port: 5038 },
    agent: { id: 'agent-001', extension: 'PJSIP/1001' },
  }

  it('should create provider for asterisk type', () => {
    const { provider, isConnected } = useCallCenterProvider(asteriskConfig)
    expect(provider.value).not.toBeNull()
    expect(provider.value?.id).toBe('asterisk')
    expect(isConnected.value).toBe(false)
  })

  it('should connect and update isConnected', async () => {
    const { connect, isConnected, isLoading } = useCallCenterProvider(asteriskConfig)
    expect(isConnected.value).toBe(false)

    await connect()

    expect(isConnected.value).toBe(true)
    expect(isLoading.value).toBe(false)
  })

  it('should disconnect and update state', async () => {
    const { connect, disconnect, isConnected } = useCallCenterProvider(asteriskConfig)
    await connect()
    expect(isConnected.value).toBe(true)

    await disconnect()
    expect(isConnected.value).toBe(false)
  })

  it('should throw for unsupported provider type', () => {
    const invalidConfig: ProviderConfig = {
      type: 'unsupported' as any,
      connection: {},
      agent: { id: 'test', extension: 'test' },
    }
    expect(() => useCallCenterProvider(invalidConfig)).toThrow('Unsupported provider type')
  })

  it('should expose provider capabilities', () => {
    const { capabilities } = useCallCenterProvider(asteriskConfig)
    expect(capabilities.value?.supportsQueues).toBe(true)
  })
})
