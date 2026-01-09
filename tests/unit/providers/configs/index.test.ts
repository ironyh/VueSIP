/**
 * Provider Configs Index Tests
 *
 * Tests for the provider configs barrel export file.
 * Verifies all provider configs are exported correctly and
 * builtInProviders array is properly configured.
 */
import { describe, it, expect } from 'vitest'
import {
  ownPbxProvider,
  elks46Provider,
  telnyxProvider,
  voipmsProvider,
  builtInProviders,
} from '../../../../src/providers/configs'

describe('Provider Configs Index', () => {
  describe('individual provider exports', () => {
    it('should export ownPbxProvider', () => {
      expect(ownPbxProvider).toBeDefined()
      expect(ownPbxProvider.id).toBe('own-pbx')
    })

    it('should export elks46Provider', () => {
      expect(elks46Provider).toBeDefined()
      expect(elks46Provider.id).toBe('46elks')
    })

    it('should export telnyxProvider', () => {
      expect(telnyxProvider).toBeDefined()
      expect(telnyxProvider.id).toBe('telnyx')
    })

    it('should export voipmsProvider', () => {
      expect(voipmsProvider).toBeDefined()
      expect(voipmsProvider.id).toBe('voipms')
    })
  })

  describe('builtInProviders array', () => {
    it('should export builtInProviders array', () => {
      expect(builtInProviders).toBeDefined()
      expect(Array.isArray(builtInProviders)).toBe(true)
    })

    it('should have 4 providers', () => {
      expect(builtInProviders).toHaveLength(4)
    })

    it('should have ownPbxProvider first (default provider)', () => {
      expect(builtInProviders[0]).toBe(ownPbxProvider)
      expect(builtInProviders[0].id).toBe('own-pbx')
    })

    it('should contain all provider configs', () => {
      const ids = builtInProviders.map((p) => p.id)
      expect(ids).toContain('own-pbx')
      expect(ids).toContain('46elks')
      expect(ids).toContain('telnyx')
      expect(ids).toContain('voipms')
    })

    it('should have providers in correct order', () => {
      const ids = builtInProviders.map((p) => p.id)
      expect(ids).toEqual(['own-pbx', '46elks', 'telnyx', 'voipms'])
    })

    it('should have all providers with valid mapCredentials functions', () => {
      builtInProviders.forEach((provider) => {
        expect(typeof provider.mapCredentials).toBe('function')
      })
    })
  })
})
