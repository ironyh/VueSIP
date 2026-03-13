/**
 * Media Permissions Composable
 *
 * Provides early microphone/camera permission checking to reduce first-call friction.
 * Call this early in the user flow to detect and resolve permission issues before
 * the user attempts their first call.
 *
 * @module composables/useMediaPermissions
 */

import { ref, computed, onMounted, readonly } from 'vue'
import { PermissionStatus } from '../types/media.types'
import { createLogger } from '../utils/logger'

const log = createLogger('useMediaPermissions')

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  /** Whether permission is granted */
  granted: boolean
  /** Current permission status */
  status: PermissionStatus
  /** User-friendly status message */
  message: string
  /** Whether this is a blocking issue */
  blocking: boolean
}

/**
 * Return type for useMediaPermissions composable
 */
export interface UseMediaPermissionsReturn {
  /** Audio permission status (readonly ref) */
  audioStatus: Readonly<Ref<PermissionStatus>>
  /** Video permission status (readonly ref) */
  videoStatus: Readonly<Ref<PermissionStatus>>
  /** Whether audio permission is granted */
  hasAudioPermission: ComputedRef<boolean>
  /** Whether video permission is granted */
  hasVideoPermission: ComputedRef<boolean>
  /** Whether any permission check is in progress (readonly ref) */
  isChecking: Readonly<Ref<boolean>>
  /** Last error from permission check (readonly ref) */
  lastError: Readonly<Ref<Error | null>>
  /** User-friendly readiness status */
  readinessMessage: ComputedRef<string>
  /** Whether system is ready for calls */
  isReadyForCalls: ComputedRef<boolean>
  /** Check audio permission without prompting */
  checkAudioPermission: () => Promise<PermissionCheckResult>
  /** Check video permission without prompting */
  checkVideoPermission: () => Promise<PermissionCheckResult>
  /** Request audio permission (shows browser prompt) */
  requestAudioPermission: () => Promise<PermissionCheckResult>
  /** Request video permission (shows browser prompt) */
  requestVideoPermission: () => Promise<PermissionCheckResult>
  /** Check both permissions without prompting */
  checkAllPermissions: () => Promise<{ audio: PermissionCheckResult; video: PermissionCheckResult }>
  /** Request all permissions needed for calls */
  requestCallPermissions: (video?: boolean) => Promise<PermissionCheckResult>
}

/**
 * Media Permissions Composable
 *
 * Provides early permission detection and proactive permission requesting
 * to eliminate first-call friction. Use this composable early in your
 * component lifecycle to ensure permissions are ready before call setup.
 *
 * @param options - Configuration options
 * @returns Permission state and methods
 *
 * @example
 * ```typescript
 * const {
 *   hasAudioPermission,
 *   isReadyForCalls,
 *   readinessMessage,
 *   checkAllPermissions,
 *   requestCallPermissions
 * } = useMediaPermissions({ autoCheck: true })
 *
 * // Early check on mount
 * onMounted(async () => {
 *   const { audio } = await checkAllPermissions()
 *   if (!audio.granted) {
 *     // Show permission UI before user attempts call
 *     showPermissionPrompt()
 *   }
 * })
 *
 * // Before placing call
 * async function initiateCall() {
 *   const result = await requestCallPermissions()
 *   if (!result.granted) {
 *     toast.error(result.message)
 *     return
 *   }
 *   // Proceed with call
 * }
 * ```
 */
