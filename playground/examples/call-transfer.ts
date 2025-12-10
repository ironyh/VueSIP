import type { ExampleDefinition } from './types'
import CallTransferDemo from '../demos/CallTransferDemo.vue'

export const callTransferExample: ExampleDefinition = {
  id: 'call-transfer',
  icon: '🔀',
  title: 'Call Transfer',
  description: 'Transfer calls to other numbers',
  category: 'sip',
  tags: ['Advanced', 'Transfer', 'Call Control'],
  component: CallTransferDemo,
  setupGuide: '<p>Transfer active calls using blind transfer (immediate) or attended transfer (with consultation). Requires an active call to use.</p>',
  codeSnippets: [
    {
      title: 'Blind Transfer',
      description: 'Immediately transfer a call',
      code: `import { useCallControls } from 'vuesip'

const {
  blindTransfer,
  isTransferring
} = useCallControls(sipClient)

// Transfer call to another number
await blindTransfer(
  'call-id-123',
  'sip:transfer@example.com'
)`,
    },
    {
      title: 'Attended Transfer',
      description: 'Consult before transferring',
      code: `const {
  initiateAttendedTransfer,
  completeAttendedTransfer,
  consultationCall
} = useCallControls(sipClient)

// Start consultation
const consultId = await initiateAttendedTransfer(
  'call-id-123',
  'sip:consult@example.com'
)

// Talk to consultation target...

// Complete the transfer
await completeAttendedTransfer()`,
    },
    {
      title: 'Transfer State Management',
      description: 'Track and display transfer progress',
      code: `import { computed, watch } from 'vue'
import { useCallTransfer } from 'vuesip'

const {
  transferState,
  originalCall,
  consultationCall,
  error
} = useCallTransfer(sipClient)

// Transfer states
type TransferState =
  | 'idle'           // No transfer in progress
  | 'consulting'     // Attended: talking to target
  | 'transferring'   // Transfer in progress
  | 'completed'      // Transfer successful
  | 'failed'         // Transfer failed

// UI state helpers
const statusMessage = computed(() => {
  switch (transferState.value) {
    case 'consulting':
      return 'Consulting with transfer target...'
    case 'transferring':
      return 'Transferring call...'
    case 'completed':
      return 'Transfer complete!'
    case 'failed':
      return \`Transfer failed: \${error.value}\`
    default:
      return ''
  }
})

// Watch for completion
watch(transferState, (state) => {
  if (state === 'completed') {
    // Clean up UI, show success message
    showNotification('Call transferred successfully')
  }
})`,
    },
    {
      title: 'Error Handling for Transfers',
      description: 'Handle common transfer failure scenarios',
      code: `const handleTransfer = async (targetUri: string) => {
  try {
    await blindTransfer(callId, targetUri)
  } catch (error) {
    switch (error.code) {
      case 'TRANSFER_REJECTED':
        // Target rejected the transfer
        alert('Transfer was rejected by the target')
        break

      case 'TARGET_BUSY':
        // Target is busy
        const retry = confirm('Target is busy. Try again?')
        if (retry) await handleTransfer(targetUri)
        break

      case 'TARGET_UNAVAILABLE':
        // Target not available
        alert('Transfer target is unavailable')
        break

      case 'TRANSFER_TIMEOUT':
        // Transfer timed out
        alert('Transfer timed out. The call was not transferred.')
        break

      case 'CALL_NOT_ACTIVE':
        // Original call ended
        alert('Cannot transfer - the call has ended')
        break

      default:
        console.error('Transfer error:', error)
        alert('Transfer failed. Please try again.')
    }
  }
}`,
    },
    {
      title: 'Attended Transfer Workflow',
      description: 'Complete attended transfer with UI feedback',
      code: `const {
  initiateAttendedTransfer,
  completeAttendedTransfer,
  cancelAttendedTransfer,
  transferState,
  consultationCall
} = useCallTransfer()

// Step 1: Put original call on hold and dial transfer target
const startTransfer = async (targetUri: string) => {
  try {
    await initiateAttendedTransfer(activeCallId.value, targetUri)
    // UI shows consultation controls
  } catch (error) {
    alert('Could not reach transfer target')
  }
}

// Step 2a: Complete the transfer (connect original caller to target)
const completeTransfer = async () => {
  try {
    await completeAttendedTransfer()
    // Both parties are now connected, we're disconnected
  } catch (error) {
    alert('Failed to complete transfer')
  }
}

// Step 2b: Cancel and return to original call
const cancelTransfer = async () => {
  await cancelAttendedTransfer()
  // Consultation call ends, original call is resumed
}

// Step 2c: Merge into conference instead
const mergeToConference = async () => {
  // Keep all three parties connected
  await createConference([activeCallId.value, consultationCall.value.id])
}`,
    },
    {
      title: 'Quick Transfer Buttons',
      description: 'Create preset transfer destinations',
      code: `// Define common transfer destinations
const transferDestinations = [
  { label: 'Front Desk', uri: 'sip:100@pbx.example.com' },
  { label: 'Sales', uri: 'sip:200@pbx.example.com' },
  { label: 'Support', uri: 'sip:300@pbx.example.com' },
  { label: 'Manager', uri: 'sip:101@pbx.example.com' },
  { label: 'Voicemail', uri: 'sip:*97@pbx.example.com' },
]

// Transfer to preset
const quickTransfer = async (destination: typeof transferDestinations[0]) => {
  const confirmTransfer = confirm(
    \`Transfer call to \${destination.label}?\`
  )

  if (confirmTransfer) {
    await blindTransfer(activeCallId.value, destination.uri)
  }
}

// Render quick transfer buttons
<div class="quick-transfers">
  <button
    v-for="dest in transferDestinations"
    :key="dest.uri"
    @click="quickTransfer(dest)"
    :disabled="!hasActiveCall"
  >
    {{ dest.label }}
  </button>
</div>`,
    },
    {
      title: 'Transfer History',
      description: 'Track recent transfers for quick access',
      code: `import { ref, watch } from 'vue'

interface TransferRecord {
  timestamp: Date
  originalCaller: string
  transferTarget: string
  type: 'blind' | 'attended'
  success: boolean
}

const transferHistory = ref<TransferRecord[]>([])

// Load history from storage
const loadHistory = () => {
  const saved = localStorage.getItem('transfer-history')
  if (saved) {
    transferHistory.value = JSON.parse(saved)
  }
}

// Save transfer to history
const recordTransfer = (record: TransferRecord) => {
  transferHistory.value.unshift(record)
  // Keep only last 50 transfers
  transferHistory.value = transferHistory.value.slice(0, 50)
  localStorage.setItem('transfer-history', JSON.stringify(transferHistory.value))
}

// Watch for completed transfers
watch(transferState, (state, prevState) => {
  if (state === 'completed' && prevState === 'transferring') {
    recordTransfer({
      timestamp: new Date(),
      originalCaller: originalCall.value?.remoteUri || '',
      transferTarget: consultationCall.value?.remoteUri || transferTargetUri.value,
      type: consultationCall.value ? 'attended' : 'blind',
      success: true,
    })
  }
})`,
    },
  ],
}
