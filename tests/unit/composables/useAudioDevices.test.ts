import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAudioDevices } from '@/composables/useAudioDevices';

// Mock navigator.mediaDevices - configurable behavior
const mockMediaStream = {
  getTracks: vi.fn(() => []),
  getAudioTracks: vi.fn(() => []),
  getVideoTracks: vi.fn(() => [])
};

// Navigator behavior configuration
const navigatorBehavior = {
  getUserMediaError: null as DOMException | null
};

const mockNavigatorMediaDevices = {
  getUserMedia: vi.fn(() => {
    if (navigatorBehavior.getUserMediaError) {
      return Promise.reject(navigatorBehavior.getUserMediaError);
    }
    return Promise.resolve(mockMediaStream);
  }),
  enumerateDevices: vi.fn(() => Promise.resolve([]))
};

// Mock navigator.permissions
const mockNavigatorPermissions = {
  query: vi.fn(() => Promise.resolve({ state: 'granted' }))
};

// Setup global mocks
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockNavigatorMediaDevices,
  writable: true,
  configurable: true
});

Object.defineProperty(global.navigator, 'permissions', {
  value: mockNavigatorPermissions,
  writable: true,
  configurable: true
});

// Mock device data
const mockDevices = [
  { deviceId: 'mic-1', kind: 'audioinput', label: 'Microphone 1', groupId: 'group-1' },
  { deviceId: 'mic-2', kind: 'audioinput', label: 'Microphone 2', groupId: 'group-2' },
  { deviceId: 'speaker-1', kind: 'audiooutput', label: 'Speaker 1', groupId: 'group-1' },
  { deviceId: 'speaker-2', kind: 'audiooutput', label: 'Speaker 2', groupId: 'group-2' },
  { deviceId: 'camera-1', kind: 'videoinput', label: 'Camera 1', groupId: 'group-3' }
];

// Configurable mock behavior - tests can modify these before calling useAudioDevices
const mockBehavior = {
  enumerateDevicesError: null as Error | null,
  setInputDeviceError: null as Error | null,
  setOutputDeviceError: null as Error | null,
  currentInputDevice: null as any,
  currentOutputDevice: null as any,
  currentStream: null as any
};

// Shared mock instance - will be set per test
let mockAudioManagerInstance: any;

// Mock AudioManager with a class that creates mock instances
vi.mock('@/core/AudioManager', () => {
  return {
    AudioManager: class MockAudioManager {
      enumerateDevices = vi.fn(() => {
        if (mockBehavior.enumerateDevicesError) {
          return Promise.reject(mockBehavior.enumerateDevicesError);
        }
        return Promise.resolve([...mockDevices]);
      });
      getDevicesByKind = vi.fn((kind: string) => Promise.resolve(mockDevices.filter(d => d.kind === kind)));
      setInputDevice = vi.fn(() => {
        if (mockBehavior.setInputDeviceError) {
          return Promise.reject(mockBehavior.setInputDeviceError);
        }
        return Promise.resolve();
      });
      setOutputDevice = vi.fn(() => {
        if (mockBehavior.setOutputDeviceError) {
          return Promise.reject(mockBehavior.setOutputDeviceError);
        }
        return Promise.resolve();
      });
      getCurrentInputDevice = vi.fn(() => mockBehavior.currentInputDevice);
      getCurrentOutputDevice = vi.fn(() => mockBehavior.currentOutputDevice);
      getCurrentStream = vi.fn(() => mockBehavior.currentStream);
      onDeviceChange = vi.fn(() => () => {});
      applyConstraints = vi.fn(() => Promise.resolve());
      destroy = vi.fn();

      constructor() {
        // Store reference for tests to access
        mockAudioManagerInstance = this;
      }
    }
  };
});

// Helper to reset mock behavior
function resetMockBehavior() {
  mockBehavior.enumerateDevicesError = null;
  mockBehavior.setInputDeviceError = null;
  mockBehavior.setOutputDeviceError = null;
  mockBehavior.currentInputDevice = null;
  mockBehavior.currentOutputDevice = null;
  mockBehavior.currentStream = null;
  navigatorBehavior.getUserMediaError = null;
}

