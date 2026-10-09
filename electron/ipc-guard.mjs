import path from 'path';

const INVALID_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/;

function startMenuRoots() {
  const appData = process.env.APPDATA || '';
  const programData = process.env.ProgramData || process.env.ALLUSERSPROFILE || 'C:\\ProgramData';
  return [
    path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(programData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
  ].filter(Boolean).map((p) => path.resolve(p));
}

export function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function isSafeRelative(rel) {
  if (typeof rel !== 'string' || !rel.trim()) return false;
  if (path.isAbsolute(rel)) return false;
  if (/^[a-zA-Z]:/.test(rel)) return false;
  const normalized = path.normalize(rel);
  if (normalized === '..' || normalized.startsWith('..' + path.sep)) return false;
  return !INVALID_NAME_CHARS.test(normalized);
}

function isSafeName(name) {
  return typeof name === 'string' && name.trim().length > 0 && name.length <= 200 && !INVALID_NAME_CHARS.test(name);
}

function isAbsolutePath(p) {
  return typeof p === 'string' && path.isAbsolute(p);
}

export function assertSafeLnkPath(p) {
  if (typeof p !== 'string' || !p.trim()) throw new Error('Invalid path');
  const resolved = path.resolve(p);
  if (path.extname(resolved).toLowerCase() !== '.lnk') throw new Error('Only .lnk files can be deleted');
  if (!startMenuRoots().some((root) => isInside(root, resolved))) throw new Error('Path is outside the Start Menu');
  return resolved;
}

export function sanitizeSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  try {
    const clone = JSON.parse(JSON.stringify(input, (key, value) =>
      key === '__proto__' || key === 'constructor' || key === 'prototype' ? undefined : value));
    return clone && typeof clone === 'object' ? clone : null;
  } catch {
    return null;
  }
}

export function sanitizeShortcutRequest(arg) {
  const items = Array.isArray(arg) ? arg : arg && arg.items;
  const alsoDesktop = !Array.isArray(arg) && !!(arg && arg.alsoDesktop);
  if (!Array.isArray(items) || items.length === 0 || items.length > 500) {
    throw new Error('Invalid shortcut request');
  }
  const clean = items.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid shortcut item');
    const target = String(item.Path || item.path || '');
    if (!isAbsolutePath(target)) throw new Error('Shortcut target must be an absolute path');
    return {
      Name: String(item.Name || item.name || path.basename(target)),
      Path: target,
      Description: String(item.Description || item.description || '').slice(0, 500),
    };
  });
  return { items: clean, alsoDesktop };
}

export function sanitizeOrganizationActions(actions) {
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > 2000) {
    throw new Error('Invalid organization actions');
  }
  const roots = startMenuRoots();
  const insideStartMenu = (p) => isAbsolutePath(p) && roots.some((root) => isInside(root, path.resolve(p)));

  return actions.map((action) => {
    if (!action || typeof action !== 'object') throw new Error('Invalid action');
    const type = String(action.Type || action.type || '');
    switch (type) {
      case 'create_folder':
        if (!isSafeRelative(action.FolderPath ?? action.folderPath)) throw new Error('Unsafe folder path');
        return { Type: 'create_folder', FolderPath: String(action.FolderPath ?? action.folderPath) };
      case 'move_shortcut': {
        const source = action.SourcePath ?? action.sourcePath;
        if (!insideStartMenu(source)) throw new Error('Source is outside the Start Menu');
        if (!isSafeRelative(action.DestinationFolder ?? action.destinationFolder)) throw new Error('Unsafe destination');
        return { Type: 'move_shortcut', SourcePath: path.resolve(source), DestinationFolder: String(action.DestinationFolder ?? action.destinationFolder) };
      }
      case 'rename': {
        const source = action.SourcePath ?? action.sourcePath;
        if (!insideStartMenu(source)) throw new Error('Source is outside the Start Menu');
        if (!isSafeName(action.NewName ?? action.newName)) throw new Error('Unsafe new name');
        return { Type: 'rename', SourcePath: path.resolve(source), NewName: String(action.NewName ?? action.newName) };
      }
      case 'delete': {
        const source = action.SourcePath ?? action.sourcePath;
        if (!insideStartMenu(source)) throw new Error('Source is outside the Start Menu');
        return { Type: 'delete', SourcePath: path.resolve(source) };
      }
      case 'create_shortcut': {
        const target = action.TargetPath ?? action.targetPath;
        if (!isAbsolutePath(target)) throw new Error('Shortcut target must be absolute');
        if (!isSafeRelative(action.DestinationFolder ?? action.destinationFolder)) throw new Error('Unsafe destination');
        if (!isSafeName(action.Name ?? action.name)) throw new Error('Unsafe shortcut name');
        return {
          Type: 'create_shortcut',
          DestinationFolder: String(action.DestinationFolder ?? action.destinationFolder),
          Name: String(action.Name ?? action.name),
          TargetPath: target,
          WorkingDirectory: isAbsolutePath(action.WorkingDirectory ?? action.workingDirectory) ? String(action.WorkingDirectory ?? action.workingDirectory) : '',
          Description: String(action.Description ?? action.description ?? '').slice(0, 500),
        };
      }
      default:
        throw new Error(`Unsupported action type: ${type}`);
    }
  });
}

export function assertHttpsUrl(url) {
  if (typeof url !== 'string') throw new Error('Invalid URL');
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Invalid URL'); }
  if (parsed.protocol !== 'https:') throw new Error('Only https downloads are allowed');
  const host = parsed.hostname.toLowerCase();
  if (host !== 'github.com' && !host.endsWith('.github.com') && host !== 'githubusercontent.com' && !host.endsWith('.githubusercontent.com')) {
    throw new Error('Download host is not allowed');
  }
  return parsed.toString();
}

export function sanitizeNotification(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const title = String(payload.title || '').slice(0, 120);
  const body = String(payload.body || '').slice(0, 500);
  if (!title && !body) return null;
  return { title: title || 'WinStartScanner', body };
}
