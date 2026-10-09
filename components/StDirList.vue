<template>
  <div class="space-y-1">
    <div v-for="(d, i) in modelValue" :key="i" class="flex items-center gap-2">
      <input :value="d" :aria-label="label + ' folder ' + (i + 1)" class="flex-1 bg-white/5 border border-white/10 rounded text-xs text-white/50 px-2 py-1 outline-none focus:border-white/20" @input="update(i, $event.target.value)"/>
      <button class="text-white/20 hover:text-[var(--color-error)] transition-colors shrink-0" :aria-label="'Remove folder ' + (i + 1)" @click="remove(i)" title="Remove this folder">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <button class="btn-ghost text-xs" @click="add" title="Add a folder path">+ Add</button>
  </div>
</template>
<script setup>
const props = defineProps({ modelValue: Array, label: String });
const emit = defineEmits(['update:modelValue']);
function add() { emit('update:modelValue', [...props.modelValue, '']); }
function remove(i) { const a = [...props.modelValue]; a.splice(i, 1); emit('update:modelValue', a); }
function update(i, v) { const a = [...props.modelValue]; a[i] = v; emit('update:modelValue', a); }
</script>