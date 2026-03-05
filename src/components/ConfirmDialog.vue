<script setup lang="ts">
import { computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { useConfirm } from '../composables/useConfirm'
import type { ConfirmOptions } from '../composables/useConfirm'

// Component props - can be used standalone or with composable
const props = defineProps<{
  /** Show the dialog */
  visible?: boolean
  /** Dialog options */
  options?: ConfirmOptions
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

// Use the composable for state management
const { isOpen, options, confirm, cancelCurrent, confirmCurrent, reset } = useConfirm()

// Sync props with composable state
watch(() => props.visible, (newVal) => {
  if (newVal && props.options) {
    // Standalone mode - use props
    confirm(props.options)
  }
})

// Watch composable state changes
watch(isOpen, (newVal) => {
  emit('update:visible', newVal)
})

// Computed style based on variant
const confirmButtonClass = computed(() => {
  const variant = options.value?.variant || 'primary'
  const variantMap: Record<string, string> = {
    primary: 'p-button-primary',
    danger: 'p-button-danger',
    warning: 'p-button-warning',
    info: 'p-button-info',
  }
  return variantMap[variant] || 'p-button-primary'
})

// Handle confirm button click
const handleConfirm = () => {
  emit('confirm')
  confirmCurrent()
}

// Handle cancel button click  
const handleCancel = () => {
  emit('cancel')
  cancelCurrent()
}

// Handle dialog hide
const handleHide = () => {
  emit('update:visible', false)
  cancelCurrent()
}
</script>

<template>
  <Dialog
    :visible="isOpen"
    :modal="true"
    :closable="true"
    :style="{ width: options?.width || '400px' }"
    :header="options?.title || 'Confirm Action'"
    @update:visible="handleHide"
  >
    <div class="confirm-dialog-content">
      <div v-if="options?.icon" class="confirm-dialog-icon">
        <i :class="options.icon" />
      </div>
      
      <p class="confirm-dialog-message">
        {{ options?.message || 'Are you sure you want to proceed?' }}
      </p>
    </div>

    <template #footer>
      <div class="confirm-dialog-footer">
        <Button
          v-if="options?.showCancel !== false"
          :label="options?.cancelText || 'Cancel'"
          class="p-button-text"
          @click="handleCancel"
        />
        <Button
          :label="options?.confirmText || 'Confirm'"
          :class="confirmButtonClass"
          @click="handleConfirm"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.confirm-dialog-content {
  padding: 0.5rem 0;
}

.confirm-dialog-message {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-color);
}

.confirm-dialog-icon {
  margin-bottom: 1rem;
  text-align: center;
  font-size: 2rem;
  color: var(--primary-color);
}

.confirm-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
