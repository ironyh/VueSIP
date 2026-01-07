<script setup lang="ts">
import { ref } from 'vue'
import { useRecordingIndicator } from '../../src/composables/useRecordingIndicator'
import type { RecordingIndicatorState } from '../../src/types/recording-indicator.types'

// Create indicator instance with default settings
const indicator = useRecordingIndicator()

// Customization options
const customBlinkInterval = ref(500)
const customRecordingColor = ref('#ef4444')
const customPausedColor = ref('#eab308')
const customInactiveColor = ref('#6b7280')

// Create indicator with custom settings
const customIndicator = useRecordingIndicator({
  blinkInterval: customBlinkInterval.value,
  colors: {
    recording: customRecordingColor.value,
    paused: customPausedColor.value,
    inactive: customInactiveColor.value,
  },
})

// Update custom indicator when settings change
function updateCustomSettings() {
  customIndicator.setRecordingState('inactive')
  customIndicator.reset()

  // Create new instance with updated settings
  const newIndicator = useRecordingIndicator({
    blinkInterval: customBlinkInterval.value,
    colors: {
      recording: customRecordingColor.value,
      paused: customPausedColor.value,
      inactive: customInactiveColor.value,
    },
  })

  // Copy state from new instance
  Object.assign(customIndicator, newIndicator)
}

// Control functions
function setDefaultState(state: RecordingIndicatorState) {
  indicator.setRecordingState(state)
}

function setCustomState(state: RecordingIndicatorState) {
  customIndicator.setRecordingState(state)
}
</script>

<template>
  <div class="max-w-4xl mx-auto p-6 space-y-8">
    <div class="text-center mb-8">
      <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Recording Indicator Demo
      </h2>
      <p class="text-gray-600 dark:text-gray-400">
        Visual status indicators for recording sessions
      </p>
    </div>

    <!-- Default Indicator Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Default Indicator
      </h3>

      <!-- Indicator Display -->
      <div class="flex items-center justify-center gap-6 mb-6 p-8 bg-gray-100 dark:bg-gray-900 rounded-lg">
        <!-- Recording Dot -->
        <div class="flex flex-col items-center gap-2">
          <div
            :style="indicator.indicatorStyle.value"
            class="w-8 h-8 rounded-full"
            aria-label="Recording indicator"
          ></div>
          <span class="text-sm text-gray-600 dark:text-gray-400">Indicator</span>
        </div>

        <!-- Duration Display -->
        <div class="flex flex-col items-center gap-2">
          <div class="text-4xl font-mono font-bold text-gray-900 dark:text-white">
            {{ indicator.formattedDuration.value }}
          </div>
          <span class="text-sm text-gray-600 dark:text-gray-400">Duration</span>
        </div>
      </div>

      <!-- Control Buttons -->
      <div class="flex flex-wrap gap-3 justify-center mb-6">
        <button
          @click="setDefaultState('recording')"
          class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Record
        </button>
        <button
          @click="setDefaultState('paused')"
          class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
        >
          Pause
        </button>
        <button
          @click="setDefaultState('stopped')"
          class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Stop
        </button>
        <button
          @click="indicator.reset()"
          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          Reset
        </button>
      </div>

      <!-- State Information -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">State</div>
          <div class="font-semibold text-gray-900 dark:text-white capitalize">
            {{ indicator.state.value }}
          </div>
        </div>
        <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Is Recording</div>
          <div class="font-semibold text-gray-900 dark:text-white">
            {{ indicator.isRecording.value ? 'Yes' : 'No' }}
          </div>
        </div>
        <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Is Paused</div>
          <div class="font-semibold text-gray-900 dark:text-white">
            {{ indicator.isPaused.value ? 'Yes' : 'No' }}
          </div>
        </div>
        <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Blink State</div>
          <div class="font-semibold text-gray-900 dark:text-white">
            {{ indicator.blinkState.value ? 'Visible' : 'Hidden' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Indicator Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Custom Indicator
      </h3>

      <!-- Indicator Display -->
      <div class="flex items-center justify-center gap-6 mb-6 p-8 bg-gray-100 dark:bg-gray-900 rounded-lg">
        <div class="flex flex-col items-center gap-2">
          <div
            :style="customIndicator.indicatorStyle.value"
            class="w-8 h-8 rounded-full"
            aria-label="Custom recording indicator"
          ></div>
          <span class="text-sm text-gray-600 dark:text-gray-400">Indicator</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <div class="text-4xl font-mono font-bold text-gray-900 dark:text-white">
            {{ customIndicator.formattedDuration.value }}
          </div>
          <span class="text-sm text-gray-600 dark:text-gray-400">Duration</span>
        </div>
      </div>

      <!-- Control Buttons -->
      <div class="flex flex-wrap gap-3 justify-center mb-6">
        <button
          @click="setCustomState('recording')"
          class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Record
        </button>
        <button
          @click="setCustomState('paused')"
          class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
        >
          Pause
        </button>
        <button
          @click="setCustomState('stopped')"
          class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Stop
        </button>
        <button
          @click="customIndicator.reset()"
          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          Reset
        </button>
      </div>

      <!-- Customization Controls -->
      <div class="space-y-4 border-t dark:border-gray-700 pt-4">
        <h4 class="font-semibold text-gray-900 dark:text-white">Customization Options</h4>

        <!-- Blink Interval -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Blink Interval: {{ customBlinkInterval }}ms
          </label>
          <input
            v-model.number="customBlinkInterval"
            type="range"
            min="100"
            max="2000"
            step="100"
            @change="updateCustomSettings"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>

        <!-- Color Pickers -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recording Color
            </label>
            <div class="flex gap-2">
              <input
                v-model="customRecordingColor"
                type="color"
                @change="updateCustomSettings"
                class="h-10 w-20 rounded cursor-pointer"
              />
              <input
                v-model="customRecordingColor"
                type="text"
                @change="updateCustomSettings"
                class="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paused Color
            </label>
            <div class="flex gap-2">
              <input
                v-model="customPausedColor"
                type="color"
                @change="updateCustomSettings"
                class="h-10 w-20 rounded cursor-pointer"
              />
              <input
                v-model="customPausedColor"
                type="text"
                @change="updateCustomSettings"
                class="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Inactive Color
            </label>
            <div class="flex gap-2">
              <input
                v-model="customInactiveColor"
                type="color"
                @change="updateCustomSettings"
                class="h-10 w-20 rounded cursor-pointer"
              />
              <input
                v-model="customInactiveColor"
                type="text"
                @change="updateCustomSettings"
                class="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Overview -->
    <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
        Features
      </h3>
      <ul class="space-y-2 text-blue-800 dark:text-blue-200">
        <li class="flex items-start gap-2">
          <span class="text-blue-500 mt-1">✓</span>
          <span>Blinking animation when recording (customizable interval)</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-blue-500 mt-1">✓</span>
          <span>Duration tracking with MM:SS and HH:MM:SS formatting</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-blue-500 mt-1">✓</span>
          <span>Pause/resume support with accurate duration tracking</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-blue-500 mt-1">✓</span>
          <span>Customizable colors for each state</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-blue-500 mt-1">✓</span>
          <span>Reactive state management with Vue 3 composition API</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-blue-500 mt-1">✓</span>
          <span>Automatic cleanup on component unmount</span>
        </li>
      </ul>
    </div>
  </div>
</template>
