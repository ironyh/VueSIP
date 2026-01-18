import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAudioDevices } from '@/composables/useAudioDevices'

// Reuse existing mocks from the primary test by configuring globals here as well
const mockMediaStream = {
  getTracks: vi.fn(() => []),
  getAudioTracks: vi.fn(() => []),
  getVideoTracks: vi.fn(() => []),
} as unknown as MediaStream

const navigatorBehavior = {
  getUserMediaError: null as DOMException | Error | null,
}

const mockNavigatorMediaDevices = {
  getUserMedia: vi.fn(() => {
    if (navigatorBehavior.getUserMediaError) {
      return Promise.reject(navigatorBehavior.getUserMediaError)
    }
    return Promise.resolve(mockMediaStream)
  }),
}

const mockNavigatorPermissions = {
  query: vi.fn(() => Promise.resolve({ state: 'granted' })),
}

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockNavigatorMediaDevices,
  writable: true,
  configurable: true,
})

Object.defineProperty(global.navigator, 'permissions', {
  value: mockNavigatorPermissions,
  writable: true,
  configurable: true,
})

// AudioManager mock with instance access for overrides
let mockAudioManagerInstance: any
const baseDevices = [
  { deviceId: 'mic-1', kind: 'audioinput', label: 'Mic', groupId: 'g1' },
  { deviceId: 'spk-1', kind: 'audiooutput', label: 'Spk', groupId: 'g1' },
  { deviceId: 'cam-1', kind: 'videoinput', label: 'Cam', groupId: 'g2' },
]

vi.mock('@/core/AudioManager', () => {
  return {
    AudioManager: class MockAudioManager {
      enumerateDevices = vi.fn(async () => [...baseDevices])
      setInputDevice = vi.fn(async () => {})
      setOutputDevice = vi.fn(async () => {})
      getCurrentInputDevice = vi.fn(() => baseDevices[0])
      getCurrentOutputDevice = vi.fn(() => baseDevices[1])
      getCurrentStream = vi.fn(() => mockMediaStream)
      onDeviceChange = vi.fn((_cb: any) => () => {})
      applyConstraints = vi.fn(async () => {})
      destroy = vi.fn()
      constructor() {
        mockAudioManagerInstance = this
      }
    },
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  navigatorBehavior.getUserMediaError = null
  mockNavigatorPermissions.query.mockReset()
  mockNavigatorPermissions.query.mockResolvedValue({ state: 'granted' })
  if (mockAudioManagerInstance) {
    mockAudioManagerInstance.enumerateDevices.mockResolvedValue([...baseDevices])
  }
})

describe('useAudioDevices (additional coverage)', () => {
  it('checkAudioPermission falls back when permissions.query throws (labels present => granted)', async () => {
    mockNavigatorPermissions.query.mockRejectedValue(new Error('no permissions API'))
    // ensure labels present
    const { checkAudioPermission, permissionStatus } = useAudioDevices()
    const state = await checkAudioPermission()
    expect(state).toBe('granted')
    expect(permissionStatus.value).toBe('granted')
  })

  it('checkAudioPermission fallback sets prompt when labels are empty', async () => {
    mockNavigatorPermissions.query.mockRejectedValue(new Error('no permissions API'))
    const { checkAudioPermission, permissionStatus } = useAudioDevices()
    mockAudioManagerInstance.enumerateDevices.mockResolvedValue([
      { deviceId: 'mic-x', kind: 'audioinput', label: '', groupId: 'g' },
    ])
    const state = await checkAudioPermission()
    expect(state).toBe('prompt')
    expect(permissionStatus.value).toBe('prompt')
  })

  it('checkVideoPermission fallback uses device labels to infer permission', async () => {
    mockNavigatorPermissions.query.mockRejectedValue(new Error('no permissions API'))
    const { checkVideoPermission } = useAudioDevices()
    mockAudioManagerInstance.enumerateDevices.mockResolvedValue([
      { deviceId: 'cam-x', kind: 'videoinput', label: '', groupId: 'g' },
    ])
    const state1 = await checkVideoPermission()
    expect(state1).toBe('prompt')

    mockAudioManagerInstance.enumerateDevices.mockResolvedValue([
      { deviceId: 'cam-y', kind: 'videoinput', label: 'Camera', groupId: 'g' },
    ])
    const state2 = await checkVideoPermission()
    expect(state2).toBe('granted')
  })

  it('selectCamera surfaces getUserMedia error and sets error message', async () => {
    navigatorBehavior.getUserMediaError = new Error('Camera not available')
    const { selectCamera, error } = useAudioDevices()
    await expect(selectCamera('cam-1')).rejects.toThrow('Camera not available')
    expect(String(error.value)).toContain('Camera not available')
  })

  it('requestPermissions returns false and does not mark denied for non-NotAllowed errors', async () => {
    navigatorBehavior.getUserMediaError = new DOMException('Not found', 'NotFoundError')
    const { requestPermissions, permissionStatus, error } = useAudioDevices()
    const ok = await requestPermissions()
    expect(ok).toBe(false)
    // stays at default 'prompt' since NotAllowedError is not set
    expect(permissionStatus.value).toBe('prompt')
    expect(error.value).toBeDefined()
  })

  it('createVideoStream returns null on getUserMedia failure and records error', async () => {
    navigatorBehavior.getUserMediaError = new Error('gUM failed')
    const { createVideoStream, error } = useAudioDevices()
    const stream = await createVideoStream({ video: true })
    expect(stream).toBeNull()
    expect(String(error.value)).toContain('gUM failed')
  })

  it('lookup helpers and availability reflect enumerated devices', async () => {
    const { refreshDevices, getMicrophoneById, getSpeakerById, getCameraById, isDeviceAvailable } =
      useAudioDevices()
    await refreshDevices()
    expect(getMicrophoneById('mic-1')?.kind).toBe('audioinput')
    expect(getSpeakerById('spk-1')?.kind).toBe('audiooutput')
    expect(getCameraById('cam-1')?.kind).toBe('videoinput')
    expect(isDeviceAvailable('mic-1')).toBe(true)
    expect(isDeviceAvailable('missing')).toBe(false)
  })
})
