<template>
  <div class="flex-1 flex flex-col px-8 overflow-hidden app-no-drag">

    <!-- Hero area -->
    <div class="pt-6 pb-4">
      <h1 class="text-3xl font-bold tracking-tight text-white">
        Scan
        <span style="color:#edff00;">Start</span>
      </h1>
      <p class="text-sm mt-1 tracking-wide" style="color:rgba(255,255,255,0.35);">
        Find installed programs not linked to the Start Menu
      </p>
    </div>

    <!-- Actions toolbar -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <button class="btn-accent text-sm py-2 px-6" :disabled="scanning" @click="startScan" title="Run a full system scan">
        <svg v-if="!scanning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span v-if="!scanning">Start scan</span>
        <span v-else class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-black animate-pulse-dot"/> Scanning...
        </span>
      </button>
      <div v-if="scanStatus" class="flex items-center gap-2 text-sm" style="color:rgba(255,255,255,0.5);">
        <span class="w-1.5 h-1.5 rounded-full animate-pulse-dot" style="background:#edff00;"/>
        <span>{{ scanStatus }}</span>
      </div>
      <span v-else-if="!scanning && scanResults.length === 0 && started" class="text-xs" style="color:rgba(255,255,255,0.3);">Last scan: {{ lastScan }}</span>
    </div>

    <!-- Progress + scan stats -->
    <div v-if="scanning" class="space-y-2 mb-4">
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: scanProgress + '%' }"/>
      </div>
      <div class="flex items-center gap-8 text-xs" style="color:rgba(255,255,255,0.35);">
        <span>Orphans found <strong style="color:rgba(255,255,255,0.6);">{{ orphanCount }}</strong></span>
        <span>Folders scanned <strong style="color:rgba(255,255,255,0.6);">{{ foldersScanned }}</strong></span>
      </div>
    </div>

    <!-- Error -->
    <div v-if="scanError" class="mb-4 p-3 glass rounded-xl text-sm border animate-fade-up" style="color:var(--color-warning);border-color:rgba(245,158,11,0.2);">
      {{ scanError }}
    </div>

    <!-- Success banner -->
    <div v-if="creationResult" class="mb-4 p-3 glass rounded-xl text-sm border animate-slide-up" style="color:var(--color-success);border-color:rgba(34,197,94,0.2);">
      <span class="font-medium">{{ creationResult.created }}</span> shortcuts created in
      <span class="font-mono text-[11px]" style="color:rgba(255,255,255,0.4);">{{ creationResult.folder }}</span>
      <span v-if="creationResult.DesktopCreated > 0"> · <span class="font-medium">{{ creationResult.DesktopCreated }}</span> on Desktop</span>
      <button class="ml-3 btn-ghost text-[11px]" @click="creationResult = null" title="Close message">Close</button>
    </div>

    <!-- Main working container -->
    <div class="flex-1 min-h-0 flex flex-col p-3 glass rounded-xl mb-3">

    <!-- Post-scan toolbar -->
    <template v-if="scanResults.length > 0 && !scanning">
      <div class="flex items-center gap-2 flex-wrap">
        <div class="relative flex-1 min-w-[200px] max-w-xs">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:rgba(255,255,255,0.2);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchQuery" type="text" placeholder="Filter by name, path or publisher..." class="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-sm text-white/80 placeholder-white/20 outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all"/>
        </div>
        <div class="w-px h-5 bg-white/10"/>
        <button class="btn-ghost text-xs" @click="selectAll" title="Select all visible results">Select all</button>
        <button v-if="selectedCount > 0" class="btn-ghost text-xs" @click="deselectAll" title="Deselect all items">Deselect</button>
        <button class="btn-accent text-xs py-1.5 px-3" :class="aiWorking ? 'opacity-60' : ''" style="background:#edff00;color:#000;" @click="runAiSelect" :disabled="aiWorking || scanResults.length === 0" title="Use OpenCode to select recommended apps">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 4 4 0 0 1-5 5 6 6 0 0 1-4-10z"/><circle cx="18" cy="8" r="0.5"/><circle cx="20" cy="12" r="0.5"/><circle cx="16" cy="10" r="0.5"/></svg>
          <span v-if="!aiWorking">AI select</span>
          <span v-else class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-black animate-pulse-dot"/> Selecting...</span>
        </button>
        <button class="btn-accent text-sm py-1.5 px-5 ml-auto" :disabled="selectedCount === 0 || creatingLinks" @click="showConfirm = true" title="Create shortcuts in Start Menu">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="12" x2="2" y2="12"/><polyline points="5 9 2 12 5 15"/><polyline points="19 9 22 12 19 15"/></svg>
          <span v-if="!creatingLinks">{{ selectedCount > 0 ? `Create in Start (${selectedCount})` : 'Create in Start' }}</span>
          <span v-else class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-black animate-pulse-dot"/> Creating...</span>
        </button>
      </div>
      <div class="flex items-center gap-3 mb-2 text-xs px-0.5" style="color:rgba(255,255,255,0.3);">
        <span><strong style="color:rgba(255,255,255,0.5);">{{ filteredResults.length }}</strong> results</span>
        <span v-if="searchQuery" style="color:rgba(255,255,255,0.2);">(filter active)</span>
        <span v-if="selectedCount > 0" style="color:rgba(255,255,255,0.4);">
          <strong style="color:#edff00;">{{ selectedCount }}</strong> selected —
          <strong>{{ formatSize(totalRecoverableSize) }}</strong> total
        </span>
      </div>
    </template>

    <!-- Skeleton loader -->
    <div v-if="scanning && scanResults.length === 0" class="flex-1 min-h-0 overflow-hidden pb-4">
      <div class="space-y-1 px-3">
        <div v-for="n in 10" :key="n" class="flex items-center gap-3 py-2">
          <div class="skeleton w-4 h-4 rounded"/><div class="skeleton h-4 flex-1"/><div class="skeleton w-16 h-4"/><div class="skeleton w-28 h-4"/>
        </div>
      </div>
    </div>

    <!-- Results -->
    <div v-else-if="displayItems.length > 0" ref="resultsContainer" class="flex-1 min-h-0 overflow-y-auto pb-4" @scroll="onResultsScroll">
      <div class="sticky top-0 z-10 bg-black/80 backdrop-blur-sm grid grid-cols-[32px_28px_1fr_80px_110px_70px] gap-2 px-3 py-2 text-[11px] font-medium uppercase tracking-widest border-b border-white/5" style="color:rgba(255,255,255,0.25);">
        <span/><span/>          <span>Name</span><span class="text-right">Size</span><span>Source</span><span class="text-center">Signed</span>
      </div>
      <div :style="{ height: totalListHeight + 'px', position: 'relative' }">
        <div v-for="item in visibleResults" :key="item._key" :style="{ position: 'absolute', top: item._top + 'px', left: 0, right: 0 }"
          class="grid grid-cols-[32px_28px_1fr_80px_110px_70px] gap-2 px-3 py-2 text-sm border-b border-white/[0.015] hover:bg-white/[0.02] transition-colors rounded-lg items-center cursor-pointer"
          :class="{ 'bg-white/[0.03]': isSelected(item) }" @click="toggleItem(item)" :title="item.Path">
          <div class="flex items-center justify-center" @click.stop>
            <div class="w-4 h-4 rounded border transition-all flex items-center justify-center"
              :class="isSelected(item) ? 'bg-[#edff00] border-[#edff00]' : 'border-white/20 hover:border-white/40'"
              role="checkbox" :aria-checked="isSelected(item)" tabindex="0" @keydown.space.prevent="toggleItem(item)" @click.stop="toggleItem(item)">
              <svg v-if="isSelected(item)" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div class="flex items-center justify-center w-6 h-6 rounded overflow-hidden bg-white/[0.04]">
            <img v-if="exeIcon(item)" :src="exeIcon(item)" class="w-full h-full object-contain" alt=""/>
            <span v-else class="text-[9px] font-bold" style="color:rgba(255,255,255,0.15);">{{ (item.Name && item.Name[0]) || '?' }}</span>
          </div>
          <div class="truncate min-w-0">
            <span style="color:rgba(255,255,255,0.8);">{{ displayName(item) }}</span>
            <span v-if="item.Company" class="ml-2 text-[11px]" style="color:rgba(255,255,255,0.3);">{{ item.Company }}</span>
          </div>
          <span class="text-right text-xs tabular-nums" style="color:rgba(255,255,255,0.35);">{{ formatSize(item.Size) }}</span>
          <span class="truncate text-xs" :title="item.Path" style="color:rgba(255,255,255,0.25);">{{ shortPath(item.Path) }}</span>
          <span class="text-center text-[10px] font-medium uppercase tracking-wider"
            :class="sigClass(item)" :title="sigTitle(item)">{{ sigLabel(item) }}</span>
        </div>
      </div>
      <button v-if="scrollTop > 800" class="sticky bottom-4 left-1/2 -translate-x-1/2 mt-2 btn-ghost text-xs mx-auto" @click="scrollToTop" title="Scroll to top">↑ Top</button>
    </div>

    <!-- Empty states -->
    <div v-else-if="!scanning && scanResults.length > 0 && filteredResults.length === 0" class="flex-1 flex items-center justify-center text-sm" style="color:rgba(255,255,255,0.2);">No results match the filter</div>
    <div v-else-if="!scanning && scanResults.length === 0 && !scanError && started" class="flex-1 flex items-center justify-center text-sm" style="color:rgba(255,255,255,0.2);">
      <div class="text-center"><div class="text-4xl mb-3 opacity-10">✓</div><p>No orphan executables found</p><p class="text-xs mt-1" style="color:rgba(255,255,255,0.15);">Seems like all your apps are already in the Start Menu</p></div>
    </div>
    <div v-else-if="!started" class="flex-1 flex items-center justify-center text-sm" style="color:rgba(255,255,255,0.1);">
      <div class="text-center max-w-sm">
        <div class="text-5xl mb-4 opacity-10">⊞</div>
        <p style="color:rgba(255,255,255,0.2);">Press <span class="font-medium" style="color:#edff00;">Start scan</span> to begin</p>
        <p class="text-xs mt-2 leading-relaxed" style="color:rgba(255,255,255,0.1);">WinStartScanner scans your system to find installed apps not yet in the Start Menu.</p>
      </div>
    </div>
    </div>

    <!-- Confirmation dialog -->
    <Teleport to="body">
      <div v-if="showConfirm" class="dialog-overlay" @click.self="showConfirm = false">
        <div class="dialog-card">
          <h3 class="text-lg font-semibold mb-2" style="color:rgba(255,255,255,0.9);">Confirm shortcut creation</h3>
          <p class="text-sm mb-4" style="color:rgba(255,255,255,0.4);">
            <strong style="color:rgba(255,255,255,0.7);">{{ selectedCount }}</strong> shortcuts will be created
            in the Start Menu (<span class="font-mono text-[11px]" style="color:rgba(255,255,255,0.3);">Start Menu\Programs\WinStartScanner</span>)
            totalling <strong style="color:rgba(255,255,255,0.7);">{{ formatSize(totalRecoverableSize) }}</strong>.
          </p>
          <div class="max-h-32 overflow-y-auto mb-4 space-y-1 text-xs" style="color:rgba(255,255,255,0.35);">
            <div v-for="(name, i) in confirmNames" :key="i" class="truncate px-1 py-0.5 rounded hover:bg-white/[0.03]">{{ name }}</div>
          </div>
          <label class="flex items-center gap-2 text-xs mb-3 cursor-pointer select-none" style="color:rgba(255,255,255,0.4);">
            <div class="w-4 h-4 rounded border transition-all flex items-center justify-center"
              :class="alsoDesktop ? 'bg-[#edff00] border-[#edff00]' : 'border-white/20'"
              @click.stop="alsoDesktop = !alsoDesktop" tabindex="0" @keydown.space.prevent="alsoDesktop = !alsoDesktop">
              <svg v-if="alsoDesktop" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span>Also create on Desktop (in <span class="font-mono">WinStartScanner</span> folder)</span>
          </label>
          <div class="flex items-center justify-end gap-3">
            <button class="btn-ghost text-sm" @click="showConfirm = false" title="Cancel">Cancel</button>
            <button class="btn-accent text-sm py-2 px-6" :disabled="creatingLinks" @click="confirmCreate" title="Confirm">
              <span v-if="!creatingLinks">Create {{ selectedCount }} shortcuts</span>
              <span v-else class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-black animate-pulse-dot"/> Creating...</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const ITEM_HEIGHT = 41;
