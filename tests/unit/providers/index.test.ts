/**
 * Providers module exports unit tests
 */

import { describe, it, expect } from 'vitest'
import {
  SipClientProvider,
  useSipClientProvider,
  ConfigProvider,
  useConfigProvider,
  MediaProvider,
  useMediaProvider,
  OAuth2Provider,
  useOAuth2Provider,
  useOAuth2Credentials,
} from '@/providers'

describe('Providers Module Exports', () => {
  describe('SipClient Provider', () => {
    it('should export SipClientProvider component', () => {
      expect(SipClientProvider).toBeDefined()
      expect(typeof SipClientProvider).toBe('object')
    })

    it('should export useSipClientProvider', () => {
      expect(useSipClientProvider).toBeDefined()
      expect(typeof useSipClientProvider).toBe('function')
    })
  })

  describe('Config Provider', () => {
    it('should export ConfigProvider component', () => {
      expect(ConfigProvider).toBeDefined()
      expect(typeof ConfigProvider).toBe('object')
    })

    it('should export useConfigProvider', () => {
      expect(useConfigProvider).toBeDefined()
      expect(typeof useConfigProvider).toBe('function')
    })
  })

  describe('Media Provider', () => {
    it('should export MediaProvider component', () => {
      expect(MediaProvider).toBeDefined()
      expect(typeof MediaProvider).toBe('object')
    })

    it('should export useMediaProvider', () => {
      expect(useMediaProvider).toBeDefined()
      expect(typeof useMediaProvider).toBe('function')
    })
  })

  describe('OAuth2 Provider', () => {
    it('should export OAuth2Provider component', () => {
      expect(OAuth2Provider).toBeDefined()
      expect(typeof OAuth2Provider).toBe('object')
    })

    it('should export useOAuth2Provider', () => {
      expect(useOAuth2Provider).toBeDefined()
      expect(typeof useOAuth2Provider).toBe('function')
    })

    it('should export useOAuth2Credentials', () => {
      expect(useOAuth2Credentials).toBeDefined()
      expect(typeof useOAuth2Credentials).toBe('function')
    })
  })

  describe('Type Re-exports', () => {
    it('should allow importing type exports', async () => {
      const module = await import('@/providers')
      expect(module).toBeDefined()
    })
  })
})
