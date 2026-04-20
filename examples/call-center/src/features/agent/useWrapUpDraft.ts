import { computed, ref } from 'vue'

export function useWrapUpDraft() {
  const disposition = ref<string | null>(null)
  const notes = ref('')
  const callbackRequested = ref(false)

  const canComplete = computed(() => Boolean(disposition.value))

  function hydrate(
    values: Partial<{ disposition: string | null; notes: string; callbackRequested: boolean }>
  ) {
    disposition.value = values.disposition ?? disposition.value
    notes.value = values.notes ?? notes.value
    callbackRequested.value = values.callbackRequested ?? callbackRequested.value
  }

  function reset() {
    disposition.value = null
    notes.value = ''
    callbackRequested.value = false
  }

  return {
    disposition,
    notes,
    callbackRequested,
    canComplete,
    hydrate,
    reset,
  }
}
