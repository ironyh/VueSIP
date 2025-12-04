/**
 * E2E Test Fixtures
 *
 * Provides utilities and mocks for E2E testing
 */

import { test as base, Page } from '@playwright/test'

/**
 * Application URL with test harness enabled
 */
export const APP_URL = '/?test=true' as const

/**
 * Mock SIP server configuration
 */
export interface MockSipServerConfig {
  uri: string
  username: string
  password: string
  autoRegister?: boolean
}

/**
 * Mock media device
 */
export interface MockMediaDevice {
  deviceId: string
  kind: 'audioinput' | 'audiooutput' | 'videoinput'
  label: string
  groupId: string
}

/**
 * Extended test fixtures
 */
export interface TestFixtures {
  /**
   * Configure mock SIP server responses
   */
  mockSipServer: (config?: Partial<MockSipServerConfig>) => Promise<void>

  /**
   * Configure mock media devices
   */
  mockMediaDevices: (devices?: MockMediaDevice[]) => Promise<void>

  /**
   * Simulate incoming call
   */
  simulateIncomingCall: (remoteUri: string) => Promise<void>

  /**
   * Configure SIP settings in the app
   */
  configureSip: (config: MockSipServerConfig) => Promise<void>

  /**
   * Wait until the device store reports enough devices
   */
  waitForDevices: (targets?: {
    audioInputs?: number
    audioOutputs?: number
    videoInputs?: number
  }) => Promise<void>

  /**
   * Wait for connection state
   */
  waitForConnectionState: (state: 'connected' | 'disconnected') => Promise<void>

  /**
   * Wait for registration state
   */
  waitForRegistrationState: (state: 'registered' | 'unregistered') => Promise<void>

  /**
   * Wait for call state
   * Accepts a single state or any of multiple states
   */
  waitForCallState: (state: string | string[]) => Promise<void>
}

/**
 * Default mock media devices
 */
export const defaultMockDevices: MockMediaDevice[] = [
  {
    deviceId: 'default-mic',
    kind: 'audioinput',
    label: 'Default Microphone',
    groupId: 'group1',
  },
  {
    deviceId: 'mic-2',
    kind: 'audioinput',
    label: 'External Microphone',
    groupId: 'group2',
  },
  {
    deviceId: 'default-speaker',
    kind: 'audiooutput',
    label: 'Default Speaker',
    groupId: 'group1',
  },
  {
    deviceId: 'speaker-2',
    kind: 'audiooutput',
    label: 'External Speaker',
    groupId: 'group2',
  },
  {
    deviceId: 'default-camera',
    kind: 'videoinput',
    label: 'Default Camera',
    groupId: 'group3',
  },
]

/**
 * SIP response delays (in milliseconds)
 * Optimized for faster test execution while maintaining realistic timing
 */
/**
 * CI-aware delay multiplier
 * CI environments are typically slower, so we increase delays by 2x
 */
const CI_DELAY_MULTIPLIER = process.env.CI ? 2 : 1

/**
 * SIP event delays (in milliseconds)
 * These are automatically adjusted for CI environments
 */
const SIP_DELAYS = {
  CONNECTION: 20 * CI_DELAY_MULTIPLIER,
  REGISTER_200: 30 * CI_DELAY_MULTIPLIER,
  INVITE_100: 20 * CI_DELAY_MULTIPLIER,
  INVITE_180: 50 * CI_DELAY_MULTIPLIER,
  INVITE_200: 50 * CI_DELAY_MULTIPLIER,
  BYE_200: 20 * CI_DELAY_MULTIPLIER,
  CANCEL_200: 20 * CI_DELAY_MULTIPLIER,
  ACK_PROCESS: 10 * CI_DELAY_MULTIPLIER,
  OPTIONS_200: 20 * CI_DELAY_MULTIPLIER,
}

/**
 * Parse SIP method from request (used in injected mock script)
 */

function _parseSipMethod(data: string): string | null {
  const lines = data.split('\r\n')
  if (lines.length === 0) return null
  const firstLine = lines[0]
  const parts = firstLine.split(' ')
  return parts.length > 0 ? parts[0] : null
}

/**
 * Extract Call-ID from SIP message (used in injected mock script)
 */

function _extractCallId(data: string): string {
  const match = data.match(/Call-ID:\s*(.+)/i)
  return match ? match[1].trim() : 'default-call-id'
}

/**
 * Extract CSeq number from SIP message (used in injected mock script)
 */

function _extractCSeq(data: string): string {
  const match = data.match(/CSeq:\s*(\d+)/i)
  return match ? match[1] : '1'
}

/**
 * Extract branch from Via header (used in injected mock script)
 */

function _extractBranch(data: string): string {
  const match = data.match(/branch=([^;\s]+)/i)
  return match ? match[1] : 'z9hG4bK123'
}

/**
 * Extract From tag (used in injected mock script)
 */

function _extractFromTag(data: string): string {
  const match = data.match(/From:.*tag=([^;\s]+)/i)
  return match ? match[1] : '123'
}

/**
 * Extract To URI (used in injected mock script)
 */

function _extractToUri(data: string): string {
  const match = data.match(/To:\s*<([^>]+)>/i)
  return match ? match[1] : 'sip:destination@example.com'
}

/**
 * Extract From URI (used in injected mock script)
 */

function _extractFromUri(data: string): string {
  const match = data.match(/From:\s*<([^>]+)>/i)
  return match ? match[1] : 'sip:testuser@example.com'
}

/**
 * Mock WebSocket responses with comprehensive SIP support
 */
