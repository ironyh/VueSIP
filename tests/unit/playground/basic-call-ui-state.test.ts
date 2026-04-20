import { describe, expect, it } from 'vitest'
import {
  canHangupFromState,
  formatBasicCallState,
  isActiveCallState,
  isIncomingCallState,
} from '../../../playground/demos/BasicCall/uiState'

describe('BasicCall uiState helpers', () => {
  it('recognizes incoming states', () => {
    expect(isIncomingCallState('ringing')).toBe(true)
    expect(isIncomingCallState('incoming')).toBe(true)
    expect(isIncomingCallState('calling')).toBe(false)
  })

  it('recognizes active and held states across real and simulated values', () => {
    expect(isActiveCallState('active')).toBe(true)
    expect(isActiveCallState('held')).toBe(true)
    expect(isActiveCallState('on-hold')).toBe(true)
    expect(isActiveCallState('remote_held')).toBe(true)
    expect(isActiveCallState('terminated')).toBe(false)
  })

  it('only allows hangup shortcuts for live call lifecycle states', () => {
    expect(canHangupFromState('calling')).toBe(true)
    expect(canHangupFromState('active')).toBe(true)
    expect(canHangupFromState('held')).toBe(true)
    expect(canHangupFromState('idle')).toBe(false)
    expect(canHangupFromState('terminated')).toBe(false)
  })

  it('formats current and legacy labels consistently', () => {
    expect(formatBasicCallState('calling')).toBe('Connecting')
    expect(formatBasicCallState('active')).toBe('In call')
    expect(formatBasicCallState('held')).toBe('On hold')
    expect(formatBasicCallState('on-hold')).toBe('On hold')
    expect(formatBasicCallState('terminated')).toBe('Ended')
    expect(formatBasicCallState('failed')).toBe('Failed')
  })
})
