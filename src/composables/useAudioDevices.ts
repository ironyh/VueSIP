/**
 * useAudioDevices - Vue composable for audio/video device management
 * Provides reactive device lists, selection, and stream management
 */

import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import { AudioManager } from '@/core/AudioManager'
import type {
  AudioDevice,
  AudioConstraints,
  AudioPermissionState,
  AudioDeviceChangeEvent,
} from '@/types/audio.types'

export interface UseAudioDevicesReturn {
  // Device lists
  microphones: Readonly<Ref<AudioDevice[]>>
  speakers: Readonly<Ref<AudioDevice[]>>
  cameras: Readonly<Ref<AudioDevice[]>>
  allDevices: Readonly<Ref<AudioDevice[]>>

  // Current devices
  currentMicrophone: Readonly<Ref<AudioDevice | null>>
  currentSpeaker: Readonly<Ref<AudioDevice | null>>
  currentCamera: Readonly<Ref<AudioDevice | null>>

  // State
  permissionStatus: Readonly<Ref<AudioPermissionState>>
  isLoading: Readonly<Ref<boolean>>
  error: Ref<string | null>

  // Methods
  refreshDevices: () => Promise<void>
  requestPermissions: () => Promise<boolean>
  checkAudioPermission: () => Promise<AudioPermissionState>
  checkVideoPermission: () => Promise<AudioPermissionState>
  selectMicrophone: (deviceId: string) => Promise<void>
  selectSpeaker: (deviceId: string) => Promise<void>
  selectCamera: (deviceId: string) => Promise<void>
  selectDefaultMicrophone: () => Promise<void>
  selectDefaultSpeaker: () => Promise<void>
  selectDefaultCamera: () => Promise<void>
  createAudioStream: (constraints?: AudioConstraints) => Promise<MediaStream | null>
  createVideoStream: (constraints?: MediaStreamConstraints) => Promise<MediaStream | null>
  getCurrentAudioStream: () => MediaStream | null
  getMicrophoneById: (deviceId: string) => AudioDevice | undefined
  getSpeakerById: (deviceId: string) => AudioDevice | undefined
  getCameraById: (deviceId: string) => AudioDevice | undefined
  isDeviceAvailable: (deviceId: string) => boolean
  onDeviceAdded: (callback: (device: AudioDevice) => void) => () => void
  onDeviceRemoved: (callback: (device: AudioDevice) => void) => () => void
  cleanup: () => void
}

// Helper to make ref readonly
function readonly<T>(r: Ref<T>): Readonly<Ref<T>> {
  return r as Readonly<Ref<T>>
}

