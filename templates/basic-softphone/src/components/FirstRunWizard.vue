<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Steps from 'primevue/steps'
import PermissionPrompt from './PermissionPrompt.vue'
import PermissionDenied from './PermissionDenied.vue'
import { markFirstRunCompleted, markStepCompleted } from '../utils/firstRun'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  completed: []
  dismissed: []
}>()

// Step management
const currentStep = ref(0)
const permissionGranted = ref(false)
const permissionDenied = ref(false)
const audioTestPassed = ref(false)
const isTestingAudio = ref(false)

const steps = [{ label: 'Välkommen' }, { label: 'Mikrofon' }, { label: 'Test' }, { label: 'Klar' }]

// Audio test
async function testAudio() {
  isTestingAudio.value = true

  try {
    // Create a simple test tone
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 1000
    gainNode.gain.value = 0.1

    oscillator.start()

    await new Promise((resolve) => setTimeout(resolve, 500))

    oscillator.stop()
    await audioContext.close()

    audioTestPassed.value = true
    markStepCompleted('audio_test')
  } catch (err) {
    console.error('Audio test failed:', err)
    audioTestPassed.value = false
  } finally {
    isTestingAudio.value = false
  }
}

// Permission handling
function handlePermissionGranted() {
  permissionGranted.value = true
  permissionDenied.value = false
  markStepCompleted('microphone_permission')
  currentStep.value = 2 // Skip to audio test
}

function handlePermissionDenied() {
  permissionDenied.value = true
}

function handlePermissionDismissed() {
  // User dismissed without granting - still allow them to continue
  currentStep.value = 2
}

function handlePermissionRetry() {
  permissionDenied.value = false
  // PermissionPrompt will be shown again due to v-if
}

function handlePermissionDismiss() {
  permissionDenied.value = false
  currentStep.value = 2
}

// Step navigation
function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function completeWizard() {
  markFirstRunCompleted()
  emit('completed')
}

function dismissWizard() {
  // Mark as completed anyway so they don't see it every time
  markFirstRunCompleted()
  emit('dismissed')
}

// Start audio test automatically when reaching step 2
onMounted(() => {
  // Check if permission was already granted
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      stream.getTracks().forEach((track) => track.stop())
      permissionGranted.value = true
    })
    .catch(() => {
      // Permission not yet granted
    })
})
</script>

