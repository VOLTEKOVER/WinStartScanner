import { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, shell } from 'electron';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execFile } from 'child_process';
import http from 'http';
import fs from 'fs';
import { assertSafeLnkPath, sanitizeSettings, sanitizeShortcutRequest, sanitizeOrganizationActions, assertHttpsUrl, sanitizeNotification } from './ipc-guard.mjs';
import { createSnapshot, restoreSnapshot, resolveBackupDir } from './backups.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', '.output', 'public');
const DEV_URL = process.env.NUXT_DEV_URL || '';
let mainWindow;
let server;
let tray;

function showAndFocus() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.moveTop();
}

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory())
        filePath = path.join(PUBLIC_DIR, 'index.html');
      const ext = path.extname(filePath);
      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(content);
      } catch { res.writeHead(404); res.end('Not found'); }
    });
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

async function createWindow() {
  const url = DEV_URL || `http://127.0.0.1:${await startServer()}`;
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.ico');
  mainWindow = new BrowserWindow({
    width: 960, height: 650,
    minWidth: 720, minHeight: 500,
    frame: false,
    backgroundColor: '#000000',
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL(url);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.setTitle('WinStartScanner');
  mainWindow.setMenu(null);
  mainWindow.on('focus', () => { try { mainWindow.flashFrame(false); } catch {} });

  // Keep the renderer in sync with the maximized state (custom title bar)
  const sendMaximized = () => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('window-maximized', mainWindow.isMaximized());
  };
  mainWindow.on('maximize', sendMaximized);
  mainWindow.on('unmaximize', sendMaximized);

  // Tray
  try {
    const icoPath = path.join(__dirname, '..', 'assets', 'icon.ico');
    let trayImage;
    if (fs.existsSync(icoPath)) {
      trayImage = nativeImage.createFromPath(icoPath);
      if (trayImage.isEmpty()) {
        // Create a minimal 16x16 green pixel as fallback
        trayImage = nativeImage.createEmpty();
      }
    } else {
      trayImage = nativeImage.createEmpty();
    }
    if (!trayImage.isEmpty()) {
      tray = new Tray(trayImage);
      tray.setToolTip('WinStartScanner');
      const ctx = Menu.buildFromTemplate([
        { label: 'Show / Hide', click: () => { if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.isVisible() ? mainWindow.hide() : showAndFocus(); } } },
        { label: 'Start scan', click: () => { if (mainWindow && !mainWindow.isDestroyed()) { showAndFocus(); mainWindow.webContents.send('start-scan'); } } },
        { type: 'separator' },
        { label: 'Exit', click: () => { tray = null; app.isQuitting = true; app.quit(); } },
      ]);
      tray.setContextMenu(ctx);
      tray.on('double-click', () => { if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.isVisible() ? mainWindow.hide() : showAndFocus(); } });
    }
  } catch (e) { console.error('Tray creation error:', e.message); }

  // Intercept close -> minimize to tray
  mainWindow.on('close', (e) => {
    if (app.isQuitting) return;
    const settings = loadSettings();
    if (settings.general.minimizeToTray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId('WinStartScanner');
  try { app.setPath('userData', path.join(app.getPath('appData'), 'WinStartScanner')); } catch {}
  createWindow();
  // JumpList
  if (process.platform === 'win32') {
    app.setUserTasks([
      { program: process.execPath, arguments: '--scan', iconPath: process.execPath, iconIndex: 0, title: 'Start scan', description: 'Start a new scan for orphan executables' },
      { program: 'explorer.exe', arguments: 'shell:startup', iconPath: 'explorer.exe', iconIndex: 0, title: 'Open Start Menu folder', description: 'Opens the Start Menu folder' },
    ]);
  }
});
app.on('window-all-closed', () => { app.isQuitting = true; server?.close(); if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

ipcMain.handle('run-scan', async () => {
  const scriptPath = path.join(__dirname, 'scan.ps1');

  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath
    ]);

    let batch = { progress: null, status: null, orphanCount: null };
    let resultFile = null;
    let doneLine = '';

    const flushBatch = () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (batch.progress !== null) {
        mainWindow.webContents.send('scan-progress', batch.progress);
        mainWindow.setProgressBar(batch.progress / 100);
        batch.progress = null;
      }
      if (batch.status !== null) { mainWindow.webContents.send('scan-status', batch.status); batch.status = null; }
      if (batch.orphanCount !== null) { mainWindow.webContents.send('scan-orphan-count', batch.orphanCount); batch.orphanCount = null; }
    };

    const batchTimer = setInterval(flushBatch, 150);

    child.stdout.on('data', (data) => {
      const text = data.toString();
      for (const line of text.split('\n')) {
        const t = line.trim();
        if (t.startsWith('PROGRESS:')) {
          batch.progress = parseInt(t.split(':')[1], 10);
        } else if (t.startsWith('STATUS:')) {
          batch.status = t.slice(7);
        } else if (t.startsWith('ORPHAN:')) {
          batch.orphanCount = parseInt(t.slice(7), 10);
        } else if (t.startsWith('DONE:')) {
          doneLine = t;
          resultFile = t.slice(5).trim();
        }
      }
    });

    child.stderr.on('data', (data) => console.error('PS Error:', data.toString()));
    child.on('error', (e) => { clearInterval(batchTimer); reject(e); });

    child.on('close', (code) => {
      clearInterval(batchTimer);
      flushBatch();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setProgressBar(-1);
        if (!mainWindow.isFocused()) { mainWindow.flashFrame(true); setTimeout(() => { try { mainWindow.flashFrame(false); } catch {} }, 3000); }
      }
      if (code !== 0) { reject(new Error(`Scan failed (code: ${code})`)); return; }
      if (!resultFile || !fs.existsSync(resultFile)) { reject(new Error('Scan result file not found')); return; }
      try {
        let raw = fs.readFileSync(resultFile, 'utf-8');
        if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
        const data = JSON.parse(raw);
        resolve(data);
        try { fs.unlinkSync(resultFile); } catch {}
        // Auto-save to scan history
        try {
          const summary = { orphans: data.Orphans ? data.Orphans.length : 0, totalScanned: data.TotalScanned || 0, foldersScanned: data.FoldersScanned || 0, timestamp: new Date().toISOString() };
          saveScanHistory(summary);
        } catch {}
      } catch (e) {
        reject(new Error('Scan result parse error: ' + e.message));
      }
    });
  });
});

