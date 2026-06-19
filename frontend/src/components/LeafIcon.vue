<template>
  <svg :width="size" :height="size" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M50 10 C35 20, 20 35, 25 55 C30 70, 45 85, 50 90 C55 85, 70 70, 75 55 C80 35, 65 20, 50 10 Z" 
      :fill="color"
      opacity="0.8"
    />
    <path 
      d="M50 25 C40 32, 30 42, 33 55 C35 65, 43 75, 50 78" 
      stroke="rgba(255,255,255,0.3)" 
      stroke-width="2" 
      fill="none"
      stroke-linecap="round"
    />
    <ellipse cx="42" cy="45" rx="5" ry="3" fill="rgba(255,255,255,0.4)" transform="rotate(-20 42 45)" />
  </svg>
</template>

<script setup>
defineProps({
  size: {
    type: Number,
    default: 40
  },
  color: {
    type: String,
    default: '#B8D8BA'
  }
})
</script>
