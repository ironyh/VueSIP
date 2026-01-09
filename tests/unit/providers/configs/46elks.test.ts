import { describe, it, expect } from 'vitest'
import { elks46Provider } from '../../../../src/providers/configs/46elks'
import type { ProviderConfig } from '../../../../src/providers/types'

describe('46elks provider config', () => {
  describe('provider metadata', () => {
    it('should have correct id', () => {
      expect(elks46Provider.id).toBe('46elks')
    })

    it('should have correct name', () => {
      expect(elks46Provider.name).toBe('46 elks')
    })

    it('should have correct websocketUrl', () => {
      expect(elks46Provider.websocketUrl).toBe('wss://voip.46elks.com/w1/websocket')
    })

    it('should satisfy ProviderConfig type', () => {
      const config: ProviderConfig = elks46Provider
      expect(config).toBeDefined()
    })
  })

  describe('provider fields', () => {
    it('should have exactly 2 fields', () => {
      expect(elks46Provider.fields).toHaveLength(2)
    })

    describe('phoneNumber field', () => {
      it('should be the first field', () => {
        expect(elks46Provider.fields[0].name).toBe('phoneNumber')
      })

      it('should have correct label', () => {
        expect(elks46Provider.fields[0].label).toBe('Phone Number')
      })

      it('should be text type', () => {
        expect(elks46Provider.fields[0].type).toBe('text')
      })

      it('should have correct placeholder', () => {
        expect(elks46Provider.fields[0].placeholder).toBe('46700000000')
      })

      it('should be required', () => {
        expect(elks46Provider.fields[0].required).toBe(true)
      })

      it('should have correct helpText', () => {
        expect(elks46Provider.fields[0].helpText).toBe('Your 46elks number without +')
      })
    })

    describe('secret field', () => {
      it('should be the second field', () => {
        expect(elks46Provider.fields[1].name).toBe('secret')
      })

      it('should have correct label', () => {
        expect(elks46Provider.fields[1].label).toBe('Secret')
      })

      it('should be password type', () => {
        expect(elks46Provider.fields[1].type).toBe('password')
      })

      it('should be required', () => {
        expect(elks46Provider.fields[1].required).toBe(true)
      })

      it('should have correct helpText', () => {
        expect(elks46Provider.fields[1].helpText).toBe('From API: GET /a1/numbers/{number}')
      })

      it('should have correct helpUrl', () => {
        expect(elks46Provider.fields[1].helpUrl).toBe(
          'https://46elks.com/docs/webrtc-client-connect'
        )
      })
    })
  })

  describe('mapCredentials', () => {
    it('should return correct uri', () => {
      const input = { phoneNumber: '46700000000', secret: 'mysecret123' }
      const result = elks46Provider.mapCredentials(input)
      expect(result.uri).toBe('wss://voip.46elks.com/w1/websocket')
    })

    it('should build sipUri from phone number', () => {
      const input = { phoneNumber: '46700000000', secret: 'mysecret123' }
      const result = elks46Provider.mapCredentials(input)
      expect(result.sipUri).toBe('sip:46700000000@voip.46elks.com')
    })

    it('should map secret to password', () => {
      const input = { phoneNumber: '46700000000', secret: 'mysecret123' }
      const result = elks46Provider.mapCredentials(input)
      expect(result.password).toBe('mysecret123')
    })

    it('should handle different phone numbers', () => {
      const input = { phoneNumber: '46701234567', secret: 'anothersecret' }
      const result = elks46Provider.mapCredentials(input)
      expect(result.sipUri).toBe('sip:46701234567@voip.46elks.com')
      expect(result.password).toBe('anothersecret')
    })

    it('should return all required SipCredentials properties', () => {
      const input = { phoneNumber: '46700000000', secret: 'mysecret123' }
      const result = elks46Provider.mapCredentials(input)

      expect(result).toHaveProperty('uri')
      expect(result).toHaveProperty('sipUri')
      expect(result).toHaveProperty('password')
    })
  })
})