// Icon extraction cache
const iconCache = new Map();

ipcMain.handle('get-exe-icons', async (_e, entries) => {
  const uncached = [];
  for (const e of entries) {
    if (iconCache.has(e.key)) continue;
    uncached.push(e);
  }
  if (uncached.length === 0) {
    const result = {};
    for (const e of entries) result[e.key] = iconCache.get(e.key);
    return result;
  }

  const jsonPath = path.join(app.getPath('temp'), 'winstart_icon_req.json');
  const outPath = path.join(app.getPath('temp'), 'winstart_icon_res.json');
  fs.writeFileSync(jsonPath, JSON.stringify(uncached), 'utf-8');

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'extract-icons.ps1');
    const child = spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath, '-JsonPath', jsonPath, '-OutputPath', outPath
    ]);
    child.stderr.on('data', (d) => console.error('PS Error:', d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      try { fs.unlinkSync(jsonPath); } catch {}
      if (code !== 0) { try { fs.unlinkSync(outPath); } catch {}; reject(new Error('Icon extraction failed')); return; }
      try {
        let icoRaw = fs.readFileSync(outPath, 'utf-8');
        if (icoRaw.charCodeAt(0) === 0xFEFF) icoRaw = icoRaw.slice(1);
        const result = JSON.parse(icoRaw);
        for (const [key, val] of Object.entries(result)) {
          if (val) iconCache.set(key, val);
        }
        try { fs.unlinkSync(outPath); } catch {}
        // Return all requested icons (cached + new)
        const all = {};
        for (const e of entries) all[e.key] = iconCache.get(e.key) || null;
        resolve(all);
      } catch (e) { try { fs.unlinkSync(outPath); } catch {}; reject(e); }
    });
  });
});

// ========================================
// Settings persistence
// ========================================
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

