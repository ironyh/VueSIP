/**
 * AudioManager - Core audio device and stream management
 * Handles device enumeration, selection, constraints, and metrics
 */

import {
  AudioQualityLevel,
  type AudioDevice,
  type AudioConstraints,
  type AudioMetrics,
  type VolumeControl,
  type AudioProcessingOptions,
  type AudioManagerConfig,
  type AudioDeviceChangeEvent
} from '@/types/audio.types';

export class AudioManager {
  private devices: Map<string, MediaDeviceInfo> = new Map();
  private currentStream: MediaStream | null = null;
  private currentInputDevice: AudioDevice | null = null;
  private currentOutputDevice: AudioDevice | null = null;
  private volumeControl: VolumeControl;
  private processingOptions: AudioProcessingOptions;
  private config: AudioManagerConfig;
  private deviceChangeListeners: Set<(event: AudioDeviceChangeEvent) => void> = new Set();
  private metricsInterval?: number;

  constructor(config: AudioManagerConfig = {}) {
    this.config = {
      defaultConstraints: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1,
        ...config.defaultConstraints
      },
      defaultProcessing: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...config.defaultProcessing
      },
      defaultVolume: {
        input: 50,
        output: 50,
        normalization: false,
        muted: false,
        ...config.defaultVolume
      },
      autoSwitchDevices: config.autoSwitchDevices ?? false,
      metricsInterval: config.metricsInterval ?? 1000
    };

    this.volumeControl = {
      input: this.config.defaultVolume?.input ?? 50,
      output: this.config.defaultVolume?.output ?? 50,
      normalization: this.config.defaultVolume?.normalization ?? false,
      muted: this.config.defaultVolume?.muted ?? false
    };

    this.processingOptions = {
      echoCancellation: this.config.defaultProcessing?.echoCancellation ?? true,
      noiseSuppression: this.config.defaultProcessing?.noiseSuppression ?? true,
      autoGainControl: this.config.defaultProcessing?.autoGainControl ?? true
    };

    this.setupDeviceChangeListener();
  }

  /**
   * Enumerate all available audio/video devices
   */
  async enumerateDevices(): Promise<AudioDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      // Update devices map
      this.devices.clear();
      devices.forEach(device => {
        this.devices.set(device.deviceId, device);
      });

      // Convert to AudioDevice format
      return devices.map(device => ({
        deviceId: device.deviceId,
        label: device.label,
        kind: device.kind,
        groupId: device.groupId
      }));
    } catch (error) {
      throw new Error(`Failed to enumerate devices: ${(error as Error).message}`);
    }
  }

  /**
   * Get devices filtered by kind
   */
  async getDevicesByKind(kind: MediaDeviceKind): Promise<AudioDevice[]> {
    const allDevices = await this.enumerateDevices();
    return allDevices.filter(device => device.kind === kind);
  }

  /**
   * Get device by ID
   */
  getDeviceById(deviceId: string): AudioDevice | undefined {
    const device = this.devices.get(deviceId);
    if (!device) return undefined;

    return {
      deviceId: device.deviceId,
      label: device.label,
      kind: device.kind,
      groupId: device.groupId
    };
  }

  /**
   * Set input (microphone) device
   */
  async setInputDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device || device.kind !== 'audioinput') {
      throw new Error('Device not found or not an audio input device');
    }

    // Stop current stream if exists
    this.stopStream();

    try {
      // Create new stream with device constraints
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: { exact: deviceId },
          ...this.config.defaultConstraints
        },
        video: false
      };

      this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentInputDevice = {
        deviceId: device.deviceId,
        label: device.label,
        kind: device.kind,
        groupId: device.groupId
      };
    } catch (error) {
      const err = error as DOMException;
      if (err.name === 'NotAllowedError') {
        throw new Error('Permission denied');
      } else if (err.name === 'NotFoundError') {
        throw new Error('Device not found');
      }
      throw error;
    }
  }

  /**
   * Set output (speaker) device
   */
  async setOutputDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device || device.kind !== 'audiooutput') {
      throw new Error('Device not found or not an audio output device');
    }

    this.currentOutputDevice = {
      deviceId: device.deviceId,
      label: device.label,
      kind: device.kind,
      groupId: device.groupId
    };
  }

  /**
   * Get current input device
   */
  getCurrentInputDevice(): AudioDevice | null {
    return this.currentInputDevice;
  }

  /**
   * Get current output device
   */
  getCurrentOutputDevice(): AudioDevice | null {
    return this.currentOutputDevice;
  }

  /**
   * Apply audio constraints to current stream
   */
  async applyConstraints(constraints: AudioConstraints): Promise<void> {
    if (!this.currentStream) {
      throw new Error('No active audio stream');
    }

    // Validate constraints
    if (constraints.sampleRate !== undefined && constraints.sampleRate < 0) {
      throw new Error('Invalid sample rate');
    }

    const audioTrack = this.currentStream.getAudioTracks()[0];
    if (!audioTrack) {
      throw new Error('No audio track available');
    }

    try {
      await audioTrack.applyConstraints(constraints);

      // Update processing options
      if (constraints.echoCancellation !== undefined) {
        this.processingOptions.echoCancellation = constraints.echoCancellation;
      }
      if (constraints.noiseSuppression !== undefined) {
        this.processingOptions.noiseSuppression = constraints.noiseSuppression;
      }
      if (constraints.autoGainControl !== undefined) {
        this.processingOptions.autoGainControl = constraints.autoGainControl;
      }
    } catch (error) {
      throw new Error(`Failed to apply constraints: ${(error as Error).message}`);
    }
  }

  /**
   * Get current audio constraints
   */
  getCurrentConstraints(): AudioConstraints {
    if (!this.currentStream) {
      return this.config.defaultConstraints || {};
    }

    const audioTrack = this.currentStream.getAudioTracks()[0];
    if (!audioTrack) {
      return this.config.defaultConstraints || {};
    }

    const settings = audioTrack.getSettings();
    return {
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
      autoGainControl: settings.autoGainControl,
      sampleRate: settings.sampleRate,
      sampleSize: settings.sampleSize,
      channelCount: settings.channelCount
    };
  }

  /**
   * Set input volume level (0-100)
   */
  setInputVolume(level: number): void {
    this.volumeControl.input = Math.max(0, Math.min(100, level));
  }

  /**
   * Set output volume level (0-100)
   */
  setOutputVolume(level: number): void {
    this.volumeControl.output = Math.max(0, Math.min(100, level));
  }

  /**
   * Enable/disable volume normalization
   */
  enableNormalization(enabled: boolean): void {
    this.volumeControl.normalization = enabled;
  }

  /**
   * Mute/unmute audio
   */
  setMuted(muted: boolean): void {
    this.volumeControl.muted = muted;

    if (this.currentStream) {
      const audioTrack = this.currentStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !muted;
      }
    }
  }

  /**
   * Get current volume control state
   */
  getVolumeControl(): VolumeControl {
    return { ...this.volumeControl };
  }

  /**
   * Enable/disable noise suppression
   */
  async enableNoiseSuppression(enabled: boolean): Promise<void> {
    await this.applyConstraints({ noiseSuppression: enabled });
  }

  /**
   * Enable/disable echo cancellation
   */
  async enableEchoCancellation(enabled: boolean): Promise<void> {
    await this.applyConstraints({ echoCancellation: enabled });
  }

  /**
   * Enable/disable automatic gain control
   */
  async enableAutoGainControl(enabled: boolean): Promise<void> {
    await this.applyConstraints({ autoGainControl: enabled });
  }

  /**
   * Get current processing options
   */
  getProcessingOptions(): AudioProcessingOptions {
    return { ...this.processingOptions };
  }

  /**
   * Get audio quality metrics
   */
  async getAudioMetrics(): Promise<AudioMetrics> {
    if (!this.currentStream) {
      throw new Error('No active audio stream');
    }

    const audioTrack = this.currentStream.getAudioTracks()[0];
    if (!audioTrack) {
      throw new Error('No audio track available');
    }

    // In a real implementation, these would come from WebRTC stats
    // For now, we'll return mock data based on settings
    const settings = audioTrack.getSettings();

    // Calculate MOS score (1-5) based on various factors
    // Higher quality settings = higher MOS
    let mos = 3.5;
    if (settings.echoCancellation) mos += 0.3;
    if (settings.noiseSuppression) mos += 0.3;
    if (settings.autoGainControl) mos += 0.2;
    if (settings.sampleRate && settings.sampleRate >= 48000) mos += 0.2;

    mos = Math.min(5, mos);

    // Determine quality level from MOS
    let quality: AudioQualityLevel;
    if (mos >= 4.3) quality = AudioQualityLevel.EXCELLENT;
    else if (mos >= 4.0) quality = AudioQualityLevel.GOOD;
    else if (mos >= 3.6) quality = AudioQualityLevel.FAIR;
    else quality = AudioQualityLevel.POOR;

    return {
      mos,
      packetLoss: 0,
      jitter: 5,
      bitrate: (settings.sampleRate || 48000) * (settings.channelCount || 1) * 16 / 1000,
      quality,
      codec: 'opus',
      timestamp: Date.now()
    };
  }

  /**
   * Get current audio stream
   */
  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  /**
   * Clone current audio stream
   */
  cloneStream(): MediaStream {
    if (!this.currentStream) {
      throw new Error('No active audio stream to clone');
    }
    return this.currentStream.clone();
  }

  /**
   * Stop current audio stream
   */
  stopStream(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
  }

  /**
   * Check if stream is active
   */
  isStreamActive(): boolean {
    return this.currentStream !== null && this.currentStream.active;
  }

  /**
   * Setup device change listener
   */
  private setupDeviceChangeListener(): void {
    if (!navigator.mediaDevices) return;

    navigator.mediaDevices.addEventListener('devicechange', async () => {
      const previousDevices = new Map(this.devices);
      await this.enumerateDevices();

      // Detect changes and notify listeners
      this.devices.forEach((device, deviceId) => {
        if (!previousDevices.has(deviceId)) {
          const event: AudioDeviceChangeEvent = {
            type: 'added',
            device: {
              deviceId: device.deviceId,
              label: device.label,
              kind: device.kind,
              groupId: device.groupId
            },
            timestamp: Date.now()
          };
          this.notifyDeviceChange(event);
        }
      });

      previousDevices.forEach((device, deviceId) => {
        if (!this.devices.has(deviceId)) {
          const event: AudioDeviceChangeEvent = {
            type: 'removed',
            device: {
              deviceId: device.deviceId,
              label: device.label,
              kind: device.kind,
              groupId: device.groupId
            },
            timestamp: Date.now()
          };
          this.notifyDeviceChange(event);
        }
      });
    });
  }

  /**
   * Register device change callback
   */
  onDeviceChange(callback: (event: AudioDeviceChangeEvent) => void): () => void {
    this.deviceChangeListeners.add(callback);
    return () => {
      this.deviceChangeListeners.delete(callback);
    };
  }

  /**
   * Notify all device change listeners
   */
  private notifyDeviceChange(event: AudioDeviceChangeEvent): void {
    this.deviceChangeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in device change listener:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopStream();
    this.deviceChangeListeners.clear();
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}
