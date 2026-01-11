# Audio Devices

Complete audio device management with microphone and speaker selection.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#audio-devices) or run `pnpm dev` → Navigate to **AudioDevicesDemo** in the playground
:::

## Overview

Audio device management includes:

- Microphone enumeration and selection
- Speaker/output device selection
- Volume controls
- Device change detection
- Permission handling

## Quick Start

```vue
<script setup lang="ts">
import { useMediaDevices, useAudioDevices } from 'vuesip'

const {
  audioInputDevices,
  audioOutputDevices,
  selectedAudioInput,
  selectedAudioOutput,
  selectAudioInput,
  selectAudioOutput,
  requestPermissions,
  hasPermission,
} = useMediaDevices()

const { inputVolume, outputVolume, setInputVolume, setOutputVolume, inputLevel, testAudio } =
  useAudioDevices()

// Request microphone permission on mount
onMounted(async () => {
  await requestPermissions(true, false) // audio only
})
</script>

<template>
  <div class="audio-demo">
    <!-- Permission Request -->
    <div v-if="!hasPermission" class="permission-prompt">
      <p>Microphone access is required</p>
      <button @click="requestPermissions(true, false)">Grant Permission</button>
    </div>

    <template v-else>
      <!-- Microphone Selection -->
      <div class="device-section">
        <label>Microphone</label>
        <select
          :value="selectedAudioInput?.deviceId"
          @change="selectAudioInput($event.target.value)"
        >
          <option
            v-for="device in audioInputDevices"
            :key="device.deviceId"
            :value="device.deviceId"
          >
            {{ device.label }}
          </option>
        </select>

        <!-- Input Level Meter -->
        <div class="level-meter">
          <div class="level-bar" :style="{ width: `${inputLevel * 100}%` }" />
        </div>

        <!-- Input Volume -->
        <input
          type="range"
          :value="inputVolume"
          @input="setInputVolume(Number($event.target.value))"
          min="0"
          max="1"
          step="0.1"
        />
      </div>

      <!-- Speaker Selection -->
      <div class="device-section">
        <label>Speaker</label>
        <select
          :value="selectedAudioOutput?.deviceId"
          @change="selectAudioOutput($event.target.value)"
        >
          <option
            v-for="device in audioOutputDevices"
            :key="device.deviceId"
            :value="device.deviceId"
          >
            {{ device.label }}
          </option>
        </select>

        <!-- Output Volume -->
        <input
          type="range"
          :value="outputVolume"
          @input="setOutputVolume(Number($event.target.value))"
          min="0"
          max="1"
          step="0.1"
        />

        <!-- Test Audio -->
        <button @click="testAudio">Test Speaker</button>
      </div>
    </template>
  </div>
</template>
```

## Features

- **Device Enumeration**: List all available audio devices
- **Device Selection**: Choose input and output devices
- **Volume Control**: Adjust input/output levels
- **Level Metering**: Visual audio input indicator
- **Test Audio**: Play test sound through selected speaker
- **Hot-Swap**: Change devices during active calls
- **Permission Handling**: Request and check microphone permissions

## Key Composables

| Composable        | Purpose                          |
| ----------------- | -------------------------------- |
| `useMediaDevices` | Device enumeration and selection |
| `useAudioDevices` | Volume control and audio testing |

## Device Change Detection

```typescript
const { audioInputDevices, onDeviceChange } = useMediaDevices()

// Listen for device changes (plug/unplug)
onDeviceChange((devices) => {
  console.log('Devices changed:', devices)
  // Re-select default if current device was removed
})
```

## Permission Handling

```typescript
const { hasPermission, permissionState, requestPermissions } = useMediaDevices()

// Check permission state
// 'granted' | 'denied' | 'prompt'

// Request with specific media types
await requestPermissions(
  true, // audio
  false // video
)
```

## Change Device During Call

```typescript
const { currentCall } = useCallSession()
const { selectAudioInput } = useMediaDevices()

async function switchMicrophone(deviceId: string) {
  await selectAudioInput(deviceId)
  // Device change is automatically applied to active call
}
```

## Related

- [Basic Call](/examples/basic-call)
- [Video Calling](/examples/video-call)
- [Settings Persistence](/examples/settings)
- [Device Management Guide](/guide/device-management)
