/**
 * useSmartRouting - Intelligent call routing composable
 *
 * Provides rule-based intelligent call routing decisions based on multiple
 * factors including agent skills, caller sentiment, language, and custom
 * business rules.
 *
 * @module composables/useSmartRouting
 */

import { ref, type Ref } from 'vue'
import type { AmiClient } from '../core/AmiClient'

/**
 * Rule that defines routing logic
 */
export interface RoutingRule {
  /** Unique rule identifier */
  id: string
  /** Human-readable rule name */
  name: string
  /** Priority - higher values are evaluated first */
  priority: number
  /** Condition function that determines if rule applies */
  condition: (context: RoutingContext) => boolean | Promise<boolean>
  /** Action to take when condition is met */
  action: RoutingAction
  /** Whether the rule is enabled */
  enabled: boolean
}

/**
 * Context information about the incoming call
 */
export interface RoutingContext {
  /** Unique caller identifier */
  callerId: string
  /** Caller phone number */
  callerNumber: string
  /** Called number (DID) */
  calledNumber: string
  /** Queue name if coming from a queue */
  queueName?: string
  /** Sentiment score from -1 (negative) to 1 (positive) */
  sentiment?: number
  /** Detected language code (e.g., 'en', 'es', 'fr') */
  language?: string
  /** IVR data if caller went through IVR */
  ivr?: {
    /** IVR menu selections */
    selections: string[]
    /** Sentiment from IVR conversation */
    sentiment?: number
    /** Transcribed IVR input */
    transcription?: string
  }
  /** Additional metadata */
  metadata?: Record<string, unknown>
  /** Timestamp of the routing request */
  timestamp: Date
}

/**
 * Action to take when a routing rule matches
 */
export interface RoutingAction {
  /** Type of routing action */
  type:
    | 'route_to_queue'
    | 'route_to_agent'
    | 'route_to_extension'
    | 'priority_boost'
    | 'skill_match'
    | 'custom'
  /** Target queue, agent ID, or extension */
  target?: string
  /** Priority level for the call */
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  /** Prefer agents with these skills */
  preferAgentsWithSkill?: string[]
  /** Additional action metadata */
  metadata?: Record<string, unknown>
}

/**
 * Result of a routing decision
 */
export interface RoutingDecision {
  /** ID of the rule that made the decision */
  ruleId: string
  /** Name of the rule */
  ruleName: string
  /** Action to take */
  action: RoutingAction
  /** Confidence score 0-1 */
  confidence: number
  /** Human-readable reasoning */
  reasoning: string
  /** When the decision was made */
  timestamp: Date
}

/**
 * Agent skill with proficiency level
 */
export interface AgentSkill {
  /** Skill name */
  name: string
  /** Skill level from 1-10 */
  level: number
}

/**
 * Agent available for routing
 */
export interface AvailableAgent {
  /** Unique agent ID */
  id: string
  /** Agent extension number */
  extension: string
  /** Agent display name */
  name: string
  /** Agent skills */
  skills: AgentSkill[]
  /** Number of current calls */
  currentCalls: number
  /** Maximum concurrent calls allowed */
  maxCalls: number
  /** Current agent state */
  state: 'available' | 'busy' | 'wrap-up' | 'paused'
  /** Time of last call */
  lastCallTime?: Date
}

/**
 * Options for useSmartRouting composable
 */
export interface UseSmartRoutingOptions {
  /** Default priority for new rules */
  defaultPriority?: number
  /** Enable automatic language detection */
  detectLanguage?: boolean
  /** Skill match threshold (0-1), default 0.5 */
  skillMatchThreshold?: number
}

/**
 * Return type for useSmartRouting composable
 */
export interface UseSmartRoutingReturn {
  // State
  /** All registered routing rules */
  rules: Ref<RoutingRule[]>
  /** Whether routing is currently being processed */
  isProcessing: Ref<boolean>
  /** The most recent routing decision */
  lastDecision: Ref<RoutingDecision | null>
  /** History of routing decisions */
  decisionHistory: Ref<RoutingDecision[]>

  // Rule Management
  /** Register a new routing rule */
  registerRule: (rule: Omit<RoutingRule, 'id'>) => string
  /** Remove a routing rule */
  unregisterRule: (ruleId: string) => boolean
  /** Enable a rule */
  enableRule: (ruleId: string) => void
  /** Disable a rule */
  disableRule: (ruleId: string) => void
  /** Update a rule */
  updateRule: (ruleId: string, updates: Partial<RoutingRule>) => void