const BUFFER = 15;
const electronAPI = process.client ? window.electronAPI : null;
const creatingLinks = ref(false);
const creationResult = ref(null);
const searchQuery = ref('');
const showConfirm = ref(false);
const alsoDesktop = ref(false);
const iconCache = ref({});
const started = ref(false);
const lastScan = ref('');
let iconLoadPending = false;

const {
  scanning, scanProgress, scanStatus, scanResults,
  orphanCount, totalScanned, foldersScanned, scanError, aiWorking,
} = useJobState();

const resultsContainer = ref(null);
const scrollTop = ref(0);
const containerHeight = ref(0);
const selectedIdx = ref({});

const filteredResults = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return scanResults.value;
  return scanResults.value.filter(r =>
    (r.Name && r.Name.toLowerCase().includes(q)) ||
    (r.Path && r.Path.toLowerCase().includes(q)) ||
    (r.Company && r.Company.toLowerCase().includes(q)) ||
    (r.Product && r.Product.toLowerCase().includes(q))
  );
});

const displayItems = computed(() =>
  filteredResults.value.map((r, i) => ({ ...r, _key: r.Path + '_' + i, _origIndex: scanResults.value.indexOf(r), _top: i * ITEM_HEIGHT }))
);
const totalListHeight = computed(() => displayItems.value.length * ITEM_HEIGHT);
const visibleResults = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / ITEM_HEIGHT) - BUFFER);
  const end = Math.min(displayItems.value.length, Math.ceil((scrollTop.value + containerHeight.value) / ITEM_HEIGHT) + BUFFER);
  return displayItems.value.slice(start, end);
});
const selectedCount = computed(() => Object.keys(selectedIdx.value).length);
const totalRecoverableSize = computed(() => { let t = 0; for (const k of Object.keys(selectedIdx.value)) t += scanResults.value[parseInt(k)]?.Size || 0; return t; });
const confirmNames = computed(() => { const n = []; for (const k of Object.keys(selectedIdx.value)) { const i = scanResults.value[parseInt(k)]; if (i) n.push(displayName(i) + (i.Company ? ` — ${i.Company}` : '')); } return n; });

