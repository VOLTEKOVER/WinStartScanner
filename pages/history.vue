<template>
  <div class="flex-1 flex flex-col px-8 overflow-hidden app-no-drag">
    <div class="pt-6 pb-4">
      <h1 class="text-3xl font-bold tracking-tight text-white">
        History &amp; <span style="color:#1D9E75;">Backup</span>
      </h1>
      <p class="text-sm mt-1 tracking-wide" style="color:rgba(255,255,255,0.35);">
        Manage backups and review operation history
      </p>
    </div>

    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <button class="btn-accent text-sm py-2 px-6" style="background:#1D9E75;color:#000;" :disabled="saving" @click="createBackup" title="Create a manual backup of the Start Menu">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span v-if="!saving">Create backup</span>
        <span v-else class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-black animate-pulse-dot"/> Saving...</span>
      </button>
      <span v-if="backupMsg" class="text-xs" style="color:#1D9E75;">{{ backupMsg }}</span>
    </div>

    <div v-if="errorMsg" class="mb-4 p-3 glass rounded-xl text-sm border animate-fade-up" style="color:var(--color-warning);border-color:rgba(245,158,11,0.2);">
      {{ errorMsg }}
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto pb-4">
      <template v-if="entries.length > 0">
        <div v-for="(entry, i) in entries" :key="entry.id || i"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/[0.03] hover:bg-white/[0.02] transition-colors mb-1">
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" :class="entry.id && entry.id.startsWith('org-') ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'">
            {{ entry.id && entry.id.startsWith('org-') ? 'O' : 'B' }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm" style="color:rgba(255,255,255,0.7);">
              {{ entry.id && entry.id.startsWith('org-') ? 'Organization backup' : 'Manual backup' }}
            </div>
            <div class="flex items-center gap-2 text-xs" style="color:rgba(255,255,255,0.3);">
              <span>{{ formatDate(entry.createdAt) }}</span>
              <span v-if="entry.files !== undefined" style="color:rgba(255,255,255,0.15);">· {{ entry.files }} file{{ entry.files !== 1 ? 's' : '' }}</span>
            </div>
          </div>
          <button class="btn-ghost text-xs px-3 py-1" style="color:#1D9E75;" @click="restoreBackup(entry)" title="Restore this backup">
            Restore
          </button>
          <button class="btn-ghost text-xs px-2 py-1 opacity-40 hover:opacity-100" style="color:#ef4444;" @click="deleteBackup(entry)" title="Delete this backup">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </template>
      <div v-else class="flex items-center justify-center h-full text-sm" style="color:rgba(255,255,255,0.15);">
        No backups yet
      </div>
    </div>

    <div class="py-3 border-t text-[11px]" style="border-color:rgba(255,255,255,0.03);color:rgba(255,255,255,0.25);">
      {{ entries.length }} backup{{ entries.length !== 1 ? 's' : '' }}
    </div>

    <!-- Confirmation dialog -->
    <Teleport to="body">
      <div v-if="confirmEntry" class="dialog-overlay" @click.self="confirmEntry = null">
        <div class="dialog-card" role="alertdialog" aria-modal="true" aria-label="Confirm action">
          <h3 class="text-base font-semibold text-white/80 mb-2">
            {{ confirmEntry.kind === 'restore' ? 'Restore backup' : 'Delete backup' }}
          </h3>
          <p class="text-sm text-white/40 mb-4">
            <template v-if="confirmEntry.kind === 'restore'">
              Restore the Start Menu from the backup of
              <span class="text-white/70">{{ formatDate(confirmEntry.entry.createdAt) }}</span>?
              Current items will be overwritten.
            </template>
            <template v-else>
              Permanently delete the backup from
              <span class="text-white/70">{{ formatDate(confirmEntry.entry.createdAt) }}</span>?
            </template>
          </p>
          <div class="flex items-center justify-end gap-3">
            <button class="btn-ghost text-sm" @click="confirmEntry = null" title="Cancel">Cancel</button>
            <button
              class="btn-accent text-sm py-2 px-5"
              :style="confirmEntry.kind === 'delete' ? 'background:var(--color-error);color:#fff' : ''"
              :disabled="saving"
              @click="runConfirm"
              :title="'Confirm ' + confirmEntry.kind"
            >
              {{ confirmEntry.kind === 'restore' ? 'Restore' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const electronAPI = process.client ? window.electronAPI : null;
const entries = ref([]);
const saving = ref(false);
const errorMsg = ref(null);
const backupMsg = ref('');
const confirmEntry = ref(null);

onMounted(async () => {
  if (electronAPI) {
    try {
      const h = await electronAPI.loadHistory();
      if (h && h.length) entries.value = h;
    } catch {}
  }
});

async function createBackup() {
  saving.value = true; errorMsg.value = null; backupMsg.value = '';
  try {
    const entry = await electronAPI.createBackup();
    entries.value.unshift(entry);
    backupMsg.value = 'Backup created';
    setTimeout(() => backupMsg.value = '', 3000);
  } catch (err) { errorMsg.value = err.message || 'Backup failed'; }
  finally { saving.value = false; }
}

function restoreBackup(entry) {
  confirmEntry.value = { kind: 'restore', entry };
}

function deleteBackup(entry) {
  confirmEntry.value = { kind: 'delete', entry };
}

async function runConfirm() {
  const { kind, entry } = confirmEntry.value;
  confirmEntry.value = null;
  if (kind === 'restore') {
    saving.value = true; errorMsg.value = null;
    try {
      await electronAPI.restoreBackup(entry.id);
      backupMsg.value = 'Restored successfully';
      setTimeout(() => backupMsg.value = '', 3000);
    } catch (err) { errorMsg.value = err.message || 'Restore failed'; }
    finally { saving.value = false; }
  } else {
    const i = entries.value.indexOf(entry);
    if (i !== -1) entries.value.splice(i, 1);
    try { await electronAPI.deleteBackup(entry.id); } catch {}
  }
}

function formatDate(s) {
  if (!s) return '';
  try { return new Date(s).toLocaleString(); } catch { return s; }
}
</script>