<template>
  <select class="bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 px-3 py-1 outline-none focus:border-white/20" :aria-label="label" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
    <option v-for="o in options" :key="o.v" :value="o.v" class="bg-[var(--surface-2)]">{{ o.l }}</option>
  </select>
</template>
<script setup>defineProps({ modelValue: String, label: String, options: Array }); defineEmits(['update:modelValue']);</script>