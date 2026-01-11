// tests/unit/providers/call-center/types.test.ts
import { describe, it, expect } from 'vitest'
import type {
  CallCenterProvider,
  AgentState,
  AgentStatus,
  QueueInfo,
  AgentMetrics,
  CallCenterCapabilities,
} from '@/providers/call-center/types'

describe('Call Center Provider Types', () => {
  it('should define AgentStatus union type', () => {
    const statuses: AgentStatus[] = ['offline', 'available', 'busy', 'wrap-up', 'break', 'meeting']
    expect(statuses).toHaveLength(6)
  })

  it('should define AgentState interface with required properties', () => {
    const state: AgentState = {
      agentId: 'agent-001',
      displayName: 'John Doe',
      status: 'available',
      extension: '1001',
      queues: [],
      currentCall: null,
      loginTime: new Date(),
      isPaused: false,
      pauseReason: undefined,
      breakType: undefined,
    }
    expect(state.agentId).toBe('agent-001')
    expect(state.status).toBe('available')
  })

  it('should define QueueInfo interface', () => {
    const queue: QueueInfo = {
      name: 'support',
      displayName: 'Support Queue',
      isMember: true,
      isPaused: false,
      penalty: 0,
      callsHandled: 10,
      lastCallTime: null,
    }
    expect(queue.name).toBe('support')
    expect(queue.isMember).toBe(true)
  })

  it('should define AgentMetrics interface', () => {
    const metrics: AgentMetrics = {
      callsHandled: 25,
      totalTalkTime: 3600,
      averageHandleTime: 144,
      averageWrapUpTime: 30,
      longestCall: 600,
      shortestCall: 30,
      missedCalls: 2,
      transferredCalls: 3,
      sessionDuration: 28800,
    }
    expect(metrics.callsHandled).toBe(25)
    expect(metrics.averageHandleTime).toBe(144)
  })

  it('should define CallCenterCapabilities interface', () => {
    const capabilities: CallCenterCapabilities = {
      supportsQueues: true,
      supportsMultiQueue: true,
      supportsPause: true,
      supportsPauseReasons: true,
      supportsBreakTypes: true,
      supportsWrapUp: true,
      supportsMetrics: true,
      supportsRealTimeEvents: true,
      supportsPenalty: true,
      supportsSkillBasedRouting: false,
    }
    expect(capabilities.supportsQueues).toBe(true)
    expect(capabilities.supportsSkillBasedRouting).toBe(false)
  })

  it('should define CallCenterProvider interface methods', () => {
    // Type check only - verifies interface shape
    const mockProvider: CallCenterProvider = {
      id: 'asterisk',
      name: 'Asterisk AMI',
      capabilities: {} as CallCenterCapabilities,
      connect: async () => {},
      disconnect: async () => {},
      login: async () => ({
        agentId: '',
        displayName: '',
        status: 'offline',
        extension: '',
        queues: [],
        currentCall: null,
        loginTime: null,
        isPaused: false,
      }),
      logout: async () => {},
      setStatus: async () => {},
      joinQueue: async () => {},
      leaveQueue: async () => {},
      pause: async () => {},
      unpause: async () => {},
      getMetrics: async () => ({}) as AgentMetrics,
      onStateChange: () => () => {},
      onQueueEvent: () => () => {},
    }
    expect(mockProvider.id).toBe('asterisk')
    expect(typeof mockProvider.login).toBe('function')
  })
})