function isSelected(item) { return !!selectedIdx.value[item._origIndex]; }
function toggleItem(item) { const o = { ...selectedIdx.value }; const i = item._origIndex; if (o[i]) delete o[i]; else o[i] = true; selectedIdx.value = o; }
function selectAll() { const o = {}; filteredResults.value.forEach(r => { const i = scanResults.value.indexOf(r); if (i >= 0) o[i] = true; }); selectedIdx.value = o; }
function deselectAll() { selectedIdx.value = {}; }

async function loadIcons(entries) {
  if (!electronAPI || iconLoadPending) return;
  const uncached = entries.filter(e => !iconCache.value[e._key]);
  if (!uncached.length) return;
  iconLoadPending = true;
  try { const icons = await electronAPI.getExeIcons(uncached.map(e => ({ key: e._key, path: e.Path }))); iconCache.value = { ...iconCache.value, ...icons }; } catch {} finally { iconLoadPending = false; }
}
watch(visibleResults, (items) => { if (items.length) loadIcons(items); }, { immediate: false });
function exeIcon(item) { return iconCache.value[item._key] || null; }
function displayName(item) { return (item.Name || '').replace(/\.exe$/i, ''); }
function onResultsScroll() { if (resultsContainer.value) { scrollTop.value = resultsContainer.value.scrollTop; containerHeight.value = resultsContainer.value.clientHeight; } }
function scrollToTop() { resultsContainer.value?.scrollTo({ top: 0, behavior: 'smooth' }); }
watch(scanResults, (r) => { if (r.length) { nextTick(() => { if (resultsContainer.value) containerHeight.value = resultsContainer.value.clientHeight; const fb = displayItems.value.slice(0, 30); if (fb.length) loadIcons(fb); }); } });
watch(filteredResults, () => { nextTick(() => { if (resultsContainer.value) containerHeight.value = resultsContainer.value.clientHeight; }); });

