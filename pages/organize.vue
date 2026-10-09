<template>
  <div class="flex-1 flex flex-col px-8 overflow-hidden app-no-drag" style="background:#0a0a0a;">
    <!-- Header -->
    <div class="pt-6 pb-4">
      <h1 class="text-3xl font-bold tracking-tight text-white">
        Organize <span style="color:#378ADD;">Start</span>
      </h1>
      <p class="text-sm mt-1 tracking-wide" style="color:rgba(255,255,255,0.35);">
        Open a folder to see what's inside, then drag apps onto folders to preview moves
      </p>
    </div>

    <!-- Actions toolbar -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <button class="btn-accent text-sm py-2 px-6" style="background:#378ADD;color:#fff;" :disabled="loading" @click="readMenu" title="Read the current Start Menu layout">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        <span v-if="!loading">Read menu</span>
        <span v-else class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse-dot"/> Loading...</span>
      </button>
      <button class="btn-accent text-sm py-2 px-4" style="background:#378ADD;color:#fff;box-shadow:0 0 18px rgba(55,138,221,0.55);" :disabled="!menuItems.length || loading || aiWorking" @click="aiOrganize" title="Ask OpenCode to suggest a new organization">
        <svg width="16" height="13" viewBox="0 0 56 42" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6H6v24h12V6ZM24 6H0v30h24V6ZM48 18H36v12h12V18ZM36 18h12V6H36v12ZM54 6H36v30h6v-6h12V6Z"/></svg>
        <span v-if="!aiWorking">AI organize</span>
        <span v-else class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse-dot"/> OpenCode thinking...</span>
      </button>
      <button class="btn-accent text-sm py-2 px-4" style="background:#378ADD;color:#fff;" @click="createFolder" title="Create new folder">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        New folder
      </button>
      <button class="btn-accent text-sm py-2 px-4" style="background:#378ADD;color:#fff;" :class="{ 'opacity-30 cursor-not-allowed': pendingActions.length === 0 }" :disabled="pendingActions.length === 0" @click="applyChanges" title="Apply all changes to the Start Menu">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Apply changes
        <span v-if="pendingActions.length > 0" class="ml-1 text-xs opacity-70">({{ pendingActions.length }})</span>
      </button>
    </div>

    <!-- Error -->
    <div v-if="errorMsg" class="mb-3 p-3 glass rounded-xl text-sm border animate-fade-up" style="background:rgba(245,158,11,0.08);color:var(--color-warning);border-color:rgba(245,158,11,0.2);">
      {{ errorMsg }}
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-4 mb-2 text-[11px]" style="color:rgba(255,255,255,0.4);">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:#f59e0b;box-shadow:0 0 6px rgba(245,158,11,0.8);"></span> moved out (ghost) · dragging</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,0.8);"></span> moved in (inside folder)</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:#ef4444;box-shadow:0 0 6px rgba(239,68,68,0.8);"></span> removed</span>
      <span class="ml-auto flex items-center gap-1.5 text-white/25">{{ currentItems.length }} items<span v-if="pendingActions.length"> · {{ pendingActions.length }} pending</span></span>
    </div>

    <!-- Launchpad container -->
    <div class="flex-1 min-h-0 overflow-y-auto p-3 glass rounded-xl mb-3">
      <div v-if="loading" class="h-full flex items-center justify-center text-sm" style="color:rgba(255,255,255,0.3);">
        <div class="flex items-center gap-3"><span class="w-2 h-2 rounded-full animate-pulse-dot" style="background:#378ADD;"/>{{ loadingText }}</div>
      </div>

      <div v-else-if="menuItems.length === 0" class="h-full flex items-center justify-center text-sm" style="color:rgba(255,255,255,0.15);">
        <div class="text-center">
          <svg class="mx-auto mb-3 opacity-20" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <p>Press <span class="font-medium" style="color:#378ADD;">Read menu</span> to load the structure</p>
        </div>
      </div>

      <div v-else class="flex flex-col h-full min-h-0">
        <!-- Breadcrumb + parent drop targets -->
        <div class="flex items-center gap-1.5 mb-2 text-[11px] flex-wrap app-no-drag">
          <span
            class="breadcrumb-chip"
            :class="{ 'breadcrumb-active': navStack.length === 0, 'drop-zone': dragLevel === '' }"
            @click="jumpTo(-1)"
            @dragover.prevent="dragLevel = ''"
            @dragleave.prevent="clearLevelDrag('')"
            @drop.prevent="dropToLevel('')"
            :title="dragLevel === '' ? 'Drop to move into the Start Menu root' : 'Start Menu'"
          >Start Menu</span>
          <template v-for="(f, i) in navStack" :key="f._uid">
            <span style="color:rgba(255,255,255,0.2);">/</span>
            <span
              class="breadcrumb-chip"
              :class="{ 'breadcrumb-active': i === navStack.length - 1, 'drop-zone': dragLevel === f.RelativePath }"
              @click="jumpTo(i)"
              @dragover.prevent="dragLevel = f.RelativePath"
              @dragleave.prevent="clearLevelDrag(f.RelativePath)"
              @drop.prevent="dropToLevel(f.RelativePath)"
              :title="dragLevel === f.RelativePath ? 'Drop to move here' : f.Name"
            >{{ f.Name }}</span>
          </template>
          <span class="ml-auto text-white/20">{{ currentFolder ? currentFolder.RelativePath : 'Programs' }}</span>
        </div>

        <!-- Grid -->
        <div
          ref="gridZone"
          class="flex-1 min-h-0 overflow-y-auto p-1 grid-zone"
          @dragover.prevent="gridDragOver"
          @dragleave.prevent="gridDragLeave"
          @drop.prevent="gridDrop"
        >
          <div class="flex flex-wrap content-start items-start gap-4 p-1">
            <div v-for="f in folderItems" :key="f._uid" :data-fuid="f._uid"
              class="launch-folder"
              :class="[
                { 'drag-over': dragOverFolder === f._uid },
                { 'launch-flash': flash && actionForFolder(f) }
              ]"
              @click="openFolder(f)"
              @dragover.prevent="draggingOverTile = true; dragOverFolder = f._uid"
              @dragleave.prevent="clearDragOver(f._uid)"
              @drop.prevent="draggingOverTile = false; dropIntoFolder(f)"
              :title="'Open to see inside · drop apps here to move them in'">
              <div class="launch-folder-icon">
                <svg width="46" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:#378ADD;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <span v-if="countInFolder(f) > 0" class="launch-folder-count">{{ countInFolder(f) }}</span>
                <span v-if="hasCreateAction(f)" class="launch-new-folder-dot" title="New folder (preview)">NEW</span>
              </div>
              <span class="launch-name">{{ f.Name }}</span>
            </div>

            <div v-for="a in appItems" :key="a._uid" :data-auid="a._uid"
              class="launch-app"
              :class="{ 'launch-flash': flash && actionForItem(a) }"
              :draggable="true"
              @dragstart="onDragStart($event, a)"
              @dragend="onDragEnd"
              :title="a.TargetPath">
              <div class="launch-app-icon" :class="itemRing(a)">
                <img v-if="appIcon(a)" :src="appIcon(a)" alt="" draggable="false"/>
                <span v-else class="launch-app-fallback">{{ (a.Name && a.Name[0]) || '?' }}</span>
              </div>
              <span class="launch-name">{{ a.Name }}</span>
              <span v-if="itemBadge(a)" class="launch-badge" :class="itemBadge(a).cls">{{ itemBadge(a).text }}</span>
              <button class="launch-del" @click.stop="deleteItem(a)" title="Remove this item">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>

            <div v-for="g in ghostItems" :key="g._uid"
              class="launch-app launch-ghost"
              :title="'Moved to ' + g.MovedTo">
              <div class="launch-app-icon ring-orange launch-ghost-icon">
                <img v-if="appIcon(g)" :src="appIcon(g)" alt="" draggable="false"/>
                <span v-else class="launch-app-fallback">{{ (g.Name && g.Name[0]) || '?' }}</span>
              </div>
              <span class="launch-name">{{ g.Name }}</span>
              <span class="launch-badge" style="color:#fbbf24;background:rgba(245,158,11,0.10);border-color:rgba(245,158,11,0.3);">moved to {{ g.MovedTo === 'Start Menu' ? 'root' : g.MovedTo }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- New folder dialog -->
    <Teleport to="body">
      <div v-if="folderModal" class="dialog-overlay" @click.self="folderModal = false">
        <form class="dialog-card" role="dialog" aria-modal="true" aria-label="New folder" @submit.prevent="confirmCreateFolder" @keydown.esc="folderModal = false">
          <h3 class="text-base font-semibold text-white/80 mb-1">New folder</h3>
          <p class="text-xs text-white/40 mb-3">Will be created here: <span class="font-mono text-white/30">{{ currentFolder ? currentFolder.RelativePath : 'Start Menu\\Programs' }}</span></p>
          <input
            ref="folderInput"
            v-model="newFolderName"
            class="w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 px-3 py-2 outline-none focus:border-white/20"
            placeholder="Folder name"
            aria-label="Folder name"
            maxlength="60"
          />
          <div class="flex items-center justify-end gap-3 mt-4">
            <button type="button" class="btn-ghost text-sm" @click="folderModal = false" title="Cancel">Cancel</button>
            <button type="submit" class="btn-accent text-sm py-2 px-5" style="background:#378ADD;color:#fff;" :disabled="!newFolderName.trim()" title="Create the folder">
              Create
            </button>
          </div>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const api = process.client ? window.electronAPI : null;
const { orgBusy } = useJobState();
const menuItems = ref([]);
const loading = ref(false);
const loadingText = ref('Reading Start Menu structure...');
const errorMsg = ref('');
const pendingActions = ref([]);
const aiWorking = ref(false);
const folderModal = ref(false);
const newFolderName = ref('');
const folderInput = ref(null);
const iconCache = ref({});
const navStack = ref([]);
const dragOverFolder = ref(null);
const dragLevel = ref(null);
const liveDrag = ref(false);
const draggingOverTile = ref(false);
const flash = ref(false);
const gridZone = ref(null);
let dragItem = null;
let iconLoading = false;
let uidCounter = 0;

const currentFolder = computed(() => navStack.value.length ? navStack.value[navStack.value.length - 1] : null);
const currentItems = computed(() => {
  const items = currentFolder.value ? (Array.isArray(currentFolder.value.Children) ? currentFolder.value.Children : []) : menuItems.value;
  return items;
});

const folderItems = computed(() => currentItems.value.filter(i => i.Type === 'folder').sort((a, b) => a.Name.localeCompare(b.Name)));
const appItems = computed(() => currentItems.value.filter(i => i.Type === 'shortcut').sort((a, b) => a.Name.localeCompare(b.Name)));
const ghostItems = computed(() => currentItems.value.filter(i => i.Type === 'ghost').sort((a, b) => a.Name.localeCompare(b.Name)));

// Flat walk of the whole tree (used for icons + AI)
const flatItems = computed(() => {
  const result = [];
  function walk(items) {
    for (const item of items) {
      if (item.Type === 'ghost') continue;
      item._uid = item._uid || (++uidCounter);
      result.push(item);
      const children = Array.isArray(item.Children) ? item.Children : [];
      if (children.length > 0) walk(children);
    }
  }
  walk(menuItems.value);
  return result;
});

async function readMenu() {
  if (!api) return;
  loading.value = true;
  orgBusy.value = true;
  loadingText.value = 'Reading Start Menu structure...';
  errorMsg.value = '';
  try {
    const data = await api.readStartMenu();
    menuItems.value = data.Items || [];
    navStack.value = [];
    loadAppIcons();
  } catch (err) {
    errorMsg.value = err.message || 'Error reading menu';
  } finally {
    loading.value = false;
    orgBusy.value = false;
  }
}

function openFolder(f) {
  if (f.Type !== 'folder') return;
  navStack.value = [...navStack.value, f];
  draggingOverTile.value = false;
}

function jumpTo(index) {
  if (index < 0) navStack.value = [];
  else navStack.value = navStack.value.slice(0, index + 1);
}

async function loadAppIcons() {
  if (!api || iconLoading) return;
  const wanting = [];
  for (const i of flatItems.value) {
    if (i.Type !== 'shortcut' || !i.TargetPath) continue;
    const p = i.TargetPath.toLowerCase();
    if (!p.endsWith('.exe')) continue;
    if (!iconCache.value[i.TargetPath]) wanting.push(i.TargetPath);
  }
  const uniq = [...new Set(wanting)];
  if (!uniq.length) return;
  iconLoading = true;
  try {
    const res = await api.getExeIcons(uniq.map(p => ({ key: p, path: p })));
    iconCache.value = { ...iconCache.value, ...res };
  } catch {} finally { iconLoading = false; }
}

function appIcon(item) { return iconCache.value[item.TargetPath] || null; }

function countInFolder(f) { return (Array.isArray(f.Children) ? f.Children : []).filter(c => c.Type === 'shortcut').length; }
function inSubfolder(item) { return !!(item.RelativePath && item.RelativePath.includes('\\')); }

function onDragStart(e, item) {
  if (item.Type !== 'shortcut') return;
  dragItem = item;
  liveDrag.value = true;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(item._uid));
}

