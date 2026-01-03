<template>
  <div class="media-settings">
    <!-- Audio Codecs -->
    <div class="settings-section">
      <h3 class="section-title">Audio Codecs</h3>

      <div class="form-group">
        <label for="audio-codec" class="form-label">Preferred Audio Codec</label>
        <select
          id="audio-codec"
          v-model="localSettings.audioCodec"
          class="form-select"
          @change="emitUpdate"
        >
          <option value="opus">Opus (Recommended - Best Quality)</option>
          <option value="pcmu">PCMU / G.711μ (Wideband)</option>
          <option value="pcma">PCMA / G.711a (Wideband)</option>
          <option value="g722">G.722 (HD Voice)</option>
        </select>
        <p class="help-text">
          Opus provides best quality and bandwidth efficiency. Fallback to other codecs if not
          supported.
        </p>
      </div>

      <!-- Audio Quality Preset -->
      <div class="form-group">
        <label class="form-label">Audio Quality Preset</label>
        <div class="preset-buttons">
          <button
            v-for="preset in audioPresets"
            :key="preset.value"
            class="preset-btn"
            :class="{ active: audioQualityPreset === preset.value }"
            @click="selectAudioPreset(preset.value)"
          >
            {{ preset.label }}
          </button>
        </div>
        <p class="help-text">
          {{ audioPresets.find((p) => p.value === audioQualityPreset)?.description }}
        </p>
      </div>
    </div>

    <!-- Video Codecs -->
    <div class="settings-section">
      <h3 class="section-title">Video Codecs</h3>

      <div class="form-group">
        <label for="video-codec" class="form-label">Preferred Video Codec</label>
        <select
          id="video-codec"
          v-model="localSettings.videoCodec"
          class="form-select"
          @change="emitUpdate"
        >
          <option value="vp8">VP8 (Wide Compatibility)</option>
          <option value="vp9">VP9 (Better Compression)</option>
          <option value="h264">H.264 (Best Hardware Support)</option>
        </select>
        <p class="help-text">
          H.264 has best hardware acceleration. VP9 provides better compression at cost of CPU.
        </p>
      </div>

      <!-- Video Quality Settings -->
      <div class="form-group">
        <label for="video-resolution" class="form-label">Video Resolution</label>
        <select
          id="video-resolution"
          v-model="videoResolution"
          class="form-select"
          @change="updateVideoConstraints"
        >
          <option value="qvga">QVGA (320x240) - Low Bandwidth</option>
          <option value="vga">VGA (640x480) - Standard</option>
          <option value="hd">HD (1280x720) - High Quality</option>
          <option value="fhd">Full HD (1920x1080) - Premium</option>
        </select>
        <p class="help-text">Higher resolution requires more bandwidth and CPU</p>
      </div>

      <div class="form-group">
        <label class="form-label">
          Frame Rate
          <span class="volume-value">{{ videoFramerate }} fps</span>
        </label>
        <input
          v-model.number="videoFramerate"
          type="range"
          class="range-slider"
          min="15"
          max="60"
          step="5"
          @change="updateVideoConstraints"
        />
        <p class="help-text">Higher frame rates provide smoother video (15-60 fps)</p>
      </div>

      <div class="form-group">
        <label class="form-label">
          Bitrate
          <span class="volume-value">{{ videoBitrate }} kbps</span>
        </label>
        <input
          v-model.number="videoBitrate"
          type="range"
          class="range-slider"
          min="256"
          max="4096"
          step="128"
          @change="updateVideoConstraints"
        />
        <p class="help-text">
          Higher bitrate improves quality but uses more bandwidth (256-4096 kbps)
        </p>
      </div>
    </div>

    <!-- Audio Processing -->
    <div class="settings-section">
      <h3 class="section-title">Audio Processing</h3>

      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.echoCancellation"
            type="checkbox"
            class="checkbox-input"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Echo Cancellation</span>
        </label>
        <p class="help-text">Removes acoustic echo from speaker feedback (Recommended: ON)</p>
      </div>

      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.noiseSuppression"
            type="checkbox"
            class="checkbox-input"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Noise Suppression</span>
        </label>
        <p class="help-text">
          Reduces background noise like typing, fans, traffic (Recommended: ON)
        </p>
      </div>

      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.autoGainControl"
            type="checkbox"
            class="checkbox-input"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Auto Gain Control</span>
        </label>
        <p class="help-text">Automatically adjusts microphone volume levels (Recommended: ON)</p>
      </div>
    </div>

    <!-- Advanced Media Constraints -->
    <div class="settings-section">
      <h3 class="section-title">Advanced Settings</h3>

      <div class="form-group">
        <label class="form-label">Custom Audio Constraints (JSON)</label>
        <textarea
          v-model="audioConstraintsJson"
          class="form-textarea"
          :class="{ 'input-error': audioConstraintsError }"
          rows="4"
          placeholder='{"sampleRate": 48000, "channelCount": 2}'
          @blur="validateAudioConstraints"
        ></textarea>
        <p v-if="audioConstraintsError" class="error-text">{{ audioConstraintsError }}</p>
        <p class="help-text">
          Advanced MediaTrackConstraints for audio. Leave empty for defaults.
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints"
            target="_blank"
            class="help-link"
            >Documentation</a
          >
        </p>
      </div>

      <div class="form-group">
        <label class="form-label">Custom Video Constraints (JSON)</label>
        <textarea
          v-model="videoConstraintsJson"
          class="form-textarea"
          :class="{ 'input-error': videoConstraintsError }"
          rows="4"
          placeholder='{"aspectRatio": 16/9, "facingMode": "user"}'
          @blur="validateVideoConstraints"
        ></textarea>
        <p v-if="videoConstraintsError" class="error-text">{{ videoConstraintsError }}</p>
        <p class="help-text">
          Advanced MediaTrackConstraints for video. Leave empty for defaults.
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints"
            target="_blank"
            class="help-link"
            >Documentation</a
          >
        </p>
      </div>

      <!-- Reset to Defaults -->
      <button class="btn btn-secondary" @click="resetToDefaults">🔄 Reset to Defaults</button>
    </div>

    <!-- Current Configuration Preview -->
    <div class="settings-section">
      <h3 class="section-title">Current Configuration</h3>

      <div class="config-preview">
        <pre><code>{{ configPreview }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import type { MediaConfiguration } from '../../../src/types/config.types'

interface Props {
  modelValue: Partial<MediaConfiguration>
}

interface Emits {
  (e: 'update:modelValue', value: Partial<MediaConfiguration>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Audio presets
const audioPresets = [
  { value: 'low', label: 'Low', description: 'Optimized for slow connections (16kbps, mono)' },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Balanced quality and bandwidth (32kbps, stereo)',
  },
  {
    value: 'high',
    label: 'High',
    description: 'Best quality for good connections (64kbps, stereo)',
  },
  { value: 'custom', label: 'Custom', description: 'Manual configuration of audio parameters' },
]

// Local settings
const localSettings = reactive<Partial<MediaConfiguration>>({
  audioCodec: props.modelValue.audioCodec || 'opus',
  videoCodec: props.modelValue.videoCodec || 'vp8',
  echoCancellation: props.modelValue.echoCancellation ?? true,
  noiseSuppression: props.modelValue.noiseSuppression ?? true,
  autoGainControl: props.modelValue.autoGainControl ?? true,
  audio: props.modelValue.audio || true,
  video: props.modelValue.video || false,
})

const audioQualityPreset = ref<string>('medium')
const videoResolution = ref<string>('vga')
const videoFramerate = ref(30)
const videoBitrate = ref(1024)

const audioConstraintsJson = ref('')
const videoConstraintsJson = ref('')
const audioConstraintsError = ref('')
const videoConstraintsError = ref('')

// Select audio preset
function selectAudioPreset(preset: string) {
  audioQualityPreset.value = preset

  switch (preset) {
    case 'low':
      localSettings.audio = {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
      break
    case 'medium':
      localSettings.audio = {
        sampleRate: 32000,
        channelCount: 2,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
      break
    case 'high':
      localSettings.audio = {
        sampleRate: 48000,
        channelCount: 2,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
      break
  }

  emitUpdate()
}

// Update video constraints
function updateVideoConstraints() {
  const resolutions: Record<string, { width: number; height: number }> = {
    qvga: { width: 320, height: 240 },
    vga: { width: 640, height: 480 },
    hd: { width: 1280, height: 720 },
    fhd: { width: 1920, height: 1080 },
  }

  const resolution = resolutions[videoResolution.value]

  localSettings.video = {
    width: { ideal: resolution.width },
    height: { ideal: resolution.height },
    frameRate: { ideal: videoFramerate.value },
    facingMode: 'user',
  }

  emitUpdate()
}

// Validate JSON constraints
function validateAudioConstraints() {
  if (!audioConstraintsJson.value.trim()) {
    audioConstraintsError.value = ''
    return
  }

  try {
    const constraints = JSON.parse(audioConstraintsJson.value)
    localSettings.audio = constraints
    audioConstraintsError.value = ''
    emitUpdate()
  } catch {
    audioConstraintsError.value = 'Invalid JSON format'
  }
}

function validateVideoConstraints() {
  if (!videoConstraintsJson.value.trim()) {
    videoConstraintsError.value = ''
    return
  }

  try {
    const constraints = JSON.parse(videoConstraintsJson.value)
    localSettings.video = constraints
    videoConstraintsError.value = ''
    emitUpdate()
  } catch {
    videoConstraintsError.value = 'Invalid JSON format'
  }
}

// Reset to defaults
function resetToDefaults() {
  localSettings.audioCodec = 'opus'
  localSettings.videoCodec = 'vp8'
  localSettings.echoCancellation = true
  localSettings.noiseSuppression = true
  localSettings.autoGainControl = true

  audioQualityPreset.value = 'medium'
  videoResolution.value = 'vga'
  videoFramerate.value = 30
  videoBitrate.value = 1024

  audioConstraintsJson.value = ''
  videoConstraintsJson.value = ''

  selectAudioPreset('medium')
  updateVideoConstraints()
}

// Configuration preview
const configPreview = computed(() => {
  return JSON.stringify(localSettings, null, 2)
})

// Emit updates
function emitUpdate() {
  emit('update:modelValue', { ...localSettings })
}

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    Object.assign(localSettings, newValue)
  },
  { deep: true }
)
</script>

<style scoped>
.media-settings {
  max-width: 800px;
}

.settings-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.section-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.volume-value {
  color: #667eea;
  font-weight: 600;
  font-size: 0.8125rem;
}

.form-select {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  resize: vertical;
  transition: all 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-textarea.input-error {
  border-color: #dc2626;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.preset-btn {
  padding: 0.625rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  border-color: #667eea;
}

.preset-btn.active {
  border-color: #667eea;
  background: #eff6ff;
  color: #667eea;
}

.range-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  transition: all 0.2s;
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.range-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 0.5rem;
}

.checkbox-input {
  width: 1.125rem;
  height: 1.125rem;
  margin-right: 0.625rem;
  cursor: pointer;
  accent-color: #667eea;
}

.checkbox-text {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.help-text {
  margin: 0.375rem 0 0 0;
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

.help-link {
  color: #667eea;
  text-decoration: none;
}

.help-link:hover {
  text-decoration: underline;
}

.error-text {
  margin: 0.375rem 0 0 0;
  font-size: 0.75rem;
  color: #dc2626;
}

.config-preview {
  background: #1e1e1e;
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
}

.config-preview pre {
  margin: 0;
}

.config-preview code {
  color: #d4d4d4;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}
</style>