export function mockWebSocketResponses(page: Page) {
  return page.addInitScript(
    ({ delays }: { delays: typeof SIP_DELAYS }) => {
      // Enable JsSIP debug mode for E2E tests (will be enabled when JsSIP loads)
      // We'll enable it after page loads since JsSIP might not be available yet
      if (typeof window !== 'undefined') {
        const enableJsSipDebug = () => {
          try {
            if ((window as any).JsSIP && (window as any).JsSIP.debug) {
              ;(window as any).JsSIP.debug.enable('JsSIP:*')
              console.log('[MockWebSocket] JsSIP debug enabled')
            }
          } catch (_e) {
            // JsSIP not loaded yet, will try again later
          }
        }
        // Try immediately
        enableJsSipDebug()
        // Also try after a delay
        setTimeout(enableJsSipDebug, 1000)
      }
      // Helper functions (injected into page context)
      const parseSipMethod = (data: string): string | null => {
        const lines = data.split('\r\n')
        if (lines.length === 0) return null
        const parts = lines[0].split(' ')
        return parts.length > 0 ? parts[0] : null
      }

      const extractCallId = (data: string): string => {
        const match = data.match(/Call-ID:\s*(.+)/i)
        return match ? match[1].trim() : 'default-call-id'
      }

      const extractCSeq = (data: string): string => {
        const match = data.match(/CSeq:\s*(\d+)/i)
        return match ? match[1] : '1'
      }

      const extractBranch = (data: string): string => {
        const match = data.match(/branch=([^;\s]+)/i)
        return match ? match[1] : 'z9hG4bK123'
      }

      const extractVia = (data: string): string | null => {
        const match = data.match(/Via:\s*(.+?)(?:\r\n|$)/i)
        return match ? match[1].trim() : null
      }

      const extractFromTag = (data: string): string => {
        const match = data.match(/From:.*tag=([^;\s]+)/i)
        return match ? match[1] : '123'
      }

      const extractToUri = (data: string): string => {
        const match = data.match(/To:\s*<([^>]+)>/i)
        return match ? match[1] : 'sip:destination@example.com'
      }

      const extractFromUri = (data: string): string => {
        const match = data.match(/From:\s*<([^>]+)>/i)
        return match ? match[1] : 'sip:testuser@example.com'
      }

      // Mock WebSocket implementation
      class MockWebSocket extends EventTarget {
        static CONNECTING = 0
        static OPEN = 1
        static CLOSING = 2
        static CLOSED = 3

        url: string
        protocol: string
        extensions = ''
        binaryType: BinaryType = 'blob'
        bufferedAmount = 0
        readyState = MockWebSocket.CONNECTING

        // Mirror constants on the instance (browser compatibility)
        CONNECTING = MockWebSocket.CONNECTING
        OPEN = MockWebSocket.OPEN
        CLOSING = MockWebSocket.CLOSING
        CLOSED = MockWebSocket.CLOSED

        onopen: ((event: Event) => void) | null = null
        onmessage: ((event: MessageEvent) => void) | null = null
        onclose: ((event: CloseEvent) => void) | null = null
        onerror: ((event: Event) => void) | null = null

        // Track active calls
        private activeCalls = new Map<string, any>()

        // Track messages for debugging
        receivedMessages: string[] = []
        sentMessages: string[] = []

        constructor(url: string, protocols?: string | string[]) {
          super()
          console.log('[MockWebSocket] Constructor called, url:', url, 'protocols:', protocols)
          this.url = url
          if (Array.isArray(protocols)) {
            this.protocol = protocols[0] || 'sip'
          } else if (typeof protocols === 'string') {
            this.protocol = protocols
          } else {
            this.protocol = 'sip'
          }

          // Simulate connection
          setTimeout(() => {
            this.readyState = MockWebSocket.OPEN
            const openEvent = new Event('open')
            this.emitEvent('open', openEvent)

            // Emit EventBridge event
            if (typeof (window as any).__emitSipEvent === 'function') {
              ;(window as any).__emitSipEvent('connection:connected')
            }

            // Also trigger 'message' event with empty data to help JsSIP detect connection
            // Some WebSocket implementations fire a message event on open
            setTimeout(() => {
              this.emitEvent('message', new MessageEvent('message', { data: '' }))
            }, 10)
          }, delays.CONNECTION)

          // Store instance globally for incoming call simulation
          // Only store SIP WebSocket, not Vite HMR or other WebSockets
          if (url && url.includes('sip.example.com')) {
            ;(window as any).__mockWebSocket = this
            console.log(
              '[MockWebSocket] Stored SIP WebSocket instance for incoming call simulation'
            )
          }

          // Also expose debug info
          ;(window as any).__mockWebSocketDebug = {
            getReceivedMessages: () => this.receivedMessages || [],
            getSentMessages: () => this.sentMessages || [],
          }

          // Initialize message tracking arrays
          this.receivedMessages = []
          this.sentMessages = []
        }

        private emitEvent(type: 'open' | 'message' | 'close' | 'error', event: Event) {
          console.debug('[MockWebSocket]', type, 'readyState:', this.readyState)
          this.dispatchEvent(event)
          const handler = (this as Record<string, any>)[`on${type}`]
          if (typeof handler === 'function') {
            handler.call(this, event)
          }
        }

        /**
         * Simulate an incoming INVITE from remote party
         */
        simulateIncomingInvite(fromUri: string, toUri: string) {
          console.log('[simulateIncomingInvite] Called with:', {
            fromUri,
            toUri,
            readyState: this.readyState,
          })
          if (this.readyState !== 1) {
            console.error(
              '[simulateIncomingInvite] WebSocket not open! ReadyState:',
              this.readyState
            )
            return
          }

          const callId = `incoming-call-${Date.now()}`
          const fromTag = `from-${Date.now()}`
          const branch = `z9hG4bK-incoming-${Date.now()}`

          const invite =
            `INVITE ${toUri} SIP/2.0\r\n` +
            `Via: SIP/2.0/WS fake;branch=${branch}\r\n` +
            `From: <${fromUri}>;tag=${fromTag}\r\n` +
            `To: <${toUri}>\r\n` +
            `Call-ID: ${callId}\r\n` +
            `CSeq: 1 INVITE\r\n` +
            `Contact: <${fromUri}>\r\n` +
            `Content-Type: application/sdp\r\n` +
            `Content-Length: 200\r\n\r\n` +
            `v=0\r\n` +
            `o=- 123456 654321 IN IP4 192.168.1.1\r\n` +
            `s=Incoming Call\r\n` +
            `c=IN IP4 192.168.1.1\r\n` +
            `t=0 0\r\n` +
            `m=audio 50000 RTP/AVP 0 8 101\r\n` +
            `a=rtpmap:0 PCMU/8000\r\n` +
            `a=rtpmap:8 PCMA/8000\r\n` +
            `a=rtpmap:101 telephone-event/8000\r\n`

          console.log('[simulateIncomingInvite] Emitting INVITE message')
          this.emitEvent('message', new MessageEvent('message', { data: invite }))
        }

        send(data: string) {
          if (this.readyState !== MockWebSocket.OPEN) {
            const errorEvent = new Event('error')
            this.emitEvent('error', errorEvent)
            return
          }

          // Track received messages
          this.receivedMessages.push(data.substring(0, 200)) // Store first 200 chars

          const method = parseSipMethod(data)
          const callId = extractCallId(data)
          const cseq = extractCSeq(data)
          const branch = extractBranch(data)
          const fromTag = extractFromTag(data)
          const via = extractVia(data)

          // Log full INVITE request for debugging
          if (method === 'INVITE') {
            console.log('[MockWebSocket] ===== INVITE REQUEST RECEIVED =====')
            console.log('[MockWebSocket] Full request (first 800 chars):')
            console.log(data.substring(0, 800))
            console.log('[MockWebSocket] Extracted values:', {
              callId,
              cseq,
              branch,
              fromTag,
              via: via?.substring(0, 150),
              hasVia: !!via,
            })
            // Log Via header lines specifically
            const viaLines = data
              .split('\r\n')
              .filter((line) => line.toLowerCase().startsWith('via:'))
            console.log('[MockWebSocket] Via header lines from request:', viaLines)
            if (via) {
              console.log('[MockWebSocket] Extracted Via header:', via)
            }
          } else {
            console.log('[MockWebSocket] Received:', method, { callId, cseq, branch })
          }

          // Handle different SIP methods
          switch (method) {
            case 'REGISTER':
              this.handleRegister(data, callId, cseq, branch, fromTag, via)
              break
            case 'INVITE':
              this.handleInvite(data, callId, cseq, branch, fromTag, via)
              break
            case 'BYE':
              this.handleBye(data, callId, cseq, branch)
              break
            case 'CANCEL':
              this.handleCancel(data, callId, cseq, branch)
              break
            case 'ACK':
              this.handleAck(data, callId)
              break
            case 'OPTIONS':
              this.handleOptions(data, callId, cseq, branch)
              break
            case 'UPDATE':
              this.handleUpdate(data, callId, cseq, branch)
              break
            case 'INFO':
              this.handleInfo(data, callId, cseq, branch)
              break
            default:
              console.log('Mock WS: Unhandled SIP method:', method)
          }
        }

        private handleRegister(
          data: string,
          callId: string,
          cseq: string,
          branch: string,
          fromTag: string,
          via: string | null
        ) {
          setTimeout(() => {
            const fromUri = extractFromUri(data)
            const viaHeader = via || `SIP/2.0/WS fake;branch=${branch}`
            const response =
              `SIP/2.0 200 OK\r\n` +
              `Via: ${viaHeader}\r\n` +
              `From: <${fromUri}>;tag=${fromTag}\r\n` +
              `To: <${fromUri}>;tag=server-${Date.now()}\r\n` +
              `Call-ID: ${callId}\r\n` +
              `CSeq: ${cseq} REGISTER\r\n` +
              `Contact: <${fromUri}>;expires=600\r\n` +
              `Content-Length: 0\r\n\r\n`

            this.emitEvent('message', new MessageEvent('message', { data: response }))

            // Emit EventBridge event
            if (typeof (window as any).__emitSipEvent === 'function') {
              ;(window as any).__emitSipEvent('registration:registered')
            }
          }, delays.REGISTER_200)
        }

        private handleInvite(
          data: string,
          callId: string,
          cseq: string,
          branch: string,
          fromTag: string,
          via: string | null
        ) {
          const fromUri = extractFromUri(data)
          const toUri = extractToUri(data)
          const toTag = `to-${Date.now()}`

          // Store call info
          this.activeCalls.set(callId, { fromUri, toUri, fromTag, toTag })

          // Send 100 Trying
          setTimeout(() => {
            const viaHeader = via || `SIP/2.0/WS fake;branch=${branch}`
            const trying =
              `SIP/2.0 100 Trying\r\n` +
              `Via: ${viaHeader}\r\n` +
              `From: <${fromUri}>;tag=${fromTag}\r\n` +
              `To: <${toUri}>\r\n` +
              `Call-ID: ${callId}\r\n` +
              `CSeq: ${cseq} INVITE\r\n` +
              `Content-Length: 0\r\n\r\n`

            console.log('[MockWebSocket] ===== SENDING 100 TRYING =====')
            console.log('[MockWebSocket] Via header used:', viaHeader)
            console.log('[MockWebSocket] Full 100 Trying response:')
            console.log(trying)
            this.emitEvent('message', new MessageEvent('message', { data: trying }))

            // Emit EventBridge event - call is initiating
            if (typeof (window as any).__emitSipEvent === 'function') {
              ;(window as any).__emitSipEvent('call:initiating', { callId, remoteUri: toUri, direction: 'outgoing' })
            }

            // Send 180 Ringing
            setTimeout(() => {
              const ringing =
                `SIP/2.0 180 Ringing\r\n` +
                `Via: ${viaHeader}\r\n` +
                `From: <${fromUri}>;tag=${fromTag}\r\n` +
                `To: <${toUri}>;tag=${toTag}\r\n` +
                `Call-ID: ${callId}\r\n` +
                `CSeq: ${cseq} INVITE\r\n` +
                `Content-Length: 0\r\n\r\n`

              console.log('[MockWebSocket] ===== SENDING 180 RINGING =====')
              console.log('[MockWebSocket] Via header used:', viaHeader)
              console.log('[MockWebSocket] Full 180 Ringing response:')
              console.log(ringing)
              this.emitEvent('message', new MessageEvent('message', { data: ringing }))

              // Emit EventBridge event - call is ringing
              if (typeof (window as any).__emitSipEvent === 'function') {
                ;(window as any).__emitSipEvent('call:ringing', { callId })
              }

              // Auto-answer after ringing for E2E tests
              // This allows tests to verify call establishment without manual intervention
              setTimeout(() => {
                const sdpBody =
                  `v=0\r\n` +
                  `o=- 123456 654321 IN IP4 192.168.1.1\r\n` +
                  `s=Call Answer\r\n` +
                  `c=IN IP4 192.168.1.1\r\n` +
                  `t=0 0\r\n` +
                  `m=audio 50000 RTP/AVP 0 8 101\r\n` +
                  `a=rtpmap:0 PCMU/8000\r\n` +
                  `a=rtpmap:8 PCMA/8000\r\n` +
                  `a=rtpmap:101 telephone-event/8000\r\n`

                // Calculate correct Content-Length
                const contentLength = sdpBody.length

                const ok =
                  `SIP/2.0 200 OK\r\n` +
                  `Via: ${viaHeader}\r\n` +
                  `From: <${fromUri}>;tag=${fromTag}\r\n` +
                  `To: <${toUri}>;tag=${toTag}\r\n` +
                  `Call-ID: ${callId}\r\n` +
                  `CSeq: ${cseq} INVITE\r\n` +
                  `Contact: <${toUri}>\r\n` +
                  `Content-Type: application/sdp\r\n` +
                  `Content-Length: ${contentLength}\r\n\r\n` +
                  sdpBody

                console.log('[MockWebSocket] ===== SENDING 200 OK =====')
                console.log('[MockWebSocket] Via header used:', viaHeader)
                console.log('[MockWebSocket] Content-Length:', contentLength)
                console.log('[MockWebSocket] Full 200 OK response (first 600 chars):')
                console.log(ok.substring(0, 600))
                // Track sent messages
                this.sentMessages.push(ok.substring(0, 200)) // Store first 200 chars

                this.emitEvent('message', new MessageEvent('message', { data: ok }))

                // Emit EventBridge event - call is answered
                if (typeof (window as any).__emitSipEvent === 'function') {
                  ;(window as any).__emitSipEvent('call:answered', { callId })
                }
              }, delays.INVITE_200)
            }, delays.INVITE_180 - delays.INVITE_100)
          }, delays.INVITE_100)
        }

        private handleBye(data: string, callId: string, cseq: string, branch: string) {
          setTimeout(() => {
            const callInfo = this.activeCalls.get(callId)
            if (callInfo) {
              const response =
                `SIP/2.0 200 OK\r\n` +
                `Via: SIP/2.0/WS fake;branch=${branch}\r\n` +
                `From: <${callInfo.fromUri}>;tag=${callInfo.fromTag}\r\n` +
                `To: <${callInfo.toUri}>;tag=${callInfo.toTag}\r\n` +
                `Call-ID: ${callId}\r\n` +
                `CSeq: ${cseq} BYE\r\n` +
                `Content-Length: 0\r\n\r\n`

              this.emitEvent('message', new MessageEvent('message', { data: response }))
              this.activeCalls.delete(callId)
            }
          }, delays.BYE_200)
        }

        private handleCancel(data: string, callId: string, cseq: string, branch: string) {
          setTimeout(() => {
            const callInfo = this.activeCalls.get(callId)
            if (callInfo) {
              // Send 200 OK for CANCEL
              const cancelOk =
                `SIP/2.0 200 OK\r\n` +
                `Via: SIP/2.0/WS fake;branch=${branch}\r\n` +
                `From: <${callInfo.fromUri}>;tag=${callInfo.fromTag}\r\n` +
                `To: <${callInfo.toUri}>\r\n` +
                `Call-ID: ${callId}\r\n` +
                `CSeq: ${cseq} CANCEL\r\n` +
                `Content-Length: 0\r\n\r\n`

              this.emitEvent('message', new MessageEvent('message', { data: cancelOk }))

              // Send 487 Request Terminated for original INVITE
              const inviteCseq = extractCSeq(data)
              const terminated =
                `SIP/2.0 487 Request Terminated\r\n` +
                `Via: SIP/2.0/WS fake;branch=${branch}\r\n` +
                `From: <${callInfo.fromUri}>;tag=${callInfo.fromTag}\r\n` +
                `To: <${callInfo.toUri}>;tag=${callInfo.toTag}\r\n` +
                `Call-ID: ${callId}\r\n` +
                `CSeq: ${inviteCseq} INVITE\r\n` +
                `Content-Length: 0\r\n\r\n`

              setTimeout(() => {
                this.emitEvent('message', new MessageEvent('message', { data: terminated }))
                this.activeCalls.delete(callId)
              }, 20)
            }
          }, delays.CANCEL_200)
        }

        private handleAck(data: string, callId: string) {
          // ACK doesn't get a response, just process it
          // JsSIP sends ACK after receiving 200 OK, which triggers 'confirmed' event
          setTimeout(() => {
            console.log('[MockWebSocket] ACK processed for', callId)
            // Note: JsSIP should fire 'confirmed' event after ACK is sent
            // If this isn't happening, it means JsSIP didn't receive/process the 200 OK
          }, delays.ACK_PROCESS)
        }

        private handleOptions(data: string, callId: string, cseq: string, branch: string) {
          setTimeout(() => {
            const fromUri = extractFromUri(data)
            const toUri = extractToUri(data)
            const fromTag = extractFromTag(data)

            const response =
              `SIP/2.0 200 OK\r\n` +
              `Via: SIP/2.0/WS fake;branch=${branch}\r\n` +
              `From: <${fromUri}>;tag=${fromTag}\r\n` +
              `To: <${toUri}>;tag=options-${Date.now()}\r\n` +
              `Call-ID: ${callId}\r\n` +
              `CSeq: ${cseq} OPTIONS\r\n` +
              `Allow: INVITE, ACK, CANCEL, BYE, OPTIONS, INFO, UPDATE\r\n` +
              `Accept: application/sdp\r\n` +
              `Content-Length: 0\r\n\r\n`

            this.emitEvent('message', new MessageEvent('message', { data: response }))
          }, delays.OPTIONS_200)
        }

        private handleUpdate(data: string, callId: string, cseq: string, branch: string) {
          setTimeout(() => {
            const callInfo = this.activeCalls.get(callId)
            if (callInfo) {
              const response =
                `SIP/2.0 200 OK\r\n` +
                `Via: SIP/2.0/WS fake;branch=${branch}\r\n` +
                `From: <${callInfo.fromUri}>;tag=${callInfo.fromTag}\r\n` +
                `To: <${callInfo.toUri}>;tag=${callInfo.toTag}\r\n` +
                `Call-ID: ${callId}\r\n` +
                `CSeq: ${cseq} UPDATE\r\n` +
                `Content-Length: 0\r\n\r\n`

              this.emitEvent('message', new MessageEvent('message', { data: response }))
            }
          }, delays.OPTIONS_200)
        }

        private handleInfo(data: string, callId: string, cseq: string, branch: string) {
          setTimeout(() => {
            const callInfo = this.activeCalls.get(callId)
            if (callInfo) {
              const response =
                `SIP/2.0 200 OK\r\n` +
                `Via: SIP/2.0/WS fake;branch=${branch}\r\n` +
                `From: <${callInfo.fromUri}>;tag=${callInfo.fromTag}\r\n` +
                `To: <${callInfo.toUri}>;tag=${callInfo.toTag}\r\n` +
                `Call-ID: ${callId}\r\n` +
                `CSeq: ${cseq} INFO\r\n` +
                `Content-Length: 0\r\n\r\n`

              this.emitEvent('message', new MessageEvent('message', { data: response }))
            }
          }, delays.OPTIONS_200)
        }

        close(code = 1000, reason = 'Normal closure') {
          if (this.readyState === MockWebSocket.CLOSED) return

          this.readyState = MockWebSocket.CLOSING
          this.activeCalls.clear()
          const closeEvent = new CloseEvent('close', { code, reason })
          this.emitEvent('close', closeEvent)
          this.readyState = MockWebSocket.CLOSED
        }
      }

      // Replace global WebSocket - directly assign MockWebSocket class
      // This avoids wrapper functions that might confuse WebKit's Proxy handling
      const _OriginalWebSocket = (window as any).WebSocket

      // Directly assign MockWebSocket as the WebSocket constructor
      ;(window as any).WebSocket = MockWebSocket
      ;(globalThis as any).WebSocket = MockWebSocket
    },
    { delays: SIP_DELAYS }
  )
}

