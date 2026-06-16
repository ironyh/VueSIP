import { computed, ref, type Ref } from 'vue'
import type { CallbackTaskView } from '../shared/mvp-types'

export function useCallbackWorklist(callbacks: Ref<CallbackTaskView[]>) {
  const selectedCallbackId = ref<string | null>(null)

  const worklist = computed(() =>
    [...callbacks.value].sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime())
  )

  const selectedCallback = computed(
    () => worklist.value.find((callback) => callback.id === selectedCallbackId.value) ?? null
  )

  const canStartCallbackOutbound = computed(() => Boolean(selectedCallback.value))

  function selectCallback(callbackId: string | null) {
    selectedCallbackId.value = callbackId
  }

  function markCallbackInProgress(callbackId: string) {
    const callback = callbacks.value.find((entry) => entry.id === callbackId)
    if (!callback) {
      return
    }

    callback.status = 'in-progress'
    selectedCallbackId.value = callbackId
  }

  function completeCallback(callbackId: string) {
    const callback = callbacks.value.find((entry) => entry.id === callbackId)
    if (!callback) {
      return
    }

    callback.status = 'completed'
    if (selectedCallbackId.value === callbackId) {
      selectedCallbackId.value = null
    }
  }

  function reopenCallback(callbackId: string) {
    const callback = callbacks.value.find((entry) => entry.id === callbackId)
    if (!callback) {
      return
    }

    callback.status = 'open'
    selectedCallbackId.value = callbackId
  }

  return {
    selectedCallbackId,
    selectedCallback,
    worklist,
    canStartCallbackOutbound,
    selectCallback,
    markCallbackInProgress,
    completeCallback,
    reopenCallback,
  }
}
