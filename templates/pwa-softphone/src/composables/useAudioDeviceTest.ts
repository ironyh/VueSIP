/**
 * Composable for testing microphone and speaker devices.
 * Manages getUserMedia, AudioContext, setSinkId, and cleanup.
 */
import { ref, onScopeDispose, type Ref } from 'vue'
import type { AudioElementWithSinkId } from 'vuesip'

const MIC_TEST_DURATION_MS = 3000
const SPEAKER_TEST_DURATION_MS = 500

export interface UseAudioDeviceTestOptions {
  /** Duration for mic test (ms); default 3000 */
  micDurationMs?: number
  /** Duration for speaker test (ms); default 500 */
  speakerDurationMs?: number
}

export interface UseAudioDeviceTestReturn {
  isTestingMic: Ref<boolean>
  isTestingSpeaker: Ref<boolean>
  testMicrophone: () => Promise<void>
  testSpeaker: () => Promise<void>
}

export function useAudioDeviceTest(
  selectedInputId: Ref<string | null>,
  selectedOutputId: Ref<string | null>,
  options: UseAudioDeviceTestOptions = {}
): UseAudioDeviceTestReturn {
  const { micDurationMs = MIC_TEST_DURATION_MS, speakerDurationMs = SPEAKER_TEST_DURATION_MS } =
    options

  const isTestingMic = ref(false)
  const isTestingSpeaker = ref(false)
  const micTestStream = ref<MediaStream | null>(null)
  const speakerTestAudio = ref<AudioElementWithSinkId | null>(null)
  const speakerTestAudioContext = ref<AudioContext | null>(null)
  let micTimeoutId: ReturnType<typeof setTimeout> | null = null
  let speakerTimeoutId: ReturnType<typeof setTimeout> | null = null

  function stopMicTest(): void {
    if (micTimeoutId != null) {
      clearTimeout(micTimeoutId)
      micTimeoutId = null
    }
    if (micTestStream.value) {
      micTestStream.value.getTracks().forEach((t) => t.stop())
      micTestStream.value = null
    }
    isTestingMic.value = false
  }

  function stopSpeakerTest(): void {
    if (speakerTimeoutId != null) {
      clearTimeout(speakerTimeoutId)
      speakerTimeoutId = null
    }
    if (speakerTestAudio.value) {
      speakerTestAudio.value.pause()
      speakerTestAudio.value.src = ''
      speakerTestAudio.value = null
    }
    if (speakerTestAudioContext.value) {
      speakerTestAudioContext.value.close()
      speakerTestAudioContext.value = null
    }
    isTestingSpeaker.value = false
  }

  async function testMicrophone(): Promise<void> {
    if (isTestingMic.value) {
      stopMicTest()
      return
    }

    try {
      isTestingMic.value = true
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedInputId.value ? { exact: selectedInputId.value } : undefined,
        },
      })
      micTestStream.value = stream
      micTimeoutId = setTimeout(() => {
        micTimeoutId = null
        stopMicTest()
      }, micDurationMs)
    } catch (err) {
      console.error('Microphone test failed:', err)
      stopMicTest()
    }
  }

  async function testSpeaker(): Promise<void> {
    if (isTestingSpeaker.value) {
      stopSpeakerTest()
      return
    }

    try {
      isTestingSpeaker.value = true
      const audioContext = new AudioContext()
      speakerTestAudioContext.value = audioContext
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      const mediaStreamDestination = audioContext.createMediaStreamDestination()

      oscillator.connect(gainNode)
      gainNode.connect(mediaStreamDestination)
      oscillator.frequency.value = 440
      gainNode.gain.value = 0.1

      const audio = new Audio() as AudioElementWithSinkId
      speakerTestAudio.value = audio
      if (selectedOutputId.value && typeof audio.setSinkId === 'function') {
        await audio.setSinkId(selectedOutputId.value)
      }

      audio.srcObject = mediaStreamDestination.stream
      oscillator.start()
      await audio.play()
      oscillator.stop(audioContext.currentTime + 0.5)

      speakerTimeoutId = setTimeout(() => {
        speakerTimeoutId = null
        stopSpeakerTest()
      }, speakerDurationMs)
    } catch (err) {
      console.error('Speaker test failed:', err)
      stopSpeakerTest()
    }
  }

  onScopeDispose(() => {
    stopMicTest()
    stopSpeakerTest()
  })

  return {
    isTestingMic,
    isTestingSpeaker,
    testMicrophone,
    testSpeaker,
  }
}
