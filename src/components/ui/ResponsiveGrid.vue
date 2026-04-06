<template>
  <div
    class="responsive-grid"
    :class="[`responsive-grid--${layout}`]"
    :style="gridStyle"
    role="group"
    :aria-label="ariaLabel"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
/**
 * ResponsiveGrid – mobile-first CSS Grid / Flexbox layout component.
 *
 * Provides responsive grid layouts with configurable columns, gaps, and
 * breakpoints. Automatically adapts from single-column (mobile) to
 * multi-column (tablet/desktop) layouts.
 *
 * @example
 * ```vue
 * <ResponsiveGrid :min-col-width="280" :gap="16">
 *   <CallCard v-for="call in calls" :key="call.id" :call="call" />
 * </ResponsiveGrid>
 *
 * <ResponsiveGrid layout="flex" :gap="8" wrap>
 *   <StatusChip v-for="s in statuses" :key="s" :status="s" />
 * </ResponsiveGrid>
 * ```
 */

import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Layout mode: 'grid' (CSS Grid) or 'flex' (Flexbox) */
    layout?: 'grid' | 'flex'
    /** Minimum column width in px (grid mode). Columns auto-fit to fill space. */
    minColWidth?: number
    /** Maximum number of columns */
    maxCols?: number
    /** Gap between items in px */
    gap?: number
    /** Flex wrap (flex mode only) */
    wrap?: boolean
    /** Accessible label */
    ariaLabel?: string
  }>(),
  {
    layout: 'grid',
    minColWidth: 280,
    maxCols: 4,
    gap: 12,
    wrap: true,
    ariaLabel: 'Content grid',
  }
)

const gridStyle = computed(() => {
  const base: Record<string, string> = {
    gap: `${props.gap}px`,
  }

  if (props.layout === 'grid') {
    base.gridTemplateColumns = `repeat(auto-fill, minmax(min(${props.minColWidth}px, 100%), 1fr))`
  } else {
    base.display = 'flex'
    base.flexWrap = props.wrap ? 'wrap' : 'nowrap'
  }

  return base
})
</script>

<style scoped>
.responsive-grid {
  display: grid;
  width: 100%;
  box-sizing: border-box;
}

.responsive-grid--flex {
  display: flex;
}

/* Ensure direct children don't overflow */
.responsive-grid > * {
  min-width: 0;
  overflow-wrap: break-word;
}

/* Mobile: single column for grid mode */
@media (max-width: 479px) {
  .responsive-grid:not(.responsive-grid--flex) {
    grid-template-columns: 1fr !important;
  }
}
</style>
