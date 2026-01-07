/**
 * AmiClient unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AmiClient, createAmiClient, AmiError, AmiErrorCode } from '@/core/AmiClient'
import { AmiConnectionState, AmiMessageType } from '@/types/ami.types'
import type { AmiConfig, AmiMessage,  } from '@/types/ami.types'

// Mock WebSocket - Store instance for test access
let mockWsInstance: any = null
let wsConstructorCalls = 0

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState: number = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  sentMessages: string[] = []

  constructor(url: string) {
    this.url = url
    mockWsInstance = this
    wsConstructorCalls++
  }

  send(data: string): void {
    this.sentMessages.push(data)
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  simulateClose(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code, reason } as CloseEvent)
  }

  simulateError(): void {
    this.onerror?.(new Event('error'))
  }

  simulateMessage(data: AmiMessage<any>): void {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent)
  }
}

// Replace global WebSocket with our mock class
vi.stubGlobal('WebSocket', MockWebSocket)

describe('AmiClient', () => {
  let client: AmiClient
  let config: AmiConfig

  beforeEach(() => {
    vi.clearAllMocks()
    // Don't use fake timers globally - they interfere with WebSocket mocks
    // Use vi.useFakeTimers() in specific tests that need them
    mockWsInstance = null
    wsConstructorCalls = 0

    config = {
      url: 'ws://localhost:8080',
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 3,
    }
  })

  afterEach(async () => {
    // Only try to disconnect if client exists and has a ws connection
    try {
      if (client && client.getState() !== AmiConnectionState.Disconnected) {
        client.disconnect()
      }
    } catch {
      // Ignore errors during cleanup
    }
    // Allow any pending promises to settle (e.g., rejected pending actions)
    await new Promise(resolve => setTimeout(resolve, 0))
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('should create client with default config values', () => {
      client = new AmiClient({ url: 'ws://test.com' })
      expect(client.getState()).toBe(AmiConnectionState.Disconnected)
      expect(client.isConnected).toBe(false)
    })

    it('should accept custom config options', () => {
      client = new AmiClient(config)
      expect(client.getState()).toBe(AmiConnectionState.Disconnected)
    })
  })

  describe('createAmiClient factory', () => {
    it('should create AmiClient instance', () => {
      client = createAmiClient(config)
      expect(client).toBeInstanceOf(AmiClient)
    })
  })

  describe('connect', () => {
    beforeEach(() => {
      client = new AmiClient(config)
    })

    it('should connect to WebSocket', async () => {
      const connectPromise = client.connect()

      // Simulate successful connection
      mockWsInstance?.simulateOpen()

      await connectPromise

      expect(client.isConnected).toBe(true)
      expect(client.getState()).toBe(AmiConnectionState.Connected)
    })

    it('should emit connected event', async () => {
      const connectedHandler = vi.fn()
      client.on('connected', connectedHandler)

      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise

      expect(connectedHandler).toHaveBeenCalled()
    })

    it('should reject on connection error', async () => {
      const connectPromise = client.connect()

      mockWsInstance?.simulateError()

      await expect(connectPromise).rejects.toThrow('WebSocket error during connection')
    })

    it('should not connect if already connected', async () => {
      const connectPromise1 = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise1

      // Try to connect again
      await client.connect()

      // Should only have created one WebSocket
      expect(wsConstructorCalls).toBe(1)
    })

    it('should set state to Connecting during connection', () => {
      client.connect()
      expect(client.getState()).toBe(AmiConnectionState.Connecting)
    })
  })

  describe('disconnect', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should disconnect from WebSocket', () => {
      client.disconnect()

      expect(client.isConnected).toBe(false)
      expect(client.getState()).toBe(AmiConnectionState.Disconnected)
    })

    it('should emit disconnected event', () => {
      const disconnectedHandler = vi.fn()
      client.on('disconnected', disconnectedHandler)

      client.disconnect()

      expect(disconnectedHandler).toHaveBeenCalledWith('Manual disconnect')
    })

    it('should cancel pending actions', async () => {
      // Start an action
      const actionPromise = client.sendAction({ Action: 'Ping' })

      // Disconnect before response
      client.disconnect()

      await expect(actionPromise).rejects.toThrow('Disconnected from AMI')
      try {
        await actionPromise
      } catch (error) {
        expect(error).toBeInstanceOf(AmiError)
        expect((error as AmiError).code).toBe(AmiErrorCode.DISCONNECTED)
      }
    })

    it('should cancel reconnect timer', async () => {
      // This test needs fake timers to verify no reconnect happens
      vi.useFakeTimers()

      const callsBeforeDisconnect = wsConstructorCalls

      // Manual disconnect should not trigger reconnect
      client.disconnect()

      // No reconnect should be scheduled after manual disconnect
      vi.advanceTimersByTime(config.reconnectDelay! + 1000)

      expect(wsConstructorCalls).toBe(callsBeforeDisconnect) // No new connections

      vi.useRealTimers()
    })
  })

  describe('sendAction', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should send action and receive response', async () => {
      const actionPromise = client.sendAction({ Action: 'Ping' })

      // Get the sent message to extract ActionID
      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      // Simulate response
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
          Ping: 'Pong',
        },
      })

      const response = await actionPromise

      expect(response.data.Response).toBe('Success')
    })

    it('should throw if not connected', async () => {
      client.disconnect()

      await expect(client.sendAction({ Action: 'Ping' })).rejects.toThrow('Not connected to AMI')
      try {
        await client.sendAction({ Action: 'Ping' })
      } catch (error) {
        expect(error).toBeInstanceOf(AmiError)
        expect((error as AmiError).code).toBe(AmiErrorCode.NOT_CONNECTED)
      }
    })

    it('should timeout if no response', async () => {
      // Enable fake timers AFTER connection is established (in beforeEach)
      vi.useFakeTimers()

      // Start an action with a reasonable timeout
      const actionPromise = client.sendAction({ Action: 'SlowAction' }, 5000)

      // Attach catch handler BEFORE advancing timers to prevent unhandled rejection
      const errorPromise = actionPromise.catch((error) => error)

      // Advance timers to trigger timeout
      await vi.advanceTimersByTimeAsync(5000)

      // Verify the error
      const error = await errorPromise
      expect(error).toBeInstanceOf(AmiError)
      expect((error as AmiError).code).toBe(AmiErrorCode.ACTION_TIMEOUT)
      expect(error.message).toContain('AMI action timeout: SlowAction')

      vi.useRealTimers()
    })

    it('should use provided ActionID', async () => {
      // Start the action but catch rejection when disconnect happens in afterEach
      const actionPromise = client.sendAction({ Action: 'Test', ActionID: 'custom-id' }).catch(() => {})

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      expect(sentMessage.ActionID).toBe('custom-id')

      // Clean up: respond to the action so we don't have unhandled rejection
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: { Response: 'Success', ActionID: 'custom-id' },
      })
      await actionPromise
    })

    it('should generate ActionID if not provided', async () => {
      // Start the action but catch rejection when disconnect happens in afterEach
      const actionPromise = client.sendAction({ Action: 'Test' }).catch(() => {})

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      expect(sentMessage.ActionID).toMatch(/^vuesip-\d+-\d+$/)

      // Clean up: respond to the action so we don't have unhandled rejection
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: { Response: 'Success', ActionID: sentMessage.ActionID },
      })
      await actionPromise
    })
  })

  describe('getPresenceState', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should query presence state', async () => {
      const presencePromise = client.getPresenceState('1000')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
          State: 'AVAILABLE',
          Subtype: 'online',
          Message: 'In office',
        },
      })

      const result = await presencePromise

      expect(result.state).toBe('available')
      expect(result.subtype).toBe('online')
      expect(result.message).toBe('In office')
    })

    it('should throw on error response', async () => {
      const presencePromise = client.getPresenceState('9999')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Error',
          ActionID: actionId,
          Message: 'Extension not found',
        },
      })

      await expect(presencePromise).rejects.toThrow('Extension not found')
    })
  })

  describe('setPresenceState', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should set presence state', async () => {
      const setPromise = client.setPresenceState('1000', 'away', { message: 'BRB' })

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('PresenceStateChange')
      expect(sentMessage.State).toBe('AWAY')
      expect(sentMessage.Message).toBe('BRB')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
        },
      })

      await setPromise
    })
  })

  describe('event handling', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should emit message event for all messages', () => {
      const messageHandler = vi.fn()
      client.on('message', messageHandler)

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'TestEvent',
        },
      })

      expect(messageHandler).toHaveBeenCalled()
    })

    it('should emit event for AMI events', () => {
      const eventHandler = vi.fn()
      client.on('event', eventHandler)

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'PeerStatus',
          Peer: 'SIP/1000',
          PeerStatus: 'Registered',
        },
      })

      expect(eventHandler).toHaveBeenCalled()
    })

    it('should emit presenceChange for PresenceStateChange events', () => {
      const presenceHandler = vi.fn()
      client.on('presenceChange', presenceHandler)

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'PresenceStateChange',
          Presentity: 'CustomPresence:1000',
          State: 'AWAY',
          Message: 'In a meeting',
        },
      })

      expect(presenceHandler).toHaveBeenCalled()
      const event = presenceHandler.mock.calls[0][0]
      expect(event.data.Presentity).toBe('CustomPresence:1000')
      expect(event.data.State).toBe('AWAY')
    })

    it('should allow removing event listeners', () => {
      const handler = vi.fn()
      client.on('event', handler)
      client.off('event', handler)

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'TestEvent',
        },
      })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('auto-reconnection', () => {
    // These tests need special cleanup handling to avoid unhandled rejections
    // during the reconnection process. Using dedicated afterEach.
    afterEach(() => {
      // Clear all timers to prevent reconnection attempts
      vi.clearAllTimers()
      // Force state to disconnected to prevent cleanup issues
      if (client) {
        try {
          // Set onclose to null to prevent reconnection triggers
          if (mockWsInstance) {
            mockWsInstance.onclose = null
          }
          client.disconnect()
        } catch {
          // Ignore cleanup errors
        }
      }
    })

    it('should set state to Reconnecting on unexpected disconnect', async () => {
      client = new AmiClient({ ...config, autoReconnect: true, maxReconnectAttempts: 3 })

      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise

      // Simulate unexpected disconnect
      mockWsInstance?.simulateClose(1006, 'Connection lost')

      expect(client.getState()).toBe(AmiConnectionState.Reconnecting)
    })

    it('should not set Reconnecting state when autoReconnect is false', async () => {
      client = new AmiClient({ ...config, autoReconnect: false })

      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise

      mockWsInstance?.simulateClose()

      // Should go directly to Disconnected, not Reconnecting
      expect(client.getState()).toBe(AmiConnectionState.Disconnected)
    })
  })

  describe('queue operations', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should add member to queue', async () => {
      const addPromise = client.queueAdd('support', 'SIP/1001', {
        memberName: 'Agent 1',
        penalty: 0,
        paused: false,
      })

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('QueueAdd')
      expect(sentMessage.Queue).toBe('support')
      expect(sentMessage.Interface).toBe('SIP/1001')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
        },
      })

      await addPromise
    })

    it('should remove member from queue', async () => {
      const removePromise = client.queueRemove('support', 'SIP/1001')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('QueueRemove')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
        },
      })

      await removePromise
    })

    it('should pause queue member', async () => {
      const pausePromise = client.queuePause('support', 'SIP/1001', true, 'Break')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('QueuePause')
      expect(sentMessage.Paused).toBe('true')
      expect(sentMessage.Reason).toBe('Break')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
        },
      })

      await pausePromise
    })
  })

  describe('channel operations', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should originate call', async () => {
      const originatePromise = client.originate({
        channel: 'PJSIP/1001',
        exten: '1002',
        context: 'from-internal',
        callerId: 'Test <1001>',
      })

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('Originate')
      expect(sentMessage.Channel).toBe('PJSIP/1001')
      expect(sentMessage.Exten).toBe('1002')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
          Channel: 'PJSIP/1001-00000001',
          Uniqueid: '1234567890.1',
        },
      })

      const result = await originatePromise

      expect(result.success).toBe(true)
      expect(result.channel).toBe('PJSIP/1001-00000001')
    })

    it('should hangup channel', async () => {
      const hangupPromise = client.hangupChannel('PJSIP/1001-00000001')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('Hangup')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
        },
      })

      await hangupPromise
    })
  })

  describe('database operations', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should get database value', async () => {
      const getPromise = client.dbGet('contacts', 'user1')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('DBGet')
      expect(sentMessage.Family).toBe('contacts')
      expect(sentMessage.Key).toBe('user1')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
          Val: 'John Doe',
        },
      })

      const result = await getPromise
      expect(result).toBe('John Doe')
    })

    it('should put database value', async () => {
      const putPromise = client.dbPut('contacts', 'user1', 'Jane Doe')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('DBPut')
      expect(sentMessage.Val).toBe('Jane Doe')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
        },
      })

      await putPromise
    })

    it('should delete database value', async () => {
      const delPromise = client.dbDel('contacts', 'user1')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('DBDel')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
        },
      })

      await delPromise
    })
  })

  describe('extension status operations', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should get extension status', async () => {
      const statusPromise = client.getExtensionStatus('1000', 'ext-local')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('ExtensionState')
      expect(sentMessage.Exten).toBe('1000')
      expect(sentMessage.Context).toBe('ext-local')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
          Status: '1',
          StatusText: 'InUse',
        },
      })

      const result = await statusPromise
      expect(result.status).toBe(1)
      expect(result.statusText).toBe('InUse')
    })

    it('should throw on error response for extension status', async () => {
      const statusPromise = client.getExtensionStatus('9999')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Error',
          ActionID: actionId,
          Message: 'Extension not found',
        },
      })

      await expect(statusPromise).rejects.toThrow('Extension not found')
    })
  })

  describe('subscribePresence', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should log subscription info', async () => {
      // This is a no-op method that just logs
      await client.subscribePresence('1000')
      // No error should be thrown
    })
  })

  describe('rawCommand', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should send raw AMI command', async () => {
      const rawPromise = client.rawCommand('Action: Ping\r\nActionID: test123')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      expect(sentMessage.Action).toBe('Ping')
      expect(sentMessage.ActionID).toBe('test123')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: sentMessage.ActionID,
          Ping: 'Pong',
        },
      })

      const response = await rawPromise
      expect(response.data.Response).toBe('Success')
    })

    it('should parse multi-line raw command', async () => {
      const rawPromise = client.rawCommand('Action: QueueStatus\r\nQueue: support\r\nMember: SIP/1001')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      expect(sentMessage.Action).toBe('QueueStatus')
      expect(sentMessage.Queue).toBe('support')
      expect(sentMessage.Member).toBe('SIP/1001')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: sentMessage.ActionID,
        },
      })

      await rawPromise
    })

    it('should throw on invalid raw command (missing Action)', async () => {
      await expect(client.rawCommand('Invalid: Command')).rejects.toThrow('Invalid AMI command - missing Action')
    })
  })

  describe('getQueueStatus', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should aggregate queue status with members and entries', async () => {
      const statusPromise = client.getQueueStatus('support')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      // Simulate QueueParams event
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueParams',
          ActionID: actionId,
          Queue: 'support',
          Strategy: 'ringall',
          Calls: '2',
          Holdtime: '15',
          TalkTime: '120',
          Completed: '50',
          Abandoned: '5',
          ServiceLevelPerf: '95.5',
          ServiceLevelPerf2: '92.0',
          Weight: '0',
        },
      })

      // Simulate QueueMember event
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueMember',
          ActionID: actionId,
          Queue: 'support',
          MemberName: 'Agent 1',
          Interface: 'SIP/1001',
          StateInterface: 'SIP/1001',
          Membership: 'dynamic',
          Penalty: '0',
          CallsTaken: '10',
          LastCall: '60',
          LastPause: '0',
          LoginTime: '3600',
          InCall: '0',
          Status: '1',
          Paused: '0',
          PausedReason: '',
          WrapupTime: '5',
          Ringinuse: '1',
        },
      })

      // Simulate QueueEntry event
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueEntry',
          ActionID: actionId,
          Queue: 'support',
          Position: '1',
          Channel: 'SIP/1002-00000001',
          Uniqueid: '1234567890.1',
          CallerIDNum: '1002',
          CallerIDName: 'John Doe',
          ConnectedLineNum: '',
          ConnectedLineName: '',
          Wait: '30',
          Priority: '0',
        },
      })

      // Simulate completion event
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueStatusComplete',
          ActionID: actionId,
        },
      })

      const queues = await statusPromise

      expect(queues).toHaveLength(1)
      expect(queues[0].name).toBe('support')
      expect(queues[0].strategy).toBe('ringall')
      expect(queues[0].calls).toBe(2)
      expect(queues[0].members).toHaveLength(1)
      expect(queues[0].members[0].name).toBe('Agent 1')
      expect(queues[0].entries).toHaveLength(1)
      expect(queues[0].entries[0].callerIdNum).toBe('1002')
    })

    it('should handle timeout for queue status', async () => {
      // Enable fake timers AFTER connection is established (in beforeEach)
      vi.useFakeTimers()

      // Start the operation with a reasonable timeout
      const statusPromise = client.getQueueStatus('support', 5000)

      // Attach catch handler BEFORE advancing timers to prevent unhandled rejection
      const errorPromise = statusPromise.catch((error) => error)

      // Don't send completion event - advance timers to trigger timeout
      await vi.advanceTimersByTimeAsync(5000)

      // Verify the error
      const error = await errorPromise
      expect(error.message).toContain('QueueStatus timeout')

      vi.useRealTimers()
    })
  })

  describe('getQueueSummary', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should get queue summary', async () => {
      const summaryPromise = client.getQueueSummary()

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      // Simulate QueueSummary events
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueSummary',
          ActionID: actionId,
          Queue: 'support',
          LoggedIn: '5',
          Available: '3',
          Callers: '2',
          Holdtime: '15',
          TalkTime: '120',
          LongestHoldTime: '45',
        },
      })

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueSummaryComplete',
          ActionID: actionId,
        },
      })

      const summaries = await summaryPromise

      expect(summaries).toHaveLength(1)
      expect(summaries[0].queue).toBe('support')
      expect(summaries[0].loggedIn).toBe(5)
      expect(summaries[0].available).toBe(3)
      expect(summaries[0].callers).toBe(2)
    })

    it('should filter by specific queue', async () => {
      const summaryPromise = client.getQueueSummary('sales')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      expect(sentMessage.Queue).toBe('sales')

      const actionId = sentMessage.ActionID

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueSummaryComplete',
          ActionID: actionId,
        },
      })

      await summaryPromise
    })

    it('should handle timeout for queue summary', async () => {
      // Enable fake timers AFTER connection is established (in beforeEach)
      vi.useFakeTimers()

      // Start the operation with a reasonable timeout
      const summaryPromise = client.getQueueSummary(undefined, 5000)

      // Attach catch handler BEFORE advancing timers to prevent unhandled rejection
      const errorPromise = summaryPromise.catch((error) => error)

      // Don't send completion event - advance timers to trigger timeout
      await vi.advanceTimersByTimeAsync(5000)

      // Verify the error
      const error = await errorPromise
      expect(error.message).toContain('QueueSummary timeout')

      vi.useRealTimers()
    })
  })

  describe('queuePenalty', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should set queue member penalty', async () => {
      const penaltyPromise = client.queuePenalty('support', 'SIP/1001', 5)

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('QueuePenalty')
      expect(sentMessage.Queue).toBe('support')
      expect(sentMessage.Interface).toBe('SIP/1001')
      expect(sentMessage.Penalty).toBe('5')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
        },
      })

      await penaltyPromise
    })

    it('should throw on penalty error', async () => {
      const penaltyPromise = client.queuePenalty('support', 'SIP/9999', 5)

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Error',
          ActionID: actionId,
          Message: 'Member not found',
        },
      })

      await expect(penaltyPromise).rejects.toThrow('Member not found')
    })
  })

  describe('getChannels', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should get all active channels', async () => {
      const channelsPromise = client.getChannels()

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      // Simulate CoreShowChannel events
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'CoreShowChannel',
          ActionID: actionId,
          Channel: 'PJSIP/1001-00000001',
          ChannelState: '6',
          ChannelStateDesc: 'Up',
          CallerIDNum: '1001',
          CallerIDName: 'Agent 1',
          ConnectedLineNum: '1002',
          ConnectedLineName: 'Customer',
          AccountCode: '',
          Context: 'from-internal',
          Exten: '1002',
          Priority: '1',
          Uniqueid: '1234567890.1',
          Linkedid: '1234567890.1',
          Application: 'Dial',
          ApplicationData: 'PJSIP/1002',
          Duration: '00:01:30',
          BridgeId: 'bridge-123',
        },
      })

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'CoreShowChannelsComplete',
          ActionID: actionId,
        },
      })

      const channels = await channelsPromise

      expect(channels).toHaveLength(1)
      expect(channels[0].channel).toBe('PJSIP/1001-00000001')
      expect(channels[0].channelState).toBe(6)
      expect(channels[0].stateDesc).toBe('Up')
      expect(channels[0].callerIdNum).toBe('1001')
    })

    it('should handle timeout for get channels', async () => {
      // Enable fake timers AFTER connection is established (in beforeEach)
      vi.useFakeTimers()

      // Start the operation with a reasonable timeout
      const channelsPromise = client.getChannels(5000)

      // Attach catch handler BEFORE advancing timers to prevent unhandled rejection
      const errorPromise = channelsPromise.catch((error) => error)

      // Don't send completion event - advance timers to trigger timeout
      await vi.advanceTimersByTimeAsync(5000)

      // Verify the error
      const error = await errorPromise
      expect(error.message).toContain('CoreShowChannels timeout')

      vi.useRealTimers()
    })
  })

  describe('redirectChannel', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should redirect channel', async () => {
      const redirectPromise = client.redirectChannel('PJSIP/1001-00000001', 'from-internal', '1002', 1)

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('Redirect')
      expect(sentMessage.Channel).toBe('PJSIP/1001-00000001')
      expect(sentMessage.Context).toBe('from-internal')
      expect(sentMessage.Exten).toBe('1002')
      expect(sentMessage.Priority).toBe('1')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
        },
      })

      await redirectPromise
    })

    it('should throw on redirect error', async () => {
      const redirectPromise = client.redirectChannel('PJSIP/9999-00000001', 'from-internal', '1002')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Error',
          ActionID: actionId,
          Message: 'Channel not found',
        },
      })

      await expect(redirectPromise).rejects.toThrow('Channel not found')
    })
  })

  describe('getSipPeers', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should get SIP peers', async () => {
      const peersPromise = client.getSipPeers()

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      // Simulate PeerEntry events
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'PeerEntry',
          ActionID: actionId,
          ObjectName: '1001',
          IPaddress: '192.168.1.100',
          IPport: '5060',
          Status: 'OK (15 ms)',
          Dynamic: 'yes',
          Forcerport: 'yes',
          Comedia: 'no',
          ACL: 'no',
          AutoForcerport: 'yes',
          AutoComedia: 'no',
          VideoSupport: 'yes',
          TextSupport: 'no',
          RealtimeDevice: 'no',
        },
      })

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'PeerlistComplete',
          ActionID: actionId,
        },
      })

      const peers = await peersPromise

      expect(peers).toHaveLength(1)
      expect(peers[0].objectName).toBe('1001')
      expect(peers[0].channelType).toBe('SIP')
      expect(peers[0].ipAddress).toBe('192.168.1.100')
      expect(peers[0].status).toBe('OK')
    })

    it('should handle timeout for SIP peers', async () => {
      // Enable fake timers AFTER connection is established (in beforeEach)
      vi.useFakeTimers()

      // Start the operation with a reasonable timeout
      const peersPromise = client.getSipPeers(5000)

      // Attach catch handler BEFORE advancing timers to prevent unhandled rejection
      const errorPromise = peersPromise.catch((error) => error)

      // Don't send completion event - advance timers to trigger timeout
      await vi.advanceTimersByTimeAsync(5000)

      // Verify the error
      const error = await errorPromise
      expect(error.message).toContain('SIPpeers timeout')

      vi.useRealTimers()
    })
  })

  describe('getPjsipEndpoints', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should get PJSIP endpoints', async () => {
      const peersPromise = client.getPjsipEndpoints()

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      // Simulate EndpointList events
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'EndpointList',
          ActionID: actionId,
          ObjectName: '2001',
          DeviceState: 'Not in use',
        },
      })

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'EndpointListComplete',
          ActionID: actionId,
        },
      })

      const peers = await peersPromise

      expect(peers).toHaveLength(1)
      expect(peers[0].objectName).toBe('2001')
      expect(peers[0].channelType).toBe('PJSIP')
      expect(peers[0].status).toBe('OK')
    })

    it('should handle timeout for PJSIP endpoints', async () => {
      // Enable fake timers AFTER connection is established (in beforeEach)
      vi.useFakeTimers()

      // Start the operation with a reasonable timeout
      const peersPromise = client.getPjsipEndpoints(5000)

      // Attach catch handler BEFORE advancing timers to prevent unhandled rejection
      const errorPromise = peersPromise.catch((error) => error)

      // Don't send completion event - advance timers to trigger timeout
      await vi.advanceTimersByTimeAsync(5000)

      // Verify the error
      const error = await errorPromise
      expect(error.message).toContain('PJSIPShowEndpoints timeout')

      vi.useRealTimers()
    })
  })

  describe('getAllPeers', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should get both SIP and PJSIP peers', async () => {
      const peersPromise = client.getAllPeers()

      // Wait for both requests
      await new Promise(resolve => setTimeout(resolve, 10))

      // Get both action IDs
      const sipActionId = JSON.parse(mockWsInstance!.sentMessages[0]).ActionID
      const pjsipActionId = JSON.parse(mockWsInstance!.sentMessages[1]).ActionID

      // Send SIP peer responses
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'PeerEntry',
          ActionID: sipActionId,
          ObjectName: '1001',
          IPaddress: '192.168.1.100',
          IPport: '5060',
          Status: 'OK',
          Dynamic: 'yes',
          Forcerport: 'yes',
          Comedia: 'no',
          ACL: 'no',
          AutoForcerport: 'yes',
          AutoComedia: 'no',
          VideoSupport: 'yes',
          TextSupport: 'no',
          RealtimeDevice: 'no',
        },
      })

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'PeerlistComplete',
          ActionID: sipActionId,
        },
      })

      // Send PJSIP endpoint responses
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'EndpointList',
          ActionID: pjsipActionId,
          ObjectName: '2001',
          DeviceState: 'Not in use',
        },
      })

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'EndpointListComplete',
          ActionID: pjsipActionId,
        },
      })

      const peers = await peersPromise

      expect(peers.length).toBeGreaterThanOrEqual(2)
      expect(peers.some(p => p.channelType === 'SIP')).toBe(true)
      expect(peers.some(p => p.channelType === 'PJSIP')).toBe(true)
    })
  })

  describe('dbDelTree', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should delete entire family tree', async () => {
      const delPromise = client.dbDelTree('contacts')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('DBDelTree')
      expect(sentMessage.Family).toBe('contacts')
      expect(sentMessage.Key).toBeUndefined()

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
        },
      })

      await delPromise
    })

    it('should delete family tree with key prefix', async () => {
      const delPromise = client.dbDelTree('contacts', 'user')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      expect(sentMessage.Action).toBe('DBDelTree')
      expect(sentMessage.Family).toBe('contacts')
      expect(sentMessage.Key).toBe('user')

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Success',
          ActionID: actionId,
        },
      })

      await delPromise
    })

    it('should throw on dbDelTree error', async () => {
      const delPromise = client.dbDelTree('nonexistent')

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[0])
      const actionId = sentMessage.ActionID

      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Response,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Response: 'Error',
          ActionID: actionId,
          Message: 'Family not found',
        },
      })

      await expect(delPromise).rejects.toThrow('Family not found')
    })
  })

  describe('dbGetKeys', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should return empty array (not implemented)', async () => {
      const keys = await client.dbGetKeys('contacts')
      expect(keys).toEqual([])
    })

    it('should return empty array with prefix (not implemented)', async () => {
      const keys = await client.dbGetKeys('contacts', 'user')
      expect(keys).toEqual([])
    })
  })

  describe('error types and codes', () => {
    it('should create AmiError with code and details', () => {
      const error = new AmiError('Test error', AmiErrorCode.ACTION_TIMEOUT, { action: 'Ping' })

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AmiError)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe(AmiErrorCode.ACTION_TIMEOUT)
      expect(error.details).toEqual({ action: 'Ping' })
      expect(error.name).toBe('AmiError')
    })

    it('should handle all error codes', () => {
      const codes = [
        AmiErrorCode.CONNECTION_FAILED,
        AmiErrorCode.CONNECTION_TIMEOUT,
        AmiErrorCode.DISCONNECTED,
        AmiErrorCode.ACTION_TIMEOUT,
        AmiErrorCode.ACTION_FAILED,
        AmiErrorCode.INVALID_RESPONSE,
        AmiErrorCode.NOT_CONNECTED,
        AmiErrorCode.WEBSOCKET_ERROR,
      ]

      codes.forEach(code => {
        const error = new AmiError('Test', code)
        expect(error.code).toBe(code)
      })
    })
  })

  describe('private method coverage', () => {
    beforeEach(async () => {
      client = new AmiClient(config)
      const connectPromise = client.connect()
      mockWsInstance?.simulateOpen()
      await connectPromise
    })

    it('should handle invalid JSON in message', () => {
      // Trigger handleMessage with invalid JSON
      if (mockWsInstance) {
        mockWsInstance.simulateMessage = (_data: any) => {
          mockWsInstance?.onmessage?.({ data: 'invalid json{' } as MessageEvent)
        }

        // Should not throw - error is logged internally
        mockWsInstance.simulateMessage({})
      }
    })

    it('should handle unknown message type', () => {
      mockWsInstance?.simulateMessage({
        type: 'UnknownType' as any,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {},
      })

      // Should not throw - just logs debug message
    })

    it('should handle specific event types', () => {
      const handlers = {
        presenceChange: vi.fn(),
        queueMemberStatus: vi.fn(),
        queueCallerJoin: vi.fn(),
        queueCallerLeave: vi.fn(),
        queueCallerAbandon: vi.fn(),
        newChannel: vi.fn(),
        hangup: vi.fn(),
        newState: vi.fn(),
        peerStatus: vi.fn(),
      }

      Object.entries(handlers).forEach(([event, handler]) => {
        client.on(event as any, handler)
      })

      // Trigger PresenceStateChange
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'PresenceStateChange',
          Presentity: 'CustomPresence:1000',
          State: 'AWAY',
        },
      })
      expect(handlers.presenceChange).toHaveBeenCalled()

      // Trigger QueueMemberStatus
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueMemberStatus',
          Queue: 'support',
        },
      })
      expect(handlers.queueMemberStatus).toHaveBeenCalled()

      // Trigger QueueCallerJoin
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueCallerJoin',
          Queue: 'support',
        },
      })
      expect(handlers.queueCallerJoin).toHaveBeenCalled()

      // Trigger QueueCallerLeave
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueCallerLeave',
          Queue: 'support',
        },
      })
      expect(handlers.queueCallerLeave).toHaveBeenCalled()

      // Trigger QueueCallerAbandon
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueCallerAbandon',
          Queue: 'support',
        },
      })
      expect(handlers.queueCallerAbandon).toHaveBeenCalled()

      // Trigger Newchannel
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'Newchannel',
          Channel: 'PJSIP/1001-00000001',
        },
      })
      expect(handlers.newChannel).toHaveBeenCalled()

      // Trigger Hangup
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'Hangup',
          Channel: 'PJSIP/1001-00000001',
        },
      })
      expect(handlers.hangup).toHaveBeenCalled()

      // Trigger Newstate
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'Newstate',
          Channel: 'PJSIP/1001-00000001',
        },
      })
      expect(handlers.newState).toHaveBeenCalled()

      // Trigger PeerStatus
      mockWsInstance?.simulateMessage({
        type: AmiMessageType.Event,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'PeerStatus',
          Peer: 'SIP/1001',
        },
      })
      expect(handlers.peerStatus).toHaveBeenCalled()
    })

    it('should parse peer status variants', () => {
      const testCases = [
        { input: 'OK', expected: 'OK' },
        { input: 'OK (15 ms)', expected: 'OK' },
        { input: 'LAGGED', expected: 'LAGGED' },
        { input: 'LAGGED (2000 ms)', expected: 'LAGGED' },
        { input: 'UNREACHABLE', expected: 'UNREACHABLE' },
        { input: 'Unmonitored', expected: 'Unmonitored' },
        { input: 'INVALID', expected: 'UNKNOWN' },
      ]

      testCases.forEach(({ input }) => {
        mockWsInstance?.simulateMessage({
          type: AmiMessageType.Event,
          server_id: 1,
          server_name: 'test',
          ssl: false,
          data: {
            Event: 'PeerEntry',
            ActionID: 'test-123',
            ObjectName: '1001',
            Status: input,
            IPaddress: '192.168.1.100',
            IPport: '5060',
            Dynamic: 'yes',
            Forcerport: 'yes',
            Comedia: 'no',
            ACL: 'no',
            AutoForcerport: 'yes',
            AutoComedia: 'no',
            VideoSupport: 'yes',
            TextSupport: 'no',
            RealtimeDevice: 'no',
          },
        })
      })
    })
  })
})
