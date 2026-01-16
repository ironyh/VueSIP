import { ref, watch } from 'vue'
import type { CodecPolicy } from '@/codecs/types'
import { DefaultCodecPolicy } from '@/codecs/types'
import { useCodecs } from '@/codecs/useCodecs'

const STORAGE_KEY = 'vuesip-codecs-policy'

export function useCodecsStore() {
  const saved = localStorage.getItem(STORAGE_KEY)
  const policy = ref<CodecPolicy>(saved ? JSON.parse(saved) : DefaultCodecPolicy)
  const codecs = useCodecs(policy.value)

  watch(
    policy,
    (p) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    },
    { deep: true }
  )

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

  return { policy, codecs, setAudioPreference, setVideoPreference, setLegacyFallbacks }
}