function onDragEnd() {
  liveDrag.value = false;
  dragItem = null;
  dragOverFolder.value = null;
  dragLevel.value = null;
  draggingOverTile.value = false;
}

function clearDragOver(uid) {
  draggingOverTile.value = false;
  if (dragOverFolder.value === uid) dragOverFolder.value = null;
}

function clearLevelDrag(rel) {
  if (dragLevel.value === rel) dragLevel.value = null;
}

function gridDragOver() {
  if (!liveDrag.value) dragLevel.value = currentFolder.value ? currentFolder.value.RelativePath : '';
}
function gridDragLeave() {
  if (liveDrag.value && !draggingOverTile.value) dragLevel.value = null;
}
function gridDrop() {
  if (liveDrag.value && !draggingOverTile.value) dropToLevel(currentFolder.value ? currentFolder.value.RelativePath : '');
}

function removeItemFromTree(item, items) {
  const idx = items.indexOf(item);
  if (idx >= 0) { items.splice(idx, 1); return items; }
  for (const it of items) {
    if (Array.isArray(it.Children)) {
      const parent = removeItemFromTree(item, it.Children);
      if (parent) return parent;
    }
  }
  return null;
}

function findFolderByRelative(items, rel) {
  if (!rel) return { RelativePath: '', Children: menuItems.value };
  for (const it of items) {
    if (it.Type === 'folder' && it.RelativePath === rel) return it;
    if (Array.isArray(it.Children)) {
      const found = findFolderByRelative(it.Children, rel);
      if (found) return found;
    }
  }
  return null;
}

