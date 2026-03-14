/**
 * Asterisk Call Center Adapter Unit Tests
 *
 * Tests for src/providers/call-center/adapters/asterisk.ts
 * Note: Full integration tests require a running AMI connection.
 * These tests verify the static adapter interface and capabilities.
 */

import { describe, it, expect } from 'vitest'
import { createAsteriskAdapter } from '@/providers/call-center/adapters/asterisk'

describe('AsteriskAdapter', () => {
  let adapter: ReturnType<typeof createAsteriskAdapter>

  beforeEach(() => {
    adapter = createAsteriskAdapter()
  })

  describe('adapter identity', () => {
    it('should have correct adapter id', () => {
      expect(adapter.id).toBe('asterisk')
    })

    it('should have correct adapter name', () => {
      expect(adapter.name).toBe('Asterisk AMI')
    })
  })

  describe('capabilities', () => {
    it('should support queues', () => {
      expect(adapter.capabilities.supportsQueues).toBe(true)
    })

    it('should support multi-queue', () => {
      expect(adapter.capabilities.supportsMultiQueue).toBe(true)
    })

    it('should support pause', () => {
      expect(adapter.capabilities.supportsPause).toBe(true)
    })

    it('should support pause reasons', () => {
      expect(adapter.capabilities.supportsPauseReasons).toBe(true)
    })

    it('should not support break types (uses pause reasons instead)', () => {
      expect(adapter.capabilities.supportsBreakTypes).toBe(false)
    })

    it('should support wrap-up', () => {
      expect(adapter.capabilities.supportsWrapUp).toBe(true)
    })

    it('should support metrics', () => {
      expect(adapter.capabilities.supportsMetrics).toBe(true)
    })

    it('should support real-time events', () => {
      expect(adapter.capabilities.supportsRealTimeEvents).toBe(true)
    })

    it('should support penalty', () => {
      expect(adapter.capabilities.supportsPenalty).toBe(true)
    })

    it('should not support skill-based routing', () => {
      expect(adapter.capabilities.supportsSkillBasedRouting).toBe(false)
    })
  })

  describe('interface completeness', () => {
    it('should have connect method', () => {
      expect(typeof adapter.connect).toBe('function')
    })

    it('should have disconnect method', () => {
      expect(typeof adapter.disconnect).toBe('function')
    })

    it('should have login method', () => {
      expect(typeof adapter.login).toBe('function')
    })

    it('should have logout method', () => {
      expect(typeof adapter.logout).toBe('function')
    })

    it('should have setStatus method', () => {
      expect(typeof adapter.setStatus).toBe('function')
    })

    it('should have joinQueue method', () => {
      expect(typeof adapter.joinQueue).toBe('function')
    })

    it('should have leaveQueue method', () => {
      expect(typeof adapter.leaveQueue).toBe('function')
    })

    it('should have pause method', () => {
      expect(typeof adapter.pause).toBe('function')
    })

    it('should have unpause method', () => {
      expect(typeof adapter.unpause).toBe('function')
    })

    it('should have getMetrics method', () => {
      expect(typeof adapter.getMetrics).toBe('function')
    })

    it('should have onStateChange method', () => {
      expect(typeof adapter.onStateChange).toBe('function')
    })

    it('should have onQueueEvent method', () => {
      expect(typeof adapter.onQueueEvent).toBe('function')
    })
  })

  describe('event subscriptions', () => {
    it('should return unsubscribe function for state changes', () => {
      const unsubscribe = adapter.onStateChange(() => {})
      expect(typeof unsubscribe).toBe('function')
    })

    it('should return unsubscribe function for queue events', () => {
      const unsubscribe = adapter.onQueueEvent(() => {})
      expect(typeof unsubscribe).toBe('function')
    })
  })
})
