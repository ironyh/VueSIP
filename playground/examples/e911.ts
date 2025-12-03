import type { ExampleDefinition } from './types'
import E911Demo from '../demos/E911Demo.vue'

export const e911Example: ExampleDefinition = {
  id: 'e911',
  icon: '🆘',
  title: 'E911 Emergency',
  description: 'Enhanced 911 emergency call handling with location',
  tags: ['Emergency', 'Safety', 'Compliance'],
  component: E911Demo,
  setupGuide: '<p>Configure E911 emergency call handling with automatic location transmission. Ensure compliance with emergency services requirements.</p>',
  codeSnippets: [
    {
      title: 'Configure E911',
      description: 'Set up emergency call handling',
      code: `import { useE911 } from 'vuesip'

const e911 = useE911(sipClientRef, {
  locationId: 'LOC-001',
  onEmergencyCall: (session, location) => {
    console.log('EMERGENCY CALL INITIATED')
    console.log('Location:', location.address)
    console.log('Callback:', location.callbackNumber)
  },
  onCallbackReceived: (session) => {
    console.log('Emergency callback received')
  },
})

// Set user location for E911
await e911.setLocation({
  address: '123 Main Street',
  city: 'Springfield',
  state: 'IL',
  zip: '62701',
  floor: '3',
  room: '301',
  callbackNumber: '+15551234567',
})`,
    },
    {
      title: 'Emergency Call Flow',
      description: 'Handle emergency call procedures',
      code: `// Initiate emergency call (use only for testing!)
// await e911.dialEmergency('911')

// Check E911 configuration status
const status = e911.configurationStatus.value
console.log('E911 configured:', status.isConfigured)
console.log('Location valid:', status.locationValid)
console.log('Last verified:', status.lastVerified)

// Verify location with provider
const verification = await e911.verifyLocation()
if (verification.success) {
  console.log('Location verified successfully')
} else {
  console.log('Verification failed:', verification.error)
}

// Get emergency call history
const history = e911.callHistory.value
history.forEach(call => {
  console.log('Emergency call:', call.timestamp)
  console.log('Duration:', call.duration)
})`,
    },
  ],
}
