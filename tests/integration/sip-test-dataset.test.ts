/**
 * SIP Test Dataset Validation Tests
 *
 * Validates the dataset structure, completeness, and uniqueness.
 * @packageDocumentation
 */

import { describe, it, expect } from 'vitest'
import {
  allSipScenarios,
  SCENARIO_COUNT,
  getScenariosByCategory,
  getScenariosByTag,
  getScenarioById,
  getCategories,
  registrationScenarios,
  callSetupScenarios,
  sessionManagementScenarios,
  mediaNegotiationScenarios,
  networkFailureScenarios,
  malformedMessageScenarios,
  authenticationScenarios,
  dtmfScenarios,
  voicemailScenarios,
  presenceScenarios,
  conferenceScenarios,
} from '../fixtures/sip-test-dataset'

describe('SIP Test Dataset', () => {
  it('should have 50+ total scenarios', () => {
    expect(SCENARIO_COUNT).toBeGreaterThanOrEqual(50)
    expect(allSipScenarios.length).toBeGreaterThanOrEqual(50)
  })

  it('should have unique scenario IDs', () => {
    const ids = allSipScenarios.map((s) => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have all required fields in every scenario', () => {
    for (const scenario of allSipScenarios) {
      expect(scenario.id).toBeTruthy()
      expect(scenario.category).toBeTruthy()
      expect(scenario.name).toBeTruthy()
      expect(scenario.description).toBeTruthy()
      expect(scenario.steps.length).toBeGreaterThan(0)
      expect(scenario.expected).toBeDefined()
    }
  })

  it('should have at least one step per scenario', () => {
    for (const scenario of allSipScenarios) {
      expect(scenario.steps.length).toBeGreaterThan(0)
    }
  })

  describe('Category coverage', () => {
    it('should cover registration scenarios', () => {
      expect(registrationScenarios.length).toBeGreaterThanOrEqual(10)
    })

    it('should cover call setup scenarios', () => {
      expect(callSetupScenarios.length).toBeGreaterThanOrEqual(10)
    })

    it('should cover session management scenarios', () => {
      expect(sessionManagementScenarios.length).toBeGreaterThanOrEqual(5)
    })

    it('should cover media negotiation scenarios', () => {
      expect(mediaNegotiationScenarios.length).toBeGreaterThanOrEqual(3)
    })

    it('should cover network failure scenarios', () => {
      expect(networkFailureScenarios.length).toBeGreaterThanOrEqual(5)
    })

    it('should cover malformed message scenarios', () => {
      expect(malformedMessageScenarios.length).toBeGreaterThanOrEqual(3)
    })

    it('should cover authentication scenarios', () => {
      expect(authenticationScenarios.length).toBeGreaterThanOrEqual(3)
    })

    it('should cover DTMF scenarios', () => {
      expect(dtmfScenarios.length).toBeGreaterThanOrEqual(2)
    })

    it('should cover voicemail scenarios', () => {
      expect(voicemailScenarios.length).toBeGreaterThanOrEqual(2)
    })

    it('should cover presence scenarios', () => {
      expect(presenceScenarios.length).toBeGreaterThanOrEqual(2)
    })

    it('should cover conference scenarios', () => {
      expect(conferenceScenarios.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Helper functions', () => {
    it('getScenariosByCategory should return correct scenarios', () => {
      const reg = getScenariosByCategory('registration')
      expect(reg.length).toBe(registrationScenarios.length)
      expect(reg.every((s) => s.category === 'registration')).toBe(true)
    })

    it('getScenariosByTag should filter correctly', () => {
      const happy = getScenariosByTag('happy-path')
      expect(happy.length).toBeGreaterThan(0)
      expect(happy.every((s) => s.tags?.includes('happy-path'))).toBe(true)
    })

    it('getScenarioById should return correct scenario', () => {
      const scenario = getScenarioById('REG-001')
      expect(scenario).toBeDefined()
      expect(scenario!.name).toBe('Successful SIP registration')
    })

    it('getScenarioById should return undefined for unknown ID', () => {
      expect(getScenarioById('NONEXISTENT')).toBeUndefined()
    })

    it('getCategories should return all unique categories', () => {
      const cats = getCategories()
      expect(cats.length).toBe(11)
      expect(cats).toContain('registration')
      expect(cats).toContain('call-setup')
      expect(cats).toContain('network-failure')
      expect(cats).toContain('malformed')
    })
  })

  describe('Edge case scenarios', () => {
    it('should include timeout scenarios', () => {
      const timeouts = getScenariosByTag('timeout')
      expect(timeouts.length).toBeGreaterThanOrEqual(3)
    })

    it('should include malformed message scenarios', () => {
      const malformed = getScenariosByTag('malformed')
      expect(malformed.length).toBeGreaterThanOrEqual(4)
    })

    it('should include authentication scenarios with different algorithms', () => {
      expect(getScenarioById('AUTH-001')).toBeDefined() // MD5
      expect(getScenarioById('AUTH-002')).toBeDefined() // SHA-256
      expect(getScenarioById('AUTH-003')).toBeDefined() // qop=auth
    })

    it('should include SIP error codes 4xx and 5xx', () => {
      const errorScenarios = allSipScenarios.filter(
        (s) => s.expected.sipResponseCode && s.expected.sipResponseCode >= 400
      )
      expect(errorScenarios.length).toBeGreaterThanOrEqual(8)
    })
  })
})
