// tests/unit/providers/call-center/adapters/asterisk.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CallCenterProvider, ProviderConfig } from '@/providers/call-center/types'

// Create mock AMI client instance
const mockAmiClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  action: vi.fn().mockResolvedValue({ Response: 'Success' }),
  sendAction: vi.fn().mockResolvedValue({ data: { Response: 'Success' } }),
  on: vi.fn(),
  off: vi.fn(),
}

// Mock the AMI client module with a proper class constructor
// Using a class-based mock for proper 'new' keyword support
vi.mock('@/core/AmiClient', () => {
  return {
    AmiClient: class MockAmiClient {
      connect = mockAmiClient.connect
      disconnect = mockAmiClient.disconnect
      action = mockAmiClient.action
      sendAction = mockAmiClient.sendAction
      on = mockAmiClient.on
      off = mockAmiClient.off
    },
  }
})

// Import after mock is set up
import { createAsteriskAdapter } from '@/providers/call-center/adapters/asterisk'

describe('Asterisk AMI Adapter', () => {
  let adapter: CallCenterProvider
  const mockConfig: ProviderConfig = {
    type: 'asterisk',
    connection: {
      host: 'localhost',
      port: 5038,
      username: 'admin',
      secret: 'password',
    },
    agent: {
      id: 'agent-001',
      extension: 'PJSIP/1001',
      name: 'Test Agent',
    },
    availableQueues: ['support', 'sales'],
    defaultQueues: ['support'],
    pauseReasons: ['Lunch', 'Break', 'Meeting'],
  }

  beforeEach(() => {
    // Reset all mocks between tests
    vi.clearAllMocks()
    mockAmiClient.connect.mockResolvedValue(undefined)
    mockAmiClient.disconnect.mockResolvedValue(undefined)
    mockAmiClient.action.mockResolvedValue({ Response: 'Success' })
    adapter = createAsteriskAdapter()
  })

  describe('adapter properties', () => {
    it('should have correct id and name', () => {
      expect(adapter.id).toBe('asterisk')
      expect(adapter.name).toBe('Asterisk AMI')
    })

    it('should define capabilities', () => {
      expect(adapter.capabilities.supportsQueues).toBe(true)
      expect(adapter.capabilities.supportsMultiQueue).toBe(true)
      expect(adapter.capabilities.supportsPause).toBe(true)
      expect(adapter.capabilities.supportsPauseReasons).toBe(true)
      expect(adapter.capabilities.supportsMetrics).toBe(true)
      expect(adapter.capabilities.supportsRealTimeEvents).toBe(true)
      expect(adapter.capabilities.supportsPenalty).toBe(true)
      expect(adapter.capabilities.supportsSkillBasedRouting).toBe(false)
    })
  })

  describe('connect', () => {
    it('should connect to AMI server', async () => {
      await expect(adapter.connect(mockConfig)).resolves.not.toThrow()
    })

    it('should throw if already connected', async () => {
      await adapter.connect(mockConfig)
      await expect(adapter.connect(mockConfig)).rejects.toThrow('Already connected')
    })
  })

  describe('login', () => {
    beforeEach(async () => {
      await adapter.connect(mockConfig)
    })

    it('should login agent to default queues', async () => {
      const state = await adapter.login()
      expect(state.agentId).toBe('agent-001')
      expect(state.status).toBe('available')
      expect(state.queues.some((q) => q.name === 'support')).toBe(true)
    })

    it('should login to specified queues', async () => {
      const state = await adapter.login({ queues: ['sales'] })
      expect(state.queues.some((q) => q.name === 'sales')).toBe(true)
    })
  })

  describe('pause/unpause', () => {
    beforeEach(async () => {
      await adapter.connect(mockConfig)
      await adapter.login()
    })

    it('should pause agent with reason', async () => {
      await adapter.pause({ reason: 'Lunch' })
      // Verify through state change callback or getMetrics
    })

    it('should unpause agent', async () => {
      await adapter.pause({ reason: 'Break' })
      await adapter.unpause()
      // Verify agent is unpaused
    })
  })

  describe('event subscriptions', () => {
    beforeEach(async () => {
      await adapter.connect(mockConfig)
    })

    it('should allow state change subscription', () => {
      const callback = vi.fn()
      const unsubscribe = adapter.onStateChange(callback)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should allow queue event subscription', () => {
      const callback = vi.fn()
      const unsubscribe = adapter.onQueueEvent(callback)
      expect(typeof unsubscribe).toBe('function')
    })
  })
})
