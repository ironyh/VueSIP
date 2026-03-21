<script setup lang="ts">
import { ref } from 'vue'
import { useMediaPermissions } from 'vuesip'

const { checkAllPermissions } = useMediaPermissions()

const isRunning = ref(false)
const testResults = ref<{ name: string; passed: boolean; message: string }[]>([])
const showResults = ref(false)

async function runConnectionTest() {
  isRunning.value = true
  testResults.value = []
  showResults.value = true

  // Test 1: Media Permissions
  const permResult = await checkAllPermissions()
  const hasAudio = permResult?.audio?.granted ?? false
  testResults.value.push({
    name: 'Media Permissions',
    passed: hasAudio,
    message: hasAudio ? 'Mikrofon OK' : 'Kontrollera mikrofonbehörighet',
  })

  // Test 2: Network (basic check)
  testResults.value.push({
    name: 'Network',
    passed: navigator.onLine,
    message: navigator.onLine ? 'Online' : 'Ingen internetanslutning',
  })

  isRunning.value = false
}

function closeResults() {
  showResults.value = false
}
</script>

<template>
  <div class="connection-test-container">
    <button
      class="connection-test-btn"
      :class="{ running: isRunning }"
      :disabled="isRunning"
      @click="runConnectionTest"
      title="Testa anslutning"
    >
      <span v-if="isRunning" class="spinner">⏳</span>
      <span v-else>🔧</span>
    </button>

    <!-- Results Modal -->
    <div v-if="showResults" class="results-overlay" @click="closeResults">
      <div class="results-modal" @click.stop>
        <h3>Anslutningstest</h3>
        <div class="results-list">
          <div
            v-for="result in testResults"
            :key="result.name"
            class="result-item"
            :class="{ passed: result.passed, failed: !result.passed }"
          >
            <span class="result-icon">{{ result.passed ? '✅' : '❌' }}</span>
            <span class="result-name">{{ result.name }}</span>
            <span class="result-message">{{ result.message }}</span>
          </div>
        </div>
        <button class="close-btn" @click="closeResults">Stäng</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.connection-test-container {
  position: relative;
}

.connection-test-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px 10px;
  font-size: 18px;
  border-radius: 6px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.connection-test-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.connection-test-btn.running {
  opacity: 0.7;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.results-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.results-modal {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 20px;
  max-width: 320px;
  width: 90%;
  color: #fff;
}

.results-modal h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  text-align: center;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}

.result-item.passed {
  border-left: 3px solid #22c55e;
}

.result-item.failed {
  border-left: 3px solid #ef4444;
}

.result-icon {
  font-size: 16px;
}

.result-name {
  font-weight: 600;
  font-size: 14px;
}

.result-message {
  font-size: 12px;
  color: #aaa;
  margin-left: auto;
}

.close-btn {
  width: 100%;
  padding: 10px;
  background: #4f46e5;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.close-btn:hover {
  background: #4338ca;
}
</style>
