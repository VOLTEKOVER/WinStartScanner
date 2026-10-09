import fs from 'fs/promises';
import path from 'path';

async function dirExists(dir) {
  try { return (await fs.stat(dir)).isDirectory(); } catch { return false; }
}

async function copyTree(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    let st;
    try { st = await fs.lstat(s); } catch { continue; }
    // Skip symlinks and junctions: the real content of the Start Menu
    // lives in real directories (e.g. "Programs"), not in their aliases.
    if (st.isSymbolicLink()) continue;
    try {
      if (st.isDirectory()) await copyTree(s, d);
      else if (st.isFile()) await fs.copyFile(s, d);
    } catch {}
  }
}

export async function countFiles(dir) {
  let count = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) count += await countFiles(full);
      else if (entry.isFile()) count += 1;
    }
  } catch {}
  return count;
}

function startMenuSourceDirs() {
  const appData = process.env.APPDATA || '';
  const programData = process.env.ProgramData || process.env.ALLUSERSPROFILE || '';
  const dirs = [];
  if (appData) dirs.push(path.join(appData, 'Microsoft', 'Windows', 'Start Menu'));
  if (programData) dirs.push(path.join(programData, 'Microsoft', 'Windows', 'Start Menu'));
  return dirs;
}

export function resolveBackupDir(backupsRoot, backupId) {
  if (typeof backupId !== 'string' || !backupId.trim()) throw new Error('Invalid backup id');
  const resolved = path.resolve(backupsRoot, backupId);
  const rel = path.relative(path.resolve(backupsRoot), resolved);
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
    throw new Error('Backup id outside backups folder');
  }
  return resolved;
}

export async function createSnapshot(backupDir) {
  await fs.mkdir(backupDir, { recursive: true });
  const sources = [];
  const warnings = [];
  let totalFiles = 0;

  for (const src of startMenuSourceDirs()) {
    if (!(await dirExists(src))) continue;
    const dest = path.join(backupDir, path.basename(src));
    try {
      await copyTree(src, dest);
      totalFiles += await countFiles(dest);
      sources.push(src);
    } catch (e) {
      warnings.push(`Cannot backup ${src}: ${e.message}`);
    }
  }

  const manifest = {
    CreatedAt: new Date().toISOString(),
    TotalFiles: totalFiles,
    Sources: sources,
    Warnings: warnings,
  };
  await fs.writeFile(path.join(backupDir, '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  return manifest;
}

export async function restoreSnapshot(backupDir, backupsRoot) {
  resolveBackupDir(backupsRoot, path.basename(backupDir));
  const manifestPath = path.join(backupDir, '_manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
  } catch {
    throw new Error('No manifest found in ' + backupDir);
  }
  if (!manifest || !Array.isArray(manifest.Sources)) throw new Error('Invalid manifest');

  let restored = 0;
  for (const src of manifest.Sources) {
    const backedUp = path.join(backupDir, path.basename(src));
    if (!(await dirExists(backedUp))) continue;
    try {
      await copyTree(backedUp, src);
      restored += await countFiles(backedUp);
    } catch {}
  }
  return restored;
}