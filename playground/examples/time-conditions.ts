import type { ExampleDefinition } from './types'
import TimeConditionsDemo from '../demos/TimeConditionsDemo.vue'

export const timeConditionsExample: ExampleDefinition = {
  id: 'time-conditions',
  icon: '🕐',
  title: 'Time Conditions',
  description: 'Route calls based on time of day and business hours',
  category: 'ami',
  tags: ['PBX', 'Routing', 'Schedule'],
  component: TimeConditionsDemo,
  setupGuide: `<p>Configure time-based call routing rules. Define business hours, holidays, and special schedules for automatic call handling via the unified AmiService.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy (amiws) on your Asterisk server</li>
  <li>Connect to AMI using the unified AmiService</li>
  <li>Use the time conditions composable for schedule management</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize AMI & Time Conditions',
      description: 'Connect to AMI and access time conditions',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI WebSocket proxy
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'admin',
  password: 'secret',
})

// Get the time conditions composable via unified service
const timeConditions = amiService.useTimeConditions({
  onConditionMatch: (condition, destination) => {
    console.log('Matched:', condition.name, '->', destination)
  },
  onConditionChange: (condition) => {
    console.log('Condition changed:', condition.name)
  },
})

// Check connection
console.log('AMI Connected:', amiService.isConnected.value)`,
    },
    {
      title: 'Configure Time Conditions',
      description: 'Set up time-based routing rules',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const timeConditions = amiService.useTimeConditions()

// Create a business hours condition
await timeConditions.createCondition({
  name: 'Business Hours',
  priority: 1,
  schedule: {
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    wednesday: { start: '09:00', end: '17:00' },
    thursday: { start: '09:00', end: '17:00' },
    friday: { start: '09:00', end: '17:00' },
  },
  matchDestination: 'queue-sales',
  noMatchDestination: 'voicemail-main',
  timezone: 'America/New_York',
})

// Create extended hours condition
await timeConditions.createCondition({
  name: 'Extended Support',
  priority: 2,
  schedule: {
    monday: { start: '08:00', end: '20:00' },
    tuesday: { start: '08:00', end: '20:00' },
    wednesday: { start: '08:00', end: '20:00' },
    thursday: { start: '08:00', end: '20:00' },
    friday: { start: '08:00', end: '18:00' },
    saturday: { start: '10:00', end: '14:00' },
  },
  matchDestination: 'queue-support',
  noMatchDestination: 'voicemail-support',
})`,
    },
    {
      title: 'Check Current Conditions',
      description: 'Query active time conditions',
      code: `import { getAmiService } from '@/services/AmiService'
import { computed } from 'vue'

const amiService = getAmiService()
const timeConditions = amiService.useTimeConditions()

// Check if currently in business hours
const isOpen = timeConditions.isInBusinessHours.value
console.log('Business open:', isOpen)

// Get active condition
const active = timeConditions.activeCondition.value
if (active) {
  console.log('Active condition:', active.name)
  console.log('Current destination:', active.matchDestination)
}

// List all conditions
const conditions = timeConditions.conditions.value
conditions.forEach(c => {
  console.log('Condition:', c.name)
  console.log('  Priority:', c.priority)
  console.log('  Active:', c.enabled)
})

// Get effective destination for current time
const destination = timeConditions.getEffectiveDestination()
console.log('Calls will route to:', destination)`,
    },
    {
      title: 'Time Condition Data Model',
      description: 'Complete data structures for time-based routing',
      code: `interface TimeRange {
  start: string  // "09:00"
  end: string    // "17:00"
}

interface WeeklySchedule {
  sunday?: TimeRange
  monday?: TimeRange
  tuesday?: TimeRange
  wednesday?: TimeRange
  thursday?: TimeRange
  friday?: TimeRange
  saturday?: TimeRange
}

interface Holiday {
  id: string
  name: string
  date: string  // "2024-12-25" or "12-25" for recurring
  recurring: boolean  // Same date every year
  destination: string
}

interface TimeCondition {
  id: string
  name: string
  priority: number
  enabled: boolean
  schedule: WeeklySchedule
  holidays: Holiday[]
  exceptions: DateException[]
  matchDestination: string
  noMatchDestination: string
  timezone: string
  createdAt: Date
  updatedAt: Date
}

interface DateException {
  id: string
  name: string
  startDate: string
  endDate: string
  schedule?: WeeklySchedule  // Override schedule
  destination: string
}

const conditions = ref<TimeCondition[]>([])
const holidays = ref<Holiday[]>([])`,
    },
    {
      title: 'Holiday Management',
      description: 'Configure holiday schedules',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const timeConditions = amiService.useTimeConditions()

// Add common holidays
const defaultHolidays = [
  { name: 'New Year', date: '01-01', recurring: true, destination: 'holiday-greeting' },
  { name: 'Christmas', date: '12-25', recurring: true, destination: 'holiday-greeting' },
  { name: 'Independence Day', date: '07-04', recurring: true, destination: 'holiday-greeting' },
  { name: 'Thanksgiving 2024', date: '2024-11-28', recurring: false, destination: 'holiday-greeting' },
]

// Add holidays to the system
for (const holiday of defaultHolidays) {
  await timeConditions.addHoliday(holiday)
}

// Check if today is a holiday
const todayHoliday = timeConditions.isHoliday()
if (todayHoliday) {
  console.log('Today is:', todayHoliday.name)
}

// Get upcoming holidays
const upcoming = timeConditions.getUpcomingHolidays(5)
upcoming.forEach(h => {
  console.log('Upcoming:', h.name, '-', h.date)
})

// Remove a holiday
await timeConditions.removeHoliday('holiday-id')`,
    },
    {
      title: 'Time Condition Evaluation',
      description: 'Check if current time matches conditions',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const timeConditions = amiService.useTimeConditions()

// Evaluate conditions for a specific time
const evaluateForTime = (date: Date = new Date()) => {
  // Check for holiday first
  const holiday = timeConditions.isHoliday(date)
  if (holiday) {
    return { type: 'holiday', destination: holiday.destination }
  }

  // Check conditions by priority
  const conditions = timeConditions.conditions.value
    .filter(c => c.enabled)
    .sort((a, b) => a.priority - b.priority)

  for (const condition of conditions) {
    if (timeConditions.isWithinSchedule(condition, date)) {
      return { type: 'match', condition, destination: condition.matchDestination }
    }
  }

  // No match - return default destination
  const defaultCondition = conditions[0]
  return {
    type: 'no-match',
    condition: defaultCondition,
    destination: defaultCondition?.noMatchDestination || 'voicemail'
  }
}

// Test for different times
const testTimes = [
  new Date('2024-12-16T10:00:00'),  // Monday 10am
  new Date('2024-12-16T20:00:00'),  // Monday 8pm
  new Date('2024-12-25T10:00:00'),  // Christmas
]

testTimes.forEach(time => {
  const result = evaluateForTime(time)
  console.log(\`\${time.toLocaleString()}: \${result.destination}\`)
})`,
    },
    {
      title: 'Schedule Override',
      description: 'Temporarily override time conditions',
      code: `import { getAmiService } from '@/services/AmiService'
import { ref, computed } from 'vue'

const amiService = getAmiService()
const timeConditions = amiService.useTimeConditions()

interface ScheduleOverride {
  id: string
  type: 'force-open' | 'force-closed' | 'custom'
  destination?: string
  reason: string
  createdBy: string
  createdAt: Date
  expiresAt: Date | null  // null = indefinite
}

const activeOverride = ref<ScheduleOverride | null>(null)

// Set override - force business open
const forceOpen = (reason: string, durationMinutes?: number) => {
  activeOverride.value = {
    id: \`override-\${Date.now()}\`,
    type: 'force-open',
    reason,
    createdBy: currentUser.value.name,
    createdAt: new Date(),
    expiresAt: durationMinutes
      ? new Date(Date.now() + durationMinutes * 60000)
      : null
  }
}

// Set override - force closed
const forceClosed = (reason: string, destination?: string) => {
  activeOverride.value = {
    id: \`override-\${Date.now()}\`,
    type: 'force-closed',
    destination,
    reason,
    createdBy: currentUser.value.name,
    createdAt: new Date(),
    expiresAt: null
  }
}

// Clear override
const clearOverride = () => {
  activeOverride.value = null
}

// Get effective destination with override
const effectiveDestination = computed(() => {
  if (activeOverride.value) {
    switch (activeOverride.value.type) {
      case 'force-open':
        return timeConditions.conditions.value[0]?.matchDestination || 'queue'
      case 'force-closed':
        return activeOverride.value.destination || 'voicemail'
    }
  }
  return timeConditions.getEffectiveDestination()
})`,
    },
    {
      title: 'Time Conditions UI',
      description: 'Visual schedule configuration',
      code: `<template>
  <div class="time-conditions">
    <!-- Current Status -->
    <div class="status-banner" :class="statusClass">
      <span class="status-icon">{{ isOpen ? '🟢' : '🔴' }}</span>
      <span class="status-text">{{ statusText }}</span>
      <span v-if="nextChange" class="next-change">
        {{ nextChangeText }}
      </span>
    </div>

    <!-- Override Controls -->
    <div v-if="canOverride" class="override-controls">
      <div v-if="activeOverride" class="active-override">
        <span>⚠️ Override Active: {{ activeOverride.reason }}</span>
        <button @click="clearOverride">Clear Override</button>
      </div>
      <div v-else class="override-buttons">
        <button @click="forceOpen('Manual open')">Force Open</button>
        <button @click="forceClosed('Emergency close')">Force Closed</button>
      </div>
    </div>

    <!-- Weekly Schedule Grid -->
    <div class="schedule-grid">
      <div
        v-for="day in weekDays"
        :key="day.name"
        class="day-row"
        :class="{ today: day.isToday }"
      >
        <span class="day-name">{{ day.label }}</span>
        <div class="time-range">
          <input
            type="time"
            v-model="schedule[day.name].start"
            :disabled="!schedule[day.name].enabled"
          />
          <span>to</span>
          <input
            type="time"
            v-model="schedule[day.name].end"
            :disabled="!schedule[day.name].enabled"
          />
        </div>
        <label class="toggle">
          <input type="checkbox" v-model="schedule[day.name].enabled" />
          <span>{{ schedule[day.name].enabled ? 'Open' : 'Closed' }}</span>
        </label>
      </div>
    </div>

    <!-- Holidays List -->
    <div class="holidays-section">
      <h4>Holidays</h4>
      <div v-for="holiday in holidays" :key="holiday.id" class="holiday-item">
        <span>{{ holiday.name }} - {{ formatDate(holiday.date) }}</span>
        <button @click="removeHoliday(holiday.id)">Remove</button>
      </div>
      <button @click="showAddHoliday = true">+ Add Holiday</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const timeConditions = amiService.useTimeConditions()

const isOpen = computed(() => timeConditions.isInBusinessHours.value)
const statusClass = computed(() => isOpen.value ? 'open' : 'closed')
const statusText = computed(() => isOpen.value ? 'Currently Open' : 'Currently Closed')
</script>`,
    },
    {
      title: 'Timezone Support',
      description: 'Handle multiple timezones for distributed teams',
      code: `import { getAmiService } from '@/services/AmiService'
import { ref, computed } from 'vue'

const amiService = getAmiService()
const timeConditions = amiService.useTimeConditions()

const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
const businessTimezone = ref('America/New_York')

const getTimeInTimezone = (timezone: string): Date => {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }

  const formatter = new Intl.DateTimeFormat('en-CA', options)
  const parts = formatter.formatToParts(now)

  const getPart = (type: string) =>
    parts.find(p => p.type === type)?.value || '0'

  return new Date(
    parseInt(getPart('year')),
    parseInt(getPart('month')) - 1,
    parseInt(getPart('day')),
    parseInt(getPart('hour')),
    parseInt(getPart('minute')),
    parseInt(getPart('second'))
  )
}

const businessTime = computed(() => getTimeInTimezone(businessTimezone.value))

const timezoneOffset = computed(() => {
  const local = new Date()
  const business = getTimeInTimezone(businessTimezone.value)
  const diffMs = local.getTime() - business.getTime()
  return Math.round(diffMs / (1000 * 60 * 60))
})

// Display helper
const formatBusinessTime = computed(() => {
  return businessTime.value.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })
})`,
    },
  ],
}
