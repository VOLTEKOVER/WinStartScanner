<template>
  <input :value="modelValue" :aria-label="label" class="w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 px-3 py-1.5 outline-none focus:border-white/20" @input="$emit('update:modelValue', $event.target.value)"/>
</template>
<script setup>defineProps({ modelValue: String, label: String, desc: String }); defineEmits(['update:modelValue']);</script>