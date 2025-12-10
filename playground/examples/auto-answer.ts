import type { ExampleDefinition } from './types'
import AutoAnswerDemo from '../demos/AutoAnswerDemo.vue'

export const autoAnswerExample: ExampleDefinition = {
  id: 'auto-answer',
  icon: '📞',
  title: 'Auto Answer',
  description: 'Automatically answer incoming calls with configurable rules',
  category: 'utility',
  tags: ['Automation', 'Calls', 'Intercom'],
  component: AutoAnswerDemo,
  setupGuide: '<p>Configure automatic call answering for specific scenarios like intercom calls, trusted callers, or specific queues.</p>',
  codeSnippets: [
    {
      title: 'Configure Auto Answer',
      description: 'Set up automatic answer rules',
      code: `import { useAutoAnswer } from 'vuesip'

const autoAnswer = useAutoAnswer(sipClientRef, {
  enabled: true,
  delay: 500, // ms before answering
  onAutoAnswered: (session) => {
    console.log('Auto-answered call from:', session.remoteUri)
  },
})

// Enable auto-answer for intercom calls
autoAnswer.addRule({
  name: 'Intercom',
  match: (session) => {
    return session.headers['Alert-Info']?.includes('auto-answer')
  },
  delay: 0,
})

// Auto-answer calls from specific extensions
autoAnswer.addRule({
  name: 'Trusted Extensions',
  match: (session) => {
    const trustedList = ['1001', '1002', '1003']
    return trustedList.some(ext => session.remoteUri.includes(ext))
  },
  delay: 1000,
})`,
    },
    {
      title: 'Manage Auto Answer Rules',
      description: 'Enable, disable, and query rules',
      code: `// Toggle auto-answer globally
autoAnswer.setEnabled(true)
autoAnswer.setEnabled(false)

// Check if auto-answer is active
console.log('Auto-answer enabled:', autoAnswer.isEnabled.value)

// List all rules
const rules = autoAnswer.rules.value
rules.forEach(rule => {
  console.log('Rule:', rule.name, 'Active:', rule.enabled)
})

// Remove a rule
autoAnswer.removeRule('Intercom')`,
    },
    {
      title: 'Auto Answer Rule Types',
      description: 'Complete data model for auto-answer rules',
      code: `interface AutoAnswerRule {
  id: string
  name: string
  enabled: boolean
  priority: number
  conditions: AutoAnswerCondition[]
  delay: number  // ms before answering
  audioMode: 'speaker' | 'headset' | 'muted'
  videoEnabled: boolean
  notification: boolean  // Show notification when auto-answered
  logCall: boolean
  createdAt: Date
}

interface AutoAnswerCondition {
  type: 'header' | 'caller' | 'time' | 'queue' | 'custom'
  field?: string
  operator: 'equals' | 'contains' | 'matches' | 'in-list'
  value: string | string[] | RegExp
}

const rules = ref<AutoAnswerRule[]>([])

// Preset rule templates
const ruleTemplates = {
  intercom: {
    name: 'Intercom Calls',
    conditions: [{
      type: 'header' as const,
      field: 'Alert-Info',
      operator: 'contains' as const,
      value: 'auto-answer'
    }],
    delay: 0,
    audioMode: 'speaker' as const
  },

  trustedExtensions: {
    name: 'Trusted Extensions',
    conditions: [{
      type: 'caller' as const,
      operator: 'in-list' as const,
      value: ['1001', '1002', '1003']
    }],
    delay: 500,
    audioMode: 'headset' as const
  },

  queueCallback: {
    name: 'Queue Callbacks',
    conditions: [{
      type: 'header' as const,
      field: 'X-Queue-Callback',
      operator: 'equals' as const,
      value: 'true'
    }],
    delay: 200,
    audioMode: 'headset' as const
  }
}`,
    },
    {
      title: 'Rule Condition Evaluation',
      description: 'Check if incoming call matches rules',
      code: `const evaluateCondition = (
  condition: AutoAnswerCondition,
  session: IncomingSession
): boolean => {
  switch (condition.type) {
    case 'header':
      const headerValue = session.request.getHeader(condition.field!)
      return matchValue(headerValue, condition.operator, condition.value)

    case 'caller':
      const callerUri = session.remoteIdentity.uri.toString()
      return matchValue(callerUri, condition.operator, condition.value)

    case 'time':
      const now = new Date()
      const timeStr = now.toTimeString().slice(0, 5)
      return matchValue(timeStr, condition.operator, condition.value)

    case 'queue':
      const queueHeader = session.request.getHeader('X-Queue-Name')
      return matchValue(queueHeader, condition.operator, condition.value)

    case 'custom':
      // Custom function evaluation
      if (typeof condition.value === 'function') {
        return condition.value(session)
      }
      return false

    default:
      return false
  }
}

const matchValue = (
  actual: string | undefined,
  operator: AutoAnswerCondition['operator'],
  expected: string | string[] | RegExp
): boolean => {
  if (!actual) return false

  switch (operator) {
    case 'equals':
      return actual === expected
    case 'contains':
      return actual.includes(expected as string)
    case 'matches':
      return (expected as RegExp).test(actual)
    case 'in-list':
      return (expected as string[]).some(v => actual.includes(v))
    default:
      return false
  }
}

const findMatchingRule = (session: IncomingSession): AutoAnswerRule | null => {
  const activeRules = rules.value
    .filter(r => r.enabled)
    .sort((a, b) => a.priority - b.priority)

  for (const rule of activeRules) {
    const allConditionsMet = rule.conditions.every(
      condition => evaluateCondition(condition, session)
    )

    if (allConditionsMet) {
      return rule
    }
  }

  return null
}`,
    },
    {
      title: 'Auto Answer Execution',
      description: 'Handle the auto-answer process',
      code: `const executeAutoAnswer = async (
  session: IncomingSession,
  rule: AutoAnswerRule
) => {
  // Log the auto-answer attempt
  console.log(\`Auto-answering call with rule: \${rule.name}\`)

  // Wait for configured delay
  if (rule.delay > 0) {
    await new Promise(resolve => setTimeout(resolve, rule.delay))

    // Check if call is still ringing (might have been cancelled)
    if (session.state !== SessionState.Initial) {
      console.log('Call no longer ringing, skipping auto-answer')
      return
    }
  }

  // Configure audio/video settings
  const constraints: MediaStreamConstraints = {
    audio: true,
    video: rule.videoEnabled
  }

  try {
    // Answer the call
    await session.accept({
      sessionDescriptionHandlerOptions: {
        constraints
      }
    })

    // Apply audio mode
    await applyAudioMode(session, rule.audioMode)

    // Show notification if enabled
    if (rule.notification) {
      showAutoAnswerNotification(session, rule)
    }

    // Log the call if enabled
    if (rule.logCall) {
      logAutoAnsweredCall(session, rule)
    }

    emit('autoAnswered', { session, rule })

  } catch (error) {
    console.error('Auto-answer failed:', error)
    emit('autoAnswerFailed', { session, rule, error })
  }
}

const applyAudioMode = async (
  session: IncomingSession,
  mode: AutoAnswerRule['audioMode']
) => {
  const pc = session.sessionDescriptionHandler?.peerConnection

  if (mode === 'muted') {
    // Mute microphone
    const senders = pc?.getSenders()
    senders?.forEach(sender => {
      if (sender.track?.kind === 'audio') {
        sender.track.enabled = false
      }
    })
  }

  // Route to appropriate output device
  if (mode === 'speaker' || mode === 'headset') {
    await routeAudioOutput(mode)
  }
}`,
    },
    {
      title: 'Auto Answer UI Component',
      description: 'Configure auto-answer rules visually',
      code: `<template>
  <div class="auto-answer-config">
    <!-- Global Toggle -->
    <div class="global-toggle">
      <label class="switch">
        <input type="checkbox" v-model="autoAnswerEnabled" />
        <span class="slider"></span>
      </label>
      <span>Auto-Answer {{ autoAnswerEnabled ? 'Enabled' : 'Disabled' }}</span>
    </div>

    <!-- Rule List -->
    <div class="rules-list">
      <div
        v-for="rule in sortedRules"
        :key="rule.id"
        class="rule-card"
        :class="{ disabled: !rule.enabled }"
      >
        <div class="rule-header">
          <div class="rule-info">
            <span class="rule-name">{{ rule.name }}</span>
            <span class="rule-priority">Priority: {{ rule.priority }}</span>
          </div>
          <div class="rule-actions">
            <button @click="editRule(rule)">Edit</button>
            <button @click="toggleRule(rule)">
              {{ rule.enabled ? 'Disable' : 'Enable' }}
            </button>
            <button @click="deleteRule(rule)" class="danger">Delete</button>
          </div>
        </div>

        <div class="rule-details">
          <div class="conditions">
            <span v-for="(cond, i) in rule.conditions" :key="i" class="condition-badge">
              {{ formatCondition(cond) }}
            </span>
          </div>
          <div class="settings">
            <span>Delay: {{ rule.delay }}ms</span>
            <span>Audio: {{ rule.audioMode }}</span>
            <span v-if="rule.videoEnabled">+ Video</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Rule -->
    <div class="add-rule">
      <button @click="showAddDialog = true">+ Add Rule</button>
      <div class="templates">
        <button
          v-for="(template, key) in ruleTemplates"
          :key="key"
          @click="addFromTemplate(key)"
        >
          Quick: {{ template.name }}
        </button>
      </div>
    </div>

    <!-- Recent Auto-Answered Calls -->
    <div class="recent-calls" v-if="recentAutoAnswered.length > 0">
      <h4>Recently Auto-Answered</h4>
      <div v-for="call in recentAutoAnswered" :key="call.id" class="call-entry">
        <span>{{ call.callerName }} - {{ call.ruleName }}</span>
        <span>{{ formatTime(call.timestamp) }}</span>
      </div>
    </div>
  </div>
</template>`,
    },
    {
      title: 'Audio Beep Notification',
      description: 'Play notification sound on auto-answer',
      code: `class AutoAnswerNotification {
  private audioContext: AudioContext | null = null

  async playAnswerBeep() {
    this.audioContext = new AudioContext()

    // Two-tone beep indicating auto-answer
    await this.playTone(880, 0.1)  // High tone
    await this.delay(50)
    await this.playTone(660, 0.15) // Lower tone

    this.audioContext.close()
  }

  private playTone(frequency: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audioContext) return resolve()

      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      // Smooth envelope
      const now = this.audioContext.currentTime
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, now + duration)

      oscillator.start(now)
      oscillator.stop(now + duration)
      oscillator.onended = () => resolve()
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

const notification = new AutoAnswerNotification()

// Play beep when auto-answering
const onAutoAnswer = (session: IncomingSession, rule: AutoAnswerRule) => {
  if (rule.notification) {
    notification.playAnswerBeep()
  }
}`,
    },
    {
      title: 'Auto Answer Statistics',
      description: 'Track auto-answer usage and effectiveness',
      code: `interface AutoAnswerStats {
  totalAutoAnswered: number
  byRule: Map<string, number>
  averageDelay: number
  failedAttempts: number
  lastAutoAnswer: Date | null
  todayCount: number
}

const stats = ref<AutoAnswerStats>({
  totalAutoAnswered: 0,
  byRule: new Map(),
  averageDelay: 0,
  failedAttempts: 0,
  lastAutoAnswer: null,
  todayCount: 0
})

const delays: number[] = []

const trackAutoAnswer = (rule: AutoAnswerRule, success: boolean) => {
  if (success) {
    stats.value.totalAutoAnswered++
    stats.value.todayCount++
    stats.value.lastAutoAnswer = new Date()

    // Track by rule
    const count = stats.value.byRule.get(rule.id) || 0
    stats.value.byRule.set(rule.id, count + 1)

    // Track delay
    delays.push(rule.delay)
    stats.value.averageDelay = delays.reduce((a, b) => a + b, 0) / delays.length
  } else {
    stats.value.failedAttempts++
  }
}

// Reset daily count at midnight
const resetDailyStats = () => {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)

  const timeUntilMidnight = midnight.getTime() - now.getTime()

  setTimeout(() => {
    stats.value.todayCount = 0
    resetDailyStats() // Schedule next reset
  }, timeUntilMidnight)
}

onMounted(() => {
  resetDailyStats()
})

// Most used rules
const topRules = computed(() => {
  return Array.from(stats.value.byRule.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ruleId, count]) => ({
      rule: rules.value.find(r => r.id === ruleId),
      count
    }))
})`,
    },
  ],
}