<template>
  <div v-if="isOpen" class="wizard-overlay">
    <Card class="wizard-card">
      <template #header>
        <div class="wizard-header">
          <Steps :model="steps" :active-step="currentStep" class="wizard-steps" />
        </div>
      </template>

      <template #content>
        <div class="wizard-content">
          <!-- Step 0: Welcome -->
          <div v-if="currentStep === 0" class="step">
            <div class="step-icon">
              <i class="pi pi-phone" />
            </div>
            <h2>Välkommen till VueSIP Softphone!</h2>
            <p>
              Denna guide hjälper dig att komma igång med att ringa samtal. Det tar bara någon
              minut.
            </p>

            <div class="wizard-features">
              <div class="feature">
                <i class="pi pi-microphone" />
                <span>Konfigurera din mikrofon</span>
              </div>
              <div class="feature">
                <i class="pi pi-volume-up" />
                <span>Testa ditt ljud</span>
              </div>
              <div class="feature">
                <i class="pi pi-check-circle" />
                <span>Börja ringa samtal</span>
              </div>
            </div>
          </div>

          <!-- Step 1: Microphone Permission -->
          <div v-if="currentStep === 1" class="step">
            <PermissionPrompt
              :is-open="!permissionDenied"
              @granted="handlePermissionGranted"
              @denied="handlePermissionDenied"
              @dismissed="handlePermissionDismissed"
            />

            <PermissionDenied
              :is-open="permissionDenied"
              @retry="handlePermissionRetry"
              @dismiss="handlePermissionDismiss"
            />
          </div>

          <!-- Step 2: Audio Test -->
          <div v-if="currentStep === 2" class="step">
            <div class="step-icon">
              <i class="pi pi-volume-up" />
            </div>
            <h2>Testa ditt ljud</h2>

            <p v-if="!audioTestPassed">
              Klicka på knappen nedan för att spela upp ett testljud. Om du hör ett ton pipar
              fungerar din ljudutmatning.
            </p>

            <p v-else class="success-message">
              <i class="pi pi-check-circle" />
              Ljudtestet lyckades! Din utrustning fungerar.
            </p>

            <Button
              v-if="!audioTestPassed"
              label="Spela testljud"
              icon="pi pi-play"
              :loading="isTestingAudio"
              @click="testAudio"
            />

            <div v-else class="test-success">
              <div class="success-icon">
                <i class="pi pi-check" />
              </div>
              <p>Allt ser bra ut! Du är redo att börja ringa samtal.</p>
            </div>
          </div>

          <!-- Step 3: Complete -->
          <div v-if="currentStep === 3" class="step">
            <div class="step-icon complete">
              <i class="pi pi-check-circle" />
            </div>
            <h2>Du är redo!</h2>

            <p>
              VueSIP Softphone är nu konfigurerad och redo att användas. Anslut till din SIP-server
              för att börja ringa samtal.
            </p>

            <div class="complete-features">
              <div class="complete-item" :class="{ done: permissionGranted }">
                <i :class="permissionGranted ? 'pi pi-check' : 'pi pi-times'" />
                <span
                  >Mikrofonåtkomst {{ permissionGranted ? 'aktiverad' : 'inte aktiverad' }}</span
                >
              </div>
              <div class="complete-item" :class="{ done: audioTestPassed }">
                <i :class="audioTestPassed ? 'pi pi-check' : 'pi pi-times'" />
                <span>Ljudtest {{ audioTestPassed ? 'genomfört' : 'inte genomfört' }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="wizard-actions">
          <Button
            v-if="currentStep > 0 && currentStep !== 1"
            label="Tillbaka"
            icon="pi pi-arrow-left"
            link
            @click="prevStep"
          />

          <div class="spacer" />

          <Button
            v-if="currentStep === 0"
            label="Kom igång"
            icon="pi pi-arrow-right"
            icon-pos="right"
            @click="nextStep"
          />

          <Button
            v-else-if="currentStep === 2 && audioTestPassed"
            label="Fortsätt"
            icon="pi pi-arrow-right"
            icon-pos="right"
            @click="nextStep"
          />

          <Button
            v-else-if="currentStep === 2 && !audioTestPassed"
            label="Hoppa över"
            link
            @click="nextStep"
          />

          <Button
            v-else-if="currentStep === 3"
            label="Börja använda"
            icon="pi pi-check"
            @click="completeWizard"
          />

          <Button v-if="currentStep !== 1" label="Stäng" link class="ml-2" @click="dismissWizard" />
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.wizard-overlay {
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

.wizard-card {
  width: 100%;
  max-width: 500px;
}

.wizard-header {
  padding: 16px 24px 0;
}

.wizard-steps {
  margin-bottom: 8px;
}

.wizard-content {
  padding: 16px 0;
  min-height: 300px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.step-icon {
  font-size: 4rem;
  color: var(--primary-500);
  margin-bottom: 16px;
}

.step-icon.complete {
  color: var(--green-500);
}

.step h2 {
  margin: 0 0 16px;
  font-size: 1.5rem;
}

.step p {
  margin: 0 0 24px;
  color: var(--text-color-secondary);
  line-height: 1.5;
  max-width: 360px;
}

.wizard-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 280px;
  margin-top: 8px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--surface-ground);
  border-radius: 8px;
  font-size: 0.875rem;
}

.feature i {
  color: var(--primary-500);
  font-size: 1.25rem;
}

.success-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--green-700) !important;
  background: var(--green-50);
  padding: 12px 16px;
  border-radius: 8px;
}

.success-message i {
  color: var(--green-500);
}

.test-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--green-500);
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-icon i {
  font-size: 2rem;
  color: white;
}

.complete-features {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 280px;
  margin-top: 8px;
}

.complete-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--surface-100);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.complete-item.done {
  background: var(--green-50);
  color: var(--green-700);
}

.complete-item i {
  font-size: 1rem;
}

.complete-item.done i {
  color: var(--green-500);
}

.wizard-actions {
  display: flex;
  align-items: center;
  padding: 0 0 16px;
}

.spacer {
  flex: 1;
}

.ml-2 {
  margin-left: 8px;
}
</style>
