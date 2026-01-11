/**
 * @file useAmiSystem.test.ts
 * @description Tests for useAmiSystem composable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiSystem } from '@/composables/useAmiSystem'
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

describe('useAmiSystem', () => {
  let mockClient: AmiClient
  let clientRef: ReturnType<typeof ref<AmiClient | null>>

  beforeEach(() => {
    vi.useFakeTimers()
    mockClient = {
      send: vi.fn(),
      sendAction: vi.fn().mockResolvedValue({ data: { Response: 'Success' } }),
      on: vi.fn(),
      off: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
    } as unknown as AmiClient
    clientRef = ref<AmiClient | null>(null)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { coreStatus, channels, modules, bridges, isLoading, error, latency } = useAmiSystem(
        clientRef,
        { autoRefresh: false }
      )

      expect(coreStatus.value).toBeNull()
      expect(channels.value.size).toBe(0)
      expect(modules.value.size).toBe(0)
      expect(bridges.value.size).toBe(0)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(latency.value).toBeNull()
    })

    it('should return computed properties', () => {
      const { channelList, moduleList, bridgeList, formattedUptime, isHealthy, totalChannels } =
        useAmiSystem(clientRef, { autoRefresh: false })

      expect(channelList.value).toEqual([])
      expect(moduleList.value).toEqual([])
      expect(bridgeList.value).toEqual([])
      expect(formattedUptime.value).toBe('0s')
      expect(isHealthy.value).toBe(false)
      expect(totalChannels.value).toBe(0)
    })
  })

  describe('getCoreStatus', () => {
    it('should fetch and parse core status', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          AsteriskVersion: '18.12.0',
          CoreUptime: '3600',
          CoreReloadCount: '5',
          CoreCurrentCalls: '10',
          CoreMaxCalls: '100',
          CoreReloadDate: '2025-01-10',
          CoreReloadTime: '12:00:00',
          CoreStartupDate: '2025-01-01',
          CoreStartupTime: '00:00:00',
        },
      })

      const { getCoreStatus, coreStatus } = useAmiSystem(ref(mockClient), { autoRefresh: false })
      await getCoreStatus()

      expect(coreStatus.value).not.toBeNull()
      expect(coreStatus.value?.asteriskVersion).toBe('18.12.0')
      expect(coreStatus.value?.uptime).toBe(3600)
      expect(coreStatus.value?.reloadCount).toBe(5)
      expect(coreStatus.value?.currentCalls).toBe(10)
      expect(coreStatus.value?.maxCalls).toBe(100)
    })

    it('should parse uptime in HH:MM:SS format', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          AsteriskVersion: '18.12.0',
          CoreUptime: '01:30:45', // 1 hour, 30 minutes, 45 seconds
        },
      })

      const { getCoreStatus, coreStatus } = useAmiSystem(ref(mockClient), { autoRefresh: false })
      await getCoreStatus()

      expect(coreStatus.value?.uptime).toBe(5445) // 1*3600 + 30*60 + 45
    })

    it('should call onStatusUpdate callback', async () => {
      const onStatusUpdate = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          AsteriskVersion: '18.12.0',
          CoreUptime: '3600',
        },
      })

      const { getCoreStatus } = useAmiSystem(ref(mockClient), {
        autoRefresh: false,
        onStatusUpdate,
      })
      await getCoreStatus()

      expect(onStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          asteriskVersion: '18.12.0',
          uptime: 3600,
        })
      )
    })

    it('should handle errors', async () => {
      mockClient.sendAction = vi.fn().mockRejectedValue(new Error('Connection failed'))

      const { getCoreStatus, error } = useAmiSystem(ref(mockClient), { autoRefresh: false })

      await expect(getCoreStatus()).rejects.toThrow('Connection failed')
      expect(error.value).toBe('Connection failed')
    })
  })

  describe('getChannels', () => {
    it('should fetch and parse channels', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [
            {
              Event: 'CoreShowChannel',
              Channel: 'PJSIP/1001-00000001',
              Uniqueid: '1234567890.1',
              State: '6',
              StateDesc: 'Up',
              Application: 'Dial',
              ApplicationData: 'PJSIP/1002',
              CallerIDNum: '1001',
              CallerIDName: 'John Doe',
              ConnectedLineNum: '1002',
              ConnectedLineName: 'Jane Doe',
              Duration: '00:05:30',
              BridgeId: 'bridge-123',
            },
            {
              Event: 'CoreShowChannel',
              Channel: 'PJSIP/1002-00000002',
              Uniqueid: '1234567890.2',
              State: '6',
              StateDesc: 'Up',
              Application: 'Dial',
              Duration: '00:05:30',
            },
          ],
        },
      })

      const { getChannels, channelList, totalChannels } = useAmiSystem(ref(mockClient), {
        autoRefresh: false,
      })
      await getChannels()

      expect(channelList.value).toHaveLength(2)
      expect(totalChannels.value).toBe(2)

      const channel = channelList.value[0]
      expect(channel.channel).toBe('PJSIP/1001-00000001')
      expect(channel.callerIdNum).toBe('1001')
      expect(channel.callerIdName).toBe('John Doe')
      expect(channel.duration).toBe(330) // 5*60 + 30
      expect(channel.bridgeId).toBe('bridge-123')
    })

    it('should call onChannelsUpdate callback', async () => {
      const onChannelsUpdate = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [
            {
              Event: 'CoreShowChannel',
              Channel: 'PJSIP/1001-00000001',
              Uniqueid: '1234567890.1',
              State: 'Up',
            },
          ],
        },
      })

      const { getChannels } = useAmiSystem(ref(mockClient), {
        autoRefresh: false,
        onChannelsUpdate,
      })
      await getChannels()

      expect(onChannelsUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            channel: 'PJSIP/1001-00000001',
          }),
        ])
      )
    })

    it('should clear previous channels on refresh', async () => {
      const { getChannels, channels } = useAmiSystem(ref(mockClient), { autoRefresh: false })

      // First call
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [
            { Event: 'CoreShowChannel', Channel: 'PJSIP/1001', Uniqueid: '1' },
            { Event: 'CoreShowChannel', Channel: 'PJSIP/1002', Uniqueid: '2' },
          ],
        },
      })
      await getChannels()
      expect(channels.value.size).toBe(2)

      // Second call - should replace
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [{ Event: 'CoreShowChannel', Channel: 'PJSIP/1003', Uniqueid: '3' }],
        },
      })
      await getChannels()
      expect(channels.value.size).toBe(1)
      expect(channels.value.has('PJSIP/1003')).toBe(true)
    })
  })

  describe('getBridges', () => {
    it('should fetch and parse bridges', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [
            {
              Event: 'BridgeListItem',
              BridgeUniqueid: 'bridge-001',
              BridgeType: 'basic',
              BridgeTechnology: 'simple_bridge',
              BridgeNumChannels: '2',
              BridgeName: 'Conference Room 1',
            },
            {
              Event: 'BridgeListItem',
              BridgeUniqueid: 'bridge-002',
              BridgeType: 'holding',
              BridgeTechnology: 'holding_bridge',
              BridgeNumChannels: '1',
            },
          ],
        },
      })

      const { getBridges, bridgeList, totalBridges } = useAmiSystem(ref(mockClient), {
        autoRefresh: false,
      })
      await getBridges()

      expect(bridgeList.value).toHaveLength(2)
      expect(totalBridges.value).toBe(2)

      const bridge = bridgeList.value[0]
      expect(bridge.bridgeId).toBe('bridge-001')
      expect(bridge.bridgeType).toBe('basic')
      expect(bridge.channelCount).toBe(2)
      expect(bridge.name).toBe('Conference Room 1')
    })
  })

  describe('getModules', () => {
    it('should fetch and parse modules', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [
            {
              Event: 'ModuleCheck',
              Module: 'res_pjsip.so',
              Description: 'PJSIP Support',
              Status: 'Running',
              UseCount: '10',
              SupportLevel: 'core',
            },
            {
              Event: 'ModuleCheck',
              Module: 'chan_sip.so',
              Description: 'Legacy SIP Channel',
              Status: 'Stopped',
              UseCount: '0',
              SupportLevel: 'deprecated',
            },
          ],
        },
      })

      const { getModules, moduleList } = useAmiSystem(ref(mockClient), { autoRefresh: false })
      await getModules()

      expect(moduleList.value).toHaveLength(2)

      const pjsipModule = moduleList.value.find((m) => m.module === 'res_pjsip.so')
      expect(pjsipModule).toBeDefined()
      expect(pjsipModule?.status).toBe('Running')
      expect(pjsipModule?.useCount).toBe(10)
      expect(pjsipModule?.supportLevel).toBe('core')

      const sipModule = moduleList.value.find((m) => m.module === 'chan_sip.so')
      expect(sipModule?.status).toBe('Stopped')
      expect(sipModule?.supportLevel).toBe('deprecated')
    })
  })

  describe('module management', () => {
    it('should reload a module', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { reloadModule } = useAmiSystem(ref(mockClient), { autoRefresh: false })
      const result = await reloadModule('res_pjsip.so')

      expect(result).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'ModuleLoad',
        Module: 'res_pjsip.so',
        LoadType: 'Reload',
      })
    })

    it('should load a module', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { loadModule } = useAmiSystem(ref(mockClient), { autoRefresh: false })
      const result = await loadModule('res_pjsip.so')

      expect(result).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'ModuleLoad',
        Module: 'res_pjsip.so',
        LoadType: 'Load',
      })
    })

    it('should unload a module', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { unloadModule } = useAmiSystem(ref(mockClient), { autoRefresh: false })
      const result = await unloadModule('chan_sip.so')

      expect(result).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'ModuleLoad',
        Module: 'chan_sip.so',
        LoadType: 'Unload',
      })
    })

    it('should return false on module operation failure', async () => {
      mockClient.sendAction = vi.fn().mockRejectedValue(new Error('Module not found'))

      const { reloadModule } = useAmiSystem(ref(mockClient), { autoRefresh: false })
      const result = await reloadModule('nonexistent.so')

      expect(result).toBe(false)
    })
  })

  describe('ping', () => {
    it('should measure latency', async () => {
      mockClient.sendAction = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return { data: { Response: 'Pong' } }
      })

      const { ping, latency } = useAmiSystem(ref(mockClient), { autoRefresh: false })

      vi.useRealTimers()
      const result = await ping()
      vi.useFakeTimers()

      expect(result).toBeGreaterThanOrEqual(0)
      expect(latency.value).toBe(result)
    })

    it('should throw on ping failure', async () => {
      mockClient.sendAction = vi.fn().mockRejectedValue(new Error('Connection lost'))

      const { ping } = useAmiSystem(ref(mockClient), { autoRefresh: false })

      await expect(ping()).rejects.toThrow('Connection lost')
    })
  })

  describe('originate', () => {
    it('should originate a call with context/extension', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { originate } = useAmiSystem(ref(mockClient), { autoRefresh: false })
      const result = await originate({
        channel: 'PJSIP/1001',
        context: 'default',
        extension: '1002',
        priority: 1,
        callerId: '1001 <1001>',
        timeout: 30,
      })

      expect(result).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'Originate',
          Channel: 'PJSIP/1001',
          Context: 'default',
          Exten: '1002',
          Priority: '1',
          CallerID: '1001 <1001>',
          Timeout: '30000',
          Async: 'yes',
        })
      )
    })

    it('should originate a call with application', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { originate } = useAmiSystem(ref(mockClient), { autoRefresh: false })
      const result = await originate({
        channel: 'PJSIP/1001',
        context: 'ignored',
        extension: 'ignored',
        application: 'Playback',
        data: 'hello-world',
      })

      expect(result).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'Originate',
          Channel: 'PJSIP/1001',
          Application: 'Playback',
          Data: 'hello-world',
        })
      )
    })

    it('should include variables in originate', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { originate } = useAmiSystem(ref(mockClient), { autoRefresh: false })
      await originate({
        channel: 'PJSIP/1001',
        context: 'default',
        extension: '1002',
        variables: {
          CUSTOM_VAR: 'value1',
          ANOTHER_VAR: 'value2',
        },
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Variable: 'CUSTOM_VAR=value1,ANOTHER_VAR=value2',
        })
      )
    })
  })

  describe('hangupChannel', () => {
    it('should hangup a channel and remove from map', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { hangupChannel, channels } = useAmiSystem(ref(mockClient), { autoRefresh: false })

      // Pre-populate channel
      channels.value.set('PJSIP/1001-00000001', {
        channel: 'PJSIP/1001-00000001',
        uniqueId: '123',
        state: 'Up',
        stateCode: 6,
        application: 'Dial',
        data: '',
        callerIdNum: '1001',
        callerIdName: 'Test',
        connectedLineNum: '',
        connectedLineName: '',
        duration: 0,
      })

      const result = await hangupChannel('PJSIP/1001-00000001')

      expect(result).toBe(true)
      expect(channels.value.has('PJSIP/1001-00000001')).toBe(false)
    })
  })

  describe('utility methods', () => {
    it('should get a channel by name', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [
            {
              Event: 'CoreShowChannel',
              Channel: 'PJSIP/1001-00000001',
              Uniqueid: '1',
              State: 'Up',
              CallerIDNum: '1001',
            },
          ],
        },
      })

      const { getChannels, getChannel } = useAmiSystem(ref(mockClient), { autoRefresh: false })
      await getChannels()

      const channel = getChannel('PJSIP/1001-00000001')
      expect(channel).toBeDefined()
      expect(channel?.callerIdNum).toBe('1001')

      const notFound = getChannel('PJSIP/9999')
      expect(notFound).toBeUndefined()
    })
  })

  describe('computed properties', () => {
    it('should format uptime correctly', async () => {
      mockClient.sendAction = vi.fn()

      const { coreStatus, formattedUptime } = useAmiSystem(ref(mockClient), { autoRefresh: false })

      // Minutes only
      coreStatus.value = { uptime: 125 } as never // 2m 5s
      expect(formattedUptime.value).toBe('2m 5s')

      // Hours and minutes
      coreStatus.value = { uptime: 7245 } as never // 2h 0m 45s
      expect(formattedUptime.value).toBe('2h 0m')

      // Days, hours, minutes
      coreStatus.value = { uptime: 90000 } as never // 1d 1h
      expect(formattedUptime.value).toBe('1d 1h 0m')
    })

    it('should determine health status', async () => {
      const { coreStatus, isHealthy } = useAmiSystem(clientRef, { autoRefresh: false })

      expect(isHealthy.value).toBe(false)

      coreStatus.value = {
        asteriskVersion: '18.0.0',
        uptime: 3600,
      } as never
      expect(isHealthy.value).toBe(true)

      coreStatus.value = {
        asteriskVersion: '18.0.0',
        uptime: 0,
      } as never
      expect(isHealthy.value).toBe(false)
    })
  })

  describe('polling', () => {
    it('should start polling on client connection', async () => {
      const { coreStatus, startPolling, stopPolling } = useAmiSystem(clientRef, {
        autoRefresh: false,
        enablePolling: false,
        statusPollInterval: 1000,
      })

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          AsteriskVersion: '18.0.0',
          CoreUptime: '3600',
        },
      })

      startPolling()
      expect(coreStatus.value).toBeNull()

      clientRef.value = mockClient
      await nextTick()

      // Advance timer
      vi.advanceTimersByTime(1000)
      await nextTick()

      // Should have polled
      expect(mockClient.sendAction).toHaveBeenCalledWith({ Action: 'CoreStatus' })

      stopPolling()
    })

    it('should stop polling on unmount', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { stopPolling } = useAmiSystem(ref(mockClient), {
        autoRefresh: false,
        enablePolling: true,
        statusPollInterval: 1000,
      })

      // Manually stop
      stopPolling()

      // Advance timer
      vi.advanceTimersByTime(2000)
      await nextTick()

      // Should not have made additional calls after stop
      const callCount = (mockClient.sendAction as ReturnType<typeof vi.fn>).mock.calls.length
      vi.advanceTimersByTime(5000)
      await nextTick()

      expect((mockClient.sendAction as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount)
    })
  })

  describe('refresh', () => {
    it('should refresh all data', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [],
        },
      })

      const { refresh } = useAmiSystem(ref(mockClient), { autoRefresh: false })
      await refresh()

      // Should call CoreStatus, CoreShowChannels, and BridgeList
      expect(mockClient.sendAction).toHaveBeenCalledWith({ Action: 'CoreStatus' })
      expect(mockClient.sendAction).toHaveBeenCalledWith({ Action: 'CoreShowChannels' })
      expect(mockClient.sendAction).toHaveBeenCalledWith({ Action: 'BridgeList' })
    })
  })

  describe('error handling', () => {
    it('should handle no client', async () => {
      const { getCoreStatus } = useAmiSystem(clientRef, { autoRefresh: false })

      await expect(getCoreStatus()).rejects.toThrow('AMI client not connected')
    })

    it('should set error state on failure', async () => {
      mockClient.sendAction = vi.fn().mockRejectedValue(new Error('Network error'))

      const { getChannels, error } = useAmiSystem(ref(mockClient), { autoRefresh: false })

      await expect(getChannels()).rejects.toThrow()
      expect(error.value).toBe('Network error')
    })
  })
})
