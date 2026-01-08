/**
 * JsSIP Adapter Integration Tests
 *
 * Tests the adapter components working together:
 * - AdapterFactory -> JsSipAdapter
 * - JsSipAdapter -> JsSipCallSession
 * - Full lifecycle flows
 *
 * These tests verify component interactions rather than isolated unit behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdapterFactory, createSipAdapter } from '@/adapters/AdapterFactory'
import { ConnectionState, RegistrationState } from '@/types/sip.types'
import { CallState, CallDirection } from '@/types/call.types'
import type { SipClientConfig } from '@/types/config.types'

// ============================================================================
// Mock JsSIP Module - Comprehensive mock for integration testing
// ============================================================================

// Store event handlers for triggering in tests
let uaEventHandlers: Map<string, Function[]> = new Map()
let sessionEventHandlers: Map<string, Map<string, Function[]>> = new Map()

// Track created sessions for verification
let createdSessions: MockRTCSession[] = []

class MockWebSocketInterface {
  url: string
  constructor(url: string) {
    this.url = url
  }
  connect = vi.fn()
  disconnect = vi.fn()
  isConnected = vi.fn().mockReturnValue(false)
}

class MockRTCSession {
  id: string
  direction: 'incoming' | 'outgoing'
  local_identity = { uri: { toString: () => 'sip:local@test.com' } }
  remote_identity: {
    uri: { toString: () => string }
    display_name: string
  }
  start_time: Date | null = null
  end_time: Date | null = null
  connection: RTCPeerConnection | null = null

  private eventHandlers: Map<string, Function[]> = new Map()

  constructor(direction: 'incoming' | 'outgoing' = 'outgoing', id?: string) {
    this.id = id || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.direction = direction
    this.remote_identity = {
      uri: { toString: () => `sip:remote-${this.id}@test.com` },
      display_name: `Remote User ${this.id}`,
    }

    // Store reference for test access
    createdSessions.push(this)
    sessionEventHandlers.set(this.id, this.eventHandlers)
  }

  answer = vi.fn()
  terminate = vi.fn()
  sendDTMF = vi.fn()
  hold = vi.fn().mockReturnValue(true)
  unhold = vi.fn().mockReturnValue(true)
  mute = vi.fn()
  unmute = vi.fn()
  renegotiate = vi.fn().mockReturnValue(true)
  isOnHold = vi.fn().mockReturnValue({ local: false, remote: false })
  isMuted = vi.fn().mockReturnValue({ audio: false, video: false })

  on(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event) || []
    handlers.push(handler)
    this.eventHandlers.set(event, handlers)
    return this
  }

  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event) || []
    const index = handlers.indexOf(handler)
    if (index > -1) handlers.splice(index, 1)
    return this
  }

  once(event: string, handler: Function) {
    const wrappedHandler = (...args: unknown[]) => {
      this.off(event, wrappedHandler)
      handler(...args)
    }
    return this.on(event, wrappedHandler)
  }

  emit = vi.fn()
  removeListener = vi.fn()
  removeAllListeners = vi.fn()

  // Helper to trigger events in tests
  __triggerEvent(event: string, data?: unknown) {
    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach((handler) => handler(data))
  }
}

class MockMessage {
  direction: 'incoming' | 'outgoing' = 'outgoing'
  local_identity = { uri: { toString: () => 'sip:local@test.com' } }
  remote_identity = { uri: { toString: () => 'sip:remote@test.com' } }

  accept = vi.fn()
  reject = vi.fn()
  send = vi.fn()

  on = vi.fn().mockReturnThis()
  off = vi.fn().mockReturnThis()
}

class MockUA {
  configuration: unknown

  constructor(config: unknown) {
    this.configuration = config
    // Reset event handlers on each UA creation
    uaEventHandlers = new Map()
  }

  start = vi.fn()
  stop = vi.fn()
  register = vi.fn()
  unregister = vi.fn()
  registrator = vi.fn().mockReturnValue({ setExtraHeaders: vi.fn() })
  isRegistered = vi.fn().mockReturnValue(false)
  isConnected = vi.fn().mockReturnValue(false)

  call = vi.fn().mockImplementation(() => {
    const session = new MockRTCSession('outgoing')
    return session
  })

  sendMessage = vi.fn().mockReturnValue(new MockMessage())

  on(event: string, handler: Function) {
    const handlers = uaEventHandlers.get(event) || []
    handlers.push(handler)
    uaEventHandlers.set(event, handlers)
    return this
  }

  off(event: string, handler: Function) {
    const handlers = uaEventHandlers.get(event) || []
    const index = handlers.indexOf(handler)
    if (index > -1) handlers.splice(index, 1)
    return this
  }

  once(event: string, handler: Function) {
    const wrappedHandler = (...args: unknown[]) => {
      this.off(event, wrappedHandler)
      handler(...args)
    }
    return this.on(event, wrappedHandler)
  }

  // Helper to trigger events in tests
  __triggerEvent(event: string, data?: unknown) {
    const handlers = uaEventHandlers.get(event) || []
    handlers.forEach((handler) => handler(data))
  }
}

// Helper function to trigger UA events from outside MockUA
function triggerUAEvent(event: string, data?: unknown) {
  const handlers = uaEventHandlers.get(event) || []
  handlers.forEach((handler) => handler(data))
}

// Helper function to trigger session events (kept for potential future use)

function _triggerSessionEvent(sessionId: string, event: string, data?: unknown) {
  const handlers = sessionEventHandlers.get(sessionId)?.get(event) || []
  handlers.forEach((handler) => handler(data))
}

vi.mock('jssip', () => {
  const mod = {
    WebSocketInterface: MockWebSocketInterface,
    UA: MockUA,
    RTCSession: MockRTCSession,
    Message: MockMessage,
    version: '3.10.0',
    name: 'JsSIP',
    debug: {
      enable: vi.fn(),
      disable: vi.fn(),
    },
  }

  return {
    ...mod,
    default: mod,
  }
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('JsSIP Adapter Integration', () => {
  let sipConfig: SipClientConfig

  beforeEach(() => {
    vi.clearAllMocks()
    uaEventHandlers = new Map()
    sessionEventHandlers = new Map()
    createdSessions = []

    sipConfig = {
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:testuser@example.com',
      password: 'testpassword',
      displayName: 'Test User',
      authorizationUsername: 'testuser',
      registrationOptions: {
        expires: 300,
        autoRegister: false,
      },
      sessionOptions: {
        sessionTimers: true,
      },
    }
  })

  // ==========================================================================
  // AdapterFactory Integration Tests
  // ==========================================================================

  describe('AdapterFactory Integration', () => {
    it('should create and initialize adapter through factory', async () => {
      // Test the full factory -> adapter flow
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      // Verify adapter was created with correct metadata
      expect(adapter.adapterName).toBe('JsSIP Adapter')
      expect(adapter.libraryName).toBe('JsSIP')

      // Verify adapter is in initial state (initialized but not connected)
      expect(adapter.isConnected).toBe(false)
      expect(adapter.connectionState).toBe(ConnectionState.Disconnected)
      expect(adapter.isRegistered).toBe(false)
      expect(adapter.registrationState).toBe(RegistrationState.Unregistered)

      // Cleanup
      await adapter.destroy()
    })

    it('should create adapter using convenience function', async () => {
      // Test createSipAdapter() convenience function
      const adapter = await createSipAdapter(sipConfig)

      expect(adapter.adapterName).toBe('JsSIP Adapter')
      expect(adapter.connectionState).toBe(ConnectionState.Disconnected)

      await adapter.destroy()
    })

    it('should check library availability before creation', async () => {
      // Test isLibraryAvailable() + createAdapter() flow
      const isAvailable = await AdapterFactory.isLibraryAvailable('jssip')
      expect(isAvailable).toBe(true)

      if (isAvailable) {
        const adapter = await AdapterFactory.createAdapter(sipConfig, {
          library: 'jssip',
        })
        expect(adapter).toBeDefined()
        await adapter.destroy()
      }
    })

    it('should get adapter info without full initialization', async () => {
      const info = await AdapterFactory.getAdapterInfo('jssip')

      expect(info).not.toBeNull()
      expect(info?.adapterName).toBe('JsSIP Adapter')
      expect(info?.libraryName).toBe('JsSIP')
      expect(info?.libraryVersion).toMatch(/^3\.\d+\.\d+$/)
    })

    it('should list available libraries', async () => {
      const libraries = await AdapterFactory.getAvailableLibraries()

      expect(libraries).toContain('jssip')
      expect(Array.isArray(libraries)).toBe(true)
    })

    it('should pass library options through factory', async () => {
      const libraryOptions = { debug: true, timeout: 30000 }

      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
        libraryOptions,
      })

      // Adapter should be created successfully with options
      expect(adapter.adapterName).toBe('JsSIP Adapter')

      await adapter.destroy()
    })
  })

  // ==========================================================================
  // Call Session Integration Tests
  // ==========================================================================

  describe('Call Session Integration', () => {
    it('should create call session when making outgoing call', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      // Connect first
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      // Make outgoing call
      const session = await adapter.call('sip:target@example.com')

      // Verify ICallSession was returned
      expect(session).toBeDefined()
      expect(session.id).toBeDefined()
      expect(session.direction).toBe(CallDirection.Outgoing)
      expect(session.remoteUri).toContain('test.com')

      // Verify session is tracked
      const activeCalls = adapter.getActiveCalls()
      expect(activeCalls.length).toBe(1)
      expect(activeCalls[0].id).toBe(session.id)

      await adapter.destroy()
    })

    it('should emit call:incoming with ICallSession when receiving call', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      // Setup incoming call handler
      const incomingHandler = vi.fn()
      adapter.on('call:incoming', incomingHandler)

      // Connect
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      // Simulate incoming call
      const mockSession = new MockRTCSession('incoming', 'incoming-session-123')
      mockSession.remote_identity = {
        uri: { toString: () => 'sip:caller@external.com' },
        display_name: 'External Caller',
      }

      triggerUAEvent('newRTCSession', {
        originator: 'remote',
        session: mockSession,
      })

      // Verify event was emitted with proper session
      expect(incomingHandler).toHaveBeenCalledTimes(1)
      const eventData = incomingHandler.mock.calls[0][0]
      expect(eventData.session).toBeDefined()
      expect(eventData.session.id).toBe('incoming-session-123')
      expect(eventData.session.direction).toBe(CallDirection.Incoming)

      // Verify session is tracked
      const activeCalls = adapter.getActiveCalls()
      expect(activeCalls.length).toBe(1)

      await adapter.destroy()
    })

    it('should emit call:outgoing event when making call', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      const outgoingHandler = vi.fn()
      adapter.on('call:outgoing', outgoingHandler)

      // Connect
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      // Make call
      const session = await adapter.call('sip:target@example.com')

      // Verify event
      expect(outgoingHandler).toHaveBeenCalledTimes(1)
      expect(outgoingHandler).toHaveBeenCalledWith({ session })

      await adapter.destroy()
    })

    it('should track multiple concurrent calls correctly', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      // Connect
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      // Make first outgoing call
      const session1 = await adapter.call('sip:user1@example.com')

      // Simulate incoming call
      const mockIncoming = new MockRTCSession('incoming', 'incoming-concurrent')
      triggerUAEvent('newRTCSession', {
        originator: 'remote',
        session: mockIncoming,
      })

      // Make second outgoing call
      const session2 = await adapter.call('sip:user2@example.com')

      // Verify all calls are tracked
      const activeCalls = adapter.getActiveCalls()
      expect(activeCalls.length).toBe(3)

      // Verify getCallSession works for each
      expect(adapter.getCallSession(session1.id)).not.toBeNull()
      expect(adapter.getCallSession('incoming-concurrent')).not.toBeNull()
      expect(adapter.getCallSession(session2.id)).not.toBeNull()

      // Verify non-existent session returns null
      expect(adapter.getCallSession('non-existent')).toBeNull()

      await adapter.destroy()
    })

    it('should propagate call session events correctly', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      // Connect
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      // Make call
      const session = await adapter.call('sip:target@example.com')

      // Setup session event handlers
      const progressHandler = vi.fn()
      const acceptedHandler = vi.fn()
      const endedHandler = vi.fn()

      session.on('progress', progressHandler)
      session.on('accepted', acceptedHandler)
      session.on('ended', endedHandler)

      // Simulate call progress through the underlying mock session
      const mockSession = createdSessions.find((s) => s.id === session.id)
      expect(mockSession).toBeDefined()

      // Trigger progress event
      mockSession!.__triggerEvent('progress', {
        originator: 'remote',
        response: { status_code: 180, reason_phrase: 'Ringing' },
      })
      expect(progressHandler).toHaveBeenCalledWith({
        statusCode: 180,
        reasonPhrase: 'Ringing',
      })

      // Trigger accepted event
      mockSession!.__triggerEvent('accepted')
      expect(acceptedHandler).toHaveBeenCalled()

      // Verify state transition
      expect(session.state).toBe(CallState.Active)

      await adapter.destroy()
    })
  })

  // ==========================================================================
  // Full Lifecycle Integration Tests
  // ==========================================================================

  describe('Full Lifecycle Integration', () => {
    it('should handle complete call flow: connect -> register -> call -> terminate -> disconnect', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      // Track all events
      const events: string[] = []
      const trackEvent = (name: string) => () => events.push(name)

      adapter.on('connection:connecting', trackEvent('connection:connecting'))
      adapter.on('connection:connected', trackEvent('connection:connected'))
      adapter.on('registration:registering', trackEvent('registration:registering'))
      adapter.on('registration:registered', trackEvent('registration:registered'))
      adapter.on('call:outgoing', trackEvent('call:outgoing'))
      adapter.on('connection:disconnected', trackEvent('connection:disconnected'))

      // 1. Connect
      expect(adapter.connectionState).toBe(ConnectionState.Disconnected)
      const connectPromise = adapter.connect()
      expect(adapter.connectionState).toBe(ConnectionState.Connecting)
      expect(events).toContain('connection:connecting')

      triggerUAEvent('connected')
      await connectPromise

      expect(adapter.connectionState).toBe(ConnectionState.Connected)
      expect(adapter.isConnected).toBe(true)
      expect(events).toContain('connection:connected')

      // 2. Register
      const registerPromise = adapter.register()
      expect(events).toContain('registration:registering')

      triggerUAEvent('registered', {
        response: { getHeader: (name: string) => (name === 'Expires' ? '300' : undefined) },
      })
      await registerPromise

      expect(adapter.registrationState).toBe(RegistrationState.Registered)
      expect(adapter.isRegistered).toBe(true)
      expect(events).toContain('registration:registered')

      // 3. Make Call
      const session = await adapter.call('sip:target@example.com')
      expect(events).toContain('call:outgoing')
      expect(session).toBeDefined()
      expect(adapter.getActiveCalls().length).toBe(1)

      // 4. Simulate call establishment
      const mockSession = createdSessions.find((s) => s.id === session.id)!
      mockSession.__triggerEvent('accepted')
      expect(session.state).toBe(CallState.Active)

      // 5. Terminate call
      await session.terminate()
      expect(mockSession.terminate).toHaveBeenCalled()

      // Simulate call ended
      mockSession.__triggerEvent('ended', {
        originator: 'local',
        cause: 'Terminated',
        message: { status_code: 200 },
      })
      expect(session.state).toBe(CallState.Terminated)

      // 6. Cleanup
      triggerUAEvent('unregistered')
      await adapter.destroy()

      // Verify complete flow - check all expected events occurred in order
      // Note: Some events may fire multiple times due to adapter internals
      expect(events).toContain('connection:connecting')
      expect(events).toContain('connection:connected')
      expect(events).toContain('registration:registering')
      expect(events).toContain('registration:registered')
      expect(events).toContain('call:outgoing')

      // Verify order: connection events should come before registration events
      const connectingIndex = events.indexOf('connection:connecting')
      const connectedIndex = events.indexOf('connection:connected')
      const registeringIndex = events.indexOf('registration:registering')
      const registeredIndex = events.indexOf('registration:registered')
      const outgoingIndex = events.indexOf('call:outgoing')

      expect(connectingIndex).toBeLessThan(connectedIndex)
      expect(connectedIndex).toBeLessThan(registeringIndex)
      expect(registeringIndex).toBeLessThan(registeredIndex)
      expect(registeredIndex).toBeLessThan(outgoingIndex)
    })

    it('should handle connection failure gracefully', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      const failedHandler = vi.fn()
      adapter.on('connection:failed', failedHandler)

      // Start connection
      const connectPromise = adapter.connect()

      // Simulate connection failure
      triggerUAEvent('disconnected')

      // Connection should reject
      await expect(connectPromise).rejects.toThrow('Connection failed')

      // Verify error event was emitted
      expect(failedHandler).toHaveBeenCalledWith({
        error: expect.any(Error),
      })

      // After connection failure, state should be ConnectionFailed
      expect(adapter.connectionState).toBe(ConnectionState.ConnectionFailed)

      await adapter.destroy()
    })

    it('should handle registration failure gracefully', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      const failedHandler = vi.fn()
      adapter.on('registration:failed', failedHandler)

      // Connect first
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      // Start registration
      const registerPromise = adapter.register()

      // Simulate registration failure
      triggerUAEvent('registrationFailed', {
        cause: 'Unauthorized',
        response: { status_code: 401 },
      })

      // Registration should reject
      await expect(registerPromise).rejects.toThrow()

      // Verify error event was emitted
      expect(failedHandler).toHaveBeenCalledWith({
        error: expect.any(Error),
        statusCode: 401,
      })

      // After registration failure, state should be RegistrationFailed
      expect(adapter.registrationState).toBe(RegistrationState.RegistrationFailed)

      await adapter.destroy()
    })

    it('should handle incoming message events', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      const messageHandler = vi.fn()
      adapter.on('message:received', messageHandler)

      // Connect
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      // Simulate incoming message
      triggerUAEvent('newMessage', {
        originator: 'remote',
        request: {
          from: { uri: { toString: () => 'sip:sender@example.com' } },
        },
        message: {
          body: 'Hello from integration test!',
          content_type: 'text/plain',
        },
      })

      // Verify message event
      expect(messageHandler).toHaveBeenCalledWith({
        from: 'sip:sender@example.com',
        content: 'Hello from integration test!',
        contentType: 'text/plain',
      })

      await adapter.destroy()
    })

    it('should cleanup all resources on destroy', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      // Connect and create some calls
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      await adapter.call('sip:user1@example.com')
      await adapter.call('sip:user2@example.com')

      expect(adapter.getActiveCalls().length).toBe(2)

      // Destroy should cleanup everything
      await adapter.destroy()

      expect(adapter.getActiveCalls()).toEqual([])
    })

    it('should handle unregister flow correctly', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      const unregisteredHandler = vi.fn()
      adapter.on('registration:unregistered', unregisteredHandler)

      // Connect and register
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      const registerPromise = adapter.register()
      triggerUAEvent('registered', {
        response: { getHeader: () => '300' },
      })
      await registerPromise

      expect(adapter.isRegistered).toBe(true)

      // Unregister
      const unregisterPromise = adapter.unregister()
      triggerUAEvent('unregistered')
      await unregisterPromise

      expect(adapter.isRegistered).toBe(false)
      expect(adapter.registrationState).toBe(RegistrationState.Unregistered)
      expect(unregisteredHandler).toHaveBeenCalled()

      await adapter.destroy()
    })
  })

  // ==========================================================================
  // Call Session State Management Tests
  // ==========================================================================

  describe('Call Session State Management', () => {
    it('should track call state transitions correctly', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      // Connect
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      // Make call
      const session = await adapter.call('sip:target@example.com')
      const mockSession = createdSessions.find((s) => s.id === session.id)!

      // Initial state for outgoing call
      expect(session.state).toBe(CallState.Calling)

      // Progress to ringing
      mockSession.__triggerEvent('progress', {
        originator: 'remote',
        response: { status_code: 180, reason_phrase: 'Ringing' },
      })
      expect(session.state).toBe(CallState.Ringing)

      // Accept call
      mockSession.__triggerEvent('accepted')
      expect(session.state).toBe(CallState.Active)
      expect(session.startTime).not.toBeNull()

      // Hold
      mockSession.__triggerEvent('hold', { originator: 'local' })
      expect(session.state).toBe(CallState.Held)
      expect(session.isOnHold).toBe(true)

      // Unhold
      mockSession.__triggerEvent('unhold', { originator: 'local' })
      expect(session.state).toBe(CallState.Active)
      expect(session.isOnHold).toBe(false)

      // End call
      mockSession.__triggerEvent('ended', {
        originator: 'remote',
        cause: 'Terminated',
      })
      expect(session.state).toBe(CallState.Terminated)
      expect(session.endTime).not.toBeNull()
      expect(session.duration).toBeGreaterThanOrEqual(0)

      await adapter.destroy()
    })

    it('should handle failed call correctly', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      // Connect
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      // Make call
      const session = await adapter.call('sip:target@example.com')
      const mockSession = createdSessions.find((s) => s.id === session.id)!

      const failedHandler = vi.fn()
      session.on('failed', failedHandler)

      // Simulate call failure
      mockSession.__triggerEvent('failed', {
        originator: 'remote',
        cause: 'Busy',
        message: { status_code: 486 },
      })

      expect(session.state).toBe(CallState.Failed)
      expect(failedHandler).toHaveBeenCalledWith({
        cause: 'Busy',
        statusCode: 486,
      })

      await adapter.destroy()
    })

    it('should handle mute/unmute correctly', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      // Connect
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      // Make call
      const session = await adapter.call('sip:target@example.com')
      const mockSession = createdSessions.find((s) => s.id === session.id)!

      // Accept call first
      mockSession.__triggerEvent('accepted')

      const mutedHandler = vi.fn()
      const unmutedHandler = vi.fn()
      session.on('muted', mutedHandler)
      session.on('unmuted', unmutedHandler)

      // Mute
      await session.mute()
      mockSession.__triggerEvent('muted')

      expect(session.isMuted).toBe(true)
      expect(mutedHandler).toHaveBeenCalled()

      // Unmute
      await session.unmute()
      mockSession.__triggerEvent('unmuted')

      expect(session.isMuted).toBe(false)
      expect(unmutedHandler).toHaveBeenCalled()

      await adapter.destroy()
    })

    it('should handle DTMF through adapter and session', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      // Connect
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      // Make call
      const session = await adapter.call('sip:target@example.com')
      const mockSession = createdSessions.find((s) => s.id === session.id)!

      // Accept call first
      mockSession.__triggerEvent('accepted')

      // Send DTMF through session
      await session.sendDTMF('5')
      expect(mockSession.sendDTMF).toHaveBeenCalledWith('5', expect.any(Object))

      // Send DTMF through adapter
      await adapter.sendDTMF(session.id, '1234#')
      // The adapter delegates to session.sendDTMF

      await adapter.destroy()
    })
  })

  // ==========================================================================
  // Error Handling Integration Tests
  // ==========================================================================

  describe('Error Handling Integration', () => {
    it('should throw when calling before connect', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      await expect(adapter.call('sip:target@example.com')).rejects.toThrow('Not connected')

      await adapter.destroy()
    })

    it('should throw when sending message before connect', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      await expect(adapter.sendMessage('sip:target@example.com', 'Hello')).rejects.toThrow(
        'Not connected'
      )

      await adapter.destroy()
    })

    it('should throw when sending DTMF for non-existent call', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      // Connect first
      const connectPromise = adapter.connect()
      triggerUAEvent('connected')
      await connectPromise

      await expect(adapter.sendDTMF('non-existent-call-id', '5')).rejects.toThrow(
        'Call session not found'
      )

      await adapter.destroy()
    })

    it('should handle adapter not supported errors for presence operations', async () => {
      const adapter = await AdapterFactory.createAdapter(sipConfig, {
        library: 'jssip',
      })

      // JsSIP doesn't support presence operations
      await expect(adapter.subscribe('sip:user@example.com', 'presence')).rejects.toThrow(
        'subscribe is not supported by JsSIP Adapter'
      )

      await expect(adapter.unsubscribe('sip:user@example.com', 'presence')).rejects.toThrow(
        'unsubscribe is not supported by JsSIP Adapter'
      )

      await expect(adapter.publish('presence', { status: 'available' })).rejects.toThrow(
        'publish is not supported by JsSIP Adapter'
      )

      await adapter.destroy()
    })
  })
})
