/**
 * useSettings Composable Unit Tests
 * Comprehensive test suite for settings management composable
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SipSettings, AudioSettings, VideoSettings, NetworkSettings } from '@/types/settings.types';

// Mock dependencies
const mockPersistence = {
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  clearSettings: vi.fn(),
  exportSettings: vi.fn(),
  importSettings: vi.fn()
};

const mockValidation = {
  validateSipSettings: vi.fn(),
  validateAudioSettings: vi.fn(),
  validateVideoSettings: vi.fn(),
  validateNetworkSettings: vi.fn()
};

vi.mock('@/composables/useSettingsPersistence', () => ({
  useSettingsPersistence: () => mockPersistence
}));

vi.mock('@/utils/settingsValidation', () => ({
  validateSipSettings: mockValidation.validateSipSettings,
  validateAudioSettings: mockValidation.validateAudioSettings,
  validateVideoSettings: mockValidation.validateVideoSettings,
  validateNetworkSettings: mockValidation.validateNetworkSettings
}));

// Import after mocks
import { useSettings } from '@/composables/useSettings';

// Mock data
const mockSipSettings: SipSettings = {
  server: 'sip.example.com',
  port: 5060,
  transport: 'UDP',
  username: 'testuser',
  password: 'testpass',
  displayName: 'Test User',
  authorizationUser: 'testuser',
  realm: 'example.com',
  registerExpires: 600,
  autoRegister: true,
  enableIce: true,
  enableStun: true,
  stunServers: ['stun:stun.l.google.com:19302'],
  enableTurn: false,
  turnServers: []
};

const mockAudioSettings: AudioSettings = {
  inputDeviceId: 'default',
  outputDeviceId: 'default',
  inputVolume: 100,
  outputVolume: 80,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1,
  codec: 'opus',
  codecPriority: ['opus', 'PCMU', 'PCMA']
};

const mockVideoSettings: VideoSettings = {
  enabled: false,
  deviceId: 'default',
  resolution: '1280x720',
  frameRate: 30,
  bitrate: 1500,
  codec: 'VP8'
};

const mockNetworkSettings: NetworkSettings = {
  enableQos: true,
  dscp: 46,
  maxBitrate: 2000,
  minBitrate: 500,
  enableAdaptiveBitrate: true,
  packetLossThreshold: 5,
  jitterBufferSize: 50
};

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidation.validateSipSettings.mockReturnValue({ valid: true, errors: [] });
    mockValidation.validateAudioSettings.mockReturnValue({ valid: true, errors: [] });
    mockValidation.validateVideoSettings.mockReturnValue({ valid: true, errors: [] });
    mockValidation.validateNetworkSettings.mockReturnValue({ valid: true, errors: [] });
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      const { sipSettings, audioSettings, videoSettings, networkSettings } = useSettings();

      expect(sipSettings.value).toBeDefined();
      expect(audioSettings.value).toBeDefined();
      expect(videoSettings.value).toBeDefined();
      expect(networkSettings.value).toBeDefined();
    });

    it('should load persisted settings on initialization', () => {
      mockPersistence.loadSettings.mockReturnValue({
        sip: mockSipSettings,
        audio: mockAudioSettings,
        video: mockVideoSettings,
        network: mockNetworkSettings
      });

      const { sipSettings } = useSettings();

      expect(mockPersistence.loadSettings).toHaveBeenCalled();
      expect(sipSettings.value.server).toBe('sip.example.com');
    });

    it('should use defaults when no persisted settings exist', () => {
      mockPersistence.loadSettings.mockReturnValue(null);

      const { sipSettings } = useSettings();

      expect(sipSettings.value).toBeDefined();
      expect(sipSettings.value.port).toBe(5060);
    });

    it('should initialize with not loading state', () => {
      const { isLoading } = useSettings();

      expect(isLoading.value).toBe(false);
    });

    it('should initialize with no errors', () => {
      const { error, validationErrors } = useSettings();

      expect(error.value).toBeNull();
      expect(validationErrors.value).toEqual({});
    });

    it('should initialize with no unsaved changes', () => {
      const { hasUnsavedChanges } = useSettings();

      expect(hasUnsavedChanges.value).toBe(false);
    });
  });

  describe('SIP Settings Management', () => {
    it('should update SIP settings', () => {
      const { sipSettings, updateSipSettings } = useSettings();

      updateSipSettings({ server: 'sip.newserver.com' });

      expect(sipSettings.value.server).toBe('sip.newserver.com');
    });

    it('should validate SIP settings on update', () => {
      const { updateSipSettings } = useSettings();

      updateSipSettings({ port: 5060 });

      expect(mockValidation.validateSipSettings).toHaveBeenCalled();
    });

    it('should mark settings as changed on update', () => {
      const { updateSipSettings, hasUnsavedChanges } = useSettings();

      updateSipSettings({ server: 'new.server.com' });

      expect(hasUnsavedChanges.value).toBe(true);
    });

    it('should reject invalid SIP settings', () => {
      mockValidation.validateSipSettings.mockReturnValue({
        valid: false,
        errors: [{ field: 'port', message: 'Invalid port number' }]
      });

      const { updateSipSettings, validationErrors } = useSettings();

      updateSipSettings({ port: 99999 });

      expect(validationErrors.value.sip).toBeDefined();
    });

    it('should update nested SIP settings', () => {
      const { sipSettings, updateSipSettings } = useSettings();

      updateSipSettings({
        stunServers: ['stun:stun.example.com:3478']
      });

      expect(sipSettings.value.stunServers).toEqual(['stun:stun.example.com:3478']);
    });
  });

  describe('Audio Settings Management', () => {
    it('should update audio settings', () => {
      const { audioSettings, updateAudioSettings } = useSettings();

      updateAudioSettings({ inputVolume: 75 });

      expect(audioSettings.value.inputVolume).toBe(75);
    });

    it('should validate audio settings on update', () => {
      const { updateAudioSettings } = useSettings();

      updateAudioSettings({ sampleRate: 48000 });

      expect(mockValidation.validateAudioSettings).toHaveBeenCalled();
    });

    it('should clamp volume values', () => {
      const { audioSettings, updateAudioSettings } = useSettings();

      updateAudioSettings({ inputVolume: 150 });

      expect(audioSettings.value.inputVolume).toBeLessThanOrEqual(100);
    });

    it('should update audio processing settings', () => {
      const { audioSettings, updateAudioSettings } = useSettings();

      updateAudioSettings({
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      });

      expect(audioSettings.value.echoCancellation).toBe(false);
      expect(audioSettings.value.noiseSuppression).toBe(false);
      expect(audioSettings.value.autoGainControl).toBe(false);
    });

    it('should update codec preferences', () => {
      const { audioSettings, updateAudioSettings } = useSettings();

      updateAudioSettings({
        codecPriority: ['PCMU', 'opus', 'PCMA']
      });

      expect(audioSettings.value.codecPriority[0]).toBe('PCMU');
    });
  });

  describe('Video Settings Management', () => {
    it('should update video settings', () => {
      const { videoSettings, updateVideoSettings } = useSettings();

      updateVideoSettings({ enabled: true });

      expect(videoSettings.value.enabled).toBe(true);
    });

    it('should validate video settings on update', () => {
      const { updateVideoSettings } = useSettings();

      updateVideoSettings({ frameRate: 30 });

      expect(mockValidation.validateVideoSettings).toHaveBeenCalled();
    });

    it('should update video resolution', () => {
      const { videoSettings, updateVideoSettings } = useSettings();

      updateVideoSettings({ resolution: '1920x1080' });

      expect(videoSettings.value.resolution).toBe('1920x1080');
    });

    it('should update video codec', () => {
      const { videoSettings, updateVideoSettings } = useSettings();

      updateVideoSettings({ codec: 'H264' });

      expect(videoSettings.value.codec).toBe('H264');
    });
  });

  describe('Network Settings Management', () => {
    it('should update network settings', () => {
      const { networkSettings, updateNetworkSettings } = useSettings();

      updateNetworkSettings({ enableQos: false });

      expect(networkSettings.value.enableQos).toBe(false);
    });

    it('should validate network settings on update', () => {
      const { updateNetworkSettings } = useSettings();

      updateNetworkSettings({ maxBitrate: 2000 });

      expect(mockValidation.validateNetworkSettings).toHaveBeenCalled();
    });

    it('should update QoS DSCP value', () => {
      const { networkSettings, updateNetworkSettings } = useSettings();

      updateNetworkSettings({ dscp: 34 });

      expect(networkSettings.value.dscp).toBe(34);
    });

    it('should update bitrate limits', () => {
      const { networkSettings, updateNetworkSettings } = useSettings();

      updateNetworkSettings({
        maxBitrate: 3000,
        minBitrate: 800
      });

      expect(networkSettings.value.maxBitrate).toBe(3000);
      expect(networkSettings.value.minBitrate).toBe(800);
    });
  });

  describe('Settings Persistence', () => {
    it('should save all settings', async () => {
      const { saveSettings } = useSettings();

      await saveSettings();

      expect(mockPersistence.saveSettings).toHaveBeenCalled();
    });

    it('should clear unsaved changes flag after save', async () => {
      const { updateSipSettings, saveSettings, hasUnsavedChanges } = useSettings();

      updateSipSettings({ server: 'new.server.com' });
      expect(hasUnsavedChanges.value).toBe(true);

      await saveSettings();

      expect(hasUnsavedChanges.value).toBe(false);
    });

    it('should handle save errors', async () => {
      mockPersistence.saveSettings.mockRejectedValue(new Error('Save failed'));

      const { saveSettings, error } = useSettings();

      await saveSettings();

      expect(error.value).toBe('Save failed');
    });

    it('should set loading state during save', async () => {
      const { saveSettings, isLoading } = useSettings();
      let loadingDuringSave = false;

      const savePromise = saveSettings();
      loadingDuringSave = isLoading.value;

      await savePromise;

      expect(loadingDuringSave).toBe(true);
      expect(isLoading.value).toBe(false);
    });
  });

  describe('Settings Reset', () => {
    it('should reset all settings to defaults', () => {
      const { updateSipSettings, resetSettings, sipSettings } = useSettings();

      updateSipSettings({ server: 'custom.server.com' });
      resetSettings();

      expect(sipSettings.value.server).not.toBe('custom.server.com');
    });

    it('should clear validation errors on reset', () => {
      mockValidation.validateSipSettings.mockReturnValue({
        valid: false,
        errors: [{ field: 'port', message: 'Invalid' }]
      });

      const { updateSipSettings, resetSettings, validationErrors } = useSettings();

      updateSipSettings({ port: 99999 });
      expect(validationErrors.value.sip).toBeDefined();

      resetSettings();

      expect(validationErrors.value.sip).toBeUndefined();
    });

    it('should clear unsaved changes flag on reset', () => {
      const { updateSipSettings, resetSettings, hasUnsavedChanges } = useSettings();

      updateSipSettings({ server: 'new.com' });
      expect(hasUnsavedChanges.value).toBe(true);

      resetSettings();

      expect(hasUnsavedChanges.value).toBe(false);
    });

    it('should reset only specific category', () => {
      const { updateSipSettings, updateAudioSettings, resetSipSettings, sipSettings, audioSettings } = useSettings();

      updateSipSettings({ server: 'new.server.com' });
      updateAudioSettings({ inputVolume: 50 });

      resetSipSettings();

      expect(sipSettings.value.server).not.toBe('new.server.com');
      expect(audioSettings.value.inputVolume).toBe(50);
    });
  });

  describe('Settings Export/Import', () => {
    it('should export settings', () => {
      mockPersistence.exportSettings.mockReturnValue(JSON.stringify({
        sip: mockSipSettings,
        audio: mockAudioSettings
      }));

      const { exportSettings } = useSettings();
      const exported = exportSettings();

      expect(exported).toBeTruthy();
      expect(mockPersistence.exportSettings).toHaveBeenCalled();
    });

    it('should import valid settings', async () => {
      const importData = JSON.stringify({
        sip: mockSipSettings,
        audio: mockAudioSettings,
        video: mockVideoSettings,
        network: mockNetworkSettings
      });

      mockPersistence.importSettings.mockResolvedValue({
        sip: mockSipSettings,
        audio: mockAudioSettings,
        video: mockVideoSettings,
        network: mockNetworkSettings
      });

      const { importSettings } = useSettings();

      await importSettings(importData);

      expect(mockPersistence.importSettings).toHaveBeenCalledWith(importData);
    });

    it('should validate imported settings', async () => {
      const importData = JSON.stringify({ sip: mockSipSettings });

      mockPersistence.importSettings.mockResolvedValue({ sip: mockSipSettings });

      const { importSettings } = useSettings();

      await importSettings(importData);

      expect(mockValidation.validateSipSettings).toHaveBeenCalled();
    });

    it('should reject invalid import data', async () => {
      mockPersistence.importSettings.mockRejectedValue(new Error('Invalid format'));

      const { importSettings, error } = useSettings();

      await importSettings('invalid-json');

      expect(error.value).toBe('Invalid format');
    });
  });

  describe('Change Tracking', () => {
    it('should track individual setting changes', () => {
      const { updateSipSettings, getChangedSettings } = useSettings();

      updateSipSettings({ server: 'new.server.com' });

      const changes = getChangedSettings();

      expect(changes.sip).toBeDefined();
      expect(changes.sip?.server).toBe('new.server.com');
    });

    it('should detect multiple category changes', () => {
      const { updateSipSettings, updateAudioSettings, getChangedSettings } = useSettings();

      updateSipSettings({ server: 'new.server.com' });
      updateAudioSettings({ inputVolume: 75 });

      const changes = getChangedSettings();

      expect(changes.sip).toBeDefined();
      expect(changes.audio).toBeDefined();
    });

    it('should provide change summary', () => {
      const { updateSipSettings, getChangeSummary } = useSettings();

      updateSipSettings({ server: 'new.server.com', port: 5061 });

      const summary = getChangeSummary();

      expect(summary.totalChanges).toBe(2);
      expect(summary.categories).toContain('sip');
    });
  });

  describe('Validation', () => {
    it('should validate all settings', () => {
      const { validateAllSettings } = useSettings();

      const result = validateAllSettings();

      expect(result.valid).toBe(true);
      expect(mockValidation.validateSipSettings).toHaveBeenCalled();
      expect(mockValidation.validateAudioSettings).toHaveBeenCalled();
      expect(mockValidation.validateVideoSettings).toHaveBeenCalled();
      expect(mockValidation.validateNetworkSettings).toHaveBeenCalled();
    });

    it('should detect validation errors', () => {
      mockValidation.validateSipSettings.mockReturnValue({
        valid: false,
        errors: [{ field: 'server', message: 'Required' }]
      });

      const { validateAllSettings } = useSettings();

      const result = validateAllSettings();

      expect(result.valid).toBe(false);
      expect(result.errors.sip).toBeDefined();
    });

    it('should validate specific category', () => {
      const { validateSipSettings } = useSettings();

      validateSipSettings();

      expect(mockValidation.validateSipSettings).toHaveBeenCalled();
    });
  });

  describe('Reactive State', () => {
    it('should have reactive settings', () => {
      const { sipSettings, updateSipSettings } = useSettings();

      const initialServer = sipSettings.value.server;
      updateSipSettings({ server: 'new.server.com' });

      expect(sipSettings.value.server).not.toBe(initialServer);
    });

    it('should have reactive loading state', async () => {
      const { saveSettings, isLoading } = useSettings();

      expect(isLoading.value).toBe(false);

      const promise = saveSettings();
      expect(isLoading.value).toBe(true);

      await promise;
      expect(isLoading.value).toBe(false);
    });

    it('should have reactive error state', async () => {
      mockPersistence.saveSettings.mockRejectedValue(new Error('Test error'));

      const { saveSettings, error } = useSettings();

      expect(error.value).toBeNull();

      await saveSettings();

      expect(error.value).toBe('Test error');
    });

    it('should have reactive validation errors', () => {
      mockValidation.validateSipSettings.mockReturnValue({
        valid: false,
        errors: [{ field: 'port', message: 'Invalid' }]
      });

      const { updateSipSettings, validationErrors } = useSettings();

      expect(validationErrors.value.sip).toBeUndefined();

      updateSipSettings({ port: 99999 });

      expect(validationErrors.value.sip).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent updates', () => {
      const { updateSipSettings, sipSettings } = useSettings();

      updateSipSettings({ server: 'server1.com' });
      updateSipSettings({ server: 'server2.com' });

      expect(sipSettings.value.server).toBe('server2.com');
    });

    it('should handle null/undefined values', () => {
      const { updateSipSettings, sipSettings } = useSettings();

      updateSipSettings({ displayName: undefined as any });

      expect(sipSettings.value.displayName).toBeDefined();
    });

    it('should handle empty string values', () => {
      const { updateSipSettings, sipSettings } = useSettings();

      updateSipSettings({ displayName: '' });

      expect(sipSettings.value.displayName).toBe('');
    });

    it('should handle very long strings', () => {
      const { updateSipSettings, sipSettings } = useSettings();

      const longString = 'a'.repeat(1000);
      updateSipSettings({ displayName: longString });

      expect(sipSettings.value.displayName).toBe(longString);
    });
  });

  describe('Error Handling', () => {
    it('should handle persistence errors gracefully', async () => {
      mockPersistence.saveSettings.mockRejectedValue(new Error('Quota exceeded'));

      const { saveSettings, error } = useSettings();

      await saveSettings();

      expect(error.value).toBe('Quota exceeded');
    });

    it('should clear previous errors', async () => {
      mockPersistence.saveSettings
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(undefined);

      const { saveSettings, error } = useSettings();

      await saveSettings();
      expect(error.value).toBe('First error');

      await saveSettings();
      expect(error.value).toBeNull();
    });
  });
});
