/**
 * useClickToCall - Real SIP mode tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed, nextTick } from 'vue'
import { CallState } from '@/types/call.types'

// Mock the logger to avoid noisy logs
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock useSipClient for real SIP adapter
const connectMock = vi.fn().mockResolvedValue(undefined)
const disconnectMock = vi.fn().mockResolvedValue(undefined)

vi.mock('@/composables/useSipClient', () => ({
  useSipClient: vi.fn(() => ({
    connect: connectMock,
    disconnect: disconnectMock,
    isConnected: computed(() => false),
    isRegistered: computed(() => false),
    getClient: () => ({}),
    error: ref(null),
  })),
}))

// Mock useCallSession to provide session controls/state
const makeCallMock = vi.fn().mockResolvedValue(undefined)
const hangupMock = vi.fn().mockResolvedValue(undefined)
const answerMock = vi.fn().mockResolvedValue(undefined)

const sessionState = ref(CallState.Idle)
const mockRemoteUri = ref<string | null>(null)
const mockRemoteName = ref<string | null>(null)

vi.mock('@/composables/useCallSession', () => ({
  useCallSession: vi.fn(() => ({
    makeCall: makeCallMock,
    hangup: hangupMock,
    answer: answerMock,
    state: sessionState,
    session: ref(null),
    remoteUri: computed(() => mockRemoteUri.value),
    remoteDisplayName: computed(() => mockRemoteName.value),
  })),
}))

import { useClickToCall } from '@/composables/useClickToCall'

describe('useClickToCall (real SIP mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes real SIP mode when mockMode=false and sipConfig present', async () => {
    const onCallStart = vi.fn()
    const ctc = useClickToCall({
      mockMode: false,
      sipConfig: {
        wsUri: 'wss://sip.example.com',
        sipUri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Tester',
      },
      onCallStart,
    })

    await expect(ctc.call('+15551234567')).resolves.not.toThrow()

    expect(onCallStart).toHaveBeenCalledWith('+15551234567')
    expect(connectMock).toHaveBeenCalled() // should attempt to connect before call
    expect(makeCallMock).toHaveBeenCalledWith('+15551234567', { audio: true, video: false })
  })

  it('hydrates inbound remote number from adapter on ringing', async () => {
    const ctc = useClickToCall({
      mockMode: false,
      sipConfig: {
        wsUri: 'wss://sip.example.com',
        sipUri: 'sip:user@example.com',
        password: 'secret',
      },
    })

    // Simulate inbound ringing with remote identity
    mockRemoteName.value = 'Alice'
    mockRemoteUri.value = 'sip:alice@example.com'
    sessionState.value = CallState.Ringing
    await nextTick()

    expect(ctc.remoteNumber.value).toBe('Alice')

    // Clear on end
    sessionState.value = CallState.Terminated
    await nextTick()
    expect(ctc.remoteNumber.value).toBeNull()
  })
})
