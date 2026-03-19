/**
 * Unit tests for Provider Registry
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerProvider,
  getProvider,
  getAllProviders,
  removeProvider,
  resetRegistry,
} from '../providerRegistry'
import type { ProviderConfig } from '../types'

// Mock ProviderConfig for testing
const createMockProvider = (overrides: Partial<ProviderConfig> = {}): ProviderConfig => ({
  id: 'test-provider',
  name: 'Test Provider',
  websocketUrl: 'wss://sip.test.com',
  fields: [],
  mapCredentials: (input) => ({
    username: input.user,
    password: input.pass,
    authToken: input.token,
  }),
  ...overrides,
})

describe('providerRegistry', () => {
  beforeEach(() => {
    // Reset registry before each test
    resetRegistry()
  })

  describe('registerProvider', () => {
    it('should register a new provider', () => {
      const provider = createMockProvider({ id: 'my-provider', name: 'My Provider' })

      registerProvider(provider)

      expect(getProvider('my-provider')).toEqual(provider)
    })

    it('should throw when registering duplicate provider without force', () => {
      const provider = createMockProvider({ id: 'duplicate', name: 'Duplicate' })

      registerProvider(provider)

      expect(() => registerProvider(provider)).toThrow(
        'Provider with ID "duplicate" is already registered'
      )
    })

    it('should allow force overwrite when force option is true', () => {
      const provider1 = createMockProvider({ id: 'force-test', name: 'Original' })
      const provider2 = createMockProvider({ id: 'force-test', name: 'Updated' })

      registerProvider(provider1)
      registerProvider(provider2, { force: true })

      expect(getProvider('force-test')?.name).toBe('Updated')
    })

    it('should allow multiple different providers', () => {
      const provider1 = createMockProvider({ id: 'provider-1', name: 'Provider 1' })
      const provider2 = createMockProvider({ id: 'provider-2', name: 'Provider 2' })

      registerProvider(provider1)
      registerProvider(provider2)

      expect(getAllProviders()).toHaveLength(2)
    })
  })

  describe('getProvider', () => {
    it('should return undefined for non-existent provider', () => {
      expect(getProvider('non-existent')).toBeUndefined()
    })

    it('should return registered provider by ID', () => {
      const provider = createMockProvider({ id: 'get-test', name: 'Get Test' })
      registerProvider(provider)

      expect(getProvider('get-test')).toEqual(provider)
    })
  })

  describe('getAllProviders', () => {
    it('should return empty array when no providers registered', () => {
      expect(getAllProviders()).toEqual([])
    })

    it('should return all registered providers', () => {
      const provider1 = createMockProvider({ id: 'all-1', name: 'All 1' })
      const provider2 = createMockProvider({ id: 'all-2', name: 'All 2' })
      const provider3 = createMockProvider({ id: 'all-3', name: 'All 3' })

      registerProvider(provider1)
      registerProvider(provider2)
      registerProvider(provider3)

      const all = getAllProviders()
      expect(all).toHaveLength(3)
      expect(all).toContainEqual(provider1)
      expect(all).toContainEqual(provider2)
      expect(all).toContainEqual(provider3)
    })
  })

  describe('removeProvider', () => {
    it('should return false when removing non-existent provider', () => {
      expect(removeProvider('non-existent')).toBe(false)
    })

    it('should return true and remove existing provider', () => {
      const provider = createMockProvider({ id: 'remove-test', name: 'Remove Test' })
      registerProvider(provider)

      expect(removeProvider('remove-test')).toBe(true)
      expect(getProvider('remove-test')).toBeUndefined()
    })

    it('should only remove specified provider', () => {
      const provider1 = createMockProvider({ id: 'keep-1', name: 'Keep 1' })
      const provider2 = createMockProvider({ id: 'remove-2', name: 'Remove 2' })
      const provider3 = createMockProvider({ id: 'keep-3', name: 'Keep 3' })

      registerProvider(provider1)
      registerProvider(provider2)
      registerProvider(provider3)

      removeProvider('remove-2')

      expect(getAllProviders()).toHaveLength(2)
      expect(getProvider('keep-1')).toBeDefined()
      expect(getProvider('remove-2')).toBeUndefined()
      expect(getProvider('keep-3')).toBeDefined()
    })
  })

  describe('resetRegistry', () => {
    it('should clear all providers', () => {
      const provider1 = createMockProvider({ id: 'reset-1', name: 'Reset 1' })
      const provider2 = createMockProvider({ id: 'reset-2', name: 'Reset 2' })

      registerProvider(provider1)
      registerProvider(provider2)

      resetRegistry()

      expect(getAllProviders()).toEqual([])
    })
  })
})
