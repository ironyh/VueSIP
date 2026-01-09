import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerProvider,
  getProvider,
  getAllProviders,
  removeProvider,
  resetRegistry,
} from '../../../src/providers/providerRegistry'
import type { ProviderConfig } from '../../../src/providers/types'

describe('providerRegistry', () => {
  const testProvider: ProviderConfig = {
    id: 'test-provider',
    name: 'Test Provider',
    websocketUrl: 'wss://test.example.com/ws',
    fields: [
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
    mapCredentials: (input) => ({
      uri: 'wss://test.example.com/ws',
      sipUri: `sip:${input.username}@test.example.com`,
      password: input.password,
    }),
  }

  beforeEach(() => {
    resetRegistry()
  })

  describe('registerProvider', () => {
    it('should register a new provider', () => {
      registerProvider(testProvider)
      const provider = getProvider('test-provider')
      expect(provider).toBeDefined()
      expect(provider?.name).toBe('Test Provider')
    })

    it('should throw if provider ID already exists', () => {
      registerProvider(testProvider)
      expect(() => registerProvider(testProvider)).toThrow(
        'Provider with ID "test-provider" is already registered'
      )
    })

    it('should allow overwrite with force option', () => {
      registerProvider(testProvider)
      const updatedProvider = { ...testProvider, name: 'Updated Provider' }
      registerProvider(updatedProvider, { force: true })
      const provider = getProvider('test-provider')
      expect(provider?.name).toBe('Updated Provider')
    })
  })

  describe('getProvider', () => {
    it('should return undefined for non-existent provider', () => {
      const provider = getProvider('non-existent')
      expect(provider).toBeUndefined()
    })

    it('should return registered provider', () => {
      registerProvider(testProvider)
      const provider = getProvider('test-provider')
      expect(provider).toEqual(testProvider)
    })
  })

  describe('getAllProviders', () => {
    it('should return empty array when no providers registered', () => {
      const providers = getAllProviders()
      expect(providers).toEqual([])
    })

    it('should return all registered providers', () => {
      const provider2: ProviderConfig = {
        ...testProvider,
        id: 'test-provider-2',
        name: 'Test Provider 2',
      }
      registerProvider(testProvider)
      registerProvider(provider2)
      const providers = getAllProviders()
      expect(providers).toHaveLength(2)
      expect(providers.map((p) => p.id)).toContain('test-provider')
      expect(providers.map((p) => p.id)).toContain('test-provider-2')
    })
  })

  describe('removeProvider', () => {
    it('should remove a registered provider', () => {
      registerProvider(testProvider)
      expect(getProvider('test-provider')).toBeDefined()
      removeProvider('test-provider')
      expect(getProvider('test-provider')).toBeUndefined()
    })

    it('should return true when provider was removed', () => {
      registerProvider(testProvider)
      const result = removeProvider('test-provider')
      expect(result).toBe(true)
    })

    it('should return false when provider did not exist', () => {
      const result = removeProvider('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('resetRegistry', () => {
    it('should clear all registered providers', () => {
      registerProvider(testProvider)
      registerProvider({ ...testProvider, id: 'provider-2', name: 'Provider 2' })
      expect(getAllProviders()).toHaveLength(2)
      resetRegistry()
      expect(getAllProviders()).toHaveLength(0)
    })
  })
})
