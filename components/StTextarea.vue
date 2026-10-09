<template>
  <textarea
    :value="modelValue"
    :rows="rows"
    :placeholder="placeholder"
    :aria-label="label"
    class="w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 px-3 py-2 outline-none focus:border-white/20 resize-y font-mono text-xs leading-relaxed"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>
<script setup>
defineProps({ modelValue: String, label: String, placeholder: String, rows: { type: Number, default: 3 } });
defineEmits(['update:modelValue']);
</script>