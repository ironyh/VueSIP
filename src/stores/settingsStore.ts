/**
 * Settings Store
 *
 * Reactive Pinia store for managing application-wide settings with automatic
 * persistence, validation, and migration support.
 *
 * @module stores/settingsStore
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  MediaConfiguration,
  UserPreferences,
  ExtendedRTCConfiguration,
  TurnServerConfig
} from '@/types/config.types'
import { createLogger } from '@/utils/logger'

const log = createLogger('SettingsStore')

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Audio settings configuration
 */
export interface AudioSettings {
  /** Selected microphone device ID */
  microphoneId: string | null
  /** Selected speaker device ID */
  speakerId: string | null
  /** Microphone volume (0-100) */
  microphoneVolume: number
  /** Speaker volume (0-100) */
  speakerVolume: number
  /** Enable echo cancellation */
  echoCancellation: boolean
  /** Enable noise suppression */
  noiseSuppression: boolean
  /** Enable auto gain control */
  autoGainControl: boolean
  /** Preferred audio codec */
  audioCodec: 'opus' | 'pcmu' | 'pcma' | 'g722'
}

/**
 * Video settings configuration
 */
export interface VideoSettings {
  /** Selected camera device ID */
  cameraId: string | null
  /** Enable video by default */
  enableVideoByDefault: boolean
  /** Video resolution */
  resolution: '480p' | '720p' | '1080p'
  /** Frame rate */
  frameRate: number
  /** Enable hardware acceleration */
  hardwareAcceleration: boolean
  /** Preferred video codec */
  videoCodec: 'vp8' | 'vp9' | 'h264'
}

/**
 * Network settings configuration
 */
export interface NetworkSettings {
  /** STUN server URLs */
  stunServers: string[]
  /** TURN server configurations */
  turnServers: TurnServerConfig[]
  /** ICE transport policy */
  iceTransportPolicy: 'all' | 'relay'
  /** Enable IPv6 */
  enableIPv6: boolean
  /** ICE candidate timeout (ms) */
  iceCandidateTimeout: number
}

/**
 * SIP account configuration
 */
export interface SipAccount {
  /** Account ID (unique identifier) */
  id: string
  /** Account name/label */
  name: string
  /** SIP server URI */
  serverUri: string
  /** SIP user URI */
  sipUri: string
  /** Password (will be encrypted in storage) */
  password: string
  /** Display name */
  displayName: string
  /** Authorization username */
  authorizationUsername?: string
  /** SIP realm */
  realm?: string
  /** Registration expiry (seconds) */
  registrationExpiry: number
  /** WebSocket protocols */
  wsProtocols?: string[]
  /** Connection timeout (ms) */
  connectionTimeout: number
  /** Enable auto-registration */
  autoRegister: boolean
  /** Account enabled */
  enabled: boolean
}

/**
 * Call behavior settings
 */
export interface CallSettings {
  /** Auto-answer incoming calls */
  autoAnswer: boolean
  /** Auto-answer delay (ms) */
  autoAnswerDelay: number
  /** Ring tone URL */
  ringToneUrl: string
  /** Ring back tone URL */
  ringBackToneUrl: string
  /** Enable DTMF tones */
  enableDtmfTones: boolean
  /** Call timeout (ms) */
  callTimeout: number
  /** Maximum concurrent calls */
  maxConcurrentCalls: number
  /** Enable call waiting */
  enableCallWaiting: boolean
  /** Enable call hold */
  enableCallHold: boolean
  /** Enable call transfer */
  enableCallTransfer: boolean
}

/**
 * UI/UX settings
 */
export interface UISettings {
  /** Application theme */
  theme: 'light' | 'dark' | 'auto'
  /** Language/locale */
  language: string
  /** Show notifications */
  showNotifications: boolean
  /** Minimize to tray */
  minimizeToTray: boolean
  /** Start minimized */
  startMinimized: boolean
  /** Show in taskbar */
  showInTaskbar: boolean
  /** Compact mode */
  compactMode: boolean
  /** Font size multiplier */
  fontSizeMultiplier: number
}

/**
 * Privacy settings
 */
