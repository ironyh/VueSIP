<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  retry: []
  dismiss: []
}>()

function retry() {
  emit('retry')
}

function dismiss() {
  emit('dismiss')
}

// Detect browser for specific guidance
function getBrowserName(): string {
  const userAgent = navigator.userAgent

  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'

  return 'din webbläsare'
}

const browserName = getBrowserName()
</script>

<template>
  <div v-if="isOpen" class="permission-overlay">
    <Card class="permission-card">
      <template #header>
        <div class="permission-header">
          <i class="pi pi-lock permission-icon denied" />
          <h2>Mikrofonåtkomst blockerad</h2>
        </div>
      </template>

      <template #content>
        <div class="permission-content">
          <div class="denied-notice">
            <i class="pi pi-exclamation-circle" />
            <p>
              Du har blockerat mikrofonåtkomst för VueSIP Softphone. Utan åtkomst kan du inte ringa
              eller ta emot samtal.
            </p>
          </div>

          <Accordion class="browser-guide">
            <AccordionTab :header="`Så här aktiverar du mikrofonen i ${browserName}`">
              <div class="guide-content">
                <template v-if="browserName === 'Chrome'">
                  <ol>
                    <li>Klicka på 🔒-ikonen (eller 🚫-ikonen) i adressfältet</li>
                    <li>Klicka på 'Webbplatsinställningar'</li>
                    <li>Hitta 'Mikrofon' och ändra till 'Tillåt'</li>
                    <li>Ladda om sidan och försök igen</li>
                  </ol>
                </template>
                <template v-else-if="browserName === 'Firefox'">
                  <ol>
                    <li>Klicka på 🎤-ikonen (eller 🚫-ikonen) i adressfältet</li>
                    <li>Klicka på 'Skyddad anslutning'</li>
                    <li>Klicka på 'Mer information'</li>
                    <li>Under 'Behörigheter', bocka ur 'Använd standard' för Mikrofon</li>
                    <li>Välj 'Tillåt' från rullgardinsmenyn</li>
                    <li>Ladda om sidan</li>
                  </ol>
                </template>
                <template v-else-if="browserName === 'Safari'">
                  <ol>
                    <li>Öppna Safari > Inställningar (eller ⌘,)</li>
                    <li>Gå till fliken 'Webbplatser'</li>
                    <li>Välj 'Mikrofon' i sidolisten</li>
                    <li>Hitta denna webbplats och välj 'Tillåt'</li>
                    <li>Ladda om sidan</li>
                  </ol>
                </template>
                <template v-else-if="browserName === 'Edge'">
                  <ol>
                    <li>Klicka på 🔒-ikonen (eller 🚫-ikonen) i adressfältet</li>
                    <li>Klicka på 'Behörigheter för webbplats'</li>
                    <li>Hitta 'Mikrofon' och ändra till 'Tillåt'</li>
                    <li>Ladda om sidan och försök igen</li>
                  </ol>
                </template>
                <template v-else>
                  <ol>
                    <li>Öppna din webbläsares inställningar</li>
                    <li>Sök efter 'Behörigheter' eller 'Sekretess'</li>
                    <li>Hitta 'Mikrofon' eller 'Ljudinmatning'</li>
                    <li>Tillåt åtkomst för denna webbplats</li>
                    <li>Ladda om sidan</li>
                  </ol>
                </template>
              </div>
            </AccordionTab>
          </Accordion>
        </div>
      </template>

      <template #footer>
        <div class="permission-actions">
          <Button
            label="Jag har aktiverat mikrofonen"
            icon="pi pi-refresh"
            class="w-full"
            @click="retry"
          />
          <Button label="Fortsätt utan mikrofon" link class="w-full mt-2" @click="dismiss" />
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
  max-width: 450px;
  max-height: 90vh;
  overflow-y: auto;
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

.permission-icon.denied {
  color: var(--red-500);
}

.permission-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-color);
}

.permission-content {
  padding: 16px 0;
}

.denied-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--red-50);
  border: 1px solid var(--red-200);
  border-radius: 8px;
  margin-bottom: 16px;
}

.denied-notice i {
  color: var(--red-500);
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.denied-notice p {
  margin: 0;
  color: var(--red-700);
  font-size: 0.875rem;
  line-height: 1.5;
}

.browser-guide {
  margin-top: 16px;
}

.guide-content ol {
  margin: 0;
  padding-left: 20px;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-color);
}

.guide-content li {
  margin-bottom: 8px;
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
