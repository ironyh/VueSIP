/**
 * Unit tests for 46elks provider configuration
 */

import { describe, it, expect } from 'vitest'
import { elks46Provider } from '../configs/46elks'

describe('46elks Provider Config', () => {
  describe('provider configuration', () => {
    it('should have correct provider id', () => {
      expect(elks46Provider.id).toBe('46elks')
    })

    it('should have correct provider name', () => {
      expect(elks46Provider.name).toBe('46 elks')
    })

    it('should have correct websocket URL', () => {
      expect(elks46Provider.websocketUrl).toBe('wss://voip.46elks.com/w1/websocket')
    })

    it('should have required fields', () => {
      expect(elks46Provider.fields).toHaveLength(2)

      const phoneNumberField = elks46Provider.fields.find((f) => f.name === 'phoneNumber')
      expect(phoneNumberField).toBeDefined()
      expect(phoneNumberField?.required).toBe(true)
      expect(phoneNumberField?.type).toBe('text')

      const secretField = elks46Provider.fields.find((f) => f.name === 'secret')
      expect(secretField).toBeDefined()
      expect(secretField?.required).toBe(true)
      expect(secretField?.type).toBe('password')
    })
  })

  describe('mapCredentials', () => {
    it('should map credentials correctly', () => {
      const result = elks46Provider.mapCredentials({
        phoneNumber: '46700000000',
        secret: 'test-secret',
      })

      expect(result.uri).toBe('wss://voip.46elks.com/w1/websocket')
      expect(result.sipUri).toBe('sip:46700000000@voip.46elks.com')
      expect(result.password).toBe('test-secret')
      expect(result.audioCodec).toBe('pcma')
    })

    it('should handle empty secret', () => {
      const result = elks46Provider.mapCredentials({
        phoneNumber: '46700000000',
        secret: '',
      })

      expect(result.password).toBe('')
    })

    it('should handle undefined secret', () => {
      const result = elks46Provider.mapCredentials({
        phoneNumber: '46700000000',
      } as Record<string, string>)

      expect(result.password).toBe('')
    })

    it('should use pcma audio codec', () => {
      const result = elks46Provider.mapCredentials({
        phoneNumber: '46700000000',
        secret: 'test',
      })

      expect(result.audioCodec).toBe('pcma')
    })
  })
})
