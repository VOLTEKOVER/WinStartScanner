<template>
  <div class="flex-1 flex flex-col overflow-hidden px-8 pt-6 pb-0 app-no-drag">
    <!-- Carousel label -->
    <p class="text-xs font-medium tracking-wider mb-3" style="color:rgba(255,255,255,0.35);">TOOLS</p>

    <!-- Carousel wrapper -->
    <div class="carousel-outer relative" ref="outerRef">
      <div ref="trackRef" class="carousel-track" @wheel="onWheel" @mousedown="onPointerDown" @mousemove="onPointerMove" @mouseup="onPointerUp" @mouseleave="onPointerUp" @touchstart.prevent="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
        <div
          v-for="fn in functions"
          :key="fn.id"
          class="card-fn"
          :style="{ '--card-accent': fn.color }"
          :title="'Open ' + fn.cta"
          @click="navigate(fn.route)"
        >
          <div class="card-fn-icon" v-html="fn.icon"/>
          <p class="card-fn-title" v-html="fn.title"/>
          <p class="card-fn-sub">{{ fn.sub }}</p>
          <div class="flex-1"/>
          <button class="card-fn-btn" :style="{ background: fn.color, color: fn.btnText }" :title="'Go to ' + fn.route.slice(1)" @click.stop="navigate(fn.route)">
            {{ fn.cta }}
          </button>
        </div>
      </div>
    </div>

    <!-- Stats dashboard -->
    <div v-if="stats.totalScans > 0" class="flex items-center gap-6 my-4 px-1">
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold tabular-nums" style="color:#edff00;">{{ stats.totalScans }}</span>
        <span class="text-xs" style="color:rgba(255,255,255,0.3);">scans</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold tabular-nums" style="color:#edff00;">{{ stats.totalOrphans }}</span>
        <span class="text-xs" style="color:rgba(255,255,255,0.3);">orphans found</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold tabular-nums" style="color:#edff00;">{{ stats.lastOrphans }}</span>
        <span class="text-xs" style="color:rgba(255,255,255,0.3);">latest scan</span>
      </div>
    </div>

    <!-- Divider -->
    <div class="w-full h-px my-4" style="background:rgba(255,255,255,0.05);"/>

    <!-- Tips & news -->
    <p class="text-xs font-medium tracking-wider mb-3" style="color:rgba(255,255,255,0.35);">TIPS & NEWS</p>
    <div class="flex flex-col gap-2 pb-6">
      <div v-for="(tip, i) in tips" :key="i" class="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-white/[0.02] border-white/[0.04] transition-colors hover:bg-white/[0.04]">
        <span class="text-xs font-mono shrink-0 text-white/25">&gt;</span>
        <p class="text-xs leading-relaxed text-white/45">{{ tip.text }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const router = useRouter();
const electronAPI = process.client ? window.electronAPI : null;
const stats = ref({ totalScans: 0, totalOrphans: 0, lastOrphans: 0 });

onMounted(async () => {
  if (!electronAPI) return;
  try {
    const h = await electronAPI.loadScanHistory();
    if (h && h.length) {
      stats.value = {
        totalScans: h.length,
        totalOrphans: h.reduce((s, e) => s + (e.orphans || 0), 0),
        lastOrphans: h[0]?.orphans || 0,
      };
    }
  } catch {}
});

const functions = [
  {
    id: 'scan', route: '/scan',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    title: 'Scan<br><span style="color:#edff00;">Start</span>',
    sub: 'Find orphan executables',
    color: '#edff00', btnText: '#1a1900', cta: 'Start'
  },
  {
    id: 'organize', route: '/organize',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    title: 'Organize<br><span style="color:#378ADD;">Start</span>',
    sub: 'Group by category',
    color: '#378ADD', btnText: '#042C53', cta: 'Open'
  },
  {
    id: 'broken-links', route: '/broken-links',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    title: 'Broken<br><span style="color:#D85A30;">Links</span>',
    sub: 'Clean invalid .lnk files',
    color: '#D85A30', btnText: '#4A1B0C', cta: 'Open'
  },
  {
    id: 'history', route: '/history',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    title: 'History<br><span style="color:#1D9E75;">& Backup</span>',
    sub: 'Review and undo actions',
    color: '#1D9E75', btnText: '#04342C', cta: 'Open'
  },
  {
    id: 'verify', route: '/verify',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    title: 'Verify<br><span style="color:#D4537E;">Signatures</span>',
    sub: 'Check file security',
    color: '#D4537E', btnText: '#4B1528', cta: 'Open'
  },
];

const tips = [
  { text: 'Smart selection automatically skips installers and updater files.' },
  { text: 'New: you can organize Start Menu items with drag & drop.' },
  { text: 'Signature verification checks the validity of digital certificates on executables.' },
];

// Carousel scroll logic
const trackRef = ref(null);
const outerRef = ref(null);

let isDragging = false;
let lastX = 0;
let velocity = 0;
let momentumId = null;
let lastMoveTime = 0;

function onPointerDown(e) {
  if (e.button !== 0) return;
  isDragging = true;
  lastX = e.clientX;
  trackRef.value.style.cursor = 'grabbing';
  velocity = 0;
  cancelMomentum();
}

function onPointerMove(e) {
  if (!isDragging) return;
  const dx = e.clientX - lastX;
  trackRef.value.scrollLeft -= dx;
  velocity = dx;
  lastX = e.clientX;
  lastMoveTime = Date.now();
}

function onPointerUp() {
  if (!isDragging) return;
  isDragging = false;
  trackRef.value.style.cursor = '';
  const elapsed = Date.now() - lastMoveTime;
  if (Math.abs(velocity) > 1 && elapsed < 150) {
    startMomentum(velocity * 6);
  }
}

function onTouchStart(e) {
  const t = e.touches[0];
  isDragging = true;
  lastX = t.clientX;
  velocity = 0;
  cancelMomentum();
}

function onTouchMove(e) {
  if (!isDragging) return;
  const t = e.touches[0];
  const dx = t.clientX - lastX;
  trackRef.value.scrollLeft -= dx;
  velocity = dx;
  lastX = t.clientX;
  lastMoveTime = Date.now();
}

function onTouchEnd() {
  isDragging = false;
  const elapsed = Date.now() - lastMoveTime;
  if (Math.abs(velocity) > 1 && elapsed < 150) {
    startMomentum(velocity * 6);
  }
}

function startMomentum(v) {
  cancelMomentum();
  const el = trackRef.value;
  function step() {
    v *= 0.92;
    el.scrollLeft -= v;
    if (Math.abs(v) > 0.5) {
      momentumId = requestAnimationFrame(step);
    }
  }
  momentumId = requestAnimationFrame(step);
}

function cancelMomentum() {
  if (momentumId) { cancelAnimationFrame(momentumId); momentumId = null; }
}

function onWheel(e) {
  e.preventDefault();
  trackRef.value.scrollLeft += e.deltaY;
}

function navigate(route) {
  router.push(route);
}
</script>

<style scoped>
.carousel-outer { position: relative; }

.carousel-track {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 10px 10px 8px;
  cursor: grab;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}
.carousel-track::-webkit-scrollbar { display: none; }

.card-fn {
  flex: 0 0 190px;
  background: #111;
  border: 0.5px solid #262626;
  border-radius: 16px;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  min-height: 195px;
  cursor: pointer;
  transition: transform 0.15s ease-out, border-color 0.15s ease-out;
  user-select: none;
}
.card-fn:hover { transform: scale(1.03); border-color: var(--card-accent); }

.card-fn-icon { font-size: 22px; color: var(--card-accent); line-height: 1; }
.card-fn-title { font-size: 19px; font-weight: 500; color: #fff; margin: 14px 0 2px; line-height: 1.25; }
.card-fn-sub { font-size: 12px; color: #8a8a8a; margin: 0; }
.card-fn-btn {
  margin-top: 16px;
  border: none;
  border-radius: 999px;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  font-family: inherit;
  align-self: flex-start;
}
.card-fn-btn:hover { opacity: 0.85; }


</style>