const DEFAULT_SETTINGS = {
  general: { autoStart: false, autoScan: true, minimizeToTray: false, desktopNotifications: true, sounds: true },
  scan: { includeDirs: ['ProgramFiles', 'ProgramFilesX86', 'LocalAppData'], excludeDirs: [], maxDepth: 3, extensions: ['.exe'], minFileSize: 100 },
  smartSelect: { scoreThreshold: 30, knownApps: ['chrome','firefox','edge','opera','brave','vivaldi','code','vscode','cursor','windsurf','slack','discord','telegram','whatsapp','signal','spotify','vlc','mpc','foobar','7zip','7-zip','winrar','notepad++','notepadpp','gimp','inkscape','obs','obs-studio','steam','epic','gog','battle','riot','git','node','python','docker','postman','insomnia','figma','blender','unity','unreal','adobereader','acrobat','foxit','word','excel','powerpoint','outlook','teams','zoom','terminal','powershell','cmd','explorer','control','regedit','taskmgr','calculator','calendar','mail','photos','settings','notepad','paint','snipping','winrar','bandizip','everything','tor','windscribe','proton','wsl','vmware','virtualbox','hyper-v'] },
  shortcuts: { destinationFolder: 'WinStartScanner', askConfirmation: true, overwriteExisting: 'ask' },
  updates: { autoCheck: true, channel: 'stable' },
  opencode: { smartSelectInstructions: '', organizeInstructions: '' },
  advanced: {},
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
      if (raw.charCodeAt(0) === 0xFEFF) raw.slice(1);
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) { console.error('Load settings error:', e.message); }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (e) { console.error('Save settings error:', e.message); return false; }
}

ipcMain.handle('load-settings', () => loadSettings());
ipcMain.handle('save-settings', (_e, settings) => {
  const clean = sanitizeSettings(settings);
  if (!clean) return false;
  return saveSettings(clean);
});

ipcMain.handle('show-notification', (_e, payload) => {
  const clean = sanitizeNotification(payload);
  if (!clean) return;
  if (Notification.isSupported()) {
    const n = new Notification({ title: clean.title, body: clean.body, icon: path.join(__dirname, '..', 'assets', 'icon.ico') });
    n.show();
    n.on('click', () => { showAndFocus(); });
  }
});

ipcMain.handle('open-folder', async (_e, which) => {
  const startMenuPrograms = path.join(process.env.APPDATA || app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
  const targets = {
    'opencode-prompts': getOCDir(),
    'start-menu': startMenuPrograms,
    backups: BACKUPS_DIR,
    logs: app.getPath('userData'),
  };
  try { await shell.openPath(targets[which] || app.getPath('userData')); } catch {}
  return true;
});

ipcMain.handle('set-auto-start', (_e, enable) => {
  const startupScriptPath = path.join(app.getPath('startup'), 'WinStartScanner.lnk');
  if (typeof enable !== 'boolean') return false;
  if (enable) {
    const exePath = process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe');
    try {
      const ps = spawn('powershell.exe', ['-NoProfile', '-Command',
        `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${startupScriptPath.replace(/'/g,"''")}');` +
        `$s.TargetPath='${exePath.replace(/'/g,"''")}';$s.Save()`
      ]);
      return true;
    } catch { return false; }
  } else {
    try { if (fs.existsSync(startupScriptPath)) fs.unlinkSync(startupScriptPath); return true; } catch { return false; }
  }
});

ipcMain.on('window-show', () => { showAndFocus(); });
ipcMain.on('window-reload', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reload(); });
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.handle('get-window-state', () => ({ isMaximized: mainWindow?.isMaximized() ?? false }));

ipcMain.handle('create-shortcuts', async (_e, arg) => {
  let parsed;
  try { parsed = sanitizeShortcutRequest(arg); } catch (e) { throw new Error('Invalid shortcut request: ' + e.message); }
  const { items, alsoDesktop } = parsed;
  const jsonPath = path.join(app.getPath('temp'), 'winstart_links.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ Items: items }), 'utf-8');

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'create-links.ps1');
    const psArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-JsonPath', jsonPath];
    if (alsoDesktop) psArgs.push('-Desktop');
    const child = spawn('powershell.exe', psArgs);

    let output = '';
    child.stdout.on('data', (d) => { output += d.toString(); });
    child.stderr.on('data', (d) => console.error('PS Error:', d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      try { fs.unlinkSync(jsonPath); } catch {}
      if (code !== 0) { reject(new Error(`Shortcut creation failed (code: ${code})`)); return; }
      for (const line of output.split('\n')) {
        const t = line.trim();
        if (t.startsWith('RESULT:')) {
          try { resolve(JSON.parse(t.slice(7))); return; } catch {}
        }
      }
      reject(new Error('Error creating shortcuts'));
    });
  });
});

const REPO = 'valeriodipunzio/WinStartScanner';

