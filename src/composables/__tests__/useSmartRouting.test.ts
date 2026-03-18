import { describe, it, expect, beforeEach } from 'vitest'
import { useSmartRouting, type RoutingContext, type AvailableAgent } from '../useSmartRouting'

describe('useSmartRouting', () => {
  let smartRouting: ReturnType<typeof useSmartRouting>

  beforeEach(() => {
    smartRouting = useSmartRouting()
    smartRouting.clearRules()
    smartRouting.clearHistory()
  })

  describe('detectLanguage', () => {
    it('should detect English', () => {
      expect(smartRouting.detectLanguage('Hello, I need help with my service')).toBe('en')
    })

    it('should detect Spanish', () => {
      expect(smartRouting.detectLanguage('Hola, necesito ayuda con mi servicio')).toBe('es')
    })

    it('should detect French', () => {
      expect(smartRouting.detectLanguage('Bonjour, je besoin aide avec service')).toBe('fr')
    })

    it('should detect German', () => {
      expect(smartRouting.detectLanguage('Guten tag, ich brauche hilfe mit service')).toBe('de')
    })

    it('should return null for short text', () => {
      expect(smartRouting.detectLanguage('hi')).toBeNull()
    })

    it('should return null for text with no matching patterns', () => {
      expect(smartRouting.detectLanguage('xyz qwerty asdfgh')).toBeNull()
    })
  })

  describe('matchSkills', () => {
    const agent: AvailableAgent = {
      id: 'agent-1',
      extension: '100',
      name: 'Test Agent',
      skills: [
        { name: 'sales', level: 8 },
        { name: 'support', level: 5 },
      ],
      currentCalls: 1,
      maxCalls: 3,
      state: 'available',
    }

    it('should return 1 for no required skills', () => {
      expect(smartRouting.matchSkills([], agent)).toBe(1)
    })

    it('should return 0 when agent has no skills but required', () => {
      const noSkillAgent = { ...agent, skills: [] }
      expect(smartRouting.matchSkills(['sales'], noSkillAgent)).toBe(0)
    })

    it('should calculate perfect match correctly', () => {
      const score = smartRouting.matchSkills(['sales'], agent)
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(1)
    })

    it('should return 0 when required skill not found', () => {
      expect(smartRouting.matchSkills(['billing'], agent)).toBe(0)
    })

    it('should respect minimum level requirement', () => {
      const scoreWithMinLevel = smartRouting.matchSkills(['sales'], agent, 10)
      expect(scoreWithMinLevel).toBe(0) // Level 8 < 10
    })
  })

  describe('registerRule', () => {
    it('should register a rule and return an ID', () => {
      const ruleId = smartRouting.registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'test-queue' },
      })

      expect(ruleId).toBeDefined()
      expect(smartRouting.rules.value).toHaveLength(1)
      expect(smartRouting.rules.value[0].name).toBe('Test Rule')
    })

    it('should sort rules by priority (descending)', () => {
      smartRouting.registerRule({
        name: 'Low Priority',
        priority: 10,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'low' },
      })

      smartRouting.registerRule({
        name: 'High Priority',
        priority: 100,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'high' },
      })

      expect(smartRouting.rules.value[0].name).toBe('High Priority')
    })
  })

  describe('unregisterRule', () => {
    it('should remove a rule by ID', () => {
      const ruleId = smartRouting.registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'test' },
      })

      expect(smartRouting.rules.value).toHaveLength(1)
      expect(smartRouting.unregisterRule(ruleId)).toBe(true)
      expect(smartRouting.rules.value).toHaveLength(0)
    })

    it('should return false for non-existent rule', () => {
      expect(smartRouting.unregisterRule('non-existent')).toBe(false)
    })
  })

  describe('enableRule/disableRule', () => {
    it('should enable a rule', () => {
      const ruleId = smartRouting.registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: false,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'test' },
      })

      smartRouting.enableRule(ruleId)
      expect(smartRouting.rules.value[0].enabled).toBe(true)
    })

    it('should disable a rule', () => {
      const ruleId = smartRouting.registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'test' },
      })

      smartRouting.disableRule(ruleId)
      expect(smartRouting.rules.value[0].enabled).toBe(false)
    })
  })

  describe('evaluateRouting', () => {
    it('should return null when no rules exist', async () => {
      const context: RoutingContext = {
        callerId: 'caller-1',
        callerNumber: '+15551234567',
        calledNumber: '+15559876543',
        timestamp: new Date(),
      }

      const decision = await smartRouting.evaluateRouting(context)
      expect(decision).toBeNull()
    })

    it('should evaluate and return first matching rule', async () => {
      smartRouting.registerRule({
        name: 'Match Rule',
        priority: 50,
        enabled: true,
        condition: (ctx) => ctx.callerNumber === '+15551234567',
        action: { type: 'route_to_queue', target: 'sales' },
      })

      const context: RoutingContext = {
        callerId: 'caller-1',
        callerNumber: '+15551234567',
        calledNumber: '+15559876543',
        timestamp: new Date(),
      }

      const decision = await smartRouting.evaluateRouting(context)
      expect(decision).not.toBeNull()
      expect(decision?.ruleName).toBe('Match Rule')
      expect(decision?.action.target).toBe('sales')
    })

    it('should skip disabled rules', async () => {
      smartRouting.registerRule({
        name: 'Disabled Rule',
        priority: 50,
        enabled: false,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'disabled' },
      })

      smartRouting.registerRule({
        name: 'Enabled Rule',
        priority: 40,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'enabled' },
      })

      const context: RoutingContext = {
        callerId: 'caller-1',
        callerNumber: '+15551234567',
        calledNumber: '+15559876543',
        timestamp: new Date(),
      }

      const decision = await smartRouting.evaluateRouting(context)
      expect(decision?.action.target).toBe('enabled')
    })

    it('should set lastDecision and add to history', async () => {
      smartRouting.registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'test' },
      })

      const context: RoutingContext = {
        callerId: 'caller-1',
        callerNumber: '+15551234567',
        calledNumber: '+15559876543',
        timestamp: new Date(),
      }

      await smartRouting.evaluateRouting(context)

      expect(smartRouting.lastDecision.value).not.toBeNull()
      expect(smartRouting.decisionHistory.value).toHaveLength(1)
    })
  })

  describe('addLanguageRule', () => {
    it('should add a language-based routing rule', () => {
      const ruleId = smartRouting.addLanguageRule('es', 'spanish-queue')

      expect(ruleId).toBeDefined()
      expect(smartRouting.rules.value).toHaveLength(1)
      expect(smartRouting.rules.value[0].name).toBe('Language: ES')
    })
  })

  describe('addSentimentRule', () => {
    it('should add a sentiment-based routing rule for negative sentiment', () => {
      const ruleId = smartRouting.addSentimentRule(-0.5, {
        type: 'route_to_queue',
        target: 'escalations',
        priority: 'urgent',
      })

      expect(ruleId).toBeDefined()
      expect(smartRouting.rules.value[0].priority).toBeGreaterThan(50) // Higher priority
    })
  })

  describe('addSkillMatchRule', () => {
    it('should add a skill matching rule', () => {
      const ruleId = smartRouting.addSkillMatchRule(['sales', 'support'], 3)

      expect(ruleId).toBeDefined()
      expect(smartRouting.rules.value[0].action.type).toBe('skill_match')
      expect(smartRouting.rules.value[0].action.preferAgentsWithSkill).toEqual(['sales', 'support'])
    })
  })

  describe('addVIPRule', () => {
    it('should add a VIP caller routing rule', () => {
      const ruleId = smartRouting.addVIPRule(['+15551234567*', '+15550001111'], {
        type: 'route_to_agent',
        target: 'vip-agent',
        priority: 'high',
      })

      expect(ruleId).toBeDefined()
      expect(smartRouting.rules.value[0].priority).toBeGreaterThan(50) // Highest priority
    })

    it('should match VIP patterns', async () => {
      smartRouting.addVIPRule(['+15551234567*'], {
        type: 'route_to_agent',
        target: 'vip-agent',
      })

      const context: RoutingContext = {
        callerId: 'vip-caller',
        callerNumber: '+1555123456789', // Matches prefix +15551234567*
        calledNumber: '+15559876543',
        timestamp: new Date(),
      }

      const decision = await smartRouting.evaluateRouting(context)
      expect(decision).not.toBeNull()
      expect(decision?.action.target).toBe('vip-agent')
    })
  })

  describe('suggestAgent', () => {
    const agents: AvailableAgent[] = [
      {
        id: 'agent-1',
        extension: '100',
        name: 'Agent One',
        skills: [{ name: 'sales', level: 8 }],
        currentCalls: 2,
        maxCalls: 3,
        state: 'available',
      },
      {
        id: 'agent-2',
        extension: '101',
        name: 'Agent Two',
        skills: [{ name: 'support', level: 5 }],
        currentCalls: 0,
        maxCalls: 3,
        state: 'available',
        lastCallTime: new Date(Date.now() - 600000), // 10 min ago
      },
    ]

    it('should return null when no agents available', () => {
      expect(smartRouting.suggestAgent({} as RoutingContext, [])).toBeNull()
    })

    it('should filter out busy agents', () => {
      const busyAgents: AvailableAgent[] = [{ ...agents[0], state: 'busy' as const }]

      expect(smartRouting.suggestAgent({} as RoutingContext, busyAgents)).toBeNull()
    })

    it('should return agent with fewer calls (load balancing)', () => {
      const result = smartRouting.suggestAgent({} as RoutingContext, agents)
      expect(result?.id).toBe('agent-2') // Has 0 calls vs 2
    })

    it('should prefer agents with matching skills', () => {
      smartRouting.addSkillMatchRule(['sales'])

      const result = smartRouting.suggestAgent({} as RoutingContext, agents)
      expect(result?.id).toBe('agent-1') // Has sales skill
    })

    it('should return null when no agents meet skill threshold', () => {
      smartRouting.addSkillMatchRule(['billing'], 5) // No agent has billing skill

      const result = smartRouting.suggestAgent({} as RoutingContext, agents)
      expect(result).toBeNull()
    })
  })

  describe('clearRules/clearHistory', () => {
    it('should clear all rules', () => {
      smartRouting.registerRule({
        name: 'Test',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'custom' },
      })

      smartRouting.clearRules()
      expect(smartRouting.rules.value).toHaveLength(0)
    })

    it('should clear decision history', async () => {
      smartRouting.registerRule({
        name: 'Test',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'custom' },
      })

      await smartRouting.evaluateRouting({
        callerId: '1',
        callerNumber: '1',
        calledNumber: '1',
        timestamp: new Date(),
      })

      smartRouting.clearHistory()
      expect(smartRouting.decisionHistory.value).toHaveLength(0)
      expect(smartRouting.lastDecision.value).toBeNull()
    })
  })

  describe('updateRule', () => {
    it('should update rule properties', () => {
      const ruleId = smartRouting.registerRule({
        name: 'Original',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'custom' },
      })

      smartRouting.updateRule(ruleId, { name: 'Updated', priority: 100 })

      expect(smartRouting.rules.value[0].name).toBe('Updated')
      expect(smartRouting.rules.value[0].priority).toBe(100)
    })

    it('should re-sort when priority changes', () => {
      const lowId = smartRouting.registerRule({
        name: 'Low',
        priority: 10,
        enabled: true,
        condition: () => true,
        action: { type: 'custom' },
      })

      smartRouting.registerRule({
        name: 'High',
        priority: 100,
        enabled: true,
        condition: () => true,
        action: { type: 'custom' },
      })

      smartRouting.updateRule(lowId, { priority: 150 })

      expect(smartRouting.rules.value[0].name).toBe('Low')
    })
  })
})
