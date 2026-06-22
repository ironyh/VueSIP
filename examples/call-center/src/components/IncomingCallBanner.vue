<template>
  <div
    class="incoming-banner"
    data-testid="call-center-incoming-banner"
    role="alert"
    aria-live="assertive"
  >
    <div class="banner-icon" aria-hidden="true">📞</div>
    <div class="banner-info">
      <p class="banner-title">Inkommande samtal</p>
      <p class="banner-caller">{{ callerLabel }}</p>
      <p v-if="queueName" class="banner-queue">Kö: {{ queueName }}</p>
    </div>
    <div class="banner-actions">
      <button
        type="button"
        class="btn btn-accept"
        data-testid="call-center-incoming-accept"
        @click="$emit('accept')"
      >
        Svara
      </button>
      <button
        type="button"
        class="btn btn-reject"
        data-testid="call-center-incoming-reject"
        @click="$emit('reject')"
      >
        Avvisa
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { QueuedCallView } from '../features/shared/mvp-types'

const props = defineProps<{
  remoteDisplayName: string
  remoteUri: string
  /** The queue entry this call was correlated to, if any. */
  queueCall: QueuedCallView | null
}>()

defineEmits<{
  accept: []
  reject: []
}>()

const callerLabel = computed(() => props.remoteDisplayName || props.remoteUri || 'Okänd anropare')

const queueName = computed(() => props.queueCall?.queue ?? null)
</script>

<style scoped>
.incoming-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
  animation: pulse-ring 1.5s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%,
  100% {
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
  }
  50% {
    box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
  }
}

.banner-icon {
  font-size: 2rem;
  animation: shake 0.5s ease-in-out infinite alternate;
}

@keyframes shake {
  from {
    transform: rotate(-8deg);
  }
  to {
    transform: rotate(8deg);
  }
}

.banner-info {
  flex: 1;
}

.banner-title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #92400e;
}

.banner-caller {
  margin: 0.125rem 0 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #78350f;
}

.banner-queue {
  margin: 0;
  font-size: 0.8125rem;
  color: #92400e;
}

.banner-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  padding: 0.625rem 1.25rem;
  font-size: 0.9375rem;
  transition:
    background-color 0.15s ease,
    transform 0.1s ease;
}

.btn:active {
  transform: scale(0.97);
}

.btn:focus-visible {
  outline: 2px solid #78350f;
  outline-offset: 2px;
}

.btn-accept {
  background: #16a34a;
  color: #ffffff;
}

.btn-accept:hover {
  background: #15803d;
}

.btn-reject {
  background: #dc2626;
  color: #ffffff;
}

.btn-reject:hover {
  background: #b91c1c;
}
</style>