/**
 * Mock getUserMedia
 */
export function mockGetUserMedia(page: Page, devices: MockMediaDevice[]) {
  return page.addInitScript((devicesJson: string) => {
    const devices = JSON.parse(devicesJson)

    // Ensure navigator.mediaDevices exists
    if (!navigator.mediaDevices) {
      ;(navigator as any).mediaDevices = {} as MediaDevices
    }

    // Mock getUserMedia
    navigator.mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
      console.log('Mock getUserMedia called with:', constraints)

      // Create mock media stream
      const stream = new MediaStream()

      // Add mock audio track if requested
      if (constraints.audio) {
        const audioTrack = {
          id: 'mock-audio-track',
          kind: 'audio' as const,
          label: 'Mock Audio Track',
          enabled: true,
          muted: false,
          readyState: 'live' as const,
          stop: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
          getSettings: () => ({}),
          getCapabilities: () => ({}),
          getConstraints: () => ({}),
          applyConstraints: async () => {},
          clone: function () {
            return this
          },
          onended: null,
          onmute: null,
          onunmute: null,
          contentHint: '',
        } as any

        stream.addTrack(audioTrack)
      }

      // Add mock video track if requested
      if (constraints.video) {
        const videoTrack = {
          id: 'mock-video-track',
          kind: 'video' as const,
          label: 'Mock Video Track',
          enabled: true,
          muted: false,
          readyState: 'live' as const,
          stop: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
          getSettings: () => ({}),
          getCapabilities: () => ({}),
          getConstraints: () => ({}),
          applyConstraints: async () => {},
          clone: function () {
            return this
          },
          onended: null,
          onmute: null,
          onunmute: null,
          contentHint: '',
        } as any

        stream.addTrack(videoTrack)
      }

      return stream
    }

    // Mock enumerateDevices - ensure it's set up before the page loads
    const _originalEnumerateDevices = navigator.mediaDevices.enumerateDevices
    navigator.mediaDevices.enumerateDevices = async () => {
      console.log('Mock enumerateDevices called, returning', devices.length, 'devices')
      const result = devices.map(
        (d: MockMediaDevice) =>
          ({
            deviceId: d.deviceId,
            kind: d.kind,
            label: d.label,
            groupId: d.groupId,
            toJSON: () => d,
          }) as MediaDeviceInfo
      )
      console.log('Mock enumerateDevices returning:', result)
      // Log stack trace to see who's calling
      console.log('Mock enumerateDevices called from:', new Error().stack)
      return result
    }

    // Also ensure the mock is available immediately
    console.log('Mock mediaDevices.enumerateDevices set up with', devices.length, 'devices')
  }, JSON.stringify(devices))
}