export function useAudioDevices(): UseAudioDevicesReturn {
  // Audio manager instance
  const audioManager = new AudioManager()

  // Reactive state
  const microphones = ref<AudioDevice[]>([])
  const speakers = ref<AudioDevice[]>([])
  const cameras = ref<AudioDevice[]>([])
  const currentMicrophone = ref<AudioDevice | null>(null)
  const currentSpeaker = ref<AudioDevice | null>(null)
  const currentCamera = ref<AudioDevice | null>(null)
  const permissionStatus = ref<AudioPermissionState>('prompt')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Device change callbacks
  const deviceAddedCallbacks = new Set<(device: AudioDevice) => void>()
  const deviceRemovedCallbacks = new Set<(device: AudioDevice) => void>()

  // Computed
  const allDevices = computed(() => [...microphones.value, ...speakers.value, ...cameras.value])

  /**
   * Refresh device lists
   */
  async function refreshDevices(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const devices = await audioManager.enumerateDevices()

      // Filter by device kind
      microphones.value = devices.filter((d) => d.kind === 'audioinput')
      speakers.value = devices.filter((d) => d.kind === 'audiooutput')
      cameras.value = devices.filter((d) => d.kind === 'videoinput')

      // Update current devices
      currentMicrophone.value = audioManager.getCurrentInputDevice()
      currentSpeaker.value = audioManager.getCurrentOutputDevice()
    } catch (err) {
      const errorMessage = (err as Error).message
      error.value = errorMessage
      console.error('Failed to enumerate devices:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Request media permissions
   */
  async function requestPermissions(): Promise<boolean> {
    try {
      // Request both audio and video permissions
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      permissionStatus.value = 'granted'

      // Enumerate devices after permission granted
      await refreshDevices()

      return true
    } catch (err) {
      const domErr = err as DOMException
      if (domErr.name === 'NotAllowedError') {
        permissionStatus.value = 'denied'
      }
      error.value = domErr.message
      return false
    }
  }

  /**
   * Check audio permission status
   */
  async function checkAudioPermission(): Promise<AudioPermissionState> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      permissionStatus.value = result.state as AudioPermissionState
      return result.state as AudioPermissionState
    } catch (_err) {
      // Fallback: try to get devices and check labels
      const devices = await audioManager.enumerateDevices()
      const hasLabels = devices.some((d) => d.label !== '')
      permissionStatus.value = hasLabels ? 'granted' : 'prompt'
      return permissionStatus.value
    }
  }

  /**
   * Check video permission status
   */
  async function checkVideoPermission(): Promise<AudioPermissionState> {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
      return result.state as AudioPermissionState
    } catch (_err) {
      // Fallback
      const devices = await audioManager.enumerateDevices()
      const videoDevices = devices.filter((d) => d.kind === 'videoinput')
      const hasLabels = videoDevices.some((d) => d.label !== '')
      return hasLabels ? 'granted' : 'prompt'
    }
  }

  /**
   * Select microphone by device ID
   */
  async function selectMicrophone(deviceId: string): Promise<void> {
    error.value = null

    try {
      await audioManager.setInputDevice(deviceId)
      currentMicrophone.value = audioManager.getCurrentInputDevice()
    } catch (err) {
      error.value = (err as Error).message
      throw err
    }
  }

  /**
   * Select speaker by device ID
   */
  async function selectSpeaker(deviceId: string): Promise<void> {
    error.value = null

    try {
      await audioManager.setOutputDevice(deviceId)
      currentSpeaker.value = audioManager.getCurrentOutputDevice()
    } catch (err) {
      error.value = (err as Error).message
      throw err
    }
  }

  /**
   * Select camera by device ID
   */
  async function selectCamera(deviceId: string): Promise<void> {
    error.value = null

    try {
      // Create video stream with selected camera
      await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      })

      // Update current camera
      const device = cameras.value.find((c) => c.deviceId === deviceId)
      if (device) {
        currentCamera.value = device
      }
    } catch (err) {
      error.value = (err as Error).message
      throw err
    }
  }

  /**
   * Select default microphone (first available)
   */
  async function selectDefaultMicrophone(): Promise<void> {
    if (microphones.value.length === 0) {
      await refreshDevices()
    }

    const defaultMic = microphones.value[0]
    if (defaultMic) {
      await selectMicrophone(defaultMic.deviceId)
    }
  }

  /**
   * Select default speaker (first available)
   */
  async function selectDefaultSpeaker(): Promise<void> {
    if (speakers.value.length === 0) {
      await refreshDevices()
    }

    const defaultSpeaker = speakers.value[0]
    if (defaultSpeaker) {
      await selectSpeaker(defaultSpeaker.deviceId)
    }
  }

  /**
   * Select default camera (first available)
   */
  async function selectDefaultCamera(): Promise<void> {
    if (cameras.value.length === 0) {
      await refreshDevices()
    }

    const defaultCamera = cameras.value[0]
    if (defaultCamera) {
      await selectCamera(defaultCamera.deviceId)
    }
  }

  /**
   * Create audio stream with constraints
   */
  async function createAudioStream(constraints?: AudioConstraints): Promise<MediaStream | null> {
    error.value = null

    try {
      if (constraints?.deviceId && typeof constraints.deviceId === 'string') {
        await audioManager.setInputDevice(constraints.deviceId)
      }

      if (constraints) {
        await audioManager.applyConstraints(constraints)
      }

      return audioManager.getCurrentStream()
    } catch (err) {
      error.value = (err as Error).message
      return null
    }
  }

  /**
   * Create video stream with constraints
   */
  async function createVideoStream(
    constraints?: MediaStreamConstraints
  ): Promise<MediaStream | null> {
    error.value = null

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints?.video || true,
        audio: false,
      })

      return stream
    } catch (err) {
      error.value = (err as Error).message
      return null
    }
  }

  /**
   * Get current audio stream
   */
  function getCurrentAudioStream(): MediaStream | null {
    return audioManager.getCurrentStream()
  }

  /**
   * Get microphone by ID
   */
  function getMicrophoneById(deviceId: string): AudioDevice | undefined {
    return microphones.value.find((m) => m.deviceId === deviceId)
  }

  /**
   * Get speaker by ID
   */
  function getSpeakerById(deviceId: string): AudioDevice | undefined {
    return speakers.value.find((s) => s.deviceId === deviceId)
  }

  /**
   * Get camera by ID
   */
  function getCameraById(deviceId: string): AudioDevice | undefined {
    return cameras.value.find((c) => c.deviceId === deviceId)
  }

  /**
   * Check if device is available
   */
  function isDeviceAvailable(deviceId: string): boolean {
    return allDevices.value.some((d) => d.deviceId === deviceId)
  }

  /**
   * Listen for device added events
   */
  function onDeviceAdded(callback: (device: AudioDevice) => void): () => void {
    deviceAddedCallbacks.add(callback)
    return () => {
      deviceAddedCallbacks.delete(callback)
    }
  }

  /**
   * Listen for device removed events
   */
  function onDeviceRemoved(callback: (device: AudioDevice) => void): () => void {
    deviceRemovedCallbacks.add(callback)
    return () => {
      deviceRemovedCallbacks.delete(callback)
    }
  }

  /**
   * Handle device change events
   */
  function handleDeviceChange(event: AudioDeviceChangeEvent): void {
    if (event.type === 'added') {
      deviceAddedCallbacks.forEach((cb) => {
        try {
          cb(event.device)
        } catch (err) {
          console.error('Error in device added callback:', err)
        }
      })
    } else if (event.type === 'removed') {
      deviceRemovedCallbacks.forEach((cb) => {
        try {
          cb(event.device)
        } catch (err) {
          console.error('Error in device removed callback:', err)
        }
      })
    }

    // Refresh device lists
    refreshDevices()
  }

  /**
   * Cleanup resources
   */
  function cleanup(): void {
    audioManager.destroy()
    deviceAddedCallbacks.clear()
    deviceRemovedCallbacks.clear()
  }

  // Setup device change listener
  onMounted(() => {
    audioManager.onDeviceChange(handleDeviceChange)
  })

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    // Device lists
    microphones: readonly(microphones),
    speakers: readonly(speakers),
    cameras: readonly(cameras),
    allDevices: readonly(allDevices),

    // Current devices
    currentMicrophone: readonly(currentMicrophone),
    currentSpeaker: readonly(currentSpeaker),
    currentCamera: readonly(currentCamera),

    // State
    permissionStatus: readonly(permissionStatus),
    isLoading: readonly(isLoading),
    error,

    // Methods
    refreshDevices,
    requestPermissions,
    checkAudioPermission,
    checkVideoPermission,
    selectMicrophone,
    selectSpeaker,
    selectCamera,
    selectDefaultMicrophone,
    selectDefaultSpeaker,
    selectDefaultCamera,
    createAudioStream,
    createVideoStream,
    getCurrentAudioStream,
    getMicrophoneById,
    getSpeakerById,
    getCameraById,
    isDeviceAvailable,
    onDeviceAdded,
    onDeviceRemoved,
    cleanup,
  }
}
