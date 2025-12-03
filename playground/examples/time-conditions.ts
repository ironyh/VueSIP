import type { ExampleDefinition } from './types'
import TimeConditionsDemo from '../demos/TimeConditionsDemo.vue'

export const timeConditionsExample: ExampleDefinition = {
  id: 'time-conditions',
  icon: '🕐',
  title: 'Time Conditions',
  description: 'Route calls based on time of day and business hours',
  tags: ['PBX', 'Routing', 'Schedule'],
  component: TimeConditionsDemo,
  setupGuide: '<p>Configure time-based call routing rules. Define business hours, holidays, and special schedules for automatic call handling.</p>',
  codeSnippets: [
    {
      title: 'Configure Time Conditions',
      description: 'Set up time-based routing rules',
      code: `import { useTimeConditions } from 'vuesip'

const timeConditions = useTimeConditions(amiClientRef, {
  onConditionMatch: (condition, destination) => {
    console.log('Matched:', condition.name, '->', destination)
  },
})

// Create a business hours condition
await timeConditions.createCondition({
  name: 'Business Hours',
  schedule: {
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    wednesday: { start: '09:00', end: '17:00' },
    thursday: { start: '09:00', end: '17:00' },
    friday: { start: '09:00', end: '17:00' },
  },
  matchDestination: 'queue-sales',
  noMatchDestination: 'voicemail-main',
})`,
    },
    {
      title: 'Check Current Conditions',
      description: 'Query active time conditions',
      code: `// Check if currently in business hours
const isOpen = timeConditions.isInBusinessHours.value
console.log('Business open:', isOpen)

// Get active condition
const active = timeConditions.activeCondition.value
if (active) {
  console.log('Active condition:', active.name)
}

// List all conditions
const conditions = timeConditions.conditions.value
conditions.forEach(c => {
  console.log('Condition:', c.name, 'Active:', c.isActive)
})`,
    },
  ],
}