  // Routing
  /** Evaluate routing rules for a context */
  evaluateRouting: (context: RoutingContext) => Promise<RoutingDecision | null>
  /** Suggest the best agent for a context */
  suggestAgent: (
    context: RoutingContext,
    availableAgents: AvailableAgent[]
  ) => AvailableAgent | null

  // Built-in Rules
  /** Add a language-based routing rule */
  addLanguageRule: (language: string, queueOrAgent: string) => string
  /** Add a sentiment-based routing rule */
  addSentimentRule: (threshold: number, action: RoutingAction) => string
  /** Add a skill matching rule */
  addSkillMatchRule: (requiredSkills: string[], minLevel?: number) => string
  /** Add a VIP caller routing rule */
  addVIPRule: (callerPatterns: string[], action: RoutingAction) => string

  // Utilities
  /** Detect language from text */
  detectLanguage: (text: string) => string | null
  /** Calculate skill match score between requirements and agent */
  matchSkills: (required: string[], agent: AvailableAgent, minLevel?: number) => number

  // Reset
  /** Clear all rules */
  clearRules: () => void
  /** Clear decision history */
  clearHistory: () => void
}

// ============================================================================
// Language Detection - Keyword-based approach
// ============================================================================

/**
 * Common words and patterns for language detection
 */
const LANGUAGE_PATTERNS: Record<string, string[]> = {
  en: [
    'the',
    'is',
    'are',
    'was',
    'were',
    'have',
    'has',
    'been',
    'will',
    'would',
    'could',
    'should',
    'hello',
    'please',
    'thank',
    'thanks',
    'yes',
    'no',
    'help',
    'need',
    'want',
    'what',
    'when',
    'where',
    'why',
    'how',
    'about',
    'with',
    'from',
    'this',
    'that',
    'which',
    'your',
    'my',
    'can',
    'call',
    'speak',
    'service',
    'support',
  ],
  es: [
    'el',
    'la',
    'los',
    'las',
    'es',
    'son',
    'fue',
    'han',
    'hola',
    'por',
    'favor',
    'gracias',
    'que',
    'como',
    'donde',
    'cuando',
    'porque',
    'quiero',
    'necesito',
    'ayuda',
    'hablar',
    'con',
    'para',
    'tiene',
    'puede',
    'servicio',
    'llamar',
    'bueno',
    'bien',
    'malo',
    'problema',
    'uno',
    'una',
    'este',
    'esta',
    'eso',
    'ese',
    'ustedes',
    'nosotros',
  ],
  fr: [
    'le',
    'la',
    'les',
    'est',
    'sont',
    'bonjour',
    'merci',
    "s'il",
    'vous',
    'plait',
    'oui',
    'non',
    'que',
    'qui',
    'quand',
    'comment',
    'pourquoi',
    'avec',
    'pour',
    'dans',
    'sur',
    'une',
    'des',
    'mon',
    'votre',
    'nous',
    'ils',
    'elles',
    'avoir',
    'etre',
    'faire',
    'besoin',
    'aide',
    'parler',
    'appeler',
    'service',
    'probleme',
  ],
  de: [
    'der',
    'die',
    'das',
    'ist',
    'sind',
    'war',
    'hallo',
    'guten',
    'tag',
    'danke',
    'bitte',
    'ja',
    'nein',
    'was',
    'wie',
    'wo',
    'wann',
    'warum',
    'mit',
    'fur',
    'von',
    'auf',
    'ein',
    'eine',
    'mein',
    'ihr',
    'wir',
    'sie',
    'haben',
    'sein',
    'werden',
    'brauchen',
    'hilfe',
    'sprechen',
    'anrufen',
    'dienst',
    'problem',
  ],
  ja: [
    'です',
    'ます',
    'した',
    'ください',
    'ありがとう',
    'はい',
    'いいえ',
    'お願い',
    'すみません',
    'なに',
    'どこ',
    'いつ',
    'なぜ',
    'どう',
    'これ',
    'それ',
    'あれ',
    'わたし',
    'あなた',
    'サービス',
    'ヘルプ',
    'もしもし',
  ],
  zh: [
    '的',
    '是',
    '在',
    '有',
    '和',
    '了',
    '不',
    '这',
    '那',
    '你',
    '我',
    '他',
    '她',
    '们',
    '什么',
    '哪里',
    '为什么',
    '怎么',
    '请',
    '谢谢',
    '好',
    '对',
    '帮助',
    '服务',
    '问题',
  ],
  pt: [
    'o',
    'a',
    'os',
    'as',
    'e',
    'de',
    'que',
    'em',
    'um',
    'uma',
    'para',
    'com',
    'nao',
    'por',
    'mais',
    'como',
    'ola',
    'obrigado',
    'sim',
    'nao',
    'ajuda',
    'preciso',
    'quero',
    'falar',
    'servico',
    'problema',
    'voce',
    'seu',
    'meu',
  ],
  it: [
    'il',
    'la',
    'lo',
    'i',
    'le',
    'gli',
    'di',
    'che',
    'e',
    'in',
    'un',
    'una',
    'per',
    'con',
    'non',
    'ciao',
    'grazie',
    'prego',
    'si',
    'no',
    'come',
    'dove',
    'quando',
    'perche',
    'aiuto',
    'servizio',
    'problema',
    'parlare',
    'chiamare',
  ],
}

