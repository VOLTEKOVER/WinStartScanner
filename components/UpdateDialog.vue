<template>
  <Teleport to="body">
    <div v-if="showUpdateDialog" class="dialog-overlay z-[130]" @click.self="onBackdrop">
      <div class="dialog-card" role="dialog" aria-modal="true" aria-label="Software update" @keydown.esc="onBackdrop">
        <div class="flex items-start gap-3 mb-4">
          <span
            class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            :style="iconWrapStyle"
          >
            <svg v-if="updateReady" width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="accent" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="accent" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </span>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-white/85">{{ title }}</h3>
            <p class="text-xs text-white/40 mt-0.5">WinStartScanner v{{ updateInfo.version || '?' }}</p>
          </div>
          <button class="btn-ghost ml-auto text-white/40 hover:text-white" style="padding:2px 6px" @click="onBackdrop" title="Close" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          </button>
        </div>

        <!-- Downloading -->
        <div v-if="downloading" class="space-y-3">
          <p class="text-sm text-white/50 leading-relaxed">Downloading the new version in the background. You can keep working — we'll let you know when it's ready.</p>
          <div class="progress-track"><div class="progress-fill" :style="{ width: updateProgress + '%' }"></div></div>
          <div class="flex items-center justify-between text-[11px] text-white/40">
            <span>Downloading…</span>
            <span class="font-mono">{{ updateProgress }}%</span>
          </div>
          <div class="flex items-center justify-end gap-3 pt-1">
            <button class="btn-ghost text-sm" @click="showUpdateDialog = false" title="Hide this dialog, download continues">Continue in background</button>
          </div>
        </div>

        <!-- Ready to install -->
        <div v-else-if="updateReady && !updateError" class="space-y-4">
          <p class="text-sm text-white/50 leading-relaxed">
            The update has been downloaded. WinStartScanner will close, install the new version and reopen automatically.
          </p>
          <div v-if="updateInfo.releaseNotes" class="max-h-32 overflow-auto rounded-lg p-3 text-[11px] text-white/40 whitespace-pre-wrap" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)">{{ updateInfo.releaseNotes }}</div>
          <div class="flex items-center justify-end gap-3">
            <button class="btn-ghost text-sm" @click="showUpdateDialog = false" title="Install later">Later</button>
            <button class="btn-accent text-sm py-2 px-5" style="background:var(--accent);color:#fff" @click="applyAndRestart" title="Install the update and restart now">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1 inline"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Update &amp; restart
            </button>
          </div>
        </div>

        <!-- Error -->
        <div v-else class="space-y-4">
          <p class="text-sm text-[var(--color-error)] leading-relaxed">{{ updateError }}</p>
          <div class="flex items-center justify-end gap-3">
            <button class="btn-ghost text-sm" @click="showUpdateDialog = false" title="Close">Close</button>
            <button v-if="updateReady" class="btn-accent text-sm py-2 px-5" style="background:var(--accent);color:#fff" @click="applyAndRestart" title="Try installing again">Retry install</button>
            <button v-else class="btn-accent text-sm py-2 px-5" style="background:var(--accent);color:#fff" @click="retryDownload" title="Try downloading again">Try again</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const {
  updateInfo, downloading, updateProgress,
  updateReady, updateError, showUpdateDialog,
  applyAndRestart, retryDownload,
} = useUpdater();

const accent = '#378ADD';

const title = computed(() => {
  if (updateError.value && !downloading.value) return 'Update failed';
  if (downloading.value) return 'Downloading update';
  if (updateReady.value) return 'Update ready to install';
  return 'Update available';
});
const iconWrapStyle = computed(() => ({
  background: 'rgba(55,138,221,0.14)',
  border: '1px solid rgba(55,138,221,0.35)',
}));

function onBackdrop() {
  showUpdateDialog.value = false;
}
</script>
