<template>
  <nav class="mobile-nav" role="navigation" :aria-label="ariaLabel">
    <!-- Tab bar for mobile bottom navigation -->
    <ul class="mobile-nav__tabs" role="tablist">
      <li v-for="(item, index) in items" :key="item.id" role="presentation">
        <button
          :id="`nav-tab-${item.id}`"
          role="tab"
          class="mobile-nav__tab"
          :class="{ 'mobile-nav__tab--active': modelValue === item.id }"
          :aria-selected="modelValue === item.id"
          :aria-controls="`nav-panel-${item.id}`"
          :aria-label="item.label"
          :tabindex="modelValue === item.id ? 0 : -1"
          @click="selectTab(item.id)"
          @keydown="handleKeydown($event, index)"
        >
          <span class="mobile-nav__icon" aria-hidden="true" v-html="item.icon"></span>
          <span class="mobile-nav__label">{{ item.label }}</span>
          <span
            v-if="item.badge != null && item.badge > 0"
            class="mobile-nav__badge"
            :aria-label="`${item.badge} notifications`"
            >{{ item.badge > 99 ? '99+' : item.badge }}</span
          >
        </button>
      </li>
    </ul>

    <!-- Tab panels -->
    <div
      v-for="item in items"
      :id="`nav-panel-${item.id}`"
      :key="`panel-${item.id}`"
      role="tabpanel"
      :aria-labelledby="`nav-tab-${item.id}`"
      :hidden="modelValue !== item.id"
      class="mobile-nav__panel"
    >
      <slot :name="item.id"></slot>
    </div>
  </nav>
</template>

<script setup lang="ts">
/**
 * MobileNavigation – accessible, mobile-first tabbed navigation.
 *
 * Uses CSS Grid for layout, supports keyboard navigation (arrow keys, Home/End),
 * touch-friendly 48px minimum targets, and proper ARIA tab pattern.
 *
 * @example
 * ```vue
 * <MobileNavigation
 *   v-model="activeTab"
 *   :items="[
 *     { id: 'dialer', label: 'Dialer', icon: '📞' },
 *     { id: 'contacts', label: 'Contacts', icon: '👥', badge: 3 },
 *     { id: 'history', label: 'History', icon: '🕐' },
 *   ]"
 * >
 *   <template #dialer><Dialpad /></template>
 *   <template #contacts><ContactList /></template>
 *   <template #history><CallHistory /></template>
 * </MobileNavigation>
 * ```
 */

export interface NavItem {
  id: string
  label: string
  icon: string
  badge?: number
}

defineProps<{
  /** Array of navigation items */
  items: NavItem[]
  /** Accessible label for the navigation region */
  ariaLabel?: string
}>()

const modelValue = defineModel<string>({ required: true })

const emit = defineEmits<{
  change: [id: string]
}>()

const selectTab = (id: string) => {
  modelValue.value = id
  emit('change', id)
}

const handleKeydown = (event: KeyboardEvent, currentIndex: number) => {
  const props = getCurrentInstance()?.props
  const items = (props?.items as NavItem[]) ?? []
  let nextIndex: number | null = null

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      event.preventDefault()
      nextIndex = (currentIndex + 1) % items.length
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      event.preventDefault()
      nextIndex = (currentIndex - 1 + items.length) % items.length
      break
    case 'Home':
      event.preventDefault()
      nextIndex = 0
      break
    case 'End':
      event.preventDefault()
      nextIndex = items.length - 1
      break
  }

  if (nextIndex !== null) {
    const item = items[nextIndex]
    if (item) {
      selectTab(item.id)
      // Focus the newly selected tab
      const tabEl = document.getElementById(`nav-tab-${item.id}`)
      tabEl?.focus()
    }
  }
}

import { getCurrentInstance } from 'vue'
</script>

<style scoped>
.mobile-nav {
  display: grid;
  grid-template-rows: 1fr auto;
  height: 100%;
}

.mobile-nav__tabs {
  grid-row: 2;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--mobile-nav-bg, #ffffff);
  border-top: 1px solid var(--mobile-nav-border, rgba(0, 0, 0, 0.08));
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.04);
}

.mobile-nav__tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 0;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--mobile-nav-color, #6b7280);
  font-size: 0.6875rem;
  line-height: 1;
  transition: color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  min-height: 48px;
  min-width: 48px;
  font-family: inherit;
}

.mobile-nav__tab:hover {
  color: var(--mobile-nav-color-active, #3b82f6);
}

.mobile-nav__tab:focus-visible {
  outline: 2px solid var(--mobile-nav-focus, #3b82f6);
  outline-offset: -2px;
  border-radius: 4px;
}

.mobile-nav__tab--active {
  color: var(--mobile-nav-color-active, #3b82f6);
}

.mobile-nav__tab--active::after {
  content: '';
  position: absolute;
  top: 0;
  left: 25%;
  right: 25%;
  height: 2px;
  background: var(--mobile-nav-color-active, #3b82f6);
  border-radius: 0 0 2px 2px;
}

.mobile-nav__icon {
  font-size: 1.25rem;
  line-height: 1;
  display: flex;
  align-items: center;
}

.mobile-nav__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.mobile-nav__badge {
  position: absolute;
  top: 4px;
  right: 25%;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  color: #fff;
  background: var(--mobile-nav-badge-bg, #ef4444);
  border-radius: 8px;
  pointer-events: none;
}

.mobile-nav__panel {
  grid-row: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.mobile-nav__panel[hidden] {
  display: none;
}

/* Responsive: on wider screens, move tabs to a side rail */
@media (min-width: 768px) {
  .mobile-nav {
    grid-template-columns: auto 1fr;
    grid-template-rows: 1fr;
  }

  .mobile-nav__tabs {
    grid-row: 1;
    grid-column: 1;
    grid-auto-flow: row;
    grid-auto-columns: auto;
    border-top: none;
    border-right: 1px solid var(--mobile-nav-border, rgba(0, 0, 0, 0.08));
    box-shadow: 1px 0 4px rgba(0, 0, 0, 0.04);
    width: 80px;
  }

  .mobile-nav__tab {
    padding: 12px 0;
  }

  .mobile-nav__tab--active::after {
    top: 25%;
    bottom: 25%;
    left: 0;
    right: auto;
    width: 2px;
    height: auto;
    border-radius: 0 2px 2px 0;
  }

  .mobile-nav__badge {
    top: 8px;
    right: 12px;
  }

  .mobile-nav__panel {
    grid-row: 1;
    grid-column: 2;
  }
}

/* Touch-friendly: no hover effects on touch devices */
@media (hover: none) {
  .mobile-nav__tab:hover {
    color: var(--mobile-nav-color, #6b7280);
  }

  .mobile-nav__tab--active:hover {
    color: var(--mobile-nav-color-active, #3b82f6);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .mobile-nav__tab {
    transition: none;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --mobile-nav-bg: #1f2937;
    --mobile-nav-border: rgba(255, 255, 255, 0.08);
    --mobile-nav-color: #9ca3af;
    --mobile-nav-color-active: #60a5fa;
    --mobile-nav-focus: #60a5fa;
  }
}

/* High contrast */
@media (prefers-contrast: high) {
  .mobile-nav__tabs {
    border-top-width: 2px;
  }

  .mobile-nav__tab--active::after {
    height: 3px;
  }

  .mobile-nav__badge {
    border: 1px solid;
  }
}
</style>