export interface PrivacySettings {
  /** Clear call history on exit */
  clearHistoryOnExit: boolean
  /** Save call recordings */
  saveCallRecordings: boolean
  /** Call recording location */
  recordingLocation: string
  /** Enable telemetry */
  enableTelemetry: boolean
  /** Enable error reporting */
  enableErrorReporting: boolean
}

/**
 * Advanced settings
 */
export interface AdvancedSettings {
  /** Enable debug mode */
  debugMode: boolean
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  /** Enable experimental features */
  experimentalFeatures: boolean
  /** Custom user agent */
  customUserAgent?: string
  /** WebRTC legacy API */
  useWebRTCLegacy: boolean
}

/**
 * AMI (Asterisk Manager Interface) settings
 */
export interface AmiSettings {
  /** Enable AMI connection */
  enabled: boolean
  /** WebSocket URL to amiws proxy (e.g., 'ws://pbx.example.com:8080') */
  url: string
  /** AMI username */
  username: string
  /** AMI password (will be encrypted in storage) */
  password: string
  /** Auto-reconnect on disconnect */
  autoReconnect: boolean
  /** Reconnect delay in ms */
  reconnectDelay: number
  /** Max reconnect attempts (0 = infinite) */
  maxReconnectAttempts: number
  /** Connection timeout in ms */
  connectionTimeout: number
}

/**
 * Complete settings schema
 */
export interface SettingsSchema {
  /** Settings version for migration */
  version: number
  /** Audio settings */
  audio: AudioSettings
  /** Video settings */
  video: VideoSettings
  /** Network settings */
  network: NetworkSettings
  /** SIP accounts */
  accounts: SipAccount[]
  /** Active account ID */
  activeAccountId: string | null
  /** Call settings */
  calls: CallSettings
  /** UI settings */
  ui: UISettings
  /** Privacy settings */
  privacy: PrivacySettings
  /** Advanced settings */
  advanced: AdvancedSettings
  /** AMI settings */
  ami: AmiSettings
  /** Last modified timestamp */
  lastModified: Date
}

/**
 * Settings validation error
 */
export interface SettingsValidationError {
  /** Field path (e.g., 'audio.microphoneVolume') */
  field: string
  /** Error message */
  message: string
  /** Severity level */
  severity: 'error' | 'warning'
}

// ============================================================================
// Default Settings
// ============================================================================

/**
 * Default audio settings
 */
const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  microphoneId: null,
  speakerId: null,
  microphoneVolume: 80,
  speakerVolume: 80,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  audioCodec: 'opus'
}

/**
 * Default video settings
 */
const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  cameraId: null,
  enableVideoByDefault: false,
  resolution: '720p',
  frameRate: 30,
  hardwareAcceleration: true,
  videoCodec: 'vp9'
}

/**
 * Default network settings
 */
const DEFAULT_NETWORK_SETTINGS: NetworkSettings = {
  stunServers: ['stun:stun.l.google.com:19302'],
  turnServers: [],
  iceTransportPolicy: 'all',
  enableIPv6: true,
  iceCandidateTimeout: 5000
}

/**
 * Default call settings
 */
const DEFAULT_CALL_SETTINGS: CallSettings = {
  autoAnswer: false,
  autoAnswerDelay: 0,
  ringToneUrl: '/sounds/ringtone.mp3',
  ringBackToneUrl: '/sounds/ringback.mp3',
  enableDtmfTones: true,
  callTimeout: 60000,
  maxConcurrentCalls: 1,
  enableCallWaiting: true,
  enableCallHold: true,
  enableCallTransfer: true
}

/**
 * Default UI settings
 */
const DEFAULT_UI_SETTINGS: UISettings = {
  theme: 'auto',
  language: 'en-US',
  showNotifications: true,
  minimizeToTray: false,
  startMinimized: false,
  showInTaskbar: true,
  compactMode: false,
  fontSizeMultiplier: 1.0
}

/**
 * Default privacy settings
 */
const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  clearHistoryOnExit: false,
  saveCallRecordings: false,
  recordingLocation: '',
  enableTelemetry: true,
  enableErrorReporting: true
}

/**
 * Default advanced settings
 */
