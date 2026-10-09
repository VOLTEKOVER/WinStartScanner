<template>
  <Teleport to="body">
    <Transition
      enter-active-class="tooltip-enter"
      leave-active-class="tooltip-leave"
      @after-leave="onAfterLeave"
    >
      <div
        v-if="visible"
        ref="el"
        class="app-tooltip"
        role="tooltip"
        :style="{ left: x + 'px', top: y + 'px' }"
      >{{ text }}</div>
    </Transition>
  </Teleport>
</template>

<script setup>
const visible = ref(false);
const text = ref('');
const el = ref(null);
const x = ref(0);
const y = ref(0);

const CURSOR_OFFSET = 14;
const VIEW_PAD = 8;
const SHOW_DELAY = 160;

let current = null;       // element with a tooltip that is being tracked
let timer = null;
let suppressed = new Map();
const cursor = { x: 0, y: 0 };

function suppress(node) {
  if (node instanceof HTMLElement && node.hasAttribute('title')) {
    if (!suppressed.has(node)) suppressed.set(node, node.getAttribute('title'));
    node.removeAttribute('title');
  }
}

function restore() {
  for (const [node, value] of suppressed) node.setAttribute('title', value);
  suppressed = new Map();
}

function readTooltip(node) {
  return node.getAttribute('title') ?? node.getAttribute('data-tooltip');
}

function onOver(e) {
  const node = e.target instanceof Element ? e.target : null;
  if (!node) { hide(); return; }
  const host = node.closest('[title], [data-tooltip]');
  if (!host) { hide(); return; }
  const value = readTooltip(host);
  if (!value) { hide(); return; }
  if (current === host) return;
  current = host;
  suppress(host);
  text.value = value;
  clearTimeout(timer);
  timer = setTimeout(() => { visible.value = true; place(); }, SHOW_DELAY);
}

function onMove(e) {
  cursor.x = e.clientX;
  cursor.y = e.clientY;
  if (!visible.value) return;
  if (current) suppress(current);
  place();
}

function onOut(e) {
  const next = e.relatedTarget;
  if (next instanceof Element && current?.contains(next)) return;
  hide();
}

function hide() {
  clearTimeout(timer);
  if (visible.value) visible.value = false;
}

function onAfterLeave() {
  restore();
  current = null;
}

function place() {
  let nx = cursor.x + CURSOR_OFFSET;
  let ny = cursor.y + CURSOR_OFFSET;
  nextTick(() => {
    const box = el.value?.getBoundingClientRect();
    if (box) {
      if (nx + box.width > window.innerWidth - VIEW_PAD) nx = cursor.x - box.width - CURSOR_OFFSET;
      if (ny + box.height > window.innerHeight - VIEW_PAD) ny = cursor.y - box.height - CURSOR_OFFSET;
      if (nx < VIEW_PAD) nx = VIEW_PAD;
      if (ny < VIEW_PAD) ny = VIEW_PAD;
    }
    x.value = nx;
    y.value = ny;
  });
}

onMounted(() => {
  document.addEventListener('pointerover', onOver, true);
  document.addEventListener('pointermove', onMove, true);
  document.addEventListener('pointerout', onOut, true);
  document.addEventListener('pointerdown', hide, true);
  window.addEventListener('blur', hide);
});

onUnmounted(() => {
  document.removeEventListener('pointerover', onOver, true);
  document.removeEventListener('pointermove', onMove, true);
  document.removeEventListener('pointerout', onOut, true);
  document.removeEventListener('pointerdown', hide, true);
  window.removeEventListener('blur', hide);
  restore();
});
</script>

<style scoped>
.app-tooltip {
  position: fixed;
  z-index: 2000;
  max-width: 340px;
  pointer-events: none;
  background: rgba(18, 18, 18, 0.96);
  color: rgba(255, 255, 255, 0.85);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1.4;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}
@media (max-width: 1200px) { .app-tooltip { white-space: normal; } }

.tooltip-enter-active {
  animation: tooltipIn 0.12s ease-out;
}
.tooltip-leave-active {
  transition: opacity 0.08s ease-out;
}
.tooltip-leave-to {
  opacity: 0;
}
@keyframes tooltipIn {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>