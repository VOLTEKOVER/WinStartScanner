<template>
  <div class="flex items-center gap-2.5">
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="12" stroke="var(--accent)" stroke-width="1.5" opacity="0.3"/>
      <path d="M16 4 A12 12 0 0 1 28 16" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="16" y1="16" x2="24" y2="16" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
      <line x1="16" y1="16" x2="16" y2="8" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
      <circle cx="20" cy="12" r="2.5" fill="var(--accent)"/>
      <line x1="16" y1="16" x2="14" y2="24" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      <polyline points="14,21 11,22 14,24" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
    </svg>
    <span class="text-sm font-medium tracking-tight" :class="textClass">
      <slot>WinStartScanner</slot>
    </span>
  </div>
</template>

<script setup>
defineProps({ textClass: { type: String, default: 'text-white/70' } });
</script>
