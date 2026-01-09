/**
 * MockSipServer - Event-driven SIP server mock for E2E tests
 *
 * This replaces the timing-based mock with a proper event-driven
 * implementation that correctly simulates SIP protocol behavior.
 *
 * Includes network simulation capabilities for testing:
 * - Latency simulation (configurable delay)
 * - Packet loss simulation (random message drops)
 * - Offline mode simulation (complete block)
 * - Network presets (4G, 3G, 2G, EDGE, OFFLINE)
 */

import { EventBridge, initializeEventBridge, type SipEventType } from './EventBridge'

/**
 * Network condition presets for common scenarios
 */
export const NETWORK_PRESETS = {
  /** Fast 4G: ~50ms latency, 0% packet loss */
  FAST_4G: { latency: 50, jitter: 10, packetLoss: 0 },
  /** Slow 3G: ~300ms latency, 1% packet loss */
  SLOW_3G: { latency: 300, jitter: 100, packetLoss: 0.01 },
  /** 2G/EDGE: ~800ms latency, 3% packet loss */
  EDGE_2G: { latency: 800, jitter: 200, packetLoss: 0.03 },
  /** Lossy network: ~100ms latency, 10% packet loss */
  LOSSY_NETWORK: { latency: 100, jitter: 50, packetLoss: 0.1 },
  /** Crowded network: variable latency, 5% packet loss */
  CROWDED: { latency: 400, jitter: 300, packetLoss: 0.05 },
  /** Completely offline */
  OFFLINE: { latency: 0, jitter: 0, packetLoss: 1.0, offline: true },
} as const

/**
 * Network simulation configuration
 */
export interface NetworkConfig {
  /** Base latency in milliseconds */
  latency: number
  /** Random jitter added to latency (0-jitter ms) */
  jitter: number
  /** Packet loss rate (0.0 - 1.0) */
  packetLoss: number
  /** If true, completely blocks all communication */
  offline?: boolean
}

/**
 * Global network simulation state
 * Shared across all MockSipWebSocket instances
 */
class NetworkSimulatorState {
  private static instance: NetworkSimulatorState
  private config: NetworkConfig = { latency: 0, jitter: 0, packetLoss: 0 }
  private listeners: Set<() => void> = new Set()

  static getInstance(): NetworkSimulatorState {
    if (!NetworkSimulatorState.instance) {
      NetworkSimulatorState.instance = new NetworkSimulatorState()
    }
    return NetworkSimulatorState.instance
  }

  getConfig(): NetworkConfig {
    return { ...this.config }
  }

  setConfig(config: Partial<NetworkConfig>): void {
    this.config = { ...this.config, ...config }
    this.notifyListeners()
  }

  setPreset(preset: keyof typeof NETWORK_PRESETS): void {
    this.config = { ...NETWORK_PRESETS[preset] }
    this.notifyListeners()
  }

  reset(): void {
    this.config = { latency: 0, jitter: 0, packetLoss: 0 }
    this.notifyListeners()
  }

  isOffline(): boolean {
    return this.config.offline === true || this.config.packetLoss >= 1.0
  }

  /**
   * Calculate actual latency with jitter
   */
  getLatency(): number {
    const jitter = this.config.jitter > 0 ? Math.random() * this.config.jitter : 0
    return this.config.latency + jitter
  }

  /**
   * Check if a packet should be dropped based on packet loss rate
   */
  shouldDropPacket(): boolean {
    return Math.random() < this.config.packetLoss
  }

  addListener(listener: () => void): void {
    this.listeners.add(listener)
  }

  removeListener(listener: () => void): void {
    this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l())
  }
}

/**
 * Network Simulator - Controls network conditions for all mock WebSockets
 *
 * Usage in tests:
 * ```typescript
 * // Set specific conditions
 * NetworkSimulator.setLatency(500)
 * NetworkSimulator.setPacketLoss(0.1)
 *
 * // Or use a preset
 * NetworkSimulator.setPreset('SLOW_3G')
 *
 * // Go offline
 * NetworkSimulator.setOffline(true)
 *
 * // Reset to normal
 * NetworkSimulator.reset()
 * ```
 */
