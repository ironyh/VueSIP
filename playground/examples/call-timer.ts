import type { ExampleDefinition } from './types'
import CallTimerDemo from '../demos/CallTimerDemo.vue'

export const callTimerExample: ExampleDefinition = {
  id: 'call-timer',
  icon: '⏱️',
  title: 'Call Timer',
  description: 'Display call duration in various formats',
  category: 'sip',
  tags: ['UI', 'Formatting', 'Simple'],
  component: CallTimerDemo,
  setupGuide: '<p>Learn how to display call duration in different formats. Shows MM:SS, HH:MM:SS, human-readable, and compact formats.</p>',
  codeSnippets: [
    {
      title: 'Duration Formatting',
      description: 'Format call duration in different styles',
      code: `import { useCallSession } from 'vuesip'

const { duration } = useCallSession(sipClient)

// Format as MM:SS
const formatMMSS = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return \`\${mins}:\${secs.toString().padStart(2, '0')}\`
}

// Format as HH:MM:SS
const formatHHMMSS = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return \`\${hours}:\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`
}

// Human readable
const formatHuman = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (hours > 0) parts.push(\`\${hours}h\`)
  if (mins > 0) parts.push(\`\${mins}m\`)
  if (secs > 0) parts.push(\`\${secs}s\`)
  return parts.join(' ')
}`,
    },
    {
      title: 'Reactive Timer Component',
      description: 'Auto-updating timer display',
      code: `<template>
  <div class="call-timer" :class="timerClass">
    <span class="duration">{{ formattedDuration }}</span>
    <span v-if="showLabel" class="label">{{ timerLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCallSession } from 'vuesip'

const props = defineProps<{
  format?: 'compact' | 'full' | 'human'
  showLabel?: boolean
  warningThreshold?: number  // seconds
}>()

const { duration, callState, isOnHold } = useCallSession()

const formattedDuration = computed(() => {
  const secs = duration.value
  switch (props.format) {
    case 'compact':
      return formatMMSS(secs)
    case 'human':
      return formatHuman(secs)
    default:
      return secs >= 3600 ? formatHHMMSS(secs) : formatMMSS(secs)
  }
})

const timerLabel = computed(() => {
  if (isOnHold.value) return 'On Hold'
  if (callState.value === 'ringing') return 'Ringing...'
  return 'Duration'
})

const timerClass = computed(() => ({
  'on-hold': isOnHold.value,
  'warning': props.warningThreshold && duration.value > props.warningThreshold,
}))
</script>`,
    },
    {
      title: 'Call Duration Tracking',
      description: 'Track and analyze call durations',
      code: `import { ref, watch, onUnmounted } from 'vue'

interface CallDurationRecord {
  callId: string
  remoteUri: string
  startTime: Date
  endTime?: Date
  duration: number
  holdTime: number
}

const callRecords = ref<CallDurationRecord[]>([])
const currentRecord = ref<CallDurationRecord | null>(null)

// Start tracking when call connects
watch(callState, (state, prevState) => {
  if (state === 'answered' && prevState !== 'answered') {
    currentRecord.value = {
      callId: activeCallId.value,
      remoteUri: remoteUri.value,
      startTime: new Date(),
      duration: 0,
      holdTime: 0,
    }
  }

  if (state === 'ended' && currentRecord.value) {
    currentRecord.value.endTime = new Date()
    currentRecord.value.duration = duration.value
    callRecords.value.push({ ...currentRecord.value })
    currentRecord.value = null
  }
})

// Calculate statistics
const statistics = computed(() => {
  const records = callRecords.value
  if (records.length === 0) return null

  const totalDuration = records.reduce((sum, r) => sum + r.duration, 0)
  const avgDuration = totalDuration / records.length
  const maxDuration = Math.max(...records.map(r => r.duration))

  return {
    totalCalls: records.length,
    totalDuration: formatHuman(totalDuration),
    averageDuration: formatHuman(Math.round(avgDuration)),
    longestCall: formatHuman(maxDuration),
  }
})`,
    },
    {
      title: 'Timer with Billing Increments',
      description: 'Display cost based on call duration',
      code: `interface BillingConfig {
  ratePerMinute: number      // Cost per minute
  minimumCharge: number      // Minimum call charge
  billingIncrement: number   // Round up to nearest X seconds
  currency: string
}

const billingConfig: BillingConfig = {
  ratePerMinute: 0.05,
  minimumCharge: 0.10,
  billingIncrement: 6,  // 6-second billing
  currency: 'USD',
}

const calculateCost = (seconds: number, config: BillingConfig) => {
  if (seconds === 0) return 0

  // Round up to billing increment
  const billedSeconds = Math.ceil(seconds / config.billingIncrement)
    * config.billingIncrement

  const minutes = billedSeconds / 60
  const cost = minutes * config.ratePerMinute

  return Math.max(cost, config.minimumCharge)
}

const currentCost = computed(() => {
  const cost = calculateCost(duration.value, billingConfig)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: billingConfig.currency,
  }).format(cost)
})

// Display: "02:34 ($0.15)"`,
    },
    {
      title: 'Hold Time Tracking',
      description: 'Separately track active and hold time',
      code: `import { ref, watch, computed } from 'vue'

const activeTime = ref(0)
const holdTime = ref(0)
const lastStateChange = ref<Date | null>(null)

watch([callState, isOnHold], ([state, onHold], [prevState, wasOnHold]) => {
  const now = new Date()

  if (lastStateChange.value) {
    const elapsed = Math.floor((now.getTime() - lastStateChange.value.getTime()) / 1000)

    if (wasOnHold) {
      holdTime.value += elapsed
    } else if (prevState === 'answered') {
      activeTime.value += elapsed
    }
  }

  lastStateChange.value = now
})

const timeBreakdown = computed(() => ({
  total: formatHuman(duration.value),
  active: formatHuman(activeTime.value),
  hold: formatHuman(holdTime.value),
  holdPercentage: duration.value > 0
    ? Math.round((holdTime.value / duration.value) * 100)
    : 0,
}))

// Display:
// Total: 5m 30s
// Active: 4m 15s
// On Hold: 1m 15s (23%)`,
    },
    {
      title: 'Countdown Timer',
      description: 'Set time limits with warnings',
      code: `import { ref, computed, watch } from 'vue'

const timeLimit = ref(300) // 5 minutes in seconds
const warningTime = ref(60) // Warn at 1 minute remaining

const remaining = computed(() => timeLimit.value - duration.value)
const isOverLimit = computed(() => remaining.value <= 0)
const isWarning = computed(() =>
  remaining.value > 0 && remaining.value <= warningTime.value
)

const remainingFormatted = computed(() => {
  const secs = Math.abs(remaining.value)
  const formatted = formatMMSS(secs)
  return remaining.value < 0 ? \`-\${formatted}\` : formatted
})

// Audio warning when approaching limit
watch(remaining, (value, prevValue) => {
  if (prevValue > warningTime.value && value <= warningTime.value) {
    playWarningSound()
  }
  if (prevValue > 0 && value <= 0) {
    playLimitSound()
  }
})

// Style based on state
const timerStyle = computed(() => ({
  color: isOverLimit.value
    ? 'red'
    : isWarning.value
      ? 'orange'
      : 'inherit',
  fontWeight: isWarning.value || isOverLimit.value ? 'bold' : 'normal',
}))`,
    },
  ],
}