function previewMoveInto(item, destFolder) {
  if (!item || !destFolder) return;
  const parent = removeItemFromTree(item, menuItems.value);
  if (!parent) return;
  item.RelativePath = (destFolder.RelativePath ? destFolder.RelativePath + '\\' : '') + item.Name + '.lnk';
  if (!Array.isArray(destFolder.Children)) destFolder.Children = [];
  if (!destFolder.Children.includes(item)) destFolder.Children.push(item);
  parent.push({
    Type: 'ghost',
    Name: item.Name,
    Path: item.Path,
    TargetPath: item.TargetPath,
    MovedTo: destFolder.RelativePath || 'Start Menu',
    _uid: ++uidCounter
  });
}

function queueMove(item, destFolder) {
  if (!item || item.Type !== 'shortcut') return;
  if (!destFolder) return;
  const dest = destFolder.RelativePath || '';
  const expected = dest ? dest + '\\' + item.Name + '.lnk' : item.Name + '.lnk';
  if (item.RelativePath === expected) return;
  if (pendingActions.value.some(a => a.SourcePath === item.Path)) return;
  pendingActions.value.push({
    Type: 'move_shortcut',
    SourcePath: item.Path,
    DestinationFolder: dest,
    Label: `${item.Name} → ${dest || 'Start Menu'}`,
    Color: 'green'
  });
  previewMoveInto(item, destFolder);
}