export const NetworkSimulator = {
  /**
   * Set network latency in milliseconds
   */
  setLatency(ms: number, jitter = 0): void {
    NetworkSimulatorState.getInstance().setConfig({ latency: ms, jitter })
  },

  /**
   * Set packet loss rate (0.0 - 1.0)
   */
  setPacketLoss(rate: number): void {
    NetworkSimulatorState.getInstance().setConfig({ packetLoss: Math.max(0, Math.min(1, rate)) })
  },

  /**
   * Set offline mode
   */
  setOffline(offline: boolean): void {
    NetworkSimulatorState.getInstance().setConfig({ offline })
  },

  /**
   * Apply a network preset
   */
  setPreset(preset: keyof typeof NETWORK_PRESETS): void {
    NetworkSimulatorState.getInstance().setPreset(preset)
  },

  /**
   * Set custom network configuration
   */
  setConfig(config: Partial<NetworkConfig>): void {
    NetworkSimulatorState.getInstance().setConfig(config)
  },

  /**
   * Get current network configuration
   */
  getConfig(): NetworkConfig {
    return NetworkSimulatorState.getInstance().getConfig()
  },

  /**
   * Check if currently offline
   */
  isOffline(): boolean {
    return NetworkSimulatorState.getInstance().isOffline()
  },

  /**
   * Reset to ideal network conditions
   */
  reset(): void {
    NetworkSimulatorState.getInstance().reset()
  },

  /**
   * Add listener for network config changes
   */
  onConfigChange(listener: () => void): () => void {
    NetworkSimulatorState.getInstance().addListener(listener)
    return () => NetworkSimulatorState.getInstance().removeListener(listener)
  },
}

/**
 * SIP message types for protocol simulation
 */
export interface SipMessage {
  method?: string
  statusCode?: number
  statusText?: string
  headers: Record<string, string>
  body?: string
  callId?: string
  cseq?: string
  from?: string
  to?: string
  via?: string
}

/**
 * Mock WebSocket that simulates SIP over WebSocket behavior
 * Includes network simulation for testing under various conditions
 */
export class MockSipWebSocket {
  readonly url: string
  readonly protocol: string = 'sip'
  readyState: number = WebSocket.CONNECTING
  binaryType: BinaryType = 'blob'

  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  private eventBridge: EventBridge
  private messageQueue: string[] = []
  private currentCallId: string | null = null
  private registrationCSeq = 0
  private inviteCSeq = 0
  private networkState = NetworkSimulatorState.getInstance()
  private networkConfigUnsubscribe: (() => void) | null = null

  constructor(url: string | URL, _protocols?: string | string[]) {
    this.url = typeof url === 'string' ? url : url.toString()

    // Initialize or get existing event bridge
    this.eventBridge = initializeEventBridge()

    // Listen for network config changes (e.g., going offline)
    this.networkConfigUnsubscribe = NetworkSimulator.onConfigChange(() => {
      this.handleNetworkChange()
    })

    // Simulate connection with minimal delay (respecting network conditions)
    this.scheduleOpen()
  }

  /**
   * Handle network configuration changes (e.g., going offline)
   */
  private handleNetworkChange(): void {
    if (this.networkState.isOffline() && this.readyState === WebSocket.OPEN) {
      // Simulate connection drop when going offline
      this.simulateConnectionError('Network offline')
    }
  }

  /**
   * Simulate a connection error
   */
  private simulateConnectionError(reason: string): void {
    if (this.readyState !== WebSocket.OPEN) return

    this.readyState = WebSocket.CLOSING
    this.eventBridge.emit('connection:disconnecting')

    queueMicrotask(() => {
      this.readyState = WebSocket.CLOSED
      this.eventBridge.emit('connection:disconnected')

      if (this.onerror) {
        this.onerror(new Event('error'))
      }

      if (this.onclose) {
        this.onclose(
          new CloseEvent('close', {
            code: 1006,
            reason: reason,
            wasClean: false,
          })
        )
      }
    })
  }

