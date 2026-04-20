<template>
  <div v-if="error" class="variant-error" role="alert">
    <div class="variant-error__head">
      <span class="variant-error__badge">Demo crashed</span>
      <button type="button" class="variant-error__retry" @click="retry">Retry</button>
    </div>
    <p class="variant-error__msg">{{ error.message || 'Unknown error' }}</p>
    <details v-if="error.stack" class="variant-error__details">
      <summary>Stack trace</summary>
      <pre class="variant-error__stack"><code>{{ error.stack }}</code></pre>
    </details>
  </div>
  <slot v-else></slot>
</template>

<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

const error = ref<Error | null>(null)

onErrorCaptured((err) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  // eslint-disable-next-line no-console
  console.error('[DemoShell] variant error:', err)
  return false
})

const retry = () => {
  error.value = null
}
</script>

<style scoped>
.variant-error {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 1rem 1.15rem;
  border: 1px solid #b91c1c;
  border-left-width: 4px;
  border-radius: 2px;
  background: color-mix(in srgb, #b91c1c 6%, var(--demo-paper-deep, #f2eadb));
  color: var(--demo-ink, #1a1410);
  font-family: var(--demo-sans, system-ui, sans-serif);
}

.variant-error__head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.variant-error__badge {
  font-family: var(--demo-mono, ui-monospace, monospace);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 0.2rem 0.55rem;
  background: #b91c1c;
  color: #fff;
  border-radius: 2px;
}

.variant-error__retry {
  margin-left: auto;
  padding: 0.3rem 0.8rem;
  border: 1px solid var(--demo-rule, #d9cfbb);
  background: var(--demo-paper, #faf6ef);
  color: var(--demo-ink, #1a1410);
  border-radius: 2px;
  cursor: pointer;
  font-family: var(--demo-mono, ui-monospace, monospace);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.variant-error__retry:hover {
  border-color: var(--demo-accent, #c2410c);
  color: var(--demo-accent, #c2410c);
}

.variant-error__msg {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.variant-error__details {
  font-size: 0.8rem;
}

.variant-error__details summary {
  cursor: pointer;
  font-family: var(--demo-mono, ui-monospace, monospace);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--demo-muted, #6b5d4a);
}

.variant-error__stack {
  margin: 0.4rem 0 0;
  padding: 0.6rem 0.75rem;
  background: var(--demo-ink, #1a1410);
  color: var(--demo-paper, #faf6ef);
  border-radius: 2px;
  font-family: var(--demo-mono, ui-monospace, monospace);
  font-size: 0.7rem;
  line-height: 1.45;
  max-height: 14rem;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
