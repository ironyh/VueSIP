import type { ExampleDefinition } from './types'
import CustomRingtonesDemo from '../demos/CustomRingtonesDemo.vue'

export const customRingtonesExample: ExampleDefinition = {
  id: 'custom-ringtones',
  icon: '🔔',
  title: 'Custom Ringtones',
  description: 'Play custom audio for incoming calls',
  category: 'utility',
  tags: ['Audio', 'Customization', 'UI'],
  component: CustomRingtonesDemo,
  setupGuide: '<p>Customize the incoming call experience with different ringtones. Select from built-in tones or use custom audio files with volume control.</p>',
  codeSnippets: [
    {
      title: 'Ringtone Playback',
      description: 'Play audio on incoming calls',
      code: `import { ref, watch } from 'vue'
import { useCallSession } from 'vuesip'

const ringtone = ref<HTMLAudioElement | null>(null)

// Initialize ringtone
const initRingtone = () => {
  ringtone.value = new Audio('/ringtones/default.mp3')
  ringtone.value.loop = true
  ringtone.value.volume = 0.8
}

const { state } = useCallSession(sipClient)

watch(state, (newState, oldState) => {
  if (newState === 'incoming') {
    // Start ringing
    ringtone.value?.play()

    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([500, 250, 500])
    }
  } else if (oldState === 'incoming') {
    // Stop ringing
    ringtone.value?.pause()
    if (ringtone.value) ringtone.value.currentTime = 0
  }
})`,
    },
    {
      title: 'Ringtone Library',
      description: 'Manage multiple ringtone options',
      code: `interface Ringtone {
  id: string
  name: string
  file: string
  category: 'classic' | 'modern' | 'custom'
  duration?: number
}

const ringtoneLibrary: Ringtone[] = [
  { id: 'classic-ring', name: 'Classic Ring', file: '/ringtones/classic.mp3', category: 'classic' },
  { id: 'digital-tone', name: 'Digital Tone', file: '/ringtones/digital.mp3', category: 'modern' },
  { id: 'gentle-chime', name: 'Gentle Chime', file: '/ringtones/chime.mp3', category: 'modern' },
  { id: 'office-phone', name: 'Office Phone', file: '/ringtones/office.mp3', category: 'classic' },
  { id: 'soft-bell', name: 'Soft Bell', file: '/ringtones/bell.mp3', category: 'modern' },
]

const selectedRingtone = ref<string>('classic-ring')
const customRingtones = ref<Ringtone[]>([])

// Get combined list
const allRingtones = computed(() => [
  ...ringtoneLibrary,
  ...customRingtones.value,
])

// Get current ringtone
const currentRingtone = computed(() =>
  allRingtones.value.find(r => r.id === selectedRingtone.value)
)

// Group by category
const ringtonesByCategory = computed(() => {
  return allRingtones.value.reduce((acc, tone) => {
    if (!acc[tone.category]) acc[tone.category] = []
    acc[tone.category].push(tone)
    return acc
  }, {} as Record<string, Ringtone[]>)
})`,
    },
    {
      title: 'Contact-Specific Ringtones',
      description: 'Assign different ringtones per contact',
      code: `interface ContactRingtone {
  contactUri: string
  ringtoneId: string
}

const contactRingtones = ref<ContactRingtone[]>([])
const defaultRingtone = ref('classic-ring')

// Set ringtone for contact
const setContactRingtone = (contactUri: string, ringtoneId: string) => {
  const existing = contactRingtones.value.findIndex(c => c.contactUri === contactUri)

  if (existing >= 0) {
    contactRingtones.value[existing].ringtoneId = ringtoneId
  } else {
    contactRingtones.value.push({ contactUri, ringtoneId })
  }

  saveContactRingtones()
}

// Get ringtone for caller
const getRingtoneForCaller = (callerUri: string): Ringtone => {
  const contactPref = contactRingtones.value.find(c => c.contactUri === callerUri)
  const ringtoneId = contactPref?.ringtoneId || defaultRingtone.value

  return allRingtones.value.find(r => r.id === ringtoneId) || ringtoneLibrary[0]
}

// Play appropriate ringtone on incoming call
watch(incomingCall, (call) => {
  if (!call) return

  const ringtone = getRingtoneForCaller(call.remoteUri)
  playRingtone(ringtone.file)
})`,
    },
    {
      title: 'Custom Ringtone Upload',
      description: 'Allow users to upload their own ringtones',
      code: `const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']

const uploadCustomRingtone = async (file: File): Promise<Ringtone | null> => {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    showNotification('Invalid file type. Please upload MP3, WAV, OGG, or WebM.', 'error')
    return null
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    showNotification('File too large. Maximum size is 5MB.', 'error')
    return null
  }

  // Get audio duration
  const duration = await getAudioDuration(file)
  if (duration > 30) {
    showNotification('Ringtone too long. Maximum duration is 30 seconds.', 'error')
    return null
  }

  // Create object URL for local playback
  const fileUrl = URL.createObjectURL(file)

  // Generate unique ID
  const id = \`custom-\${Date.now()}\`

  const newRingtone: Ringtone = {
    id,
    name: file.name.replace(/\\.[^/.]+$/, ''),
    file: fileUrl,
    category: 'custom',
    duration,
  }

  customRingtones.value.push(newRingtone)
  saveCustomRingtones()

  return newRingtone
}

// Get audio duration
const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.onloadedmetadata = () => resolve(audio.duration)
    audio.onerror = reject
    audio.src = URL.createObjectURL(file)
  })
}`,
    },
    {
      title: 'Volume Control',
      description: 'Adjust ringtone volume with preview',
      code: `const ringtoneVolume = ref(80) // 0-100
const previewAudio = ref<HTMLAudioElement | null>(null)
const isPreviewing = ref(false)

// Apply volume to all audio
const applyVolume = (audio: HTMLAudioElement) => {
  audio.volume = ringtoneVolume.value / 100
}

// Preview ringtone
const previewRingtone = async (ringtone: Ringtone) => {
  // Stop any current preview
  if (previewAudio.value) {
    previewAudio.value.pause()
    previewAudio.value = null
  }

  isPreviewing.value = true
  previewAudio.value = new Audio(ringtone.file)
  applyVolume(previewAudio.value)

  previewAudio.value.onended = () => {
    isPreviewing.value = false
  }

  try {
    await previewAudio.value.play()
  } catch (error) {
    isPreviewing.value = false
    showNotification('Failed to play preview', 'error')
  }
}

// Stop preview
const stopPreview = () => {
  if (previewAudio.value) {
    previewAudio.value.pause()
    previewAudio.value.currentTime = 0
    previewAudio.value = null
  }
  isPreviewing.value = false
}

// Volume slider with live preview
watch(ringtoneVolume, (newVolume) => {
  if (previewAudio.value) {
    previewAudio.value.volume = newVolume / 100
  }
  localStorage.setItem('ringtone-volume', String(newVolume))
})`,
    },
    {
      title: 'Ringtone Selection UI',
      description: 'Complete ringtone picker component',
      code: `<template>
  <div class="ringtone-picker">
    <div class="volume-control">
      <label>
        <span>Volume</span>
        <input
          type="range"
          v-model.number="ringtoneVolume"
          min="0"
          max="100"
          step="5"
        />
        <span>{{ ringtoneVolume }}%</span>
      </label>
    </div>

    <div
      v-for="(tones, category) in ringtonesByCategory"
      :key="category"
      class="ringtone-category"
    >
      <h3>{{ category }}</h3>
      <ul class="ringtone-list">
        <li
          v-for="tone in tones"
          :key="tone.id"
          :class="{ selected: selectedRingtone === tone.id }"
          @click="selectedRingtone = tone.id"
        >
          <span class="name">{{ tone.name }}</span>
          <span class="duration" v-if="tone.duration">
            {{ Math.round(tone.duration) }}s
          </span>
          <button
            @click.stop="isPreviewing ? stopPreview() : previewRingtone(tone)"
            class="preview-btn"
          >
            {{ isPreviewing && previewAudio?.src.includes(tone.id) ? '⏹' : '▶' }}
          </button>
          <button
            v-if="tone.category === 'custom'"
            @click.stop="deleteCustomRingtone(tone.id)"
            class="delete-btn"
          >
            🗑️
          </button>
        </li>
      </ul>
    </div>

    <div class="upload-section">
      <input
        type="file"
        ref="fileInput"
        accept="audio/*"
        @change="handleFileSelect"
        style="display: none"
      />
      <button @click="$refs.fileInput.click()">
        Upload Custom Ringtone
      </button>
    </div>
  </div>
</template>`,
    },
    {
      title: 'Ringtone Persistence',
      description: 'Save and restore ringtone settings',
      code: `const STORAGE_KEYS = {
  selected: 'vuesip-selected-ringtone',
  volume: 'vuesip-ringtone-volume',
  custom: 'vuesip-custom-ringtones',
  contacts: 'vuesip-contact-ringtones',
}

// Save settings
const saveSettings = () => {
  localStorage.setItem(STORAGE_KEYS.selected, selectedRingtone.value)
  localStorage.setItem(STORAGE_KEYS.volume, String(ringtoneVolume.value))
}

const saveCustomRingtones = () => {
  // Store metadata only (files need to be re-uploaded)
  const metadata = customRingtones.value.map(r => ({
    id: r.id,
    name: r.name,
    duration: r.duration,
  }))
  localStorage.setItem(STORAGE_KEYS.custom, JSON.stringify(metadata))
}

const saveContactRingtones = () => {
  localStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(contactRingtones.value))
}

// Load settings on mount
onMounted(() => {
  // Load selected ringtone
  const saved = localStorage.getItem(STORAGE_KEYS.selected)
  if (saved && allRingtones.value.some(r => r.id === saved)) {
    selectedRingtone.value = saved
  }

  // Load volume
  const savedVolume = localStorage.getItem(STORAGE_KEYS.volume)
  if (savedVolume) {
    ringtoneVolume.value = Number(savedVolume)
  }

  // Load contact ringtones
  const savedContacts = localStorage.getItem(STORAGE_KEYS.contacts)
  if (savedContacts) {
    contactRingtones.value = JSON.parse(savedContacts)
  }
})

// Auto-save on changes
watch(selectedRingtone, saveSettings)
watch(ringtoneVolume, saveSettings)`,
    },
  ],
}
