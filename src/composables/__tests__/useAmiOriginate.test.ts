/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useAmiOriginate } from '../useAmiOriginate'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

describe('useAmiOriginate', () => {
  // Mock AMI client
  const mockAmiClient = {
    sendAction: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('initialization', () => {
    it('should initialize with correct default state when client is null', () => {
      const amiClientRef = ref<typeof mockAmiClient | null>(null)
      const { isOriginating, lastResult, progress, error } = useAmiOriginate(amiClientRef)

      expect(isOriginating.value).toBe(false)
      expect(lastResult.value).toBe(null)
      expect(progress.value).toBe(null)
      expect(error.value).toBe(null)
    })

    it('should initialize with correct default state when client is provided', () => {
      const amiClientRef = ref(mockAmiClient)
      const { isOriginating, lastResult, progress, error } = useAmiOriginate(amiClientRef)

      expect(isOriginating.value).toBe(false)
      expect(lastResult.value).toBe(null)
      expect(progress.value).toBe(null)
      expect(error.value).toBe(null)
    })
  })

  describe('utility functions', () => {
    describe('formatChannel', () => {
      it('should format PJSIP channel correctly', () => {
        const amiClientRef = ref(mockAmiClient)
        const { formatChannel } = useAmiOriginate(amiClientRef)

        expect(formatChannel('PJSIP', '1001')).toBe('PJSIP/1001')
      })

      it('should normalize technology to uppercase', () => {
        const amiClientRef = ref(mockAmiClient)
        const { formatChannel } = useAmiOriginate(amiClientRef)

        expect(formatChannel('pjsip', '1001')).toBe('PJSIP/1001')
      })

      it('should remove slashes from endpoint', () => {
        const amiClientRef = ref(mockAmiClient)
        const { formatChannel } = useAmiOriginate(amiClientRef)

        expect(formatChannel('PJSIP', '/1001/')).toBe('PJSIP/1001')
      })

      it('should handle SIP channel', () => {
        const amiClientRef = ref(mockAmiClient)
        const { formatChannel } = useAmiOriginate(amiClientRef)

        expect(formatChannel('SIP', '1001')).toBe('SIP/1001')
      })
    })

    describe('buildCallerId', () => {
      it('should build caller ID with both name and number', () => {
        const amiClientRef = ref(mockAmiClient)
        const { buildCallerId } = useAmiOriginate(amiClientRef)

        expect(buildCallerId('John Doe', '1001')).toBe('"John Doe" <1001>')
      })

      it('should build caller ID with number only', () => {
        const amiClientRef = ref(mockAmiClient)
        const { buildCallerId } = useAmiOriginate(amiClientRef)

        expect(buildCallerId(undefined, '1001')).toBe('1001')
      })

      it('should build caller ID with name only', () => {
        const amiClientRef = ref(mockAmiClient)
        const { buildCallerId } = useAmiOriginate(amiClientRef)

        expect(buildCallerId('John Doe')).toBe('John Doe')
      })

      it('should return empty string when no arguments', () => {
        const amiClientRef = ref(mockAmiClient)
        const { buildCallerId } = useAmiOriginate(amiClientRef)

        expect(buildCallerId()).toBe('')
      })
    })
  })

  describe('reset', () => {
    it('should reset all state values except lastResult', () => {
      const amiClientRef = ref(mockAmiClient)
      const { isOriginating, lastResult, progress, error, reset } = useAmiOriginate(amiClientRef)

      // Modify state
      isOriginating.value = true
      lastResult.value = { success: true, actionId: 'test' }
      progress.value = { state: 'dialing', timestamp: new Date() }
      error.value = 'Some error'

      // Reset
      reset()

      expect(isOriginating.value).toBe(false)
      // Note: lastResult is NOT reset by the reset() function - this is a known limitation
      expect(lastResult.value).toEqual({ success: true, actionId: 'test' })
      expect(progress.value).toBe(null)
      expect(error.value).toBe(null)
    })
  })
})
