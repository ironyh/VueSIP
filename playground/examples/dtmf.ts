import type { ExampleDefinition } from './types'
import DtmfDemo from '../demos/DtmfDemo.vue'

export const dtmfExample: ExampleDefinition = {
  id: 'dtmf',
  icon: '🔢',
  title: 'DTMF Tones',
  description: 'Send dialpad tones during calls',
  category: 'sip',
  tags: ['Audio', 'DTMF', 'Interactive'],
  component: DtmfDemo,
  setupGuide: '<p>DTMF (Dual-Tone Multi-Frequency) allows you to send dialpad tones during an active call, useful for IVR systems and menu navigation.</p>',
  codeSnippets: [
    {
      title: 'Sending DTMF Tones',
      description: 'Send individual digits or sequences',
      code: `import { useDTMF } from 'vuesip'

const { sendTone, canSendDTMF } = useDTMF(sessionRef)

// Send a single digit
await sendTone('1')

// Send a sequence with delay between tones
for (const digit of '1234') {
  await sendTone(digit)
  await new Promise(resolve => setTimeout(resolve, 100))
}`,
    },
    {
      title: 'DTMF Configuration',
      description: 'Configure DTMF behavior and transport',
      code: `import { useDTMF, DTMFTransport } from 'vuesip'

const dtmf = useDTMF(sessionRef, {
  // Choose DTMF transport method
  transport: DTMFTransport.RFC2833, // or 'INFO', 'INBAND'

  // Tone duration in milliseconds
  duration: 100,

  // Gap between tones in sequences
  interToneGap: 70,

  // Volume level (0-100)
  volume: 80,
})

// Valid DTMF digits: 0-9, *, #, A-D
const validDigits = ['0','1','2','3','4','5','6','7','8','9','*','#','A','B','C','D']`,
    },
    {
      title: 'IVR Menu Navigation',
      description: 'Navigate automated phone systems',
      code: `// Send PIN code to IVR
const enterPin = async (pin: string) => {
  for (const digit of pin) {
    await sendTone(digit)
    await delay(150)
  }
}

// Navigate menu selections
const selectOption = async (option: string) => {
  await sendTone(option)
}

// Common IVR patterns
const ivrPatterns = {
  mainMenu: '1',
  salesDept: '2',
  support: '3',
  operator: '0',
  repeatMenu: '*',
  goBack: '#',
}

// Usage
await enterPin('1234')
await delay(500)
await selectOption(ivrPatterns.support)`,
    },
    {
      title: 'DTMF Dialpad Component',
      description: 'Build a visual DTMF dialpad',
      code: `<template>
  <div class="dialpad">
    <button
      v-for="key in dialpadKeys"
      :key="key.digit"
      @mousedown="startTone(key.digit)"
      @mouseup="stopTone()"
      @mouseleave="stopTone()"
      :disabled="!canSendDTMF"
    >
      <span class="digit">{{ key.digit }}</span>
      <span class="letters">{{ key.letters }}</span>
    </button>
  </div>
</template>

<script setup>
const dialpadKeys = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
]

const { sendTone, canSendDTMF, playLocalTone, stopLocalTone } = useDTMF(session)

const startTone = async (digit: string) => {
  // Play local audio feedback
  playLocalTone(digit)
  // Send DTMF to remote party
  await sendTone(digit)
}

const stopTone = () => {
  stopLocalTone()
}
</script>`,
    },
    {
      title: 'Keyboard DTMF Input',
      description: 'Send DTMF using keyboard shortcuts',
      code: `import { onMounted, onUnmounted } from 'vue'

const { sendTone, canSendDTMF } = useDTMF(sessionRef)

const handleKeyDown = async (event: KeyboardEvent) => {
  if (!canSendDTMF.value) return

  const key = event.key.toUpperCase()
  const validKeys = '0123456789*#ABCD'

  if (validKeys.includes(key)) {
    event.preventDefault()
    await sendTone(key)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})`,
    },
    {
      title: 'DTMF Sequence Macros',
      description: 'Create reusable DTMF sequences',
      code: `// Define common sequences
const dtmfMacros = {
  voicemailAccess: '1234#',
  conferenceJoin: (code: string) => \`*67*\${code}#\`,
  callPark: '*68',
  callPickup: '*69',
  blindTransfer: (ext: string) => \`##\${ext}\`,
}

// Execute a sequence with proper timing
const executeSequence = async (sequence: string) => {
  for (const digit of sequence) {
    await sendTone(digit)
    await delay(100)
  }
}

// Usage examples
await executeSequence(dtmfMacros.voicemailAccess)
await executeSequence(dtmfMacros.conferenceJoin('5678'))
await executeSequence(dtmfMacros.blindTransfer('101'))`,
    },
  ],
}