function dropIntoFolder(folder) {
  dragOverFolder.value = null;
  draggingOverTile.value = false;
  queueMove(dragItem, folder);
  dragItem = null;
}

function dropToLevel(rel) {
  dragLevel.value = null;
  draggingOverTile.value = false;
  if (rel === (currentFolder.value ? currentFolder.value.RelativePath : '')) { dragItem = null; return; }
  const dest = findFolderByRelative(menuItems.value, rel);
  queueMove(dragItem, dest);
  dragItem = null;
}

function actionForItem(item) { return pendingActions.value.find(a => a.SourcePath === item.Path); }
function actionForFolder(f) { return pendingActions.value.find(a => a.Type === 'create_folder' && a.FolderPath === (f.RelativePath || f.Name)); }

function hasCreateAction(f) { return !!actionForFolder(f); }

function itemRing(item) {
  if (liveDrag.value && dragItem && dragItem._uid === item._uid) return 'ring-orange';
  const a = actionForItem(item);
  if (!a) return '';
  if (a.Type === 'delete') return 'ring-red';
  return 'ring-green';
}

function itemBadge(item) {
  const a = actionForItem(item);
  if (!a) return null;
  if (a.Type === 'delete') return { text: 'removed', cls: 'text-red-400 bg-red-500/10 border-red-500/30' };
  return { text: 'in folder', cls: 'text-green-400 bg-green-500/10 border-green-500/30' };
}

