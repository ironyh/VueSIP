import type { ExampleDefinition } from './types'
import RingGroupsDemo from '../demos/RingGroupsDemo.vue'

export const ringGroupsExample: ExampleDefinition = {
  id: 'ring-groups',
  icon: '🔔',
  title: 'Ring Groups',
  description: 'Manage ring group membership and call distribution',
  tags: ['PBX', 'Groups', 'Distribution'],
  component: RingGroupsDemo,
  setupGuide: '<p>Configure ring groups for call distribution. Set up simultaneous or sequential ringing patterns for team collaboration.</p>',
  codeSnippets: [
    {
      title: 'Ring Group Configuration',
      description: 'Set up and manage ring groups',
      code: `import { useRingGroups } from 'vuesip'

const ringGroups = useRingGroups(amiClientRef, {
  onGroupCall: (group, caller) => {
    console.log('Incoming call to', group.name, 'from:', caller)
  },
  onCallAnswered: (group, agent) => {
    console.log('Call answered by:', agent)
  },
})

// Create a ring group
await ringGroups.createGroup({
  name: 'Sales Team',
  extension: '600',
  strategy: 'ringall', // ringall, hunt, memoryhunt, random
  ringTime: 20,
  members: ['PJSIP/1001', 'PJSIP/1002', 'PJSIP/1003'],
})

// Add member to group
await ringGroups.addMember('Sales Team', 'PJSIP/1004')`,
    },
    {
      title: 'Monitor Ring Groups',
      description: 'Track ring group activity',
      code: `// List all ring groups
const groups = ringGroups.groups.value
groups.forEach(group => {
  console.log('Group:', group.name)
  console.log('Members:', group.members.length)
  console.log('Strategy:', group.strategy)
})

// Get group statistics
const stats = await ringGroups.getStats('Sales Team')
console.log('Calls received:', stats.callsReceived)
console.log('Calls answered:', stats.callsAnswered)
console.log('Average wait time:', stats.avgWaitTime)

// Check member availability
const available = ringGroups.getAvailableMembers('Sales Team')
console.log('Available members:', available.length)`,
    },
  ],
}
