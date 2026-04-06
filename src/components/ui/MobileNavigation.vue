<template>
  <nav
    class="mobile-nav"
    :class="[
      `mobile-nav--${mode}`,
      { 'mobile-nav--drawer-open': mode === 'drawer' && isDrawerOpen },
    ]"
    role="navigation"
    :aria-label="ariaLabel"
  >
    <!-- Hamburger toggle (drawer mode only) -->
    <button
      v-if="mode === 'drawer'"
      class="mobile-nav__hamburger"
      :aria-expanded="isDrawerOpen"
      :aria-controls="drawerMenuId"
      :aria-label="isDrawerOpen ? 'Close navigation menu' : 'Open navigation menu'"
      @click="toggleDrawer"
    >
      <span class="mobile-nav__hamburger-box" aria-hidden="true">
        <span class="mobile-nav__hamburger-inner"></span>
      </span>
    </button>

    <!-- Drawer overlay -->
    <div
      v-if="mode === 'drawer'"
      :id="drawerMenuId"
      class="mobile-nav__drawer"
      :class="{ 'mobile-nav__drawer--open': isDrawerOpen }"
      role="menu"
      :aria-hidden="!isDrawerOpen"
      @keydown.escape="closeDrawer"
    >
      <ul class="mobile-nav__drawer-items" role="menubar">
        <li v-for="(item, index) in items" :key="item.id" role="none">
          <button
            :id="`nav-tab-${item.id}`"
            role="menuitem"
            class="mobile-nav__drawer-item"
            :class="{ 'mobile-nav__drawer-item--active': modelValue === item.id }"
            :aria-current="modelValue === item.id ? 'page' : undefined"
            :tabindex="isDrawerOpen ? 0 : -1"
            @click="selectAndClose(item.id)"
            @keydown="handleDrawerKeydown($event, index)"
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
    </div>

    <!-- Backdrop (drawer mode) -->
    <div
      v-if="mode === 'drawer' && isDrawerOpen"
      class="mobile-nav__backdrop"
      @click="closeDrawer"
      aria-hidden="true"
    ></div>

    <!-- Tab bar for tabs mode -->
    <ul v-if="mode === 'tabs'" class="mobile-nav__tabs" role="tablist">
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
 * MobileNavigation – accessible, mobile-first navigation component.
 *
 * Supports two modes:
 * - `tabs` (default): bottom tab bar on mobile, side rail on tablet/desktop
 * - `drawer`: hamburger toggle with slide-out menu
 *
 * Both modes support keyboard navigation (arrow keys, Home/End, Escape),
 * touch-friendly 48px minimum targets, and proper ARIA patterns.
 *
 * @example
 * ```vue
 * <!-- Tab bar mode (default) -->
 * <MobileNavigation
 *   v-model="activeTab"
 *   :items="navItems"
 * >
 *   <template #dialer><Dialpad /></template>
 * </MobileNavigation>
 *
 * <!-- Hamburger drawer mode -->
 * <MobileNavigation
 *   v-model="activeTab"
 *   mode="drawer"
 *   :items="navItems"
 * >
 *   <template #dialer><Dialpad /></template>
 * </MobileNavigation>
 * ```
 */

import { ref, getCurrentInstance, watch } from 'vue'

export interface NavItem {
  id: string
  label: string
  icon: string
  badge?: number
}

export type NavMode = 'tabs' | 'drawer'

withDefaults(
  defineProps<{
    /** Array of navigation items */
    items: NavItem[]
    /** Navigation mode: tabs (bottom bar) or drawer (hamburger) */
    mode?: NavMode
    /** Accessible label for the navigation region */
    ariaLabel?: string
  }>(),
  {
    mode: 'tabs',
    ariaLabel: 'Main navigation',
  }
)

const modelValue = defineModel<string>({ required: true })

const emit = defineEmits<{
  change: [id: string]
}>()

const isDrawerOpen = ref(false)
const drawerMenuId = 'mobile-nav-drawer'

const selectTab = (id: string) => {
  modelValue.value = id
  emit('change', id)
}

const toggleDrawer = () => {
  isDrawerOpen.value = !isDrawerOpen.value
}

const closeDrawer = () => {
  isDrawerOpen.value = false
}

const selectAndClose = (id: string) => {
  selectTab(id)
  closeDrawer()
}

// Close drawer when active tab changes externally
watch(modelValue, () => {
  if (isDrawerOpen.value) {
    closeDrawer()
  }
})

const handleKeydown = (event: KeyboardEvent, currentIndex: number) => {
  const currentItems = (getCurrentInstance()?.props.items as NavItem[]) ?? []
  let nextIndex: number | null = null

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      event.preventDefault()
      nextIndex = (currentIndex + 1) % currentItems.length
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      event.preventDefault()
      nextIndex = (currentIndex - 1 + currentItems.length) % currentItems.length
      break
    case 'Home':
      event.preventDefault()
      nextIndex = 0
      break
    case 'End':
      event.preventDefault()
      nextIndex = currentItems.length - 1
      break
  }

  if (nextIndex !== null) {
    const item = currentItems[nextIndex]
    if (item) {
      selectTab(item.id)
      const tabEl = document.getElementById(`nav-tab-${item.id}`)
      tabEl?.focus()
    }
  }
}

const handleDrawerKeydown = (event: KeyboardEvent, currentIndex: number) => {
  const currentItems = (getCurrentInstance()?.props.items as NavItem[]) ?? []
  let nextIndex: number | null = null

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault()
      nextIndex = (currentIndex + 1) % currentItems.length
      break
    case 'ArrowUp':
    case 'ArrowLeft':
      event.preventDefault()
      nextIndex = (currentIndex - 1 + currentItems.length) % currentItems.length
      break
    case 'Home':
      event.preventDefault()
      nextIndex = 0
      break
    case 'End':
      event.preventDefault()
      nextIndex = currentItems.length - 1
      break
    case 'Escape':
      event.preventDefault()
      closeDrawer()
      return
  }

  if (nextIndex !== null) {
    const item = currentItems[nextIndex]
    if (item) {
      const btn = document.getElementById(`nav-tab-${item.id}`)
      btn?.focus()
    }
  }
}
</script>