/**
 * Mock RTCPeerConnection
 */
export function mockRTCPeerConnection(page: Page) {
  return page.addInitScript(() => {
    // Store original RTCPeerConnection
    const _OriginalRTCPeerConnection = window.RTCPeerConnection

    class MockRTCPeerConnection extends EventTarget {
      localDescription: RTCSessionDescription | null = null
      remoteDescription: RTCSessionDescription | null = null
      signalingState: RTCSignalingState = 'stable'
      iceConnectionState: RTCIceConnectionState = 'new'
      connectionState: RTCPeerConnectionState = 'new'
      iceGatheringState: RTCIceGatheringState = 'new'

      constructor(_configuration?: RTCConfiguration) {
        super()
        console.log('Mock RTCPeerConnection created with config:', _configuration)

        // Simulate ICE gathering
        setTimeout(() => {
          this.iceGatheringState = 'complete'
          const event = new Event('icegatheringstatechange')
          this.dispatchEvent(event)
        }, 100)

        // Simulate connection
        setTimeout(() => {
          this.iceConnectionState = 'connected'
          this.connectionState = 'connected'
          this.dispatchEvent(new Event('iceconnectionstatechange'))
          this.dispatchEvent(new Event('connectionstatechange'))
        }, 200)
      }

      async createOffer(_options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
        return {
          type: 'offer',
          sdp: 'v=0\r\no=- 123 456 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio\r\n',
        }
      }

      async createAnswer(_options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
        return {
          type: 'answer',
          sdp: 'v=0\r\no=- 789 012 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio\r\n',
        }
      }

      async setLocalDescription(description?: RTCSessionDescriptionInit): Promise<void> {
        this.localDescription = description as RTCSessionDescription
        this.signalingState = description?.type === 'offer' ? 'have-local-offer' : 'stable'
      }

      async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
        this.remoteDescription = description as RTCSessionDescription
        this.signalingState = description.type === 'offer' ? 'have-remote-offer' : 'stable'
      }

      addTrack(_track: MediaStreamTrack, ..._streams: MediaStream[]): RTCRtpSender {
        return {} as RTCRtpSender
      }

      addIceCandidate(_candidate?: RTCIceCandidateInit): Promise<void> {
        return Promise.resolve()
      }

      close(): void {
        this.connectionState = 'closed'
        this.iceConnectionState = 'closed'
      }

      getStats(): Promise<RTCStatsReport> {
        return Promise.resolve(new Map() as RTCStatsReport)
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
    }

    // Replace global RTCPeerConnection
    ;(window as any).RTCPeerConnection = MockRTCPeerConnection
  })
}

