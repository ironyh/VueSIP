import { describe, it, expect } from 'vitest'
import type { AmiConfig } from '../src/types/ami.types'

describe('AMI Types', () => {
  describe('AmiConfig', () => {
    it('should accept valid config with required url', () => {
      const config: AmiConfig = {
        url: 'ws://pbx.example.com:8080',
      }
      expect(config.url).toBe('ws://pbx.example.com:8080')
      expect(config.autoReconnect).toBeUndefined()
    })

    it('should accept full config with all optional properties', () => {
      const config: AmiConfig = {
        url: 'ws://pbx.example.com:8080',
        autoReconnect: true,
        reconnectDelay: 5000,
        maxReconnectAttempts: 10,
        connectionTimeout: 15000,
      }
      expect(config.autoReconnect).toBe(true)
      expect(config.reconnectDelay).toBe(5000)
      expect(config.maxReconnectAttempts).toBe(10)
      expect(config.connectionTimeout).toBe(15000)
    })

    it('should accept required url property', () => {
      const config: AmiConfig = {
        url: 'ws://localhost:8080',
      }
      expect(config.url).toBeDefined()
    })
  })
})