<style scoped>
/* ── Shared ── */
.mobile-nav {
  display: grid;
  height: 100%;
}

.mobile-nav--tabs {
  grid-template-rows: 1fr auto;
}

.mobile-nav--drawer {
  grid-template-rows: 1fr;
  position: relative;
}

.mobile-nav__panel {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.mobile-nav--tabs > .mobile-nav__panel {
  grid-row: 1;
}

.mobile-nav--drawer > .mobile-nav__panel {
  grid-row: 1;
  grid-column: 1;
}

.mobile-nav__panel[hidden] {
  display: none;
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

/* ── Tab bar mode ── */
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

.mobile-nav__tab .mobile-nav__badge {
  top: 4px;
  right: 25%;
}

/* Tab bar: side rail on tablet+ */
@media (min-width: 768px) {
  .mobile-nav--tabs {
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

  .mobile-nav__tab .mobile-nav__badge {
    top: 8px;
    right: 12px;
  }

  .mobile-nav--tabs > .mobile-nav__panel {
    grid-row: 1;
    grid-column: 2;
  }
}

/* ── Drawer mode ── */
.mobile-nav__hamburger {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: none;
  background: var(--mobile-nav-bg, #ffffff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease;
}

.mobile-nav__hamburger:hover {
  background: var(--mobile-nav-border, rgba(0, 0, 0, 0.08));
}

.mobile-nav__hamburger:focus-visible {
  outline: 2px solid var(--mobile-nav-focus, #3b82f6);
  outline-offset: 2px;
}

.mobile-nav__hamburger-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 18px;
  position: relative;
}

.mobile-nav__hamburger-inner,
.mobile-nav__hamburger-inner::before,
.mobile-nav__hamburger-inner::after {
  display: block;
  width: 24px;
  height: 2px;
  background: var(--mobile-nav-color, #374151);
  border-radius: 1px;
  position: absolute;
  transition:
    transform 0.25s ease,
    opacity 0.15s ease;
}

.mobile-nav__hamburger-inner {
  top: 50%;
  transform: translateY(-50%);
}

.mobile-nav__hamburger-inner::before {
  content: '';
  top: -7px;
}

.mobile-nav__hamburger-inner::after {
  content: '';
  top: 7px;
}

/* Animate to X when open */
.mobile-nav--drawer-open .mobile-nav__hamburger-inner {
  background: transparent;
}

.mobile-nav--drawer-open .mobile-nav__hamburger-inner::before {
  top: 0;
  transform: rotate(45deg);
}

.mobile-nav--drawer-open .mobile-nav__hamburger-inner::after {
  top: 0;
  transform: rotate(-45deg);
}

.mobile-nav__drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  max-width: 80vw;
  background: var(--mobile-nav-bg, #ffffff);
  box-shadow: 4px 0 12px rgba(0, 0, 0, 0.1);
  transform: translateX(-100%);
  transition: transform 0.25s ease;
  z-index: 1000;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.mobile-nav__drawer--open {
  transform: translateX(0);
}

.mobile-nav__drawer[aria-hidden='true'] {
  pointer-events: none;
}

.mobile-nav__drawer-items {
  list-style: none;
  margin: 0;
  padding: 60px 0 0 0;
}

.mobile-nav__drawer-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 20px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--mobile-nav-color, #374151);
  font-size: 0.9375rem;
  font-family: inherit;
  text-align: left;
  min-height: 48px;
  transition:
    background 0.15s ease,
    color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.mobile-nav__drawer-item:hover {
  background: var(--mobile-nav-border, rgba(0, 0, 0, 0.05));
}

.mobile-nav__drawer-item:focus-visible {
  outline: 2px solid var(--mobile-nav-focus, #3b82f6);
  outline-offset: -2px;
}

.mobile-nav__drawer-item--active {
  color: var(--mobile-nav-color-active, #3b82f6);
  background: rgba(59, 130, 246, 0.08);
  font-weight: 600;
}

.mobile-nav__drawer-item .mobile-nav__badge {
  position: static;
  margin-left: auto;
}

.mobile-nav__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
  transition: opacity 0.25s ease;
}

/* ── Touch & accessibility ── */
@media (hover: none) {
  .mobile-nav__tab:hover {
    color: var(--mobile-nav-color, #6b7280);
  }

  .mobile-nav__tab--active:hover {
    color: var(--mobile-nav-color-active, #3b82f6);
  }

  .mobile-nav__drawer-item:hover {
    background: none;
  }

  .mobile-nav__drawer-item--active:hover {
    background: rgba(59, 130, 246, 0.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-nav__tab,
  .mobile-nav__drawer,
  .mobile-nav__drawer-item,
  .mobile-nav__hamburger,
  .mobile-nav__hamburger-inner,
  .mobile-nav__hamburger-inner::before,
  .mobile-nav__hamburger-inner::after,
  .mobile-nav__backdrop {
    transition: none;
  }
}

@media (prefers-color-scheme: dark) {
  :root {
    --mobile-nav-bg: #1f2937;
    --mobile-nav-border: rgba(255, 255, 255, 0.08);
    --mobile-nav-color: #9ca3af;
    --mobile-nav-color-active: #60a5fa;
    --mobile-nav-focus: #60a5fa;
  }
}

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

  .mobile-nav__drawer {
    border-right: 2px solid;
  }
}
</style>
