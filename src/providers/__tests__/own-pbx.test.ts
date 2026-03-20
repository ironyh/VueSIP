import { describe, it, expect } from 'vitest'
import { ownPbxProvider } from '../configs/own-pbx'

describe('ownPbxProvider', () => {
  describe('provider metadata', () => {
    it('should have correct provider id', () => {
      expect(ownPbxProvider.id).toBe('own-pbx')
    })

    it('should have correct display name', () => {
      expect(ownPbxProvider.name).toBe('Own PBX (Asterisk/FreePBX)')
    })

    it('should have empty default websocket URL', () => {
      expect(ownPbxProvider.websocketUrl).toBe('')
    })
  })

  describe('fields', () => {
    it('should define four fields', () => {
      expect(ownPbxProvider.fields).toHaveLength(4)
    })

    it('should require websocketUrl field', () => {
      const field = ownPbxProvider.fields.find((f) => f.name === 'websocketUrl')
      expect(field).toBeDefined()
      expect(field?.type).toBe('text')
      expect(field?.required).toBe(true)
      expect(field?.label).toBe('WebSocket URL')
      expect(field?.placeholder).toBe('wss://pbx.example.com:8089/ws')
    })

    it('should require sipUri field', () => {
      const field = ownPbxProvider.fields.find((f) => f.name === 'sipUri')
      expect(field).toBeDefined()
      expect(field?.type).toBe('text')
      expect(field?.required).toBe(true)
      expect(field?.label).toBe('SIP URI')
      expect(field?.placeholder).toBe('sip:1000@pbx.example.com')
    })

    it('should require password field', () => {
      const field = ownPbxProvider.fields.find((f) => f.name === 'password')
      expect(field).toBeDefined()
      expect(field?.type).toBe('password')
      expect(field?.required).toBe(true)
      expect(field?.label).toBe('Password')
    })

    it('should have optional displayName field', () => {
      const field = ownPbxProvider.fields.find((f) => f.name === 'displayName')
      expect(field).toBeDefined()
      expect(field?.type).toBe('text')
      expect(field?.required).toBeUndefined()
      expect(field?.label).toBe('Display Name')
    })
  })

  describe('mapCredentials', () => {
    it('should map full input to SIP credentials', () => {
      const result = ownPbxProvider.mapCredentials({
        websocketUrl: 'wss://pbx.example.com:8089/ws',
        sipUri: 'sip:1000@pbx.example.com',
        password: 'mysecretpass',
        displayName: 'John Doe',
      })

      expect(result.uri).toBe('wss://pbx.example.com:8089/ws')
      expect(result.sipUri).toBe('sip:1000@pbx.example.com')
      expect(result.password).toBe('mysecretpass')
      expect(result.displayName).toBe('John Doe')
    })

    it('should handle missing websocketUrl gracefully', () => {
      const result = ownPbxProvider.mapCredentials({
        sipUri: 'sip:1000@pbx.example.com',
        password: 'secret',
      })

      expect(result.uri).toBe('')
      expect(result.sipUri).toBe('sip:1000@pbx.example.com')
      expect(result.password).toBe('secret')
    })

    it('should handle missing sipUri gracefully', () => {
      const result = ownPbxProvider.mapCredentials({
        websocketUrl: 'wss://pbx.example.com:8089/ws',
        password: 'secret',
      })

      expect(result.uri).toBe('wss://pbx.example.com:8089/ws')
      expect(result.sipUri).toBe('')
      expect(result.password).toBe('secret')
    })

    it('should handle missing displayName gracefully', () => {
      const result = ownPbxProvider.mapCredentials({
        websocketUrl: 'wss://pbx.example.com:8089/ws',
        sipUri: 'sip:1000@pbx.example.com',
        password: 'secret',
      })

      expect(result.displayName).toBeUndefined()
    })
  })
})
