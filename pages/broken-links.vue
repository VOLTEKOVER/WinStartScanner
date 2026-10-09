<template>
  <div class="flex-1 flex flex-col px-8 overflow-hidden app-no-drag">
    <div class="pt-6 pb-4">
      <h1 class="text-3xl font-bold tracking-tight text-white">
        Broken <span style="color:#D85A30;">Links</span>
      </h1>
      <p class="text-sm mt-1 tracking-wide" style="color:rgba(255,255,255,0.35);">
        Find Start Menu shortcuts pointing to missing targets
      </p>
    </div>

    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <button class="btn-accent text-sm py-2 px-6" style="background:#D85A30;color:#000;" :disabled="blScanning" @click="startScan" title="Scan Start Menu for orphaned shortcuts">
        <svg v-if="!blScanning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span v-if="!blScanning">Scan for broken links</span>
        <span v-else class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-black animate-pulse-dot"/> Scanning...</span>
      </button>
      <div v-if="scanStatus" class="flex items-center gap-2 text-sm" style="color:rgba(255,255,255,0.5);">
        <span class="w-1.5 h-1.5 rounded-full animate-pulse-dot" style="background:#D85A30;"/>
        <span>{{ scanStatus }}</span>
      </div>
    </div>

    <div v-if="blError" class="mb-4 p-3 glass rounded-xl text-sm border animate-fade-up" style="color:var(--color-warning);border-color:rgba(245,158,11,0.2);">
      {{ blError }}
    </div>

    <template v-if="blResults.length > 0">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs" style="color:rgba(255,255,255,0.3);">
          <strong style="color:rgba(255,255,255,0.5);">{{ blResults.length }}</strong> broken links
          of <strong style="color:rgba(255,255,255,0.5);">{{ blTotalLinks }}</strong> total
        </span>
        <span v-if="blDeletedCount > 0" class="text-xs" style="color:#22c55e;">
          {{ blDeletedCount }} removed
        </span>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto pb-4 space-y-1">
        <div v-for="(lnk, i) in blResults" :key="i" :class="{'opacity-30': lnk._removed}"
          class="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/[0.03] hover:bg-white/[0.02] transition-colors">
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate" style="color:rgba(255,255,255,0.7);">{{ lnk.Name }}</div>
            <div class="text-xs truncate" style="color:rgba(255,255,255,0.25);">{{ lnk.RelativePath }}</div>
            <div v-if="lnk.TargetPath" class="text-xs truncate mt-0.5" style="color:rgba(255,255,255,0.15);">
              → {{ lnk.TargetPath.length > 80 ? lnk.TargetPath.slice(0, 80) + '...' : lnk.TargetPath }}
            </div>
          </div>
          <span class="text-[11px] whitespace-nowrap" style="color:rgba(255,255,255,0.2);">{{ lnk.LastWrite }}</span>
          <button v-if="!lnk._removed" class="btn-ghost text-xs px-2 py-1" style="color:#D85A30;" @click="removeLink(lnk, i)" title="Delete this broken link">
            Delete
          </button>
        </div>
      </div>
    </template>

    <div v-else-if="!blScanning && blStarted && blResults.length === 0" class="flex-1 flex items-center justify-center text-sm" style="color:rgba(255,255,255,0.2);">
      <div class="text-center"><div class="text-4xl mb-3 opacity-10">✓</div><p>No broken links found</p></div>
    </div>
    <div v-else-if="!blStarted" class="flex-1 flex items-center justify-center text-sm" style="color:rgba(255,255,255,0.1);">
      <div class="text-center max-w-sm">
        <svg class="mx-auto mb-4 opacity-20" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <p style="color:rgba(255,255,255,0.2);">Press <span class="font-medium" style="color:#D85A30;">Scan</span> to find orphaned shortcuts</p>
      </div>
    </div>

    <div class="py-3 border-t text-[11px]" style="border-color:rgba(255,255,255,0.03);color:rgba(255,255,255,0.25);">
      {{ blStarted ? `${blResults.length} broken · ${blDeletedCount} removed` : 'Ready' }}
    </div>
  </div>
</template>

<script setup>
const electronAPI = process.client ? window.electronAPI : null;
const { blScanning, blResults, blTotalLinks, blError, blStarted, blDeletedCount } = useJobState();
const scanStatus = ref('');

async function startScan() {
  blScanning.value = true; scanStatus.value = 'Scanning Start Menu shortcuts...'; blResults.value = []; blError.value = null; blStarted.value = true; blDeletedCount.value = 0;
  try {
    const data = await electronAPI.checkBrokenLinks();
    blTotalLinks.value = data.TotalLinks || 0;
    blResults.value = (data.Broken || []).map(r => ({ ...r, _removed: false }));
    scanStatus.value = '';
  } catch (err) { blError.value = err.message || 'Scan failed'; scanStatus.value = ''; }
  finally { blScanning.value = false; }
}

async function removeLink(lnk, idx) {
  try {
    const ok = await electronAPI.deleteLnk(lnk.LinkPath);
    if (ok) { blResults.value[idx]._removed = true; blDeletedCount.value++; }
    else blError.value = 'Failed to delete link';
  } catch { blError.value = 'Delete failed'; }
}
</script>