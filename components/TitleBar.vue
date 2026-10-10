<template>
  <header
    data-bar
    class="app-drag app-titlebar flex items-center h-11 pl-2 select-none"
    @dblclick.prevent="maybeToggleMaximize"
  >
    <div class="flex items-center gap-2 h-full">
      <AppLogo textClass="text-white/70" />
      <button
        v-if="!isHome"
        @click="goHome"
        class="history-btn app-no-drag"
        :style="{ color: homeColor }"
        title="Go back to home"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        <span>Home</span>
      </button>
    </div>

    <div class="flex items-center gap-1 ml-auto app-no-drag h-full">
      <!-- Background processes -->
      <div v-if="activeJobs.length" class="flex items-center gap-1.5 mr-1">
        <div
          v-for="job in activeJobs"
          :key="job.key"
          class="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
          :style="jobStyle(job.color)"
          :title="job.label + ' in progress'"
        >
          <span class="w-1.5 h-1.5 rounded-full animate-pulse-dot" :style="{ background: job.color }"></span>
          {{ job.label }}
        </div>
      </div>

      <!-- OpenCode status -->
      <div class="flex items-center mr-1 relative">
        <button
          @click.stop="ocPopover = !ocPopover"
class="icon-btn titlebar-oc-btn app-no-drag"
          :class="{ active: ocPopover }"
          :aria-expanded="ocPopover"
          aria-haspopup="dialog"
          aria-label="OpenCode connection status"
          title="OpenCode connection status"
        >
          <svg width="20" height="15" viewBox="0 0 56 42" fill="none" xmlns="http://www.w3.org/2000/svg"
            :class="opencodeAvailable ? 'text-yellow-400' : 'text-white/10'"
            :style="opencodeAvailable ? 'filter:drop-shadow(0 0 4px rgba(250,204,21,0.3))' : ''">
            <path d="M18 30H6V18H18V30Z" fill="currentColor" opacity="0.4"/>
            <path d="M18 12H6V30H18V12ZM24 36H0V6H24V36Z" fill="currentColor"/>
            <path d="M48 30H36V18H48V30Z" fill="currentColor" opacity="0.4"/>
            <path d="M36 30H48V12H36V30ZM54 36H36V42H30V6H54V36Z" fill="currentColor"/>
          </svg>
        </button>

        <Teleport to="body">
          <div
            v-if="ocPopover"
            ref="popoverEl"
            role="dialog"
            aria-label="OpenCode connection status"
            tabindex="-1"
            class="fixed z-[120] bg-[#0b0b0b] border border-white/10 rounded-xl p-4 shadow-2xl animate-fade-up"
            style="width:260px;"
            :style="popoverStyle"
            @click.stop
            @keydown.esc="ocPopover = false"
          >
            <div class="flex items-center gap-2.5 mb-3">
              <span class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                :style="opencodeAvailable ? 'background:rgba(250,204,21,0.12);border:1px solid rgba(250,204,21,0.3)' : 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08)'">
                <svg width="18" height="14" viewBox="0 0 56 42" fill="none" xmlns="http://www.w3.org/2000/svg" :class="opencodeAvailable ? 'text-yellow-400' : 'text-white/20'">
                  <path d="M18 30H6V18H18V30Z" fill="currentColor" opacity="0.4"/>
                  <path d="M18 12H6V30H18V12ZM24 36H0V6H24V36Z" fill="currentColor"/>
                  <path d="M48 30H36V18H48V30Z" fill="currentColor" opacity="0.4"/>
                  <path d="M36 30H48V12H36V30ZM54 36H36V42H30V6H54V36Z" fill="currentColor"/>
                </svg>
              </span>
              <div class="min-w-0">
                <div class="text-[13px] font-semibold text-white/80 flex items-center gap-1.5">
                  OpenCode
                  <span class="w-2 h-2 rounded-full shrink-0" :class="opencodeAvailable ? 'bg-yellow-400' : 'bg-white/10'"></span>
                </div>
                <div class="text-[10px] uppercase tracking-wider" :class="opencodeAvailable ? 'text-yellow-400' : 'text-white/30'">
                  {{ opencodeAvailable ? 'Connected' : 'Not found' }}
                </div>
              </div>
            </div>
            <p class="text-xs text-white/40 leading-relaxed mb-3">
              {{ opencodeAvailable ? 'AI engine available for app selection and organization. Everything runs locally on this PC.' : 'OpenCode CLI was not detected. Install it to enable AI features — or review your AI settings.' }}
            </p>
            <div class="flex items-center gap-2">
              <button
                class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:brightness-125"
                style="background:rgba(250,204,21,0.12);color:#facc15;border:0.5px solid rgba(250,204,21,0.35)"
                @click="goOcSettings"
                title="Open the OpenCode settings in the app"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                OpenCode settings
              </button>
              <button class="btn-ghost text-xs text-white/40 hover:text-white" @click="ocPopover = false" title="Close popover">Close</button>
            </div>
          </div>
        </Teleport>
      </div>

      <!-- Update indicator -->
      <button
        v-if="updateAvailable"
        class="update-pill app-no-drag"
        :class="{ ready: updateReady, busy: downloading }"
        @click="$emit('update')"
        :title="updateTitle"
      >
        <span
          class="w-1.5 h-1.5 rounded-full shrink-0"
          :class="downloading ? 'animate-pulse-dot' : ''"
          :style="{ background: updateReady ? '#22c55e' : 'var(--accent)' }"
        ></span>
        <svg v-if="updateReady" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else-if="downloading" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        <span class="text-[11px] font-medium whitespace-nowrap">{{ updateLabel }}</span>
      </button>
      <div v-else class="flex items-center gap-1.5 mr-1 text-white/25">
        <span class="w-1.5 h-1.5 rounded-full bg-white/20" title="App up to date"></span>
        <span class="text-[11px]">Up to date</span>
      </div>

      <span class="text-[11px] text-white/30 mr-2">v{{ appVersion }}</span>

      <div class="flex items-center">
        <button @click="reload" class="icon-btn app-no-drag" title="Reload interface" aria-label="Reload">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
        <button @click="$emit('settings')" class="icon-btn app-no-drag" title="Settings" aria-label="Settings">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>

      <!-- Window controls: flush to the top-right corner, full titlebar height -->
      <div class="flex items-stretch self-stretch">
        <button @click="minimize" class="win-btn win-btn-min app-no-drag" title="Minimize" aria-label="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1.2"/></svg>
        </button>
        <button @click="toggleMaximize" class="win-btn win-btn-max app-no-drag" :title="isMaximized ? 'Restore' : 'Maximize'" :aria-label="isMaximized ? 'Restore' : 'Maximize'">
          <svg v-if="isMaximized" width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1"/><path d="M4.5 3V2.5A1.5 1.5 0 0 1 6 1h3.5A1.5 1.5 0 0 1 11 2.5V6a1.5 1.5 0 0 1-1.5 1.5H9" stroke="currentColor" stroke-width="1"/></svg>
          <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="2" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/></svg>
        </button>
        <button @click="closeWin" class="win-btn win-btn-close app-no-drag" title="Close" aria-label="Close">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.2"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.2"/></svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