function deleteItem(item) {
  if (pendingActions.value.some(a => a.SourcePath === item.Path)) return;
  pendingActions.value.push({ Type: 'delete', SourcePath: item.Path, Label: `Remove "${item.Name}"` });
}

async function aiOrganize() {
  if (!api || !menuItems.value.length) return;
  aiWorking.value = true;
  orgBusy.value = true;
  errorMsg.value = '';
  pendingActions.value = [];
  try {
    const items = flatItems.value.map(i => ({ Name: i.Name, Target: i.TargetPath }));
    const flat = flatItems.value;
    const res = await api.aiOrganizeAuto(JSON.parse(JSON.stringify(items)));
    if (res.success && res.data) {
      const actions = [];
      const folders = new Set(Object.keys(res.data));
      const folderUids = {};
      for (const folder of folders) {
        actions.push({ Type: 'create_folder', FolderPath: folder, Label: `Create folder "${folder}"` });
        // Materialize the proposed folder in the preview so apps can fly into it
        const folderItem = { Type: 'folder', Name: folder, Path: '', RelativePath: folder, Children: [], _preview: true };
        folderItem._uid = ++uidCounter;
        folderUids[folder] = folderItem._uid;
        menuItems.value = [...menuItems.value, folderItem];
      }
      const flies = [];
      const moves = [];
      for (const [folder, indices] of Object.entries(res.data)) {
        if (!Array.isArray(indices)) continue;
        for (const idx of indices) {
          if (typeof idx !== 'number' || idx < 0 || idx >= flat.length) continue;
          const item = flat[idx];
          if (item.Type !== 'shortcut') continue;
          if (item.RelativePath === folder + '\\' + item.Name + '.lnk') continue;
          if (item.RelativePath.includes('\\')) continue;
          const destFolder = menuItems.value.find(f => f._uid === folderUids[folder]);
          if (!destFolder) continue;
          actions.push({
            Type: 'move_shortcut',
            SourcePath: item.Path,
            DestinationFolder: folder,
            Label: `${item.Name} → ${folder}`,
            Color: 'green'
          });
          moves.push({ item, destFolder });
          flies.push({ uid: item._uid, folderUid: folderUids[folder] });
        }
      }
      pendingActions.value = actions;
      navStack.value = [];
      await nextTick();
      flyAppIcons(flies);
      // After the fly animation, physically move the apps into the folders in the preview
      setTimeout(() => {
        for (const m of moves) previewMoveInto(m.item, m.destFolder);
        nextTick(() => triggerFlash());
        setTimeout(() => { flash.value = false; }, 1600);
      }, 740);
    } else {
      errorMsg.value = res.error || 'AI organize failed';
    }
  } catch (err) {
    errorMsg.value = err.message || 'AI organize error';
  } finally {
    aiWorking.value = false;
    orgBusy.value = false;
  }
}