export function useMediaPermissions(
  options: {
    /** Auto-check permissions on mount (default: false) */
    autoCheck?: boolean
    /** Request permissions proactively on mount (default: false) */
    autoRequest?: boolean
  } = {}
): UseMediaPermissionsReturn {
  const { autoCheck = false, autoRequest = false } = options

  // Reactive state
  const audioStatus = ref<PermissionStatus>(PermissionStatus.NotRequested)
  const videoStatus = ref<PermissionStatus>(PermissionStatus.NotRequested)
  const isChecking = ref(false)
  const lastError = ref<Error | null>(null)

  // Computed
  const hasAudioPermission = computed(() => audioStatus.value === PermissionStatus.Granted)
  const hasVideoPermission = computed(() => videoStatus.value === PermissionStatus.Granted)

  const isReadyForCalls = computed(() => {
    // Audio is required for calls; video is optional
    return hasAudioPermission.value
  })

  const readinessMessage = computed(() => {
    if (isChecking.value) {
      return 'Kontrollerar mikrofontillgång...'
    }
    if (hasAudioPermission.value) {
      return 'Redo för samtal'
    }
    if (audioStatus.value === PermissionStatus.Denied) {
      return 'Mikrofontillgång nekad. Aktivera i webbläsarinställningar.'
    }
    if (audioStatus.value === PermissionStatus.Prompt) {
      return 'Klicka för att ge mikrofontillgång'
    }
    return 'Mikrofontillgång krävs för samtal'
  })

  /**
   * Map PermissionState to our PermissionStatus
   */
  function mapPermissionState(state: PermissionState): PermissionStatus {
    switch (state) {
      case 'granted':
        return PermissionStatus.Granted
      case 'denied':
        return PermissionStatus.Denied
      case 'prompt':
        return PermissionStatus.Prompt
      default:
        return PermissionStatus.NotRequested
    }
  }

  /**
   * Check audio permission using Permissions API (no prompt)
   */
  async function checkAudioPermission(): Promise<PermissionCheckResult> {
    isChecking.value = true
    lastError.value = null

    try {
      // Try Permissions API first (won't prompt)
      if (navigator.permissions?.query) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        audioStatus.value = mapPermissionState(result.state)

        // Listen for changes
        result.onchange = () => {
          audioStatus.value = mapPermissionState(result.state)
          log.info(`Audio permission changed to: ${result.state}`)
        }
      } else {
        // Fallback: check if devices are accessible without labels
        const devices = await navigator.mediaDevices.enumerateDevices()
        const hasLabels = devices.some((d) => d.kind === 'audioinput' && d.label)
        audioStatus.value = hasLabels ? PermissionStatus.Granted : PermissionStatus.NotRequested
      }
    } catch (error) {
      log.warn('Could not check audio permission:', error)
      lastError.value = error instanceof Error ? error : new Error(String(error))
      // Assume we need to request
      audioStatus.value = PermissionStatus.NotRequested
    } finally {
      isChecking.value = false
    }

    return {
      granted: audioStatus.value === PermissionStatus.Granted,
      status: audioStatus.value,
      message: getAudioMessage(audioStatus.value),
      blocking: audioStatus.value === PermissionStatus.Denied,
    }
  }

  /**
   * Check video permission using Permissions API (no prompt)
   */
  async function checkVideoPermission(): Promise<PermissionCheckResult> {
    isChecking.value = true
    lastError.value = null

    try {
      if (navigator.permissions?.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
        videoStatus.value = mapPermissionState(result.state)

        result.onchange = () => {
          videoStatus.value = mapPermissionState(result.state)
          log.info(`Video permission changed to: ${result.state}`)
        }
      } else {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const hasLabels = devices.some((d) => d.kind === 'videoinput' && d.label)
        videoStatus.value = hasLabels ? PermissionStatus.Granted : PermissionStatus.NotRequested
      }
    } catch (error) {
      log.warn('Could not check video permission:', error)
      lastError.value = error instanceof Error ? error : new Error(String(error))
      videoStatus.value = PermissionStatus.NotRequested
    } finally {
      isChecking.value = false
    }

    return {
      granted: videoStatus.value === PermissionStatus.Granted,
      status: videoStatus.value,
      message: getVideoMessage(videoStatus.value),
      blocking: videoStatus.value === PermissionStatus.Denied,
    }
  }

  /**
   * Check all permissions without prompting
   */
  async function checkAllPermissions(): Promise<{
    audio: PermissionCheckResult
    video: PermissionCheckResult
  }> {
    const [audio, video] = await Promise.all([checkAudioPermission(), checkVideoPermission()])
    return { audio, video }
  }

  /**
   * Request audio permission (may show browser prompt)
   */
  async function requestAudioPermission(): Promise<PermissionCheckResult> {
    isChecking.value = true
    lastError.value = null

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Stop tracks immediately - we just wanted permission
      stream.getTracks().forEach((track) => track.stop())
      audioStatus.value = PermissionStatus.Granted
      log.info('Audio permission granted')
    } catch (error) {
      log.warn('Audio permission request failed:', error)
      lastError.value = error instanceof Error ? error : new Error(String(error))

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          audioStatus.value = PermissionStatus.Denied
        } else if (error.name === 'NotFoundError') {
          audioStatus.value = PermissionStatus.NotRequested
          lastError.value = new Error('Ingen mikrofon hittades')
        }
      } else {
        audioStatus.value = PermissionStatus.NotRequested
      }
    } finally {
      isChecking.value = false
    }

    return {
      granted: audioStatus.value === PermissionStatus.Granted,
      status: audioStatus.value,
      message: getAudioMessage(audioStatus.value),
      blocking: audioStatus.value === PermissionStatus.Denied,
    }
  }

  /**
   * Request video permission (may show browser prompt)
   */
  async function requestVideoPermission(): Promise<PermissionCheckResult> {
    isChecking.value = true
    lastError.value = null

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())
      videoStatus.value = PermissionStatus.Granted
      log.info('Video permission granted')
    } catch (error) {
      log.warn('Video permission request failed:', error)
      lastError.value = error instanceof Error ? error : new Error(String(error))

      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        videoStatus.value = PermissionStatus.Denied
      } else {
        videoStatus.value = PermissionStatus.NotRequested
      }
    } finally {
      isChecking.value = false
    }

    return {
      granted: videoStatus.value === PermissionStatus.Granted,
      status: videoStatus.value,
      message: getVideoMessage(videoStatus.value),
      blocking: videoStatus.value === PermissionStatus.Denied,
    }
  }

  /**
   * Request all permissions needed for calls
   */
  async function requestCallPermissions(video = false): Promise<PermissionCheckResult> {
    // Audio is required
    const audioResult = await requestAudioPermission()

    if (!audioResult.granted) {
      return audioResult
    }

    // Video is optional
    if (video) {
      await requestVideoPermission()
    }

    return {
      granted: true,
      status: PermissionStatus.Granted,
      message: 'Redo för samtal',
      blocking: false,
    }
  }

  /**
   * Get user-friendly message for audio permission status
   */
  function getAudioMessage(status: PermissionStatus): string {
    switch (status) {
      case PermissionStatus.Granted:
        return 'Mikrofontillgång beviljad'
      case PermissionStatus.Denied:
        return 'Mikrofontillgång nekad. Aktivera i webbläsarinställningar.'
      case PermissionStatus.Prompt:
        return 'Klicka för att ge mikrofontillgång'
      default:
        return 'Mikrofontillgång krävs för samtal'
    }
  }

  /**
   * Get user-friendly message for video permission status
   */
  function getVideoMessage(status: PermissionStatus): string {
    switch (status) {
      case PermissionStatus.Granted:
        return 'Kameratillgång beviljad'
      case PermissionStatus.Denied:
        return 'Kameratillgång nekad'
      case PermissionStatus.Prompt:
        return 'Klicka för att ge kameratillgång'
      default:
        return 'Kameratillgång krävs för videosamtal'
    }
  }

  // Auto-check on mount if requested
  onMounted(() => {
    if (autoCheck) {
      checkAllPermissions()
    } else if (autoRequest) {
      requestCallPermissions()
    }
  })

  return {
    // State (as refs for reactivity)
    audioStatus: readonly(audioStatus),
    videoStatus: readonly(videoStatus),
    isChecking: readonly(isChecking),
    lastError: readonly(lastError),

    // Computed
    hasAudioPermission,
    hasVideoPermission,
    isReadyForCalls,
    readinessMessage,

    // Methods
    checkAudioPermission,
    checkVideoPermission,
    checkAllPermissions,
    requestAudioPermission,
    requestVideoPermission,
    requestCallPermissions,
  }
}
