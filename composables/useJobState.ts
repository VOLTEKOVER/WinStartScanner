export const useJobState = () => {
  // Scan
  const scanning = useState('js:scanning', () => false);
  const scanProgress = useState<number>('js:scanProgress', () => 0);
  const scanStatus = useState('js:scanStatus', () => '');
  const scanResults = useState<any[]>('js:scanResults', () => []);
  const orphanCount = useState('js:orphanCount', () => 0);
  const totalScanned = useState('js:totalScanned', () => 0);
  const foldersScanned = useState('js:foldersScanned', () => 0);
  const scanError = useState('js:scanError', () => null as string | null);
  const aiWorking = useState('js:aiWorking', () => false);

  // Organize (reading structure / applying / AI) — blue process
  const orgBusy = useState('js:orgBusy', () => false);

  // Broken links
  const blScanning = useState('js:blScanning', () => false);
  const blResults = useState<any[]>('js:blResults', () => []);
  const blTotalLinks = useState('js:blTotalLinks', () => 0);
  const blError = useState('js:blError', () => null as string | null);
  const blStarted = useState('js:blStarted', () => false);
  const blDeletedCount = useState('js:blDeletedCount', () => 0);

  // Register global IPC listeners (call once from app.vue)
  let registered = false;
  function registerListeners() {
    if (registered || !process.client) return;
    const api = (window as any).electronAPI;
    if (!api) return;
    registered = true;
    api.onScanProgress((pct: number) => { scanProgress.value = pct; });
    api.onScanStatus((msg: string) => { scanStatus.value = msg; });
    api.onScanOrphanCount((count: number) => { orphanCount.value = count; });
  }

  // Reset scan state
  function resetScan() {
    scanning.value = false;
    scanProgress.value = 0;
    scanStatus.value = '';
    scanResults.value = [];
    orphanCount.value = 0;
    totalScanned.value = 0;
    foldersScanned.value = 0;
    scanError.value = null;
    aiWorking.value = false;
  }

  function resetBl() {
    blScanning.value = false;
    blResults.value = [];
    blTotalLinks.value = 0;
    blError.value = null;
    blStarted.value = false;
    blDeletedCount.value = 0;
  }

  return {
    scanning, scanProgress, scanStatus, scanResults,
    orphanCount, totalScanned, foldersScanned, scanError, aiWorking,
    blScanning, blResults, blTotalLinks, blError, blStarted, blDeletedCount,
    orgBusy,
    registerListeners, resetScan, resetBl,
  };
};