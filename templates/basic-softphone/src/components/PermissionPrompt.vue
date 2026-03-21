<script setup lang="ts">
import { ref } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  granted: []
  denied: []
  dismissed: []
}>()

const isRequesting = ref(false)
const error = ref<string | null>(null)

async function requestPermission() {
  isRequesting.value = true
  error.value = null

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // Stop tracks immediately - we just wanted the permission
    stream.getTracks().forEach((track) => track.stop())

    emit('granted')
  } catch (err) {
    console.error('Microphone permission denied:', err)

    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') {
        error.value = 'Åtkomst nekad. Vänligen tillåt mikrofonåtkomst i din webbläsare.'
      } else if (err.name === 'NotFoundError') {
        error.value = 'Ingen mikrofon hittades. Kontrollera att en mikrofon är ansluten.'
      } else {
        error.value = 'Kunde inte komma åt mikrofonen. Försök igen.'
      }
    } else {
      error.value = 'Ett oväntat fel inträffade. Försök igen.'
    }

    emit('denied')
  } finally {
    isRequesting.value = false
  }
}

function dismiss() {
  emit('dismissed')
}
</script>

<template>
  <div v-if="isOpen" class="permission-overlay">
    <Card class="permission-card">
      <template #header>
        <div class="permission-header">
          <i class="pi pi-microphone permission-icon" />
          <h2>Mikrofonåtkomst krävs</h2>
        </div>
      </template>

      <template #content>
        <div class="permission-content">
          <p>
            För att kunna ringa samtal behöver VueSIP Softphone åtkomst till din mikrofon. Detta
            används enbart för samtal.
          </p>

          <div class="permission-benefits">
            <div class="benefit">
              <i class="pi pi-check-circle" />
              <span>Ring och ta emot samtal</span>
            </div>
            <div class="benefit">
              <i class="pi pi-check-circle" />
              <span>Högtalare för handsfree-samtal</span>
            </div>
            <div class="benefit">
              <i class="pi pi-check-circle" />
              <span>Testa din utrustning innan samtal</span>
            </div>
          </div>

          <div v-if="error" class="error-message">
            <i class="pi pi-exclamation-triangle" />
            {{ error }}
          </div>
        </div>
      </template>

      <template #footer>
        <div class="permission-actions">
          <Button
            v-if="!error"
            label="Tillåt mikrofonåtkomst"
            icon="pi pi-check"
            :loading="isRequesting"
            class="w-full"
            @click="requestPermission"
          />
          <Button
            v-else
            label="Försök igen"
            icon="pi pi-refresh"
            class="w-full p-button-secondary"
            @click="requestPermission"
          />
          <Button label="Senare" link class="w-full mt-2" @click="dismiss" />
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.permission-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.permission-card {
  width: 100%;
  max-width: 400px;
}

.permission-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 24px 0;
  text-align: center;
}

.permission-icon {
  font-size: 3rem;
  color: var(--primary-500);
  margin-bottom: 12px;
}

.permission-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-color);
}

.permission-content {
  padding: 16px 0;
}

.permission-content p {
  margin: 0 0 16px;
  color: var(--text-color-secondary);
  line-height: 1.5;
}

.permission-benefits {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--surface-ground);
  border-radius: 8px;
}

.benefit {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}

.benefit i {
  color: var(--green-500);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background: var(--red-50);
  border: 1px solid var(--red-200);
  border-radius: 6px;
  color: var(--red-700);
  font-size: 0.875rem;
}

.error-message i {
  color: var(--red-500);
}

.permission-actions {
  padding: 0 0 16px;
}

.w-full {
  width: 100%;
}

.mt-2 {
  margin-top: 8px;
}
</style>
