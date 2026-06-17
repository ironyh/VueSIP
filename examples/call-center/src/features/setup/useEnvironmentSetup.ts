import { computed, ref } from 'vue'
import type { SipClientConfig } from '../../../../../src/types/config.types'
import type { AmiConfig } from '../../../../../src/types/ami.types'

export interface EnvironmentSetupForm {
  server: string
  username: string
  password: string
  displayName: string
  /** Optional AMI WebSocket URL (amiws proxy). Empty = demo mode. */
  amiUrl: string
}

export function useEnvironmentSetup() {
  const selectedPreset = ref<'demo' | 'sandbox' | 'custom'>('demo')
  const form = ref<EnvironmentSetupForm>({
    server: 'pbx-demo.vuesip.com',
    username: '',
    password: '',
    displayName: '',
    amiUrl: '',
  })
  const readiness = ref({
    hasMicPermission: false,
    hasOutputDevice: false,
    hasSecureContext: typeof window === 'undefined' ? true : window.isSecureContext,
  })

  /** Derived mode: connected when an AMI URL is provided, otherwise demo. */
  const mode = computed<'demo' | 'connected'>(() =>
    form.value.amiUrl.trim() ? 'connected' : 'demo'
  )

  function applyPreset(preset: 'demo' | 'sandbox' | 'custom') {
    selectedPreset.value = preset

    if (preset === 'sandbox') {
      form.value.server = 'localhost:18089'
    } else if (preset === 'demo') {
      form.value.server = 'pbx-demo.vuesip.com'
    }
  }

  function syncFromForm(values: Partial<EnvironmentSetupForm>) {
    form.value.server = values.server ?? form.value.server
    form.value.username = values.username ?? form.value.username
    form.value.password = values.password ?? form.value.password
    form.value.displayName = values.displayName ?? form.value.displayName
    form.value.amiUrl = values.amiUrl ?? form.value.amiUrl
  }

  function validateCurrentConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!form.value.server.trim()) errors.push('server')
    if (!form.value.username.trim()) errors.push('username')
    if (!form.value.password.trim()) errors.push('password')

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  function toSipConfig(): SipClientConfig {
    return {
      uri: `wss://${form.value.server}`,
      sipUri: `sip:${form.value.username}@${form.value.server}`,
      password: form.value.password,
      displayName: form.value.displayName || form.value.username,
      registrationOptions: {
        autoRegister: true,
        expires: 600,
      },
    }
  }

  /** Builds an AMI config when amiUrl is set, otherwise null (demo mode). */
  function toAmiConfig(): AmiConfig | null {
    const url = form.value.amiUrl.trim()
    if (!url) return null
    return {
      url,
      autoReconnect: true,
      reconnectDelay: 3000,
      maxReconnectAttempts: 5,
    }
  }

  return {
    selectedPreset,
    form: form.value,
    readiness,
    mode,
    applyPreset,
    syncFromForm,
    validateCurrentConfig,
    toSipConfig,
    toAmiConfig,
  }
}
