/**
 * Tests for useSmartRouting composable
 * Intelligent call routing with rules, language detection, and skill matching
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  useSmartRouting,
  type RoutingContext,
  type AvailableAgent,
  type UseSmartRoutingOptions,
} from '@/composables/useSmartRouting'

describe('useSmartRouting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper to create a basic routing context
  function createContext(overrides: Partial<RoutingContext> = {}): RoutingContext {
    return {
      callerId: 'caller-123',
      callerNumber: '+15551234567',
      calledNumber: '+15559876543',
      timestamp: new Date(),
      ...overrides,
    }
  }

  // Helper to create an agent
  function createAgent(overrides: Partial<AvailableAgent> = {}): AvailableAgent {
    return {
      id: 'agent-1',
      extension: '1001',
      name: 'Test Agent',
      skills: [],
      currentCalls: 0,
      maxCalls: 3,
      state: 'available',
      ...overrides,
    }
  }

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { rules, isProcessing, lastDecision, decisionHistory } = useSmartRouting()

      expect(rules.value).toEqual([])
      expect(isProcessing.value).toBe(false)
      expect(lastDecision.value).toBeNull()
      expect(decisionHistory.value).toEqual([])
    })

    it('should accept custom options', () => {
      const options: UseSmartRoutingOptions = {
        defaultPriority: 100,
        detectLanguage: false,
        skillMatchThreshold: 0.8,
      }

      const { addLanguageRule, rules } = useSmartRouting(undefined, options)

      // Add a rule to verify priority is used
      addLanguageRule('en', 'english-queue')

      expect(rules.value[0]!.priority).toBe(100)
    })
  })

  describe('Rule Registration', () => {
    it('should register a new rule and return ID', () => {
      const { registerRule, rules } = useSmartRouting()

      const ruleId = registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'test-queue' },
      })

      expect(ruleId).toBeDefined()
      expect(typeof ruleId).toBe('string')
      expect(rules.value.length).toBe(1)
      expect(rules.value[0]!.id).toBe(ruleId)
      expect(rules.value[0]!.name).toBe('Test Rule')
    })

    it('should sort rules by priority descending', () => {
      const { registerRule, rules } = useSmartRouting()

      registerRule({
        name: 'Low Priority',
        priority: 10,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      registerRule({
        name: 'High Priority',
        priority: 100,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      registerRule({
        name: 'Medium Priority',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      expect(rules.value[0]!.name).toBe('High Priority')
      expect(rules.value[1]!.name).toBe('Medium Priority')
      expect(rules.value[2]!.name).toBe('Low Priority')
    })

    it('should unregister a rule by ID', () => {
      const { registerRule, unregisterRule, rules } = useSmartRouting()

      const ruleId = registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      expect(rules.value.length).toBe(1)

      const result = unregisterRule(ruleId)

      expect(result).toBe(true)
      expect(rules.value.length).toBe(0)
    })

    it('should return false when unregistering non-existent rule', () => {
      const { unregisterRule } = useSmartRouting()

      const result = unregisterRule('non-existent-id')

      expect(result).toBe(false)
    })

    it('should enable a rule', () => {
      const { registerRule, enableRule, rules } = useSmartRouting()

      const ruleId = registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: false,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      expect(rules.value[0]!.enabled).toBe(false)

      enableRule(ruleId)

      expect(rules.value[0]!.enabled).toBe(true)
    })

    it('should disable a rule', () => {
      const { registerRule, disableRule, rules } = useSmartRouting()

      const ruleId = registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      expect(rules.value[0]!.enabled).toBe(true)

      disableRule(ruleId)

      expect(rules.value[0]!.enabled).toBe(false)
    })

    it('should update a rule', () => {
      const { registerRule, updateRule, rules } = useSmartRouting()

      const ruleId = registerRule({
        name: 'Original Name',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'original' },
      })

      updateRule(ruleId, {
        name: 'Updated Name',
        action: { type: 'route_to_agent', target: 'agent-1' },
      })

      expect(rules.value[0]!.name).toBe('Updated Name')
      expect(rules.value[0]!.action.type).toBe('route_to_agent')
      expect(rules.value[0]!.action.target).toBe('agent-1')
    })

    it('should re-sort rules when priority is updated', () => {
      const { registerRule, updateRule, rules } = useSmartRouting()

      const rule1Id = registerRule({
        name: 'Rule 1',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      registerRule({
        name: 'Rule 2',
        priority: 100,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      expect(rules.value[0]!.name).toBe('Rule 2')

      // Update Rule 1 to have higher priority
      updateRule(rule1Id, { priority: 150 })

      expect(rules.value[0]!.name).toBe('Rule 1')
    })

    it('should clear all rules', () => {
      const { registerRule, clearRules, rules } = useSmartRouting()

      registerRule({
        name: 'Rule 1',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      registerRule({
        name: 'Rule 2',
        priority: 60,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      expect(rules.value.length).toBe(2)

      clearRules()

      expect(rules.value.length).toBe(0)
    })
  })

  describe('Built-in Rules', () => {
    describe('Language Rules', () => {
      it('should add a language rule', () => {
        const { addLanguageRule, rules } = useSmartRouting()

        const ruleId = addLanguageRule('es', 'spanish-queue')

        expect(ruleId).toBeDefined()
        expect(rules.value.length).toBe(1)
        expect(rules.value[0]!.name).toBe('Language: ES')
        expect(rules.value[0]!.action.target).toBe('spanish-queue')
      })

      it('should match when context language matches', async () => {
        const { addLanguageRule, evaluateRouting } = useSmartRouting()

        addLanguageRule('es', 'spanish-queue')

        const context = createContext({ language: 'es' })
        const decision = await evaluateRouting(context)

        expect(decision).not.toBeNull()
        expect(decision!.action.target).toBe('spanish-queue')
      })

      it('should not match when language does not match', async () => {
        const { addLanguageRule, evaluateRouting } = useSmartRouting()

        addLanguageRule('es', 'spanish-queue')

        const context = createContext({ language: 'en' })
        const decision = await evaluateRouting(context)

        expect(decision).toBeNull()
      })

      it('should detect language from IVR transcription', async () => {
        const { addLanguageRule, evaluateRouting } = useSmartRouting(undefined, {
          detectLanguage: true,
        })

        addLanguageRule('es', 'spanish-queue')

        const context = createContext({
          ivr: {
            selections: ['1'],
            transcription: 'Hola, necesito ayuda con mi cuenta por favor',
          },
        })

        const decision = await evaluateRouting(context)

        expect(decision).not.toBeNull()
        expect(decision!.action.target).toBe('spanish-queue')
      })
    })

    describe('Sentiment Rules', () => {
      it('should add a sentiment rule for negative threshold', () => {
        const { addSentimentRule, rules } = useSmartRouting()

        const ruleId = addSentimentRule(-0.5, {
          type: 'route_to_queue',
          target: 'escalations',
          priority: 'urgent',
        })

        expect(ruleId).toBeDefined()
        expect(rules.value.length).toBe(1)
        expect(rules.value[0]!.name).toContain('Sentiment')
        expect(rules.value[0]!.name).toContain('below')
      })

      it('should match when sentiment is below negative threshold', async () => {
        const { addSentimentRule, evaluateRouting } = useSmartRouting()

        addSentimentRule(-0.5, {
          type: 'route_to_queue',
          target: 'escalations',
          priority: 'urgent',
        })

        const context = createContext({ sentiment: -0.7 })
        const decision = await evaluateRouting(context)

        expect(decision).not.toBeNull()
        expect(decision!.action.target).toBe('escalations')
        expect(decision!.action.priority).toBe('urgent')
      })

      it('should not match when sentiment is above negative threshold', async () => {
        const { addSentimentRule, evaluateRouting } = useSmartRouting()

        addSentimentRule(-0.5, {
          type: 'route_to_queue',
          target: 'escalations',
        })

        const context = createContext({ sentiment: -0.3 })
        const decision = await evaluateRouting(context)

        expect(decision).toBeNull()
      })

      it('should match positive threshold', async () => {
        const { addSentimentRule, evaluateRouting } = useSmartRouting()

        addSentimentRule(0.7, {
          type: 'priority_boost',
          priority: 'high',
        })

        const context = createContext({ sentiment: 0.8 })
        const decision = await evaluateRouting(context)

        expect(decision).not.toBeNull()
        expect(decision!.action.priority).toBe('high')
      })

      it('should use IVR sentiment if context sentiment not provided', async () => {
        const { addSentimentRule, evaluateRouting } = useSmartRouting()

        addSentimentRule(-0.5, {
          type: 'route_to_queue',
          target: 'escalations',
        })

        const context = createContext({
          ivr: {
            selections: ['1'],
            sentiment: -0.6,
          },
        })

        const decision = await evaluateRouting(context)

        expect(decision).not.toBeNull()
        expect(decision!.action.target).toBe('escalations')
      })
    })

    describe('Skill Match Rules', () => {
      it('should add a skill match rule', () => {
        const { addSkillMatchRule, rules } = useSmartRouting()

        const ruleId = addSkillMatchRule(['billing', 'technical'], 5)

        expect(ruleId).toBeDefined()
        expect(rules.value.length).toBe(1)
        expect(rules.value[0]!.name).toBe('Skills: billing, technical')
        expect(rules.value[0]!.action.type).toBe('skill_match')
        expect(rules.value[0]!.action.preferAgentsWithSkill).toEqual(['billing', 'technical'])
      })

      it('should always match for routing (used for agent selection)', async () => {
        const { addSkillMatchRule, evaluateRouting } = useSmartRouting()

        addSkillMatchRule(['billing'], 5)

        const context = createContext()
        const decision = await evaluateRouting(context)

        expect(decision).not.toBeNull()
        expect(decision!.action.type).toBe('skill_match')
      })
    })

    describe('VIP Rules', () => {
      it('should add a VIP rule', () => {
        const { addVIPRule, rules } = useSmartRouting()

        const ruleId = addVIPRule(['+15551111111', '+15552222222'], {
          type: 'route_to_queue',
          target: 'vip-support',
        })

        expect(ruleId).toBeDefined()
        expect(rules.value.length).toBe(1)
        expect(rules.value[0]!.name).toBe('VIP Caller')
        expect(rules.value[0]!.action.priority).toBe('high') // Default high priority for VIP
      })

      it('should match exact VIP number', async () => {
        const { addVIPRule, evaluateRouting } = useSmartRouting()

        addVIPRule(['+15551111111'], {
          type: 'route_to_queue',
          target: 'vip-support',
        })

        const context = createContext({ callerNumber: '+15551111111' })
        const decision = await evaluateRouting(context)

        expect(decision).not.toBeNull()
        expect(decision!.action.target).toBe('vip-support')
      })

      it('should match VIP number with different formatting', async () => {
        const { addVIPRule, evaluateRouting } = useSmartRouting()

        addVIPRule(['15551111111'], {
          type: 'route_to_queue',
          target: 'vip-support',
        })

        const context = createContext({ callerNumber: '+1 (555) 111-1111' })
        const decision = await evaluateRouting(context)

        expect(decision).not.toBeNull()
        expect(decision!.action.target).toBe('vip-support')
      })

      it('should match VIP prefix pattern', async () => {
        const { addVIPRule, evaluateRouting } = useSmartRouting()

        addVIPRule(['1555*'], {
          type: 'route_to_queue',
          target: 'vip-support',
        })

        const context = createContext({ callerNumber: '+15559999999' })
        const decision = await evaluateRouting(context)

        expect(decision).not.toBeNull()
        expect(decision!.action.target).toBe('vip-support')
      })

      it('should match VIP number ending', async () => {
        const { addVIPRule, evaluateRouting } = useSmartRouting()

        addVIPRule(['1111'], {
          type: 'route_to_queue',
          target: 'vip-support',
        })

        const context = createContext({ callerNumber: '+15551111' })
        const decision = await evaluateRouting(context)

        expect(decision).not.toBeNull()
        expect(decision!.action.target).toBe('vip-support')
      })

      it('should not match non-VIP number', async () => {
        const { addVIPRule, evaluateRouting } = useSmartRouting()

        addVIPRule(['+15551111111'], {
          type: 'route_to_queue',
          target: 'vip-support',
        })

        const context = createContext({ callerNumber: '+15559999999' })
        const decision = await evaluateRouting(context)

        expect(decision).toBeNull()
      })
    })
  })

  describe('Routing Evaluation', () => {
    it('should evaluate rules in priority order', async () => {
      const { registerRule, evaluateRouting } = useSmartRouting()

      // Lower priority, matches always
      registerRule({
        name: 'Default Rule',
        priority: 10,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'default-queue' },
      })

      // Higher priority, matches always
      registerRule({
        name: 'Priority Rule',
        priority: 100,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'priority-queue' },
      })

      const decision = await evaluateRouting(createContext())

      expect(decision).not.toBeNull()
      expect(decision!.action.target).toBe('priority-queue')
      expect(decision!.ruleName).toBe('Priority Rule')
    })

    it('should skip disabled rules', async () => {
      const { registerRule, evaluateRouting } = useSmartRouting()

      registerRule({
        name: 'Disabled Rule',
        priority: 100,
        enabled: false,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'disabled-queue' },
      })

      registerRule({
        name: 'Enabled Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'enabled-queue' },
      })

      const decision = await evaluateRouting(createContext())

      expect(decision).not.toBeNull()
      expect(decision!.action.target).toBe('enabled-queue')
    })

    it('should return null when no rules match', async () => {
      const { registerRule, evaluateRouting } = useSmartRouting()

      registerRule({
        name: 'Non-matching Rule',
        priority: 50,
        enabled: true,
        condition: () => false,
        action: { type: 'route_to_queue', target: 'test-queue' },
      })

      const decision = await evaluateRouting(createContext())

      expect(decision).toBeNull()
    })

    it('should return null when no rules are registered', async () => {
      const { evaluateRouting } = useSmartRouting()

      const decision = await evaluateRouting(createContext())

      expect(decision).toBeNull()
    })

    it('should support async condition functions', async () => {
      const { registerRule, evaluateRouting } = useSmartRouting()

      registerRule({
        name: 'Async Rule',
        priority: 50,
        enabled: true,
        condition: async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return ctx.callerNumber.includes('555')
        },
        action: { type: 'route_to_queue', target: 'async-queue' },
      })

      const decision = await evaluateRouting(createContext({ callerNumber: '+15551234567' }))

      expect(decision).not.toBeNull()
      expect(decision!.action.target).toBe('async-queue')
    })

    it('should set isProcessing during evaluation', async () => {
      const { registerRule, evaluateRouting, isProcessing } = useSmartRouting()

      let wasProcessing = false

      registerRule({
        name: 'Slow Rule',
        priority: 50,
        enabled: true,
        condition: async () => {
          wasProcessing = isProcessing.value
          await new Promise((resolve) => setTimeout(resolve, 10))
          return true
        },
        action: { type: 'route_to_queue', target: 'test-queue' },
      })

      const promise = evaluateRouting(createContext())

      await promise

      expect(wasProcessing).toBe(true)
      expect(isProcessing.value).toBe(false)
    })

    it('should update lastDecision and decisionHistory', async () => {
      const { registerRule, evaluateRouting, lastDecision, decisionHistory } = useSmartRouting()

      registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'test-queue' },
      })

      expect(lastDecision.value).toBeNull()
      expect(decisionHistory.value.length).toBe(0)

      await evaluateRouting(createContext())

      expect(lastDecision.value).not.toBeNull()
      expect(lastDecision.value!.ruleName).toBe('Test Rule')
      expect(decisionHistory.value.length).toBe(1)

      await evaluateRouting(createContext())

      expect(decisionHistory.value.length).toBe(2)
    })

    it('should limit decision history to 100 entries', async () => {
      const { registerRule, evaluateRouting, decisionHistory } = useSmartRouting()

      registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'test-queue' },
      })

      for (let i = 0; i < 110; i++) {
        await evaluateRouting(createContext())
      }

      expect(decisionHistory.value.length).toBe(100)
    })

    it('should clear decision history', async () => {
      const { registerRule, evaluateRouting, clearHistory, decisionHistory, lastDecision } =
        useSmartRouting()

      registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'test-queue' },
      })

      await evaluateRouting(createContext())

      expect(decisionHistory.value.length).toBe(1)
      expect(lastDecision.value).not.toBeNull()

      clearHistory()

      expect(decisionHistory.value.length).toBe(0)
      expect(lastDecision.value).toBeNull()
    })

    it('should continue to next rule if condition throws', async () => {
      const { registerRule, evaluateRouting } = useSmartRouting()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      registerRule({
        name: 'Error Rule',
        priority: 100,
        enabled: true,
        condition: () => {
          throw new Error('Test error')
        },
        action: { type: 'route_to_queue', target: 'error-queue' },
      })

      registerRule({
        name: 'Fallback Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'fallback-queue' },
      })

      const decision = await evaluateRouting(createContext())

      expect(decision).not.toBeNull()
      expect(decision!.action.target).toBe('fallback-queue')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Agent Suggestion', () => {
    it('should suggest available agent', () => {
      const { suggestAgent } = useSmartRouting()

      const agents = [createAgent({ id: 'agent-1', state: 'available' })]

      const suggested = suggestAgent(createContext(), agents)

      expect(suggested).not.toBeNull()
      expect(suggested!.id).toBe('agent-1')
    })

    it('should return null when no agents available', () => {
      const { suggestAgent } = useSmartRouting()

      const suggested = suggestAgent(createContext(), [])

      expect(suggested).toBeNull()
    })

    it('should exclude busy agents', () => {
      const { suggestAgent } = useSmartRouting()

      const agents = [
        createAgent({ id: 'agent-1', state: 'busy' }),
        createAgent({ id: 'agent-2', state: 'available' }),
      ]

      const suggested = suggestAgent(createContext(), agents)

      expect(suggested).not.toBeNull()
      expect(suggested!.id).toBe('agent-2')
    })

    it('should exclude agents at max capacity', () => {
      const { suggestAgent } = useSmartRouting()

      const agents = [
        createAgent({ id: 'agent-1', state: 'available', currentCalls: 3, maxCalls: 3 }),
        createAgent({ id: 'agent-2', state: 'available', currentCalls: 1, maxCalls: 3 }),
      ]

      const suggested = suggestAgent(createContext(), agents)

      expect(suggested).not.toBeNull()
      expect(suggested!.id).toBe('agent-2')
    })

    it('should prefer agents with matching skills', () => {
      const { addSkillMatchRule, suggestAgent } = useSmartRouting()

      addSkillMatchRule(['billing'], 1)

      const agents = [
        createAgent({ id: 'agent-1', skills: [{ name: 'technical', level: 8 }] }),
        createAgent({ id: 'agent-2', skills: [{ name: 'billing', level: 7 }] }),
      ]

      const suggested = suggestAgent(createContext(), agents)

      expect(suggested).not.toBeNull()
      expect(suggested!.id).toBe('agent-2')
    })

    it('should prefer agents with higher skill levels', () => {
      const { addSkillMatchRule, suggestAgent } = useSmartRouting()

      addSkillMatchRule(['billing'], 1)

      const agents = [
        createAgent({ id: 'agent-1', skills: [{ name: 'billing', level: 5 }] }),
        createAgent({ id: 'agent-2', skills: [{ name: 'billing', level: 9 }] }),
      ]

      const suggested = suggestAgent(createContext(), agents)

      expect(suggested).not.toBeNull()
      expect(suggested!.id).toBe('agent-2')
    })

    it('should prefer agents with fewer current calls', () => {
      const { suggestAgent } = useSmartRouting()

      const agents = [
        createAgent({ id: 'agent-1', currentCalls: 2, maxCalls: 3 }),
        createAgent({ id: 'agent-2', currentCalls: 0, maxCalls: 3 }),
      ]

      const suggested = suggestAgent(createContext(), agents)

      expect(suggested).not.toBeNull()
      expect(suggested!.id).toBe('agent-2')
    })

    it('should prefer agents who have been idle longer', () => {
      const { suggestAgent } = useSmartRouting()

      const now = Date.now()
      const agents = [
        createAgent({ id: 'agent-1', lastCallTime: new Date(now - 60000) }), // 1 min ago
        createAgent({ id: 'agent-2', lastCallTime: new Date(now - 600000) }), // 10 min ago
      ]

      const suggested = suggestAgent(createContext(), agents)

      expect(suggested).not.toBeNull()
      expect(suggested!.id).toBe('agent-2')
    })

    it('should return null if no agent meets skill threshold', () => {
      const { addSkillMatchRule, suggestAgent } = useSmartRouting(undefined, {
        skillMatchThreshold: 0.8,
      })

      addSkillMatchRule(['billing', 'technical'], 8)

      const agents = [
        createAgent({
          id: 'agent-1',
          skills: [{ name: 'billing', level: 3 }], // Low level
        }),
      ]

      const suggested = suggestAgent(createContext(), agents)

      expect(suggested).toBeNull()
    })

    it('should handle case-insensitive skill matching', () => {
      const { addSkillMatchRule, suggestAgent } = useSmartRouting()

      addSkillMatchRule(['BILLING'], 1)

      const agents = [createAgent({ id: 'agent-1', skills: [{ name: 'billing', level: 7 }] })]

      const suggested = suggestAgent(createContext(), agents)

      expect(suggested).not.toBeNull()
      expect(suggested!.id).toBe('agent-1')
    })
  })

  describe('Language Detection', () => {
    it('should detect English text', () => {
      const { detectLanguage } = useSmartRouting()

      const result = detectLanguage('Hello, I need help with my account please')

      expect(result).toBe('en')
    })

    it('should detect Spanish text', () => {
      const { detectLanguage } = useSmartRouting()

      const result = detectLanguage('Hola, necesito ayuda con mi cuenta por favor')

      expect(result).toBe('es')
    })

    it('should detect French text', () => {
      const { detectLanguage } = useSmartRouting()

      const result = detectLanguage("Bonjour, j'ai besoin d'aide avec mon compte s'il vous plait")

      expect(result).toBe('fr')
    })

    it('should detect German text', () => {
      const { detectLanguage } = useSmartRouting()

      const result = detectLanguage('Guten Tag, ich brauche Hilfe mit meinem Konto bitte')

      expect(result).toBe('de')
    })

    it('should detect Portuguese text', () => {
      const { detectLanguage } = useSmartRouting()

      const result = detectLanguage('Ola, preciso de ajuda com minha conta por favor')

      expect(result).toBe('pt')
    })

    it('should detect Italian text', () => {
      const { detectLanguage } = useSmartRouting()

      const result = detectLanguage('Ciao, ho bisogno di aiuto con il mio servizio per favore')

      expect(result).toBe('it')
    })

    it('should return null for empty text', () => {
      const { detectLanguage } = useSmartRouting()

      expect(detectLanguage('')).toBeNull()
    })

    it('should return null for very short text', () => {
      const { detectLanguage } = useSmartRouting()

      expect(detectLanguage('hi')).toBeNull()
    })

    it('should return null for ambiguous text', () => {
      const { detectLanguage } = useSmartRouting()

      // Single common word that appears in multiple languages
      const result = detectLanguage('xyz abc 123')

      expect(result).toBeNull()
    })
  })

  describe('Skill Matching', () => {
    it('should return 1 when no skills required', () => {
      const { matchSkills } = useSmartRouting()

      const agent = createAgent({ skills: [{ name: 'billing', level: 5 }] })
      const score = matchSkills([], agent)

      expect(score).toBe(1)
    })

    it('should return 0 when agent has no skills but some required', () => {
      const { matchSkills } = useSmartRouting()

      const agent = createAgent({ skills: [] })
      const score = matchSkills(['billing'], agent)

      expect(score).toBe(0)
    })

    it('should return 0 when agent lacks required skills', () => {
      const { matchSkills } = useSmartRouting()

      const agent = createAgent({ skills: [{ name: 'technical', level: 8 }] })
      const score = matchSkills(['billing'], agent)

      expect(score).toBe(0)
    })

    it('should calculate score based on skill level', () => {
      const { matchSkills } = useSmartRouting()

      const agentLow = createAgent({ skills: [{ name: 'billing', level: 5 }] })
      const agentHigh = createAgent({ skills: [{ name: 'billing', level: 10 }] })

      const scoreLow = matchSkills(['billing'], agentLow)
      const scoreHigh = matchSkills(['billing'], agentHigh)

      expect(scoreHigh).toBeGreaterThan(scoreLow)
      expect(scoreHigh).toBe(1) // 10/10 = 1
      expect(scoreLow).toBe(0.5) // 5/10 = 0.5
    })

    it('should penalize for missing skills', () => {
      const { matchSkills } = useSmartRouting()

      const agentPartial = createAgent({ skills: [{ name: 'billing', level: 10 }] })
      const agentFull = createAgent({
        skills: [
          { name: 'billing', level: 10 },
          { name: 'technical', level: 10 },
        ],
      })

      const scorePartial = matchSkills(['billing', 'technical'], agentPartial)
      const scoreFull = matchSkills(['billing', 'technical'], agentFull)

      expect(scoreFull).toBeGreaterThan(scorePartial)
      expect(scoreFull).toBe(1) // Full coverage
      expect(scorePartial).toBe(0.5) // Half coverage
    })

    it('should respect minimum skill level', () => {
      const { matchSkills } = useSmartRouting()

      const agent = createAgent({ skills: [{ name: 'billing', level: 3 }] })

      const scoreWithLowMin = matchSkills(['billing'], agent, 1)
      const scoreWithHighMin = matchSkills(['billing'], agent, 5)

      expect(scoreWithLowMin).toBeGreaterThan(0)
      expect(scoreWithHighMin).toBe(0) // Below min level
    })
  })

  describe('Rule Priority', () => {
    it('should evaluate VIP rules before sentiment rules', async () => {
      const { addVIPRule, addSentimentRule, evaluateRouting } = useSmartRouting()

      // Sentiment rule added first
      addSentimentRule(-0.5, {
        type: 'route_to_queue',
        target: 'escalations',
      })

      // VIP rule added second but should have higher priority
      addVIPRule(['+15551234567'], {
        type: 'route_to_queue',
        target: 'vip-support',
      })

      const context = createContext({
        callerNumber: '+15551234567',
        sentiment: -0.7, // Would match sentiment rule too
      })

      const decision = await evaluateRouting(context)

      expect(decision).not.toBeNull()
      expect(decision!.action.target).toBe('vip-support')
    })

    it('should evaluate sentiment rules before language rules', async () => {
      const { addSentimentRule, addLanguageRule, evaluateRouting } = useSmartRouting()

      // Language rule added first
      addLanguageRule('es', 'spanish-queue')

      // Sentiment rule added second but should have higher priority
      addSentimentRule(-0.5, {
        type: 'route_to_queue',
        target: 'escalations',
      })

      const context = createContext({
        language: 'es',
        sentiment: -0.7,
      })

      const decision = await evaluateRouting(context)

      expect(decision).not.toBeNull()
      expect(decision!.action.target).toBe('escalations')
    })
  })

  describe('Decision Confidence and Reasoning', () => {
    it('should include confidence score in decision', async () => {
      const { registerRule, evaluateRouting } = useSmartRouting()

      registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'test-queue' },
      })

      const decision = await evaluateRouting(createContext())

      expect(decision).not.toBeNull()
      expect(decision!.confidence).toBe(1.0)
    })

    it('should include reasoning in decision', async () => {
      const { registerRule, evaluateRouting } = useSmartRouting()

      registerRule({
        name: 'My Test Rule',
        priority: 75,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'test-queue' },
      })

      const decision = await evaluateRouting(createContext())

      expect(decision).not.toBeNull()
      expect(decision!.reasoning).toContain('My Test Rule')
      expect(decision!.reasoning).toContain('75') // Priority
    })

    it('should include timestamp in decision', async () => {
      const { registerRule, evaluateRouting } = useSmartRouting()

      registerRule({
        name: 'Test Rule',
        priority: 50,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue', target: 'test-queue' },
      })

      const before = new Date()
      const decision = await evaluateRouting(createContext())
      const after = new Date()

      expect(decision).not.toBeNull()
      expect(decision!.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(decision!.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('Helpers and Computed Properties', () => {
    it('should track rule statistics', () => {
      const {
        addRule,
        ruleCount,
        hasRules,
        enabledRulesCount,
        disabledRulesCount,
        enabledRules,
        disabledRules,
        disableRule,
      } = useSmartRouting()

      expect(hasRules.value).toBe(false)
      expect(ruleCount.value).toBe(0)

      const rule1Id = addRule({
        name: 'Rule 1',
        priority: 1,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      addRule({
        name: 'Rule 2',
        priority: 1,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      expect(hasRules.value).toBe(true)
      expect(ruleCount.value).toBe(2)
      expect(enabledRulesCount.value).toBe(2)
      expect(enabledRules.value.length).toBe(2)
      expect(disabledRulesCount.value).toBe(0)

      disableRule(rule1Id)

      expect(enabledRulesCount.value).toBe(1)
      expect(disabledRulesCount.value).toBe(1)
      expect(disabledRules.value.length).toBe(1)
    })

    it('should track decision history status', async () => {
      const { hasDecisionHistory, addRule, evaluateRouting } = useSmartRouting()

      expect(hasDecisionHistory.value).toBe(false)

      addRule({
        name: 'Rule 1',
        priority: 1,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      await evaluateRouting(createContext())

      expect(hasDecisionHistory.value).toBe(true)
    })

    it('should enable/disable all rules', () => {
      const { addRule, enableAllRules, disableAllRules, enabledRulesCount } = useSmartRouting()

      addRule({
        name: 'Rule 1',
        priority: 1,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      addRule({
        name: 'Rule 2',
        priority: 1,
        enabled: false,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      expect(enabledRulesCount.value).toBe(1)

      disableAllRules()
      expect(enabledRulesCount.value).toBe(0)

      enableAllRules()
      expect(enabledRulesCount.value).toBe(2)
    })

    it('should expose addRule as alias for registerRule', () => {
      const { addRule, ruleCount } = useSmartRouting()

      addRule({
        name: 'Rule 1',
        priority: 1,
        enabled: true,
        condition: () => true,
        action: { type: 'route_to_queue' },
      })

      expect(ruleCount.value).toBe(1)
    })
  })
})
