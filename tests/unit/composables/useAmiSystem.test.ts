/**
 * useAmiSystem composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useAmiSystem } from '@/composables/useAmiSystem'
import type { AmiClient } from '@/core/AmiClient'
import { createMockAmiClient, type MockAmiClient } from '../utils/mockFactories'

describe('useAmiSystem', () => {
  let mockClient: MockAmiClient
  let clientRef: ReturnType<typeof ref<AmiClient | null>>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockClient = createMockAmiClient()
    clientRef = ref(mockClient as unknown as AmiClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have null core status initially', () => {
      const { coreStatus } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(coreStatus.value).toBeNull()
    })

    it('should have empty channels initially', () => {
      const { channels } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(channels.value.size).toBe(0)
    })

    it('should have empty modules initially', () => {
      const { modules } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(modules.value.size).toBe(0)
    })

    it('should have empty bridges initially', () => {
      const { bridges } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(bridges.value.size).toBe(0)
    })

    it('should have no error initially', () => {
      const { error } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(error.value).toBeNull()
    })

    it('should not be loading initially', () => {
      const { isLoading } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(isLoading.value).toBe(false)
    })

    it('should have null latency initially', () => {
      const { latency } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(latency.value).toBeNull()
    })
  })

  describe('computed values', () => {
    it('should return empty channel list', () => {
      const { channelList } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(channelList.value).toHaveLength(0)
    })

    it('should return empty module list', () => {
      const { moduleList } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(moduleList.value).toHaveLength(0)
    })

    it('should return empty bridge list', () => {
      const { bridgeList } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(bridgeList.value).toHaveLength(0)
    })

    it('should return zero total channels', () => {
      const { totalChannels } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(totalChannels.value).toBe(0)
    })

    it('should return zero total bridges', () => {
      const { totalBridges } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(totalBridges.value).toBe(0)
    })

    it('should not be healthy when core status is null', () => {
      const { isHealthy } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(isHealthy.value).toBe(false)
    })

    it('should return 0s formatted uptime when no core status', () => {
      const { formattedUptime } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(formattedUptime.value).toBe('0s')
    })
  })

  describe('getCoreStatus', () => {
    it('should throw if client is not available', async () => {
      clientRef.value = null
      const { getCoreStatus } = useAmiSystem(clientRef, { autoRefresh: false })

      await expect(getCoreStatus()).rejects.toThrow('AMI client not connected')
    })

    it('should call sendAction with CoreStatus', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { getCoreStatus } = useAmiSystem(clientRef, { autoRefresh: false })

      await getCoreStatus()

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({ Action: 'CoreStatus' })
      )
    })
  })

  describe('getChannels', () => {
    it('should throw if client is not available', async () => {
      clientRef.value = null
      const { getChannels } = useAmiSystem(clientRef, { autoRefresh: false })

      await expect(getChannels()).rejects.toThrow('AMI client not connected')
    })

    it('should call sendAction with CoreShowChannels', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { getChannels } = useAmiSystem(clientRef, { autoRefresh: false })

      await getChannels()

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({ Action: 'CoreShowChannels' })
      )
    })
  })

  describe('getModules', () => {
    it('should throw if client is not available', async () => {
      clientRef.value = null
      const { getModules } = useAmiSystem(clientRef, { autoRefresh: false })

      await expect(getModules()).rejects.toThrow('AMI client not connected')
    })

    it('should call sendAction with ModuleLoadList', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { getModules } = useAmiSystem(clientRef, { autoRefresh: false })

      await getModules()

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({ Action: 'ModuleCheck' })
      )
    })
  })

  describe('getBridges', () => {
    it('should throw if client is not available', async () => {
      clientRef.value = null
      const { getBridges } = useAmiSystem(clientRef, { autoRefresh: false })

      await expect(getBridges()).rejects.toThrow('AMI client not connected')
    })

    it('should call sendAction with BridgeList', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { getBridges } = useAmiSystem(clientRef, { autoRefresh: false })

      await getBridges()

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({ Action: 'BridgeList' })
      )
    })
  })

  describe('ping', () => {
    it('should throw if client is not available', async () => {
      clientRef.value = null
      const { ping } = useAmiSystem(clientRef, { autoRefresh: false })

      await expect(ping()).rejects.toThrow('AMI client not connected')
    })

    it('should return latency on success', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { ping } = useAmiSystem(clientRef, { autoRefresh: false })

      vi.advanceTimersByTime(10)
      const result = await ping()

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({ Action: 'Ping' })
      )
      expect(typeof result).toBe('number')
    })
  })

  describe('getChannel', () => {
    it('should return undefined for non-existent channel', () => {
      const { getChannel } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(getChannel('non-existent')).toBeUndefined()
    })
  })

  describe('hangupChannel', () => {
    it('should return false if client is not available', async () => {
      clientRef.value = null
      const { hangupChannel } = useAmiSystem(clientRef, { autoRefresh: false })

      const result = await hangupChannel('PJSIP/1001-00000001')
      expect(result).toBe(false)
    })

    it('should send hangup action', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { hangupChannel } = useAmiSystem(clientRef, { autoRefresh: false })

      const result = await hangupChannel('PJSIP/1001-00000001')

      expect(result).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'Hangup',
          Channel: 'PJSIP/1001-00000001',
        })
      )
    })
  })

  describe('reloadModule', () => {
    it('should return false if client is not available', async () => {
      clientRef.value = null
      const { reloadModule } = useAmiSystem(clientRef, { autoRefresh: false })

      const result = await reloadModule('res_pjsip.so')
      expect(result).toBe(false)
    })

    it('should send module reload action', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { reloadModule } = useAmiSystem(clientRef, { autoRefresh: false })

      const result = await reloadModule('res_pjsip.so')

      expect(result).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'ModuleLoad',
          Module: 'res_pjsip.so',
          LoadType: 'Reload',
        })
      )
    })
  })

  describe('loadModule', () => {
    it('should send module load action', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { loadModule } = useAmiSystem(clientRef, { autoRefresh: false })

      const result = await loadModule('res_pjsip.so')

      expect(result).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'ModuleLoad',
          Module: 'res_pjsip.so',
          LoadType: 'Load',
        })
      )
    })
  })

  describe('unloadModule', () => {
    it('should send module unload action', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { unloadModule } = useAmiSystem(clientRef, { autoRefresh: false })

      const result = await unloadModule('res_pjsip.so')

      expect(result).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'ModuleLoad',
          Module: 'res_pjsip.so',
          LoadType: 'Unload',
        })
      )
    })
  })

  describe('refresh', () => {
    it('should call multiple actions', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { refresh } = useAmiSystem(clientRef, { autoRefresh: false })

      await refresh()

      expect(mockClient.sendAction).toHaveBeenCalled()
    })
  })

  describe('polling', () => {
    it('should have startPolling function', () => {
      const { startPolling } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(startPolling).toBeDefined()
      expect(typeof startPolling).toBe('function')
    })

    it('should have stopPolling function', () => {
      const { stopPolling } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(stopPolling).toBeDefined()
      expect(typeof stopPolling).toBe('function')
    })
  })

  describe('originate', () => {
    it('should have originate function', () => {
      const { originate } = useAmiSystem(clientRef, { autoRefresh: false })
      expect(originate).toBeDefined()
      expect(typeof originate).toBe('function')
    })

    it('should send originate action with required parameters', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { originate } = useAmiSystem(clientRef, { autoRefresh: false })

      const result = await originate({
        channel: 'PJSIP/1001',
        extension: '1002',
        context: 'default',
      })

      expect(result).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'Originate',
          Channel: 'PJSIP/1001',
          Exten: '1002',
          Context: 'default',
        })
      )
    })
  })
})
