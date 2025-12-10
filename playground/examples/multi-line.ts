import type { ExampleDefinition } from './types'
import MultiLineDemo from '../demos/MultiLineDemo.vue'

export const multiLineExample: ExampleDefinition = {
  id: 'multi-line',
  icon: '📱',
  title: 'Multi-Line Phone',
  description: 'Handle multiple simultaneous call lines',
  category: 'sip',
  tags: ['Advanced', 'Multi-Line', 'Professional'],
  component: MultiLineDemo,
  setupGuide: '<p>Manage multiple phone lines simultaneously. Switch between calls, place calls on hold, and handle multiple conversations.</p>',
  codeSnippets: [
    {
      title: 'Initialize Multi-Line',
      description: 'Set up multiple phone lines',
      code: `import { useMultiLine } from 'vuesip'

const multiLine = useMultiLine(sipClientRef, {
  maxLines: 4,
  onLineStateChange: (lineNumber, status) => {
    console.log('Line', lineNumber, 'changed to', status)
  },
})

// Get available lines
const lines = multiLine.lines.value
console.log('Total lines:', lines.length)`,
    },
    {
      title: 'Manage Lines',
      description: 'Select and control individual lines',
      code: `// Select a line
multiLine.selectLine(2)

// Make a call on the selected line
await multiLine.makeCall('sip:user@example.com')

// Hold current line and switch
await multiLine.holdCurrentLine()
multiLine.selectLine(1)

// Monitor all lines
watch(multiLine.lines, (currentLines) => {
  currentLines.forEach(line => {
    console.log('Line', line.lineNumber, ':', line.status)
  })
})`,
    },
    {
      title: 'Line State Model',
      description: 'Understanding line status values',
      code: `// Line status values
type LineStatus =
  | 'idle'         // No call on this line
  | 'dialing'      // Outgoing call in progress
  | 'ringing'      // Incoming call ringing
  | 'connected'    // Active call
  | 'on-hold'      // Call on hold
  | 'busy'         // Line is busy

// Line object structure
interface PhoneLine {
  lineNumber: number       // 1-based line number
  status: LineStatus       // Current line state
  callId?: string          // Associated call ID
  remoteUri?: string       // Remote party URI
  remoteName?: string      // Remote party display name
  duration?: number        // Call duration in seconds
  isSelected: boolean      // Is this the active line?
  canHold: boolean         // Can this line be held?
  canResume: boolean       // Can this line be resumed?
}

// Find available line for new call
const findAvailableLine = () => {
  return lines.value.find(line => line.status === 'idle')
}`,
    },
    {
      title: 'Auto-Hold on Line Switch',
      description: 'Automatically hold active calls when switching',
      code: `import { useMultiLine } from 'vuesip'

const multiLine = useMultiLine(sipClientRef, {
  maxLines: 4,
  autoHold: true, // Automatically hold when switching lines
})

// When switching to a new line:
// 1. Current connected call is automatically put on hold
// 2. New line becomes selected
// 3. If new line has a held call, it's automatically resumed

const switchToLine = async (lineNumber: number) => {
  const currentLine = multiLine.selectedLine.value
  const targetLine = multiLine.lines.value.find(l => l.lineNumber === lineNumber)

  if (!targetLine) return

  // With autoHold enabled, this handles everything
  await multiLine.selectLine(lineNumber)

  // Manual alternative without autoHold:
  // if (currentLine?.status === 'connected') {
  //   await multiLine.holdLine(currentLine.lineNumber)
  // }
  // multiLine.selectLine(lineNumber)
  // if (targetLine.status === 'on-hold') {
  //   await multiLine.resumeLine(lineNumber)
  // }
}`,
    },
    {
      title: 'Multi-Line Phone UI',
      description: 'Build a complete multi-line interface',
      code: `<template>
  <div class="phone-lines">
    <!-- Line Buttons -->
    <div class="line-buttons">
      <button
        v-for="line in lines"
        :key="line.lineNumber"
        @click="selectLine(line.lineNumber)"
        :class="{
          'selected': line.isSelected,
          'ringing': line.status === 'ringing',
          'connected': line.status === 'connected',
          'on-hold': line.status === 'on-hold',
        }"
      >
        <span class="line-number">{{ line.lineNumber }}</span>
        <span class="status-indicator"></span>
        <span v-if="line.remoteName" class="caller">
          {{ line.remoteName }}
        </span>
        <span v-if="line.duration" class="duration">
          {{ formatDuration(line.duration) }}
        </span>
      </button>
    </div>

    <!-- Active Line Controls -->
    <div v-if="selectedLine" class="line-controls">
      <button @click="holdLine" v-if="selectedLine.canHold">
        Hold
      </button>
      <button @click="resumeLine" v-if="selectedLine.canResume">
        Resume
      </button>
      <button @click="endCall" v-if="selectedLine.status !== 'idle'">
        End
      </button>
    </div>
  </div>
</template>`,
    },
    {
      title: 'Incoming Call on Available Line',
      description: 'Route incoming calls to available lines',
      code: `// Handle incoming call - find available line
const handleIncomingCall = (call: IncomingCall) => {
  const availableLine = lines.value.find(l => l.status === 'idle')

  if (!availableLine) {
    // All lines busy - reject or send to voicemail
    call.reject(486) // Busy Here
    showNotification('All lines are busy')
    return
  }

  // Assign call to available line
  assignCallToLine(call.id, availableLine.lineNumber)

  // Show incoming call notification
  showIncomingCallUI(availableLine.lineNumber, call)
}

// Answer on specific line
const answerOnLine = async (lineNumber: number) => {
  const line = lines.value.find(l => l.lineNumber === lineNumber)
  if (line?.status !== 'ringing') return

  // Auto-hold current call if any
  const currentActive = lines.value.find(
    l => l.status === 'connected' && l.isSelected
  )
  if (currentActive) {
    await multiLine.holdLine(currentActive.lineNumber)
  }

  // Answer and select the new line
  await multiLine.selectLine(lineNumber)
  await multiLine.answerLine(lineNumber)
}`,
    },
    {
      title: 'Park and Pickup Calls',
      description: 'Park calls and pick them up from other lines',
      code: `// Park a call from a line
const parkCall = async (lineNumber: number, parkSlot: string) => {
  const line = lines.value.find(l => l.lineNumber === lineNumber)
  if (!line?.callId) return

  // Transfer to park slot (PBX-specific)
  await blindTransfer(line.callId, \`sip:*70\${parkSlot}@pbx.example.com\`)

  showNotification(\`Call parked in slot \${parkSlot}\`)
}

// Pick up a parked call on available line
const pickupParkedCall = async (parkSlot: string) => {
  const availableLine = lines.value.find(l => l.status === 'idle')
  if (!availableLine) {
    showNotification('No available line for pickup')
    return
  }

  // Select the line and dial the pickup code
  await multiLine.selectLine(availableLine.lineNumber)
  await multiLine.makeCall(\`*71\${parkSlot}@pbx.example.com\`)
}

// Monitor park slots
const parkSlots = ref([
  { slot: '701', occupied: false, callerInfo: null },
  { slot: '702', occupied: false, callerInfo: null },
  { slot: '703', occupied: false, callerInfo: null },
])`,
    },
    {
      title: 'Conference from Multiple Lines',
      description: 'Merge lines into a conference call',
      code: `// Merge two lines into a conference
const mergeLines = async (line1: number, line2: number) => {
  const l1 = lines.value.find(l => l.lineNumber === line1)
  const l2 = lines.value.find(l => l.lineNumber === line2)

  if (!l1?.callId || !l2?.callId) {
    showNotification('Both lines must have active calls')
    return
  }

  // Create conference with both calls
  const conferenceId = await createConference([l1.callId, l2.callId])

  // Both lines are now in the same conference
  showNotification('Calls merged into conference')
}

// Add current call to existing conference
const addToConference = async (lineNumber: number, conferenceId: string) => {
  const line = lines.value.find(l => l.lineNumber === lineNumber)
  if (!line?.callId) return

  await addParticipantToConference(conferenceId, line.callId)
}

// Split conference back to individual lines
const splitConference = async (conferenceId: string) => {
  const calls = await getConferenceParticipants(conferenceId)

  for (const call of calls) {
    const availableLine = lines.value.find(l => l.status === 'idle')
    if (availableLine) {
      assignCallToLine(call.id, availableLine.lineNumber)
    }
  }

  await dissolveConference(conferenceId)
}`,
    },
  ],
}
