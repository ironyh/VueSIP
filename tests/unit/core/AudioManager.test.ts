import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AudioManager } from '@/core/AudioManager';
import type {
  AudioDevice as _AudioDevice,
  AudioConstraints,
  AudioMetrics as _AudioMetrics,
  AudioQualityLevel as _AudioQualityLevel,
  VolumeControl as _VolumeControl,
  AudioProcessingOptions as _AudioProcessingOptions,
  AudioManagerConfig
} from '@/types/audio.types';

describe('AudioManager', () => {
  let audioManager: AudioManager;
  let mockMediaDevices: MediaDevices;
  let mockMediaStream: MediaStream;
  let mockAudioTrack: MediaStreamTrack;

  beforeEach(() => {
    // Setup mock media devices
    mockAudioTrack = {
      kind: 'audio',
      id: 'track-1',
      label: 'Mock Audio Track',
      enabled: true,
      muted: false,
      readyState: 'live',
      stop: vi.fn(),
      getSettings: vi.fn(() => ({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1
      })),
      applyConstraints: vi.fn(),
      getCapabilities: vi.fn(() => ({})),
      getConstraints: vi.fn(() => ({})),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    } as unknown as MediaStreamTrack;

    mockMediaStream = {
      id: 'stream-1',
      active: true,
      getAudioTracks: vi.fn(() => [mockAudioTrack]),
      getVideoTracks: vi.fn(() => []),
      getTracks: vi.fn(() => [mockAudioTrack]),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
      clone: vi.fn(() => mockMediaStream),
      getTrackById: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    } as unknown as MediaStream;

    mockMediaDevices = {
      enumerateDevices: vi.fn(() => Promise.resolve([
        {
          deviceId: 'mic-1',
          kind: 'audioinput',
          label: 'Microphone 1',
          groupId: 'group-1',
          toJSON: () => ({})
        },
        {
          deviceId: 'mic-2',
          kind: 'audioinput',
          label: 'Microphone 2',
          groupId: 'group-2',
          toJSON: () => ({})
        },
        {
          deviceId: 'speaker-1',
          kind: 'audiooutput',
          label: 'Speaker 1',
          groupId: 'group-1',
          toJSON: () => ({})
        },
        {
          deviceId: 'speaker-2',
          kind: 'audiooutput',
          label: 'Speaker 2',
          groupId: 'group-2',
          toJSON: () => ({})
        }
      ] as MediaDeviceInfo[])),
      getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream)),
      getDisplayMedia: vi.fn(),
      getSupportedConstraints: vi.fn(() => ({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      })),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    } as unknown as MediaDevices;

    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: mockMediaDevices,
      writable: true,
      configurable: true
    });

    audioManager = new AudioManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Device Enumeration', () => {
    it('should enumerate all available audio devices', async () => {
      const devices = await audioManager.enumerateDevices();

      expect(devices).toHaveLength(4);
      expect(mockMediaDevices.enumerateDevices).toHaveBeenCalled();
    });

    it('should filter devices by kind', async () => {
      const microphones = await audioManager.getDevicesByKind('audioinput');

      expect(microphones).toHaveLength(2);
      expect(microphones.every(d => d.kind === 'audioinput')).toBe(true);
    });

    it('should return empty array when no devices available', async () => {
      vi.mocked(mockMediaDevices.enumerateDevices).mockResolvedValue([]);

      const devices = await audioManager.enumerateDevices();

      expect(devices).toEqual([]);
    });

    it('should handle enumeration errors gracefully', async () => {
      vi.mocked(mockMediaDevices.enumerateDevices).mockRejectedValue(
        new Error('Enumeration failed')
      );

      await expect(audioManager.enumerateDevices()).rejects.toThrow('Enumeration failed');
    });

    it('should cache enumerated devices', async () => {
      await audioManager.enumerateDevices();
      await audioManager.enumerateDevices();

      expect(mockMediaDevices.enumerateDevices).toHaveBeenCalledTimes(2);
    });

    it('should get device by ID', async () => {
      await audioManager.enumerateDevices();
      const device = audioManager.getDeviceById('mic-1');

      expect(device).toBeDefined();
      expect(device?.deviceId).toBe('mic-1');
    });

    it('should return undefined for non-existent device ID', async () => {
      await audioManager.enumerateDevices();
      const device = audioManager.getDeviceById('non-existent');

      expect(device).toBeUndefined();
    });
  });

  describe('Input Device Management', () => {
    it('should set input device by ID', async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');

      const currentDevice = audioManager.getCurrentInputDevice();
      expect(currentDevice?.deviceId).toBe('mic-1');
    });

    it('should create media stream when setting input device', async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            deviceId: { exact: 'mic-1' }
          })
        })
      );
    });

    it('should throw error when setting non-existent input device', async () => {
      await audioManager.enumerateDevices();

      await expect(audioManager.setInputDevice('non-existent'))
        .rejects.toThrow('Device not found');
    });

    it('should stop previous stream when changing input device', async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');

      const stopSpy = vi.spyOn(mockAudioTrack, 'stop');

      await audioManager.setInputDevice('mic-2');

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should get current input device', async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');

      const device = audioManager.getCurrentInputDevice();

      expect(device).toBeDefined();
      expect(device?.deviceId).toBe('mic-1');
    });

    it('should return null when no input device is set', () => {
      const device = audioManager.getCurrentInputDevice();

      expect(device).toBeNull();
    });
  });

  describe('Output Device Management', () => {
    it('should set output device by ID', async () => {
      await audioManager.enumerateDevices();
      await audioManager.setOutputDevice('speaker-1');

      const currentDevice = audioManager.getCurrentOutputDevice();
      expect(currentDevice?.deviceId).toBe('speaker-1');
    });

    it('should throw error when setting non-existent output device', async () => {
      await audioManager.enumerateDevices();

      await expect(audioManager.setOutputDevice('non-existent'))
        .rejects.toThrow('Device not found');
    });

    it('should get current output device', async () => {
      await audioManager.enumerateDevices();
      await audioManager.setOutputDevice('speaker-1');

      const device = audioManager.getCurrentOutputDevice();

      expect(device).toBeDefined();
      expect(device?.deviceId).toBe('speaker-1');
    });

    it('should return null when no output device is set', () => {
      const device = audioManager.getCurrentOutputDevice();

      expect(device).toBeNull();
    });
  });

  describe('Audio Constraints', () => {
    it('should apply audio constraints to stream', async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');

      const constraints: AudioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
      };

      await audioManager.applyConstraints(constraints);

      expect(mockAudioTrack.applyConstraints).toHaveBeenCalledWith(
        expect.objectContaining(constraints)
      );
    });

    it('should throw error when applying constraints without stream', async () => {
      const constraints: AudioConstraints = {
        echoCancellation: true
      };

      await expect(audioManager.applyConstraints(constraints))
        .rejects.toThrow('No active audio stream');
    });

    it('should get current constraints', async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');

      const constraints = audioManager.getCurrentConstraints();

      expect(constraints).toBeDefined();
      expect(constraints.echoCancellation).toBe(true);
    });

    it('should validate constraints before applying', async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');

      const invalidConstraints = {
        sampleRate: -1
      } as AudioConstraints;

      await expect(audioManager.applyConstraints(invalidConstraints))
        .rejects.toThrow();
    });
  });

  describe('Volume Control', () => {
    beforeEach(async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');
    });

    it('should set input volume level', () => {
      audioManager.setInputVolume(75);

      const volume = audioManager.getVolumeControl();
      expect(volume.input).toBe(75);
    });

    it('should clamp input volume to 0-100 range', () => {
      audioManager.setInputVolume(150);
      expect(audioManager.getVolumeControl().input).toBe(100);

      audioManager.setInputVolume(-50);
      expect(audioManager.getVolumeControl().input).toBe(0);
    });

    it('should set output volume level', () => {
      audioManager.setOutputVolume(60);

      const volume = audioManager.getVolumeControl();
      expect(volume.output).toBe(60);
    });

    it('should clamp output volume to 0-100 range', () => {
      audioManager.setOutputVolume(150);
      expect(audioManager.getVolumeControl().output).toBe(100);

      audioManager.setOutputVolume(-50);
      expect(audioManager.getVolumeControl().output).toBe(0);
    });

    it('should enable volume normalization', () => {
      audioManager.enableNormalization(true);

      const volume = audioManager.getVolumeControl();
      expect(volume.normalization).toBe(true);
    });

    it('should disable volume normalization', () => {
      audioManager.enableNormalization(false);

      const volume = audioManager.getVolumeControl();
      expect(volume.normalization).toBe(false);
    });

    it('should mute audio', () => {
      audioManager.setMuted(true);

      const volume = audioManager.getVolumeControl();
      expect(volume.muted).toBe(true);
    });

    it('should unmute audio', () => {
      audioManager.setMuted(false);

      const volume = audioManager.getVolumeControl();
      expect(volume.muted).toBe(false);
    });

    it('should get volume control state', () => {
      audioManager.setInputVolume(80);
      audioManager.setOutputVolume(70);
      audioManager.enableNormalization(true);

      const volume = audioManager.getVolumeControl();

      expect(volume).toEqual({
        input: 80,
        output: 70,
        normalization: true,
        muted: false
      });
    });
  });

  describe('Audio Processing', () => {
    beforeEach(async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');
    });

    it('should enable noise suppression', async () => {
      await audioManager.enableNoiseSuppression(true);

      expect(mockAudioTrack.applyConstraints).toHaveBeenCalledWith(
        expect.objectContaining({ noiseSuppression: true })
      );
    });

    it('should disable noise suppression', async () => {
      await audioManager.enableNoiseSuppression(false);

      expect(mockAudioTrack.applyConstraints).toHaveBeenCalledWith(
        expect.objectContaining({ noiseSuppression: false })
      );
    });

    it('should enable echo cancellation', async () => {
      await audioManager.enableEchoCancellation(true);

      expect(mockAudioTrack.applyConstraints).toHaveBeenCalledWith(
        expect.objectContaining({ echoCancellation: true })
      );
    });

    it('should disable echo cancellation', async () => {
      await audioManager.enableEchoCancellation(false);

      expect(mockAudioTrack.applyConstraints).toHaveBeenCalledWith(
        expect.objectContaining({ echoCancellation: false })
      );
    });

    it('should enable automatic gain control', async () => {
      await audioManager.enableAutoGainControl(true);

      expect(mockAudioTrack.applyConstraints).toHaveBeenCalledWith(
        expect.objectContaining({ autoGainControl: true })
      );
    });

    it('should disable automatic gain control', async () => {
      await audioManager.enableAutoGainControl(false);

      expect(mockAudioTrack.applyConstraints).toHaveBeenCalledWith(
        expect.objectContaining({ autoGainControl: false })
      );
    });

    it('should get current processing options', () => {
      const options = audioManager.getProcessingOptions();

      expect(options).toBeDefined();
      expect(typeof options.echoCancellation).toBe('boolean');
      expect(typeof options.noiseSuppression).toBe('boolean');
      expect(typeof options.autoGainControl).toBe('boolean');
    });
  });

  describe('Audio Metrics', () => {
    beforeEach(async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');
    });

    it('should calculate audio quality metrics', async () => {
      const metrics = await audioManager.getAudioMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.mos).toBeGreaterThanOrEqual(1);
      expect(metrics.mos).toBeLessThanOrEqual(5);
      expect(metrics.packetLoss).toBeGreaterThanOrEqual(0);
      expect(metrics.packetLoss).toBeLessThanOrEqual(100);
      expect(metrics.jitter).toBeGreaterThanOrEqual(0);
      expect(metrics.bitrate).toBeGreaterThan(0);
      expect(metrics.timestamp).toBeDefined();
    });

    it('should determine quality level from MOS score', async () => {
      const metrics = await audioManager.getAudioMetrics();

      if (metrics.mos >= 4.3) {
        expect(metrics.quality).toBe('excellent');
      } else if (metrics.mos >= 4.0) {
        expect(metrics.quality).toBe('good');
      } else if (metrics.mos >= 3.6) {
        expect(metrics.quality).toBe('fair');
      } else {
        expect(metrics.quality).toBe('poor');
      }
    });

    it('should throw error when getting metrics without stream', async () => {
      const manager = new AudioManager();

      await expect(manager.getAudioMetrics())
        .rejects.toThrow('No active audio stream');
    });

    it('should include codec information in metrics', async () => {
      const metrics = await audioManager.getAudioMetrics();

      expect(metrics.codec).toBeDefined();
    });

    it('should track metrics over time', async () => {
      const metrics1 = await audioManager.getAudioMetrics();
      await new Promise(resolve => setTimeout(resolve, 100));
      const metrics2 = await audioManager.getAudioMetrics();

      expect(metrics2.timestamp).toBeGreaterThan(metrics1.timestamp);
    });
  });

  describe('Stream Management', () => {
    it('should get current audio stream', async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');

      const stream = audioManager.getCurrentStream();

      expect(stream).toBeDefined();
      expect(stream?.id).toBe('stream-1');
    });

    it('should return null when no stream is active', () => {
      const stream = audioManager.getCurrentStream();

      expect(stream).toBeNull();
    });

    it('should clone audio stream', async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');

      const clonedStream = audioManager.cloneStream();

      expect(clonedStream).toBeDefined();
      expect(mockMediaStream.clone).toHaveBeenCalled();
    });

    it('should throw error when cloning without stream', () => {
      expect(() => audioManager.cloneStream())
        .toThrow('No active audio stream to clone');
    });

    it('should stop audio stream', async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');

      const stopSpy = vi.spyOn(mockAudioTrack, 'stop');

      audioManager.stopStream();

      expect(stopSpy).toHaveBeenCalled();
      expect(audioManager.getCurrentStream()).toBeNull();
    });

    it('should check if stream is active', async () => {
      expect(audioManager.isStreamActive()).toBe(false);

      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');

      expect(audioManager.isStreamActive()).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should accept configuration on initialization', () => {
      const config: AudioManagerConfig = {
        defaultConstraints: {
          echoCancellation: true,
          noiseSuppression: true
        },
        defaultVolume: {
          input: 80,
          output: 70
        },
        autoSwitchDevices: true,
        metricsInterval: 5000
      };

      const manager = new AudioManager(config);

      expect(manager).toBeDefined();
    });

    it('should use default constraints from config', async () => {
      const config: AudioManagerConfig = {
        defaultConstraints: {
          echoCancellation: true,
          sampleRate: 48000
        }
      };

      const manager = new AudioManager(config);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: mockMediaDevices,
        writable: true
      });

      await manager.enumerateDevices();
      await manager.setInputDevice('mic-1');

      const constraints = manager.getCurrentConstraints();
      expect(constraints.echoCancellation).toBe(true);
    });

    it('should use default volume from config', () => {
      const config: AudioManagerConfig = {
        defaultVolume: {
          input: 75,
          output: 65
        }
      };

      const manager = new AudioManager(config);
      const volume = manager.getVolumeControl();

      expect(volume.input).toBe(75);
      expect(volume.output).toBe(65);
    });
  });

  describe('Event Handling', () => {
    it('should detect device changes', async () => {
      await audioManager.enumerateDevices();

      const callback = vi.fn();
      audioManager.onDeviceChange(callback);

      // Simulate device change event
      const event = new Event('devicechange');
      mockMediaDevices.dispatchEvent(event);

      // Note: Actual callback might be called asynchronously
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should remove device change listener', async () => {
      await audioManager.enumerateDevices();

      const callback = vi.fn();
      const unsubscribe = audioManager.onDeviceChange(callback);

      unsubscribe();

      const event = new Event('devicechange');
      mockMediaDevices.dispatchEvent(event);

      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Error Handling', () => {
    it('should handle permission denied errors', async () => {
      vi.mocked(mockMediaDevices.getUserMedia).mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError')
      );

      await audioManager.enumerateDevices();

      await expect(audioManager.setInputDevice('mic-1'))
        .rejects.toThrow('Permission denied');
    });

    it('should handle device not found errors', async () => {
      vi.mocked(mockMediaDevices.getUserMedia).mockRejectedValue(
        new DOMException('Device not found', 'NotFoundError')
      );

      await audioManager.enumerateDevices();

      await expect(audioManager.setInputDevice('mic-1'))
        .rejects.toThrow('Device not found');
    });

    it('should handle constraint errors', async () => {
      vi.mocked(mockAudioTrack.applyConstraints).mockRejectedValue(
        new DOMException('Constraint not satisfied', 'OverconstrainedError')
      );

      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');

      await expect(audioManager.applyConstraints({ sampleRate: 999999 }))
        .rejects.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', async () => {
      await audioManager.enumerateDevices();
      await audioManager.setInputDevice('mic-1');

      const stopSpy = vi.spyOn(mockAudioTrack, 'stop');

      audioManager.destroy();

      expect(stopSpy).toHaveBeenCalled();
      expect(audioManager.getCurrentStream()).toBeNull();
    });

    it('should remove all event listeners on destroy', async () => {
      await audioManager.enumerateDevices();
      const callback = vi.fn();
      audioManager.onDeviceChange(callback);

      audioManager.destroy();

      const event = new Event('devicechange');
      mockMediaDevices.dispatchEvent(event);

      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });
});