const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  debugMode: false,
  logLevel: 'info',
  experimentalFeatures: false,
  customUserAgent: undefined,
  useWebRTCLegacy: false
}

/**
 * Default AMI settings
 */
const DEFAULT_AMI_SETTINGS: AmiSettings = {
  enabled: false,
  url: '',
  username: '',
  password: '',
  autoReconnect: true,
  reconnectDelay: 3000,
  maxReconnectAttempts: 5,
  connectionTimeout: 10000
}

/**
 * Current settings schema version
 */
const SETTINGS_VERSION = 1

/**
 * Create default settings schema
 */
function createDefaultSettings(): SettingsSchema {
  return {
    version: SETTINGS_VERSION,
    audio: { ...DEFAULT_AUDIO_SETTINGS },
    video: { ...DEFAULT_VIDEO_SETTINGS },
    network: { ...DEFAULT_NETWORK_SETTINGS },
    accounts: [],
    activeAccountId: null,
    calls: { ...DEFAULT_CALL_SETTINGS },
    ui: { ...DEFAULT_UI_SETTINGS },
    privacy: { ...DEFAULT_PRIVACY_SETTINGS },
    advanced: { ...DEFAULT_ADVANCED_SETTINGS },
    ami: { ...DEFAULT_AMI_SETTINGS },
    lastModified: new Date()
  }
}

// ============================================================================
// Settings Store
// ============================================================================

/**
 * Settings store for managing application settings
 */
