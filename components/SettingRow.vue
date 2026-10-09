<template>
  <div :class="full ? 'py-1.5 border-b border-white/[0.03] last:border-0' : 'flex items-start justify-between gap-3 py-1.5 border-b border-white/[0.03] last:border-0'">
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-sm text-white/75 leading-snug">{{ label }}</span>
        <span v-if="badge === 'recommended'" class="px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider" style="background:rgba(237,255,0,0.12);color:#edff00;border:0.5px solid rgba(237,255,0,0.3)">Recommended</span>
        <span v-else-if="badge === 'careful'" class="px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider" style="background:rgba(216,90,48,0.12);color:#D85A30;border:0.5px solid rgba(216,90,48,0.3)">Careful</span>
        <span v-else-if="badge === 'ai'" class="px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider" style="background:rgba(55,138,221,0.12);color:#378ADD;border:0.5px solid rgba(55,138,221,0.3)">AI</span>
      </div>
      <div v-if="desc" class="text-[11px] mt-0.5 leading-snug" :class="descClass">{{ desc }}</div>
    </div>

    <div v-if="!full" class="flex items-center gap-2 shrink-0 pt-1">
      <button
        v-if="dirty"
        class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all hover:brightness-125"
        style="background:rgba(29,158,117,0.12);color:#1D9E75;border:0.5px solid rgba(29,158,117,0.3)"
        :title="'Restore default: ' + defLabel"
        @click="$emit('reset')"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        Reset
      </button>
      <slot />
    </div>

    <div v-else class="w-full mt-2">
      <div v-if="dirty" class="mb-1.5 flex">
        <button
          class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all hover:brightness-125"
          style="background:rgba(29,158,117,0.12);color:#1D9E75;border:0.5px solid rgba(29,158,117,0.3)"
          :title="'Restore default: ' + defLabel"
          @click="$emit('reset')"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          Reset
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  label: String,
  desc: String,
  badge: { type: String, default: '' },
  full: Boolean,
  value: { type: null, required: true },
  def: { type: null, required: true },
  defLabel: { type: String, default: 'factory value' },
});
defineEmits(['reset']);

function eq(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a || []) === JSON.stringify(b || []);
  if (a && typeof a === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

const dirty = computed(() => !eq(props.value, props.def));
const descClass = computed(() => props.badge === 'careful' ? 'text-[#D85A30]/75' : props.badge === 'recommended' ? 'text-[#edff00]/55' : 'text-white/25');
</script>