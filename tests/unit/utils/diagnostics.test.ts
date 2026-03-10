import { describe, it, expect, vi, beforeEach } from 'vitest'
import { collectDiagnostics, formatDiagnostics } from '../../../src/utils/diagnostics'

describe('diagnostics', () => {
  describe('collectDiagnostics', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return diagnostic result with all required fields', async () => {
      const result = await collectDiagnostics()

      expect(result).toHaveProperty('timestamp')
      expect(result).toHaveProperty('version')
      expect(result).toHaveProperty('connection')
      expect(result).toHaveProperty('registration')
      expect(result).toHaveProperty('media')
      expect(result).toHaveProperty('calls')
      expect(result).toHaveProperty('summary')
    })

    it('should include connection diagnostics when sipClient provided', async () => {
      const mockSipClient = {
        getState: vi.fn().mockReturnValue({
          connectionState: 'connected',
          lastRegistrationTime: new Date('2024-01-01T00:00:00Z'),
        }),
        getConfig: vi.fn().mockReturnValue({
          uri: 'wss://sip.example.com:7443',
        }),
      }

      const result = await collectDiagnostics(mockSipClient as any)

      expect(result.connection.state).toBe('connected')
      expect(result.connection.lastConnected).toBe('2024-01-01T00:00:00.000Z')
      expect(result.connection.wsUrl).toBe('wss://sip.example.com:7443')
    })

    it('should return unavailable when sipClient is undefined', async () => {
      const result = await collectDiagnostics(undefined)

      expect(result.connection.state).toBe('unavailable')
      expect(result.connection.reconnectAttempts).toBeUndefined()
    })

    it('should include registration diagnostics', async () => {
      const mockSipClient = {
        getState: vi.fn().mockReturnValue({
          registrationState: 'registered',
          registeredUri: 'sip:1000@example.com',
          registrationExpiry: 3600,
          lastRegistrationTime: new Date('2024-01-01T00:00:00Z'),
        }),
        getConfig: vi.fn().mockReturnValue({
          uri: 'wss://sip.example.com:7443',
        }),
      }

      const result = await collectDiagnostics(mockSipClient as any)

      expect(result.registration.state).toBe('registered')
      expect(result.registration.registeredUri).toBe('sip:1000@example.com')
      expect(result.registration.expires).toBe(3600)
    })

    it('should return unavailable registration when sipClient is undefined', async () => {
      const result = await collectDiagnostics(undefined)

      expect(result.registration.state).toBe('unavailable')
    })

    it('should collect media diagnostics with available devices', async () => {
      const mockDevices: MediaDeviceInfo[] = [
        { deviceId: 'mic-1', kind: 'audioinput', label: 'Microphone', groupId: 'g1' },
        { deviceId: 'speaker-1', kind: 'audiooutput', label: 'Speaker', groupId: 'g1' },
      ]

      vi.spyOn(navigator.mediaDevices, 'enumerateDevices').mockResolvedValue(mockDevices)
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      } as any)

      const result = await collectDiagnostics(undefined, undefined)

      expect(result.media.devicesAvailable).toHaveLength(2)
      expect(result.media.permissionGranted).toBe(true)
      expect(result.media.microphone.label).toBe('Microphone')
      expect(result.media.speaker.label).toBe('Speaker')
    })

    it('should handle media errors gracefully', async () => {
      vi.spyOn(navigator.mediaDevices, 'enumerateDevices').mockRejectedValue(
        new Error('Not allowed')
      )

      const result = await collectDiagnostics(undefined, undefined)

      expect(result.media.microphone.label).toContain('error')
    })

    it('should collect call diagnostics', async () => {
      const mockCalls = [
        {
          id: 'call-1',
          direction: 'outbound',
          state: 'confirmed',
          remoteUri: 'sip:2000@example.com',
          timing: { startTime: new Date('2024-01-01T00:00:00Z'), duration: 60 },
        },
      ] as any[]

      const result = await collectDiagnostics(undefined, undefined, mockCalls)

      expect(result.calls.activeCalls).toBe(1)
      expect(result.calls.calls[0].id).toBe('call-1')
      expect(result.calls.calls[0].direction).toBe('outbound')
      expect(result.calls.calls[0].state).toBe('confirmed')
    })

    it('should generate healthy summary when all good', async () => {
      const mockSipClient = {
        getState: vi.fn().mockReturnValue({
          connectionState: 'connected',
          registrationState: 'registered',
          lastRegistrationTime: new Date(),
        }),
        getConfig: vi.fn().mockReturnValue({
          uri: 'wss://sip.example.com:7443',
        }),
      }

      const mockDevices: MediaDeviceInfo[] = [
        { deviceId: 'mic-1', kind: 'audioinput', label: 'Mic', groupId: 'g1' },
      ]

      vi.spyOn(navigator.mediaDevices, 'enumerateDevices').mockResolvedValue(mockDevices)
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      } as any)

      const result = await collectDiagnostics(mockSipClient as any)

      expect(result.summary.isHealthy).toBe(true)
      expect(result.summary.issues).toHaveLength(0)
    })

    it('should report issues when not connected', async () => {
      const mockSipClient = {
        getState: vi.fn().mockReturnValue({
          connectionState: 'disconnected',
          registrationState: 'unregistered',
        }),
        getConfig: vi.fn().mockReturnValue({
          uri: 'wss://sip.example.com:7443',
        }),
      }

      vi.spyOn(navigator.mediaDevices, 'enumerateDevices').mockResolvedValue([])
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(new Error('denied'))

      const result = await collectDiagnostics(mockSipClient as any)

      expect(result.summary.isHealthy).toBe(false)
      expect(result.summary.issues.length).toBeGreaterThan(0)
    })
  })

  describe('formatDiagnostics', () => {
    it('should format diagnostics as readable string', () => {
      const diag = {
        timestamp: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
        connection: { state: 'connected', reconnectAttempts: undefined },
        registration: { state: 'registered' },
        media: {
          microphone: { deviceId: 'm1', label: 'Mic', isActive: true },
          speaker: { deviceId: 's1', label: 'Spkr', isActive: true },
          permissionGranted: true,
          devicesAvailable: [],
        },
        calls: { activeCalls: 0, calls: [] },
        summary: { isHealthy: true, issues: [], recommendations: [] },
      }

      const formatted = formatDiagnostics(diag as any)

      expect(formatted).toContain('VueSIP Diagnostics')
      expect(formatted).toContain('connected')
      expect(formatted).toContain('✅')
    })

    it('should include issues in formatted output', () => {
      const diag = {
        timestamp: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
        connection: { state: 'disconnected', reconnectAttempts: undefined },
        registration: { state: 'unregistered' },
        media: {
          microphone: { deviceId: '', label: 'none', isActive: false },
          speaker: { deviceId: '', label: 'none', isActive: false },
          permissionGranted: false,
          devicesAvailable: [],
        },
        calls: { activeCalls: 0, calls: [] },
        summary: {
          isHealthy: false,
          issues: ['SIP connection: disconnected'],
          recommendations: ['Check network'],
        },
      }

      const formatted = formatDiagnostics(diag as any)

      expect(formatted).toContain('Issues:')
      expect(formatted).toContain('disconnected')
      expect(formatted).toContain('Recommendations:')
      expect(formatted).toContain('Check network')
    })
  })
})
