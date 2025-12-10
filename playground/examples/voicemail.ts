import type { ExampleDefinition } from './types'
import VoicemailDemo from '../demos/VoicemailDemo.vue'

export const voicemailExample: ExampleDefinition = {
  id: 'voicemail',
  icon: '📬',
  title: 'Voicemail (MWI)',
  description: 'Message Waiting Indicator for voicemail notifications',
  category: 'ami',
  tags: ['Advanced', 'Messaging', 'Notifications'],
  component: VoicemailDemo,
  setupGuide: `<p>Monitor voicemail status using AMI and MWI (Message Waiting Indicator). Subscribe to receive notifications when new voicemails arrive.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy (amiws) on your Asterisk server</li>
  <li>Connect to AMI using the unified AmiService</li>
  <li>Use the voicemail composable for message notifications</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize AMI & Voicemail Service',
      description: 'Connect to AMI and access voicemail features',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI WebSocket proxy
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'admin',
  password: 'secret',
})

// Get the voicemail composable via unified service
const voicemail = amiService.useVoicemail()

// Check connection
console.log('AMI Connected:', amiService.isConnected.value)`,
    },
    {
      title: 'Monitor Voicemail Status',
      description: 'Get notified of new voicemail messages',
      code: `import { getAmiService } from '@/services/AmiService'
import { watch } from 'vue'

const amiService = getAmiService()
const voicemail = amiService.useVoicemail()

// Access voicemail counts for an extension
const mailbox = voicemail.getMailbox('1001')
console.log('Mailbox 1001:', {
  newMessages: mailbox?.newMessages,
  oldMessages: mailbox?.oldMessages,
  urgent: mailbox?.urgentMessages,
})

// Watch for voicemail changes reactively
watch(voicemail.mailboxes, (boxes) => {
  boxes.forEach((mwi, mailbox) => {
    if (mwi.newMessages > 0) {
      console.log(\`Mailbox \${mailbox} has \${mwi.newMessages} new messages\`)
    }
  })
}, { deep: true })`,
    },
    {
      title: 'React to MWI Events',
      description: 'Handle real-time voicemail notifications',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const voicemail = amiService.useVoicemail()

// Listen for MWI (Message Waiting Indicator) events via AMI
amiService.on('MessageWaiting', (event) => {
  console.log(\`Voicemail update for \${event.Mailbox}\`)
  console.log(\`New: \${event.Waiting}, Old: \${event.Old}\`)

  // Show notification if new messages
  if (parseInt(event.Waiting) > 0) {
    showVoicemailNotification(event.Mailbox, parseInt(event.Waiting))
  }
})

// Show browser notification
const showVoicemailNotification = (mailbox: string, count: number) => {
  if (Notification.permission === 'granted') {
    new Notification('New Voicemail', {
      body: \`\${count} new message\${count > 1 ? 's' : ''} in \${mailbox}\`,
      icon: '/icons/voicemail.png',
      tag: \`voicemail-\${mailbox}\`,
    })
  }
}`,
    },
    {
      title: 'MWI State Model',
      description: 'Understanding voicemail state structure',
      code: `interface MWIState {
  account: string           // voicemail box identifier
  newMessages: number       // unread voicemail count
  oldMessages: number       // read voicemail count
  newUrgent?: number        // urgent unread messages
  oldUrgent?: number        // urgent read messages
  lastUpdated: Date         // when status was received
  subscribed: boolean       // subscription active
}

// Extended voicemail info (if supported by server)
interface VoicemailMessage {
  id: string
  from: string              // caller information
  fromName?: string         // caller display name
  timestamp: Date           // when message was left
  duration: number          // message length in seconds
  isNew: boolean            // unread status
  isUrgent: boolean         // marked as urgent
  transcription?: string    // speech-to-text if available
}

// Display helpers
const formatVoicemailInfo = (mwi: MWIState): string => {
  const parts: string[] = []

  if (mwi.newMessages > 0) {
    parts.push(\`\${mwi.newMessages} new\`)
  }
  if (mwi.newUrgent && mwi.newUrgent > 0) {
    parts.push(\`\${mwi.newUrgent} urgent\`)
  }
  if (mwi.oldMessages > 0) {
    parts.push(\`\${mwi.oldMessages} saved\`)
  }

  return parts.join(', ') || 'No messages'
}`,
    },
    {
      title: 'Visual Notification Badge',
      description: 'Show voicemail indicator in UI',
      code: `import { computed, ref } from 'vue'

const totalNewMessages = computed(() => {
  let total = 0
  voicemail.mwiStates.value.forEach(mwi => {
    total += mwi.newMessages
  })
  return total
})

const hasUrgentMessages = computed(() => {
  let hasUrgent = false
  voicemail.mwiStates.value.forEach(mwi => {
    if (mwi.newUrgent && mwi.newUrgent > 0) {
      hasUrgent = true
    }
  })
  return hasUrgent
})

// Badge component
const VoicemailBadge = {
  template: \`
    <div class="voicemail-badge" :class="{ urgent: hasUrgent, 'has-new': count > 0 }">
      <span class="icon">📬</span>
      <span v-if="count > 0" class="count">{{ count > 99 ? '99+' : count }}</span>
    </div>
  \`,
  props: {
    count: Number,
    hasUrgent: Boolean,
  },
}

// Show browser notification for new voicemail
const showVoicemailNotification = (account: string, newCount: number) => {
  if (Notification.permission === 'granted') {
    new Notification('New Voicemail', {
      body: \`You have \${newCount} new message\${newCount > 1 ? 's' : ''}\`,
      icon: '/icons/voicemail.png',
      tag: \`voicemail-\${account}\`,
    })
  }
}`,
    },
    {
      title: 'Dial Into Voicemail',
      description: 'Access voicemail system programmatically',
      code: `import { useSipClient } from 'vuesip'

const { makeCall } = useSipClient()

// Common voicemail access codes
const VOICEMAIL_CODES = {
  asterisk: '*97',
  freepbx: '*98',
  cisco: '*86',
  avaya: '*1',
  custom: null as string | null,
}

const voicemailCode = ref(VOICEMAIL_CODES.asterisk)

// Call into voicemail system
const accessVoicemail = async (account?: string) => {
  if (!voicemailCode.value) {
    showNotification('Voicemail code not configured')
    return
  }

  const dialString = account
    ? \`\${voicemailCode.value}\${account}\`
    : voicemailCode.value

  await makeCall(\`sip:\${dialString}@\${domain}\`)
}

// Quick actions
const listenToNewMessages = async () => {
  await accessVoicemail()
  // DTMF navigation will be handled during call
}

// Configure voicemail shortcut
const configureVoicemailCode = (code: string) => {
  voicemailCode.value = code
  localStorage.setItem('voicemail-code', code)
}`,
    },
    {
      title: 'Multiple Voicemail Boxes',
      description: 'Monitor multiple voicemail accounts',
      code: `interface VoicemailAccount {
  id: string
  name: string
  extension: string
  domain: string
  subscribed: boolean
}

const voicemailAccounts = ref<VoicemailAccount[]>([])

// Add voicemail account
const addVoicemailAccount = async (account: VoicemailAccount) => {
  voicemailAccounts.value.push(account)

  const uri = \`\${account.extension}@\${account.domain}\`
  await voicemail.subscribe(uri)
  account.subscribed = true

  saveAccounts()
}

// Remove voicemail account
const removeVoicemailAccount = async (accountId: string) => {
  const index = voicemailAccounts.value.findIndex(a => a.id === accountId)
  if (index === -1) return

  const account = voicemailAccounts.value[index]
  const uri = \`\${account.extension}@\${account.domain}\`

  await voicemail.unsubscribe(uri)
  voicemailAccounts.value.splice(index, 1)

  saveAccounts()
}

// Get MWI for specific account
const getAccountMWI = (account: VoicemailAccount): MWIState | undefined => {
  const uri = \`\${account.extension}@\${account.domain}\`
  return voicemail.mwiStates.value.get(uri)
}

// Summary across all accounts
const voicemailSummary = computed(() => {
  let totalNew = 0
  let totalOld = 0
  let totalUrgent = 0

  voicemailAccounts.value.forEach(account => {
    const mwi = getAccountMWI(account)
    if (mwi) {
      totalNew += mwi.newMessages
      totalOld += mwi.oldMessages
      totalUrgent += mwi.newUrgent || 0
    }
  })

  return { totalNew, totalOld, totalUrgent }
})`,
    },
    {
      title: 'Voicemail UI Component',
      description: 'Complete voicemail interface',
      code: `<template>
  <div class="voicemail-panel">
    <div class="voicemail-header">
      <h3>
        📬 Voicemail
        <span v-if="totalNewMessages > 0" class="badge">
          {{ totalNewMessages }}
        </span>
      </h3>
      <button @click="refreshAll">🔄 Refresh</button>
    </div>

    <div class="voicemail-accounts">
      <div
        v-for="account in voicemailAccounts"
        :key="account.id"
        class="account-card"
        :class="{ 'has-new': getAccountMWI(account)?.newMessages > 0 }"
      >
        <div class="account-info">
          <span class="name">{{ account.name }}</span>
          <span class="extension">{{ account.extension }}</span>
        </div>

        <div class="message-counts">
          <span class="new" v-if="getAccountMWI(account)?.newMessages">
            {{ getAccountMWI(account)?.newMessages }} new
          </span>
          <span class="old" v-if="getAccountMWI(account)?.oldMessages">
            {{ getAccountMWI(account)?.oldMessages }} saved
          </span>
          <span v-if="!getAccountMWI(account)?.newMessages && !getAccountMWI(account)?.oldMessages">
            No messages
          </span>
        </div>

        <div class="actions">
          <button
            @click="accessVoicemail(account.extension)"
            :disabled="!getAccountMWI(account)?.newMessages"
          >
            📞 Listen
          </button>
          <button @click="removeVoicemailAccount(account.id)">
            ❌
          </button>
        </div>
      </div>
    </div>

    <div class="add-account">
      <button @click="showAddDialog = true">+ Add Voicemail Box</button>
    </div>

    <!-- Summary -->
    <div class="summary">
      <span>Total: {{ voicemailSummary.totalNew }} new, {{ voicemailSummary.totalOld }} saved</span>
    </div>
  </div>
</template>`,
    },
    {
      title: 'Auto-Refresh and Polling',
      description: 'Keep voicemail status up to date',
      code: `import { onMounted, onUnmounted, ref } from 'vue'

const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null)
const REFRESH_INTERVAL_MS = 60000 // 1 minute

// Manual refresh
const refreshAll = async () => {
  for (const account of voicemailAccounts.value) {
    const uri = \`\${account.extension}@\${account.domain}\`

    // Unsubscribe and resubscribe to get fresh state
    try {
      await voicemail.unsubscribe(uri)
      await voicemail.subscribe(uri)
    } catch (e) {
      console.warn(\`Failed to refresh \${uri}\`)
    }
  }
}

// Start auto-refresh
const startAutoRefresh = () => {
  if (refreshInterval.value) return

  refreshInterval.value = setInterval(refreshAll, REFRESH_INTERVAL_MS)
}

// Stop auto-refresh
const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

// Handle visibility change (pause when tab hidden)
const handleVisibilityChange = () => {
  if (document.hidden) {
    stopAutoRefresh()
  } else {
    startAutoRefresh()
    refreshAll() // Immediate refresh when becoming visible
  }
}

onMounted(() => {
  startAutoRefresh()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  stopAutoRefresh()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})`,
    },
  ],
}
