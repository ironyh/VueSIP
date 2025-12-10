import type { ExampleDefinition } from './types'
import RingGroupsDemo from '../demos/RingGroupsDemo.vue'

export const ringGroupsExample: ExampleDefinition = {
  id: 'ring-groups',
  icon: '🔔',
  title: 'Ring Groups',
  description: 'Manage ring group membership and call distribution',
  category: 'ami',
  tags: ['PBX', 'Groups', 'Distribution'],
  component: RingGroupsDemo,
  setupGuide: `<p>Configure ring groups for call distribution. Set up simultaneous or sequential ringing patterns for team collaboration via the unified AmiService.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy (amiws) on your Asterisk server</li>
  <li>Connect to AMI using the unified AmiService</li>
  <li>Use the ring groups composable for group management</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize AMI & Ring Groups',
      description: 'Connect to AMI and access ring groups',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI WebSocket proxy
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'admin',
  password: 'secret',
})

// Get the ring groups composable via unified service
const ringGroups = amiService.useRingGroups({
  onGroupCall: (group, caller) => {
    console.log('Incoming call to', group.name, 'from:', caller)
  },
  onCallAnswered: (group, agent) => {
    console.log('Call answered by:', agent)
  },
  onCallMissed: (group, caller) => {
    console.log('Call missed in group:', group.name)
  },
})

// Check connection
console.log('AMI Connected:', amiService.isConnected.value)`,
    },
    {
      title: 'Ring Group Configuration',
      description: 'Set up and manage ring groups',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const ringGroups = amiService.useRingGroups()

// Create a ring group
await ringGroups.createGroup({
  name: 'Sales Team',
  extension: '600',
  strategy: 'ringall', // ringall, hunt, memoryhunt, random, roundrobin
  ringTime: 20,
  members: ['PJSIP/1001', 'PJSIP/1002', 'PJSIP/1003'],
  musicOnHold: 'default',
  announcement: '/sounds/sales-greeting.wav',
  failoverDestination: 'voicemail-sales',
})

// Create hunt group (sequential ringing)
await ringGroups.createGroup({
  name: 'Support Escalation',
  extension: '601',
  strategy: 'hunt',
  ringTime: 15,
  members: ['PJSIP/2001', 'PJSIP/2002', 'PJSIP/2003'],
  skipBusyMembers: true,
})

// Add member to group
await ringGroups.addMember('Sales Team', 'PJSIP/1004')

// Remove member from group
await ringGroups.removeMember('Sales Team', 'PJSIP/1001')

// Update group settings
await ringGroups.updateGroup('Sales Team', {
  ringTime: 25,
  strategy: 'roundrobin',
})`,
    },
    {
      title: 'Monitor Ring Groups',
      description: 'Track ring group activity',
      code: `import { getAmiService } from '@/services/AmiService'
import { computed, watch } from 'vue'

const amiService = getAmiService()
const ringGroups = amiService.useRingGroups()

// List all ring groups
const groups = ringGroups.groups.value
groups.forEach(group => {
  console.log('Group:', group.name, '(ext:', group.extension + ')')
  console.log('  Strategy:', group.strategy)
  console.log('  Members:', group.members.length)
  console.log('  Active calls:', group.activeCallCount)
})

// Get group statistics
const stats = await ringGroups.getStats('Sales Team')
console.log('Calls received:', stats.callsReceived)
console.log('Calls answered:', stats.callsAnswered)
console.log('Calls missed:', stats.callsMissed)
console.log('Answer rate:', stats.answerRate + '%')
console.log('Average wait time:', stats.avgWaitTime, 'seconds')
console.log('Average talk time:', stats.avgTalkTime, 'seconds')

// Check member availability
const available = ringGroups.getAvailableMembers('Sales Team')
console.log('Available members:', available.length)
console.log('Members:', available.map(m => m.extension).join(', '))

// Watch for group activity
watch(ringGroups.activeCallsCount, (count) => {
  console.log('Total active ring group calls:', count)
})`,
    },
    {
      title: 'Ring Group Data Model',
      description: 'Data structures for ring groups',
      code: `interface RingGroup {
  id: string
  name: string
  extension: string
  description?: string
  strategy: RingStrategy
  ringTime: number
  members: RingGroupMember[]
  musicOnHold?: string
  announcement?: string
  confirmCall: boolean
  confirmKey?: string
  skipBusyMembers: boolean
  skipUnavailable: boolean
  wrapupTime: number
  failoverDestination: string
  enabled: boolean
  activeCallCount: number
  createdAt: Date
  updatedAt: Date
}

type RingStrategy =
  | 'ringall'      // Ring all members simultaneously
  | 'hunt'         // Ring members in order
  | 'memoryhunt'   // Hunt, starting from last answered member
  | 'random'       // Random selection
  | 'roundrobin'   // Rotate through members
  | 'linear'       // Always start from first member

interface RingGroupMember {
  id: string
  device: string     // e.g., 'PJSIP/1001'
  extension: string
  name: string
  priority: number
  penalty: number
  state: 'available' | 'busy' | 'unavailable' | 'paused'
  callsTaken: number
  lastCallTime?: Date
  pausedReason?: string
}

interface RingGroupStats {
  groupId: string
  period: 'day' | 'week' | 'month'
  callsReceived: number
  callsAnswered: number
  callsMissed: number
  callsAbandoned: number
  answerRate: number
  avgWaitTime: number
  avgTalkTime: number
  avgRingTime: number
  memberStats: MemberStats[]
}`,
    },
    {
      title: 'Ring Strategy Selection',
      description: 'Choose the right ringing strategy',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const ringGroups = amiService.useRingGroups()

// Ring strategies explained
const strategies = {
  ringall: {
    name: 'Ring All',
    description: 'All members ring simultaneously',
    bestFor: 'Small teams, quick response needed',
    pros: ['Fastest answer time', 'Simple setup'],
    cons: ['Can be disruptive', 'No load balancing'],
  },
  hunt: {
    name: 'Hunt (Sequential)',
    description: 'Ring members in order until answered',
    bestFor: 'Prioritized response, primary/backup agents',
    pros: ['Clear escalation path', 'Respects priorities'],
    cons: ['First member gets most calls', 'Longer wait times'],
  },
  memoryhunt: {
    name: 'Memory Hunt',
    description: 'Sequential, starting from last answerer',
    bestFor: 'Better distribution than hunt',
    pros: ['More balanced than hunt', 'Maintains some priority'],
    cons: ['Still somewhat uneven distribution'],
  },
  roundrobin: {
    name: 'Round Robin',
    description: 'Rotate through members evenly',
    bestFor: 'Even workload distribution',
    pros: ['Fair distribution', 'Good for metrics'],
    cons: ['May ring unavailable members'],
  },
  random: {
    name: 'Random',
    description: 'Random member selection',
    bestFor: 'Large groups with similar skills',
    pros: ['Unpredictable distribution', 'No gaming possible'],
    cons: ['No prioritization', 'Less control'],
  },
}

// Select strategy based on group characteristics
const selectOptimalStrategy = (group: {
  size: number
  needsPriority: boolean
  evenDistribution: boolean
}): RingStrategy => {
  if (group.size <= 3) {
    return 'ringall'
  }
  if (group.needsPriority) {
    return group.evenDistribution ? 'memoryhunt' : 'hunt'
  }
  return group.evenDistribution ? 'roundrobin' : 'random'
}`,
    },
    {
      title: 'Member Management',
      description: 'Manage ring group membership dynamically',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const ringGroups = amiService.useRingGroups()

// Add member with options
await ringGroups.addMember('Sales Team', 'PJSIP/1005', {
  priority: 1,      // Lower = higher priority
  penalty: 0,       // Higher = less likely to be selected
  name: 'John Smith',
})

// Pause member (temporarily remove from rotation)
await ringGroups.pauseMember('Sales Team', 'PJSIP/1001', 'Break time')

// Unpause member
await ringGroups.unpauseMember('Sales Team', 'PJSIP/1001')

// Update member priority
await ringGroups.updateMember('Sales Team', 'PJSIP/1002', {
  priority: 2,
  penalty: 1,
})

// Get member status
const memberStatus = ringGroups.getMemberStatus('Sales Team', 'PJSIP/1001')
console.log('Member status:', memberStatus)

// Bulk update - set all members to same priority
await ringGroups.bulkUpdateMembers('Sales Team', {
  priority: 1,
  penalty: 0,
})

// Remove all members
await ringGroups.clearMembers('Sales Team')

// Replace all members
await ringGroups.setMembers('Sales Team', [
  'PJSIP/3001',
  'PJSIP/3002',
  'PJSIP/3003',
])`,
    },
    {
      title: 'Ring Groups UI Component',
      description: 'Visual ring group management interface',
      code: `<template>
  <div class="ring-groups-panel">
    <!-- Groups List -->
    <div class="groups-list">
      <div
        v-for="group in groups"
        :key="group.id"
        class="group-card"
        :class="{ active: group.activeCallCount > 0 }"
      >
        <div class="group-header">
          <span class="group-name">{{ group.name }}</span>
          <span class="extension">Ext: {{ group.extension }}</span>
          <span class="strategy-badge">{{ group.strategy }}</span>
        </div>

        <div class="group-stats">
          <div class="stat">
            <span class="value">{{ group.members.length }}</span>
            <span class="label">Members</span>
          </div>
          <div class="stat">
            <span class="value">{{ getAvailableCount(group) }}</span>
            <span class="label">Available</span>
          </div>
          <div class="stat" v-if="group.activeCallCount > 0">
            <span class="value pulsing">{{ group.activeCallCount }}</span>
            <span class="label">Active Calls</span>
          </div>
        </div>

        <!-- Members -->
        <div class="members-grid">
          <div
            v-for="member in group.members"
            :key="member.id"
            class="member-chip"
            :class="member.state"
          >
            <span class="indicator"></span>
            <span class="name">{{ member.name || member.extension }}</span>
            <button
              v-if="member.state !== 'paused'"
              @click="pauseMember(group.id, member.device)"
              class="pause-btn"
            >
              ⏸️
            </button>
            <button
              v-else
              @click="unpauseMember(group.id, member.device)"
              class="resume-btn"
            >
              ▶️
            </button>
          </div>
        </div>

        <div class="group-actions">
          <button @click="editGroup(group)">Edit</button>
          <button @click="viewStats(group)">Stats</button>
          <button @click="toggleGroup(group)" :class="{ danger: group.enabled }">
            {{ group.enabled ? 'Disable' : 'Enable' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add Group Button -->
    <button class="add-group-btn" @click="showAddGroup = true">
      + Create Ring Group
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const ringGroups = amiService.useRingGroups()

const groups = computed(() => ringGroups.groups.value)
const showAddGroup = ref(false)

const getAvailableCount = (group: any) => {
  return group.members.filter((m: any) => m.state === 'available').length
}

const pauseMember = async (groupId: string, device: string) => {
  await ringGroups.pauseMember(groupId, device, 'Paused from UI')
}

const unpauseMember = async (groupId: string, device: string) => {
  await ringGroups.unpauseMember(groupId, device)
}
</script>

<style scoped>
.member-chip.available .indicator { background: #4CAF50; }
.member-chip.busy .indicator { background: #f44336; }
.member-chip.paused .indicator { background: #FF9800; }
.member-chip.unavailable .indicator { background: #9E9E9E; }
</style>`,
    },
    {
      title: 'Ring Group Real-time Events',
      description: 'Handle ring group events in real-time',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const ringGroups = amiService.useRingGroups()

// Listen for group call events
ringGroups.onGroupCall((event) => {
  console.log('Incoming call to group:', event.group.name)
  console.log('Caller:', event.caller)
  console.log('Members ringing:', event.ringingMembers.length)

  // Show notification
  showNotification({
    title: \`Call to \${event.group.name}\`,
    body: \`From: \${event.caller}\`,
    icon: '/icons/ring-group.png',
  })
})

// Listen for answer events
ringGroups.onCallAnswered((event) => {
  console.log('Call answered in group:', event.group.name)
  console.log('Answered by:', event.member.name)
  console.log('Wait time:', event.waitTime, 'seconds')

  // Track metrics
  trackMetric('ring_group_answer', {
    group: event.group.name,
    waitTime: event.waitTime,
    member: event.member.extension,
  })
})

// Listen for missed calls
ringGroups.onCallMissed((event) => {
  console.log('Missed call in group:', event.group.name)
  console.log('Caller:', event.caller)
  console.log('Ring duration:', event.ringDuration, 'seconds')

  // Alert supervisor
  if (event.group.alertOnMissed) {
    alertSupervisor({
      type: 'missed_call',
      group: event.group.name,
      caller: event.caller,
    })
  }
})

// Listen for member state changes
ringGroups.onMemberStateChange((event) => {
  console.log('Member state changed:', event.member.extension)
  console.log('From:', event.previousState, 'To:', event.newState)
})`,
    },
  ],
}
