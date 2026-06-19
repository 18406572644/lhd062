<template>
  <svg :width="width" :height="height" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" :width="width - 4" :height="height - 4" rx="8" 
      :fill="bgColor" stroke="borderColor" stroke-width="2" stroke-dasharray="4 2" />
    <line x1="15" y1="25" x2="185" y2="25" stroke="rgba(0,0,0,0.1)" stroke-width="1" />
    <line x1="15" y1="40" x2="150" y2="40" stroke="rgba(0,0,0,0.1)" stroke-width="1" />
    <line x1="15" y1="55" x2="120" y2="55" stroke="rgba(0,0,0,0.1)" stroke-width="1" />
    <line x1="15" y1="70" x2="100" y2="70" stroke="rgba(0,0,0,0.1)" stroke-width="1" />
    <rect x="160" y="45" width="30" height="30" rx="4" fill="rgba(139,115,85,0.1)" />
    <path d="M167 52 L167 68 M175 52 L175 68 M183 52 L183 68" stroke="rgba(139,115,85,0.3)" stroke-width="2" stroke-linecap="round" />
    <path d="M167 52 L183 52 M167 60 L183 60 M167 68 L183 68" stroke="rgba(139,115,85,0.3)" stroke-width="2" stroke-linecap="round" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  width: {
    type: Number,
    default: 200
  },
  height: {
    type: Number,
    default: 100
  },
  bgColor: {
    type: String,
    default: '#FDF6E3'
  },
  borderColor: {
    type: String,
    default: '#8B7355'
  }
})
</script>
