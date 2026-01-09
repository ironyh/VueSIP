import { describe, it, expect } from 'vitest'
import { telnyxProvider } from '../../../../src/providers/configs/telnyx'
import type { ProviderConfig } from '../../../../src/providers/types'

describe('telnyxProvider', () => {
  describe('provider identity', () => {
    it('should have correct id', () => {
      expect(telnyxProvider.id).toBe('telnyx')
    })

    it('should have correct name', () => {
      expect(telnyxProvider.name).toBe('Telnyx')
    })

    it('should have correct websocketUrl', () => {
      expect(telnyxProvider.websocketUrl).toBe('wss://rtc.telnyx.com')
    })

    it('should satisfy ProviderConfig interface', () => {
      const config: ProviderConfig = telnyxProvider
      expect(config).toBeDefined()
    })
  })

  describe('fields configuration', () => {
    it('should have exactly 2 fields', () => {
      expect(telnyxProvider.fields).toHaveLength(2)
    })

    describe('username field', () => {
      it('should have correct name', () => {
        const usernameField = telnyxProvider.fields.find((f) => f.name === 'username')
        expect(usernameField).toBeDefined()
      })

      it('should have correct label', () => {
        const usernameField = telnyxProvider.fields.find((f) => f.name === 'username')
        expect(usernameField?.label).toBe('SIP Username')
      })

      it('should be of type text', () => {
        const usernameField = telnyxProvider.fields.find((f) => f.name === 'username')
        expect(usernameField?.type).toBe('text')
      })

      it('should be required', () => {
        const usernameField = telnyxProvider.fields.find((f) => f.name === 'username')
        expect(usernameField?.required).toBe(true)
      })

      it('should have helpText about SIP Connection credentials', () => {
        const usernameField = telnyxProvider.fields.find((f) => f.name === 'username')
        expect(usernameField?.helpText).toBe('From your SIP Connection credentials')
      })
    })

    describe('password field', () => {
      it('should have correct name', () => {
        const passwordField = telnyxProvider.fields.find((f) => f.name === 'password')
        expect(passwordField).toBeDefined()
      })

      it('should have correct label', () => {
        const passwordField = telnyxProvider.fields.find((f) => f.name === 'password')
        expect(passwordField?.label).toBe('SIP Password')
      })

      it('should be of type password', () => {
        const passwordField = telnyxProvider.fields.find((f) => f.name === 'password')
        expect(passwordField?.type).toBe('password')
      })

      it('should be required', () => {
        const passwordField = telnyxProvider.fields.find((f) => f.name === 'password')
        expect(passwordField?.required).toBe(true)
      })

      it('should have helpUrl to Telnyx portal', () => {
        const passwordField = telnyxProvider.fields.find((f) => f.name === 'password')
        expect(passwordField?.helpUrl).toBe('https://portal.telnyx.com/#/app/sip-trunks')
      })
    })
  })

  describe('mapCredentials', () => {
    it('should return correct uri', () => {
      const result = telnyxProvider.mapCredentials({
        username: 'testuser',
        password: 'testpass',
      })
      expect(result.uri).toBe('wss://rtc.telnyx.com')
    })

    it('should build sipUri from username', () => {
      const result = telnyxProvider.mapCredentials({
        username: 'testuser',
        password: 'testpass',
      })
      expect(result.sipUri).toBe('sip:testuser@sip.telnyx.com')
    })

    it('should pass through password', () => {
      const result = telnyxProvider.mapCredentials({
        username: 'testuser',
        password: 'secretpassword',
      })
      expect(result.password).toBe('secretpassword')
    })

    it('should handle username with special characters', () => {
      const result = telnyxProvider.mapCredentials({
        username: 'user+test123',
        password: 'testpass',
      })
      expect(result.sipUri).toBe('sip:user+test123@sip.telnyx.com')
    })

    it('should return valid SipCredentials structure', () => {
      const result = telnyxProvider.mapCredentials({
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
