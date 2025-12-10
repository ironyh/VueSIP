import type { ExampleDefinition } from './types'
import FeatureCodesDemo from '../demos/FeatureCodesDemo.vue'

export const featureCodesExample: ExampleDefinition = {
  id: 'feature-codes',
  icon: '*️⃣',
  title: 'Feature Codes',
  description: 'Dial feature codes for call forwarding, DND, and more',
  category: 'ami',
  tags: ['PBX', 'Features', 'Codes'],
  component: FeatureCodesDemo,
  setupGuide: `<p>Execute PBX feature codes directly from the application. Manage call forwarding, DND, voicemail, and other PBX features through the unified AmiService.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy (amiws) on your Asterisk server</li>
  <li>Connect to AMI using the unified AmiService</li>
  <li>Use the feature codes composable to execute PBX functions</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize AMI & Feature Codes',
      description: 'Connect to AMI and access feature codes',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI WebSocket proxy
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'admin',
  password: 'secret',
})

// Get the feature codes composable via unified service
const features = amiService.useFeatureCodes({
  onFeatureActivated: (feature, state) => {
    console.log('Feature activated:', feature, state)
  },
  onFeatureError: (feature, error) => {
    console.error('Feature error:', feature, error)
  },
})

// Check connection
console.log('AMI Connected:', amiService.isConnected.value)`,
    },
    {
      title: 'Execute Feature Codes',
      description: 'Dial feature codes for PBX functions',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const features = amiService.useFeatureCodes()

// Enable Do Not Disturb
await features.enableDND()
console.log('DND enabled')

// Disable Do Not Disturb
await features.disableDND()
console.log('DND disabled')

// Toggle DND
await features.toggleDND()

// Set call forward - all calls
await features.setCallForward('all', '1002')

// Set call forward - busy
await features.setCallForward('busy', '1003')

// Set call forward - no answer
await features.setCallForward('noanswer', '1004')

// Clear call forwarding
await features.clearCallForward('all')`,
    },
    {
      title: 'Check Feature Status',
      description: 'Query current feature settings',
      code: `import { getAmiService } from '@/services/AmiService'
import { watch } from 'vue'

const amiService = getAmiService()
const features = amiService.useFeatureCodes()

// Check DND status reactively
console.log('DND is', features.dndEnabled.value ? 'enabled' : 'disabled')

// Watch for DND changes
watch(features.dndEnabled, (enabled) => {
  console.log('DND changed to:', enabled)
})

// Check call forward status
const cfStatus = features.callForwardStatus.value
cfStatus.forEach(cf => {
  if (cf.enabled) {
    console.log(\`\${cf.type} forwarding -> \${cf.destination}\`)
  }
})

// Get all feature states
const allFeatures = features.featureStates.value
console.log('All features:', allFeatures)`,
    },
    {
      title: 'Feature Code Data Model',
      description: 'Data structures for feature codes',
      code: `interface FeatureCode {
  code: string           // e.g., '*72', '*73'
  name: string           // Human-readable name
  category: 'dnd' | 'callforward' | 'voicemail' | 'parking' | 'recording' | 'other'
  requiresArgument: boolean
  description: string
}

interface CallForwardSetting {
  type: 'all' | 'busy' | 'noanswer' | 'unavailable'
  enabled: boolean
  destination: string
  ringTime?: number      // Seconds before forwarding (for noanswer)
}

interface FeatureState {
  dndEnabled: boolean
  callForwardAll?: string
  callForwardBusy?: string
  callForwardNoAnswer?: string
  callWaitingEnabled: boolean
  recordingEnabled: boolean
  lastUpdated: Date
}

// Common Asterisk feature codes
const FEATURE_CODES = {
  // DND
  DND_ENABLE: '*78',
  DND_DISABLE: '*79',
  DND_TOGGLE: '*76',

  // Call Forward
  CF_ALL_SET: '*72',
  CF_ALL_CLEAR: '*73',
  CF_BUSY_SET: '*90',
  CF_BUSY_CLEAR: '*91',
  CF_NOANSWER_SET: '*52',
  CF_NOANSWER_CLEAR: '*53',

  // Voicemail
  VM_ACCESS: '*97',
  VM_DIRECT: '*98',

  // Call Parking
  PARK: '#700',
  PARKED_CALL: '700',

  // Recording
  RECORD_START: '*1',
  RECORD_STOP: '*2',

  // Pickup
  PICKUP: '*8',
  PICKUP_DIRECTED: '**',
}`,
    },
    {
      title: 'Voicemail Feature Codes',
      description: 'Access voicemail via feature codes',
      code: `import { getAmiService } from '@/services/AmiService'
import { useSipClient } from 'vuesip'

const amiService = getAmiService()
const features = amiService.useFeatureCodes()
const { makeCall } = useSipClient()

// Access own voicemail
const accessMyVoicemail = async () => {
  await makeCall('*97')
}

// Access specific mailbox voicemail
const accessMailbox = async (mailbox: string) => {
  await makeCall(\`*98\${mailbox}\`)
}

// Check voicemail message count via AMI
const voicemail = amiService.useVoicemail()
const mailbox = voicemail.getMailbox('1001')
if (mailbox && mailbox.newMessages > 0) {
  console.log(\`You have \${mailbox.newMessages} new voicemail(s)\`)
}

// Send to voicemail feature code (if supported)
const sendToVoicemail = async (extension: string) => {
  await makeCall(\`*\${extension}\`)
}`,
    },
    {
      title: 'Call Pickup Feature Codes',
      description: 'Pick up ringing calls using feature codes',
      code: `import { getAmiService } from '@/services/AmiService'
import { useSipClient } from 'vuesip'

const amiService = getAmiService()
const features = amiService.useFeatureCodes()
const { makeCall } = useSipClient()

// Group call pickup - pick up any ringing call in your group
const groupPickup = async () => {
  await makeCall('*8')
}

// Directed call pickup - pick up specific ringing extension
const directedPickup = async (extension: string) => {
  await makeCall(\`**\${extension}\`)
}

// Monitor ringing extensions via BLF for pickup opportunities
const blf = amiService.usePeers()
const ringingExtensions = computed(() =>
  blf.peers.value.filter(peer => peer.state === 'ringing')
)

// Show pickup button for ringing extensions
const showPickupOptions = () => {
  ringingExtensions.value.forEach(ext => {
    console.log(\`Extension \${ext.extension} is ringing - pickup available\`)
  })
}`,
    },
    {
      title: 'Feature Codes UI Component',
      description: 'Visual feature code management panel',
      code: `<template>
  <div class="feature-codes-panel">
    <!-- DND Toggle -->
    <div class="feature-section">
      <h4>Do Not Disturb</h4>
      <label class="toggle-switch">
        <input
          type="checkbox"
          :checked="features.dndEnabled.value"
          @change="features.toggleDND()"
        />
        <span class="slider"></span>
        <span class="label">{{ features.dndEnabled.value ? 'Enabled' : 'Disabled' }}</span>
      </label>
    </div>

    <!-- Call Forwarding -->
    <div class="feature-section">
      <h4>Call Forwarding</h4>
      <div v-for="cf in callForwardTypes" :key="cf.type" class="cf-row">
        <span class="cf-type">{{ cf.label }}</span>
        <input
          v-model="cf.destination"
          placeholder="Forward to..."
          :disabled="!cf.enabled"
        />
        <label class="toggle-switch small">
          <input
            type="checkbox"
            v-model="cf.enabled"
            @change="toggleCallForward(cf)"
          />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="feature-section">
      <h4>Quick Actions</h4>
      <div class="action-buttons">
        <button @click="accessVoicemail">📬 Voicemail</button>
        <button @click="groupPickup" :disabled="!hasRingingCalls">
          📞 Pickup (*8)
        </button>
        <button @click="parkCall" :disabled="!hasActiveCall">
          🅿️ Park Call
        </button>
      </div>
    </div>

    <!-- Feature Codes Reference -->
    <div class="feature-section collapsible">
      <h4 @click="showReference = !showReference">
        📖 Feature Codes Reference
        <span>{{ showReference ? '▼' : '▶' }}</span>
      </h4>
      <div v-if="showReference" class="codes-list">
        <div v-for="code in availableCodes" :key="code.code" class="code-item">
          <span class="code">{{ code.code }}</span>
          <span class="name">{{ code.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const features = amiService.useFeatureCodes()
const showReference = ref(false)
</script>`,
    },
    {
      title: 'Custom Feature Code Execution',
      description: 'Execute arbitrary feature codes',
      code: `import { getAmiService } from '@/services/AmiService'
import { useSipClient } from 'vuesip'

const amiService = getAmiService()
const features = amiService.useFeatureCodes()
const { makeCall } = useSipClient()

// Execute any feature code
const executeFeatureCode = async (code: string, argument?: string) => {
  const fullCode = argument ? \`\${code}\${argument}\` : code

  try {
    await makeCall(fullCode)
    console.log('Feature code executed:', fullCode)
  } catch (error) {
    console.error('Feature code failed:', error)
    throw error
  }
}

// Feature code with confirmation
const executeWithConfirmation = async (
  code: string,
  description: string
): Promise<boolean> => {
  const confirmed = await showConfirmDialog(
    \`Execute "\${description}"?\`,
    \`This will dial: \${code}\`
  )

  if (confirmed) {
    await executeFeatureCode(code)
    return true
  }
  return false
}

// Batch feature code operations
const setupUserFeatures = async (config: {
  dnd?: boolean
  callForwardAll?: string
  callWaiting?: boolean
}) => {
  if (config.dnd !== undefined) {
    config.dnd ? await features.enableDND() : await features.disableDND()
  }

  if (config.callForwardAll) {
    await features.setCallForward('all', config.callForwardAll)
  }

  console.log('User features configured')
}`,
    },
  ],
}
