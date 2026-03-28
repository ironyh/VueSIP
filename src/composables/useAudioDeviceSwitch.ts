/**
 * Audio Device Switch Composable
 *
 * Handles switching audio input/output devices during an active WebRTC call
 * by renegotiating media tracks on the RTCPeerConnection without SDP renegotiation.
 *
 * @module composables/useAudioDeviceSwitch
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { CallSession } from '../core/CallSession'
import type { AudioDevice } from '../types/audio.types'
import type { UseAudioDevicesReturn } from './useAudioDevices'
import { DEVICE_SWITCH_CONSTANTS } from './constants'
import { createLogger } from '../utils/logger'

const log = createLogger('useAudioDeviceSwitch')

export interface AudioDeviceSwitchOptions {
  /** HTMLAudioElement used for remote audio playback (required for speaker switching) */
  audioElement?: Ref<HTMLAudioElement | null>
  /** Timeout for switch operations in ms (default: DEVICE_SWITCH_CONSTANTS.SWITCH_TIMEOUT) */
  switchTimeout?: number
  /** Auto-fallback to default device on disconnection (default: true) */
  autoFallback?: boolean
}

export interface UseAudioDeviceSwitchReturn {
  isSwitching: Readonly<Ref<boolean>>
  lastSwitchError: Readonly<Ref<Error | null>>
  currentInputDevice: ComputedRef<AudioDevice | null>
  currentOutputDevice: ComputedRef<AudioDevice | null>
  switchMicrophone: (deviceId: string) => Promise<void>
  switchSpeaker: (deviceId: string) => Promise<void>
  handleDeviceDisconnected: (device: AudioDevice) => Promise<void>
}

