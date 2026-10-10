<template>
  <div class="h-screen flex flex-col bg-black text-white">
    <TitleBar
      :update-available="updateInfo.isAvailable"
      :update-version="updateInfo.version"
      :downloading="downloading"
      :update-progress="updateProgress"
      :update-ready="updateReady"
      @update="handleUpdateClick"
      @settings="openSettings('general')"
      @opencode-settings="openSettings('opencode')"
    />

    <!-- Ticker -->
    <div class="h-7 bg-white/[0.02] border-b border-white/[0.04] overflow-hidden flex items-center relative app-no-drag">
      <div class="ticker-track">
        <span class="ticker-text">{{ tickerText }}</span>
        <span class="ticker-text">{{ tickerText }}</span>
      </div>
    </div>

    <NuxtPage class="flex-1 flex flex-col overflow-hidden" />

    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    <UpdateDialog />
    <AppTooltip />
  </div>
</template>

<script setup>
const { showSettings, settingsCategory } = useAppState();
const {
  updateInfo, downloading, updateProgress, updateReady,
  registerProgress, loadUpdateSettings, checkForUpdates, openUpdateDialog,
} = useUpdater();
const { registerListeners } = useJobState();
const tickerText = ref('● WinStartScanner  //  GESTIONE COMPLETA DEL MENU START  //  SCANSIONE  //  ORGANIZZAZIONE  //  PULIZIA  ●');

function openSettings(cat) {
  settingsCategory.value = cat || 'general';
  showSettings.value = true;
}

registerProgress();
registerListeners();

onMounted(async () => {
  const { autoCheck, channel } = await loadUpdateSettings();
  if (autoCheck) checkForUpdates({ channel, autoDownload: true });
});

function handleUpdateClick() {
  openUpdateDialog(true);
}
</script>
