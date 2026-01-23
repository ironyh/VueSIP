/**
 * Tests for ProviderRegistry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProviderRegistry } from '@/transcription/providers/registry'
import type { TranscriptionProvider } from '@/types/transcription.types'

// Mock provider for testing
function createMockProvider(name: string): TranscriptionProvider {
  return {
    name,
    capabilities: {
      streaming: true,
      interimResults: true,
      languageDetection: false,
      multiChannel: false,
      punctuation: true,
      speakerDiarization: false,
      wordTimestamps: false,
      supportedLanguages: ['en-US'],
    },
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    startStream: vi.fn(),
    stopStream: vi.fn(),
    onInterim: vi.fn().mockReturnValue(() => {}),
    onFinal: vi.fn().mockReturnValue(() => {}),
    onError: vi.fn().mockReturnValue(() => {}),
  }
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry

  beforeEach(() => {
    registry = new ProviderRegistry()
  })

  describe('register', () => {
    it('should register a provider factory', () => {
      const factory = () => createMockProvider('test')

      registry.register('test', factory)

      expect(registry.has('test')).toBe(true)
    })

    it('should throw if provider name already registered', () => {
      const factory = () => createMockProvider('test')
      registry.register('test', factory)

      expect(() => registry.register('test', factory)).toThrow(
        'Provider "test" is already registered'
      )
    })
  })

  describe('get', () => {
    it('should create provider instance from factory', async () => {
      const mockProvider = createMockProvider('test')
      const factory = vi.fn().mockReturnValue(mockProvider)
      registry.register('test', factory)

      const provider = await registry.get('test', { language: 'en-US' })

      expect(factory).toHaveBeenCalled()
      expect(provider).toBe(mockProvider)
      expect(mockProvider.initialize).toHaveBeenCalledWith({ language: 'en-US' })
    })

    it('should throw if provider not found', async () => {
      await expect(registry.get('nonexistent')).rejects.toThrow('Provider "nonexistent" not found')
    })

    it('should cache provider instances by name', async () => {
      const factory = vi.fn().mockReturnValue(createMockProvider('test'))
      registry.register('test', factory)

      const instance1 = await registry.get('test')
      const instance2 = await registry.get('test')

      expect(factory).toHaveBeenCalledTimes(1)
      expect(instance1).toBe(instance2)
    })
  })

  describe('getAvailable', () => {
    it('should return list of registered provider names', () => {
      registry.register('provider1', () => createMockProvider('provider1'))
      registry.register('provider2', () => createMockProvider('provider2'))

      const available = registry.getAvailable()

      expect(available).toEqual(['provider1', 'provider2'])
    })
  })

  describe('has', () => {
    it('should return true for registered providers', () => {
      registry.register('test', () => createMockProvider('test'))

      expect(registry.has('test')).toBe(true)
      expect(registry.has('nonexistent')).toBe(false)
    })
  })

  describe('dispose', () => {
    it('should dispose all cached provider instances', async () => {
      const provider1 = createMockProvider('test1')
      const provider2 = createMockProvider('test2')
      registry.register('test1', () => provider1)
      registry.register('test2', () => provider2)

      await registry.get('test1')
      await registry.get('test2')

      registry.dispose()

      expect(provider1.dispose).toHaveBeenCalled()
      expect(provider2.dispose).toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('should remove cached instance and dispose it', async () => {
      const provider = createMockProvider('test')
      registry.register('test', () => provider)
      await registry.get('test')

      registry.remove('test')

      // Factory remains registered (has() checks factories)
      expect(registry.has('test')).toBe(true)
      // But instance was disposed
      expect(provider.dispose).toHaveBeenCalled()
    })

    it('should force re-creation on next get call', async () => {
      let callCount = 0
      const factory = vi.fn(() => {
        callCount++
        return createMockProvider(`test-${callCount}`)
      })
      registry.register('test', factory)

      await registry.get('test')
      expect(factory).toHaveBeenCalledTimes(1)

      registry.remove('test')

      // Next get() should create a new instance
      await registry.get('test')
      expect(factory).toHaveBeenCalledTimes(2)
    })
  })
})
