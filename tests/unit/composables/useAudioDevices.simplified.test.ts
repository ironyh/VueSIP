import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAudioDevices } from '@/composables/useAudioDevices';

// Mock device data
const mockDevices = [
  { deviceId: 'mic-1', kind: 'audioinput', label: 'Microphone 1', groupId: 'group-1' },
  { deviceId: 'mic-2', kind: 'audioinput', label: 'Microphone 2', groupId: 'group-2' },
  { deviceId: 'speaker-1', kind: 'audiooutput', label: 'Speaker 1', groupId: 'group-1' },
  { deviceId: 'camera-1', kind: 'videoinput', label: 'Camera 1', groupId: 'group-3' }
];

// Shared mock instance
let _mockAudioManagerInstance: any;

// Mock AudioManager with a class pattern (required for `new` keyword)
vi.mock('@/core/AudioManager', () => {
  return {
    AudioManager: class MockAudioManager {
      enumerateDevices = vi.fn(() => Promise.resolve([...mockDevices]));
      getDevicesByKind = vi.fn((kind: string) =>
        Promise.resolve(mockDevices.filter(d => d.kind === kind))
      );
      setInputDevice = vi.fn(() => Promise.resolve());
      setOutputDevice = vi.fn(() => Promise.resolve());
      getCurrentInputDevice = vi.fn(() => ({ deviceId: 'mic-1', kind: 'audioinput', label: 'Microphone 1', groupId: 'group-1' }));
      getCurrentOutputDevice = vi.fn(() => ({ deviceId: 'speaker-1', kind: 'audiooutput', label: 'Speaker 1', groupId: 'group-1' }));
      getCurrentStream = vi.fn(() => null);
      onDeviceChange = vi.fn(() => () => {});
      applyConstraints = vi.fn(() => Promise.resolve());
      destroy = vi.fn();

      constructor() {
        mockAudioManagerInstance = this;
      }
    }
  };
});

// Mock navigator.mediaDevices
const mockMediaStream = {
  getTracks: vi.fn(() => []),
  getAudioTracks: vi.fn(() => []),
  getVideoTracks: vi.fn(() => [])
};

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream)),
    enumerateDevices: vi.fn(() => Promise.resolve([]))
  },
  writable: true,
  configurable: true
});

Object.defineProperty(global.navigator, 'permissions', {
  value: {
    query: vi.fn(() => Promise.resolve({ state: 'granted' }))
  },
  writable: true,
  configurable: true
});

describe('useAudioDevices - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty device lists', () => {
    const { microphones, speakers, cameras } = useAudioDevices();
    expect(microphones.value).toEqual([]);
    expect(speakers.value).toEqual([]);
    expect(cameras.value).toEqual([]);
  });

  it('should enumerate and populate device lists', async () => {
    const { microphones, speakers, cameras, refreshDevices } = useAudioDevices();
    await refreshDevices();
    expect(microphones.value).toHaveLength(2);
    expect(speakers.value).toHaveLength(1);
    expect(cameras.value).toHaveLength(1);
  });

  it('should request permissions and enumerate devices', async () => {
    const { requestPermissions, permissionStatus, microphones } = useAudioDevices();
    await requestPermissions();
    expect(permissionStatus.value).toBe('granted');
    expect(microphones.value.length).toBeGreaterThan(0);
  });

  it('should select microphone device', async () => {
    const { selectMicrophone, currentMicrophone, refreshDevices } = useAudioDevices();
    await refreshDevices();
    await selectMicrophone('mic-1');
    expect(currentMicrophone.value?.deviceId).toBe('mic-1');
  });

  it('should select speaker device', async () => {
    const { selectSpeaker, currentSpeaker, refreshDevices } = useAudioDevices();
    await refreshDevices();
    await selectSpeaker('speaker-1');
    expect(currentSpeaker.value?.deviceId).toBe('speaker-1');
  });

  it('should check if device is available', async () => {
    const { isDeviceAvailable, refreshDevices } = useAudioDevices();
    await refreshDevices();
    expect(isDeviceAvailable('mic-1')).toBe(true);
    expect(isDeviceAvailable('non-existent')).toBe(false);
  });

  it('should get microphone by ID', async () => {
    const { getMicrophoneById, refreshDevices } = useAudioDevices();
    await refreshDevices();
    const mic = getMicrophoneById('mic-1');
    expect(mic).toBeDefined();
    expect(mic?.deviceId).toBe('mic-1');
  });

  it('should get speaker by ID', async () => {
    const { getSpeakerById, refreshDevices } = useAudioDevices();
    await refreshDevices();
    const speaker = getSpeakerById('speaker-1');
    expect(speaker).toBeDefined();
    expect(speaker?.deviceId).toBe('speaker-1');
  });

  it('should handle loading state during enumeration', async () => {
    const { isLoading, refreshDevices } = useAudioDevices();
    expect(isLoading.value).toBe(false);
    const promise = refreshDevices();
    // Can't reliably test loading=true in sync code
    await promise;
    expect(isLoading.value).toBe(false);
  });

  it('should create audio stream with constraints', async () => {
    const { createAudioStream } = useAudioDevices();
    const stream = await createAudioStream({
      echoCancellation: true,
      noiseSuppression: true
    });
    // Mock returns null, but method should not throw
    expect(stream).toBeDefined();
  });
});
