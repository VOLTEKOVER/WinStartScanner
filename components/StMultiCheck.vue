<template>
  <div class="flex gap-4 flex-wrap py-1" role="group" :aria-label="label">
    <label v-for="o in options" :key="o.v" class="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
      <input type="checkbox" :checked="modelValue.includes(o.v)" class="accent-[var(--accent)]" @change="toggle(o.v)"/>{{ o.l }}
    </label>
  </div>
</template>
<script setup>
const props = defineProps({ modelValue: Array, label: String, options: Array });
const emit = defineEmits(['update:modelValue']);
function toggle(v) {
  const arr = [...props.modelValue];
  const i = arr.indexOf(v);
  if (i >= 0) arr.splice(i, 1); else arr.push(v);
  emit('update:modelValue', arr);
}
</script>