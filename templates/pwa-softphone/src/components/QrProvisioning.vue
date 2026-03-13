<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  generateSipProvisioningQr,
  validateSipConfig,
  type SipAccountConfig,
} from '../utils/qrGenerator'

const props = defineProps<{
  accountConfig: {
    displayName: string
    username: string
    password: string
    domain: string
    port?: number
    transport?: 'udp' | 'tcp' | 'tls'
    stunServer?: string
  }
}>()

const emit = defineEmits<{
  (e: 'error', message: string): void
}>()

const qrDataUrl = ref<string | null>(null)
const qrSvg = ref<string | null>(null)
const isGenerating = ref(false)
const errorMessage = ref<string | null>(null)

// Validation
const validation = computed(() => validateSipConfig(props.accountConfig))

// Generate QR code when config changes
watch(
  () => props.accountConfig,
  async () => {
    await generateQr()
  },
  { deep: true, immediate: true }
)

async function generateQr() {
  if (!validation.value.valid) {
    errorMessage.value = validation.value.errors[0] || 'Invalid configuration'
    qrDataUrl.value = null
    qrSvg.value = null
    return
  }

  isGenerating.value = true
  errorMessage.value = null

  try {
    const result = await generateSipProvisioningQr(props.accountConfig as SipAccountConfig)
    qrDataUrl.value = result.dataUrl
    qrSvg.value = result.svg
  } catch (err) {
    errorMessage.value = 'Failed to generate QR code'
    emit('error', String(err))
    console.error('QR generation error:', err)
  } finally {
    isGenerating.value = false
  }
}

function copyProvisioningData() {
  const data = JSON.stringify(props.accountConfig, null, 2)
  navigator.clipboard.writeText(data)
}
</script>

<template>
  <div class="qr-provisioning">
    <div class="qr-header">
      <h3>QR-provisionering</h3>
      <p class="qr-description">
        Skanna QR-koden med din mobil för att automatiskt konfigurera SIP-konto
      </p>
    </div>

    <!-- Validation Errors -->
    <div v-if="!validation.valid" class="validation-errors">
      <div v-for="error in validation.errors" :key="error" class="error-item">⚠️ {{ error }}</div>
    </div>

    <!-- QR Code Display -->
    <div v-else class="qr-content">
      <div v-if="isGenerating" class="qr-loading">
        <span class="spinner">⏳</span>
        Genererar QR-kod...
      </div>

      <div v-else-if="errorMessage" class="qr-error">❌ {{ errorMessage }}</div>

      <div v-else-if="qrDataUrl" class="qr-display">
        <img :src="qrDataUrl" alt="SIP Provisioning QR Code" class="qr-image" />
        <p class="qr-hint">Öppna VueSIP eller annan kompatibel SIP-app och skanna denna kod</p>

        <button class="copy-btn" @click="copyProvisioningData">📋 Kopiera konfiguration</button>
      </div>
    </div>

    <!-- Account Info Summary -->
    <div class="account-summary">
      <h4>Kontodata</h4>
      <div class="summary-item">
        <span class="label">Användare:</span>
        <span class="value">{{ accountConfig.username }}</span>
      </div>
      <div class="summary-item">
        <span class="label">Server:</span>
        <span class="value">{{ accountConfig.domain }}:{{ accountConfig.port || 5060 }}</span>
      </div>
      <div class="summary-item">
        <span class="label">Transport:</span>
        <span class="value">{{ accountConfig.transport || 'udp' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qr-provisioning {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  color: #fff;
}

.qr-header {
  margin-bottom: 16px;
}

.qr-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.qr-description {
  margin: 0;
  font-size: 13px;
  color: #aaa;
}

.validation-errors {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 8px;
  padding: 12px;
}

.error-item {
  color: #ef4444;
  font-size: 13px;
}

.qr-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.qr-loading,
.qr-error {
  padding: 40px;
  text-align: center;
  color: #aaa;
}

.qr-error {
  color: #ef4444;
}

.spinner {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.qr-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.qr-image {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  background: #fff;
  padding: 8px;
}

.qr-hint {
  margin: 0;
  font-size: 12px;
  color: #aaa;
  text-align: center;
}

.copy-btn {
  padding: 8px 16px;
  background: #4f46e5;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.copy-btn:hover {
  background: #4338ca;
}

.account-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.account-summary h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #aaa;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
}

.summary-item .label {
  color: #aaa;
}

.summary-item .value {
  color: #fff;
  font-family: monospace;
}
</style>
