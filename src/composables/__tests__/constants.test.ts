/**
 * Unit tests for composables/constants.ts
 */

import { describe, it, expect } from 'vitest'
import {
  REGISTRATION_CONSTANTS,
  PRESENCE_CONSTANTS,
  MESSAGING_CONSTANTS,
  CONFERENCE_CONSTANTS,
  TRANSFER_CONSTANTS,
  HISTORY_CONSTANTS,
  TIMEOUTS,
  CALL_CONSTANTS,
  MEDIA_CONSTANTS,
  DTMF_CONSTANTS,
  TRANSPORT_RECOVERY_CONSTANTS,
  DEVICE_SWITCH_CONSTANTS,
  CALL_WAITING_CONSTANTS,
  NOTIFICATION_CONSTANTS,
  CONNECTION_HEALTH_CONSTANTS,
  CREDENTIAL_EXPIRY_CONSTANTS,
  DEGRADATION_CONSTANTS,
  RETRY_CONFIG,
} from '../constants'

describe('REGISTRATION_CONSTANTS', () => {
  it('should have valid default expires', () => {
    expect(REGISTRATION_CONSTANTS.DEFAULT_EXPIRES).toBe(600)
  })

  it('should have valid max retries', () => {
    expect(REGISTRATION_CONSTANTS.DEFAULT_MAX_RETRIES).toBe(3)
  })

  it('should have valid refresh percentage', () => {
    expect(REGISTRATION_CONSTANTS.REFRESH_PERCENTAGE).toBe(0.9)
  })

  it('should have valid expiring threshold', () => {
    expect(REGISTRATION_CONSTANTS.EXPIRING_SOON_THRESHOLD).toBe(30)
  })
})

describe('PRESENCE_CONSTANTS', () => {
  it('should have valid default expires', () => {
    expect(PRESENCE_CONSTANTS.DEFAULT_EXPIRES).toBe(3600)
  })

  it('should have valid subscription refresh percentage', () => {
    expect(PRESENCE_CONSTANTS.SUBSCRIPTION_REFRESH_PERCENTAGE).toBe(0.9)
  })
})

describe('MESSAGING_CONSTANTS', () => {
  it('should have valid composing idle timeout', () => {
    expect(MESSAGING_CONSTANTS.COMPOSING_IDLE_TIMEOUT).toBe(10000)
  })

  it('should have valid composing timeout', () => {
    expect(MESSAGING_CONSTANTS.COMPOSING_TIMEOUT_SECONDS).toBe(10)
  })
})

describe('CONFERENCE_CONSTANTS', () => {
  it('should have valid default max participants', () => {
    expect(CONFERENCE_CONSTANTS.DEFAULT_MAX_PARTICIPANTS).toBe(10)
  })

  it('should have valid audio level interval', () => {
    expect(CONFERENCE_CONSTANTS.AUDIO_LEVEL_INTERVAL).toBe(100)
  })
})

describe('TRANSFER_CONSTANTS', () => {
  it('should have valid completion delay', () => {
    expect(TRANSFER_CONSTANTS.COMPLETION_DELAY).toBe(2000)
  })

  it('should have valid cancellation delay', () => {
    expect(TRANSFER_CONSTANTS.CANCELLATION_DELAY).toBe(1000)
  })
})

describe('HISTORY_CONSTANTS', () => {
  it('should have valid default limit', () => {
    expect(HISTORY_CONSTANTS.DEFAULT_LIMIT).toBe(10)
  })

  it('should have valid default sort order', () => {
    expect(HISTORY_CONSTANTS.DEFAULT_SORT_ORDER).toBe('desc')
  })

  it('should have valid default sort by', () => {
    expect(HISTORY_CONSTANTS.DEFAULT_SORT_BY).toBe('startTime')
  })
})

describe('TIMEOUTS', () => {
  it('should have valid short delay', () => {
    expect(TIMEOUTS.SHORT_DELAY).toBe(1000)
  })

  it('should have valid medium delay', () => {
    expect(TIMEOUTS.MEDIUM_DELAY).toBe(2000)
  })

  it('should have valid long delay', () => {
    expect(TIMEOUTS.LONG_DELAY).toBe(5000)
  })
})

describe('CALL_CONSTANTS', () => {
  it('should have valid max concurrent calls', () => {
    expect(CALL_CONSTANTS.MAX_CONCURRENT_CALLS).toBe(5)
  })

  it('should have valid call timeout', () => {
    expect(CALL_CONSTANTS.CALL_TIMEOUT).toBe(30000)
  })

  it('should have valid ring timeout', () => {
    expect(CALL_CONSTANTS.RING_TIMEOUT).toBe(60000)
  })
})

describe('MEDIA_CONSTANTS', () => {
  it('should have valid enumeration retry delay', () => {
    expect(MEDIA_CONSTANTS.ENUMERATION_RETRY_DELAY).toBe(1000)
  })

  it('should have valid default test duration', () => {
    expect(MEDIA_CONSTANTS.DEFAULT_TEST_DURATION).toBe(2000)
  })

  it('should have valid audio level threshold', () => {
    expect(MEDIA_CONSTANTS.AUDIO_LEVEL_THRESHOLD).toBe(0.01)
  })
})

describe('DTMF_CONSTANTS', () => {
  it('should have valid default duration', () => {
    expect(DTMF_CONSTANTS.DEFAULT_DURATION).toBe(100)
  })

  it('should have valid default inter-tone gap', () => {
    expect(DTMF_CONSTANTS.DEFAULT_INTER_TONE_GAP).toBe(70)
  })

  it('should have valid min and max duration', () => {
    expect(DTMF_CONSTANTS.MIN_DURATION).toBe(40)
    expect(DTMF_CONSTANTS.MAX_DURATION).toBe(6000)
  })

  it('should have valid max queue size', () => {
    expect(DTMF_CONSTANTS.MAX_QUEUE_SIZE).toBe(100)
  })
})

