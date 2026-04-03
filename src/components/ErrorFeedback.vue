<template>
  <div class="error-feedback">
    <div class="error-feedback__header">
      <div class="error-feedback__icon">
        {{ icon }}
      </div>
      <div class="error-feedback__title">
        {{ title }}
      </div>
    </div>

    <div class="error-feedback__content">
      <div v-if="message" class="error-feedback__message">
        {{ message }}
      </div>

      <div v-if="details" class="error-feedback__details">
        {{ details }}
      </div>

      <div v-if="showHelpSection" class="error-feedback__help">
        <div class="error-feedback__help-title">Need help?</div>
        <div class="error-feedback__help-options">
          <button
            v-for="(helpOption, index) in helpOptions"
            :key="index"
            @click="handleHelpOption(helpOption)"
            class="error-feedback__help-button"
          >
            {{ helpOption.label }}
          </button>
        </div>
      </div>

      <div v-if="recoveryOptions.length > 0" class="error-feedback__recovery">
        <div class="error-feedback__recovery-title">What would you like to do?</div>
        <div class="error-feedback__recovery-options">
          <button
            v-for="(option, index) in recoveryOptions"
            :key="index"
            @click="handleRecovery(option)"
            :disabled="isProcessing || option.disabled"
            class="error-feedback__recovery-button"
            :class="{
              'error-feedback__recovery-button--disabled': isProcessing || option.disabled,
              'error-feedback__recovery-button--primary': option.primary,
              'error-feedback__recovery-button--secondary': !option.primary,
            }"
          >
            <span v-if="isProcessing && option.processing" class="error-feedback__loading">
              {{ option.processing }}
            </span>
            <span v-else>
              {{ option.label }}
            </span>
            <span v-if="option.shortcut" class="error-feedback__shortcut">
              ({{ option.shortcut }})
            </span>
          </button>
        </div>
      </div>

      <div v-if="showFeedbackForm" class="error-feedback__form">
        <div class="error-feedback__form-title">Was this helpful?</div>
        <div class="error-feedback__form-buttons">
          <button
            @click="submitFeedback('helpful')"
            :disabled="isSubmitting"
            class="error-feedback__feedback-button"
            :class="{
              'error-feedback__feedback-button--selected': selectedFeedback === 'helpful',
            }"
          >
            👍 Yes
          </button>
          <button
            @click="submitFeedback('not-helpful')"
            :disabled="isSubmitting"
            class="error-feedback__feedback-button"
            :class="{
              'error-feedback__feedback-button--selected': selectedFeedback === 'not-helpful',
            }"
          >
            👎 No
          </button>
        </div>
        <div v-if="showFeedbackText" class="error-feedback__feedback-text">
          <textarea
            v-model="feedbackText"
            placeholder="Tell us more about your experience..."
            rows="3"
            :disabled="isSubmitting"
          ></textarea>
          <div v-if="feedbackText" class="error-feedback__feedback-submit">
            <button
              @click="submitDetailedFeedback"
              :disabled="isSubmitting"
              class="error-feedback__submit-button"
            >
              {{ isSubmitting ? 'Sending...' : 'Submit Feedback' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDismiss" class="error-feedback__footer">
      <button @click="handleDismiss" :disabled="isProcessing" class="error-feedback__dismiss">
        {{ dismissText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface RecoveryOption {
  label: string
  action: () => Promise<void> | void
  shortcut?: string
  primary?: boolean
  disabled?: boolean
  processing?: string
}

export interface HelpOption {
  label: string
  action: () => void
}

export interface ErrorFeedbackProps {
  /** Error icon */
  icon?: string
  /** Error title */
  title: string
  /** Error message */
  message?: string
  /** Additional details */
  details?: string
  /** Recovery options */
  recoveryOptions: RecoveryOption[]
  /** Help options */
  helpOptions?: HelpOption[]
  /** Show help section */
  showHelpSection?: boolean
  /** Show feedback form */
  showFeedbackForm?: boolean
  /** Show feedback text area */
  showFeedbackText?: boolean
  /** Dismiss button text */
  dismissText?: string
  /** Show dismiss button */
  showDismiss?: boolean
  /** Error category for analytics */
  errorCategory?: string
  /** Error details for analytics */
  errorDetails?: Record<string, unknown>
}

withDefaults(defineProps<ErrorFeedbackProps>(), {
  icon: '🔧',
  helpOptions: () => [],
  showHelpSection: true,
  showFeedbackForm: true,
  showFeedbackText: false,
  dismissText: 'Dismiss',
  showDismiss: true,
  errorCategory: 'unknown',
  errorDetails: () => ({}),
})

const emit = defineEmits<{
  dismiss: []
  recovery: [option: RecoveryOption]
  feedback: [type: 'helpful' | 'not-helpful', text?: string]
  help: [option: HelpOption]
}>()

const isProcessing = ref(false)
const isSubmitting = ref(false)
const selectedFeedback = ref<'helpful' | 'not-helpful' | null>(null)
const feedbackText = ref('')

const handleRecovery = async (option: RecoveryOption) => {
  if (isProcessing.value || option.disabled) return

  isProcessing.value = true

  try {
    option.processing = 'Processing...'

    await option.action()

    emit('recovery', option)

    selectedFeedback.value = null
    feedbackText.value = ''
  } catch (error) {
    console.error('Recovery action failed:', error)
    option.processing = undefined
    throw error
  } finally {
    isProcessing.value = false
  }
}

const handleHelpOption = (option: HelpOption) => {
  emit('help', option)
}

const submitFeedback = (type: 'helpful' | 'not-helpful') => {
  selectedFeedback.value = type
  emit('feedback', type)
}

const submitDetailedFeedback = async () => {
  if (!feedbackText.value.trim() || isSubmitting.value) return

  isSubmitting.value = true

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call

    emit('feedback', selectedFeedback.value || 'not-helpful', feedbackText.value)

    // Reset form
    feedbackText.value = ''
    selectedFeedback.value = null
  } catch (error) {
    console.error('Failed to submit feedback:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleDismiss = () => {
  emit('dismiss')
}
</script>

<style scoped>
.error-feedback {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: var(--feedback-background, white);
  border: 1px solid var(--feedback-border, #e2e8f0);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  margin: 0 auto;
}

.error-feedback__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.error-feedback__icon {
  font-size: 1.5rem;
  line-height: 1;
}

.error-feedback__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--feedback-title-color, #2d3748);
  margin: 0;
}

.error-feedback__message {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--feedback-text-color, #4a5568);
  margin: 0 0 1rem 0;
}

.error-feedback__details {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--feedback-text-color, #718096);
  margin: 0 0 1rem 0;
  padding: 0.75rem;
  background-color: var(--feedback-details-bg, #f7fafc);
  border-radius: 4px;
  border-left: 3px solid var(--primary-color, #3182ce);
}

.error-feedback__help {
  margin: 1rem 0;
  padding: 1rem;
  background-color: var(--help-background, #f0fff4);
  border-radius: 6px;
  border: 1px solid var(--help-border, #9ae6b4);
}

.error-feedback__help-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--help-title-color, #276749);
  margin: 0 0 0.75rem 0;
}

.error-feedback__help-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error-feedback__help-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: var(--help-button-bg, #c6f6d5);
  color: var(--help-button-text, #276749);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.error-feedback__help-button:hover {
  background-color: var(--help-button-hover, #9ae6b4);
}

.error-feedback__recovery {
  margin: 1rem 0;
}

.error-feedback__recovery-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--recovery-title-color, #2d3748);
  margin: 0 0 0.75rem 0;
}

.error-feedback__recovery-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.error-feedback__recovery-button {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.error-feedback__recovery-button--primary {
  background-color: var(--primary-color, #3182ce);
  color: white;
}

.error-feedback__recovery-button--primary:hover:not(.error-feedback__recovery-button--disabled) {
  background-color: var(--primary-hover, #2c5282);
}

.error-feedback__recovery-button--secondary {
  background-color: var(--secondary-color, #718096);
  color: white;
}

.error-feedback__recovery-button--secondary:hover:not(.error-feedback__recovery-button--disabled) {
  background-color: var(--secondary-hover, #4a5568);
}

.error-feedback__recovery-button--disabled {
  background-color: var(--disabled-color, #cbd5e0);
  color: var(--disabled-text, #a0aec0);
  cursor: not-allowed;
  opacity: 0.6;
}

.error-feedback__loading {
  animation: pulse 1.5s infinite;
}

.error-feedback__shortcut {
  font-size: 0.75rem;
  opacity: 0.8;
  font-weight: 400;
}

.error-feedback__form {
  margin: 1rem 0;
  padding: 1rem;
  background-color: var(--form-background, #f7fafc);
  border-radius: 6px;
  border: 1px solid var(--form-border, #e2e8f0);
}

.error-feedback__form-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--form-title-color, #4a5568);
  margin: 0 0 0.75rem 0;
}

.error-feedback__form-buttons {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.error-feedback__feedback-button {
  padding: 0.5rem 1rem;
  border: 2px solid var(--form-border, #e2e8f0);
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: transparent;
  color: var(--form-title-color, #4a5568);
  cursor: pointer;
  transition: all 0.2s ease;
}

.error-feedback__feedback-button:hover:not(.error-feedback__feedback-button--disabled) {
  background-color: var(--hover-background, #edf2f7);
}

.error-feedback__feedback-button--selected {
  background-color: var(--primary-color, #3182ce);
  color: white;
  border-color: var(--primary-color, #3182ce);
}

.error-feedback__feedback-text {
  margin-bottom: 0.75rem;
}

.error-feedback__feedback-text textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--form-border, #e2e8f0);
  border-radius: 4px;
  font-size: 0.875rem;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

.error-feedback__feedback-text textarea:focus {
  outline: none;
  border-color: var(--primary-color, #3182ce);
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
}

.error-feedback__feedback-submit {
  text-align: right;
}

.error-feedback__submit-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: var(--primary-color, #3182ce);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.error-feedback__submit-button:hover:not(:disabled) {
  background-color: var(--primary-hover, #2c5282);
}

.error-feedback__submit-button:disabled {
  background-color: var(--disabled-color, #cbd5e0);
  color: var(--disabled-text, #a0aec0);
  cursor: not-allowed;
}

.error-feedback__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.error-feedback__dismiss {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: var(--dismiss-color, #e2e8f0);
  color: var(--dismiss-text, #4a5568);
  cursor: pointer;
  transition: all 0.2s ease;
}

.error-feedback__dismiss:hover:not(:disabled) {
  background-color: var(--dismiss-hover, #cbd5e0);
}

.error-feedback__dismiss:disabled {
  background-color: var(--disabled-color, #e2e8f0);
  color: var(--disabled-text, #a0aec0);
  cursor: not-allowed;
}

/* Responsive design */
@media (max-width: 640px) {
  .error-feedback {
    margin: 0;
    border-radius: 0;
    border: none;
    border-top: 1px solid var(--feedback-border, #e2e8f0);
    max-width: 100%;
  }

  .error-feedback__recovery-options {
    gap: 0.5rem;
  }

  .error-feedback__recovery-button {
    padding: 0.625rem 1rem;
  }

  .error-feedback__form-buttons {
    flex-direction: column;
  }

  .error-feedback__form-buttons .error-feedback__feedback-button {
    text-align: center;
  }
}

/* Animations */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .error-feedback {
    background-color: var(--dark-background, #1a202c);
    border-color: var(--dark-border, #2d3748);
    color: var(--dark-text, #e2e8f0);
  }

  .error-feedback__title {
    color: var(--dark-text, #e2e8f0);
  }

  .error-feedback__message,
  .error-feedback__details {
    color: var(--dark-muted-text, #a0aec0);
  }

  .error-feedback__details {
    background-color: var(--dark-details-bg, #2d3748);
    border-left-color: var(--dark-primary-color, #4299e1);
  }

  .error-feedback__help {
    background-color: var(--dark-help-bg, #1a202c);
    border-color: var(--dark-help-border, #48bb78);
  }

  .error-feedback__form {
    background-color: var(--dark-form-bg, #2d3748);
    border-color: var(--dark-form-border, #4a5568);
  }
}
</style>