export function useAudioDeviceSwitch(
  callSession: Ref<CallSession | null>,
  audioDevices: UseAudioDevicesReturn,
  options: AudioDeviceSwitchOptions = {}
): UseAudioDeviceSwitchReturn {
  const {
    audioElement,
    switchTimeout = DEVICE_SWITCH_CONSTANTS.SWITCH_TIMEOUT,
    autoFallback = true,
  } = options

  const isSwitching = ref(false)
  const lastSwitchError = ref<Error | null>(null)
  const activeInputDeviceId = ref<string | null>(null)
  const activeOutputDeviceId = ref<string | null>(null)

  const currentInputDevice = computed<AudioDevice | null>(() => {
    if (!activeInputDeviceId.value) return audioDevices.currentMicrophone.value
    return audioDevices.getMicrophoneById(activeInputDeviceId.value) ?? null
  })

  const currentOutputDevice = computed<AudioDevice | null>(() => {
    if (!activeOutputDeviceId.value) return audioDevices.currentSpeaker.value
    return audioDevices.getSpeakerById(activeOutputDeviceId.value) ?? null
  })

  let deviceRemovedCleanup: (() => void) | null = null

  function getAudioSender(): RTCRtpSender | null {
    const session = callSession.value
    if (!session) return null

    const connection = session.connection
    if (!connection) return null

    const senders = connection.getSenders()
    return senders.find((s) => s.track?.kind === 'audio') ?? null
  }

  function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms}ms`))
      }, ms)

      promise
        .then((result) => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch((err) => {
          clearTimeout(timer)
          reject(err)
        })
    })
  }

  async function switchMicrophone(deviceId: string): Promise<void> {
    if (isSwitching.value) {
      throw new Error('A device switch operation is already in progress')
    }

    const session = callSession.value
    if (!session) {
      throw new Error('No active call session')
    }

    if (!audioDevices.isDeviceAvailable(deviceId)) {
      throw new Error(`Microphone device not found: ${deviceId}`)
    }

    isSwitching.value = true
    lastSwitchError.value = null
    let newStream: MediaStream | null = null

    try {
      log.info(`Switching microphone to device: ${deviceId}`)

      const sender = getAudioSender()
      if (!sender) {
        throw new Error('No audio sender found on RTCPeerConnection')
      }

      const oldTrack = sender.track

      newStream = await withTimeout(
        navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
        }),
        switchTimeout,
        'getUserMedia'
      )

      const newTrack = newStream.getAudioTracks()[0]
      if (!newTrack) {
        throw new Error('Failed to acquire audio track from new device')
      }

      await withTimeout(sender.replaceTrack(newTrack), switchTimeout, 'replaceTrack')

      if (oldTrack) {
        oldTrack.stop()
      }

      activeInputDeviceId.value = deviceId
      log.info(`Microphone switched successfully to: ${deviceId}`)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      lastSwitchError.value = error
      log.error('Failed to switch microphone:', error.message)

      if (newStream) {
        newStream.getTracks().forEach((track) => track.stop())
      }

      throw error
    } finally {
      isSwitching.value = false
    }
  }

  async function switchSpeaker(deviceId: string): Promise<void> {
    if (isSwitching.value) {
      throw new Error('A device switch operation is already in progress')
    }

    if (!audioDevices.isDeviceAvailable(deviceId)) {
      throw new Error(`Speaker device not found: ${deviceId}`)
    }

    const element = audioElement?.value
    if (!element) {
      throw new Error('No audio element available for speaker switching')
    }

    if (typeof element.setSinkId !== 'function') {
      throw new Error('setSinkId is not supported in this browser')
    }

    isSwitching.value = true
    lastSwitchError.value = null

    try {
      log.info(`Switching speaker to device: ${deviceId}`)

      await withTimeout(element.setSinkId(deviceId), switchTimeout, 'setSinkId')

      activeOutputDeviceId.value = deviceId
      log.info(`Speaker switched successfully to: ${deviceId}`)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      lastSwitchError.value = error
      log.error('Failed to switch speaker:', error.message)
      throw error
    } finally {
      isSwitching.value = false
    }
  }

  async function handleDeviceDisconnected(device: AudioDevice): Promise<void> {
    log.warn(`Device disconnected: ${device.label} (${device.deviceId})`)

    if (device.kind === 'audioinput' && activeInputDeviceId.value === device.deviceId) {
      activeInputDeviceId.value = null

      if (!autoFallback || !callSession.value) return

      await audioDevices.refreshDevices()

      const defaultMic = audioDevices.microphones.value[0]
      if (defaultMic) {
        log.info(`Falling back to default microphone: ${defaultMic.label}`)
        try {
          await switchMicrophone(defaultMic.deviceId)
        } catch (err) {
          log.error('Failed to fallback to default microphone:', err)
        }
      } else {
        log.warn('No fallback microphone available')
      }
    }

    if (device.kind === 'audiooutput' && activeOutputDeviceId.value === device.deviceId) {
      activeOutputDeviceId.value = null

      if (!autoFallback) return

      await audioDevices.refreshDevices()

      const defaultSpeaker = audioDevices.speakers.value[0]
      if (defaultSpeaker && audioElement?.value) {
        log.info(`Falling back to default speaker: ${defaultSpeaker.label}`)
        try {
          await switchSpeaker(defaultSpeaker.deviceId)
        } catch (err) {
          log.error('Failed to fallback to default speaker:', err)
        }
      } else {
        log.warn('No fallback speaker available')
      }
    }
  }

  if (autoFallback) {
    deviceRemovedCleanup = audioDevices.onDeviceRemoved((device: AudioDevice) => {
      if (
        (device.kind === 'audioinput' && activeInputDeviceId.value === device.deviceId) ||
        (device.kind === 'audiooutput' && activeOutputDeviceId.value === device.deviceId)
      ) {
        handleDeviceDisconnected(device)
      }
    })
  }

  watch(
    () => callSession.value,
    (newSession, oldSession) => {
      if (oldSession && !newSession) {
        activeInputDeviceId.value = null
        activeOutputDeviceId.value = null
        lastSwitchError.value = null
        log.debug('Call session ended, reset device switch state')
      }
    }
  )

  onUnmounted(() => {
    if (deviceRemovedCleanup) {
      deviceRemovedCleanup()
      deviceRemovedCleanup = null
    }
  })

  return {
    isSwitching,
    lastSwitchError,
    currentInputDevice,
    currentOutputDevice,
    switchMicrophone,
    switchSpeaker,
    handleDeviceDisconnected,
  }
}
