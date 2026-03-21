import { describe, it, expect } from 'vitest'
import { telnyxProvider } from '../configs/telnyx'

describe('telnyxProvider', () => {
  describe('provider metadata', () => {
    it('should have correct provider id', () => {
      expect(telnyxProvider.id).toBe('telnyx')
    })

    it('should have correct display name', () => {
      expect(telnyxProvider.name).toBe('Telnyx')
    })

    it('should have correct default websocket URL', () => {
      expect(telnyxProvider.websocketUrl).toBe('wss://rtc.telnyx.com')
    })
  })

  describe('fields', () => {
    it('should define two fields', () => {
      expect(telnyxProvider.fields).toHaveLength(2)
    })

    it('should require username field', () => {
      const field = telnyxProvider.fields.find((f) => f.name === 'username')
      expect(field).toBeDefined()
      expect(field?.type).toBe('text')
      expect(field?.required).toBe(true)
      expect(field?.label).toBe('SIP Username')
      expect(field?.helpText).toBe('From your SIP Connection credentials')
    })

    it('should require password field', () => {
      const field = telnyxProvider.fields.find((f) => f.name === 'password')
      expect(field).toBeDefined()
      expect(field?.type).toBe('password')
      expect(field?.required).toBe(true)
      expect(field?.label).toBe('SIP Password')
      expect(field?.helpUrl).toBe('https://portal.telnyx.com/#/app/sip-trunks')
    })
  })

  describe('mapCredentials', () => {
    it('should map full input to SIP credentials', () => {
      const result = telnyxProvider.mapCredentials({
        username: 'myuser123',
        password: 'mysecretpass',
      })

      expect(result.uri).toBe('wss://rtc.telnyx.com')
      expect(result.sipUri).toBe('sip:myuser123@sip.telnyx.com')
      expect(result.password).toBe('mysecretpass')
    })

    it('should use telnyx SIP domain in sipUri', () => {
      const result = telnyxProvider.mapCredentials({
        username: 'myaccount',
        password: 'secret',
      })

      expect(result.sipUri).toBe('sip:myaccount@sip.telnyx.com')
    })

    it('should handle missing password gracefully', () => {
      const result = telnyxProvider.mapCredentials({
        username: 'myuser',
      })

      expect(result.password).toBe('')
    })
  })
})
