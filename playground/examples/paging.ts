import type { ExampleDefinition } from './types'
import PagingDemo from '../demos/PagingDemo.vue'

export const pagingExample: ExampleDefinition = {
  id: 'paging',
  icon: '📢',
  title: 'Paging & Intercom',
  description: 'One-way and two-way paging announcements',
  category: 'ami',
  tags: ['Advanced', 'Paging', 'Announcements'],
  component: PagingDemo,
  setupGuide: `<p>Send paging announcements to groups of phones. Supports one-way announcements and two-way intercom functionality via the unified AmiService.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy (amiws) on your Asterisk server</li>
  <li>Connect to AMI using the unified AmiService</li>
  <li>Use the paging composable for announcements</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize AMI & Paging Service',
      description: 'Connect to AMI and access paging features',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI WebSocket proxy
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'admin',
  password: 'secret',
})

// Get the paging composable via unified service
const paging = amiService.usePaging({
  onPageStart: (session) => {
    console.log('Paging started to:', session.target)
  },
  onPageEnd: (session) => {
    console.log('Paging ended, duration:', session.duration)
  },
  onPageError: (error) => {
    console.error('Paging error:', error)
  },
})

// Check connection
console.log('AMI Connected:', amiService.isConnected.value)`,
    },
    {
      title: 'Send Page Announcement',
      description: 'Page a group of extensions',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const paging = amiService.usePaging()

// Page a single extension
await paging.page('PJSIP/1001')

// Page multiple extensions
await paging.page(['PJSIP/1001', 'PJSIP/1002', 'PJSIP/1003'])

// Page a predefined group
await paging.pageGroup('sales-floor')

// Page with options
await paging.page(['PJSIP/1001', 'PJSIP/1002'], {
  timeout: 30,                    // Max page duration in seconds
  duplex: false,                  // One-way announcement
  announcement: '/sounds/chime.wav', // Play before speaking
  callerId: 'Announcement <*80>',
})

// Page all extensions in a zone
const allSalesExtensions = ['PJSIP/1001', 'PJSIP/1002', 'PJSIP/1003', 'PJSIP/1004']
await paging.page(allSalesExtensions)`,
    },
    {
      title: 'Intercom Call',
      description: 'Two-way intercom functionality',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const paging = amiService.usePaging()

// Start intercom (auto-answer on target, two-way audio)
await paging.intercom('PJSIP/1001')

// Intercom with options
await paging.intercom('PJSIP/1002', {
  timeout: 60,          // Max call duration
  autoAnswer: true,     // Target auto-answers
  beep: true,           // Play beep before speaking
  callerId: 'Intercom <*99>',
})

// Check if intercom is supported by target device
const supportsIntercom = await paging.checkIntercomSupport('PJSIP/1001')
if (!supportsIntercom) {
  console.log('Device does not support auto-answer intercom')
  // Fall back to regular call
}

// End active intercom session
await paging.endIntercom()`,
    },
    {
      title: 'Paging Data Model',
      description: 'Data structures for paging and intercom',
      code: `interface PageSession {
  id: string
  type: 'page' | 'intercom'
  target: string | string[]
  targetCount: number
  connectedCount: number
  startTime: Date
  endTime?: Date
  duration: number
  status: 'initiating' | 'active' | 'ended' | 'failed'
  options: PageOptions
  callerId: string
}

interface PageOptions {
  timeout?: number           // Max duration in seconds
  duplex?: boolean           // Two-way audio (intercom mode)
  announcement?: string      // Audio file to play first
  autoAnswer?: boolean       // Target auto-answers
  beep?: boolean            // Play beep before audio
  callerId?: string
  confirmKey?: string       // DTMF to confirm receipt
}

interface PageGroup {
  id: string
  name: string
  description?: string
  extensions: string[]
  defaultOptions: PageOptions
  enabled: boolean
  scheduleRestrictions?: {
    allowedHours: { start: string; end: string }
    allowedDays: number[]
  }
}

interface PageZone {
  id: string
  name: string
  groups: string[]      // Group IDs
  priority: number
  emergencyOverride: boolean
}

const activeSessions = ref<Map<string, PageSession>>(new Map())
const pageGroups = ref<Map<string, PageGroup>>(new Map())
const pageZones = ref<Map<string, PageZone>>(new Map())`,
    },
    {
      title: 'Paging Groups Management',
      description: 'Configure and manage paging groups',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const paging = amiService.usePaging()

// Create a paging group
await paging.createGroup({
  id: 'sales-floor',
  name: 'Sales Floor',
  description: 'All sales team extensions',
  extensions: ['PJSIP/1001', 'PJSIP/1002', 'PJSIP/1003', 'PJSIP/1004'],
  defaultOptions: {
    timeout: 30,
    duplex: false,
    beep: true,
  },
  enabled: true,
})

// Create reception/front desk group
await paging.createGroup({
  id: 'reception',
  name: 'Reception Area',
  extensions: ['PJSIP/2001', 'PJSIP/2002'],
  defaultOptions: {
    timeout: 60,
    announcement: '/sounds/reception-chime.wav',
  },
  scheduleRestrictions: {
    allowedHours: { start: '08:00', end: '18:00' },
    allowedDays: [1, 2, 3, 4, 5], // Mon-Fri
  },
})

// Update group
await paging.updateGroup('sales-floor', {
  extensions: [...existingExtensions, 'PJSIP/1005'],
})

// Delete group
await paging.deleteGroup('old-group')

// List all groups
const groups = paging.groups.value
groups.forEach(group => {
  console.log(\`\${group.name}: \${group.extensions.length} extensions\`)
})`,
    },
    {
      title: 'Emergency Paging',
      description: 'Priority paging for emergencies',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const paging = amiService.usePaging()

// Define emergency zone (all extensions)
await paging.createZone({
  id: 'emergency-all',
  name: 'Emergency - All Zones',
  groups: ['sales-floor', 'reception', 'warehouse', 'offices'],
  priority: 1,  // Highest priority
  emergencyOverride: true, // Override schedule restrictions
})

// Emergency page - overrides all restrictions
const emergencyPage = async (message: string) => {
  // Pre-recorded emergency announcement
  await paging.pageZone('emergency-all', {
    announcement: '/sounds/emergency-tone.wav',
    timeout: 120,
    duplex: false,
    priority: 'emergency',
    overrideRestrictions: true,
  })

  // Log emergency page
  await logEmergencyEvent({
    type: 'emergency_page',
    initiator: currentUser.value.id,
    timestamp: new Date(),
    message,
  })
}

// Fire alarm page
const fireAlarmPage = async () => {
  await emergencyPage('Fire alarm activated')
}

// General emergency announcement
const generalEmergency = async (announcement: string) => {
  await paging.pageZone('emergency-all', {
    announcement,
    timeout: 60,
    priority: 'emergency',
  })
}`,
    },
    {
      title: 'Paging History & Analytics',
      description: 'Track and analyze paging activity',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const paging = amiService.usePaging()

// Get paging history
const history = await paging.getHistory({
  startDate: new Date(Date.now() - 7 * 86400000), // Last 7 days
  endDate: new Date(),
  type: 'page', // 'page' | 'intercom' | 'all'
})

history.forEach(session => {
  console.log(\`\${session.type}: \${session.target}\`)
  console.log(\`  Duration: \${session.duration}s\`)
  console.log(\`  Connected: \${session.connectedCount}/\${session.targetCount}\`)
})

// Paging statistics
const stats = await paging.getStats({
  period: 'week',
})

console.log('Total pages:', stats.totalPages)
console.log('Total intercom calls:', stats.totalIntercom)
console.log('Average duration:', stats.avgDuration, 'seconds')
console.log('Most paged group:', stats.topGroup)
console.log('Peak hour:', stats.peakHour)

// Pages by group
stats.byGroup.forEach(groupStats => {
  console.log(\`\${groupStats.groupName}: \${groupStats.count} pages\`)
})

// Top paging users
stats.topUsers.forEach(user => {
  console.log(\`\${user.name}: \${user.pageCount} pages\`)
})`,
    },
    {
      title: 'Paging UI Component',
      description: 'Visual paging interface',
      code: `<template>
  <div class="paging-panel">
    <!-- Quick Page Buttons -->
    <div class="quick-page">
      <h4>📢 Quick Page</h4>
      <div class="group-buttons">
        <button
          v-for="group in pageGroups"
          :key="group.id"
          @click="pageGroup(group.id)"
          :disabled="isPageActive"
          class="page-btn"
        >
          {{ group.name }}
          <span class="count">({{ group.extensions.length }})</span>
        </button>
      </div>
    </div>

    <!-- Active Page Indicator -->
    <div v-if="activePage" class="active-page">
      <div class="page-info">
        <span class="pulse">🔴</span>
        <span>Paging: {{ activePage.target }}</span>
        <span class="duration">{{ formatDuration(activePage.duration) }}</span>
      </div>
      <button @click="endPage" class="end-btn">End Page</button>
    </div>

    <!-- Intercom -->
    <div class="intercom-section">
      <h4>🎤 Intercom</h4>
      <div class="intercom-input">
        <input
          type="text"
          v-model="intercomTarget"
          placeholder="Extension (e.g., 1001)"
          @keyup.enter="startIntercom"
        />
        <button
          @click="startIntercom"
          :disabled="!intercomTarget || isIntercomActive"
        >
          {{ isIntercomActive ? 'End' : 'Intercom' }}
        </button>
      </div>
      <div class="recent-intercom">
        <button
          v-for="ext in recentIntercomTargets"
          :key="ext"
          @click="startIntercom(ext)"
          class="recent-btn"
        >
          {{ ext }}
        </button>
      </div>
    </div>

    <!-- Page History -->
    <div class="page-history">
      <h4>📜 Recent Pages</h4>
      <div
        v-for="page in recentPages"
        :key="page.id"
        class="history-item"
      >
        <span class="type-icon">{{ page.type === 'page' ? '📢' : '🎤' }}</span>
        <span class="target">{{ formatTarget(page.target) }}</span>
        <span class="time">{{ formatTime(page.startTime) }}</span>
        <span class="duration">{{ page.duration }}s</span>
      </div>
    </div>

    <!-- Emergency Page -->
    <div class="emergency-section">
      <button
        @click="showEmergencyConfirm = true"
        class="emergency-btn"
      >
        🚨 Emergency Page
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const paging = amiService.usePaging()

const intercomTarget = ref('')
const showEmergencyConfirm = ref(false)

const pageGroups = computed(() => paging.groups.value)
const activePage = computed(() => paging.activeSession.value)
const isPageActive = computed(() => !!activePage.value)
const isIntercomActive = computed(() =>
  activePage.value?.type === 'intercom'
)
const recentPages = computed(() => paging.recentPages.value.slice(0, 5))

const pageGroup = async (groupId: string) => {
  await paging.pageGroup(groupId)
}

const startIntercom = async (target?: string) => {
  const ext = target || intercomTarget.value
  if (isIntercomActive.value) {
    await paging.endIntercom()
  } else {
    await paging.intercom(\`PJSIP/\${ext}\`)
  }
}

const endPage = async () => {
  await paging.endPage()
}
</script>`,
    },
  ],
}
