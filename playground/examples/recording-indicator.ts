import type { ExampleDefinition } from './types'
import RecordingIndicatorDemo from '../demos/RecordingIndicatorDemo.vue'

export const recordingIndicatorExample: ExampleDefinition = {
  id: 'recording-indicator',
  icon: '🔴',
  title: 'Recording Indicator',
  description: 'Visual status indicators for recording sessions',
  category: 'sip',
  tags: ['Recording', 'UI', 'Indicator'],
  component: RecordingIndicatorDemo,
  setupGuide:
    '<p>Visual UI indicators for recording status including blinking animation, duration tracking, and color-coded states. Perfect for showing users when recording is active, paused, or stopped.</p>',
  codeSnippets: [
    {
      title: 'Basic Usage',
      description: 'Create a recording indicator with default settings',
      code: `import { useRecordingIndicator } from 'vuesip'

const {
  state,              // Current state: 'inactive' | 'recording' | 'paused' | 'stopped'
  isRecording,        // Computed: true when recording
  isPaused,           // Computed: true when paused
  duration,           // Duration in milliseconds
  formattedDuration,  // Formatted as MM:SS or HH:MM:SS
  blinkState,         // Blink animation state
  indicatorStyle,     // CSS styles for the indicator
  setRecordingState,  // Set the recording state
  reset,              // Reset to inactive and clear duration
} = useRecordingIndicator()

// Start recording
setRecordingState('recording')

// Pause recording
setRecordingState('paused')

// Stop recording
setRecordingState('stopped')

// Reset everything
reset()`,
    },
    {
      title: 'Integration with useLocalRecording',
      description: 'Combine recording indicator with actual recording functionality',
      code: `import { useRecordingIndicator, useLocalRecording, useCallSession } from 'vuesip'

// Recording functionality
const recording = useLocalRecording({
  mimeType: 'audio/webm',
  autoDownload: false,
})

// Visual indicator
const indicator = useRecordingIndicator()

// Call session
const { session } = useCallSession(sipClient)

// Start recording
const startRecording = async () => {
  if (!session.value?.remoteStream) return

  // Start actual recording
  recording.start(session.value.remoteStream, {
    callId: session.value.callId,
  })

  // Update indicator
  indicator.setRecordingState('recording')
}

// Pause recording
const pauseRecording = () => {
  recording.pause()
  indicator.setRecordingState('paused')
}

// Resume recording
const resumeRecording = () => {
  recording.resume()
  indicator.setRecordingState('recording')
}

// Stop recording
const stopRecording = async () => {
  const data = await recording.stop()
  indicator.setRecordingState('stopped')

  if (data) {
    recording.download(\`call-\${data.metadata?.callId}.webm\`)
  }
}

// Reset after done
const resetRecording = () => {
  recording.clear()
  indicator.reset()
}`,
    },
    {
      title: 'Custom Colors',
      description: 'Customize colors for different states',
      code: `const indicator = useRecordingIndicator({
  colors: {
    recording: '#ff0000',  // Bright red when recording
    paused: '#ffaa00',     // Orange when paused
    inactive: '#999999',   // Gray when inactive
  },
})

// Or use theme colors
const indicator = useRecordingIndicator({
  colors: {
    recording: 'rgb(239, 68, 68)',    // Tailwind red-500
    paused: 'rgb(234, 179, 8)',       // Tailwind yellow-500
    inactive: 'rgb(107, 114, 128)',   // Tailwind gray-500
  },
})`,
    },
    {
      title: 'Custom Blink Interval',
      description: 'Adjust the blink animation speed',
      code: `// Fast blinking (300ms)
const fastIndicator = useRecordingIndicator({
  blinkInterval: 300,
})

// Slow blinking (1000ms)
const slowIndicator = useRecordingIndicator({
  blinkInterval: 1000,
})

// Default is 500ms
const defaultIndicator = useRecordingIndicator()`,
    },
    {
      title: 'UI Template',
      description: 'Example Vue template with recording indicator',
      code: `<template>
  <div class="recording-controls">
    <!-- Recording Indicator -->
    <div class="flex items-center gap-3">
      <!-- Blinking dot -->
      <div
        :style="indicator.indicatorStyle.value"
        class="w-4 h-4 rounded-full"
        aria-label="Recording indicator"
      />

      <!-- Duration display -->
      <span class="font-mono font-bold text-lg">
        {{ indicator.formattedDuration.value }}
      </span>

      <!-- State label -->
      <span class="text-sm text-gray-600 capitalize">
        {{ indicator.state.value }}
      </span>
    </div>

    <!-- Control buttons -->
    <div class="flex gap-2 mt-4">
      <button
        v-if="!indicator.isRecording.value && !indicator.isPaused.value"
        @click="startRecording"
        class="px-4 py-2 bg-red-500 text-white rounded"
      >
        Start Recording
      </button>

      <template v-else>
        <button
          v-if="indicator.isRecording.value"
          @click="pauseRecording"
          class="px-4 py-2 bg-yellow-500 text-white rounded"
        >
          Pause
        </button>

        <button
          v-if="indicator.isPaused.value"
          @click="resumeRecording"
          class="px-4 py-2 bg-green-500 text-white rounded"
        >
          Resume
        </button>

        <button
          @click="stopRecording"
          class="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Stop
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRecordingIndicator } from 'vuesip'

const indicator = useRecordingIndicator()

const startRecording = () => {
  indicator.setRecordingState('recording')
}

const pauseRecording = () => {
  indicator.setRecordingState('paused')
}

const resumeRecording = () => {
  indicator.setRecordingState('recording')
}

const stopRecording = () => {
  indicator.setRecordingState('stopped')
}
</script>`,
    },
    {
      title: 'Styled Indicator Component',
      description: 'Pre-styled recording indicator component',
      code: `<template>
  <div class="recording-indicator-badge" :class="indicator.state.value">
    <div class="indicator-dot" :style="indicator.indicatorStyle.value" />
    <span class="indicator-text">{{ indicator.state.value }}</span>
    <span class="indicator-duration">{{ indicator.formattedDuration.value }}</span>
  </div>
</template>

<style scoped>
.recording-indicator-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px);
}

.indicator-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition: opacity 0.2s ease-in-out;
}

.indicator-text {
  font-size: 14px;
  font-weight: 500;
  text-transform: capitalize;
}

.indicator-duration {
  font-family: monospace;
  font-size: 16px;
  font-weight: 700;
}

/* State-specific styles */
.recording-indicator-badge.recording {
  background: rgba(239, 68, 68, 0.1);
}

.recording-indicator-badge.paused {
  background: rgba(234, 179, 8, 0.1);
}

.recording-indicator-badge.inactive,
.recording-indicator-badge.stopped {
  background: rgba(107, 114, 128, 0.1);
}
</style>`,
    },
    {
      title: 'Watch State Changes',
      description: 'React to recording state changes',
      code: `import { watch } from 'vue'
import { useRecordingIndicator } from 'vuesip'

const indicator = useRecordingIndicator()

// Watch state changes
watch(() => indicator.state.value, (newState, oldState) => {
  console.log(\`Recording state changed from \${oldState} to \${newState}\`)

  // Show notifications
  switch (newState) {
    case 'recording':
      showNotification('Recording started', 'info')
      break
    case 'paused':
      showNotification('Recording paused', 'warning')
      break
    case 'stopped':
      showNotification('Recording stopped', 'success')
      break
  }
})

// Watch duration for auto-stop
watch(() => indicator.duration.value, (duration) => {
  const maxDuration = 60 * 60 * 1000 // 1 hour
  if (duration >= maxDuration) {
    indicator.setRecordingState('stopped')
    showNotification('Recording stopped: Maximum duration reached', 'warning')
  }
})`,
    },
    {
      title: 'Initial State',
      description: 'Start with a specific state',
      code: `// Start in recording state
const indicator = useRecordingIndicator({
  initialState: 'recording',
})

// Start paused
const pausedIndicator = useRecordingIndicator({
  initialState: 'paused',
})

// Default is 'inactive'
const defaultIndicator = useRecordingIndicator()`,
    },
  ],
}
