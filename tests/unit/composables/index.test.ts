/**
 * Composables module exports unit tests
 */

import { describe, it, expect } from 'vitest'
import {
  useSipClient,
  useSipRegistration,
  useCallSession,
  useMediaDevices,
  useDTMF,
  useCallHistory,
  useCallControls,
  usePresence,
  useMessaging,
  useConference,
} from '@/composables'

describe('Composables Module Exports', () => {
  describe('Core Composables', () => {
    it('should export useSipClient', () => {
      expect(useSipClient).toBeDefined()
      expect(typeof useSipClient).toBe('function')
    })

    it('should export useSipRegistration', () => {
      expect(useSipRegistration).toBeDefined()
      expect(typeof useSipRegistration).toBe('function')
    })

    it('should export useCallSession', () => {
      expect(useCallSession).toBeDefined()
      expect(typeof useCallSession).toBe('function')
    })

    it('should export useMediaDevices', () => {
      expect(useMediaDevices).toBeDefined()
      expect(typeof useMediaDevices).toBe('function')
    })

    it('should export useDTMF', () => {
      expect(useDTMF).toBeDefined()
      expect(typeof useDTMF).toBe('function')
    })
  })

  describe('Advanced Composables', () => {
    it('should export useCallHistory', () => {
      expect(useCallHistory).toBeDefined()
      expect(typeof useCallHistory).toBe('function')
    })

    it('should export useCallControls', () => {
      expect(useCallControls).toBeDefined()
      expect(typeof useCallControls).toBe('function')
    })

    it('should export usePresence', () => {
      expect(usePresence).toBeDefined()
      expect(typeof useCallSession).toBe('function')
    })

    it('should export useMessaging', () => {
      expect(useMessaging).toBeDefined()
      expect(typeof useMessaging).toBe('function')
    })

    it('should export useConference', () => {
      expect(useConference).toBeDefined()
      expect(typeof useConference).toBe('function')
    })
  })

  describe('Type Re-exports', () => {
    it('should allow importing type exports', async () => {
      const module = await import('@/composables')
      expect(module).toBeDefined()
    })
  })
})
