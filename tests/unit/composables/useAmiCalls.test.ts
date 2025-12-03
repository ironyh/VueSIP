/**
 * useAmiCalls composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAmiCalls } from '@/composables/useAmiCalls'
import { ChannelState } from '@/types/ami.types'
import type { AmiClient } from '@/core/AmiClient'
import type { ChannelInfo, AmiMessage, AmiNewChannelEvent, AmiHangupEvent, AmiNewStateEvent } from '@/types/ami.types'

// Store event handlers for simulation
const eventHandlers: Record<string, Function[]> = {}

// Create mock AMI client
const createMockClient = (): AmiClient => {
  // Reset handlers
  Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])

  return {
    getChannels: vi.fn().mockResolvedValue([]),
    originate: vi.fn().mockResolvedValue({ success: true, uniqueId: 'test-unique-id' }),
    hangupChannel: vi.fn().mockResolvedValue(undefined),
    redirectChannel: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    }),
    off: vi.fn((event: string, handler: Function) => {
      if (eventHandlers[event]) {
        eventHandlers[event] = eventHandlers[event].filter(h => h !== handler)
      }
    }),
  } as unknown as AmiClient
}

// Helper to trigger client events
function triggerClientEvent(event: string, ...args: unknown[]) {
  eventHandlers[event]?.forEach(handler => handler(...args))
}

describe('useAmiCalls', () => {
  let mockClient: AmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])
    mockClient = createMockClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have empty calls initially', () => {
      const { calls, callList, callCount } = useAmiCalls(mockClient)

      expect(calls.value.size).toBe(0)
      expect(callList.value).toEqual([])
      expect(callCount.value).toBe(0)
    })

    it('should have loading as false initially', () => {
      const { loading } = useAmiCalls(mockClient)

      expect(loading.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useAmiCalls(mockClient)

      expect(error.value).toBeNull()
    })

    it('should have null lastRefresh initially', () => {
      const { lastRefresh } = useAmiCalls(mockClient)

      expect(lastRefresh.value).toBeNull()
    })

    it('should handle null client gracefully', () => {
      const { calls, error, refresh: _refresh } = useAmiCalls(null)

      expect(calls.value.size).toBe(0)
      expect(error.value).toBeNull()
    })
  })

  describe('refresh', () => {
    it('should refresh channel list', async () => {
      const mockChannels: ChannelInfo[] = [
        {
          channel: 'SIP/1000-00000001',
          state: ChannelState.Up,
          channelState: ChannelState.Up,
          stateDesc: 'Up',
          channelStateDesc: 'Up',
          callerIdNum: '1000',
          callerIdName: 'Test User',
          connectedLineNum: '2000',
          connectedLineName: 'Other User',
          accountCode: '',
          context: 'from-internal',
          exten: '2000',
          priority: 1,
          uniqueId: '1234567890.1',
          linkedId: '1234567890.1',
          application: 'Dial',
          applicationData: 'SIP/2000',
          duration: '00:01:30',
          bridgeId: '',
          serverId: 1,
          createdAt: new Date(),
        },
      ]

      ;(mockClient.getChannels as ReturnType<typeof vi.fn>).mockResolvedValue(mockChannels)

      const { refresh, calls, callList, loading, lastRefresh } = useAmiCalls(mockClient)

      expect(loading.value).toBe(false)

      const refreshPromise = refresh()

      expect(loading.value).toBe(true)

      await refreshPromise

      expect(loading.value).toBe(false)
      expect(calls.value.size).toBe(1)
      expect(callList.value[0].channel).toBe('SIP/1000-00000001')
      expect(callList.value[0].callerIdNum).toBe('1000')
      expect(callList.value[0].duration).toBe(90) // 1 min 30 sec
      expect(lastRefresh.value).toBeInstanceOf(Date)
    })

    it('should set error when client is null', async () => {
      const { refresh, error } = useAmiCalls(null)

      await refresh()

      expect(error.value).toBe('AMI client not connected')
    })

    it('should handle refresh errors', async () => {
      ;(mockClient.getChannels as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const { refresh, error, loading } = useAmiCalls(mockClient)

      await refresh()

      expect(error.value).toBe('Network error')
      expect(loading.value).toBe(false)
    })

    it('should apply channel filter', async () => {
      const mockChannels: ChannelInfo[] = [
        {
          channel: 'SIP/1000-00000001',
          state: ChannelState.Up,
          channelState: ChannelState.Up,
          stateDesc: 'Up',
          channelStateDesc: 'Up',
          callerIdNum: '1000',
          callerIdName: 'Test',
          connectedLineNum: '',
          connectedLineName: '',
          accountCode: '',
          context: 'from-internal',
          exten: '',
          priority: 1,
          uniqueId: '1',
          linkedId: '1',
          application: '',
          applicationData: '',
          duration: 0,
          bridgeId: '',
          serverId: 1,
          createdAt: new Date(),
        },
        {
          channel: 'Local/1000@context-00000001',
          state: ChannelState.Up,
          channelState: ChannelState.Up,
          stateDesc: 'Up',
          channelStateDesc: 'Up',
          callerIdNum: '',
          callerIdName: '',
          connectedLineNum: '',
          connectedLineName: '',
          accountCode: '',
          context: 'from-internal',
          exten: '',
          priority: 1,
          uniqueId: '2',
          linkedId: '2',
          application: '',
          applicationData: '',
          duration: 0,
          bridgeId: '',
          serverId: 1,
          createdAt: new Date(),
        },
      ]

      ;(mockClient.getChannels as ReturnType<typeof vi.fn>).mockResolvedValue(mockChannels)

      const { refresh, calls } = useAmiCalls(mockClient, {
        channelFilter: (ch) => ch.channel.startsWith('SIP/'),
      })

      await refresh()

      expect(calls.value.size).toBe(1)
      expect(Array.from(calls.value.values())[0].channel).toBe('SIP/1000-00000001')
    })
  })

  describe('clickToCall', () => {
    it('should make click-to-call with agent-first flow', async () => {
      const { clickToCall } = useAmiCalls(mockClient, { agentFirst: true })

      const result = await clickToCall('SIP/1000', '18005551234')

      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'SIP/1000',
          application: 'Dial',
          data: expect.stringContaining('18005551234'),
          async: true,
        })
      )
      expect(result.success).toBe(true)
    })

    it('should make click-to-call with destination-first flow', async () => {
      const { clickToCall } = useAmiCalls(mockClient, { agentFirst: false })

      const result = await clickToCall('SIP/1000', '18005551234')

      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: '18005551234',
          exten: '1000',
          context: 'from-internal',
          async: true,
        })
      )
      expect(result.success).toBe(true)
    })

    it('should pass caller ID options', async () => {
      const { clickToCall } = useAmiCalls(mockClient)

      await clickToCall('SIP/1000', '18005551234', {
        callerId: 'Sales <1000>',
      })

      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          callerId: 'Sales <1000>',
        })
      )
    })

    it('should throw when client is null', async () => {
      const { clickToCall } = useAmiCalls(null)

      await expect(clickToCall('SIP/1000', '18005551234')).rejects.toThrow('AMI client not connected')
    })
  })

  describe('originate', () => {
    it('should originate a call', async () => {
      const { originate } = useAmiCalls(mockClient)

      const result = await originate({
        channel: 'SIP/1000',
        exten: '2000',
        context: 'from-internal',
        priority: 1,
      })

      expect(mockClient.originate).toHaveBeenCalledWith({
        channel: 'SIP/1000',
        exten: '2000',
        context: 'from-internal',
        priority: 1,
      })
      expect(result.success).toBe(true)
    })

    it('should throw when client is null', async () => {
      const { originate } = useAmiCalls(null)

      await expect(originate({
        channel: 'SIP/1000',
        exten: '2000',
        context: 'from-internal',
        priority: 1,
      })).rejects.toThrow('AMI client not connected')
    })
  })

  describe('hangup', () => {
    it('should hangup by channel name', async () => {
      const { hangup } = useAmiCalls(mockClient)

      await hangup('SIP/1000-00000001')

      expect(mockClient.hangupChannel).toHaveBeenCalledWith('SIP/1000-00000001')
    })

    it('should hangup by unique ID', async () => {
      // First add a call to the map
      const { calls, hangup } = useAmiCalls(mockClient)

      calls.value.set('123.456', {
        uniqueId: '123.456',
        channel: 'SIP/1000-00000001',
        linkedId: '123.456',
        callerIdNum: '1000',
        callerIdName: 'Test',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Up,
        stateDesc: 'Up',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      })

      await hangup('123.456')

      expect(mockClient.hangupChannel).toHaveBeenCalledWith('SIP/1000-00000001')
      expect(calls.value.has('123.456')).toBe(false)
    })

    it('should call onCallEnd callback', async () => {
      const onCallEnd = vi.fn()
      const { calls, hangup } = useAmiCalls(mockClient, { onCallEnd })

      const call = {
        uniqueId: '123.456',
        channel: 'SIP/1000-00000001',
        linkedId: '123.456',
        callerIdNum: '1000',
        callerIdName: 'Test',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Up,
        stateDesc: 'Up',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      }
      calls.value.set('123.456', call)

      await hangup('123.456')

      expect(onCallEnd).toHaveBeenCalledWith(call)
    })

    it('should throw when client is null', async () => {
      const { hangup } = useAmiCalls(null)

      await expect(hangup('SIP/1000-00000001')).rejects.toThrow('AMI client not connected')
    })
  })

  describe('transfer', () => {
    it('should transfer a call', async () => {
      const { calls, transfer } = useAmiCalls(mockClient)

      calls.value.set('123.456', {
        uniqueId: '123.456',
        channel: 'SIP/1000-00000001',
        linkedId: '123.456',
        callerIdNum: '1000',
        callerIdName: 'Test',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Up,
        stateDesc: 'Up',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      })

      await transfer('123.456', '2000')

      expect(mockClient.redirectChannel).toHaveBeenCalledWith(
        'SIP/1000-00000001',
        'from-internal',
        '2000',
        1
      )
    })

    it('should use custom context', async () => {
      const { transfer } = useAmiCalls(mockClient)

      await transfer('SIP/1000-00000001', '2000', 'custom-context')

      expect(mockClient.redirectChannel).toHaveBeenCalledWith(
        'SIP/1000-00000001',
        'custom-context',
        '2000',
        1
      )
    })

    it('should throw when client is null', async () => {
      const { transfer } = useAmiCalls(null)

      await expect(transfer('SIP/1000-00000001', '2000')).rejects.toThrow('AMI client not connected')
    })
  })

  describe('computed properties', () => {
    it('should compute ringing calls', async () => {
      const { calls, ringingCalls } = useAmiCalls(mockClient)

      calls.value.set('1', {
        uniqueId: '1',
        channel: 'SIP/1000-00000001',
        linkedId: '1',
        callerIdNum: '1000',
        callerIdName: '',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Ringing,
        stateDesc: 'Ringing',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      })

      calls.value.set('2', {
        uniqueId: '2',
        channel: 'SIP/2000-00000001',
        linkedId: '2',
        callerIdNum: '2000',
        callerIdName: '',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Up,
        stateDesc: 'Up',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      })

      await nextTick()

      expect(ringingCalls.value.length).toBe(1)
      expect(ringingCalls.value[0].uniqueId).toBe('1')
    })

    it('should compute connected calls', async () => {
      const { calls, connectedCalls } = useAmiCalls(mockClient)

      calls.value.set('1', {
        uniqueId: '1',
        channel: 'SIP/1000-00000001',
        linkedId: '1',
        callerIdNum: '1000',
        callerIdName: '',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Up,
        stateDesc: 'Up',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      })

      await nextTick()

      expect(connectedCalls.value.length).toBe(1)
    })

    it('should compute dialing calls', async () => {
      const { calls, dialingCalls } = useAmiCalls(mockClient)

      calls.value.set('1', {
        uniqueId: '1',
        channel: 'SIP/1000-00000001',
        linkedId: '1',
        callerIdNum: '1000',
        callerIdName: '',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Dialing,
        stateDesc: 'Dialing',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      })

      await nextTick()

      expect(dialingCalls.value.length).toBe(1)
    })

    it('should compute total duration', async () => {
      const { calls, totalDuration } = useAmiCalls(mockClient)

      calls.value.set('1', {
        uniqueId: '1',
        channel: 'SIP/1000-00000001',
        linkedId: '1',
        callerIdNum: '1000',
        callerIdName: '',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Up,
        stateDesc: 'Up',
        startTime: new Date(),
        duration: 60,
        serverId: 1,
      })

      calls.value.set('2', {
        uniqueId: '2',
        channel: 'SIP/2000-00000001',
        linkedId: '2',
        callerIdNum: '2000',
        callerIdName: '',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Up,
        stateDesc: 'Up',
        startTime: new Date(),
        duration: 120,
        serverId: 1,
      })

      await nextTick()

      expect(totalDuration.value).toBe(180)
    })
  })

  describe('event handling', () => {
    it('should handle new channel events', async () => {
      const onCallStart = vi.fn()
      const { calls } = useAmiCalls(mockClient, { onCallStart })

      const event: AmiMessage<AmiNewChannelEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'Newchannel',
          Channel: 'SIP/1000-00000001',
          ChannelState: '6',
          ChannelStateDesc: 'Up',
          CallerIDNum: '1000',
          CallerIDName: 'Test User',
          ConnectedLineNum: '',
          ConnectedLineName: '',
          AccountCode: '',
          Context: 'from-internal',
          Exten: '2000',
          Priority: '1',
          Uniqueid: '123.456',
          Linkedid: '123.456',
        },
      }

      triggerClientEvent('newChannel', event)
      await nextTick()

      expect(calls.value.size).toBe(1)
      expect(calls.value.get('123.456')?.channel).toBe('SIP/1000-00000001')
      expect(onCallStart).toHaveBeenCalled()
    })

    it('should handle hangup events', async () => {
      const onCallEnd = vi.fn()
      const { calls } = useAmiCalls(mockClient, { onCallEnd })

      // First add a call
      calls.value.set('123.456', {
        uniqueId: '123.456',
        channel: 'SIP/1000-00000001',
        linkedId: '123.456',
        callerIdNum: '1000',
        callerIdName: 'Test',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Up,
        stateDesc: 'Up',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      })

      const event: AmiMessage<AmiHangupEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'Hangup',
          Channel: 'SIP/1000-00000001',
          Uniqueid: '123.456',
          Cause: '16',
          'Cause-txt': 'Normal Clearing',
        },
      }

      triggerClientEvent('hangup', event)
      await nextTick()

      expect(calls.value.size).toBe(0)
      expect(onCallEnd).toHaveBeenCalled()
    })

    it('should handle state change events', async () => {
      const onCallStateChange = vi.fn()
      const { calls } = useAmiCalls(mockClient, { onCallStateChange })

      // First add a call in ringing state
      calls.value.set('123.456', {
        uniqueId: '123.456',
        channel: 'SIP/1000-00000001',
        linkedId: '123.456',
        callerIdNum: '1000',
        callerIdName: 'Test',
        connectedLineNum: '',
        connectedLineName: '',
        state: ChannelState.Ringing,
        stateDesc: 'Ringing',
        startTime: new Date(),
        duration: 0,
        serverId: 1,
      })

      const event: AmiMessage<AmiNewStateEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'Newstate',
          Channel: 'SIP/1000-00000001',
          ChannelState: '6',
          ChannelStateDesc: 'Up',
          ConnectedLineNum: '2000',
          ConnectedLineName: 'Other User',
          Uniqueid: '123.456',
        },
      }

      triggerClientEvent('newState', event)
      await nextTick()

      expect(calls.value.get('123.456')?.state).toBe(ChannelState.Up)
      expect(calls.value.get('123.456')?.connectedLineNum).toBe('2000')
      expect(onCallStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ uniqueId: '123.456' }),
        ChannelState.Ringing
      )
    })

    it('should apply channel filter to events', async () => {
      const { calls } = useAmiCalls(mockClient, {
        channelFilter: (ch) => ch.channel.startsWith('SIP/'),
      })

      const localChannelEvent: AmiMessage<AmiNewChannelEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'Newchannel',
          Channel: 'Local/1000@context-00000001',
          ChannelState: '6',
          ChannelStateDesc: 'Up',
          CallerIDNum: '',
          CallerIDName: '',
          ConnectedLineNum: '',
          ConnectedLineName: '',
          AccountCode: '',
          Context: 'from-internal',
          Exten: '',
          Priority: '1',
          Uniqueid: '789.012',
          Linkedid: '789.012',
        },
      }

      triggerClientEvent('newChannel', localChannelEvent)
      await nextTick()

      expect(calls.value.size).toBe(0)
    })
  })

  describe('getStateLabel', () => {
    it('should return correct state labels', () => {
      const { getStateLabel } = useAmiCalls(mockClient)

      expect(getStateLabel(ChannelState.Down)).toBe('Down')
      expect(getStateLabel(ChannelState.Ringing)).toBe('Ringing')
      expect(getStateLabel(ChannelState.Up)).toBe('Up')
      expect(getStateLabel(ChannelState.Busy)).toBe('Busy')
    })

    it('should allow custom state labels', () => {
      const { getStateLabel } = useAmiCalls(mockClient, {
        stateLabels: {
          [ChannelState.Up]: 'Connected',
        },
      })

      expect(getStateLabel(ChannelState.Up)).toBe('Connected')
    })
  })
})
