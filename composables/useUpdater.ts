export const useUpdater = () => {
  const {
    updateInfo, downloading, checkingUpdate, updateProgress,
    updateReady, updateError, showUpdateDialog,
  } = useAppState();

  const api = process.client ? window.electronAPI : null;

  function registerProgress() {
    if (!api) return;
    api.onUpdateProgress((v) => { updateProgress.value = v; });
  }

  async function loadUpdateSettings() {
    let autoCheck = true;
    let channel = 'stable';
    if (api) {
      try {
        const saved = await api.loadSettings();
        if (saved?.updates) {
          if (typeof saved.updates.autoCheck === 'boolean') autoCheck = saved.updates.autoCheck;
          if (saved.updates.channel) channel = saved.updates.channel;
        }
      } catch {}
    }
    return { autoCheck, channel };
  }

  async function checkForUpdates(opts = {}) {
    if (!api) return null;
    checkingUpdate.value = true;
    updateError.value = '';
    try {
      const r = await api.checkUpdate({ channel: opts.channel || 'stable' });
      if (r?.isAvailable) {
        updateInfo.value = r;
        if (opts.autoDownload) startDownload();
      }
      return r;
    } catch {
      return null;
    } finally {
      checkingUpdate.value = false;
    }
  }

  async function startDownload() {
    if (!api || downloading.value || updateReady.value || !updateInfo.value?.isAvailable) return;
    downloading.value = true;
    updateProgress.value = 0;
    updateError.value = '';
    try {
      await api.downloadUpdate(updateInfo.value);
      downloading.value = false;
      updateReady.value = true;
      showUpdateDialog.value = true;
    } catch {
      downloading.value = false;
      updateError.value = 'Download failed. Check your connection and try again.';
      showUpdateDialog.value = true;
    }
  }

  function openUpdateDialog(startIfNeeded = false) {
    showUpdateDialog.value = true;
    if (startIfNeeded && !downloading.value && !updateReady.value && updateInfo.value?.isAvailable) startDownload();
  }

  async function applyAndRestart() {
    if (!api) return;
    updateError.value = '';
    try {
      await api.applyUpdate();
    } catch {
      updateError.value = 'Unable to launch the installer. Please try again or reinstall manually.';
    }
  }

  async function retryDownload() {
    if (!api) return;
    updateError.value = '';
    updateReady.value = false;
    downloading.value = true;
    updateProgress.value = 0;
    try {
      await api.downloadUpdate(updateInfo.value);
      downloading.value = false;
      updateReady.value = true;
    } catch {
      downloading.value = false;
      updateError.value = 'Download failed. Check your connection and try again.';
    }
  }

  return {
    updateInfo, downloading, checkingUpdate, updateProgress, updateReady, updateError, showUpdateDialog,
    registerProgress, loadUpdateSettings, checkForUpdates, startDownload, openUpdateDialog, applyAndRestart, retryDownload,
  };
};
