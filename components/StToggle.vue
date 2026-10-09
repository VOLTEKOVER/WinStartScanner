<template>
  <button
    class="relative w-9 h-5 rounded-full transition-colors shrink-0"
    :class="modelValue ? 'bg-[var(--accent)]' : 'bg-white/10'"
    :title="(modelValue ? 'Disable ' : 'Enable ') + (label || 'setting').toLowerCase()"
    :aria-label="label || 'Toggle'"
    role="switch"
    :aria-checked="modelValue"
    @click="$emit('update:modelValue', !modelValue); $emit('change', !modelValue)"
  >
    <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform" :class="modelValue ? 'translate-x-4' : ''"/>
  </button>
</template>
<script setup>defineProps({ modelValue: Boolean, label: String, desc: String }); defineEmits(['update:modelValue', 'change']);</script>