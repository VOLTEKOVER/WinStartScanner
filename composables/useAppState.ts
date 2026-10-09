export const useAppState = () => {
  const showSettings = useState('showSettings', () => false);
  const settingsCategory = useState('settingsCategory', () => 'general');
  const updateInfo = useState('updateInfo', () => ({ isAvailable: false, version: '' }));
  const downloading = useState('downloading', () => false);
  const checkingUpdate = useState('checkingUpdate', () => false);

  return { showSettings, settingsCategory, updateInfo, downloading, checkingUpdate };
};