describe('TRANSPORT_RECOVERY_CONSTANTS', () => {
  it('should have valid stabilization delay', () => {
    expect(TRANSPORT_RECOVERY_CONSTANTS.STABILIZATION_DELAY).toBe(1000)
  })

  it('should have valid max recovery attempts', () => {
    expect(TRANSPORT_RECOVERY_CONSTANTS.MAX_RECOVERY_ATTEMPTS).toBe(5)
  })

  it('should have valid base retry delay', () => {
    expect(TRANSPORT_RECOVERY_CONSTANTS.BASE_RETRY_DELAY).toBe(2000)
  })
})

describe('DEVICE_SWITCH_CONSTANTS', () => {
  it('should have valid switch timeout', () => {
    expect(DEVICE_SWITCH_CONSTANTS.SWITCH_TIMEOUT).toBe(5000)
  })

  it('should have valid fallback retry delay', () => {
    expect(DEVICE_SWITCH_CONSTANTS.FALLBACK_RETRY_DELAY).toBe(500)
  })
})

describe('CALL_WAITING_CONSTANTS', () => {
  it('should have valid default max waiting calls', () => {
    expect(CALL_WAITING_CONSTANTS.DEFAULT_MAX_WAITING_CALLS).toBe(5)
  })

  it('should have valid default auto-reject timeout', () => {
    expect(CALL_WAITING_CONSTANTS.DEFAULT_AUTO_REJECT_AFTER).toBe(0)
  })
})

describe('NOTIFICATION_CONSTANTS', () => {
  it('should have valid max notifications', () => {
    expect(NOTIFICATION_CONSTANTS.MAX_NOTIFICATIONS).toBe(10)
  })

  it('should have valid duration values', () => {
    expect(NOTIFICATION_CONSTANTS.DEFAULT_DURATION).toBe(5000)
    expect(NOTIFICATION_CONSTANTS.SUCCESS_DURATION).toBe(3000)
    expect(NOTIFICATION_CONSTANTS.WARNING_DURATION).toBe(8000)
    expect(NOTIFICATION_CONSTANTS.ERROR_DURATION).toBe(0)
  })
})

describe('CONNECTION_HEALTH_CONSTANTS', () => {
  it('should have valid debounce delay', () => {
    expect(CONNECTION_HEALTH_CONSTANTS.DEFAULT_DEBOUNCE_MS).toBe(1000)
  })

  it('should have valid colors for all levels', () => {
    expect(CONNECTION_HEALTH_CONSTANTS.COLORS.excellent).toBe('#22c55e')
    expect(CONNECTION_HEALTH_CONSTANTS.COLORS.good).toBe('#84cc16')
    expect(CONNECTION_HEALTH_CONSTANTS.COLORS.fair).toBe('#eab308')
    expect(CONNECTION_HEALTH_CONSTANTS.COLORS.poor).toBe('#f97316')
    expect(CONNECTION_HEALTH_CONSTANTS.COLORS.critical).toBe('#ef4444')
    expect(CONNECTION_HEALTH_CONSTANTS.COLORS.offline).toBe('#6b7280')
  })
})

describe('CREDENTIAL_EXPIRY_CONSTANTS', () => {
  it('should have valid auth error codes', () => {
    expect(CREDENTIAL_EXPIRY_CONSTANTS.DEFAULT_AUTH_ERROR_CODES).toContain(401)
    expect(CREDENTIAL_EXPIRY_CONSTANTS.DEFAULT_AUTH_ERROR_CODES).toContain(403)
  })

  it('should have valid warning threshold', () => {
    expect(CREDENTIAL_EXPIRY_CONSTANTS.DEFAULT_WARNING_THRESHOLD).toBe(60)
  })

  it('should have valid max auth failures', () => {
    expect(CREDENTIAL_EXPIRY_CONSTANTS.MAX_AUTH_FAILURES).toBe(3)
  })
})

describe('DEGRADATION_CONSTANTS', () => {
  it('should have valid stabilization delay', () => {
    expect(DEGRADATION_CONSTANTS.DEFAULT_STABILIZATION_DELAY).toBe(3000)
  })

  it('should have valid max history entries', () => {
    expect(DEGRADATION_CONSTANTS.MAX_HISTORY_ENTRIES).toBe(20)
  })

  it('should have valid audio bitrate values', () => {
    expect(DEGRADATION_CONSTANTS.AUDIO_BITRATE.FULL).toBe(64000)
    expect(DEGRADATION_CONSTANTS.AUDIO_BITRATE.REDUCED).toBe(24000)
  })
})

describe('RETRY_CONFIG', () => {
  it('should calculate exponential backoff correctly', () => {
    const delay = RETRY_CONFIG.calculateBackoff(0, 1000, 30000)
    expect(delay).toBe(1000)

    const delay2 = RETRY_CONFIG.calculateBackoff(1, 1000, 30000)
    expect(delay2).toBe(2000)

    const delay3 = RETRY_CONFIG.calculateBackoff(2, 1000, 30000)
    expect(delay3).toBe(4000)

    // Should not exceed max
    const delayMax = RETRY_CONFIG.calculateBackoff(10, 1000, 30000)
    expect(delayMax).toBe(30000)
  })

  it('should have valid backoff multiplier', () => {
    expect(RETRY_CONFIG.BACKOFF_MULTIPLIER).toBe(2)
  })
})