/**
 * Extended test with fixtures
 */
export const test = base.extend<TestFixtures>({
  mockSipServer: async ({ page }, use) => {
    await use(async (_config?: Partial<MockSipServerConfig>) => {
      // Always install SIP mocks on the current page so every new page instance
      // (each Playwright test gets a fresh page) has the transport overrides.
      await mockWebSocketResponses(page)
      await mockRTCPeerConnection(page)

      // Initialize EventBridge for E2E tests
      await page.addInitScript(() => {
        // Import and initialize EventBridge inline
        class EventBridge {
          private state: any
          private eventLog: any[]
          private listeners: Map<string, Set<(event: any) => void>>
          private statePromises: Map<string, any[]>

          constructor() {
            this.state = {
              connection: 'disconnected',
              registration: 'unregistered',
              call: null,
              error: null,
            }
            this.eventLog = []
            this.listeners = new Map()
            this.statePromises = new Map()
          }

          getState() {
            return { ...this.state }
          }

          getEventLog() {
            return [...this.eventLog]
          }

          emit(type: string, data?: any): void {
            const event = {
              type,
              timestamp: Date.now(),
              data,
            }
            this.eventLog.push(event)
            this.updateState(type, data)
          }

          private updateState(type: string, data?: any): void {
            switch (type) {
              case 'connection:connected':
                this.state.connection = 'connected'
                break
              case 'connection:disconnected':
                this.state.connection = 'disconnected'
                this.state.registration = 'unregistered'
                break
              case 'registration:registered':
                this.state.registration = 'registered'
                break
              case 'registration:unregistered':
                this.state.registration = 'unregistered'
                break
              case 'call:initiating':
                this.state.call = {
                  id: data?.callId || `call-${Date.now()}`,
                  direction: data?.direction || 'outgoing',
                  state: 'initiating',
                  remoteUri: data?.remoteUri || '',
                  startTime: null,
                  endTime: null,
                  holdState: 'none',
                  muted: false,
                  dtmfBuffer: '',
                }
                break
              case 'call:ringing':
                if (this.state.call) {
                  this.state.call.state = 'ringing'
                }
                break
              case 'call:answered':
                if (this.state.call) {
                  this.state.call.state = 'answered'
                  this.state.call.startTime = Date.now()
                }
                break
              case 'call:ended':
              case 'call:failed':
                if (this.state.call) {
                  this.state.call.state = 'ended'
                  this.state.call.endTime = Date.now()
                }
                setTimeout(() => {
                  if (this.state.call?.state === 'ended') {
                    this.state.call = null
                  }
                }, 100)
                break
            }
          }
        }

        // Initialize EventBridge
        const bridge = new EventBridge()
        ;(window as any).__sipEventBridge = bridge
        ;(window as any).__sipState = () => bridge.getState()

        // Helper function to emit state changes
        ;(window as any).__emitSipEvent = (type: string, data?: any) => {
          bridge.emit(type, data)
        }

        console.log('[E2E] EventBridge initialized for testing')
      })
    })
  },

  mockMediaDevices: async ({ page }, use) => {
    await use(async (devices?: MockMediaDevice[]) => {
      // Install media device mocks on every page to keep navigator.mediaDevices patched.
      await mockGetUserMedia(page, devices || defaultMockDevices)
    })
  },

  simulateIncomingCall: async ({ page }, use) => {
    await use(async (remoteUri: string) => {
      // Trigger an incoming INVITE through the mock WebSocket
      await page.evaluate(
        ({ from, to }: { from: string; to: string }) => {
          const mockWs = (window as any).__mockWebSocket
          if (mockWs && typeof mockWs.simulateIncomingInvite === 'function') {
            console.log('[simulateIncomingCall] Calling simulateIncomingInvite')
            mockWs.simulateIncomingInvite(from, to)
            console.log('[simulateIncomingCall] simulateIncomingInvite called')
          } else {
            console.error(
              '[simulateIncomingCall] Mock WebSocket not found or simulateIncomingInvite not available'
            )
          }
        },
        { from: remoteUri, to: 'sip:testuser@example.com' }
      )
      // Wait longer for JsSIP to process the incoming INVITE and fire newRTCSession event
      await page.waitForTimeout(500)
    })
  },

  configureSip: async ({ page }, use) => {
    await use(async (config: MockSipServerConfig) => {
      console.log('[fixture] configureSip applying config', config)
      // Fill in SIP configuration
      const settingsButton = page.locator('[data-testid="settings-button"]')
      await settingsButton.scrollIntoViewIfNeeded()
      await settingsButton.click()
      await page.fill('[data-testid="sip-uri-input"]', config.username)
      await page.fill('[data-testid="password-input"]', config.password)
      await page.fill('[data-testid="server-uri-input"]', config.uri)
      await page.click('[data-testid="save-settings-button"]')
      // Close settings - use force:true for mobile viewports where main element
      // may intercept pointer events due to mobile layout reflow
      await settingsButton.scrollIntoViewIfNeeded()
      await settingsButton.click({ force: true })
    })
  },

  waitForDevices: async ({ page }, use) => {
    await use(
      async ({
        audioInputs = 1,
        audioOutputs = 0,
        videoInputs = 0,
      }: {
        audioInputs?: number
        audioOutputs?: number
        videoInputs?: number
      } = {}) => {
        await page.waitForFunction(
          ({ audioInputs, audioOutputs, videoInputs }) => {
            const state = (window as any).__deviceStoreState
            if (!state) return false
            const ai = state.audioInputDevices?.length ?? 0
            const ao = state.audioOutputDevices?.length ?? 0
            const vi = state.videoInputDevices?.length ?? 0
            return ai >= audioInputs && ao >= audioOutputs && vi >= videoInputs
          },
          { audioInputs, audioOutputs, videoInputs },
          { timeout: 5000 }
        )
      }
    )
  },

  waitForConnectionState: async ({ page }, use) => {
    await use(async (state: 'connected' | 'disconnected') => {
      // Wait for the connection status element to match the expected state exactly (case-insensitive)
      await page.waitForFunction(
        (expectedState) => {
          const expected = expectedState.toLowerCase()

          // First try EventBridge (preferred method)
          const bridge = (window as any).__sipEventBridge
          if (bridge && typeof bridge.getState === 'function') {
            const sipState = bridge.getState()
            const connState = String(sipState.connection || '').toLowerCase()
            if (
              (expected === 'connected' && connState === 'connected') ||
              (expected === 'disconnected' && connState === 'disconnected')
            ) {
              const debug =
                (window as any).__connectionDebug || ((window as any).__connectionDebug = {})
              debug.lastMatchedAt = Date.now()
              debug.matchedVia = 'EventBridge'
              debug.current = connState
              return true
            }
          }

          // Fallback to __sipState function
          const sipStateFn = (window as any).__sipState
          if (typeof sipStateFn === 'function') {
            const sipState = sipStateFn()
            const connected = !!sipState.isConnected
            const current = String(sipState.connection || sipState.connectionState || '').toLowerCase()
            if (
              (expected === 'connected' && (connected || current === 'connected')) ||
              (expected === 'disconnected' && !connected && current === 'disconnected')
            ) {
              const debug =
                (window as any).__connectionDebug || ((window as any).__connectionDebug = {})
              debug.lastMatchedAt = Date.now()
              debug.matchedVia = '__sipState function'
              debug.current = current
              return true
            }
          }

          // Fallback to old __sipState object
          const sipDbg = (window as any).__sipState
          if (sipDbg) {
            const connected = !!sipDbg.isConnected
            const current = String(sipDbg.connectionState || '').toLowerCase()
            if (
              (expected === 'connected' && (connected || current === 'connected')) ||
              (expected === 'disconnected' && !connected && current === 'disconnected')
            ) {
              const debug =
                (window as any).__connectionDebug || ((window as any).__connectionDebug = {})
              debug.lastMatchedAt = Date.now()
              debug.matchedVia = 'sipDbg'
              debug.current = current
              return true
            }
          }

          const statusElement = document.querySelector('[data-testid="connection-status"]')
          if (!statusElement) return false
          const text = (statusElement.textContent || '').trim().toLowerCase()
          // Primary check: text contains expected state
          if (text.includes(expected)) {
            const debug = (window as any).__connectionDebug
            if (debug) {
              debug.lastMatchedAt = Date.now()
            }
            return true
          }

          const debug = ((window as any).__connectionDebug =
            (window as any).__connectionDebug || {})
          const now = Date.now()
          if (!debug.lastLogAt || now - debug.lastLogAt > 1000) {
            debug.lastLogAt = now
            console.debug('[waitForConnectionState] waiting', {
              expected,
              text,
              connectionDebug: { ...debug },
            })
          }

          // Fallback A: class-based indicator (UI adds 'connected' class)
          if (
            expected === 'connected' &&
            (statusElement as HTMLElement).classList.contains('connected')
          ) {
            debug.lastMatchedAt = now
            console.debug('[waitForConnectionState] matched via class fallback')
            return true
          }

          // Fallback B: proactively trigger the connection helper more aggressively
          const helper = (window as any).__forceSipConnection
          if (helper) {
            // Attempt at most every 200ms (more aggressive for Playwright)
            if (!debug.forceAttemptAt || now - debug.forceAttemptAt > 200) {
              debug.forceAttemptAt = now
              console.debug('[waitForConnectionState] invoking __forceSipConnection fallback')
              try {
                helper()
              } catch (e) {
                console.warn('[waitForConnectionState] __forceSipConnection threw:', e)
              }
            }
          } else {
            // Helper not installed yet; log once per second
            if (!debug.noHelperLogAt || now - debug.noHelperLogAt > 1000) {
              debug.noHelperLogAt = now
              console.debug('[waitForConnectionState] __forceSipConnection not available yet')
            }
          }

          return false
        },
        state,
        { timeout: 10000, polling: 200 }
      )
    })
  },

  waitForRegistrationState: async ({ page }, use) => {
    await use(async (state: 'registered' | 'unregistered') => {
      // Wait for the registration status element to contain the expected text (case-insensitive)
      await page.waitForFunction(
        (expectedState) => {
          const expected = expectedState.toLowerCase()

          // First try EventBridge (preferred method)
          const bridge = (window as any).__sipEventBridge
          if (bridge && typeof bridge.getState === 'function') {
            const sipState = bridge.getState()
            const regState = String(sipState.registration || '').toLowerCase()
            if (
              (expected === 'registered' && regState === 'registered') ||
              (expected === 'unregistered' && regState === 'unregistered')
            ) {
              const debug =
                (window as any).__registrationDebug || ((window as any).__registrationDebug = {})
              debug.lastMatchedAt = Date.now()
              debug.matchedVia = 'EventBridge'
              debug.current = regState
              return true
            }
          }

          // Fallback to __sipState function
          const sipStateFn = (window as any).__sipState
          if (typeof sipStateFn === 'function') {
            const sipState = sipStateFn()
            const registered = !!sipState.isRegistered
            const regState = String(sipState.registration || sipState.registrationState || '').toLowerCase()
            if (
              (expected === 'registered' && (registered || regState === 'registered')) ||
              (expected === 'unregistered' && !registered && regState === 'unregistered')
            ) {
              const debug =
                (window as any).__registrationDebug || ((window as any).__registrationDebug = {})
              debug.lastMatchedAt = Date.now()
              debug.matchedVia = '__sipState function'
              debug.current = regState
              return true
            }
          }

          // Fallback to old __sipState object
          const sipDbg = (window as any).__sipState
          if (sipDbg) {
            const registered = !!sipDbg.isRegistered
            const regState = String(sipDbg.registrationState || '').toLowerCase()
            if (
              (expected === 'registered' && (registered || regState === 'registered')) ||
              (expected === 'unregistered' && !registered && regState === 'unregistered')
            ) {
              const debug =
                (window as any).__registrationDebug || ((window as any).__registrationDebug = {})
              debug.lastMatchedAt = Date.now()
              debug.matchedVia = 'sipDbg'
              debug.current = regState
              return true
            }
          }

          // DOM-based checks
          const statusElement = document.querySelector(
            '[data-testid="registration-status"]'
          ) as HTMLElement | null
          if (!statusElement) return false

          // Class fallback (UI binds { connected: isRegistered })
          if (expected === 'registered' && statusElement.classList.contains('connected')) {
            const debug =
              (window as any).__registrationDebug || ((window as any).__registrationDebug = {})
            debug.lastMatchedAt = Date.now()
            debug.matchedVia = 'class'
            return true
          }

          // Text fallback
          const text = (statusElement.textContent || '').toLowerCase()
          return text.includes(expected)
        },
        state,
        { timeout: 10000, polling: 200 }
      )
    })
  },

  waitForCallState: async ({ page }, use) => {
    await use(async (desired: string | string[]) => {
      const desiredStates = Array.isArray(desired)
        ? desired.map((s) => s.toLowerCase())
        : [String(desired).toLowerCase()]
      await page.waitForFunction(
        (states) => {
          // First try EventBridge (preferred method)
          const bridge = (window as any).__sipEventBridge
          if (bridge && typeof bridge.getState === 'function') {
            const sipState = bridge.getState()
            const callState = sipState.call?.state
            if (callState) {
              const current = String(callState).toLowerCase()
              if (states.includes(current)) {
                const debug = (window as any).__callDebug || ((window as any).__callDebug = {})
                debug.lastMatchedAt = Date.now()
                debug.current = current
                debug.source = 'EventBridge'
                return true
              }
            }
          }

          // Fallback to __sipState function (legacy)
          const sipStateFn = (window as any).__sipState
          if (typeof sipStateFn === 'function') {
            const sipState = sipStateFn()
            const callState = sipState.call?.state
            if (callState) {
              const current = String(callState).toLowerCase()
              if (states.includes(current)) {
                const debug = (window as any).__callDebug || ((window as any).__callDebug = {})
                debug.lastMatchedAt = Date.now()
                debug.current = current
                debug.source = '__sipState function'
                return true
              }
            }
          }

          // Fallback to old __callState object (legacy)
          const callDbg = (window as any).__callState
          if (callDbg) {
            const current = String(callDbg.callState || '').toLowerCase()
            if (states.includes(current)) {
              const debug = (window as any).__callDebug || ((window as any).__callDebug = {})
              debug.lastMatchedAt = Date.now()
              debug.current = current
              debug.source = '__callState object'
              return true
            }
          }

          // Log occasionally for debugging
          const dbg = (window as any).__callDebug || ((window as any).__callDebug = {})
          const now = Date.now()
          if (!dbg.lastLogAt || now - dbg.lastLogAt > 1000) {
            dbg.lastLogAt = now
            const bridgeAvailable = !!(window as any).__sipEventBridge
            const sipStateFnAvailable = typeof (window as any).__sipState === 'function'
            const callDbgAvailable = !!(window as any).__callState
            console.debug('[waitForCallState] waiting', {
              expected: states,
              bridgeAvailable,
              sipStateFnAvailable,
              callDbgAvailable,
            })
          }
          return false
        },
        desiredStates,
        { timeout: 10000, polling: 200 }
      )
    })
  },
})

export { expect } from '@playwright/test'
