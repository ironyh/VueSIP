import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CallCenterProviderConfig } from '@/providers/call-center/types'
import { useCallCenterProvider } from '../useCallCenterProvider'
import * as asteriskAdapter from '@/providers/call-center/adapters/asterisk'

vi.mock('@/providers/call-center/adapters/asterisk', () => ({
  createAsteriskAdapter: vi.fn(() => ({
    capabilities: {
      monitoring: true,
      whisper: true,
      barge: true,
      record: true,
      queueMetrics: true,
    },
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

describe('useCallCenterProvider', () => {
  const mockConfig: CallCenterProviderConfig = {
    type: 'asterisk',
    connection: {
      host: 'pbx.example.com',
      port: 5038,
      username: 'admin',
      secret: 'password',
    },
    agent: {
      id: 'agent-001',
      extension: 'PJSIP/1001',
      name: 'John Doe',
    },
    defaultQueues: ['support', 'sales'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should create provider instance on initialization', () => {
    const { provider, capabilities } = useCallCenterProvider(mockConfig)

    expect(provider.value).not.toBeNull()
    expect(capabilities.value).toEqual({
      monitoring: true,
      whisper: true,
      barge: true,
      record: true,
      queueMetrics: true,
    })
  })

  it('should initialize with correct default states', () => {
    const { isConnected, isLoading, error } = useCallCenterProvider(mockConfig)

    expect(isConnected.value).toBe(false)
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('should connect successfully', async () => {
    const { provider, connect, isConnected, isLoading, error } = useCallCenterProvider(mockConfig)

    await connect()

    expect(provider.value?.connect).toHaveBeenCalledWith(mockConfig)
    expect(isConnected.value).toBe(true)
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('should not connect if already connected', async () => {
    const { provider, connect, isConnected } = useCallCenterProvider(mockConfig)

    await connect()
    const connectCallCount = provider.value?.connect.mock.calls.length ?? 0

    await connect()

    expect(provider.value?.connect).toHaveBeenCalledTimes(connectCallCount)
    expect(isConnected.value).toBe(true)
  })

  it('should handle connection errors', async () => {
    const mockError = new Error('Connection refused')
    const connectFn = vi.fn().mockRejectedValue(mockError)

    vi.mocked(asteriskAdapter.createAsteriskAdapter).mockReturnValueOnce({
      capabilities: { monitoring: false },
      connect: connectFn,
      disconnect: vi.fn(),
    } as unknown as ReturnType<typeof asteriskAdapter.createAsteriskAdapter>)

    const { connect, error, isLoading } = useCallCenterProvider(mockConfig)

    await expect(connect()).rejects.toThrow('Connection refused')
    expect(error.value).toBe('Connection refused')
    expect(isLoading.value).toBe(false)
  })

  it('should disconnect successfully', async () => {
    const { provider, connect, disconnect, isConnected } = useCallCenterProvider(mockConfig)

    await connect()
    expect(isConnected.value).toBe(true)

    await disconnect()

    expect(provider.value?.disconnect).toHaveBeenCalled()
    expect(isConnected.value).toBe(false)
  })

  it('should not throw if disconnecting when not connected', async () => {
    const { disconnect, isConnected, isLoading } = useCallCenterProvider(mockConfig)

    expect(isConnected.value).toBe(false)

    await expect(disconnect()).resolves.not.toThrow()
    expect(isLoading.value).toBe(false)
  })

  it('should throw error for unsupported provider types', () => {
    expect(() => {
      useCallCenterProvider({
        type: 'freeswitch',
      } as CallCenterProviderConfig)
    }).toThrow('FreeSWITCH adapter not yet implemented')
  })

  it('should throw error for cloud adapter', () => {
    expect(() => {
      useCallCenterProvider({
        type: 'cloud',
      } as CallCenterProviderConfig)
    }).toThrow('Cloud adapter not yet implemented')
  })

  it('should throw error for custom adapter', () => {
    expect(() => {
      useCallCenterProvider({
        type: 'custom',
      } as CallCenterProviderConfig)
    }).toThrow('Custom adapter requires manual provider injection')
  })

  it('should return all required properties', () => {
    const result = useCallCenterProvider(mockConfig)

    expect(result).toHaveProperty('provider')
    expect(result).toHaveProperty('capabilities')
    expect(result).toHaveProperty('isConnected')
    expect(result).toHaveProperty('isLoading')
    expect(result).toHaveProperty('error')
    expect(result).toHaveProperty('connect')
    expect(result).toHaveProperty('disconnect')
  })
})
