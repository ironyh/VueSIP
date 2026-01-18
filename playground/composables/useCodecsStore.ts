import { ref, watch, computed } from 'vue'
import type { CodecPolicy, CodecCapabilities } from '@/codecs/types'
import { DefaultCodecPolicy } from '@/codecs/types'
import { useCodecs } from '@/codecs/useCodecs'

const STORAGE_KEY = 'vuesip-codecs-policy'
const PRESETS_KEY = 'vuesip-codecs-presets'

export function useCodecsStore() {
  const saved = localStorage.getItem(STORAGE_KEY)
  const policy = ref<CodecPolicy>(saved ? JSON.parse(saved) : DefaultCodecPolicy)
  const codecs = useCodecs(policy.value)

  // Provider presets (policy)
  const presets = [
    {
      id: 'default',
      label: 'Default (Opus/VP8)',
      policy: {
        ...policy.value,
        audio: [
          { id: 'opus', priority: 100 },
          { id: 'pcmu', priority: 50 },
        ],
        video: [
          { id: 'vp8', priority: 100 },
          { id: 'h264', priority: 70 },
        ],
      },
    },
    {
      id: 'asterisk_legacy',
      label: 'Asterisk/FreePBX (Legacy Interop)',
      policy: {
        preferTransceiverApi: true,
        allowLegacyFallbacks: true,
        audio: [
          { id: 'pcmu', priority: 100 },
          { id: 'pcma', priority: 90 },
          { id: 'opus', priority: 50 },
        ],
        video: [
          { id: 'h264', priority: 100 },
          { id: 'vp8', priority: 80 },
        ],
      },
    },
    {
      id: 'telnyx',
      label: 'Telnyx (Opus/H264)',
      policy: {
        preferTransceiverApi: true,
        allowLegacyFallbacks: true,
        audio: [
          { id: 'opus', priority: 100 },
          { id: 'pcmu', priority: 70 },
        ],
        video: [
          { id: 'h264', priority: 100 },
          { id: 'vp8', priority: 90 },
        ],
      },
    },
    {
      id: 'twilio',
      label: 'Twilio (Opus/VP8)',
      policy: {
        preferTransceiverApi: true,
        allowLegacyFallbacks: true,
        audio: [
          { id: 'opus', priority: 100 },
          { id: 'pcmu', priority: 70 },
        ],
        video: [
          { id: 'vp8', priority: 100 },
          { id: 'h264', priority: 90 },
        ],
      },
    },
  ] as const

  function applyPreset(id: string) {
    const p = presets.find((x) => x.id === id)
    if (p) {
      policy.value = JSON.parse(JSON.stringify(p.policy))
    }
  }

  // Remote profiles (capabilities) for negotiation preview
  const remoteProfiles: { id: string; label: string; caps: CodecCapabilities }[] = [
    {
      id: 'none',
      label: 'Auto (no remote provided)',
      caps: { audio: [], video: [] },
    },
    {
      id: 'asterisk_legacy',
      label: 'Asterisk/FreePBX (PCMU/PCMA + H264)',
      caps: {
        audio: [{ mimeType: 'audio/PCMU' }, { mimeType: 'audio/PCMA' }],
        video: [{ mimeType: 'video/H264' }],
      },
    },
    {
      id: 'telnyx',
      label: 'Telnyx (Opus + H264/VP8)',
      caps: {
        audio: [{ mimeType: 'audio/opus' }],
        video: [{ mimeType: 'video/H264' }, { mimeType: 'video/VP8' }],
      },
    },
    {
      id: 'twilio',
      label: 'Twilio (Opus + VP8/H264)',
      caps: {
        audio: [{ mimeType: 'audio/opus' }],
        video: [{ mimeType: 'video/VP8' }, { mimeType: 'video/H264' }],
      },
    },
  ]

  const selectedRemoteProfile = ref('none')
  const selectedPreset = ref('default')

  const remoteCaps = computed<CodecCapabilities | undefined>(() => {
    const rp = remoteProfiles.find((x) => x.id === selectedRemoteProfile.value)
    if (!rp || rp.id === 'none') return undefined
    return rp.caps
  })

  function negotiatePreview() {
    return codecs.negotiate(codecs.getLocalCapabilities(), remoteCaps.value)
  }

  watch(
    policy,
    (p) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    },
    { deep: true }
  )

  // Custom presets (persisted)
  const customPresets = ref<Record<string, CodecPolicy>>(
    JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}')
  )
  function saveCustomPreset(name: string) {
    if (!name.trim()) return
    customPresets.value[name] = JSON.parse(JSON.stringify(policy.value))
    localStorage.setItem(PRESETS_KEY, JSON.stringify(customPresets.value))
  }
  function deleteCustomPreset(name: string) {
    delete customPresets.value[name]
    localStorage.setItem(PRESETS_KEY, JSON.stringify(customPresets.value))
  }
  function applyCustomPreset(name: string) {
    const p = customPresets.value[name]
    if (p) policy.value = JSON.parse(JSON.stringify(p))
  }
  function exportPolicy(): string {
    return JSON.stringify(policy.value, null, 2)
  }
  function importPolicy(json: string): boolean {
    try {
      const obj = JSON.parse(json)
      policy.value = obj
      return true
    } catch {
      return false
    }
  }

  function setAudioPreference(pref: 'auto' | 'opus' | 'pcmu' | 'pcma') {
    if (pref === 'auto') {
      policy.value.audio = DefaultCodecPolicy.audio
      return
    }
    const base = DefaultCodecPolicy.audio ?? []
    const reordered = [{ id: pref, priority: 100 }, ...base.filter((p) => p.id !== pref)]
    policy.value.audio = reordered
  }

  function setVideoPreference(pref: 'auto' | 'vp8' | 'vp9' | 'h264') {
    if (pref === 'auto') {
      policy.value.video = DefaultCodecPolicy.video
      return
    }
    const base = DefaultCodecPolicy.video ?? []
    const reordered = [{ id: pref, priority: 100 }, ...base.filter((p) => p.id !== pref)]
    policy.value.video = reordered
  }

  function setLegacyFallbacks(enabled: boolean) {
    policy.value.allowLegacyFallbacks = enabled
  }

  function setPreferTransceiverApi(enabled: boolean) {
    policy.value.preferTransceiverApi = enabled
  }

  return {
    policy,
    codecs,
    presets,
    applyPreset,
    customPresets,
    saveCustomPreset,
    deleteCustomPreset,
    applyCustomPreset,
    exportPolicy,
    importPolicy,
    remoteProfiles,
    selectedRemoteProfile,
    selectedPreset,
    setAudioPreference,
    setVideoPreference,
    setLegacyFallbacks,
    setPreferTransceiverApi,
    negotiatePreview,
  }
}