async function confirmCreate() {
  showConfirm.value = false; if (!selectedCount.value) return; creatingLinks.value = true; scanError.value = null;
  try {
    const items = Object.keys(selectedIdx.value).map(k => scanResults.value[parseInt(k)]);
    const r = await electronAPI.createShortcuts({ items, alsoDesktop: alsoDesktop.value });
    creationResult.value = r; deselectAll(); alsoDesktop.value = false;
  } catch (err) { scanError.value = err.message || 'Error'; } finally { creatingLinks.value = false; }
}

async function selectWithAI() {
  if (!electronAPI || scanResults.value.length === 0) return;
  aiWorking.value = true;
  scanError.value = null;
  scanStatus.value = 'Asking AI to select recommended apps...';
  try {
    const res = await electronAPI.aiSmartSelectAuto(JSON.parse(JSON.stringify(scanResults.value)));
    if (res.success && res.indices && res.indices.length > 0) {
      const o = {};
      for (const idx of res.indices) o[idx] = true;
      selectedIdx.value = o;
    } else if (res.error) {
      scanError.value = 'OpenCode: ' + res.error;
    }
  } catch (err) { scanError.value = 'OpenCode: ' + (err.message || err); }
  finally { aiWorking.value = false; scanStatus.value = ''; }
}