ipcMain.handle('check-update', async () => {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { 'User-Agent': 'WinStartScanner/1.0' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return { isAvailable: false };
    const release = await res.json();
    const latestTag = (release.tag_name || '').replace(/^v/, '');
    const currentVer = app.getVersion();
    if (latestTag && currentVer && latestTag <= currentVer) return { isAvailable: false };
    const asset = release.assets?.find(a => a.name?.endsWith('.exe'));
    return { isAvailable: true, version: latestTag, downloadUrl: asset?.browser_download_url || '', releaseNotes: release.body || '' };
  } catch { return { isAvailable: false }; }
});

ipcMain.handle('download-update', async (_e, updateInfo) => {
  const url = assertHttpsUrl(updateInfo && updateInfo.downloadUrl);
  const downloadPath = path.join(app.getPath('temp'), 'WinStartScanner-Setup.exe');
  const res = await fetch(url, { signal: AbortSignal.timeout(300000) });
  const total = parseInt(res.headers.get('content-length') || '0', 10);
  const reader = res.body.getReader();
  const writer = fs.createWriteStream(downloadPath);
  let downloaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    downloaded += value.length;
    writer.write(Buffer.from(value));
    if (total && mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send('update-progress', Math.round((downloaded / total) * 100));
  }
  writer.end();
  return downloadPath;
});

ipcMain.handle('apply-update', () => {
  const setupPath = path.join(app.getPath('temp'), 'WinStartScanner-Setup.exe');
  if (fs.existsSync(setupPath))
    execFile(setupPath, ['/S'], (err) => { if (err) console.error(err); app.quit(); });
});

// ========================================
// Start Menu organization
// ========================================
function ensureChildrenArrays(items) {
  if (!items) return;
  for (const item of items) {
    if (item && item.Children) {
      if (!Array.isArray(item.Children)) item.Children = [item.Children];
      ensureChildrenArrays(item.Children);
    }
  }
}

ipcMain.handle('read-startmenu', async () => {
  const outPath = path.join(app.getPath('temp'), 'winstart_menu_structure.json');
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'read-startmenu.ps1');
    const child = spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath, '-OutputPath', outPath
    ]);
    let output = '';
    child.stdout.on('data', (d) => { output += d.toString(); });
    child.stderr.on('data', (d) => console.error('PS Error:', d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) { reject(new Error(`Menu read failed (code: ${code})`)); return; }
      for (const line of output.split('\n')) {
        const t = line.trim();
        if (t.startsWith('DONE:')) {
          try {
            let raw = fs.readFileSync(outPath, 'utf-8');
            if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
            const parsed = JSON.parse(raw);
            if (parsed.Items && !Array.isArray(parsed.Items)) parsed.Items = [parsed.Items];
            ensureChildrenArrays(parsed.Items);
            resolve(parsed);
            try { fs.unlinkSync(outPath); } catch {}
            return;
          } catch (e) { reject(new Error('Structure parse error: ' + e.message)); return; }
        }
      }
      reject(new Error('No DONE from read-startmenu.ps1'));
    });
  });
});

ipcMain.handle('apply-organization', async (_e, actions) => {
  let safeActions;
  try { safeActions = sanitizeOrganizationActions(actions); } catch (e) { throw new Error('Invalid actions: ' + e.message); }
  // Auto-backup before changes
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = path.join(BACKUPS_DIR, 'org-' + stamp);
    const m = await createSnapshot(backupDir);
    const entry = { id: 'org-' + stamp, createdAt: stamp, path: backupDir, files: m.TotalFiles || 0 };
    const history = loadHistory();
    history.unshift(entry);
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
  } catch (e) { console.error('Auto-backup failed:', e.message); }

  const jsonPath = path.join(app.getPath('temp'), 'winstart_org_actions.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ Actions: safeActions }), 'utf-8');

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'apply-organization.ps1');
    const child = spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath, '-JsonPath', jsonPath
    ]);
    let output = '';
    child.stdout.on('data', (d) => { output += d.toString(); });
    child.stderr.on('data', (d) => console.error('PS Error:', d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      try { fs.unlinkSync(jsonPath); } catch {}
      for (const line of output.split('\n')) {
        const t = line.trim();
        if (t.startsWith('RESULT:')) {
          try { resolve(JSON.parse(t.slice(7))); return; } catch {}
        }
      }
      reject(new Error(`Organization failed (code: ${code})`));
    });
  });
});