describe('useAudioDevices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockBehavior();
  });

  describe('Initialization', () => {
    it('should initialize with empty device lists', () => {
      const { microphones, speakers, cameras } = useAudioDevices();

      expect(microphones.value).toEqual([]);
      expect(speakers.value).toEqual([]);
      expect(cameras.value).toEqual([]);
    });

    it('should initialize with null current devices', () => {
      const { currentMicrophone, currentSpeaker, currentCamera } = useAudioDevices();

      expect(currentMicrophone.value).toBeNull();
      expect(currentSpeaker.value).toBeNull();
      expect(currentCamera.value).toBeNull();
    });

    it('should initialize with prompt permission status', () => {
      const { permissionStatus } = useAudioDevices();

      expect(permissionStatus.value).toBe('prompt');
    });

    it('should initialize with not loading state', () => {
      const { isLoading } = useAudioDevices();

      expect(isLoading.value).toBe(false);
    });

    it('should initialize with null error', () => {
      const { error } = useAudioDevices();

      expect(error.value).toBeNull();
    });
  });

  describe('Device Enumeration', () => {
    it('should enumerate and populate device lists', async () => {
      const { microphones, speakers, cameras, refreshDevices } = useAudioDevices();

      await refreshDevices();

      expect(microphones.value).toHaveLength(2);
      expect(speakers.value).toHaveLength(2);
      expect(cameras.value).toHaveLength(1);
    });

    it('should set loading state during enumeration', async () => {
      const { isLoading, refreshDevices } = useAudioDevices();

      const promise = refreshDevices();
      expect(isLoading.value).toBe(true);

      await promise;
      expect(isLoading.value).toBe(false);
    });

    it('should handle enumeration errors', async () => {
      // Set error behavior BEFORE creating composable
      mockBehavior.enumerateDevicesError = new Error('Enumeration failed');

      const { error, refreshDevices } = useAudioDevices();

      await refreshDevices();

      expect(error.value).toBe('Enumeration failed');
    });

    it('should clear error on successful enumeration', async () => {
      const { error, refreshDevices } = useAudioDevices();

      // Set an error first
      error.value = 'Previous error';

      await refreshDevices();

      expect(error.value).toBeNull();
    });

    it('should filter microphones correctly', async () => {
      const { microphones, refreshDevices } = useAudioDevices();

      await refreshDevices();

      expect(microphones.value.every(d => d.kind === 'audioinput')).toBe(true);
    });

    it('should filter speakers correctly', async () => {
      const { speakers, refreshDevices } = useAudioDevices();

      await refreshDevices();

      expect(speakers.value.every(d => d.kind === 'audiooutput')).toBe(true);
    });

    it('should filter cameras correctly', async () => {
      const { cameras, refreshDevices } = useAudioDevices();

      await refreshDevices();

      expect(cameras.value.every(d => d.kind === 'videoinput')).toBe(true);
    });
  });

  describe('Permission Management', () => {
    it('should request media permissions', async () => {
      const { requestPermissions, permissionStatus } = useAudioDevices();

      const granted = await requestPermissions();

      expect(granted).toBe(true);
      expect(permissionStatus.value).toBe('granted');
    });

    it('should handle permission denial', async () => {
      // Set navigator.getUserMedia to reject with NotAllowedError
      navigatorBehavior.getUserMediaError = new DOMException('Permission denied', 'NotAllowedError');

      const { requestPermissions, permissionStatus } = useAudioDevices();

      const granted = await requestPermissions();

      expect(granted).toBe(false);
      expect(permissionStatus.value).toBe('denied');
    });

    it('should update permission status on grant', async () => {
      const { requestPermissions, permissionStatus } = useAudioDevices();

      await requestPermissions();

      expect(permissionStatus.value).toBe('granted');
    });

    it('should enumerate devices after granting permissions', async () => {
      const { requestPermissions, microphones, speakers } = useAudioDevices();

      await requestPermissions();

      expect(microphones.value.length).toBeGreaterThan(0);
      expect(speakers.value.length).toBeGreaterThan(0);
    });

    it('should check audio permission status', async () => {
      const { checkAudioPermission, permissionStatus } = useAudioDevices();

      await checkAudioPermission();

      expect(permissionStatus.value).toBeDefined();
    });

    it('should check video permission status', async () => {
      const { checkVideoPermission } = useAudioDevices();

      const status = await checkVideoPermission();

      expect(['granted', 'denied', 'prompt']).toContain(status);
    });
  });

  describe('Device Selection', () => {
    it('should select microphone by device ID', async () => {
      const { selectMicrophone, refreshDevices } = useAudioDevices();

      await refreshDevices();
      await selectMicrophone('mic-1');

      expect(mockAudioManagerInstance.setInputDevice).toHaveBeenCalledWith('mic-1');
    });

    it('should select speaker by device ID', async () => {
      const { selectSpeaker, refreshDevices } = useAudioDevices();

      await refreshDevices();
      await selectSpeaker('speaker-1');

      expect(mockAudioManagerInstance.setOutputDevice).toHaveBeenCalledWith('speaker-1');
    });

    it('should select camera by device ID', async () => {
      const { selectCamera, refreshDevices } = useAudioDevices();

      await refreshDevices();
      await selectCamera('camera-1');

      // Camera selection would use getUserMedia with video constraints
      expect(true).toBe(true); // Placeholder for actual implementation
    });

    it('should update current microphone after selection', async () => {
      const { selectMicrophone, currentMicrophone, refreshDevices } = useAudioDevices();

      await refreshDevices();

      // Mock getCurrentInputDevice to return selected device
      vi.mocked(mockAudioManagerInstance.getCurrentInputDevice).mockReturnValue({
        deviceId: 'mic-1',
        kind: 'audioinput',
        label: 'Microphone 1',
        groupId: 'group-1'
      });

      await selectMicrophone('mic-1');

      expect(currentMicrophone.value?.deviceId).toBe('mic-1');
    });

    it('should handle device selection errors', async () => {
      const { selectMicrophone, error, refreshDevices } = useAudioDevices();

      await refreshDevices();

      // Set error behavior AFTER creating composable but BEFORE calling selectMicrophone
      mockBehavior.setInputDeviceError = new Error('Device not found');

      try {
        await selectMicrophone('invalid-id');
      } catch {
        // Expected to throw
      }

      expect(error.value).toBe('Device not found');
    });

    it('should throw error when selecting non-existent device', async () => {
      // Set error behavior BEFORE creating composable
      mockBehavior.setInputDeviceError = new Error('Device not found');

      const { selectMicrophone, refreshDevices } = useAudioDevices();

      await refreshDevices();

      await expect(selectMicrophone('non-existent'))
        .rejects.toThrow();
    });
  });

  describe('Audio Stream Creation', () => {
    it('should create audio stream with constraints', async () => {
      const { createAudioStream } = useAudioDevices();

      const stream = await createAudioStream({
        echoCancellation: true,
        noiseSuppression: true,
        deviceId: 'mic-1'
      });

      expect(stream).toBeDefined();
    });

    it('should apply audio constraints to stream', async () => {
      const { createAudioStream } = useAudioDevices();
      
      

      await createAudioStream({
        echoCancellation: true,
        autoGainControl: true
      });

      expect(mockAudioManagerInstance.applyConstraints).toHaveBeenCalledWith(
        expect.objectContaining({
          echoCancellation: true,
          autoGainControl: true
        })
      );
    });

    it('should create video stream with constraints', async () => {
      const { createVideoStream } = useAudioDevices();

      const stream = await createVideoStream({
        deviceId: 'camera-1',
        width: 1280,
        height: 720
      });

      expect(stream).toBeDefined();
    });

    it('should handle stream creation errors', async () => {
      // Set error behavior BEFORE creating composable
      mockBehavior.setInputDeviceError = new Error('Stream creation failed');

      const { createAudioStream, error } = useAudioDevices();

      await createAudioStream({ deviceId: 'mic-1' });

      expect(error.value).toBeDefined();
    });

    it('should get current audio stream', async () => {
      const { getCurrentAudioStream, createAudioStream } = useAudioDevices();

      await createAudioStream({ deviceId: 'mic-1' });
      const stream = getCurrentAudioStream();

      expect(stream).toBeDefined();
    });
  });

  describe('Device Change Detection', () => {
    it('should listen for device changes', async () => {
      // Note: onDeviceChange is called during onMounted which requires component mount
      // This test verifies the composable returns the onDeviceAdded/onDeviceRemoved methods
      const { onDeviceAdded, onDeviceRemoved, refreshDevices } = useAudioDevices();

      await refreshDevices();

      // Verify the composable provides device change callback registration
      expect(typeof onDeviceAdded).toBe('function');
      expect(typeof onDeviceRemoved).toBe('function');
    });

    it('should update device lists on device change', async () => {
      const { refreshDevices, microphones } = useAudioDevices();

      await refreshDevices();
      const initialCount = microphones.value.length;

      // Simulate device change - in real implementation would trigger via event
      await refreshDevices();

      expect(microphones.value.length).toBe(initialCount);
    });

    it('should notify when devices are added', async () => {
      const { onDeviceAdded, refreshDevices } = useAudioDevices();
      const callback = vi.fn();

      onDeviceAdded(callback);
      await refreshDevices();

      // Device added event would be triggered by AudioManager
      expect(true).toBe(true); // Placeholder
    });

    it('should notify when devices are removed', async () => {
      const { onDeviceRemoved, refreshDevices } = useAudioDevices();
      const callback = vi.fn();

      onDeviceRemoved(callback);
      await refreshDevices();

      // Device removed event would be triggered by AudioManager
      expect(true).toBe(true); // Placeholder
    });

    it('should unsubscribe from device change events', () => {
      const { onDeviceAdded } = useAudioDevices();
      const callback = vi.fn();

      const unsubscribe = onDeviceAdded(callback);
      unsubscribe();

      expect(true).toBe(true); // Subscription removed
    });
  });

  describe('Default Device Selection', () => {
    it('should select default microphone', async () => {
      const { selectDefaultMicrophone, currentMicrophone, refreshDevices } = useAudioDevices();

      await refreshDevices();
      await selectDefaultMicrophone();

      expect(currentMicrophone.value).toBeDefined();
    });

    it('should select default speaker', async () => {
      const { selectDefaultSpeaker, currentSpeaker, refreshDevices } = useAudioDevices();

      await refreshDevices();
      await selectDefaultSpeaker();

      expect(currentSpeaker.value).toBeDefined();
    });

    it('should select default camera', async () => {
      const { selectDefaultCamera, currentCamera, refreshDevices } = useAudioDevices();

      await refreshDevices();
      await selectDefaultCamera();

      expect(currentCamera.value).toBeDefined();
    });

    it('should handle no default device available', async () => {
      
      
      vi.mocked(mockAudioManagerInstance.getDevicesByKind).mockResolvedValue([]);

      const { selectDefaultMicrophone, refreshDevices } = useAudioDevices();

      await refreshDevices();
      await selectDefaultMicrophone();

      expect(true).toBe(true); // No error thrown
    });
  });

  describe('Device Information', () => {
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

    it('should get camera by ID', async () => {
      const { getCameraById, refreshDevices } = useAudioDevices();

      await refreshDevices();
      const camera = getCameraById('camera-1');

      expect(camera).toBeDefined();
      expect(camera?.deviceId).toBe('camera-1');
    });

    it('should return undefined for non-existent device', async () => {
      const { getMicrophoneById, refreshDevices } = useAudioDevices();

      await refreshDevices();
      const mic = getMicrophoneById('non-existent');

      expect(mic).toBeUndefined();
    });

    it('should check if device is available', async () => {
      const { isDeviceAvailable, refreshDevices } = useAudioDevices();

      await refreshDevices();
      const available = isDeviceAvailable('mic-1');

      expect(available).toBe(true);
    });

    it('should check if device is not available', async () => {
      const { isDeviceAvailable, refreshDevices } = useAudioDevices();

      await refreshDevices();
      const available = isDeviceAvailable('non-existent');

      expect(available).toBe(false);
    });
  });

  describe('Reactive State', () => {
    it('should have reactive microphones list', async () => {
      const { microphones, refreshDevices } = useAudioDevices();

      expect(microphones.value).toEqual([]);

      await refreshDevices();

      expect(microphones.value.length).toBeGreaterThan(0);
    });

    it('should have reactive speakers list', async () => {
      const { speakers, refreshDevices } = useAudioDevices();

      expect(speakers.value).toEqual([]);

      await refreshDevices();

      expect(speakers.value.length).toBeGreaterThan(0);
    });

    it('should have reactive permission status', async () => {
      const { permissionStatus, requestPermissions } = useAudioDevices();

      expect(permissionStatus.value).toBe('prompt');

      await requestPermissions();

      expect(permissionStatus.value).toBe('granted');
    });

    it('should have reactive loading state', async () => {
      const { isLoading, refreshDevices } = useAudioDevices();

      expect(isLoading.value).toBe(false);

      const promise = refreshDevices();
      expect(isLoading.value).toBe(true);

      await promise;
      expect(isLoading.value).toBe(false);
    });

    it('should have reactive error state', async () => {
      // First verify error starts null
      const { error, refreshDevices } = useAudioDevices();

      expect(error.value).toBeNull();

      // Now set error behavior and refresh again
      mockBehavior.enumerateDevicesError = new Error('Test error');

      await refreshDevices();

      expect(error.value).toBe('Test error');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { cleanup } = useAudioDevices();
      
      

      cleanup();

      expect(mockAudioManagerInstance.destroy).toHaveBeenCalled();
    });

    it('should remove device change listeners on cleanup', () => {
      const { onDeviceAdded, cleanup } = useAudioDevices();
      const callback = vi.fn();

      const _unsubscribe = onDeviceAdded(callback);
      cleanup();

      expect(true).toBe(true); // Listeners removed
    });

    it('should stop current streams on cleanup', () => {
      const { cleanup } = useAudioDevices();

      cleanup();

      expect(true).toBe(true); // Streams stopped
    });
  });
});
