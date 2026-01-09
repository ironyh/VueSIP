import { describe, it, expect } from 'vitest'
import { ownPbxProvider } from '../../../../src/providers/configs/own-pbx'
import type { ProviderConfig } from '../../../../src/providers/types'

describe('own-pbx provider config', () => {
  describe('provider identity', () => {
    it('should have correct id', () => {
      expect(ownPbxProvider.id).toBe('own-pbx')
    })

    it('should have correct name', () => {
      expect(ownPbxProvider.name).toBe('Own PBX (Asterisk/FreePBX)')
    })

    it('should have empty websocketUrl (user provides)', () => {
      expect(ownPbxProvider.websocketUrl).toBe('')
    })

    it('should implement ProviderConfig interface', () => {
      // Type check - this verifies the interface at compile time
      const config: ProviderConfig = ownPbxProvider
      expect(config).toBeDefined()
    })
  })

  describe('provider fields', () => {
    it('should have exactly 4 fields', () => {
      expect(ownPbxProvider.fields).toHaveLength(4)
    })

    it('should have websocketUrl field with correct properties', () => {
      const field = ownPbxProvider.fields.find((f) => f.name === 'websocketUrl')
      expect(field).toBeDefined()
      expect(field?.label).toBe('WebSocket URL')
      expect(field?.type).toBe('text')
      expect(field?.placeholder).toBe('wss://pbx.example.com:8089/ws')
      expect(field?.required).toBe(true)
    })

    it('should have sipUri field with correct properties', () => {
      const field = ownPbxProvider.fields.find((f) => f.name === 'sipUri')
      expect(field).toBeDefined()
      expect(field?.label).toBe('SIP URI')
      expect(field?.type).toBe('text')
      expect(field?.placeholder).toBe('sip:1000@pbx.example.com')
      expect(field?.required).toBe(true)
    })

    it('should have password field with correct properties', () => {
      const field = ownPbxProvider.fields.find((f) => f.name === 'password')
      expect(field).toBeDefined()
      expect(field?.label).toBe('Password')
      expect(field?.type).toBe('password')
      expect(field?.required).toBe(true)
    })

    it('should have displayName field with correct properties', () => {
      const field = ownPbxProvider.fields.find((f) => f.name === 'displayName')
      expect(field).toBeDefined()
      expect(field?.label).toBe('Display Name')
      expect(field?.type).toBe('text')
      expect(field?.required).toBeFalsy() // optional field
    })

    it('should have fields in correct order', () => {
      const fieldNames = ownPbxProvider.fields.map((f) => f.name)
      expect(fieldNames).toEqual(['websocketUrl', 'sipUri', 'password', 'displayName'])
    })
  })

  describe('mapCredentials', () => {
    it('should transform input to SipCredentials format', () => {
      const input = {
        websocketUrl: 'wss://pbx.example.com:8089/ws',
        sipUri: 'sip:1000@pbx.example.com',
        password: 'secret123',
        displayName: 'John Doe',
      }

      const result = ownPbxProvider.mapCredentials(input)

      expect(result).toEqual({
        uri: 'wss://pbx.example.com:8089/ws',
        sipUri: 'sip:1000@pbx.example.com',
        password: 'secret123',
        displayName: 'John Doe',
      })
    })

    it('should handle missing optional displayName', () => {
      const input = {
        websocketUrl: 'wss://pbx.example.com:8089/ws',
        sipUri: 'sip:1000@pbx.example.com',
        password: 'secret123',
      }

      const result = ownPbxProvider.mapCredentials(input)

      expect(result.uri).toBe('wss://pbx.example.com:8089/ws')
      expect(result.sipUri).toBe('sip:1000@pbx.example.com')
      expect(result.password).toBe('secret123')
      expect(result.displayName).toBeUndefined()
    })

    it('should map websocketUrl to uri field', () => {
      const input = {
        websocketUrl: 'wss://my-custom-pbx.local/ws',
        sipUri: 'sip:ext100@my-custom-pbx.local',
        password: 'pass',
      }

      const result = ownPbxProvider.mapCredentials(input)

      expect(result.uri).toBe(input.websocketUrl)
    })

    it('should pass through sipUri unchanged', () => {
      const input = {
        websocketUrl: 'wss://pbx.example.com/ws',
        sipUri: 'sip:user@different-domain.com',
        password: 'pass',
      }

      const result = ownPbxProvider.mapCredentials(input)

      expect(result.sipUri).toBe(input.sipUri)
    })
  })
})