/**
 * Generate a unique ID for rules and decisions
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Vue composable for intelligent call routing
 *
 * Provides rule-based call routing with support for:
 * - Language-based routing
 * - Sentiment-based escalation
 * - Skill-based agent matching
 * - VIP caller detection
 * - Custom routing rules
 *
 * @param amiClientRef - Optional reference to AMI client for queue/agent lookups
 * @param options - Configuration options
 * @returns Smart routing state and methods
 *
 * @example
 * ```typescript
 * const { registerRule, evaluateRouting, suggestAgent } = useSmartRouting()
 *
 * // Add a language-based rule
 * addLanguageRule('es', 'spanish-support')
 *
 * // Add a sentiment escalation rule
 * addSentimentRule(-0.5, {
 *   type: 'route_to_queue',
 *   target: 'escalations',
 *   priority: 'urgent'
 * })
 *
 * // Evaluate routing for an incoming call
 * const decision = await evaluateRouting({
 *   callerId: 'caller-123',
 *   callerNumber: '+15551234567',
 *   calledNumber: '+15559876543',
 *   sentiment: -0.6,
 *   language: 'es',
 *   timestamp: new Date()
 * })
 *
 * // Suggest best agent
 * const agent = suggestAgent(context, availableAgents)
 * ```
 */