function triggerFlash() {
  flash.value = false;
  requestAnimationFrame(() => {
    flash.value = true;
    setTimeout(() => { flash.value = false; }, 1400);
  });
}

function flyAppIcons(flies) {
  const zone = gridZone.value;
  if (!zone || !flies.length) return;
  const zoneRect = zone.getBoundingClientRect();
  const clones = [];
  for (const fly of flies) {
    const appEl = zone.querySelector(`[data-auid="${fly.uid}"]`);
    const folderEl = zone.querySelector(`[data-fuid="${fly.folderUid}"]`);
    if (!appEl || !folderEl) continue;
    const icon = appEl.querySelector('.launch-app-icon');
    const target = folderEl.querySelector('.launch-folder-icon');
    if (!icon || !target) continue;
    const srcRect = icon.getBoundingClientRect();
    const dstRect = target.getBoundingClientRect();
    const clone = icon.cloneNode(true);
    clone.classList.remove('ring-green', 'ring-yellow', 'ring-red');
    clone.style.cssText = `position:fixed;z-index:1000;pointer-events:none;transition:all 0.7s cubic-bezier(0.22,0.8,0.36,1);` +
      `left:${srcRect.left}px;top:${srcRect.top}px;width:${srcRect.width}px;height:${srcRect.height}px;` +
      `opacity:0.95;border:none;background:rgba(55,138,221,0.12);border-radius:14px;`;
    document.body.appendChild(clone);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const dx = dstRect.left + dstRect.width / 2 - (srcRect.left + srcRect.width / 2);
        const dy = dstRect.top + dstRect.height / 2 - (srcRect.top + srcRect.height / 2);
        clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.45)`;
        clone.style.opacity = '0';
        setTimeout(() => clone.remove(), 750);
        clones.push(clone);
      });
    });
  }
}

function createFolder() {
  newFolderName.value = '';
  folderModal.value = true;
  nextTick(() => folderInput.value?.focus());
}

function confirmCreateFolder() {
  const name = newFolderName.value.trim();
  if (!name) return;
  const base = currentFolder.value && currentFolder.value.RelativePath ? currentFolder.value.RelativePath : '';
  const folderPath = base ? base + '\\' + name : name;
  if (pendingActions.value.some(a => a.Type === 'create_folder' && a.FolderPath === folderPath)) { folderModal.value = false; return; }
  pendingActions.value.push({ Type: 'create_folder', FolderPath: folderPath, Label: `Create folder "${folderPath}"` });

  // Show the new folder immediately in the preview (in the current level)
  const previewFolder = { Type: 'folder', Name: name, Path: '', RelativePath: folderPath, Children: [], _preview: true };
  previewFolder._uid = ++uidCounter;
  if (currentFolder.value) {
    if (!Array.isArray(currentFolder.value.Children)) currentFolder.value.Children = [];
    currentFolder.value.Children.push(previewFolder);
  } else {
    menuItems.value = [...menuItems.value, previewFolder];
  }
  folderModal.value = false;
  triggerFlash();
}

async function applyChanges() {
  if (!api || pendingActions.value.length === 0) return;
  loading.value = true;
  orgBusy.value = true;
  loadingText.value = 'Applying changes...';
  errorMsg.value = '';
  try {
    const result = await api.applyOrganization(pendingActions.value.map(a => ({
      Type: a.Type,
      SourcePath: a.SourcePath,
      DestinationFolder: a.DestinationFolder,
      FolderPath: a.FolderPath,
      Name: a.Name,
      TargetPath: a.TargetPath,
      Color: a.Color
    })));
    if (result.Success) {
      pendingActions.value = [];
      setTimeout(() => readMenu(), 400);
    } else {
      errorMsg.value = result.Error || 'Error applying changes';
    }
  } catch (err) {
    errorMsg.value = err.message || 'Error';
  } finally {
    loading.value = false;
    orgBusy.value = false;
  }
}
</script>

<style scoped>
.launch-folder, .launch-app {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 74px;
}
.launch-folder { cursor: pointer; }

.launch-folder-icon {
  position: relative;
  width: 74px;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(55, 138, 221, 0.08);
  border: 1px solid rgba(55, 138, 221, 0.22);
  border-radius: 14px;
  transition: all 0.15s ease;
}
.launch-folder:hover .launch-folder-icon { transform: scale(1.05); background: rgba(55,138,221,0.14); }
.launch-folder.drag-over .launch-folder-icon {
  background: rgba(55,138,221,0.22);
  border-color: #378ADD;
  transform: scale(1.06);
  box-shadow: 0 0 0 2px rgba(55,138,221,0.4), 0 0 18px rgba(55,138,221,0.5);
}
.launch-folder-count {
  position: absolute;
  top: 2px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: rgba(55,138,221,0.2);
  color: #378ADD;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.launch-new-folder-dot {
  position: absolute;
  bottom: 2px;
  left: 4px;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #22c55e;
}
.launch-flash {
  animation: launchFlash 1.4s ease;
}
@keyframes launchFlash {
  0% { transform: scale(1); }
  25% { transform: scale(1.18); }
  50% { transform: scale(1); }
  70% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

.launch-app { position: relative; }
.launch-app-icon {
  position: relative;
  width: 74px;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  cursor: grab;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.launch-app-icon:hover { background: rgba(255,255,255,0.06); transform: translateY(-2px); }
.launch-app-icon img { max-width: 38px; max-height: 38px; object-fit: contain; pointer-events: none; }
.launch-app-fallback {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: rgba(55,138,221,0.15);
  color: #378ADD;
  font-size: 16px;
  font-weight: 600;
  pointer-events: none;
}
.ring-green { border-color: #22c55e !important; box-shadow: 0 0 12px rgba(34,197,94,0.35) !important; }
.ring-orange { border-color: #f59e0b !important; box-shadow: 0 0 14px rgba(245,158,11,0.45) !important; }
.ring-red { border-color: #ef4444 !important; box-shadow: 0 0 12px rgba(239,68,68,0.35) !important; }

.launch-ghost { opacity: 0.45; }
.launch-ghost .launch-app-icon { cursor: default; background: rgba(245,158,11,0.07); border-style: dashed; }
.launch-ghost:hover .launch-app-icon { background: rgba(245,158,11,0.12); transform: none; }
.launch-ghost .launch-name { color: rgba(255,255,255,0.35); }

.launch-name {
  font-size: 10.5px;
  color: rgba(255,255,255,0.6);
  text-align: center;
  line-height: 1.25;
  max-width: 72px;
  overflow-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.launch-badge {
  margin-top: -3px;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  border: 0.5px solid;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.launch-del {
  position: absolute;
  top: 0;
  right: 2px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0,0,0,0.6);
  border: 0.5px solid rgba(239,68,68,0.4);
  color: #ef4444;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.15s;
}
.launch-app:hover .launch-del { opacity: 1; }

.grid-zone { position: relative; }

.breadcrumb-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  cursor: pointer;
  color: rgba(255,255,255,0.5);
  border: 1px solid transparent;
  transition: all 0.15s;
  user-select: none;
}
.breadcrumb-chip:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); }
.breadcrumb-active { color: #378ADD; font-weight: 600; }
.drop-zone {
  border-color: #378ADD !important;
  background: rgba(55,138,221,0.15) !important;
  color: #fff !important;
  box-shadow: 0 0 12px rgba(55,138,221,0.5);
}
</style>