const props = defineProps({ updateAvailable: Boolean, updateVersion: String, downloading: Boolean, updateProgress: Number, updateReady: Boolean });
const emit = defineEmits(['update', 'settings', 'opencode-settings']);

const updateTitle = computed(() => {
  if (props.updateReady) return 'Update ready to install — click to install';
  if (props.downloading) return 'Downloading update ' + (props.updateProgress || 0) + '%';
  return 'Update available' + (props.updateVersion ? ' — v' + props.updateVersion : '');
});
const updateLabel = computed(() => {
  if (props.updateReady) return 'Update ready';
  if (props.downloading) return 'Updating ' + (props.updateProgress || 0) + '%';
  return props.updateVersion ? 'v' + props.updateVersion : 'Update';
});
const route = useRoute();
const router = useRouter();
const isHome = computed(() => route.path === '/');
const homeColor = computed(() => {
  const m = { '/scan': '#edff00', '/organize': '#378ADD', '/broken-links': '#D85A30', '/history': '#1D9E75', '/verify': '#D4537E' };
  return m[route.path] || 'rgba(255,255,255,0.4)';
});
function goHome() { router.push('/'); }

const api = process.client ? window.electronAPI : null;
const opencodeAvailable = ref(false);
const appVersion = ref('');
const ocPopover = ref(false);
const isMaximized = ref(false);
const popoverEl = ref(null);
const popoverStyle = ref({});