  private scheduleOpen(): void {
    // Check if we're offline - don't connect
    if (this.networkState.isOffline()) {
      queueMicrotask(() => {
        this.eventBridge.emit('connection:connecting')
        // Fail to connect when offline
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Event('error'))
          }
          this.readyState = WebSocket.CLOSED
          if (this.onclose) {
            this.onclose(
              new CloseEvent('close', {
                code: 1006,
                reason: 'Connection failed - network offline',
                wasClean: false,
              })
            )
          }
        }, 100)
      })
      return
    }

    // Apply latency to connection
    const latency = this.networkState.getLatency()

    const doOpen = () => {
      this.readyState = WebSocket.OPEN
      this.eventBridge.emit('connection:connecting')

      // Fire open event
      if (this.onopen) {
        this.onopen(new Event('open'))
      }

      this.eventBridge.emit('connection:connected')
    }

    if (latency > 0) {
      setTimeout(doOpen, latency)
    } else {
      queueMicrotask(doOpen)
    }
  }

  /**
   * Send a message through the mock WebSocket
   * Respects network simulation (packet loss, offline)
   */
  send(data: string | ArrayBuffer | Blob): void {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }

    // Check if offline - fail silently like a real network
    if (this.networkState.isOffline()) {
      // Messages are silently dropped when offline
      return
    }

    // Check for packet loss on outgoing messages
    if (this.networkState.shouldDropPacket()) {
      // Message dropped due to packet loss
      return
    }

    const message = typeof data === 'string' ? data : data.toString()
    this.handleOutgoingMessage(message)
  }

  /**
   * Handle outgoing SIP messages and generate appropriate responses
   */
  private handleOutgoingMessage(message: string): void {
    const parsed = this.parseSipMessage(message)

    if (parsed.method === 'REGISTER') {
      this.handleRegister(parsed)
    } else if (parsed.method === 'INVITE') {
      this.handleInvite(parsed)
    } else if (parsed.method === 'ACK') {
      this.handleAck(parsed)
    } else if (parsed.method === 'BYE') {
      this.handleBye(parsed)
    } else if (parsed.method === 'CANCEL') {
      this.handleCancel(parsed)
    } else if (parsed.method === 'INFO') {
      this.handleInfo(parsed)
    } else if (parsed.method === 'OPTIONS') {
      this.handleOptions(parsed)
    }
  }

  /**
   * Parse a SIP message string into structured format
   */
  private parseSipMessage(message: string): SipMessage {
    const lines = message.split('\r\n')
    const firstLine = lines[0]
    const headers: Record<string, string> = {}
    let body = ''
    let inBody = false

    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '') {
        inBody = true
        continue
      }
      if (inBody) {
        body += lines[i] + '\r\n'
      } else {
        const colonIndex = lines[i].indexOf(':')
        if (colonIndex > 0) {
          const key = lines[i].substring(0, colonIndex).trim().toLowerCase()
          const value = lines[i].substring(colonIndex + 1).trim()
          headers[key] = value
        }
      }
    }

    // Parse first line (request or response)
    const result: SipMessage = { headers, body: body.trim() }

    if (firstLine.startsWith('SIP/')) {
      // Response
      const parts = firstLine.split(' ')
      result.statusCode = parseInt(parts[1])
      result.statusText = parts.slice(2).join(' ')
    } else {
      // Request
      const parts = firstLine.split(' ')
      result.method = parts[0]
    }

    result.callId = headers['call-id']
    result.cseq = headers['cseq']
    result.from = headers['from']
    result.to = headers['to']
    result.via = headers['via']

    return result
  }

  /**
   * Handle REGISTER request
   */
  private handleRegister(request: SipMessage): void {
    this.registrationCSeq++
    this.eventBridge.emit('registration:registering')

    // Send 200 OK response for registration
    queueMicrotask(() => {
      const response = this.createResponse(200, 'OK', request, {
        contact: request.headers['contact'] || '<sip:user@localhost>',
        expires: '3600',
      })
      this.deliverMessage(response)
      this.eventBridge.emit('registration:registered')
    })
  }

  /**
   * Handle INVITE request (outgoing call)
   */
  private handleInvite(request: SipMessage): void {
    this.inviteCSeq++
    this.currentCallId = request.callId || `call-${Date.now()}`

    this.eventBridge.emit('call:initiating', {
      callId: this.currentCallId,
      direction: 'outgoing',
      remoteUri: request.to,
    })

    // Send 100 Trying
    queueMicrotask(() => {
      const trying = this.createResponse(100, 'Trying', request)
      this.deliverMessage(trying)
    })

    // Send 180 Ringing
    setTimeout(() => {
      const ringing = this.createResponse(180, 'Ringing', request)
      this.deliverMessage(ringing)
      this.eventBridge.emit('call:ringing', { callId: this.currentCallId })
    }, 10)

    // Send 200 OK with SDP
    setTimeout(() => {
      const ok = this.createResponse(200, 'OK', request, {
        contact: '<sip:remote@localhost>',
        'content-type': 'application/sdp',
      })
      const sdp = this.generateSdpAnswer()
      this.deliverMessage(ok + '\r\n' + sdp)
      this.eventBridge.emit('call:answered', { callId: this.currentCallId })
      this.eventBridge.emit('media:ready', { callId: this.currentCallId })
    }, 20)
  }

  /**
   * Handle ACK (acknowledgment of 200 OK)
   */
  private handleAck(_request: SipMessage): void {
    // ACK doesn't require a response
    // Call is now fully established
  }

  /**
   * Handle BYE request (end call)
   */
  private handleBye(request: SipMessage): void {
    queueMicrotask(() => {
      const response = this.createResponse(200, 'OK', request)
      this.deliverMessage(response)
      this.eventBridge.emit('call:ended', { callId: this.currentCallId })
      this.currentCallId = null
    })
  }

  /**
   * Handle CANCEL request
   */
  private handleCancel(request: SipMessage): void {
    queueMicrotask(() => {
      const response = this.createResponse(200, 'OK', request)
      this.deliverMessage(response)
      this.eventBridge.emit('call:ended', { callId: this.currentCallId, reason: 'cancelled' })
      this.currentCallId = null
    })
  }

  /**
   * Handle INFO request (DTMF)
   */
  private handleInfo(request: SipMessage): void {
    // Extract DTMF tone from body
    const toneMatch = request.body?.match(/Signal=(\d|[A-D*#])/i)
    const tone = toneMatch ? toneMatch[1] : ''

    queueMicrotask(() => {
      const response = this.createResponse(200, 'OK', request)
      this.deliverMessage(response)
      if (tone) {
        this.eventBridge.emit('dtmf:sent', { tone, callId: this.currentCallId })
      }
    })
  }

  /**
   * Handle OPTIONS request (keep-alive)
   */
  private handleOptions(request: SipMessage): void {
    queueMicrotask(() => {
      const response = this.createResponse(200, 'OK', request, {
        allow: 'INVITE,ACK,BYE,CANCEL,OPTIONS,INFO,REFER,SUBSCRIBE,NOTIFY',
        accept: 'application/sdp,application/dtmf-relay',
      })
      this.deliverMessage(response)
    })
  }

  /**
   * Create a SIP response message
   */
  private createResponse(
    statusCode: number,
    statusText: string,
    request: SipMessage,
    extraHeaders?: Record<string, string>
  ): string {
    const headers = [
      `SIP/2.0 ${statusCode} ${statusText}`,
      `Via: ${request.via}`,
      `From: ${request.from}`,
      `To: ${request.to}${statusCode >= 200 ? ';tag=mock-server-tag' : ''}`,
      `Call-ID: ${request.callId}`,
      `CSeq: ${request.cseq}`,
      'Server: VueSIP-Mock-Server/1.0',
      `Content-Length: 0`,
    ]

    if (extraHeaders) {
      for (const [key, value] of Object.entries(extraHeaders)) {
        headers.push(`${key}: ${value}`)
      }
    }

    return headers.join('\r\n') + '\r\n\r\n'
  }

  /**
   * Generate a mock SDP answer
   */
  private generateSdpAnswer(): string {
    return [
      'v=0',
      `o=- ${Date.now()} 1 IN IP4 127.0.0.1`,
      's=VueSIP Mock Session',
      'c=IN IP4 127.0.0.1',
      't=0 0',
      'm=audio 49170 RTP/AVP 0 8 101',
      'a=rtpmap:0 PCMU/8000',
      'a=rtpmap:8 PCMA/8000',
      'a=rtpmap:101 telephone-event/8000',
      'a=sendrecv',
    ].join('\r\n')
  }

  /**
   * Deliver a message to the WebSocket handlers
   * Respects network simulation (latency, packet loss, offline)
   */
  private deliverMessage(message: string): void {
    // Check if offline
    if (this.networkState.isOffline()) {
      return
    }

    // Check for packet loss on incoming messages
    if (this.networkState.shouldDropPacket()) {
      return
    }

    const doDeliver = () => {
      if (this.onmessage && this.readyState === WebSocket.OPEN) {
        this.onmessage(
          new MessageEvent('message', {
            data: message,
          })
        )
      }
    }

    // Apply latency
    const latency = this.networkState.getLatency()
    if (latency > 0) {
      setTimeout(doDeliver, latency)
    } else {
      doDeliver()
    }
  }

  /**
   * Simulate an incoming call from remote party
   */
  simulateIncomingCall(fromUri: string): void {
    this.currentCallId = `incoming-${Date.now()}`

    const invite = [
      `INVITE sip:user@localhost SIP/2.0`,
      `Via: SIP/2.0/WSS remote.server.com;branch=z9hG4bK${Date.now()}`,
      `From: <${fromUri}>;tag=remote-tag-${Date.now()}`,
      `To: <sip:user@localhost>`,
      `Call-ID: ${this.currentCallId}`,
      `CSeq: 1 INVITE`,
      `Contact: <${fromUri}>`,
      `Content-Type: application/sdp`,
      `Content-Length: 0`,
    ].join('\r\n')

    this.deliverMessage(invite + '\r\n\r\n')
    this.eventBridge.emit('call:incoming', {
      callId: this.currentCallId,
      direction: 'incoming',
      remoteUri: fromUri,
    })
  }

  /**
   * Simulate remote party ending the call
   */
  simulateRemoteHangup(): void {
    if (!this.currentCallId) return

    const bye = [
      `BYE sip:user@localhost SIP/2.0`,
      `Via: SIP/2.0/WSS remote.server.com;branch=z9hG4bK${Date.now()}`,
      `From: <sip:remote@example.com>;tag=remote-tag`,
      `To: <sip:user@localhost>;tag=local-tag`,
      `Call-ID: ${this.currentCallId}`,
      `CSeq: 2 BYE`,
    ].join('\r\n')

    this.deliverMessage(bye + '\r\n\r\n')
    this.eventBridge.emit('call:ended', { callId: this.currentCallId, reason: 'remote_hangup' })
    this.currentCallId = null
  }

  /**
   * Close the WebSocket connection
   */
  close(code?: number, reason?: string): void {
    if (this.readyState === WebSocket.CLOSED) return

    // Clean up network config listener
    if (this.networkConfigUnsubscribe) {
      this.networkConfigUnsubscribe()
      this.networkConfigUnsubscribe = null
    }

    this.readyState = WebSocket.CLOSING
    queueMicrotask(() => {
      this.readyState = WebSocket.CLOSED
      this.eventBridge.emit('connection:disconnected')
      this.eventBridge.emit('registration:unregistered')

      if (this.onclose) {
        this.onclose(
          new CloseEvent('close', {
            code: code || 1000,
            reason: reason || 'Normal closure',
            wasClean: true,
          })
        )
      }
    })
  }

  /**
   * Add event listener (for compatibility)
   */
  addEventListener(
    type: string,
    listener: EventListener | EventListenerObject | null,
    _options?: boolean | AddEventListenerOptions
  ): void {
    if (typeof listener === 'function') {
      switch (type) {
        case 'open':
          this.onopen = listener as (event: Event) => void
          break
        case 'close':
          this.onclose = listener as (event: CloseEvent) => void
          break
        case 'message':
          this.onmessage = listener as (event: MessageEvent) => void
          break
        case 'error':
          this.onerror = listener as (event: Event) => void
          break
      }
    }
  }

  /**
   * Remove event listener (for compatibility)
   */
  removeEventListener(
    type: string,
    _listener: EventListener | EventListenerObject | null,
    _options?: boolean | EventListenerOptions
  ): void {
    switch (type) {
      case 'open':
        this.onopen = null
        break
      case 'close':
        this.onclose = null
        break
      case 'message':
        this.onmessage = null
        break
      case 'error':
        this.onerror = null
        break
    }
  }

  /**
   * Dispatch event (for compatibility)
   */
  dispatchEvent(_event: Event): boolean {
    return true
  }

  // Static constants for WebSocket states
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  // Instance constants
  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3
}

/**
 * Mock RTCPeerConnection for WebRTC
 */
export class MockRTCPeerConnection {
  localDescription: RTCSessionDescription | null = null
  remoteDescription: RTCSessionDescription | null = null
  connectionState: RTCPeerConnectionState = 'new'
  iceConnectionState: RTCIceConnectionState = 'new'
  iceGatheringState: RTCIceGatheringState = 'new'
  signalingState: RTCSignalingState = 'stable'

  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null
  ontrack: ((event: RTCTrackEvent) => void) | null = null
  onconnectionstatechange: (() => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null

  private localStreams: MediaStream[] = []
  private remoteStreams: MediaStream[] = []

  constructor(_configuration?: RTCConfiguration) {}

  async createOffer(_options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
    return {
      type: 'offer',
      sdp: this.generateMockSdp(),
    }
  }

  async createAnswer(_options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    return {
      type: 'answer',
      sdp: this.generateMockSdp(),
    }
  }

  async setLocalDescription(description?: RTCLocalSessionDescriptionInit): Promise<void> {
    this.localDescription = new RTCSessionDescription(description as RTCSessionDescriptionInit)
    this.signalingState = description?.type === 'offer' ? 'have-local-offer' : 'stable'

    // Simulate ICE gathering completion
    queueMicrotask(() => {
      this.iceGatheringState = 'complete'
      if (this.onicecandidate) {
        this.onicecandidate({ candidate: null } as RTCPeerConnectionIceEvent)
      }
    })
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = new RTCSessionDescription(description)
    this.signalingState = 'stable'

    // Simulate connection establishment
    queueMicrotask(() => {
      this.iceConnectionState = 'connected'
      this.connectionState = 'connected'
      this.oniceconnectionstatechange?.()
      this.onconnectionstatechange?.()

      // Simulate receiving remote track
      if (this.ontrack) {
        const mockStream = new MediaStream()
        this.remoteStreams.push(mockStream)
        this.ontrack({
          track: mockStream.getTracks()[0] || ({} as MediaStreamTrack),
          streams: [mockStream],
          receiver: {} as RTCRtpReceiver,
          transceiver: {} as RTCRtpTransceiver,
        } as RTCTrackEvent)
      }
    })
  }

  addTrack(track: MediaStreamTrack, ...streams: MediaStream[]): RTCRtpSender {
    if (streams.length > 0) {
      this.localStreams.push(...streams)
    }
    return {} as RTCRtpSender
  }

  addStream(stream: MediaStream): void {
    this.localStreams.push(stream)
  }

  removeTrack(_sender: RTCRtpSender): void {}

  getLocalStreams(): MediaStream[] {
    return this.localStreams
  }

  getRemoteStreams(): MediaStream[] {
    return this.remoteStreams
  }

  getSenders(): RTCRtpSender[] {
    return []
  }

  getReceivers(): RTCRtpReceiver[] {
    return []
  }

  getTransceivers(): RTCRtpTransceiver[] {
    return []
  }

  async getStats(): Promise<RTCStatsReport> {
    return new Map() as unknown as RTCStatsReport
  }

  close(): void {
    this.connectionState = 'closed'
    this.iceConnectionState = 'closed'
    this.signalingState = 'closed'
    this.onconnectionstatechange?.()
    this.oniceconnectionstatechange?.()
  }

  private generateMockSdp(): string {
    return [
      'v=0',
      `o=- ${Date.now()} 1 IN IP4 127.0.0.1`,
      's=-',
      't=0 0',
      'a=group:BUNDLE 0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111 0',
      'c=IN IP4 0.0.0.0',
      'a=rtcp:9 IN IP4 0.0.0.0',
      'a=ice-ufrag:mock',
      'a=ice-pwd:mockpassword',
      'a=fingerprint:sha-256 00:00:00:00:00:00:00:00',
      'a=setup:actpass',
      'a=mid:0',
      'a=sendrecv',
      'a=rtpmap:111 opus/48000/2',
      'a=rtpmap:0 PCMU/8000',
    ].join('\r\n')
  }

  // For compatibility
  addEventListener(
    type: string,
    listener: EventListener | EventListenerObject | null,
    _options?: boolean | AddEventListenerOptions
  ): void {
    if (typeof listener === 'function') {
      switch (type) {
        case 'icecandidate':
          this.onicecandidate = listener as any
          break
        case 'track':
          this.ontrack = listener as any
          break
        case 'connectionstatechange':
          this.onconnectionstatechange = listener as any
          break
        case 'iceconnectionstatechange':
          this.oniceconnectionstatechange = listener as any
          break
      }
    }
  }

  removeEventListener(): void {}
  dispatchEvent(_event: Event): boolean {
    return true
  }
}

/**
 * Install mock implementations on the window object
 */
export function installMocks(): void {
  if (typeof window !== 'undefined') {
    ;(window as any).WebSocket = MockSipWebSocket
    ;(window as any).RTCPeerConnection = MockRTCPeerConnection
    ;(window as any).webkitRTCPeerConnection = MockRTCPeerConnection
    ;(window as any).mozRTCPeerConnection = MockRTCPeerConnection
  }
}

/**
 * Get the mock WebSocket instance (for test control)
 */
export function getMockWebSocket(): MockSipWebSocket | null {
  // This would need to be tracked when created
  return null
}

/**
 * Export types for test usage
 */
export type { SipEventType }
