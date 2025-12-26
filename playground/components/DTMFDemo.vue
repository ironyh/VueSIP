<script setup lang="ts">
import { ref } from 'vue'

const dtmfMode = ref<'rfc2833' | 'sipinfo'>('rfc2833')
const inputBuffer = ref('')
const toneHistory = ref<Array<{ digit: string; mode: string; time: string }>>([])
const events = ref<Array<{ time: string; type: string; data: string }>>([])
const isPlaying = ref(false)

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

const addEvent = (type: string, data: string) => {
  const now = new Date()
  events.value.unshift({
    time: now.toLocaleTimeString(),
    type,
    data,
  })
  if (events.value.length > 25) events.value.pop()
}

// Audio context for DTMF tones
let audioContext: AudioContext | null = null

const dtmfFrequencies: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
  A: [697, 1633],
  B: [770, 1633],
  C: [852, 1633],
  D: [941, 1633],
}

const playDTMFTone = (digit: string) => {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  const freqs = dtmfFrequencies[digit]
  if (!freqs) return

  const duration = 0.15
  const [lowFreq, highFreq] = freqs

  const osc1 = audioContext.createOscillator()
  const osc2 = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  osc1.frequency.value = lowFreq
  osc2.frequency.value = highFreq
  osc1.type = 'sine'
  osc2.type = 'sine'

  gainNode.gain.value = 0.1

  osc1.connect(gainNode)
  osc2.connect(gainNode)
  gainNode.connect(audioContext.destination)

  osc1.start()
  osc2.start()
  osc1.stop(audioContext.currentTime + duration)
  osc2.stop(audioContext.currentTime + duration)
}

const sendDTMF = (digit: string) => {
  inputBuffer.value += digit
  isPlaying.value = true

  // Play tone
  playDTMFTone(digit)

  const freqs = dtmfFrequencies[digit]

  toneHistory.value.unshift({
    digit,
    mode: dtmfMode.value,
    time: new Date().toLocaleTimeString(),
  })
  if (toneHistory.value.length > 10) toneHistory.value.pop()

  if (dtmfMode.value === 'rfc2833') {
    addEvent('DTMF', `Sending '${digit}' via RFC 2833 (in-band RTP)`)
    addEvent('RTP', `Event: ${digit}, Freq: ${freqs?.[0]}Hz + ${freqs?.[1]}Hz`)
    addEvent('RTP', 'Duration: 160ms, Volume: -10dBm')
  } else {
    addEvent('DTMF', `Sending '${digit}' via SIP INFO`)
    addEvent('SIP', `INFO sip:target@domain`)
    addEvent('SIP', `Content-Type: application/dtmf-relay`)
    addEvent('SIP', `Signal=${digit}, Duration=160`)
  }

  setTimeout(() => {
    isPlaying.value = false
  }, 150)
}

const clearBuffer = () => {
  inputBuffer.value = ''
  addEvent('DTMF', 'Input buffer cleared')
}

addEvent('DEMO', 'DTMF demo initialized')
addEvent('INFO', 'Click dialpad keys to send DTMF tones')
</script>

