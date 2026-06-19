<template>
  <svg :width="size" :height="size" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="35" width="90" height="70" rx="6" :fill="color" />
    <rect x="15" y="25" width="90" height="15" rx="4" :fill="lidColor" />
    <rect x="25" y="50" width="70" height="3" rx="1.5" fill="rgba(255,255,255,0.3)" />
    <rect x="25" y="60" width="50" height="3" rx="1.5" fill="rgba(255,255,255,0.3)" />
    <rect x="25" y="70" width="60" height="3" rx="1.5" fill="rgba(255,255,255,0.3)" />
    <path d="M60 25 L60 15 L45 15" stroke="rgba(0,0,0,0.1)" stroke-width="2" stroke-linecap="round" fill="none" />
    <path d="M60 25 L60 15 L75 15" stroke="rgba(0,0,0,0.1)" stroke-width="2" stroke-linecap="round" fill="none" />
    <rect x="40" y="78" width="40" height="18" rx="3" fill="rgba(139,115,85,0.2)" />
    <text x="60" y="90" text-anchor="middle" :fill="labelColor" font-size="10" font-weight="600">{{ label }}</text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: Number,
    default: 80
  },
  color: {
    type: String,
    default: '#B8D8BA'
  },
  label: {
    type: String,
    default: ''
  }
})

const lidColor = computed(() => {
  return props.color
})

const labelColor = computed(() => {
  return '#5D4E37'
})
</script>
