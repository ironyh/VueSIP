/**
 * useAmiSystem composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useAmiSystem } from '../useAmiSystem'
import type { AmiClient } from '@/core/AmiClient'

// Mock logger
const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))
vi.mock('@/utils/logger', () => ({
  createLogger: () => mockLogger,
  configureLogger: vi.fn(),
}))

// Create mock AMI client
function createMockClient(): AmiClient {
  return {
    isConnected: true,
    options: { host: 'localhost', port: 5038 },
    connectedAt: new Date(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    sendAction: vi.fn(),
    close: vi.fn(),
  } as unknown as AmiClient
}

describe('useAmiSystem', () => {
  let mockClient: AmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockClient()
  })

  describe('Initial state', () => {
    it('should initialize with null/empty values', () => {
      const clientRef = ref(mockClient)
      const { coreStatus, channels, modules, bridges, isLoading, error, latency } = useAmiSystem(
        clientRef,
        { autoRefresh: false }
      )

      expect(coreStatus.value).toBeNull()
      expect(channels.value).toBeInstanceOf(Map)
      expect(modules.value).toBeInstanceOf(Map)
      expect(bridges.value).toBeInstanceOf(Map)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(latency.value).toBeNull()
    })

    it('should have empty computed arrays initially', () => {
      const clientRef = ref(mockClient)
      const { channelList, moduleList, bridgeList, totalChannels, totalBridges } = useAmiSystem(
        clientRef,
        { autoRefresh: false }
      )

      expect(channelList.value).toEqual([])
      expect(moduleList.value).toEqual([])
      expect(bridgeList.value).toEqual([])
      expect(totalChannels.value).toBe(0)
      expect(totalBridges.value).toBe(0)
    })

    it('should have isHealthy false initially', () => {
      const clientRef = ref(mockClient)
      const { isHealthy } = useAmiSystem(clientRef, { autoRefresh: false })

      expect(isHealthy.value).toBe(false)
    })

    it('should return 0s formattedUptime when no core status', () => {
      const clientRef = ref(mockClient)
      const { formattedUptime } = useAmiSystem(clientRef, { autoRefresh: false })

      expect(formattedUptime.value).toBe('0s')
    })
  })

  describe('getCoreStatus', () => {
    it('should fetch and parse core status', async () => {
      const clientRef = ref(mockClient)
      const { getCoreStatus, coreStatus } = useAmiSystem(clientRef, { autoRefresh: false })

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          AsteriskVersion: '18.12.0',
          CoreUptime: '1 day, 2 hours, 30 minutes',
          CoreReloadCount: '42',
          CoreCurrentCalls: '5',
          CoreMaxCalls: '100',
        },
      })

      const result = await getCoreStatus()

      expect(result).toBeDefined()
      expect(result.asteriskVersion).toBe('18.12.0')
      expect(result.reloadCount).toBe(42)
      expect(result.currentCalls).toBe(5)
      expect(result.maxCalls).toBe(100)
      expect(coreStatus.value).toEqual(result)
    })

    it('should handle numeric uptime values', async () => {
      const clientRef = ref(mockClient)
      const { getCoreStatus } = useAmiSystem(clientRef, { autoRefresh: false })

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          AsteriskVersion: '18.12.0',
          CoreUptime: 90061,
          CoreReloadCount: '10',
          CoreCurrentCalls: '3',
          CoreMaxCalls: '50',
        },
      })

      const result = await getCoreStatus()
      expect(result.uptime).toBe(90061)
    })

    it('should set error on failure', async () => {
      const clientRef = ref(mockClient)
      const { getCoreStatus, error } = useAmiSystem(clientRef, { autoRefresh: false })

      mockClient.sendAction = vi.fn().mockRejectedValue(new Error('Connection refused'))

      await expect(getCoreStatus()).rejects.toThrow('Connection refused')
      // Error value is set to the original error message
      expect(error.value).toBe('Connection refused')
    })
  })

  describe('getChannels', () => {
    it('should fetch and parse active channels', async () => {
      const clientRef = ref(mockClient)
      const { getChannels, channelList, totalChannels } = useAmiSystem(clientRef, {
        autoRefresh: false,
      })

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          events: [
            {
              Event: 'CoreShowChannel',
              Channel: 'PJSIP/1001-00001',
              Uniqueid: '1234567890.1',
              StateDesc: 'Up',
              State: '6',
              Application: 'PJSIP',
              ApplicationData: 'test',
              CallerIDNum: '1001',
              CallerIDName: 'Test User',
              Duration: '00:05:30',
            },
          ],
        },
      })

      const result = await getChannels()

      expect(result).toHaveLength(1)
      expect(channelList.value).toHaveLength(1)
      expect(totalChannels.value).toBe(1)
      expect(channelList.value[0].channel).toBe('PJSIP/1001-00001')
      expect(channelList.value[0].state).toBe('Up')
      expect(channelList.value[0].callerIdNum).toBe('1001')
    })

    it('should handle empty channels', async () => {
      const clientRef = ref(mockClient)
      const { getChannels, channelList } = useAmiSystem(clientRef, { autoRefresh: false })

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { events: [] },
      })

      const result = await getChannels()
      expect(result).toEqual([])
      expect(channelList.value).toEqual([])
    })
  })

  describe('getBridges', () => {
    it('should fetch and parse active bridges', async () => {
      const clientRef = ref(mockClient)
      const { getBridges, bridgeList, totalBridges } = useAmiSystem(clientRef, {
        autoRefresh: false,
      })

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          events: [
            {
              Event: 'BridgeListItem',
              BridgeUniqueid: 'bridge-001',
              BridgeType: 'mixing',
              BridgeTechnology: 'simple_bridge',
              BridgeNumChannels: '2',
              BridgeName: 'test-bridge',
            },
          ],
        },
      })

      const result = await getBridges()

      expect(result).toHaveLength(1)
      expect(bridgeList.value).toHaveLength(1)
      expect(totalBridges.value).toBe(1)
      expect(bridgeList.value[0].bridgeId).toBe('bridge-001')
      expect(bridgeList.value[0].bridgeType).toBe('mixing')
      expect(bridgeList.value[0].channelCount).toBe(2)
    })
  })

  describe('ping', () => {
    it('should measure latency correctly', async () => {
      const clientRef = ref(mockClient)
      const { ping, latency } = useAmiSystem(clientRef, { autoRefresh: false })

      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const elapsed = await ping()

      expect(typeof elapsed).toBe('number')
      expect(elapsed).toBeGreaterThanOrEqual(0)
      expect(latency.value).toBe(elapsed)
    })
  })

  describe('module operations', () => {
    it('should reload module successfully', async () => {
      const clientRef = ref(mockClient)
      const { reloadModule } = useAmiSystem(clientRef, { autoRefresh: false })

      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const result = await reloadModule('res_pjsip.so')

      expect(result).toBe(true)
    })

    it('should return false on module operation failure', async () => {
      const clientRef = ref(mockClient)
      const { reloadModule } = useAmiSystem(clientRef, { autoRefresh: false })

      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Error' } })

      const result = await reloadModule('bad_module.so')

      expect(result).toBe(false)
    })
  })

  describe('originate', () => {
    it('should originate call with application', async () => {
      const clientRef = ref(mockClient)
      const { originate } = useAmiSystem(clientRef, { autoRefresh: false })

      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const result = await originate({
        channel: 'PJSIP/1001',
        application: 'Playback',
        data: 'demo-congrats',
        callerId: 'System',
      })

      expect(result).toBe(true)
    })

    it('should originate call with extension', async () => {
      const clientRef = ref(mockClient)
      const { originate } = useAmiSystem(clientRef, { autoRefresh: false })

      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const result = await originate({
        channel: 'PJSIP/1001',
        context: 'default',
        extension: '1002',
        priority: 1,
      })

      expect(result).toBe(true)
    })
  })

  describe('hangupChannel', () => {
    it('should hangup channel successfully', async () => {
      const clientRef = ref(mockClient)
      const { hangupChannel, channels } = useAmiSystem(clientRef, { autoRefresh: false })

      channels.value.set('PJSIP/1001-00001', {
        channel: 'PJSIP/1001-00001',
        uniqueId: '123',
        state: 'Up',
        stateCode: 6,
        application: '',
        data: '',
        callerIdNum: '1001',
        callerIdName: '',
        duration: 0,
      })

      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const result = await hangupChannel('PJSIP/1001-00001')

      expect(result).toBe(true)
      expect(channels.value.has('PJSIP/1001-00001')).toBe(false)
    })

    it('should return false on hangup failure', async () => {
      const clientRef = ref(mockClient)
      const { hangupChannel } = useAmiSystem(clientRef, { autoRefresh: false })

      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Error' } })

      const result = await hangupChannel('PJSIP/1001-00001')

      expect(result).toBe(false)
    })
  })

  describe('getChannel', () => {
    it('should return channel by name', () => {
      const clientRef = ref(mockClient)
      const { getChannel, channels } = useAmiSystem(clientRef, { autoRefresh: false })

      const testChannel = {
        channel: 'PJSIP/1001-00001',
        uniqueId: '123',
        state: 'Up',
        stateCode: 6,
        application: '',
        data: '',
        callerIdNum: '1001',
        callerIdName: '',
        duration: 0,
      }
      channels.value.set('PJSIP/1001-00001', testChannel)

      const result = getChannel('PJSIP/1001-00001')

      expect(result).toEqual(testChannel)
    })

    it('should return undefined for non-existent channel', () => {
      const clientRef = ref(mockClient)
      const { getChannel } = useAmiSystem(clientRef, { autoRefresh: false })

      const result = getChannel('NonExistent')

      expect(result).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('should throw when AMI client is null', async () => {
      const clientRef = ref(null as unknown as AmiClient)
      const { getCoreStatus } = useAmiSystem(clientRef, { autoRefresh: false })

      await expect(getCoreStatus()).rejects.toThrow('AMI client not connected')
    })
  })
})