async function runAiSelect() {
  if (!electronAPI || aiWorking.value || scanResults.value.length === 0) return;
  await selectWithAI();
}

async function startScan() {
  scanning.value = true; aiWorking.value = false; scanProgress.value = 0; scanStatus.value = 'Collecting Start Menu shortcuts...'; scanResults.value = []; orphanCount.value = 0; scanError.value = null; started.value = true; selectedIdx.value = {}; creationResult.value = null; searchQuery.value = ''; scrollTop.value = 0; iconCache.value = {};
  try {
    const data = await electronAPI.runScan();
    if (data.Orphans) scanResults.value = data.Orphans; if (data.TotalScanned) totalScanned.value = data.TotalScanned; if (data.FoldersScanned) foldersScanned.value = data.FoldersScanned;
    lastScan.value = new Date().toLocaleTimeString(); scanStatus.value = '';
    try { const settings = await electronAPI.loadSettings(); if (settings?.general?.desktopNotifications) { const n = scanResults.value.length; electronAPI.showNotification({ title: 'Scan complete', body: n > 0 ? `Found ${n} orphan executables` : 'No orphan executables found' }); } } catch {}
  } catch (err) { scanError.value = err.message || 'Scan error'; scanStatus.value = ''; } finally { scanning.value = false; }
}

function sigClass(item) {
  const s = (item.SignatureStatus || '').toLowerCase();
  if (s === 'valid') return 'text-green-500';
  if (s === 'unknownerror' || !s) return 'text-white/15';
  return 'text-yellow-500';
}
function sigLabel(item) {
  const s = (item.SignatureStatus || '').toLowerCase();
  if (s === 'valid') return '✓';
  if (s) return '!';
  return '·';
}
function sigTitle(item) {
  const s = (item.SignatureStatus || '');
  return s ? `Signature: ${s}` : 'Not signed';
}

function formatSize(bytes) { if (!bytes) return '-'; if (bytes < 1024) return bytes + ' B'; if (bytes < 1024*1024) return (bytes/1024).toFixed(0) + ' KB'; if (bytes < 1024*1024*1024) return (bytes/(1024*1024)).toFixed(1) + ' MB'; return (bytes/(1024*1024*1024)).toFixed(2) + ' GB'; }
function shortPath(p) { if (!p) return ''; const parts = p.split('\\'); return parts.length > 2 ? '...\\' + parts.slice(-2).join('\\') : p; }
</script>