// ========================================
// Broken Links
// ========================================
ipcMain.handle('check-broken-links', async () => {
  const outPath = path.join(app.getPath('temp'), 'winstart_broken_links.json');
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'check-broken-links.ps1');
    const child = spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath, '-OutputPath', outPath
    ]);
    child.stderr.on('data', (d) => console.error('PS Error:', d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) { reject(new Error(`Broken links check failed (code: ${code})`)); return; }
      try {
        let raw = fs.readFileSync(outPath, 'utf-8');
        if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
        resolve(JSON.parse(raw));
        try { fs.unlinkSync(outPath); } catch {}
      } catch (e) { reject(new Error('Parse error: ' + e.message)); }
    });
  });
});

ipcMain.handle('delete-lnk', async (_e, lnkPath) => {
  let safe;
  try { safe = assertSafeLnkPath(lnkPath); } catch (e) { console.error('delete-lnk rejected:', e.message); return false; }
  try {
    if (fs.existsSync(safe)) fs.unlinkSync(safe);
    return true;
  } catch { return false; }
});

// ========================================
// Backup & History
// ========================================
const BACKUPS_DIR = path.join(app.getPath('userData'), 'backups');
const HISTORY_PATH = path.join(app.getPath('userData'), 'history.json');

ipcMain.handle('create-backup', async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(BACKUPS_DIR, stamp);
  const m = await createSnapshot(backupDir);
  const entry = { id: stamp, createdAt: stamp, path: backupDir, files: m.TotalFiles || 0 };
  const history = loadHistory();
  history.unshift(entry);
  try { fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8'); } catch {}
  return entry;
});

ipcMain.handle('restore-backup', async (_e, backupId) => {
  const safeDir = resolveBackupDir(BACKUPS_DIR, backupId);
  if (!fs.existsSync(safeDir)) throw new Error('Backup not found');
  const restored = await restoreSnapshot(safeDir, BACKUPS_DIR);
  return { restored };
});

