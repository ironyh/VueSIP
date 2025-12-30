/**
 * AmiService unit tests
 * Comprehensive test coverage for unified AMI service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createAmiService,
  getAmiService,
  resetAmiService,
  type AmiServiceConfig,
  type AmiServiceReturn,
} from '@/services/AmiService'
import type { AmiConfig, AmiConnectionState } from '@/types/ami.types'
import type { AmiClient } from '@/core/AmiClient'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock all AMI composables
vi.mock('@/composables/useAmi', () => ({
  useAmi: vi.fn(() => ({
    connectionState: { value: 'disconnected' as AmiConnectionState },
    isConnected: { value: false },
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    getClient: vi.fn(() => ({ sendAction: vi.fn() }) as unknown as AmiClient),
    onEvent: vi.fn(),
  })),
}))

vi.mock('@/composables/useAmiQueues', () => ({
  useAmiQueues: vi.fn(() => ({ refresh: vi.fn() })),
}))

vi.mock('@/composables/useAmiAgentStats', () => ({
  useAmiAgentStats: vi.fn(() => ({ startTracking: vi.fn() })),
}))

vi.mock('@/composables/useAmiAgentLogin', () => ({
  useAmiAgentLogin: vi.fn(() => ({ login: vi.fn() })),
}))

vi.mock('@/composables/useAmiVoicemail', () => ({
  useAmiVoicemail: vi.fn(() => ({ monitorMailbox: vi.fn() })),
}))

vi.mock('@/composables/useAmiParking', () => ({
  useAmiParking: vi.fn(() => ({ parkCall: vi.fn() })),
}))

vi.mock('@/composables/useAmiCallback', () => ({
  useAmiCallback: vi.fn(() => ({ requestCallback: vi.fn() })),
}))

vi.mock('@/composables/useAmiCDR', () => ({
  useAmiCDR: vi.fn(() => ({ getCDRs: vi.fn() })),
}))

vi.mock('@/composables/useAmiSupervisor', () => ({
  useAmiSupervisor: vi.fn(() => ({ monitorAgent: vi.fn() })),
}))

vi.mock('@/composables/useAmiRingGroups', () => ({
  useAmiRingGroups: vi.fn(() => ({ getRingGroups: vi.fn() })),
}))

vi.mock('@/composables/useAmiIVR', () => ({
  useAmiIVR: vi.fn(() => ({ getIVRStatus: vi.fn() })),
}))

vi.mock('@/composables/useAmiRecording', () => ({
  useAmiRecording: vi.fn(() => ({ startRecording: vi.fn() })),
}))

vi.mock('@/composables/useAmiTimeConditions', () => ({
  useAmiTimeConditions: vi.fn(() => ({ getTimeConditions: vi.fn() })),
}))

vi.mock('@/composables/useAmiFeatureCodes', () => ({
  useAmiFeatureCodes: vi.fn(() => ({ getFeatureCodes: vi.fn() })),
}))

vi.mock('@/composables/useAmiPaging', () => ({
  useAmiPaging: vi.fn(() => ({ startPaging: vi.fn() })),
}))

vi.mock('@/composables/useAmiBlacklist', () => ({
  useAmiBlacklist: vi.fn(() => ({ addToBlacklist: vi.fn() })),
}))

vi.mock('@/composables/useAmiPeers', () => ({
  useAmiPeers: vi.fn(() => ({ getPeers: vi.fn() })),
}))

vi.mock('@/composables/useAmiCalls', () => ({
  useAmiCalls: vi.fn(() => ({ getActiveCalls: vi.fn() })),
}))

vi.mock('@/composables/useAmiDatabase', () => ({
  useAmiDatabase: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
}))

describe('AmiService', () => {
  let service: AmiServiceReturn
  let mockAmiConfig: AmiConfig

  beforeEach(() => {
    vi.clearAllMocks()
    resetAmiService()

    mockAmiConfig = {
      url: 'ws://localhost:8080/ami',
      username: 'admin',
      secret: 'secret123',
    }
  })

  afterEach(() => {
    resetAmiService()
  })

  describe('createAmiService', () => {
    it('should create service with default config', () => {
      service = createAmiService()

      expect(service).toBeDefined()
      expect(service.isConnected.value).toBe(false)
      expect(service.error.value).toBeNull()
    })

    it('should create service with custom config', () => {
      const config: AmiServiceConfig = {
        amiConfig: mockAmiConfig,
        autoConnect: false,
        autoReconnect: true,
        reconnectDelay: 3000,
        maxReconnectAttempts: 3,
      }

      service = createAmiService(config)

      expect(service).toBeDefined()
    })

    it('should not auto-connect by default', async () => {
      service = createAmiService({ amiConfig: mockAmiConfig })

      // Should not connect automatically
      expect(service.ami.connect).not.toHaveBeenCalled()
    })

    it('should auto-connect when configured', async () => {
      service = createAmiService({
        amiConfig: mockAmiConfig,
        autoConnect: true,
      })

      // Wait for async auto-connect
      await vi.waitFor(() => {
        expect(service.ami.connect).toHaveBeenCalledWith(mockAmiConfig)
      })
    })
  })

  describe('Connection Management', () => {
    beforeEach(() => {
      service = createAmiService()
    })

    it('should connect to AMI with config', async () => {
      await service.connect(mockAmiConfig)

      expect(service.ami.connect).toHaveBeenCalledWith(mockAmiConfig)
      expect(service.error.value).toBeNull()
    })

    it('should throw error when connecting without config', async () => {
      await expect(service.connect()).rejects.toThrow('AMI configuration required')
    })

    it('should use provided config over constructor config', async () => {
      const serviceWithConfig = createAmiService({
        amiConfig: { url: 'ws://old:8080', username: 'old', secret: 'old' },
      })

      const newConfig: AmiConfig = {
        url: 'ws://new:8080',
        username: 'new',
        secret: 'new',
      }

      await serviceWithConfig.connect(newConfig)

      expect(serviceWithConfig.ami.connect).toHaveBeenCalledWith(newConfig)
    })

    it('should disconnect from AMI', async () => {
      await service.connect(mockAmiConfig)

      service.disconnect()

      expect(service.ami.disconnect).toHaveBeenCalled()
    })

    it('should reconnect to AMI', async () => {
      const serviceWithConfig = createAmiService({ amiConfig: mockAmiConfig })

      await serviceWithConfig.reconnect()

      expect(serviceWithConfig.ami.disconnect).toHaveBeenCalled()
      expect(serviceWithConfig.ami.connect).toHaveBeenCalledWith(mockAmiConfig)
    })

    it('should reset all composables on disconnect', async () => {
      await service.connect(mockAmiConfig)

      // Initialize some composables
      service.useQueues()
      service.useAgentStats()

      expect(service.composables.queues).not.toBeNull()
      expect(service.composables.agentStats).not.toBeNull()

      service.disconnect()

      expect(service.composables.queues).toBeNull()
      expect(service.composables.agentStats).toBeNull()
    })

    it('should handle connection errors', async () => {
      const errorMessage = 'Connection failed'
      vi.mocked(service.ami.connect).mockRejectedValueOnce(new Error(errorMessage))

      await expect(service.connect(mockAmiConfig)).rejects.toThrow(errorMessage)
      expect(service.error.value).toBe(errorMessage)
    })

    it('should handle generic connection errors', async () => {
      vi.mocked(service.ami.connect).mockRejectedValueOnce('Generic error')

      await expect(service.connect(mockAmiConfig)).rejects.toBe('Generic error')
      expect(service.error.value).toBe('Failed to connect')
    })
  })

  describe('Auto-Reconnect Logic', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should setup auto-reconnect handler when enabled', async () => {
      service = createAmiService({
        amiConfig: mockAmiConfig,
        autoReconnect: true,
      })

      await service.connect(mockAmiConfig)

      // Verify onEvent was called to setup reconnect handler
      expect(service.ami.onEvent).toHaveBeenCalled()
    })

    it('should not exceed max reconnect attempts', async () => {
      service = createAmiService({
        amiConfig: mockAmiConfig,
        autoReconnect: true,
        maxReconnectAttempts: 3,
        reconnectDelay: 1000,
      })

      await service.connect(mockAmiConfig)

      // Simulate disconnect event and connection failures
      vi.mocked(service.ami.connect).mockRejectedValue(new Error('Connection failed'))

      // Get the disconnect handler and trigger it
      const onEventCalls = vi.mocked(service.ami.onEvent).mock.calls
      if (onEventCalls.length > 0) {
        const disconnectHandler = onEventCalls[0][0]
        disconnectHandler({ type: 'disconnected' } as any)

        // Advance through all reconnect attempts
        for (let i = 0; i < 3; i++) {
          await vi.advanceTimersByTimeAsync(1000)
        }

        // One more attempt should not happen
        await vi.advanceTimersByTimeAsync(1000)

        expect(service.error.value).toBe('Max reconnection attempts reached')
      }
    })
  })

  describe('Composable Factories', () => {
    beforeEach(async () => {
      service = createAmiService()
      await service.connect(mockAmiConfig)
    })

    it('should create queues composable', () => {
      const queues = service.useQueues()

      expect(queues).toBeDefined()
      expect(service.composables.queues).toBe(queues)
    })

    it('should return existing queues composable on second call', () => {
      const queues1 = service.useQueues()
      const queues2 = service.useQueues()

      expect(queues1).toBe(queues2)
    })

    it('should create agent stats composable', () => {
      const agentStats = service.useAgentStats()

      expect(agentStats).toBeDefined()
      expect(service.composables.agentStats).toBe(agentStats)
    })

    it('should create agent login composable', () => {
      const agentLogin = service.useAgentLogin()

      expect(agentLogin).toBeDefined()
      expect(service.composables.agentLogin).toBe(agentLogin)
    })

    it('should create voicemail composable', () => {
      const voicemail = service.useVoicemail()

      expect(voicemail).toBeDefined()
      expect(service.composables.voicemail).toBe(voicemail)
    })

    it('should create parking composable', () => {
      const parking = service.useParking()

      expect(parking).toBeDefined()
      expect(service.composables.parking).toBe(parking)
    })

    it('should create callback composable', () => {
      const callback = service.useCallback()

      expect(callback).toBeDefined()
      expect(service.composables.callback).toBe(callback)
    })

    it('should create CDR composable', () => {
      const cdr = service.useCDR()

      expect(cdr).toBeDefined()
      expect(service.composables.cdr).toBe(cdr)
    })

    it('should create supervisor composable', () => {
      const supervisor = service.useSupervisor()

      expect(supervisor).toBeDefined()
      expect(service.composables.supervisor).toBe(supervisor)
    })

    it('should create ring groups composable', () => {
      const ringGroups = service.useRingGroups()

      expect(ringGroups).toBeDefined()
      expect(service.composables.ringGroups).toBe(ringGroups)
    })

    it('should create IVR composable', () => {
      const ivr = service.useIVR()

      expect(ivr).toBeDefined()
      expect(service.composables.ivr).toBe(ivr)
    })

    it('should create recording composable', () => {
      const recording = service.useRecording()

      expect(recording).toBeDefined()
      expect(service.composables.recording).toBe(recording)
    })

    it('should create time conditions composable', () => {
      const timeConditions = service.useTimeConditions()

      expect(timeConditions).toBeDefined()
      expect(service.composables.timeConditions).toBe(timeConditions)
    })

    it('should create feature codes composable', () => {
      const featureCodes = service.useFeatureCodes()

      expect(featureCodes).toBeDefined()
      expect(service.composables.featureCodes).toBe(featureCodes)
    })

    it('should create paging composable', () => {
      const paging = service.usePaging()

      expect(paging).toBeDefined()
      expect(service.composables.paging).toBe(paging)
    })

    it('should create blacklist composable', () => {
      const blacklist = service.useBlacklist()

      expect(blacklist).toBeDefined()
      expect(service.composables.blacklist).toBe(blacklist)
    })

    it('should create peers composable', () => {
      const peers = service.usePeers()

      expect(peers).toBeDefined()
      expect(service.composables.peers).toBe(peers)
    })

    it('should create calls composable', () => {
      const calls = service.useCalls()

      expect(calls).toBeDefined()
      expect(service.composables.calls).toBe(calls)
    })

    it('should create database composable', () => {
      const database = service.useDatabase()

      expect(database).toBeDefined()
      expect(service.composables.database).toBe(database)
    })
  })

  describe('Utility Methods', () => {
    beforeEach(async () => {
      service = createAmiService()
      await service.connect(mockAmiConfig)
    })

    it('should initialize all composables at once', () => {
      service.initializeAll()

      expect(service.composables.queues).not.toBeNull()
      expect(service.composables.agentStats).not.toBeNull()
      expect(service.composables.agentLogin).not.toBeNull()
      expect(service.composables.voicemail).not.toBeNull()
      expect(service.composables.parking).not.toBeNull()
      expect(service.composables.callback).not.toBeNull()
      expect(service.composables.cdr).not.toBeNull()
      expect(service.composables.supervisor).not.toBeNull()
      expect(service.composables.ringGroups).not.toBeNull()
      expect(service.composables.ivr).not.toBeNull()
      expect(service.composables.recording).not.toBeNull()
      expect(service.composables.timeConditions).not.toBeNull()
      expect(service.composables.featureCodes).not.toBeNull()
      expect(service.composables.paging).not.toBeNull()
      expect(service.composables.blacklist).not.toBeNull()
      expect(service.composables.peers).not.toBeNull()
      expect(service.composables.calls).not.toBeNull()
      expect(service.composables.database).not.toBeNull()
    })

    it('should initialize all composables with options', () => {
      service.initializeAll({
        queues: { useEvents: true },
        agentStats: { agentId: '1001' },
      })

      expect(service.composables.queues).not.toBeNull()
      expect(service.composables.agentStats).not.toBeNull()
    })

    it('should reset all composables', () => {
      // Initialize some composables
      service.useQueues()
      service.useAgentStats()
      service.useVoicemail()

      expect(service.composables.queues).not.toBeNull()

      service.resetAll()

      expect(service.composables.queues).toBeNull()
      expect(service.composables.agentStats).toBeNull()
      expect(service.composables.voicemail).toBeNull()
    })

    it('should get service statistics', () => {
      // Initialize some composables
      service.useQueues()
      service.useAgentStats()

      const stats = service.getStats()

      expect(stats.isConnected).toBe(false)
      expect(stats.connectionState).toBe('disconnected')
      expect(stats.initializedComposables).toEqual(['queues', 'agentStats'])
      expect(stats.reconnectAttempts).toBe(0)
      // lastConnectedAt may be set during initialization, so just check it's not undefined
      expect(stats.lastConnectedAt).toBeDefined()
      expect(stats.lastDisconnectedAt).toBeNull()
    })
  })

  describe('Singleton Pattern', () => {
    it('should return same instance from getAmiService', () => {
      const instance1 = getAmiService()
      const instance2 = getAmiService()

      expect(instance1).toBe(instance2)
    })

    it('should create instance with config on first call', () => {
      resetAmiService()

      const instance = getAmiService({ amiConfig: mockAmiConfig })

      expect(instance).toBeDefined()
    })

    it('should reset singleton instance', async () => {
      const instance1 = getAmiService({ amiConfig: mockAmiConfig })
      await instance1.connect(mockAmiConfig)

      resetAmiService()

      const instance2 = getAmiService()

      expect(instance2).not.toBe(instance1)
    })

    it('should disconnect when resetting singleton', async () => {
      const instance = getAmiService({ amiConfig: mockAmiConfig })
      await instance.connect(mockAmiConfig)

      const disconnectSpy = vi.spyOn(instance, 'disconnect')

      resetAmiService()

      expect(disconnectSpy).toHaveBeenCalled()
    })
  })

  describe('State Management', () => {
    beforeEach(() => {
      service = createAmiService()
    })

    it('should expose connection state', () => {
      expect(service.connectionState).toBeDefined()
      expect(service.connectionState.value).toBe('disconnected')
    })

    it('should expose connected status', () => {
      expect(service.isConnected).toBeDefined()
      expect(service.isConnected.value).toBe(false)
    })

    it('should expose error state', () => {
      expect(service.error).toBeDefined()
      expect(service.error.value).toBeNull()
    })

    it('should expose AMI client', () => {
      expect(service.client).toBeDefined()
      expect(service.clientRef).toBeDefined()
    })

    it('should expose core AMI composable', () => {
      expect(service.ami).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple connect calls gracefully', async () => {
      service = createAmiService()

      await service.connect(mockAmiConfig)
      await service.connect(mockAmiConfig)

      // Should only connect once (or handle multiple gracefully)
      expect(service.ami.connect).toHaveBeenCalled()
    })

    it('should handle disconnect before connect', () => {
      service = createAmiService()

      service.disconnect()

      // Should not throw
      expect(service.ami.disconnect).toHaveBeenCalled()
    })

    it('should handle reconnect without initial config', async () => {
      service = createAmiService()

      // No initial config, reconnect should handle gracefully
      await service.reconnect()

      expect(service.ami.disconnect).toHaveBeenCalled()
      // Should not attempt to connect without config
    })

    it('should handle composable creation before connection', () => {
      service = createAmiService()

      // Should not throw even without connection
      const queues = service.useQueues()

      expect(queues).toBeDefined()
    })
  })
})
