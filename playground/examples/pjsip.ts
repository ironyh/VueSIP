import type { ExampleDefinition } from './types'
import PjsipDemo from '../demos/PjsipDemo.vue'

export const pjsipExample: ExampleDefinition = {
  id: 'pjsip',
  icon: '📡',
  title: 'PJSIP Endpoints',
  description: 'Manage PJSIP endpoints and registrations via AMI',
  tags: ['PJSIP', 'AMI', 'Endpoints', 'Registration'],
  component: PjsipDemo,
  setupGuide: `<p>Manage PJSIP endpoints and track registration status via AMI. Monitor endpoint health, check registration status, and qualify endpoints.</p>
<h4>Requirements</h4>
<ul>
  <li>Asterisk PBX with PJSIP configured</li>
  <li>AMI WebSocket connection</li>
  <li>AMI user with PJSIP permissions</li>
</ul>`,
  codeSnippets: [
    {
      title: 'Basic Setup',
      description: 'Initialize PJSIP endpoint management',
      code: `import { useAmi, useAmiPjsip } from 'vuesip'
import { computed } from 'vue'

// Connect to AMI
const ami = useAmi()
await ami.connect('ws://pbx:8089/ws')

// Initialize PJSIP composable
const {
  endpointList,
  registrationList,
  isLoading,
  registeredCount,
  onlineCount,
  refresh,
  qualifyEndpoint,
} = useAmiPjsip(computed(() => ami.getClient()))

// Refresh endpoint data
await refresh()
console.log('Endpoints:', endpointList.value)`,
    },
    {
      title: 'Monitor Endpoints',
      description: 'Track endpoint status and registrations',
      code: `// Get endpoint details
const endpoint = getEndpoint('1001')
if (endpoint) {
  console.log('State:', endpoint.state)
  console.log('Transport:', endpoint.transport)
  console.log('Active channels:', endpoint.activeChannels)
}

// Find registered endpoints
const registered = endpointList.value.filter(
  e => e.state === 'Reachable' || e.state === 'Online'
)

// Use computed properties
console.log(\`\${registeredCount.value} of \${endpointList.value.length} registered\`)
console.log(\`\${onlineCount.value} endpoints online\`)`,
    },
    {
      title: 'Qualify Endpoints',
      description: 'Test endpoint connectivity',
      code: `// Qualify a single endpoint
const result = await qualifyEndpoint('1001')
console.log('Qualify result:', result)

// Qualify all endpoints
for (const endpoint of endpointList.value) {
  await qualifyEndpoint(endpoint.endpoint)
}

// Refresh to get updated status
await refresh()`,
    },
    {
      title: 'Real-Time Events',
      description: 'Handle registration and state change events',
      code: `const { endpointList, registrationList } = useAmiPjsip(
  computed(() => ami.getClient()),
  {
    // Auto-refresh on connect
    autoRefresh: true,

    // Handle real-time events
    onEndpointStateChange: (endpoint, state) => {
      console.log(\`\${endpoint} is now \${state}\`)
    },
    onRegistrationChange: (endpoint, status) => {
      console.log(\`\${endpoint} registration: \${status}\`)
    },

    // Filter endpoints
    endpointFilter: (ep) => ep.endpoint.startsWith('10'),
  }
)`,
    },
  ],
}
