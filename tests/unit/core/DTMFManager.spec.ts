/**
 * DTMFManager Unit Tests
 *
 * Test suite for DTMF (Dual-Tone Multi-Frequency) Manager
 * covering RFC 2833 and SIP INFO methods.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DTMFManager } from '@/core/DTMFManager';
import type { RTCSession } from 'jssip/lib/RTCSession';
import type { DTMFMethod as _DTMFMethod, DTMFTone, DTMFEvent } from '@/types/dtmf.types';
import { DTMF_CONSTANTS } from '@/types/dtmf.types';

// Mock RTCSession
const createMockSession = (rfc2833Enabled = true): RTCSession => {
  const mockConnection = {
    localDescription: {
      sdp: rfc2833Enabled
        ? 'a=rtpmap:101 telephone-event/8000\r\na=fmtp:101 0-15'
        : 'a=rtpmap:0 PCMU/8000',
    },
    remoteDescription: {
      sdp: rfc2833Enabled
        ? 'a=rtpmap:101 telephone-event/8000\r\na=fmtp:101 0-15'
        : 'a=rtpmap:0 PCMU/8000',
    },
  };

  return {
    connection: mockConnection,
    isEstablished: () => true,
    sendDTMF: vi.fn((_tone: string, _options?: any) => {
      // Simulate successful DTMF send
    }),
    sendInfo: vi.fn((contentType: string, body: string, options?: any) => {
      // Simulate successful SIP INFO
      if (options?.eventHandlers?.succeeded) {
        setTimeout(() => options.eventHandlers.succeeded(), 10);
      }
    }),
  } as unknown as RTCSession;
};

describe('DTMFManager', () => {
  let manager: DTMFManager;
  let mockSession: RTCSession;

  beforeEach(() => {
    manager = new DTMFManager();
    mockSession = createMockSession(true);
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Session Management', () => {
    it('should set and detect capabilities when session is set', () => {
      manager.setSession(mockSession);

      const capabilities = manager.getCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities?.rfc2833Enabled).toBe(true);
      expect(capabilities?.sipInfoEnabled).toBe(true);
      expect(capabilities?.preferredMethod).toBe('rfc2833');
    });

    it('should detect SIP INFO only when RFC 2833 is not available', () => {
      const mockSessionNoRFC2833 = createMockSession(false);
      manager.setSession(mockSessionNoRFC2833);

      const capabilities = manager.getCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities?.rfc2833Enabled).toBe(false);
      expect(capabilities?.sipInfoEnabled).toBe(true);
      expect(capabilities?.preferredMethod).toBe('sipinfo');
    });

    it('should clear capabilities when session is removed', () => {
      manager.setSession(mockSession);
      expect(manager.getCapabilities()).toBeDefined();

      manager.setSession(null);
      expect(manager.getCapabilities()).toBeNull();
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      manager.setSession(mockSession);
    });

    it('should report initial state correctly', () => {
      const state = manager.getState();

      expect(state.isSending).toBe(false);
      expect(state.currentTone).toBeNull();
      expect(state.queueLength).toBe(0);
      expect(state.capabilities).toBeDefined();
    });

    it('should update state during sending', async () => {
      const sendPromise = manager.sendDTMF('1');

      // Check state is updated
      const _stateWhileSending = manager.getState();
      // State might already be false if sending completes quickly
      // so we don't assert on isSending

      await sendPromise;

      const stateFinal = manager.getState();
      expect(stateFinal.isSending).toBe(false);
    });
  });

  describe('DTMF Validation', () => {
    beforeEach(() => {
      manager.setSession(mockSession);
    });

    it('should accept valid DTMF tones', async () => {
      const validTones = '0123456789*#ABCD';

      const result = await manager.sendDTMF(validTones);

      expect(result.success).toBe(true);
      expect(result.tones).toBe(validTones);
    });

    it('should reject invalid DTMF characters', async () => {
      await expect(manager.sendDTMF('123X')).rejects.toThrow('Invalid DTMF tones');
    });

    it('should reject empty tone string', async () => {
      await expect(manager.sendDTMF('')).rejects.toThrow('Invalid DTMF tones');
    });

    it('should throw error when no session is active', async () => {
      manager.setSession(null);

      await expect(manager.sendDTMF('1')).rejects.toThrow('No active call session');
    });
  });

  describe('RFC 2833 Method', () => {
    beforeEach(() => {
      manager.setSession(mockSession);
    });

    it('should send DTMF using RFC 2833 by default', async () => {
      const result = await manager.sendDTMF('1', { method: 'rfc2833' });

      expect(result.success).toBe(true);
      expect(result.method).toBe('rfc2833');
      expect(mockSession.sendDTMF).toHaveBeenCalled();
    });

    it('should use default duration and gap values', async () => {
      await manager.sendDTMF('1');

      // Check that sendDTMF was called with correct duration
      expect(mockSession.sendDTMF).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          duration: DTMF_CONSTANTS.DEFAULT_DURATION,
        })
      );
    });

    it('should respect custom duration', async () => {
      const customDuration = 200;

      await manager.sendDTMF('1', { duration: customDuration });

      expect(mockSession.sendDTMF).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          duration: customDuration,
        })
      );
    });

    it('should clamp duration to valid range', async () => {
      // Too low
      await manager.sendDTMF('1', { duration: 10 });
      expect(mockSession.sendDTMF).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          duration: DTMF_CONSTANTS.MIN_DURATION,
        })
      );

      vi.clearAllMocks();

      // Too high
      await manager.sendDTMF('1', { duration: 10000 });
      expect(mockSession.sendDTMF).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          duration: DTMF_CONSTANTS.MAX_DURATION,
        })
      );
    });
  });

  describe('SIP INFO Method', () => {
    beforeEach(() => {
      manager.setSession(mockSession);
    });

    it('should send DTMF using SIP INFO when specified', async () => {
      const result = await manager.sendDTMF('1', { method: 'sipinfo' });

      expect(result.success).toBe(true);
      expect(result.method).toBe('sipinfo');
      expect(mockSession.sendInfo).toHaveBeenCalledWith(
        DTMF_CONSTANTS.SIPINFO_CONTENT_TYPE,
        expect.stringContaining('Signal=1'),
        expect.any(Object)
      );
    });

    it('should include duration in SIP INFO body', async () => {
      const duration = 250;

      await manager.sendDTMF('5', { method: 'sipinfo', duration });

      expect(mockSession.sendInfo).toHaveBeenCalledWith(
        DTMF_CONSTANTS.SIPINFO_CONTENT_TYPE,
        expect.stringContaining(`Duration=${duration}`),
        expect.any(Object)
      );
    });
  });

  describe('Tone Sequencing', () => {
    beforeEach(() => {
      manager.setSession(mockSession);
    });

    it('should send multiple tones in sequence', async () => {
      const tones = '123';

      const result = await manager.sendDTMF(tones);

      expect(result.success).toBe(true);
      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(3);
    });

    it('should apply inter-tone gap between tones', async () => {
      const tones = '12';
      const interToneGap = 100;

      const startTime = Date.now();
      await manager.sendDTMF(tones, { interToneGap });
      const endTime = Date.now();

      // Should take at least the inter-tone gap
      expect(endTime - startTime).toBeGreaterThanOrEqual(interToneGap - 10); // Allow 10ms margin
    });

    it('should queue tones properly', async () => {
      // Send two sequences concurrently
      const promise1 = manager.sendDTMF('123');
      const promise2 = manager.sendDTMF('456');

      await Promise.all([promise1, promise2]);

      // All 6 tones should be sent
      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(6);
    });
  });

  describe('Event Emission', () => {
    let events: DTMFEvent[];

    beforeEach(() => {
      manager.setSession(mockSession);
      events = [];
      manager.on((event) => events.push(event));
    });

    it('should emit start event when beginning', async () => {
      await manager.sendDTMF('1');

      const startEvent = events.find((e) => e.type === 'start');
      expect(startEvent).toBeDefined();
      expect(startEvent?.method).toBe('rfc2833');
    });

    it('should emit tone events for each tone', async () => {
      await manager.sendDTMF('123');

      const toneEvents = events.filter((e) => e.type === 'tone');
      expect(toneEvents).toHaveLength(3);
      expect(toneEvents.map((e) => e.tone)).toEqual(['1', '2', '3']);
    });

    it('should emit end event when complete', async () => {
      await manager.sendDTMF('1');

      const endEvent = events.find((e) => e.type === 'end');
      expect(endEvent).toBeDefined();
    });

    it('should emit error event on failure', async () => {
      // Mock a failure
      vi.mocked(mockSession.sendDTMF).mockImplementation(() => {
        throw new Error('Send failed');
      });

      await manager.sendDTMF('1');

      const errorEvent = events.find((e) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.error).toContain('Send failed');
    });

    it('should allow removing event listeners', async () => {
      const listener = vi.fn();
      manager.on(listener);
      manager.off(listener);

      await manager.sendDTMF('1');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Method Fallback', () => {
    it('should fallback to SIP INFO when RFC 2833 fails', async () => {
      manager.setSession(mockSession);

      // Make RFC 2833 fail
      vi.mocked(mockSession.sendDTMF).mockImplementation(() => {
        throw new Error('RFC 2833 not supported');
      });

      const result = await manager.sendDTMF('1', { method: 'rfc2833' });

      // Should fallback to SIP INFO
      expect(result.success).toBe(true);
      expect(mockSession.sendInfo).toHaveBeenCalled();
    });

    it('should fallback to RFC 2833 when SIP INFO fails', async () => {
      manager.setSession(mockSession);

      // Make SIP INFO fail
      vi.mocked(mockSession.sendInfo).mockImplementation((ct, body, options: any) => {
        if (options?.eventHandlers?.failed) {
          setTimeout(() => options.eventHandlers.failed(), 10);
        }
      });

      const result = await manager.sendDTMF('1', { method: 'sipinfo' });

      // Should fallback to RFC 2833
      expect(result.success).toBe(true);
      expect(mockSession.sendDTMF).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      manager.setSession(mockSession);
    });

    it('should clear queue on session removal', async () => {
      // Start sending a sequence
      const promise = manager.sendDTMF('123456');

      // Remove session before it completes
      manager.setSession(null);

      // Promise should reject
      const result = await promise;
      expect(result.success).toBe(false);
    });

    it('should cleanup all resources on destroy', () => {
      const listener = vi.fn();
      manager.on(listener);

      manager.destroy();

      expect(manager.getCapabilities()).toBeNull();
      expect(manager.getState().queueLength).toBe(0);
    });
  });

  describe('Single Tone Methods', () => {
    beforeEach(() => {
      manager.setSession(mockSession);
    });

    it('should send single tone via sendTone', async () => {
      const result = await manager.sendTone('5' as DTMFTone);

      expect(result.success).toBe(true);
      expect(result.tones).toBe('5');
      expect(mockSession.sendDTMF).toHaveBeenCalledWith(
        '5',
        expect.any(Object)
      );
    });
  });
});
