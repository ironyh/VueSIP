/**
 * Settings Store Unit Tests
 * Tests for centralized settings state management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '@/stores/settingsStore'
import type { SipAccount } from '@/stores/settingsStore'

// Mock data matching actual API
const _mockSipAccount: SipAccount = {
  id: 'test-account-1',
  name: 'Test Account',
  serverUri: 'sip:sip.example.com',
  sipUri: 'sip:testuser@example.com',
  password: 'testpass',
  displayName: 'Test User',
  authorizationUsername: 'testuser',
  realm: 'example.com',
  registrationExpiry: 600,
  wsProtocols: ['sip'],
  connectionTimeout: 5000,
  autoRegister: true,
  enabled: true,
}

// Mock settings data (for future use)
// const _mockAudioSettings: AudioSettings = {
//   microphoneId: null,
//   speakerId: null,
//   microphoneVolume: 80,
//   speakerVolume: 80,
//   echoCancellation: true,
//   noiseSuppression: true,
//   autoGainControl: true,
//   audioCodec: 'opus'
// };

// const _mockVideoSettings: VideoSettings = {
//   cameraId: null,
//   enableVideoByDefault: false,
//   resolution: '720p',
//   frameRate: 30,
//   hardwareAcceleration: true,
//   videoCodec: 'vp9'
// };

// const _mockNetworkSettings: NetworkSettings = {
//   stunServers: ['stun:stun.l.google.com:19302'],
//   turnServers: [],
//   iceTransportPolicy: 'all',
//   enableIPv6: true,
//   iceCandidateTimeout: 5000
// };

describe('settingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      const store = useSettingsStore()

      expect(store.settings).toBeDefined()
      expect(store.settings.audio).toBeDefined()
      expect(store.settings.video).toBeDefined()
      expect(store.settings.network).toBeDefined()
      expect(store.settings.accounts).toEqual([])
    })

    it('should initialize with no unsaved changes', () => {
      const store = useSettingsStore()

      expect(store.isDirty).toBe(false)
    })

    it('should have default audio settings', () => {
      const store = useSettingsStore()

      expect(store.settings.audio.microphoneVolume).toBe(80)
      expect(store.settings.audio.echoCancellation).toBe(true)
    })
  })

  describe('SIP Account Management', () => {
    it('should add SIP account', () => {
      const store = useSettingsStore()

      const account = store.addAccount({
        name: 'Test Account',
        serverUri: 'sip:sip.example.com',
        sipUri: 'sip:testuser@example.com',
        password: 'testpass',
        displayName: 'Test User',
        registrationExpiry: 600,
        connectionTimeout: 5000,
        autoRegister: true,
        enabled: true,
      })

      expect(account.id).toBeDefined()
      expect(store.settings.accounts).toHaveLength(1)
      expect(store.settings.accounts[0].name).toBe('Test Account')
    })

    it('should update SIP account', () => {
      const store = useSettingsStore()

      const account = store.addAccount({
        name: 'Original',
        serverUri: 'sip:sip.example.com',
        sipUri: 'sip:testuser@example.com',
        password: 'testpass',
        displayName: 'Test User',
        registrationExpiry: 600,
        connectionTimeout: 5000,
        autoRegister: true,
        enabled: true,
      })

      store.updateAccount(account.id, { name: 'Updated' })

      expect(store.settings.accounts[0].name).toBe('Updated')
    })

    it('should remove SIP account', () => {
      const store = useSettingsStore()

      const account = store.addAccount({
        name: 'Test',
        serverUri: 'sip:sip.example.com',
        sipUri: 'sip:testuser@example.com',
        password: 'testpass',
        displayName: 'Test User',
        registrationExpiry: 600,
        connectionTimeout: 5000,
        autoRegister: true,
        enabled: true,
      })

      store.removeAccount(account.id)

      expect(store.settings.accounts).toHaveLength(0)
    })

    it('should set active account', () => {
      const store = useSettingsStore()

      const account = store.addAccount({
        name: 'Test',
        serverUri: 'sip:sip.example.com',
        sipUri: 'sip:testuser@example.com',
        password: 'testpass',
        displayName: 'Test User',
        registrationExpiry: 600,
        connectionTimeout: 5000,
        autoRegister: true,
        enabled: true,
      })

      store.setActiveAccount(account.id)

      expect(store.settings.activeAccountId).toBe(account.id)
      expect(store.activeAccount?.id).toBe(account.id)
    })

    it('should auto-set first account as active', () => {
      const store = useSettingsStore()

      const account = store.addAccount({
        name: 'Test',
        serverUri: 'sip:sip.example.com',
        sipUri: 'sip:testuser@example.com',
        password: 'testpass',
        displayName: 'Test User',
        registrationExpiry: 600,
        connectionTimeout: 5000,
        autoRegister: true,
        enabled: true,
      })

      expect(store.settings.activeAccountId).toBe(account.id)
    })
  })

  describe('Settings Updates', () => {
    it('should update settings', () => {
      const store = useSettingsStore()

      store.updateSettings({
        audio: { ...store.settings.audio, microphoneVolume: 90 },
      })

      expect(store.settings.audio.microphoneVolume).toBe(90)
    })

    it('should mark store as dirty after update', () => {
      const store = useSettingsStore()

      store.updateSettings({
        audio: { ...store.settings.audio, microphoneVolume: 90 },
      })

      expect(store.isDirty).toBe(true)
    })

    it('should update lastModified timestamp', () => {
      const store = useSettingsStore()
      const before = store.settings.lastModified

      store.updateSettings({
        audio: { ...store.settings.audio, microphoneVolume: 90 },
      })

      expect(store.settings.lastModified).not.toBe(before)
    })
  })

  describe('Validation', () => {
    it('should validate settings', () => {
      const store = useSettingsStore()

      const errors = store.validateSettings()

      expect(Array.isArray(errors)).toBe(true)
    })

    it('should detect invalid volume values', () => {
      const store = useSettingsStore()

      store.updateSettings({
        audio: { ...store.settings.audio, microphoneVolume: 150 },
      })

      const errors = store.validateSettings()
      const volumeError = errors.find((e) => e.field === 'audio.microphoneVolume')

      expect(volumeError).toBeDefined()
      expect(volumeError?.severity).toBe('error')
    })

    it('should validate SIP account fields', () => {
      const store = useSettingsStore()

      store.addAccount({
        name: 'Invalid',
        serverUri: '', // Invalid
        sipUri: '', // Invalid
        password: '', // Invalid
        displayName: 'Test',
        registrationExpiry: 600,
        connectionTimeout: 5000,
        autoRegister: true,
        enabled: true,
      })

      const errors = store.validateSettings()
      const hasAccountErrors = errors.some((e) => e.field.startsWith('accounts.'))

      expect(hasAccountErrors).toBe(true)
    })
  })

  describe('Computed Properties', () => {
    it('should get active account', () => {
      const store = useSettingsStore()

      const account = store.addAccount({
        name: 'Test',
        serverUri: 'sip:sip.example.com',
        sipUri: 'sip:testuser@example.com',
        password: 'testpass',
        displayName: 'Test User',
        registrationExpiry: 600,
        connectionTimeout: 5000,
        autoRegister: true,
        enabled: true,
      })

      expect(store.activeAccount?.id).toBe(account.id)
    })

    it('should get enabled accounts', () => {
      const store = useSettingsStore()

      store.addAccount({
        name: 'Enabled',
        serverUri: 'sip:sip.example.com',
        sipUri: 'sip:test1@example.com',
        password: 'pass',
        displayName: 'Test 1',
        registrationExpiry: 600,
        connectionTimeout: 5000,
        autoRegister: true,
        enabled: true,
      })

      store.addAccount({
        name: 'Disabled',
        serverUri: 'sip:sip.example.com',
        sipUri: 'sip:test2@example.com',
        password: 'pass',
        displayName: 'Test 2',
        registrationExpiry: 600,
        connectionTimeout: 5000,
        autoRegister: true,
        enabled: false,
      })

      expect(store.enabledAccounts).toHaveLength(1)
      expect(store.enabledAccounts[0].name).toBe('Enabled')
    })

    it('should check if valid', () => {
      const store = useSettingsStore()

      // Default settings should be valid
      expect(store.isValid).toBe(true)
    })

    it('should get media configuration', () => {
      const store = useSettingsStore()

      const config = store.mediaConfiguration

      expect(config.audio).toBeDefined()
      expect(config.echoCancellation).toBe(true)
      expect(config.audioCodec).toBe('opus')
    })

    it('should get RTC configuration', () => {
      const store = useSettingsStore()

      const config = store.rtcConfiguration

      expect(config.iceServers).toBeDefined()
      expect(config.iceServers.length).toBeGreaterThan(0)
    })
  })

  describe('Reset Settings', () => {
    it('should reset to defaults', () => {
      const store = useSettingsStore()

      store.updateSettings({
        audio: { ...store.settings.audio, microphoneVolume: 90 },
      })

      store.resetSettings()

      expect(store.settings.audio.microphoneVolume).toBe(80)
    })

    it('should clear accounts on reset', () => {
      const store = useSettingsStore()

      store.addAccount({
        name: 'Test',
        serverUri: 'sip:sip.example.com',
        sipUri: 'sip:testuser@example.com',
        password: 'testpass',
        displayName: 'Test User',
        registrationExpiry: 600,
        connectionTimeout: 5000,
        autoRegister: true,
        enabled: true,
      })

      store.resetSettings()

      expect(store.settings.accounts).toHaveLength(0)
    })

    it('should clear validation errors on reset', () => {
      const store = useSettingsStore()

      store.updateSettings({
        audio: { ...store.settings.audio, microphoneVolume: 150 },
      })
      store.validateSettings()

      store.resetSettings()

      expect(store.validationErrors).toHaveLength(0)
    })
  })

  describe('Reactive State', () => {
    it('should have reactive settings', () => {
      const store = useSettingsStore()

      const initial = store.settings.audio.microphoneVolume

      store.updateSettings({
        audio: { ...store.settings.audio, microphoneVolume: 90 },
      })

      expect(store.settings.audio.microphoneVolume).not.toBe(initial)
    })

    it('should have reactive dirty flag', () => {
      const store = useSettingsStore()

      expect(store.isDirty).toBe(false)

      store.updateSettings({
        audio: { ...store.settings.audio, microphoneVolume: 90 },
      })

      expect(store.isDirty).toBe(true)
    })
  })
})