export function useSmartRouting(
  _amiClientRef?: Ref<AmiClient | null>,
  options: UseSmartRoutingOptions = {}
): UseSmartRoutingReturn {
  const {
    defaultPriority = 50,
    detectLanguage: autoDetectLanguage = true,
    skillMatchThreshold = 0.5,
  } = options

  // ============================================================================
  // State
  // ============================================================================

  const rules = ref<RoutingRule[]>([])
  const isProcessing = ref(false)
  const lastDecision = ref<RoutingDecision | null>(null)
  const decisionHistory = ref<RoutingDecision[]>([])

  // ============================================================================
  // Language Detection
  // ============================================================================

  /**
   * Detect language from text using keyword matching
   */
  function detectLanguage(text: string): string | null {
    if (!text || text.length < 3) {
      return null
    }

    const normalizedText = text.toLowerCase()
    // Clean words: remove punctuation and get clean tokens
    const words = normalizedText
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z\u00C0-\u024F\u4e00-\u9fff\u3040-\u30ff]/gi, ''))

    const scores: Record<string, number> = {}

    for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      let score = 0
      for (const pattern of patterns) {
        // Use exact word match for most patterns
        if (words.some((word) => word === pattern)) {
          score++
        }
      }
      scores[lang] = score
    }

    // Find language with highest score
    let bestLang: string | null = null
    let bestScore = 0

    for (const [lang, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score
        bestLang = lang
      }
    }

    // Require minimum confidence (at least 2 matches)
    if (bestScore < 2) {
      return null
    }

    return bestLang
  }

  // ============================================================================
  // Skill Matching
  // ============================================================================

  /**
   * Calculate skill match score between requirements and agent
   * Returns 0-1 where 1 is perfect match
   */
  function matchSkills(required: string[], agent: AvailableAgent, minLevel: number = 1): number {
    if (required.length === 0) {
      return 1 // No requirements means any agent matches
    }

    if (agent.skills.length === 0) {
      return 0 // Agent has no skills but we need some
    }

    let totalScore = 0
    let matchedSkills = 0

    for (const requiredSkill of required) {
      const agentSkill = agent.skills.find(
        (s) => s.name.toLowerCase() === requiredSkill.toLowerCase()
      )

      if (agentSkill && agentSkill.level >= minLevel) {
        // Score based on skill level (level / 10)
        totalScore += agentSkill.level / 10
        matchedSkills++
      }
    }

    // Calculate final score: weighted average of matched skills
    if (matchedSkills === 0) {
      return 0
    }

    // Penalize for missing skills
    const coverageRatio = matchedSkills / required.length
    const avgSkillLevel = totalScore / matchedSkills

    return coverageRatio * avgSkillLevel
  }

  // ============================================================================
  // Rule Management
  // ============================================================================

  /**
   * Register a new routing rule
   */
  function registerRule(rule: Omit<RoutingRule, 'id'>): string {
    const id = generateId()
    const newRule: RoutingRule = {
      ...rule,
      id,
    }

    rules.value.push(newRule)

    // Sort by priority (descending)
    rules.value.sort((a, b) => b.priority - a.priority)

    return id
  }

  /**
   * Remove a routing rule
   */
  function unregisterRule(ruleId: string): boolean {
    const index = rules.value.findIndex((r) => r.id === ruleId)
    if (index > -1) {
      rules.value.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Enable a rule
   */
  function enableRule(ruleId: string): void {
    const rule = rules.value.find((r) => r.id === ruleId)
    if (rule) {
      rule.enabled = true
    }
  }

  /**
   * Disable a rule
   */
  function disableRule(ruleId: string): void {
    const rule = rules.value.find((r) => r.id === ruleId)
    if (rule) {
      rule.enabled = false
    }
  }

  /**
   * Update a rule
   */
  function updateRule(ruleId: string, updates: Partial<RoutingRule>): void {
    const rule = rules.value.find((r) => r.id === ruleId)
    if (rule) {
      Object.assign(rule, updates)
      // Re-sort if priority changed
      if ('priority' in updates) {
        rules.value.sort((a, b) => b.priority - a.priority)
      }
    }
  }

  // ============================================================================
  // Built-in Rules
  // ============================================================================

  /**
   * Add a language-based routing rule
   */
  function addLanguageRule(language: string, queueOrAgent: string): string {
    return registerRule({
      name: `Language: ${language.toUpperCase()}`,
      priority: defaultPriority,
      enabled: true,
      condition: (ctx) => {
        // Check explicit language or detect from IVR transcription
        if (ctx.language === language) {
          return true
        }
        if (autoDetectLanguage && ctx.ivr?.transcription) {
          const detected = detectLanguage(ctx.ivr.transcription)
          return detected === language
        }
        return false
      },
      action: {
        type: 'route_to_queue',
        target: queueOrAgent,
        priority: 'normal',
      },
    })
  }

  /**
   * Add a sentiment-based routing rule
   */
  function addSentimentRule(threshold: number, action: RoutingAction): string {
    const isNegativeThreshold = threshold < 0
    return registerRule({
      name: `Sentiment ${isNegativeThreshold ? 'below' : 'above'} ${threshold}`,
      priority: defaultPriority + 10, // Sentiment rules are higher priority
      enabled: true,
      condition: (ctx) => {
        const sentiment = ctx.sentiment ?? ctx.ivr?.sentiment ?? 0
        if (isNegativeThreshold) {
          return sentiment <= threshold
        }
        return sentiment >= threshold
      },
      action,
    })
  }

  /**
   * Add a skill matching rule
   */
  function addSkillMatchRule(requiredSkills: string[], minLevel: number = 1): string {
    return registerRule({
      name: `Skills: ${requiredSkills.join(', ')}`,
      priority: defaultPriority,
      enabled: true,
      condition: () => true, // Always applies, used for agent selection
      action: {
        type: 'skill_match',
        preferAgentsWithSkill: requiredSkills,
        metadata: { minLevel },
      },
    })
  }

  /**
   * Add a VIP caller routing rule
   */
  function addVIPRule(callerPatterns: string[], action: RoutingAction): string {
    return registerRule({
      name: 'VIP Caller',
      priority: defaultPriority + 20, // VIP rules are highest priority
      enabled: true,
      condition: (ctx) => {
        const callerNumber = ctx.callerNumber.replace(/\D/g, '') // Strip non-digits
        for (const pattern of callerPatterns) {
          const cleanPattern = pattern.replace(/\D/g, '')
          // Support exact match or prefix match (pattern ends with *)
          if (pattern.endsWith('*')) {
            if (callerNumber.startsWith(cleanPattern)) {
              return true
            }
          } else {
            if (callerNumber === cleanPattern || callerNumber.endsWith(cleanPattern)) {
              return true
            }
          }
        }
        return false
      },
      action: {
        ...action,
        priority: action.priority ?? 'high',
      },
    })
  }

  // ============================================================================
  // Routing Evaluation
  // ============================================================================

  /**
   * Evaluate routing rules for a context
   */
  async function evaluateRouting(context: RoutingContext): Promise<RoutingDecision | null> {
    isProcessing.value = true

    try {
      // Rules are already sorted by priority (descending)
      const enabledRules = rules.value.filter((r) => r.enabled)

      for (const rule of enabledRules) {
        try {
          const matches = await rule.condition(context)
          if (matches) {
            const decision: RoutingDecision = {
              ruleId: rule.id,
              ruleName: rule.name,
              action: rule.action,
              confidence: 1.0, // Full confidence since condition matched
              reasoning: `Rule "${rule.name}" matched with priority ${rule.priority}`,
              timestamp: new Date(),
            }

            lastDecision.value = decision
            decisionHistory.value.push(decision)

            // Limit history to last 100 decisions
            if (decisionHistory.value.length > 100) {
              decisionHistory.value = decisionHistory.value.slice(-100)
            }

            return decision
          }
        } catch (error) {
          // Log but continue to next rule
          console.error(`Error evaluating rule "${rule.name}":`, error)
        }
      }

      return null
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * Suggest the best agent for a routing context
   */
  function suggestAgent(
    _context: RoutingContext,
    availableAgents: AvailableAgent[]
  ): AvailableAgent | null {
    if (availableAgents.length === 0) {
      return null
    }

    // Filter to only available agents with capacity
    const eligibleAgents = availableAgents.filter(
      (agent) => agent.state === 'available' && agent.currentCalls < agent.maxCalls
    )

    if (eligibleAgents.length === 0) {
      return null
    }

    // Find skill match rules
    const skillRules = rules.value.filter(
      (r) => r.enabled && r.action.type === 'skill_match' && r.action.preferAgentsWithSkill
    )

    // Collect all required skills
    const requiredSkills: string[] = []
    let minLevel = 1

    for (const rule of skillRules) {
      if (rule.action.preferAgentsWithSkill) {
        requiredSkills.push(...rule.action.preferAgentsWithSkill)
      }
      if (rule.action.metadata?.minLevel) {
        minLevel = Math.max(minLevel, rule.action.metadata.minLevel as number)
      }
    }

    // Score each agent
    interface ScoredAgent {
      agent: AvailableAgent
      score: number
    }

    const scoredAgents: ScoredAgent[] = eligibleAgents.map((agent) => {
      let score = 0

      // Skill match score (0-1)
      if (requiredSkills.length > 0) {
        const skillScore = matchSkills(requiredSkills, agent, minLevel)
        score += skillScore * 50 // Weight skills heavily
      } else {
        score += 25 // Baseline if no skills required
      }

      // Prefer agents with fewer current calls (load balancing)
      const loadRatio = 1 - agent.currentCalls / agent.maxCalls
      score += loadRatio * 30

      // Prefer agents who have been idle longer
      if (agent.lastCallTime) {
        const idleTime = Date.now() - agent.lastCallTime.getTime()
        const idleMinutes = idleTime / 60000
        score += Math.min(idleMinutes, 10) * 2 // Up to 20 points for 10+ minutes idle
      } else {
        score += 10 // No recent calls
      }

      return { agent, score }
    })

    // Sort by score (descending) and return best match
    scoredAgents.sort((a, b) => b.score - a.score)

    // Only return if above threshold
    const best = scoredAgents[0]
    if (
      best &&
      (requiredSkills.length === 0 ||
        matchSkills(requiredSkills, best.agent, minLevel) >= skillMatchThreshold)
    ) {
      return best.agent
    }

    // Fallback to first eligible agent if no skill requirements
    if (requiredSkills.length === 0 && eligibleAgents.length > 0) {
      return eligibleAgents[0] ?? null
    }

    return null
  }

  // ============================================================================
  // Reset Functions
  // ============================================================================

  /**
   * Clear all rules
   */
  function clearRules(): void {
    rules.value = []
  }

  /**
   * Clear decision history
   */
  function clearHistory(): void {
    decisionHistory.value = []
    lastDecision.value = null
  }

  // ============================================================================
  // Return Interface
  // ============================================================================

  return {
    // State
    rules,
    isProcessing,
    lastDecision,
    decisionHistory,

    // Rule Management
    registerRule,
    unregisterRule,
    enableRule,
    disableRule,
    updateRule,

    // Routing
    evaluateRouting,
    suggestAgent,

    // Built-in Rules
    addLanguageRule,
    addSentimentRule,
    addSkillMatchRule,
    addVIPRule,

    // Utilities
    detectLanguage,
    matchSkills,

    // Reset
    clearRules,
    clearHistory,
  }
}