ipcMain.handle('delete-backup', async (_e, backupId) => {
  let safeDir;
  try {
    safeDir = resolveBackupDir(BACKUPS_DIR, backupId);
    if (fs.existsSync(safeDir)) fs.rmSync(safeDir, { recursive: true, force: true });
    const history = loadHistory();
    const idx = history.findIndex(e => e.id === backupId);
    if (idx !== -1) { history.splice(idx, 1); fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8'); }
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('list-backups', async () => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return [];
    const dirs = fs.readdirSync(BACKUPS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => ({ id: d.name, createdAt: d.name, path: path.join(BACKUPS_DIR, d.name) }))
      .sort((a, b) => b.id.localeCompare(a.id));
    return dirs;
  } catch { return []; }
});

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      const raw = fs.readFileSync(HISTORY_PATH, 'utf-8');
      if (raw.charCodeAt(0) === 0xFEFF) raw.slice(1);
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

ipcMain.handle('load-history', () => loadHistory());

// ========================================
// Scan History (dashboard)
// ========================================
const SCAN_HISTORY_PATH = path.join(app.getPath('userData'), 'scan-history.json');

function loadScanHistory() {
  try {
    if (fs.existsSync(SCAN_HISTORY_PATH)) {
      const raw = fs.readFileSync(SCAN_HISTORY_PATH, 'utf-8');
      if (raw.charCodeAt(0) === 0xFEFF) raw.slice(1);
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function saveScanHistory(entry) {
  try {
    const history = loadScanHistory();
    history.unshift(entry);
    if (history.length > 100) history.length = 100;
    fs.writeFileSync(SCAN_HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
  } catch {}
}

ipcMain.handle('save-scan-history', (_e, entry) => { saveScanHistory(entry); return true; });
ipcMain.handle('load-scan-history', () => loadScanHistory());

// ========================================
// OpenCode AI integration
// ========================================
function getOCDir() { return path.join(app.getPath('userData'), 'opencode-prompts'); }
function getOCRespDir() { return path.join(app.getPath('userData'), 'opencode-responses'); }

function ensureDir(d) { try { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); } catch {} }

function aiSettings() {
  try { return loadSettings().opencode || {}; } catch { return {}; }
}

function buildSmartSelectPrompt(orphans) {
  const s = aiSettings().smartSelectInstructions || '';
  let prompt = `You are a Windows Start Menu advisor. Below is a list of orphan executables (installed programs not linked to the Start Menu).\n\n`;
  prompt += (s && s.trim())
    ? `User instructions for judging apps:\n${s.trim()}\n\n`
    : `For each app, decide YES if it is a useful user-facing application that should be in Start Menu, or NO if it should NOT (installer, uninstaller, updater, background helper, crash reporter, tray-only tool, SDK component, command-line utility, minimal launcher).\n\n`;
  prompt += `Respond with ONLY a JSON array of the indices you recommend adding to Start Menu. Example: [0, 3, 5, 8]\n\nApps:\n`;
  orphans.forEach((o, i) => {
    const name = (o.Name || 'unknown').replace(/\.exe$/i, '');
    const company = o.Company || '?';
    const size = o.Size ? Math.round(o.Size / 1024) + 'KB' : '?';
    const desc = (o.Description || '').slice(0, 80);
    prompt += `${i}: ${name} | ${company} | ${size} | ${desc}\n`;
  });
  prompt += `\nJSON array only:`;
  return prompt;
}

function buildOrganizePrompt(items) {
  const s = aiSettings().organizeInstructions || '';
  let prompt = `You are a Windows Start Menu organizer. Below are the current Start Menu items. Suggest how to group them into category folders.\n\n`;
  if (s && s.trim()) prompt += `User instructions for grouping:\n${s.trim()}\n\n`;
  else prompt += `Assign each item a category folder name based on its purpose or application type.\n\n`;
  prompt += `Respond with ONLY a JSON object like:\n{"Category Name": [0, 2, 5], "Another Category": [1, 3, 4]}\nItems without a clear category can be omitted.\n\nItems:\n`;
  items.forEach((o, i) => {
    const name = o.Name || o.name || '?';
    const target = o.Target || o.target || '';
    prompt += `${i}: ${name}${target ? ' -> ' + target : ''}\n`;
  });
  prompt += `\nJSON only:`;
  return prompt;
}

ipcMain.handle('ai-smart-select', async (_e, orphans) => {
  const promptDir = getOCDir();
  const respDir = getOCRespDir();
  ensureDir(promptDir);
  ensureDir(respDir);
  const stamp = Date.now();
  const promptPath = path.join(promptDir, `smart-select-${stamp}.txt`);
  const respPath = path.join(respDir, `smart-select-${stamp}.json`);
  const prompt = buildSmartSelectPrompt(orphans);
  fs.writeFileSync(promptPath, prompt, 'utf-8');
  return { promptPath, respPath, prompt };
});

ipcMain.handle('ai-organize', async (_e, items) => {
  const promptDir = getOCDir();
  const respDir = getOCRespDir();
  ensureDir(promptDir);
  ensureDir(respDir);
  const stamp = Date.now();
  const promptPath = path.join(promptDir, `organize-${stamp}.txt`);
  const respPath = path.join(respDir, `organize-${stamp}.json`);
  const prompt = buildOrganizePrompt(items);
  fs.writeFileSync(promptPath, prompt, 'utf-8');
  return { promptPath, respPath, prompt };
});

function forwardAiStream(chunk) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  for (const line of chunk.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line.trim());
      if (ev && ev.type === 'text' && typeof ev.part?.text === 'string') {
        mainWindow.webContents.send('ai-text', ev.part.text);
      }
    } catch {
      // stderr / partial lines are ignored for streaming
    }
  }
}

function spawnOCWithPrompt(promptPath, respPath, parseJsonArray) {
  return new Promise((resolve) => {
    const prompt = fs.readFileSync(promptPath, 'utf-8');
    // Use cmd.exe /c because opencode is a .cmd/.ps1 script, not a native .exe.
    // Node's spawn('opencode',...) cannot resolve script files on Windows.
    const child = spawn('cmd.exe', ['/c', 'opencode', 'run', '--format', 'json'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let errOutput = '';
    const MAX_WAIT = 120000;
    const timer = setTimeout(() => {
      child.kill();
      const raw = output || errOutput || 'timeout';
      try { fs.writeFileSync(respPath, raw, 'utf-8'); } catch {}
      resolve({ success: false, error: 'OpenCode timed out (2 min).', raw, respPath });
    }, MAX_WAIT);

    child.stdout.on('data', (data) => {
      output += data.toString();
      forwardAiStream(data.toString());
    });
    child.stderr.on('data', (data) => { errOutput += data.toString(); });

    child.on('close', (code) => {
      clearTimeout(timer);
      const raw = output || errOutput || '';
      try { fs.writeFileSync(respPath, raw, 'utf-8'); } catch {}
      if (code !== 0 && !raw) {
        resolve({ success: false, error: `OpenCode exited with code ${code}`, raw, respPath });
        return;
      }
      // Parse JSON events, extract the text content
      let text = '';
      for (const line of raw.split('\n').filter(Boolean)) {
        try {
          const ev = JSON.parse(line);
          if (ev.type === 'text' && ev.part?.text) text += ev.part.text;
        } catch {}
      }
      if (!text) text = raw;
      try {
        if (parseJsonArray) {
          const start = text.indexOf('[');
          const end = text.lastIndexOf(']');
          if (start !== -1 && end > start) {
            const data = JSON.parse(text.slice(start, end + 1));
            resolve({ success: true, data, raw, respPath });
          } else {
            resolve({ success: false, error: 'No JSON array found in response', raw, respPath });
          }
        } else {
          const start = text.indexOf('{');
          const end = text.lastIndexOf('}');
          if (start !== -1 && end > start) {
            const data = JSON.parse(text.slice(start, end + 1));
            resolve({ success: true, data, raw, respPath });
          } else {
            resolve({ success: false, error: 'No JSON object found in response', raw, respPath });
          }
        }
      } catch { resolve({ success: false, error: 'Failed to parse AI response', raw, respPath }); }
    });

    child.on('error', (err) => { clearTimeout(timer); resolve({ success: false, error: err.message, respPath }); });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

ipcMain.handle('ai-organize-auto', async (_e, items) => {
  const promptDir = getOCDir();
  const respDir = getOCRespDir();
  ensureDir(promptDir);
  ensureDir(respDir);
  const stamp = Date.now();
  const promptPath = path.join(promptDir, `auto-organize-${stamp}.txt`);
  const respPath = path.join(respDir, `auto-organize-${stamp}.json`);
  const prompt = buildOrganizePrompt(items);
  fs.writeFileSync(promptPath, prompt, 'utf-8');

  return spawnOCWithPrompt(promptPath, respPath, false);
});

ipcMain.handle('ai-load-response', async (_e, respPath) => {
  try {
    if (fs.existsSync(respPath)) {
      const raw = fs.readFileSync(respPath, 'utf-8');
      if (raw.charCodeAt(0) === 0xFEFF) raw.slice(1);
      return { success: true, data: raw };
    }
    return { success: false, error: 'Response file not found' };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('check-opencode', async () => {
  return new Promise((resolve) => {
    const child = spawn('where', ['opencode'], { windowsHide: true });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.on('error', () => resolve({ available: false }));
    child.on('close', (code) => {
      const found = out.split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0] || '';
      resolve({ available: code === 0 && !!found, path: found });
    });
  });
});

// Delete the temporary prompt/response files the app generates for AI sessions
ipcMain.handle('clear-temp', async () => {
  let removed = 0;
  const dirs = [getOCDir(), getOCRespDir()];
  for (const dir of dirs) {
    try {
      if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir)) {
          try { fs.unlinkSync(path.join(dir, f)); removed++; } catch {}
        }
      }
    } catch {}
  }
  try {
    const tmp = app.getPath('temp');
    for (const f of fs.readdirSync(tmp)) {
      if (/^winstart_/i.test(f)) {
        try { fs.unlinkSync(path.join(tmp, f)); removed++; } catch {}
      }
    }
  } catch {}
  return { removed };
});

ipcMain.handle('get-app-info', () => {
  const startMenuPrograms = path.join(process.env.APPDATA || app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
  return {
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    os: `${process.platform} ${process.arch}`,
    osRelease: os.release(),
    userData: app.getPath('userData'),
    temp: app.getPath('temp'),
    startMenuPrograms,
  };
});

ipcMain.handle('ai-smart-select-auto', async (_e, orphans) => {
  const promptDir = getOCDir();
  const respDir = getOCRespDir();
  ensureDir(promptDir);
  ensureDir(respDir);
  const stamp = Date.now();
  const promptPath = path.join(promptDir, `auto-smart-select-${stamp}.txt`);
  const respPath = path.join(respDir, `auto-smart-select-${stamp}.json`);
  const prompt = buildSmartSelectPrompt(orphans);
  fs.writeFileSync(promptPath, prompt, 'utf-8');

  const result = await spawnOCWithPrompt(promptPath, respPath, true);
  if (result.success) {
    result.indices = result.data;
  }
  return result;
});
