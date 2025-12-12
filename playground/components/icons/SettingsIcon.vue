<script setup lang="ts">
interface IconProps {
  size?: number
}

withDefaults(defineProps<IconProps>(), {
  size: 24,
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="3" />
    <path
      d="M12 1v6m0 6v6m5.657-14.657L15.07 7.929m-6.142 6.142l-2.586 2.586M23 12h-6m-6 0H1m18.657-5.657l-2.586 2.586M8.929 15.07l-2.586 2.586"
    />
  </svg>
</template>
