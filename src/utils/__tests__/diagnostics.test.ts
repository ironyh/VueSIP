/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { collectDiagnostics, formatDiagnostics, type DiagnosticResult } from '../diagnostics'

// Mock the constants module
vi.mock('../constants', () => ({
  VERSION: '1.0.0-test',
}))

describe('diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('collectDiagnostics', () => {
    it('should return full diagnostic structure with no arguments', async () => {
      const result = await collectDiagnostics()

      expect(result).toHaveProperty('timestamp')
      expect(result).toHaveProperty('version')
      expect(result).toHaveProperty('connection')
      expect(result).toHaveProperty('registration')
      expect(result).toHaveProperty('media')
      expect(result).toHaveProperty('calls')
      expect(result).toHaveProperty('summary')
    })

    it('should include timestamp in ISO format', async () => {
      const result = await collectDiagnostics()

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should return version from constants', async () => {
      const result = await collectDiagnostics()

      expect(result.version).toBe('1.0.0-test')
    })

    it('should handle undefined sipClient', async () => {
      const result = await collectDiagnostics(undefined)

      expect(result.connection.state).toBe('unavailable')
      expect(result.registration.state).toBe('unavailable')
    })

    it('should handle sipClient with getState method', async () => {
      const mockSipClient = {
        getState: vi.fn().mockReturnValue({
          connectionState: 'connected',
          registrationState: 'registered',
          lastRegistrationTime: new Date('2024-01-15T10:00:00Z'),
          registeredUri: 'sip:test@example.com',
          registrationExpiry: 3600,
        }),
      }

      const result = await collectDiagnostics(mockSipClient as any)

      expect(result.connection.state).toBe('connected')
      expect(result.connection.lastConnected).toBe('2024-01-15T10:00:00.000Z')
      expect(result.registration.state).toBe('registered')
      expect(result.registration.registeredUri).toBe('sip:test@example.com')
      expect(result.registration.expires).toBe(3600)
    })

    it('should handle sipClient with getConfig method', async () => {
      const mockSipClient = {
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' }),
        getConfig: vi.fn().mockReturnValue({ uri: 'wss://sip.example.com' }),
      }

      const result = await collectDiagnostics(mockSipClient as any)

      expect(result.connection.wsUrl).toBe('wss://sip.example.com')
    })

    it('should handle sipClient throwing from getState', async () => {
      const mockSipClient = {
        getState: vi.fn().mockImplementation(() => {
          throw new Error('SIP client error')
        }),
      }

      const result = await collectDiagnostics(mockSipClient as any)

      expect(result.connection.state).toBe('error')
      expect(result.connection.lastError).toBe('SIP client error')
    })

    it('should handle sipClient throwing from getConfig', async () => {
      const mockSipClient = {
        getState: vi.fn().mockReturnValue({}),
        getConfig: vi.fn().mockImplementation(() => {
          throw new Error('Config error')
        }),
      }

      const result = await collectDiagnostics(mockSipClient as any)

      expect(result.connection.wsUrl).toBeUndefined()
    })

    it('should collect call diagnostics from CallSession array', async () => {
      const mockCalls = [
        {
          id: 'call-1',
          direction: 'outbound',
          state: 'active',
          remoteUri: 'sip:123@example.com',
          timing: { startTime: new Date('2024-01-15T10:00:00Z'), duration: 60 },
        },
        {
          id: 'call-2',
          direction: 'inbound',
          state: 'ringing',
          remoteUri: 'sip:456@example.com',
          timing: { startTime: undefined, duration: 0 },
        },
      ]

      const result = await collectDiagnostics(undefined, undefined, mockCalls as any)

      expect(result.calls.activeCalls).toBe(2)
      expect(result.calls.calls).toHaveLength(2)
      expect(result.calls.calls[0].id).toBe('call-1')
      expect(result.calls.calls[0].direction).toBe('outbound')
      expect(result.calls.calls[0].state).toBe('active')
      expect(result.calls.calls[0].peerNumber).toBe('sip:123@example.com')
      expect(result.calls.calls[1].direction).toBe('inbound')
    })

    it('should handle empty calls array', async () => {
      const result = await collectDiagnostics(undefined, undefined, [])

      expect(result.calls.activeCalls).toBe(0)
      expect(result.calls.calls).toHaveLength(0)
    })
  })

  describe('summary generation', () => {
    it('should mark as unhealthy when connection not connected', async () => {
      const mockSipClient = {
        getState: vi.fn().mockReturnValue({
          connectionState: 'disconnected',
        }),
      }

      const result = await collectDiagnostics(mockSipClient as any)

      expect(result.summary.isHealthy).toBe(false)
      expect(result.summary.issues).toContain('SIP connection: disconnected')
      expect(result.summary.recommendations).toContain(
        'Check network connectivity and SIP server status'
      )
    })

    it('should mark as unhealthy when registration not registered', async () => {
      const mockSipClient = {
        getState: vi.fn().mockReturnValue({
          connectionState: 'connected',
          registrationState: 'failed',
        }),
      }

      const result = await collectDiagnostics(mockSipClient as any)

      expect(result.summary.isHealthy).toBe(false)
      expect(result.summary.issues).toContain('SIP registration: failed')
    })

    it('should add recommendation to re-register when connected but not registered', async () => {
      const mockSipClient = {
        getState: vi.fn().mockReturnValue({
          connectionState: 'connected',
          registrationState: 'unregistered',
        }),
      }

      const result = await collectDiagnostics(mockSipClient as any)

      expect(result.summary.recommendations).toContain('Re-register with SIP server')
    })

    it('should mark unhealthy when no microphone permission', async () => {
      const mockGetUserMedia = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
      const mockEnumerateDevices = vi.fn().mockResolvedValue([])

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia,
          enumerateDevices: mockEnumerateDevices,
        },
        writable: true,
      })

      const result = await collectDiagnostics()

      expect(result.summary.isHealthy).toBe(false)
      expect(result.summary.issues).toContain('Microphone permission not granted')
      expect(result.summary.recommendations).toContain(
        'Grant microphone permission in browser settings'
      )
    })

    it('should mark unhealthy when no microphone available', async () => {
      const mockGetUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [] })
      const mockEnumerateDevices = vi
        .fn()
        .mockResolvedValue([{ kind: 'audiooutput', deviceId: 'speaker-1', label: 'Speaker' }])

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia,
          enumerateDevices: mockEnumerateDevices,
        },
        writable: true,
      })

      const result = await collectDiagnostics()

      expect(result.summary.isHealthy).toBe(false)
      expect(result.summary.issues).toContain('No microphone available')
    })

    it('should warn on high number of active calls', async () => {
      const mockCalls = Array.from({ length: 7 }, (_, i) => ({
        id: `call-${i}`,
        direction: 'outbound',
        state: 'active',
        remoteUri: `sip:${i}@example.com`,
        timing: { startTime: new Date(), duration: 0 },
      }))

      const result = await collectDiagnostics(undefined, undefined, mockCalls as any)

      expect(result.summary.issues).toContain('High number of active calls: 7')
      expect(result.summary.recommendations).toContain('Consider cleaning up stale call sessions')
    })
  })

  describe('formatDiagnostics', () => {
    it('should format diagnostics as readable string', () => {
      const diag: DiagnosticResult = {
        timestamp: '2024-01-15T10:00:00.000Z',
        version: '1.0.0-test',
        connection: {
          state: 'connected',
          wsUrl: 'wss://sip.example.com',
          reconnectAttempts: 2,
          lastConnected: '2024-01-15T09:55:00.000Z',
        },
        registration: {
          state: 'registered',
          registeredUri: 'sip:test@example.com',
          expires: 3600,
          registerExpiresAt: '2024-01-15T10:30:00.000Z',
        },
        media: {
          microphone: { deviceId: 'mic-1', label: 'Microphone', isActive: true },
          speaker: { deviceId: 'spk-1', label: 'Speaker', isActive: true },
          permissionGranted: true,
          devicesAvailable: [],
        },
        calls: {
          activeCalls: 1,
          calls: [
            {
              id: 'call-1',
              direction: 'outbound',
              state: 'active',
              peerNumber: 'sip:123@example.com',
              startTime: '2024-01-15T10:00:00.000Z',
              duration: 60,
            },
          ],
        },
        summary: {
          isHealthy: true,
          issues: [],
          recommendations: [],
        },
      }

      const formatted = formatDiagnostics(diag)

      expect(formatted).toContain('VueSIP Diagnostics')
      expect(formatted).toContain('State: connected')
      expect(formatted).toContain('State: registered')
      expect(formatted).toContain('Mic: Microphone')
      expect(formatted).toContain('Active: 1')
      expect(formatted).toContain('Healthy: ✅')
    })

    it('should include issues in formatted output', () => {
      const diag: DiagnosticResult = {
        timestamp: '2024-01-15T10:00:00.000Z',
        version: '1.0.0-test',
        connection: { state: 'disconnected' },
        registration: { state: 'unavailable' },
        media: {
          microphone: { deviceId: '', label: 'none', isActive: false },
          speaker: { deviceId: '', label: 'none', isActive: false },
          permissionGranted: false,
          devicesAvailable: [],
        },
        calls: { activeCalls: 0, calls: [] },
        summary: {
          isHealthy: false,
          issues: ['Connection issue', 'No microphone'],
          recommendations: ['Check network'],
        },
      }

      const formatted = formatDiagnostics(diag)

      expect(formatted).toContain('Issues:')
      expect(formatted).toContain('Connection issue')
      expect(formatted).toContain('No microphone')
      expect(formatted).toContain('Healthy: ❌')
    })

    it('should include recommendations in formatted output', () => {
      const diag: DiagnosticResult = {
        timestamp: '2024-01-15T10:00:00.000Z',
        version: '1.0.0-test',
        connection: { state: 'disconnected' },
        registration: { state: 'unavailable' },
        media: {
          microphone: { deviceId: '', label: 'none', isActive: false },
          speaker: { deviceId: '', label: 'none', isActive: false },
          permissionGranted: false,
          devicesAvailable: [],
        },
        calls: { activeCalls: 0, calls: [] },
        summary: {
          isHealthy: false,
          issues: [],
          recommendations: ['Check network', 'Grant mic permission'],
        },
      }

      const formatted = formatDiagnostics(diag)

      expect(formatted).toContain('Recommendations:')
      expect(formatted).toContain('Check network')
      expect(formatted).toContain('Grant mic permission')
    })

    it('should include last error when present', () => {
      const diag: DiagnosticResult = {
        timestamp: '2024-01-15T10:00:00.000Z',
        version: '1.0.0-test',
        connection: {
          state: 'error',
          lastError: 'WebSocket connection failed',
        },
        registration: { state: 'unavailable' },
        media: {
          microphone: { deviceId: '', label: 'none', isActive: false },
          speaker: { deviceId: '', label: 'none', isActive: false },
          permissionGranted: false,
          devicesAvailable: [],
        },
        calls: { activeCalls: 0, calls: [] },
        summary: { isHealthy: false, issues: [], recommendations: [] },
      }

      const formatted = formatDiagnostics(diag)

      expect(formatted).toContain('Last Error: WebSocket connection failed')
    })

    it('should handle reconnectAttempts', () => {
      const diag: DiagnosticResult = {
        timestamp: '2024-01-15T10:00:00.000Z',
        version: '1.0.0-test',
        connection: {
          state: 'connecting',
          reconnectAttempts: 3,
        },
        registration: { state: 'unavailable' },
        media: {
          microphone: { deviceId: '', label: 'none', isActive: false },
          speaker: { deviceId: '', label: 'none', isActive: false },
          permissionGranted: false,
          devicesAvailable: [],
        },
        calls: { activeCalls: 0, calls: [] },
        summary: { isHealthy: false, issues: [], recommendations: [] },
      }

      const formatted = formatDiagnostics(diag)

      expect(formatted).toContain('Reconnects: 3')
    })
  })
})
