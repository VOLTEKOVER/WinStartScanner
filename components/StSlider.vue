<template>
  <div class="flex items-center gap-3 py-1">
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step || 1"
      :value="modelValue"
      :aria-label="label"
      :aria-valuetext="modelValue + suffix"
      class="flex-1 h-1 appearance-none bg-white/10 rounded-full outline-none accent-[var(--accent)] cursor-pointer"
      @input="$emit('update:modelValue', Number($event.target.value))"
    />
    <span class="text-xs text-white/35 font-mono w-12 text-right shrink-0">{{ modelValue }}{{ suffix }}</span>
  </div>
</template>
<script setup>
const props = defineProps({ modelValue: Number, label: String, min: Number, max: Number, step: Number, desc: String });
defineEmits(['update:modelValue']);
const suffix = props.max <= 500 ? ' KB' : '';
</script>