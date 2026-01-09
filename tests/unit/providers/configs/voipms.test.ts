import { describe, it, expect } from 'vitest'
import { voipmsProvider } from '../../../../src/providers/configs/voipms'
import type { ProviderConfig } from '../../../../src/providers/types'

describe('voipmsProvider', () => {
  describe('provider identity', () => {
    it('should have correct id', () => {
      expect(voipmsProvider.id).toBe('voipms')
    })

    it('should have correct name', () => {
      expect(voipmsProvider.name).toBe('VoIP.ms')
    })

    it('should have empty websocketUrl (requires user-provided gateway)', () => {
      expect(voipmsProvider.websocketUrl).toBe('')
    })

    it('should satisfy ProviderConfig interface', () => {
      const config: ProviderConfig = voipmsProvider
      expect(config).toBeDefined()
    })
  })

  describe('fields configuration', () => {
    it('should have exactly 3 fields', () => {
      expect(voipmsProvider.fields).toHaveLength(3)
    })

    describe('websocketUrl field', () => {
      it('should have correct name', () => {
        const wsField = voipmsProvider.fields.find((f) => f.name === 'websocketUrl')
        expect(wsField).toBeDefined()
      })

      it('should have correct label', () => {
        const wsField = voipmsProvider.fields.find((f) => f.name === 'websocketUrl')
        expect(wsField?.label).toBe('WebSocket Gateway URL')
      })

      it('should be of type text', () => {
        const wsField = voipmsProvider.fields.find((f) => f.name === 'websocketUrl')
        expect(wsField?.type).toBe('text')
      })

      it('should be required', () => {
        const wsField = voipmsProvider.fields.find((f) => f.name === 'websocketUrl')
        expect(wsField?.required).toBe(true)
      })

      it('should have helpText about WebRTC gateway requirement', () => {
        const wsField = voipmsProvider.fields.find((f) => f.name === 'websocketUrl')
        expect(wsField?.helpText).toBe('VoIP.ms requires a WebRTC gateway')
      })
    })

    describe('username field', () => {
      it('should have correct name', () => {
        const usernameField = voipmsProvider.fields.find((f) => f.name === 'username')
        expect(usernameField).toBeDefined()
      })

      it('should have correct label', () => {
        const usernameField = voipmsProvider.fields.find((f) => f.name === 'username')
        expect(usernameField?.label).toBe('Main Account')
      })

      it('should be of type text', () => {
        const usernameField = voipmsProvider.fields.find((f) => f.name === 'username')
        expect(usernameField?.type).toBe('text')
      })

      it('should be required', () => {
        const usernameField = voipmsProvider.fields.find((f) => f.name === 'username')
        expect(usernameField?.required).toBe(true)
      })
    })

    describe('password field', () => {
      it('should have correct name', () => {
        const passwordField = voipmsProvider.fields.find((f) => f.name === 'password')
        expect(passwordField).toBeDefined()
      })

      it('should have correct label', () => {
        const passwordField = voipmsProvider.fields.find((f) => f.name === 'password')
        expect(passwordField?.label).toBe('SIP Password')
      })

      it('should be of type password', () => {
        const passwordField = voipmsProvider.fields.find((f) => f.name === 'password')
        expect(passwordField?.type).toBe('password')
      })

      it('should be required', () => {
        const passwordField = voipmsProvider.fields.find((f) => f.name === 'password')
        expect(passwordField?.required).toBe(true)
      })

      it('should have helpUrl to VoIP.ms settings', () => {
        const passwordField = voipmsProvider.fields.find((f) => f.name === 'password')
        expect(passwordField?.helpUrl).toBe('https://voip.ms/m/settings.php')
      })
    })
  })

  describe('mapCredentials', () => {
    it('should return websocketUrl as uri', () => {
      const result = voipmsProvider.mapCredentials({
        websocketUrl: 'wss://my-gateway.example.com',
        username: 'testuser',
        password: 'testpass',
      })
      expect(result.uri).toBe('wss://my-gateway.example.com')
    })

    it('should build sipUri from username with voip.ms domain', () => {
      const result = voipmsProvider.mapCredentials({
        websocketUrl: 'wss://my-gateway.example.com',
        username: 'testuser',
        password: 'testpass',
      })
      expect(result.sipUri).toBe('sip:testuser@voip.ms')
    })

    it('should pass through password', () => {
      const result = voipmsProvider.mapCredentials({
        websocketUrl: 'wss://my-gateway.example.com',
        username: 'testuser',
        password: 'secretpassword',
      })
      expect(result.password).toBe('secretpassword')
    })

    it('should handle username with special characters', () => {
      const result = voipmsProvider.mapCredentials({
        websocketUrl: 'wss://gateway.example.com',
        username: 'user_123456',
        password: 'testpass',
      })
      expect(result.sipUri).toBe('sip:user_123456@voip.ms')
    })

    it('should handle different gateway URLs', () => {
      const result = voipmsProvider.mapCredentials({
        websocketUrl: 'wss://webrtc.mypbx.local:8089/ws',
        username: 'myaccount',
        password: 'mypass',
      })
      expect(result.uri).toBe('wss://webrtc.mypbx.local:8089/ws')
    })

    it('should return valid SipCredentials structure', () => {
      const result = voipmsProvider.mapCredentials({
        websocketUrl: 'wss://gateway.example.com',
        username: 'myuser',
        password: 'mypass',
      })

      // Verify all required SipCredentials properties exist
      expect(result).toHaveProperty('uri')
      expect(result).toHaveProperty('sipUri')
      expect(result).toHaveProperty('password')

      // Verify types
      expect(typeof result.uri).toBe('string')
      expect(typeof result.sipUri).toBe('string')
      expect(typeof result.password).toBe('string')
    })
  })
})
