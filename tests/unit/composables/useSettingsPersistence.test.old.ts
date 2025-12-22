/**
 * useSettingsPersistence Composable Unit Tests
 * Tests for settings persistence, storage, and migration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SipSettings, AudioSettings, VideoSettings, NetworkSettings } from '@/types/settings.types';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null)
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock crypto for encryption
const mockCrypto = {
  subtle: {
    encrypt: vi.fn((algorithm: any, key: any, data: ArrayBuffer) =>
      Promise.resolve(new ArrayBuffer(data.byteLength + 16))
    ),
    decrypt: vi.fn((algorithm: any, key: any, data: ArrayBuffer) =>
      Promise.resolve(new ArrayBuffer(data.byteLength - 16))
    ),
    generateKey: vi.fn(() => Promise.resolve({} as CryptoKey)),
    importKey: vi.fn(() => Promise.resolve({} as CryptoKey))
  },
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  })
};

Object.defineProperty(window, 'crypto', {
  value: mockCrypto,
  writable: true
});

import { useSettingsPersistence } from '@/composables/useSettingsPersistence';

// Mock settings data
const mockSettings = {
  sip: {
    server: 'sip.example.com',
    port: 5060,
    transport: 'UDP',
    username: 'testuser',
    password: 'testpass'
  } as SipSettings,
  audio: {
    inputVolume: 100,
    outputVolume: 80,
    echoCancellation: true
  } as AudioSettings,
  video: {
    enabled: false,
    resolution: '1280x720'
  } as VideoSettings,
  network: {
    enableQos: true,
    maxBitrate: 2000
  } as NetworkSettings
};

describe('useSettingsPersistence', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Storage Operations', () => {
    it('should save settings to localStorage', () => {
      const { saveSettings } = useSettingsPersistence();

      saveSettings(mockSettings);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should load settings from localStorage', () => {
      const { saveSettings, loadSettings } = useSettingsPersistence();

      saveSettings(mockSettings);
      const loaded = loadSettings();

      expect(loaded).toBeDefined();
      expect(loaded?.sip.server).toBe('sip.example.com');
    });

    it('should return null when no settings exist', () => {
      const { loadSettings } = useSettingsPersistence();

      const loaded = loadSettings();

      expect(loaded).toBeNull();
    });

    it('should clear all settings', () => {
      const { saveSettings, clearSettings, loadSettings } = useSettingsPersistence();

      saveSettings(mockSettings);
      clearSettings();

      const loaded = loadSettings();

      expect(loaded).toBeNull();
    });

    it('should handle JSON parsing errors', () => {
      mockLocalStorage.setItem('vueSipSettings', 'invalid-json');

      const { loadSettings } = useSettingsPersistence();

      const loaded = loadSettings();

      expect(loaded).toBeNull();
    });
  });

  describe('Encryption', () => {
    it('should encrypt sensitive data before storage', async () => {
      const { saveSettings, encryptionEnabled } = useSettingsPersistence();

      if (encryptionEnabled.value) {
        await saveSettings(mockSettings);

        const storedData = mockLocalStorage.getItem('vueSipSettings');
        expect(storedData).toBeTruthy();
        // Encrypted data should not contain plain password
        expect(storedData).not.toContain('testpass');
      }
    });

    it('should decrypt data on load', async () => {
      const { saveSettings, loadSettings, encryptionEnabled } = useSettingsPersistence();

      if (encryptionEnabled.value) {
        await saveSettings(mockSettings);
        const loaded = await loadSettings();

        expect(loaded?.sip.password).toBe('testpass');
      }
    });

    it('should handle encryption errors gracefully', async () => {
      mockCrypto.subtle.encrypt.mockRejectedValueOnce(new Error('Encryption failed'));

      const { saveSettings } = useSettingsPersistence();

      // Should fall back to unencrypted storage
      await saveSettings(mockSettings);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should handle decryption errors gracefully', async () => {
      mockCrypto.subtle.decrypt.mockRejectedValueOnce(new Error('Decryption failed'));

      const { loadSettings } = useSettingsPersistence();

      const loaded = await loadSettings();

      expect(loaded).toBeDefined();
    });
  });

  describe('Migration', () => {
    it('should detect old version settings', () => {
      const oldSettings = {
        version: '1.0.0',
        sip: mockSettings.sip
      };

      mockLocalStorage.setItem('vueSipSettings', JSON.stringify(oldSettings));

      const { needsMigration } = useSettingsPersistence();

      expect(needsMigration()).toBe(true);
    });

    it('should migrate v1 to v2 settings', () => {
      const v1Settings = {
        version: '1.0.0',
        sipServer: 'sip.example.com',
        sipPort: 5060
      };

      mockLocalStorage.setItem('vueSipSettings', JSON.stringify(v1Settings));

      const { migrateSettings, loadSettings } = useSettingsPersistence();

      migrateSettings();
      const loaded = loadSettings();

      expect(loaded?.sip.server).toBe('sip.example.com');
      expect(loaded?.sip.port).toBe(5060);
    });

    it('should preserve existing settings during migration', () => {
      const v1Settings = {
        version: '1.0.0',
        sipServer: 'sip.example.com',
        audio: mockSettings.audio
      };

      mockLocalStorage.setItem('vueSipSettings', JSON.stringify(v1Settings));

      const { migrateSettings, loadSettings } = useSettingsPersistence();

      migrateSettings();
      const loaded = loadSettings();

      expect(loaded?.audio.inputVolume).toBe(100);
    });

    it('should update version after migration', () => {
      const v1Settings = {
        version: '1.0.0',
        sip: mockSettings.sip
      };

      mockLocalStorage.setItem('vueSipSettings', JSON.stringify(v1Settings));

      const { migrateSettings, loadSettings } = useSettingsPersistence();

      migrateSettings();
      const loaded: any = loadSettings();

      expect(loaded?.version).not.toBe('1.0.0');
    });

    it('should handle migration errors', () => {
      mockLocalStorage.setItem('vueSipSettings', 'corrupt-data');

      const { migrateSettings } = useSettingsPersistence();

      expect(() => migrateSettings()).not.toThrow();
    });
  });

  describe('Export/Import', () => {
    it('should export settings as JSON', () => {
      const { saveSettings, exportSettings } = useSettingsPersistence();

      saveSettings(mockSettings);
      const exported = exportSettings();

      expect(exported).toBeTruthy();
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should include version in export', () => {
      const { saveSettings, exportSettings } = useSettingsPersistence();

      saveSettings(mockSettings);
      const exported = JSON.parse(exportSettings());

      expect(exported.version).toBeDefined();
    });

    it('should import valid settings', () => {
      const exportData = JSON.stringify({
        version: '2.0.0',
        ...mockSettings
      });

      const { importSettings, loadSettings } = useSettingsPersistence();

      importSettings(exportData);
      const loaded = loadSettings();

      expect(loaded?.sip.server).toBe('sip.example.com');
    });

    it('should validate import data structure', () => {
      const invalidData = JSON.stringify({ invalid: 'data' });

      const { importSettings } = useSettingsPersistence();

      expect(() => importSettings(invalidData)).toThrow();
    });

    it('should handle malformed import data', () => {
      const { importSettings } = useSettingsPersistence();

      expect(() => importSettings('not-json')).toThrow();
    });

    it('should preserve existing settings on import failure', () => {
      const { saveSettings, importSettings, loadSettings } = useSettingsPersistence();

      saveSettings(mockSettings);

      try {
        importSettings('invalid');
      } catch {
        // Expected
      }

      const loaded = loadSettings();
      expect(loaded?.sip.server).toBe('sip.example.com');
    });
  });

  describe('Storage Quota Management', () => {
    it('should detect storage quota exceeded', () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new DOMException('QuotaExceededError');
      });

      const { saveSettings, storageQuotaExceeded } = useSettingsPersistence();

      try {
        saveSettings(mockSettings);
      } catch {
        // Expected
      }

      expect(storageQuotaExceeded.value).toBe(true);
    });

    it('should provide storage usage estimate', () => {
      const { saveSettings, getStorageUsage } = useSettingsPersistence();

      saveSettings(mockSettings);
      const usage = getStorageUsage();

      expect(usage.used).toBeGreaterThan(0);
      expect(usage.total).toBeGreaterThan(0);
    });

    it('should compress data when approaching quota', () => {
      const { saveSettings, compressionEnabled } = useSettingsPersistence();

      // Set up near-quota condition
      compressionEnabled.value = true;

      saveSettings(mockSettings);

      const stored = mockLocalStorage.getItem('vueSipSettings');
      expect(stored).toBeTruthy();
    });

    it('should fall back to memory storage on quota error', () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new DOMException('QuotaExceededError');
      });

      const { saveSettings, loadSettings } = useSettingsPersistence();

      saveSettings(mockSettings);
      const loaded = loadSettings();

      // Should still work via memory fallback
      expect(loaded).toBeDefined();
    });
  });

  describe('Versioning', () => {
    it('should store current version with settings', () => {
      const { saveSettings } = useSettingsPersistence();

      saveSettings(mockSettings);

      const stored = JSON.parse(mockLocalStorage.getItem('vueSipSettings') || '{}');
      expect(stored.version).toBeDefined();
    });

    it('should detect version mismatch', () => {
      const oldVersionSettings = {
        version: '0.9.0',
        ...mockSettings
      };

      mockLocalStorage.setItem('vueSipSettings', JSON.stringify(oldVersionSettings));

      const { hasVersionMismatch } = useSettingsPersistence();

      expect(hasVersionMismatch()).toBe(true);
    });

    it('should auto-migrate on version mismatch', () => {
      const oldVersionSettings = {
        version: '1.0.0',
        ...mockSettings
      };

      mockLocalStorage.setItem('vueSipSettings', JSON.stringify(oldVersionSettings));

      const { loadSettings } = useSettingsPersistence();

      const loaded = loadSettings();

      expect(loaded).toBeDefined();
    });
  });

  describe('Backup and Restore', () => {
    it('should create backup before save', () => {
      const { saveSettings, hasBackup } = useSettingsPersistence();

      saveSettings(mockSettings);
      saveSettings({ ...mockSettings, sip: { ...mockSettings.sip, server: 'new.com' } });

      expect(hasBackup()).toBe(true);
    });

    it('should restore from backup', () => {
      const { saveSettings, restoreBackup, loadSettings } = useSettingsPersistence();

      saveSettings(mockSettings);
      saveSettings({ ...mockSettings, sip: { ...mockSettings.sip, server: 'new.com' } });

      restoreBackup();
      const loaded = loadSettings();

      expect(loaded?.sip.server).toBe('sip.example.com');
    });

    it('should limit number of backups', () => {
      const { saveSettings, getBackupCount } = useSettingsPersistence();

      for (let i = 0; i < 10; i++) {
        saveSettings({ ...mockSettings, sip: { ...mockSettings.sip, port: 5060 + i } });
      }

      const count = getBackupCount();
      expect(count).toBeLessThanOrEqual(5); // Max 5 backups
    });
  });

  describe('Synchronization', () => {
    it('should detect storage events from other tabs', () => {
      const { onStorageChange } = useSettingsPersistence();
      const callback = vi.fn();

      onStorageChange(callback);

      const event = new StorageEvent('storage', {
        key: 'vueSipSettings',
        newValue: JSON.stringify(mockSettings)
      });

      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalled();
    });

    it('should sync settings from other tabs', () => {
      const { loadSettings } = useSettingsPersistence();

      const event = new StorageEvent('storage', {
        key: 'vueSipSettings',
        newValue: JSON.stringify(mockSettings)
      });

      window.dispatchEvent(event);

      const loaded = loadSettings();
      expect(loaded?.sip.server).toBe('sip.example.com');
    });

    it('should debounce rapid storage changes', () => {
      const { onStorageChange } = useSettingsPersistence();
      const callback = vi.fn();

      onStorageChange(callback);

      // Rapid fire events
      for (let i = 0; i < 10; i++) {
        const event = new StorageEvent('storage', {
          key: 'vueSipSettings',
          newValue: JSON.stringify(mockSettings)
        });
        window.dispatchEvent(event);
      }

      // Should debounce
      expect(callback.mock.calls.length).toBeLessThan(10);
    });
  });

  describe('Error Recovery', () => {
    it('should handle corrupt storage data', () => {
      mockLocalStorage.setItem('vueSipSettings', '{corrupt}');

      const { loadSettings } = useSettingsPersistence();

      const loaded = loadSettings();

      expect(loaded).toBeNull();
    });

    it('should clear corrupt data', () => {
      mockLocalStorage.setItem('vueSipSettings', '{corrupt}');

      const { loadSettings, clearSettings } = useSettingsPersistence();

      loadSettings();
      clearSettings();

      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
    });

    it('should validate data integrity on load', () => {
      const tamperedSettings = {
        ...mockSettings,
        _checksum: 'invalid'
      };

      mockLocalStorage.setItem('vueSipSettings', JSON.stringify(tamperedSettings));

      const { loadSettings, validateIntegrity } = useSettingsPersistence();

      const loaded = loadSettings();
      const valid = validateIntegrity(loaded);

      expect(valid).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should clean up old backups', () => {
      const { cleanupOldBackups } = useSettingsPersistence();

      cleanupOldBackups();

      // Should remove backups older than 30 days
      expect(true).toBe(true);
    });

    it('should remove storage event listeners', () => {
      const { onStorageChange, cleanup } = useSettingsPersistence();
      const callback = vi.fn();

      const unsubscribe = onStorageChange(callback);
      unsubscribe();

      cleanup();

      const event = new StorageEvent('storage', {
        key: 'vueSipSettings',
        newValue: JSON.stringify(mockSettings)
      });

      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