export const useSettingsStore = defineStore('settings', () => {
  // ==========================================================================
  // State
  // ==========================================================================

  const settings = ref<SettingsSchema>(createDefaultSettings())
  const isLoading = ref(false)
  const isSaving = ref(false)
  const isDirty = ref(false)
  const lastSaved = ref<Date | null>(null)
  const validationErrors = ref<SettingsValidationError[]>([])
  const autoSaveEnabled = ref(true)
  const autoSaveDelay = ref(1000) // 1 second debounce

  // Auto-save timer
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

  // ==========================================================================
  // Computed
  // ==========================================================================

  /**
   * Get active SIP account
   */
  const activeAccount = computed<SipAccount | null>(() => {
    if (!settings.value.activeAccountId) return null
    return settings.value.accounts.find(a => a.id === settings.value.activeAccountId) || null
  })

  /**
   * Get enabled SIP accounts
   */
  const enabledAccounts = computed<SipAccount[]>(() => {
    return settings.value.accounts.filter(a => a.enabled)
  })

  /**
   * Check if settings are valid
   */
  const isValid = computed(() => {
    return validationErrors.value.filter(e => e.severity === 'error').length === 0
  })

  /**
   * Get current media configuration
   */
  const mediaConfiguration = computed<MediaConfiguration>(() => {
    const { audio, video } = settings.value
    return {
      audio: {
        deviceId: audio.microphoneId || undefined,
        echoCancellation: audio.echoCancellation,
        noiseSuppression: audio.noiseSuppression,
        autoGainControl: audio.autoGainControl
      },
      video: video.enableVideoByDefault ? {
        deviceId: video.cameraId || undefined,
        width: getResolutionWidth(video.resolution),
        height: getResolutionHeight(video.resolution),
        frameRate: video.frameRate
      } : false,
      echoCancellation: audio.echoCancellation,
      noiseSuppression: audio.noiseSuppression,
      autoGainControl: audio.autoGainControl,
      audioCodec: audio.audioCodec,
      videoCodec: video.videoCodec,
      dataChannel: false
    }
  })

  /**
   * Get current RTC configuration
   */
  const rtcConfiguration = computed<ExtendedRTCConfiguration>(() => {
    const { network } = settings.value
    return {
      iceServers: [
        ...network.stunServers.map(url => ({ urls: url })),
        ...network.turnServers.map(t => ({
          urls: Array.isArray(t.urls) ? t.urls : [t.urls],
          username: t.username,
          credential: t.credential,
          credentialType: t.credentialType
        }))
      ],
      iceTransportPolicy: network.iceTransportPolicy,
      iceCandidatePoolSize: 0,
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require'
    }
  })

  /**
   * Get current user preferences
   */
  const userPreferences = computed<UserPreferences>(() => {
    const { audio, video, calls } = settings.value
    return {
      audioInputDeviceId: audio.microphoneId || undefined,
      audioOutputDeviceId: audio.speakerId || undefined,
      videoInputDeviceId: video.cameraId || undefined,
      enableAudio: true,
      enableVideo: video.enableVideoByDefault,
      autoAnswer: calls.autoAnswer,
      autoAnswerDelay: calls.autoAnswerDelay,
      ringToneUrl: calls.ringToneUrl,
      ringBackToneUrl: calls.ringBackToneUrl,
      enableDtmfTones: calls.enableDtmfTones
    }
  })

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate settings schema
   */
  function validateSettings(): SettingsValidationError[] {
    const errors: SettingsValidationError[] = []

    // Validate audio settings
    if (settings.value.audio.microphoneVolume < 0 || settings.value.audio.microphoneVolume > 100) {
      errors.push({
        field: 'audio.microphoneVolume',
        message: 'Microphone volume must be between 0 and 100',
        severity: 'error'
      })
    }

    if (settings.value.audio.speakerVolume < 0 || settings.value.audio.speakerVolume > 100) {
      errors.push({
        field: 'audio.speakerVolume',
        message: 'Speaker volume must be between 0 and 100',
        severity: 'error'
      })
    }

    // Validate network settings
    if (settings.value.network.stunServers.length === 0 && settings.value.network.turnServers.length === 0) {
      errors.push({
        field: 'network',
        message: 'At least one STUN or TURN server is recommended',
        severity: 'warning'
      })
    }

    // Validate SIP accounts
    settings.value.accounts.forEach((account, index) => {
      if (!account.serverUri) {
        errors.push({
          field: `accounts.${index}.serverUri`,
          message: 'Server URI is required',
          severity: 'error'
        })
      }

      if (!account.sipUri) {
        errors.push({
          field: `accounts.${index}.sipUri`,
          message: 'SIP URI is required',
          severity: 'error'
        })
      }

      if (!account.password) {
        errors.push({
          field: `accounts.${index}.password`,
          message: 'Password is required',
          severity: 'error'
        })
      }

      if (account.registrationExpiry < 60) {
        errors.push({
          field: `accounts.${index}.registrationExpiry`,
          message: 'Registration expiry should be at least 60 seconds',
          severity: 'warning'
        })
      }
    })

    // Validate active account
    if (settings.value.activeAccountId) {
      const activeAcc = settings.value.accounts.find(a => a.id === settings.value.activeAccountId)
      if (!activeAcc) {
        errors.push({
          field: 'activeAccountId',
          message: 'Active account not found in accounts list',
          severity: 'error'
        })
      }
    }

    // Validate AMI settings
    if (settings.value.ami.enabled) {
      if (!settings.value.ami.url) {
        errors.push({
          field: 'ami.url',
          message: 'AMI URL is required when AMI is enabled',
          severity: 'error'
        })
      } else if (!settings.value.ami.url.startsWith('ws://') && !settings.value.ami.url.startsWith('wss://')) {
        errors.push({
          field: 'ami.url',
          message: 'AMI URL must start with ws:// or wss://',
          severity: 'error'
        })
      }

      if (!settings.value.ami.username) {
        errors.push({
          field: 'ami.username',
          message: 'AMI username is required when AMI is enabled',
          severity: 'error'
        })
      }

      if (!settings.value.ami.password) {
        errors.push({
          field: 'ami.password',
          message: 'AMI password is required when AMI is enabled',
          severity: 'error'
        })
      }

      if (settings.value.ami.connectionTimeout < 1000 || settings.value.ami.connectionTimeout > 30000) {
        errors.push({
          field: 'ami.connectionTimeout',
          message: 'Connection timeout should be between 1000ms and 30000ms',
          severity: 'warning'
        })
      }

      if (settings.value.ami.reconnectDelay < 1000 || settings.value.ami.reconnectDelay > 30000) {
        errors.push({
          field: 'ami.reconnectDelay',
          message: 'Reconnect delay should be between 1000ms and 30000ms',
          severity: 'warning'
        })
      }
    }

    validationErrors.value = errors
    return errors
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Update settings and trigger auto-save
   */
  function updateSettings(partial: Partial<SettingsSchema>): void {
    Object.assign(settings.value, partial)
    settings.value.lastModified = new Date()
    isDirty.value = true

    // Validate after update
    validateSettings()

    // Trigger auto-save
    if (autoSaveEnabled.value) {
      scheduleAutoSave()
    }
  }

  /**
   * Schedule auto-save with debouncing
   */
  function scheduleAutoSave(): void {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }

    autoSaveTimer = setTimeout(() => {
      saveSettings()
    }, autoSaveDelay.value)
  }

  /**
   * Save settings (will be implemented by persistence layer)
   */
  async function saveSettings(): Promise<void> {
    log.debug('saveSettings called - will be handled by persistence layer')
    // Persistence layer will implement actual save logic
  }

  /**
   * Load settings (will be implemented by persistence layer)
   */
  async function loadSettings(): Promise<void> {
    log.debug('loadSettings called - will be handled by persistence layer')
    // Persistence layer will implement actual load logic
  }

  /**
   * Reset settings to defaults
   */
  function resetSettings(): void {
    settings.value = createDefaultSettings()
    isDirty.value = true
    validationErrors.value = []
    log.info('Settings reset to defaults')
  }

  /**
   * Add SIP account
   */
  function addAccount(account: Omit<SipAccount, 'id'>): SipAccount {
    const newAccount: SipAccount = {
      ...account,
      id: `account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    settings.value.accounts.push(newAccount)
    isDirty.value = true

    // Set as active if no active account
    if (!settings.value.activeAccountId) {
      settings.value.activeAccountId = newAccount.id
    }

    validateSettings()
    log.info(`Added account: ${newAccount.name}`)

    return newAccount
  }

  /**
   * Update SIP account
   */
  function updateAccount(id: string, updates: Partial<SipAccount>): void {
    const index = settings.value.accounts.findIndex(a => a.id === id)
    if (index === -1) {
      log.warn(`Account not found: ${id}`)
      return
    }

    const account = settings.value.accounts[index]
    if (account) {
      Object.assign(account, updates)
    }
    isDirty.value = true
    validateSettings()
    log.info(`Updated account: ${id}`)
  }

  /**
   * Remove SIP account
   */
  function removeAccount(id: string): void {
    const index = settings.value.accounts.findIndex(a => a.id === id)
    if (index === -1) {
      log.warn(`Account not found: ${id}`)
      return
    }

    settings.value.accounts.splice(index, 1)

    // Clear active account if removed
    if (settings.value.activeAccountId === id) {
      settings.value.activeAccountId = settings.value.accounts[0]?.id || null
    }

    isDirty.value = true
    validateSettings()
    log.info(`Removed account: ${id}`)
  }

  /**
   * Set active account
   */
  function setActiveAccount(id: string | null): void {
    if (id && !settings.value.accounts.find(a => a.id === id)) {
      log.warn(`Account not found: ${id}`)
      return
    }

    settings.value.activeAccountId = id
    isDirty.value = true
    log.info(`Active account set to: ${id}`)
  }

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  function getResolutionWidth(resolution: string): number {
    const widths: Record<string, number> = {
      '480p': 640,
      '720p': 1280,
      '1080p': 1920
    }
    return widths[resolution] || 1280
  }

  function getResolutionHeight(resolution: string): number {
    const heights: Record<string, number> = {
      '480p': 480,
      '720p': 720,
      '1080p': 1080
    }
    return heights[resolution] || 720
  }

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    settings,
    isLoading,
    isSaving,
    isDirty,
    lastSaved,
    validationErrors,
    autoSaveEnabled,
    autoSaveDelay,

    // Computed
    activeAccount,
    enabledAccounts,
    isValid,
    mediaConfiguration,
    rtcConfiguration,
    userPreferences,

    // Actions
    updateSettings,
    saveSettings,
    loadSettings,
    resetSettings,
    validateSettings,
    addAccount,
    updateAccount,
    removeAccount,
    setActiveAccount
  }
})
