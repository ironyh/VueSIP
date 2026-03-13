/**
 * useMediaDevices composable tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock global navigator.mediaDevices
const mockGetUserMedia = vi.fn()
const mockEnumerateDevices = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  // Mock navigator.mediaDevices
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: mockGetUserMedia,
      enumerateDevices: mockEnumerateDevices.mockResolvedValue([]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
  })
})

afterEach(() => {
  vi.resetModules()
})

describe('useMediaDevices', () => {
  it('should be able to import without crashing', async () => {
    // Just importing and creating the composable should not throw
    const { useMediaDevices } = await import('../useMediaDevices')
    expect(useMediaDevices).toBeDefined()
    expect(typeof useMediaDevices).toBe('function')
  })

  it('should initialize with null selected device IDs', async () => {
    const { useMediaDevices } = await import('../useMediaDevices')
    const { selectedAudioInputId, selectedAudioOutputId, selectedVideoInputId } = useMediaDevices()

    // These should be refs initialized to null
    expect(selectedAudioInputId.value).toBeNull()
    expect(selectedAudioOutputId.value).toBeNull()
    expect(selectedVideoInputId.value).toBeNull()
  })
})
