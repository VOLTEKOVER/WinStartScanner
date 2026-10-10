export const useAppState = () => {
  const showSettings = useState('showSettings', () => false);
  const settingsCategory = useState('settingsCategory', () => 'general');
  const updateInfo = useState('updateInfo', () => ({ isAvailable: false, version: '', downloadUrl: '', releaseNotes: '' }));
  const downloading = useState('downloading', () => false);
  const checkingUpdate = useState('checkingUpdate', () => false);
  const updateProgress = useState('updateProgress', () => 0);
  const updateReady = useState('updateReady', () => false);
  const updateError = useState('updateError', () => '');
  const showUpdateDialog = useState('showUpdateDialog', () => false);

  return {
    showSettings, settingsCategory, updateInfo, downloading, checkingUpdate,
    updateProgress, updateReady, updateError, showUpdateDialog,
  };
};
