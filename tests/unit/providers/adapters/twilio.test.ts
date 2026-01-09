import { describe, it, expect } from 'vitest'
import { twilioAdapter } from '../../../../src/providers/adapters/twilio'
import type { ProviderAdapter } from '../../../../src/providers/types'

describe('twilioAdapter', () => {
  describe('provider identity', () => {
    it('should have correct id', () => {
      expect(twilioAdapter.id).toBe('twilio')
    })

    it('should have correct name', () => {
      expect(twilioAdapter.name).toBe('Twilio')
    })

    it('should have empty websocketUrl (SDK-based connection)', () => {
      expect(twilioAdapter.websocketUrl).toBe('')
    })

    it('should satisfy ProviderAdapter interface', () => {
      const adapter: ProviderAdapter = twilioAdapter
      expect(adapter).toBeDefined()
    })
  })

  describe('fields configuration', () => {
    it('should have exactly 3 fields', () => {
      expect(twilioAdapter.fields).toHaveLength(3)
    })

    describe('accountSid field', () => {
      it('should have correct name', () => {
        const field = twilioAdapter.fields.find((f) => f.name === 'accountSid')
        expect(field).toBeDefined()
      })

      it('should have correct label', () => {
        const field = twilioAdapter.fields.find((f) => f.name === 'accountSid')
        expect(field?.label).toBe('Account SID')
      })

      it('should be of type text', () => {
        const field = twilioAdapter.fields.find((f) => f.name === 'accountSid')
        expect(field?.type).toBe('text')
      })

      it('should be required', () => {
        const field = twilioAdapter.fields.find((f) => f.name === 'accountSid')
        expect(field?.required).toBe(true)
      })
    })

    describe('authToken field', () => {
      it('should have correct name', () => {
        const field = twilioAdapter.fields.find((f) => f.name === 'authToken')
        expect(field).toBeDefined()
      })

      it('should have correct label', () => {
        const field = twilioAdapter.fields.find((f) => f.name === 'authToken')
        expect(field?.label).toBe('Auth Token')
      })

      it('should be of type password', () => {
        const field = twilioAdapter.fields.find((f) => f.name === 'authToken')
        expect(field?.type).toBe('password')
      })

      it('should be required', () => {
        const field = twilioAdapter.fields.find((f) => f.name === 'authToken')
        expect(field?.required).toBe(true)
      })
    })

    describe('twimlAppSid field', () => {
      it('should have correct name', () => {
        const field = twilioAdapter.fields.find((f) => f.name === 'twimlAppSid')
        expect(field).toBeDefined()
      })

      it('should have correct label', () => {
        const field = twilioAdapter.fields.find((f) => f.name === 'twimlAppSid')
        expect(field?.label).toBe('TwiML App SID')
      })

      it('should be of type text', () => {
        const field = twilioAdapter.fields.find((f) => f.name === 'twimlAppSid')
        expect(field?.type).toBe('text')
      })

      it('should be required', () => {
        const field = twilioAdapter.fields.find((f) => f.name === 'twimlAppSid')
        expect(field?.required).toBe(true)
      })

      it('should have helpUrl to Twilio TwiML Apps console', () => {
        const field = twilioAdapter.fields.find((f) => f.name === 'twimlAppSid')
        expect(field?.helpUrl).toBe('https://console.twilio.com/us1/develop/voice/twiml-apps')
      })
    })
  })

  describe('mapCredentials', () => {
    it('should return empty uri (placeholder)', () => {
      const result = twilioAdapter.mapCredentials({
        accountSid: 'AC123',
        authToken: 'token123',
        twimlAppSid: 'AP456',
      })
      expect(result.uri).toBe('')
    })

    it('should return empty sipUri (placeholder)', () => {
      const result = twilioAdapter.mapCredentials({
        accountSid: 'AC123',
        authToken: 'token123',
        twimlAppSid: 'AP456',
      })
      expect(result.sipUri).toBe('')
    })

    it('should return empty password (placeholder)', () => {
      const result = twilioAdapter.mapCredentials({
        accountSid: 'AC123',
        authToken: 'token123',
        twimlAppSid: 'AP456',
      })
      expect(result.password).toBe('')
    })

    it('should return valid SipCredentials structure', () => {
      const result = twilioAdapter.mapCredentials({
        accountSid: 'AC123',
        authToken: 'token123',
        twimlAppSid: 'AP456',
      })

      expect(result).toHaveProperty('uri')
      expect(result).toHaveProperty('sipUri')
      expect(result).toHaveProperty('password')

      expect(typeof result.uri).toBe('string')
      expect(typeof result.sipUri).toBe('string')
      expect(typeof result.password).toBe('string')
    })
  })

  describe('connect method', () => {
    it('should have connect method defined', () => {
      expect(twilioAdapter.connect).toBeDefined()
      expect(typeof twilioAdapter.connect).toBe('function')
    })

    it('should throw error indicating SDK requirement', async () => {
      const mockCredentials = {
        uri: '',
        sipUri: '',
        password: '',
      }
      const mockSipClient = {} as any

      await expect(twilioAdapter.connect!(mockCredentials, mockSipClient)).rejects.toThrow(
        'Twilio adapter requires @twilio/voice-sdk. See documentation for setup.'
      )
    })
  })
})
