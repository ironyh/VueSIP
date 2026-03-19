import { describe, it, expect } from 'vitest'
import { voipmsProvider } from '../configs/voipms'

describe('voipmsProvider', () => {
  describe('provider metadata', () => {
    it('should have correct provider id', () => {
      expect(voipmsProvider.id).toBe('voipms')
    })

    it('should have correct display name', () => {
      expect(voipmsProvider.name).toBe('VoIP.ms')
    })

    it('should have empty default websocket URL (user provides their own gateway)', () => {
      expect(voipmsProvider.websocketUrl).toBe('')
    })
  })

  describe('fields', () => {
    it('should define three fields', () => {
      expect(voipmsProvider.fields).toHaveLength(3)
    })

    it('should require websocketUrl field', () => {
      const field = voipmsProvider.fields.find((f) => f.name === 'websocketUrl')
      expect(field).toBeDefined()
      expect(field?.type).toBe('text')
      expect(field?.required).toBe(true)
      expect(field?.label).toBe('WebSocket Gateway URL')
    })

    it('should require username field', () => {
      const field = voipmsProvider.fields.find((f) => f.name === 'username')
      expect(field).toBeDefined()
      expect(field?.type).toBe('text')
      expect(field?.required).toBe(true)
      expect(field?.label).toBe('Main Account')
    })

    it('should require password field', () => {
      const field = voipmsProvider.fields.find((f) => f.name === 'password')
      expect(field).toBeDefined()
      expect(field?.type).toBe('password')
      expect(field?.required).toBe(true)
      expect(field?.label).toBe('SIP Password')
    })

    it('should have no optional displayName field (only 3 required/optional fields)', () => {
      const field = voipmsProvider.fields.find((f) => f.name === 'displayName')
      expect(field).toBeUndefined()
    })
  })

  describe('mapCredentials', () => {
    it('should map full input to SIP credentials', () => {
      const result = voipmsProvider.mapCredentials({
        websocketUrl: 'wss://gateway.example.com/ws',
        username: 'myuser123',
        password: 'mysecretpass',
      })

      expect(result.uri).toBe('wss://gateway.example.com/ws')
      expect(result.sipUri).toBe('sip:myuser123@voip.ms')
      expect(result.password).toBe('mysecretpass')
    })

    it('should use voip.ms as SIP domain in sipUri', () => {
      const result = voipmsProvider.mapCredentials({
        websocketUrl: 'wss://my-gateway.com/asterisk/ws',
        username: '4670123456',
        password: 'secret',
      })

      expect(result.sipUri).toBe('sip:4670123456@voip.ms')
    })

    it('should handle missing websocketUrl (empty uri)', () => {
      const result = voipmsProvider.mapCredentials({
        username: 'myuser',
        password: 'pass',
      })

      expect(result.uri).toBe('')
    })

    it('should handle missing password gracefully', () => {
      const result = voipmsProvider.mapCredentials({
        websocketUrl: 'wss://gateway.com/ws',
        username: 'myuser',
      })

      expect(result.password).toBe('')
    })

    it('should handle empty displayName (undefined)', () => {
      const result = voipmsProvider.mapCredentials({
        websocketUrl: 'wss://gateway.com/ws',
        username: 'myuser',
        password: 'pass',
      })

      expect(result.displayName).toBeUndefined()
    })

    it('should use main account as sipUri username (not the websocketUrl)', () => {
      // A common mistake would be to use the websocketUrl as part of sipUri
      const result = voipmsProvider.mapCredentials({
        websocketUrl: 'wss://gateway.example.com/ws',
        username: 'mainaccount',
        password: 'pass',
      })

      // Should be sip:username@voip.ms, NOT sip:websocketUrl
      expect(result.sipUri).toBe('sip:mainaccount@voip.ms')
      expect(result.sipUri).not.toContain('gateway.example.com')
    })
  })
})
