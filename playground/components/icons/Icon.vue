<script setup lang="ts">
import { computed } from 'vue'

interface IconProps {
  name: string
  size?: number
}

const props = withDefaults(defineProps<IconProps>(), {
  size: 24,
})

const viewBox = computed(() => '0 0 24 24')
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    :viewBox="viewBox"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <slot />
  </svg>
</template>