<template>
  <div class="demo-panel">
    <h2><span class="icon">🔢</span> DTMF Tones Demo</h2>

    <div class="status-bar">
      <div class="status-item">
        <span class="status-dot connected"></span>
        <span>Call Active</span>
      </div>
      <div class="status-item">
        <span>Mode: {{ dtmfMode === 'rfc2833' ? 'RFC 2833 (RTP)' : 'SIP INFO' }}</span>
      </div>
    </div>

    <div class="demo-section">
      <h3>DTMF Method</h3>
      <div class="transfer-type-tabs">
        <button
          :class="['transfer-type-tab', { active: dtmfMode === 'rfc2833' }]"
          @click="dtmfMode = 'rfc2833'"
        >
          📡 RFC 2833 (In-band)
        </button>
        <button
          :class="['transfer-type-tab', { active: dtmfMode === 'sipinfo' }]"
          @click="dtmfMode = 'sipinfo'"
        >
          📨 SIP INFO (Out-of-band)
        </button>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem">
        {{
          dtmfMode === 'rfc2833'
            ? 'RFC 2833: DTMF sent as named events in RTP stream (most compatible)'
            : 'SIP INFO: DTMF sent as SIP INFO messages (out-of-band signaling)'
        }}
      </p>
    </div>

    <div class="demo-section">
      <h3>Input Buffer</h3>
      <div class="input-group">
        <input
          :value="inputBuffer"
          class="input"
          readonly
          placeholder="Digits will appear here..."
          style="
            font-family: monospace;
            font-size: 1.5rem;
            letter-spacing: 0.5rem;
            text-align: center;
          "
        />
        <button class="btn btn-outline" @click="clearBuffer">Clear</button>
      </div>
    </div>

    <div class="demo-section">
      <h3>Dialpad</h3>
      <div class="dialpad">
        <button
          v-for="key in dialpadKeys"
          :key="key.digit"
          class="dialpad-key"
          @click="sendDTMF(key.digit)"
          :class="{ playing: isPlaying && inputBuffer.endsWith(key.digit) }"
        >
          {{ key.digit }}
          <span v-if="key.letters" class="letters">{{ key.letters }}</span>
        </button>
      </div>
    </div>

    <div class="demo-section">
      <h3>Extended Keys (A-D)</h3>
      <div class="btn-group">
        <button class="btn btn-outline" @click="sendDTMF('A')">A</button>
        <button class="btn btn-outline" @click="sendDTMF('B')">B</button>
        <button class="btn btn-outline" @click="sendDTMF('C')">C</button>
        <button class="btn btn-outline" @click="sendDTMF('D')">D</button>
      </div>
    </div>
  </div>

  <div class="demo-panel">
    <h2><span class="icon">📋</span> Tone Details</h2>

    <div class="demo-section">
      <h3>Recent Tones</h3>
      <div v-if="toneHistory.length === 0" style="color: var(--text-muted)">
        No tones sent yet - click the dialpad!
      </div>
      <div v-else style="display: flex; flex-wrap: wrap; gap: 0.5rem">
        <div
          v-for="(tone, i) in toneHistory"
          :key="i"
          style="
            background: var(--bg-input);
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            text-align: center;
          "
        >
          <div style="font-size: 1.5rem; font-weight: bold">{{ tone.digit }}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted)">{{ tone.mode }}</div>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3>Event Log</h3>
      <div class="event-log">
        <div v-for="(event, i) in events" :key="i" class="event-log-entry">
          <span class="event-time">{{ event.time }}</span>
          <span class="event-type">[{{ event.type }}]</span>
          <span class="event-data">{{ event.data }}</span>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3>API Usage</h3>
      <div class="code-preview">
        <code>
          <span class="keyword">import</span> { useDTMF } <span class="keyword">from</span>
          <span class="string">'vuesip'</span>

          <span class="keyword">const</span> { <span class="function">sendDTMF</span>,
          <span class="function">sendDTMFSequence</span>, dtmfMethod, isSending } =
          <span class="function">useDTMF</span>(callSession)

          <span class="comment">// Send single digit</span>
          <span class="keyword">await</span> <span class="function">sendDTMF</span>(<span
            class="string"
            >'5'</span
          >)

          <span class="comment">// Send sequence with timing</span>
          <span class="keyword">await</span> <span class="function">sendDTMFSequence</span>(<span
            class="string"
            >'1234#'</span
          >, { interDigitDelay: <span class="number">100</span>, duration:
          <span class="number">160</span>
          })

          <span class="comment">// Change method</span>
          dtmfMethod.value = <span class="string">'sipinfo'</span>
        </code>
      </div>
    </div>

    <div class="demo-section">
      <h3>DTMF Frequencies Reference</h3>
      <table style="width: 100%; font-size: 0.8rem; border-collapse: collapse">
        <thead>
          <tr style="border-bottom: 1px solid var(--border)">
            <th style="text-align: left; padding: 0.5rem">Key</th>
            <th style="text-align: left; padding: 0.5rem">Low Freq</th>
            <th style="text-align: left; padding: 0.5rem">High Freq</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(freqs, digit) in {
              '1': [697, 1209],
              '5': [770, 1336],
              '9': [852, 1477],
              '#': [941, 1477],
            }"
            :key="digit"
            style="border-bottom: 1px solid var(--border)"
          >
            <td style="padding: 0.5rem; font-weight: bold">{{ digit }}</td>
            <td style="padding: 0.5rem">{{ freqs[0] }} Hz</td>
            <td style="padding: 0.5rem">{{ freqs[1] }} Hz</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.dialpad-key.playing {
  background: var(--primary);
  border-color: var(--primary);
  transform: scale(0.95);
}
</style>
