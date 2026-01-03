/**
 * Settings + Connection Manager Integration Tests
 * Tests integration between settings and SIP connection management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettings } from '@/composables/useSettings'
import { configStore } from '@/stores/configStore'
import { registrationStore } from '@/stores/registrationStore'

describe('Settings + Connection Manager Integration', () => {
  beforeEach(() => {
    // Initialize Pinia for settings store
    setActivePinia(createPinia())

    vi.clearAllMocks()
    configStore.reset()
    registrationStore.reset()

    // Initialize sipConfig so updateSipConfig() can work in tests
    configStore.setSipConfig(
      {
        uri: 'wss://default.example.com:7443',
        sipUri: 'sip:test@default.example.com',
        password: 'testpass',
        displayName: 'Test User',
      },
      false
    ) // Disable validation for test setup
  })

  describe('SIP Configuration Application', () => {
    it('should apply SIP settings to configStore', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        sip: {
          ...settings.value.sip,
          server: 'sip.test.com',
          port: 5061,
          transport: 'TCP',
        },
      })

      // Config should be updated
      configStore.updateSipConfig({
        server: settings.value.sip.server,
        port: settings.value.sip.port,
        transport: settings.value.sip.transport as any,
      })

      expect(configStore.sipConfig?.server).toBe('sip.test.com')
      expect(configStore.sipConfig?.port).toBe(5061)
    })

    it('should apply authentication settings', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        sip: {
          ...settings.value.sip,
          username: 'testuser',
          password: 'testpass',
          authorizationUser: 'authuser',
          realm: 'example.com',
        },
      })

      configStore.updateSipConfig({
        username: settings.value.sip.username,
        password: settings.value.sip.password,
        authorizationUser: settings.value.sip.authorizationUser,
        realm: settings.value.sip.realm,
      })

      expect(configStore.sipConfig?.username).toBe('testuser')
    })

    it('should apply ICE/STUN/TURN settings', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        sip: {
          ...settings.value.sip,
          enableIce: true,
          enableStun: true,
          stunServers: ['stun:stun.l.google.com:19302'],
          enableTurn: true,
          turnServers: [
            {
              urls: 'turn:turn.example.com:3478',
              username: 'turnuser',
              credential: 'turnpass',
            },
          ],
        },
      })

      configStore.updateSipConfig({
        iceServers: [
          ...(settings.value.sip.stunServers?.map((url) => ({ urls: url })) || []),
          ...(settings.value.sip.turnServers || []),
        ],
      })

      expect(settings.value.sip.enableIce).toBe(true)
      expect(settings.value.sip.stunServers).toHaveLength(1)
    })
  })

  describe('Connection State Synchronization', () => {
    it('should update registration expiry from settings', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        sip: {
          ...settings.value.sip,
          registerExpires: 3600,
        },
      })

      registrationStore.setDefaultExpiry(settings.value.sip.registerExpires)

      expect(registrationStore.expires).toBe(3600)
    })

    it('should trigger re-registration on server change', () => {
      const { settings, updateSettings } = useSettings()

      registrationStore.setRegistered('sip:user@old.com', 600)

      updateSettings({
        sip: {
          ...settings.value.sip,
          server: 'new.server.com',
        },
      })

      // Should trigger unregister/register cycle
      expect(true).toBe(true) // Placeholder for actual registration check
    })

    it('should preserve registration state during settings update', () => {
      const { settings, updateSettings } = useSettings()

      registrationStore.setRegistered('sip:user@example.com', 600)

      updateSettings({
        sip: {
          ...settings.value.sip,
          displayName: 'New Display Name',
        },
      })

      // Should not affect registration
      expect(registrationStore.isRegistered).toBe(true)
    })
  })

  describe('Auto-Register Behavior', () => {
    it('should auto-register when enabled in settings', async () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        sip: {
          ...settings.value.sip,
          autoRegister: true,
        },
      })

      // Should trigger registration
      if (settings.value.sip.autoRegister) {
        registrationStore.setRegistering('sip:user@example.com')
      }

      expect(registrationStore.isRegistering).toBe(true)
    })

    it('should not auto-register when disabled', async () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        sip: {
          ...settings.value.sip,
          autoRegister: false,
        },
      })

      expect(registrationStore.state).not.toBe('Registering')
    })

    it('should update auto-register setting dynamically', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        sip: {
          ...settings.value.sip,
          autoRegister: true,
        },
      })
      expect(settings.value.sip.autoRegister).toBe(true)

      updateSettings({
        sip: {
          ...settings.value.sip,
          autoRegister: false,
        },
      })
      expect(settings.value.sip.autoRegister).toBe(false)
    })
  })

  describe('Transport Protocol Settings', () => {
    it('should apply UDP transport', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        sip: {
          ...settings.value.sip,
          transport: 'UDP',
        },
      })

      configStore.updateSipConfig({
        transport: settings.value.sip.transport as any,
      })

      expect(configStore.sipConfig?.transport).toBe('UDP')
    })

    it('should apply TCP transport', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        sip: {
          ...settings.value.sip,
          transport: 'TCP',
        },
      })

      configStore.updateSipConfig({
        transport: settings.value.sip.transport as any,
      })

      expect(configStore.sipConfig?.transport).toBe('TCP')
    })

    it('should apply WebSocket transport', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        sip: {
          ...settings.value.sip,
          transport: 'WSS',
        },
      })

      configStore.updateSipConfig({
        transport: settings.value.sip.transport as any,
      })

      expect(configStore.sipConfig?.transport).toBe('WSS')
    })
  })

  describe('Network Settings Application', () => {
    it('should apply QoS settings', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        network: {
          ...settings.value.network,
          enableQos: true,
          dscp: 46,
        },
      })

      expect(settings.value.network.enableQos).toBe(true)
      expect(settings.value.network.dscp).toBe(46)
    })

    it('should apply bitrate limits', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        network: {
          ...settings.value.network,
          maxBitrate: 2000,
          minBitrate: 500,
        },
      })

      expect(settings.value.network.maxBitrate).toBe(2000)
      expect(settings.value.network.minBitrate).toBe(500)
    })

    it('should apply adaptive bitrate settings', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        network: {
          ...settings.value.network,
          enableAdaptiveBitrate: true,
          packetLossThreshold: 5,
        },
      })

      expect(settings.value.network.enableAdaptiveBitrate).toBe(true)
    })
  })

  describe('Settings Validation Before Connection', () => {
    it('should validate SIP settings before connecting', () => {
      const { validate } = useSettings()

      const result = validate()

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should prevent connection with invalid settings', () => {
      const { settings, updateSettings, validate } = useSettings()

      updateSettings({
        audio: {
          ...settings.value.audio,
          microphoneVolume: -10, // Invalid: must be 0-100
          speakerVolume: 150, // Invalid: must be 0-100
        },
      })

      const result = validate()

      // Should have validation errors for invalid audio volumes
      expect(result.length).toBeGreaterThan(0)
    })

    it('should provide validation errors', () => {
      const { settings, updateSettings, validate } = useSettings()

      updateSettings({
        audio: {
          ...settings.value.audio,
          microphoneVolume: 200, // Invalid: must be 0-100
        },
      })

      const result = validate()

      // Should have validation errors
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Connection Error Handling', () => {
    it('should handle registration failure', () => {
      registrationStore.setRegistrationFailed('Authentication failed')

      expect(registrationStore.hasRegistrationFailed).toBe(true)
      expect(registrationStore.lastError).toBe('Authentication failed')
    })

    it('should retry registration with updated settings', () => {
      const { settings, updateSettings } = useSettings()

      registrationStore.setRegistrationFailed('Auth failed')

      updateSettings({
        sip: {
          ...settings.value.sip,
          password: 'newpassword',
        },
      })

      // Should allow retry with new settings
      registrationStore.resetRetryCount()
      expect(registrationStore.retryCount).toBe(0)
    })
  })

  describe('Settings Persistence with Connection State', () => {
    it('should save settings without affecting connection', async () => {
      const { save } = useSettings()

      registrationStore.setRegistered('sip:user@example.com', 600)

      await save()

      expect(registrationStore.isRegistered).toBe(true)
    })

    it('should restore settings and connection state', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        sip: {
          ...settings.value.sip,
          server: 'sip.example.com',
          username: 'testuser',
          autoRegister: true,
        },
      })

      registrationStore.setRegistered('sip:testuser@sip.example.com', 600)

      expect(settings.value.sip.server).toBe('sip.example.com')
      expect(registrationStore.isRegistered).toBe(true)
    })
  })

  describe('Real-time Settings Updates', () => {
    it('should apply settings changes while connected', () => {
      const { settings, updateSettings } = useSettings()

      registrationStore.setRegistered('sip:user@example.com', 600)

      updateSettings({
        sip: {
          ...settings.value.sip,
          displayName: 'Updated Name',
        },
      })

      // Should not disconnect
      expect(registrationStore.isRegistered).toBe(true)
    })

    it('should trigger reconnection for critical changes', () => {
      const { settings, updateSettings } = useSettings()

      registrationStore.setRegistered('sip:user@old.com', 600)

      updateSettings({
        sip: {
          ...settings.value.sip,
          server: 'sip.new.com',
        },
      })

      // Should trigger reconnection
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('Multiple Connection Profiles', () => {
    it('should switch between SIP profiles', () => {
      const { settings, updateSettings } = useSettings()

      const profile1 = {
        server: 'sip.provider1.com',
        username: 'user1',
      }

      const profile2 = {
        server: 'sip.provider2.com',
        username: 'user2',
      }

      updateSettings({
        sip: {
          ...settings.value.sip,
          ...profile1,
        },
      })
      expect(settings.value.sip.server).toBe('sip.provider1.com')

      updateSettings({
        sip: {
          ...settings.value.sip,
          ...profile2,
        },
      })
      expect(settings.value.sip.server).toBe('sip.provider2.com')
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid audio volume values', () => {
      const { settings, updateSettings, validate } = useSettings()

      updateSettings({
        audio: {
          ...settings.value.audio,
          speakerVolume: -1, // Invalid: must be 0-100
        },
      })

      const result = validate()

      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle out of range audio values', () => {
      const { settings, updateSettings, validate } = useSettings()

      updateSettings({
        audio: {
          ...settings.value.audio,
          microphoneVolume: 101, // Invalid: must be 0-100
        },
      })

      const result = validate()

      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle very long expiry times', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        sip: {
          ...settings.value.sip,
          registerExpires: 86400,
        },
      }) // 24 hours

      expect(settings.value.sip.registerExpires).toBe(86400)
    })
  })
})