const { scanning, aiWorking, blScanning, orgBusy } = useJobState();

const activeJobs = computed(() => {
  const jobs = [];
  if (scanning.value) jobs.push({ key: 'scan', label: 'Scanning', color: '#edff00' });
  if (aiWorking.value) jobs.push({ key: 'ai', label: 'AI selecting', color: '#f59e0b' });
  if (blScanning.value) jobs.push({ key: 'bl', label: 'Broken links', color: '#D85A30' });
  if (orgBusy.value) jobs.push({ key: 'org', label: 'Organizing', color: '#378ADD' });
  return jobs;
});

function jobStyle(color) {
  const n = parseInt(color.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return { background: `rgba(${r},${g},${b},0.1)`, color, border: `0.5px solid rgba(${r},${g},${b},0.25)` };
}

onMounted(async () => {
  if (api) {
    try {
      const info = await api.getAppInfo();
      if (info?.version) appVersion.value = info.version;
    } catch {}
    try {
      const res = await api.checkOpenCode();
      opencodeAvailable.value = res.available;
    } catch {}
    try {
      const state = await api.getWindowState();
      if (state) isMaximized.value = state.isMaximized;
    } catch {}
    api.onMaximizeChange((v) => { isMaximized.value = v; });
  }
});

watch(ocPopover, (open) => {
  if (open) nextTick(positionPopover);
  else popoverStyle.value = {};
});

function positionPopover() {
  const btn = document.querySelector('.titlebar-oc-btn');
  if (!btn || !popoverEl.value) return;
  const r = btn.getBoundingClientRect();
  let x = r.right - 260;
  let y = r.bottom + 8;
  if (x < 8) x = 8;
  if (x + 260 > window.innerWidth - 8) x = window.innerWidth - 268;
  popoverStyle.value = { left: x + 'px', top: y + 'px' };
}

function goOcSettings() {
  ocPopover.value = false;
  emit('opencode-settings');
}

function minimize() { api?.windowMinimize(); }
function toggleMaximize() { api?.windowMaximize(); }
function closeWin() { api?.windowClose(); }
function reload() { api?.windowReload(); }

function maybeToggleMaximize(e) {
  const target = e.target;
  if (target instanceof HTMLElement && target.closest('.app-no-drag, button, a, input')) return;
  toggleMaximize();
}
</script>

<style scoped>
.app-titlebar {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.icon-btn {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}
.icon-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); }
.icon-btn.active { background: rgba(255,255,255,0.1); }

.win-btn {
  width: 46px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  border-radius: 0;
  transition: background 0.15s, color 0.15s;
}
.win-btn:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.9); }
.win-btn-close:hover { background: #e81123; color: white; }

.history-btn {
  display: flex; align-items: center; gap: 5px;
  background: none; border: none;
  font-size: 12px; font-weight: 500;
  cursor: pointer;
  padding: 4px 10px 4px 6px;
  border-radius: 7px;
  transition: background 0.15s, opacity 0.15s;
}
.history-btn:hover { background: rgba(255,255,255,0.06); opacity: 1; }

.update-pill {
  display: flex; align-items: center; gap: 6px;
  margin-right: 4px;
  padding: 3px 10px;
  border-radius: 9999px;
  border: 0.5px solid rgba(55,138,221,0.4);
  background: rgba(55,138,221,0.12);
  color: var(--accent);
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.update-pill:hover { background: rgba(55,138,221,0.22); }
.update-pill.ready { border-color: rgba(34,197,94,0.45); background: rgba(34,197,94,0.14); color: #22c55e; }
.update-pill.ready:hover { background: rgba(34,197,94,0.24); }
.update-pill.busy { cursor: default; }
</style>