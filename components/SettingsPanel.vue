<template>
  <div class="dialog-overlay z-50" @click.self="$emit('close')">
    <div role="dialog" aria-modal="true" aria-label="Settings" class="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl w-[760px] h-[560px] flex overflow-hidden animate-slide-up shadow-2xl">

      <!-- Sidebar -->
      <div class="w-48 shrink-0 border-r border-[var(--border-subtle)] flex flex-col">
        <div class="px-4 py-3 border-b border-[var(--border-subtle)]">
          <div class="flex items-center gap-2">
            <button class="btn-ghost text-xs p-1 -ml-1" @click="$emit('close')" title="Close settings" aria-label="Go back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <span class="text-sm font-medium text-white/70">Settings</span>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 text-sm">
          <button v-for="cat in categories" :key="cat.id"
            class="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-colors"
            :class="activeCategory === cat.id ? 'bg-white/8 text-white/80' : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'"
            :title="'Open ' + cat.label + ' settings'"
            :aria-current="activeCategory === cat.id ? 'true' : undefined"
            @click="activeCategory = cat.id"
          >
            <span v-html="cat.icon" class="w-4 h-4 shrink-0"/>
            <span>{{ cat.label }}</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Search -->
        <div class="px-5 py-3 border-b border-[var(--border-subtle)]">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="search" ref="searchInput" type="text" placeholder="Search settings..." aria-label="Search settings"
              class="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-sm text-white/70 placeholder-white/20 outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all"
            />
          </div>
        </div>

        <!-- Content scrollable -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <div v-if="filteredSections.length === 0" class="text-sm text-white/30 text-center py-10">
            No settings found for "{{ search }}"
          </div>

          <template v-for="sec in filteredSections" :key="sec.id">
            <div v-if="sec.id === 'general'" class="space-y-4">
              <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#edff00"></span>
                <h3 class="text-sm font-medium text-white/80">General</h3>
              </div>
              <p class="text-[11px] text-white/25 leading-relaxed -mt-2">Behaviour when the app starts, runs in the background and finishes a scan.</p>
              <div class="p-3 glass rounded-xl space-y-1">
                <SettingRow label="Start with Windows" desc="Register WinStartScanner to launch automatically when you sign in to Windows." :value="settings.general.autoStart" :def="false" def-label="off" @reset="settings.general.autoStart = false">
                  <StToggle v-model="settings.general.autoStart" @change="onAutoStartChange"/>
                </SettingRow>
                <SettingRow label="Auto-scan on startup" badge="recommended" desc="Start a scan automatically as soon as the app opens — recommended." :value="settings.general.autoScan" :def="true" def-label="on" @reset="settings.general.autoScan = true">
                  <StToggle v-model="settings.general.autoScan"/>
                </SettingRow>
                <SettingRow label="Minimize to tray instead of closing" desc="Closing the window keeps the app running quietly in the system tray instead of quitting." :value="settings.general.minimizeToTray" :def="false" def-label="off" @reset="settings.general.minimizeToTray = false">
                  <StToggle v-model="settings.general.minimizeToTray"/>
                </SettingRow>
                <SettingRow label="Desktop notifications" desc="Show a notification when a scan finishes while the window is in the background." :value="settings.general.desktopNotifications" :def="true" def-label="on" @reset="settings.general.desktopNotifications = true">
                  <StToggle v-model="settings.general.desktopNotifications"/>
                </SettingRow>
                <SettingRow label="Sounds" desc="Play a sound on completed scans and when shortcuts are created." :value="settings.general.sounds" :def="true" def-label="on" @reset="settings.general.sounds = true">
                  <StToggle v-model="settings.general.sounds"/>
                </SettingRow>
              </div>
            </div>

            <div v-if="sec.id === 'scan'" class="space-y-4">
              <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#edff00"></span>
                <h3 class="text-sm font-medium text-white/80">Scan</h3>
              </div>
              <p class="text-[11px] text-white/25 leading-relaxed -mt-2">What to scan, how deep, and how to filter results. The recommended values balance speed and coverage.</p>
              <div class="p-3 glass rounded-xl space-y-1">
                <SettingRow label="Folders to include" badge="recommended" desc="Special system folders searched for applications. Each entry is automatically expanded to its full path." :value="settings.scan.includeDirs" :def="['ProgramFiles','ProgramFilesX86','LocalAppData']" def-label="ProgramFiles + ProgramFilesX86 + LocalAppData" @reset="settings.scan.includeDirs = ['ProgramFiles','ProgramFilesX86','LocalAppData']">
                  <StDirList v-model="settings.scan.includeDirs"/>
                </SettingRow>
                <SettingRow label="Folders to exclude" badge="careful" desc="Folders skipped during scans. Removing one of these by accident can make scans miss applications." :value="settings.scan.excludeDirs" :def="[]" def-label="none" @reset="settings.scan.excludeDirs = []">
                  <StDirList v-model="settings.scan.excludeDirs"/>
                </SettingRow>
                <SettingRow label="Max scan depth" desc="How many subfolders deep to search. 3 covers the usual Start Menu structure: Programs and one level of nesting." :value="settings.scan.maxDepth" :def="3" def-label="3 (recommended)" @reset="settings.scan.maxDepth = 3">
                  <StSlider v-model="settings.scan.maxDepth" :min="0" :max="10"/>
                </SettingRow>
                <SettingRow label="Extensions to search" desc="File types treated as applications. Checking less makes scans faster but may hide apps." :value="settings.scan.extensions" :def="['.exe']" def-label=".exe only" @reset="settings.scan.extensions = ['.exe']">
                  <StMultiCheck v-model="settings.scan.extensions" :options="[{v:'.exe',l:'.exe'},{v:'.lnk',l:'.lnk'},{v:'.bat',l:'.bat'}]"/>
                </SettingRow>
                <SettingRow label="Minimum file size (KB)" desc="Ignore files smaller than this value. 100 KB filters out tiny helper executables; 0 means no filter." :value="settings.scan.minFileSize" :def="100" def-label="100 KB (recommended)" @reset="settings.scan.minFileSize = 100">
                  <StSlider v-model="settings.scan.minFileSize" :min="0" :max="500" :step="10"/>
                </SettingRow>
              </div>
            </div>

            <div v-if="sec.id === 'opencode'" class="space-y-4">
              <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#f59e0b"></span>
                <h3 class="text-sm font-medium text-white/80">OpenCode AI</h3>
              </div>
              <p class="text-[11px] text-white/25 leading-relaxed -mt-2">Local AI engine that helps you select apps and organise the Start Menu. Everything runs on this PC.</p>

              <div class="p-4 glass rounded-xl flex flex-col items-center text-center gap-2.5">
                <div class="flex items-center gap-3 flex-wrap justify-center">
                  <div class="flex items-center gap-2 px-3.5 py-2 rounded-lg" :style="ocConnected ? 'background:rgba(55,138,221,0.14);border:1px solid rgba(55,138,221,0.4)' : 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08)'">
                    <svg width="18" height="15" viewBox="0 0 56 42" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" :class="ocConnected ? 'text-[#378ADD]' : 'text-white/25'"><path d="M18 6H6v24h12V6ZM24 6H0v30h24V6ZM48 18H36v12h12V18ZM36 18h12V6H36v12ZM54 6H36v30h6v-6h12V6Z"/></svg>
                    <span class="text-sm font-bold" :class="ocConnected ? 'text-[#378ADD]' : 'text-white/35'">OpenCode</span>
                  </div>

                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>

                  <div class="flex items-center gap-2 px-3.5 py-2 rounded-lg shrink-0" style="background:rgba(237,255,0,0.10);border:1px solid rgba(237,255,0,0.3)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#edff00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 3h4a2 2 0 0 1 2 2v4M15 21h4a2 2 0 0 0 2-2v-4"/></svg>
                    <span class="text-sm font-bold" style="color:#edff00">WinStartScanner</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 mx-auto">
                  <span class="w-2 h-2 rounded-full shrink-0" :class="ocConnected ? 'bg-green-400' : 'bg-[#D85A30] animate-pulse-dot'"></span>
                  <span class="text-xs" :class="ocConnected ? 'text-green-400' : 'text-[#D85A30]'">
                    {{ ocConnected ? 'Connected' : 'OpenCode not found' }}
                  </span>
                  <span v-if="ocConnected && ocPath" class="text-[10px] text-white/25 font-mono truncate max-w-[220px]" :title="ocPath">{{ ocPath }}</span>
                  <a v-else class="text-[10px] text-white/25 ml-auto hover:text-white/50 no-underline" href="#" @click.prevent="openOCDocs">Install: npm i -g opencode-ai</a>
                </div>
              </div>

              <SettingRow label="Selection instructions" badge="ai" full desc="Custom rules that override the built-in prompts for judging apps. Leave empty to use the default shown below." :value="settings.opencode.smartSelectInstructions" :def="''" def-label="built-in default" @reset="settings.opencode.smartSelectInstructions = ''">
                <StTextarea v-model="settings.opencode.smartSelectInstructions" :rows="2" placeholder="e.g. Include only apps a normal user would search for: no developer tools, no update helpers..."/>
                <div class="mt-1.5">
                  <button class="btn-ghost text-xs text-[#edff00]/70" @click="openDefaultPrompt('select')">View built-in prompt</button>
                  <pre v-if="showDefaultPrompt === 'select'" class="mt-1.5 p-2 bg-black/40 rounded-lg text-[10px] text-white/35 font-mono whitespace-pre-wrap leading-relaxed">{{ DEFAULT_SELECT_INSTRUCTIONS }}</pre>
                </div>
              </SettingRow>
              <SettingRow label="Organization instructions" badge="ai" full desc="Custom rules that override the built-in prompt for grouping apps. Leave empty to use the default shown below." :value="settings.opencode.organizeInstructions" :def="''" def-label="built-in default" @reset="settings.opencode.organizeInstructions = ''">
                <StTextarea v-model="settings.opencode.organizeInstructions" :rows="2" placeholder="e.g. Group apps by company: Adobe, Google, Microsoft..."/>
                <div class="mt-1.5">
                  <button class="btn-ghost text-xs text-[#edff00]/70" @click="openDefaultPrompt('org')">View built-in prompt</button>
                  <pre v-if="showDefaultPrompt === 'org'" class="mt-1.5 p-2 bg-black/40 rounded-lg text-[10px] text-white/35 font-mono whitespace-pre-wrap leading-relaxed">{{ DEFAULT_ORG_INSTRUCTIONS }}</pre>
                </div>
              </SettingRow>

              <div class="p-3 glass rounded-xl space-y-2">
                <div class="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  <span class="text-xs font-semibold text-white/60">AI temporary files</span>
                </div>
                <p class="text-[11px] text-white/25 leading-snug">Each AI session writes a prompt and a response in your data folder. They are kept only so you can review them — delete them whenever you want, no backups needed.</p>
                <div class="flex flex-wrap items-center gap-2 pt-1">
                  <button class="btn-ghost text-xs" @click="openOCFolder" title="Open the folder where prompts and responses are saved">Open folder</button>
                  <button class="btn-ghost text-xs text-[#D85A30]" @click="clearTemp" :disabled="clearingTemp" title="Delete every prompt and response file">{{ clearingTemp ? 'Deleting...' : 'Delete temporary files' }}</button>
                  <span v-if="tempNotice" class="text-[11px] text-[var(--color-success)]">{{ tempNotice }}</span>
                </div>
              </div>
            </div>

            <div v-if="sec.id === 'shortcuts'" class="space-y-4">
              <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#378ADD"></span>
                <h3 class="text-sm font-medium text-white/80">Shortcut creation</h3>
              </div>
              <p class="text-[11px] text-white/25 leading-relaxed -mt-2">Control where new shortcuts are created, how conflicts are handled, and where your backups live.</p>
              <div class="p-3 glass rounded-xl space-y-1">
                <div class="flex items-start justify-between gap-3 py-1.5">
                  <div class="min-w-0 flex-1">
                    <div class="text-sm text-white/75 leading-snug">Shortcut destination</div>
                    <div class="text-[11px] mt-0.5 leading-snug text-white/25">Shortcuts are placed in this folder, which is created automatically the first time.</div>
                    <div class="text-[11px] mt-1.5 font-mono text-[#378ADD]/80 truncate" :title="destPath">{{ destPath }}</div>
                  </div>
                  <button class="btn-ghost text-xs shrink-0 mt-1" @click="openStartMenu" title="Open the folder where shortcuts are created">Open</button>
                </div>
                <SettingRow label="Ask before creating" badge="careful" desc="Show a summary of what will be created before applying it. Recommended to keep on." :value="settings.shortcuts.askConfirmation" :def="true" def-label="on" @reset="settings.shortcuts.askConfirmation = true">
                  <StToggle v-model="settings.shortcuts.askConfirmation"/>
                </SettingRow>
                <SettingRow label="Overwrite existing shortcuts" badge="careful" desc="What to do when a shortcut with the same name already exists. 'Always ask' is the safest choice." :value="settings.shortcuts.overwriteExisting" :def="'ask'" def-label="always ask" @reset="settings.shortcuts.overwriteExisting = 'ask'">
                  <StSelect v-model="settings.shortcuts.overwriteExisting" :options="[{v:'yes',l:'Yes'},{v:'no',l:'No'},{v:'ask',l:'Always ask'}]"/>
                </SettingRow>
              </div>
              <div class="flex flex-wrap gap-2 pt-2">
                <button class="btn-ghost text-xs" @click="openStartMenu" title="Open the Start Menu Programs folder">Open Start Menu folder</button>
              </div>

              <div class="p-3 glass rounded-xl space-y-2">
                <div class="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span class="text-xs font-semibold text-white/60">Backups of your Start Menu</span>
                </div>
                <p class="text-[11px] text-white/25 leading-snug">Every time you apply changes or create shortcuts, a backup of the affected Start Menu folders is saved automatically. You can restore any of them from the History page.</p>
                <p class="text-[10px] text-white/20 font-mono truncate">{{ backupPath }}</p>
                <button class="btn-ghost text-xs" @click="openBackups" title="Open the folder where backups are stored">Open backups folder</button>
              </div>
            </div>

            <div v-if="sec.id === 'updates'" class="space-y-4">
              <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#1D9E75"></span>
                <h3 class="text-sm font-medium text-white/80">Updates & info</h3>
              </div>
              <p class="text-[11px] text-white/25 leading-relaxed -mt-2">Keep the app current, see what's inside this build, and manage maintenance tools.</p>

              <div class="p-4 glass rounded-xl space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#edff00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    <span class="text-sm font-semibold text-white/80">WinStartScanner</span>
                    <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/40">v{{ appInfo.version || '1.0.0' }}</span>
                  </div>
                  <span class="text-[10px] uppercase tracking-wider text-white/30">{{ settings.updates.channel === 'beta' ? 'Beta channel' : 'Stable channel' }}</span>
                </div>

                <div class="flex items-center gap-3 pt-1">
                  <div class="flex-1 text-center">
                    <div v-if="updateResult?.isAvailable" class="w-10 h-10 mx-auto rounded-full flex items-center justify-center" style="background:rgba(216,90,48,0.15);border:1px solid rgba(216,90,48,0.4)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D85A30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </div>
                    <div v-else class="w-10 h-10 mx-auto rounded-full flex items-center justify-center" style="background:rgba(29,158,117,0.15);border:1px solid rgba(29,158,117,0.4)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div class="text-[10px] text-white/40 mt-1.5">Installed</div>
                    <div class="text-[10px] text-white/25 font-mono">v{{ appInfo.version || '1.0.0' }}</div>
                  </div>

                  <div class="flex-1 flex flex-col items-center">
                    <div v-if="updateResult?.isAvailable" class="flex items-center gap-1.5 px-3 py-1 rounded-full" style="background:rgba(237,255,0,0.1);border:0.5px solid rgba(237,255,0,0.3)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#edff00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                      <span class="text-[11px] font-semibold" style="color:#edff00">v{{ updateResult.version }} ready</span>
                    </div>
                    <div v-else class="flex items-center gap-1.5 px-3 py-1 rounded-full" style="background:rgba(29,158,117,0.1);border:0.5px solid rgba(29,158,117,0.3)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span class="text-[11px] font-semibold text-[#1D9E75]">Up to date</span>
                    </div>
                    <div v-if="updateNotice" class="mt-1 text-[10px]" :class="updateNoticeError ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'">{{ updateNotice }}</div>
                  </div>

                  <div class="flex-1 text-center">
                    <div class="w-10 h-10 mx-auto rounded-full flex items-center justify-center" :style="updateResult?.isAvailable ? 'background:rgba(237,255,0,0.12);border:1px solid rgba(237,255,0,0.35)' : 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1)'">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="updateResult?.isAvailable ? 'text-[#edff00]' : 'text-white/30'"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    </div>
                    <div class="text-[10px] text-white/40 mt-1.5">Latest</div>
                    <div class="text-[10px] text-white/25 font-mono">v{{ updateResult?.version || '—' }}</div>
                  </div>
                </div>

                <div class="flex justify-center pt-1">
                  <button v-if="updateResult?.isAvailable" class="btn-accent text-xs py-2 px-5" style="background:#378ADD;color:#fff" @click="downloadUpdate" :disabled="downloading">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {{ downloading ? 'Downloading...' : 'Download v' + updateResult.version }}
                  </button>
                  <button v-else class="btn-ghost text-xs" @click="checkNow" :disabled="checkingUpdate">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1 inline"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    {{ checkingUpdate ? 'Checking...' : 'Check for updates' }}
                  </button>
                </div>
              </div>

              <SettingRow label="Auto-updates" badge="recommended" desc="Automatically check for a new version every time the app starts." :value="settings.updates.autoCheck" :def="true" def-label="on" @reset="settings.updates.autoCheck = true">
                <StToggle v-model="settings.updates.autoCheck"/>
              </SettingRow>
              <SettingRow label="Update channel" desc="Stable is tested and safe for everyone. Beta contains the newest features but may have issues." :value="settings.updates.channel" :def="'stable'" def-label="stable" @reset="settings.updates.channel = 'stable'">
                <StSelect v-model="settings.updates.channel" :options="[{v:'stable',l:'Stable'},{v:'beta',l:'Beta'}]"/>
              </SettingRow>

              <div class="p-3 glass rounded-xl space-y-2">
                <div class="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4537E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <span class="text-xs font-semibold text-white/60">About this build</span>
                </div>
                <div class="space-y-1 text-[11px] text-white/35">
                  <div class="flex items-center justify-between"><span>Version</span><span class="text-white/55 font-mono">v{{ appInfo.version || '1.0.0' }}</span></div>
                  <div class="flex items-center justify-between"><span>Electron</span><span class="text-white/55 font-mono">{{ appInfo.electron || '—' }}</span></div>
                  <div class="flex items-center justify-between"><span>Chromium</span><span class="text-white/55 font-mono">{{ appInfo.chrome || '—' }}</span></div>
                  <div class="flex items-center justify-between"><span>Node.js</span><span class="text-white/55 font-mono">{{ appInfo.node || '—' }}</span></div>
                  <div class="flex items-center justify-between"><span>Operating system</span><span class="text-white/55 font-mono">{{ appInfo.os || 'Windows' }} {{ appInfo.osRelease || '' }}</span></div>
                </div>
                <div class="flex flex-wrap gap-2 pt-1">
                  <button class="btn-ghost text-xs" @click="copyDiagnostics" title="Copy system info to clipboard">Copy diagnostics info</button>
                </div>
              </div>

              <div class="p-3 glass rounded-xl space-y-2">
                <div class="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D85A30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                  <span class="text-xs font-semibold text-white/60">Tools & maintenance</span>
                </div>
                <p class="text-[11px] text-white/25 leading-snug">Power-user helpers. Temporary files are only needed while a scan or AI session is running.</p>
                <div class="flex flex-wrap gap-2">
                  <button class="btn-ghost text-xs" @click="openLogs" title="Open the folder where WinStartScanner stores its data and logs">Open app data folder</button>
                  <button class="btn-ghost text-xs text-[#D85A30]" @click="clearTemp" :disabled="clearingTemp" title="Delete AI prompts, AI responses and scan files from temp">{{ clearingTemp ? 'Deleting...' : 'Clean temporary files' }}</button>
                  <button class="btn-ghost text-xs text-[var(--color-error)]" @click="confirmReset = true" title="Reset every setting to its factory default">Reset everything</button>
                </div>
                <span v-if="tempNotice" class="text-[11px] text-[var(--color-success)]">{{ tempNotice }}</span>
              </div>

              <div class="pt-2 text-[11px] text-white/20 leading-relaxed">
                WinStartScanner © 2026 — Open source software.<br>Built with Nuxt + Electron.
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Reset confirmation -->
    <Teleport to="body">
      <div v-if="confirmReset" class="dialog-overlay z-[60]" @click.self="confirmReset = false">
        <div class="dialog-card" role="alertdialog" aria-modal="true" aria-label="Reset app confirmation">
          <h3 class="text-base font-semibold text-white/80 mb-2">Reset app</h3>
          <p class="text-sm text-white/40 mb-4">All settings will be cleared and the app will restart from scratch. This action is irreversible.</p>
          <div class="flex items-center justify-end gap-3">
            <button class="btn-ghost text-sm" @click="confirmReset = false" title="Cancel and keep current settings">Cancel</button>
            <button class="btn-accent text-sm py-2 px-5" style="background:var(--color-error);color:white" @click="resetAll" title="Irreversibly reset everything">Confirm reset</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const emit = defineEmits(['close']);
const api = process.client ? window.electronAPI : null;

const categories = [
  { id: 'general', label: 'General', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>' },
  { id: 'scan', label: 'Scan', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' },
  { id: 'opencode', label: 'OpenCode', icon: '<svg width="16" height="16" viewBox="0 0 56 42" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6H6v24h12V6ZM24 6H0v30h24V6ZM48 18H36v12h12V18ZM36 18h12V6H36v12ZM54 6H36v30h6v-6h12V6Z"/></svg>' },
  { id: 'shortcuts', label: 'Shortcuts', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="12" x2="2" y2="12"/><polyline points="5 9 2 12 5 15"/><polyline points="19 9 22 12 19 15"/></svg>' },
  { id: 'updates', label: 'Updates', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>' },
];

const { settingsCategory } = useAppState();

const activeCategory = ref(settingsCategory.value || 'general');
const search = ref('');
const confirmReset = ref(false);
const checkingUpdate = ref(false);
const updateNotice = ref('');
const updateNoticeError = ref(false);
const updateResult = ref(null);
const downloading = ref(false);
const ocConnected = ref(false);
const ocPath = ref('');
const appInfo = ref({});
const clearingTemp = ref(false);
const tempNotice = ref('');
const showDefaultPrompt = ref('');
const searchInput = ref(null);
const backupPath = computed(() => (appInfo.value.userData || '%APPDATA%\\WinStartScanner') + '\\backups');
const destPath = computed(() => (appInfo.value.startMenuPrograms || 'C:\\Users\\<user>\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs') + '\\WinStartScanner');

function openDefaultPrompt(which) { showDefaultPrompt.value = showDefaultPrompt.value === which ? '' : which; }

function onKeydown(e) {
  if (e.key !== 'Escape') return;
  if (confirmReset.value) confirmReset.value = false;
  else emit('close');
}

const settings = ref({
  general: { autoStart: false, autoScan: true, minimizeToTray: false, desktopNotifications: true, sounds: true },
  scan: { includeDirs: ['ProgramFiles','ProgramFilesX86','LocalAppData'], excludeDirs: [], maxDepth: 3, extensions: ['.exe'], minFileSize: 100 },
  opencode: { smartSelectInstructions: '', organizeInstructions: '' },
  shortcuts: { destinationFolder: 'WinStartScanner', askConfirmation: true, overwriteExisting: 'ask' },
  updates: { autoCheck: true, channel: 'stable' },
  advanced: {},
});

const sectionDefaults = {
  general: { autoStart: false, autoScan: true, minimizeToTray: false, desktopNotifications: true, sounds: true },
  scan: { includeDirs: ['ProgramFiles','ProgramFilesX86','LocalAppData'], excludeDirs: [], maxDepth: 3, extensions: ['.exe'], minFileSize: 100 },
  shortcuts: { destinationFolder: 'WinStartScanner', askConfirmation: true, overwriteExisting: 'ask' },
  updates: { autoCheck: true, channel: 'stable' },
};

const DEFAULT_SELECT_INSTRUCTIONS = [
  'You are a Windows Start Menu advisor. Below is a list of orphan executables (installed programs not linked to the Start Menu).',
  '',
  'Instructions: for each app, decide YES if it is a useful user-facing application that should be in Start Menu, or NO if it should NOT (installer, uninstaller, updater, background helper, crash reporter, tray-only tool, SDK component, command-line utility, minimal launcher).',
  '',
  'Respond with ONLY a JSON array of the indices you recommend adding to Start Menu. Example: [0, 3, 5, 8]',
].join('\n');

const DEFAULT_ORG_INSTRUCTIONS = [
  'You are a Windows Start Menu organizer. Below are the current Start Menu items. Suggest how to group them into category folders.',
  '',
  'Instructions: assign each item a category folder name based on its purpose or application type.',
  '',
  'Respond with ONLY a JSON object like: {"Category Name": [0, 2, 5], "Another Category": [1, 3, 4]}. Items without a clear category can be omitted.',
].join('\n');

onMounted(async () => {
  window.addEventListener('keydown', onKeydown);
  nextTick(() => searchInput.value?.focus());
  if (!api) return;
  try {
    const saved = await api.loadSettings();
    if (saved) Object.assign(settings.value, deepMerge(settings.value, saved));
    const oc = await api.checkOpenCode();
    ocConnected.value = oc.available;
    ocPath.value = oc.path || '';
    const info = await api.getAppInfo();
    appInfo.value = info || {};
    checkNow();
  } catch {}
});

onBeforeUnmount(() => { window.removeEventListener('keydown', onKeydown); });

function deepMerge(t, s) {
  const r = { ...t };
  for (const k of Object.keys(s)) {
    if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) r[k] = deepMerge(t[k] || {}, s[k]);
    else r[k] = s[k];
  }
  return r;
}

const saveTimer = ref(null);
watch(settings, () => {
  if (saveTimer.value) clearTimeout(saveTimer.value);
  saveTimer.value = setTimeout(() => api?.saveSettings(settings.value), 500);
}, { deep: true });

const filteredSections = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return [{ id: activeCategory.value }];
  const res = [];
  for (const cat of categories) {
    if (cat.label.toLowerCase().includes(q)) { res.push({ id: cat.id }); continue; }
    const labels = { general: 'general auto start startup scan tray notifications sounds', scan: 'scan folders include exclude depth extensions size', opencode: 'opencode ai connection model prompt instructions temp install', shortcuts: 'shortcuts destination folder confirm overwrite backup', updates: 'updates update version channel about info diagnostics reset backup temp logs support' };
    if ((labels[cat.id] || '').includes(q)) res.push({ id: cat.id });
  }
  return res;
});

async function onAutoStartChange(val) { if (api) await api.setAutoStart(val); }
function openOCFolder() { api?.openFolder?.('opencode-prompts'); }
function openOCDocs() { window.open('https://github.com/anomalyco/opencode', '_blank'); }
function openStartMenu() { api?.openFolder?.('start-menu'); }
function openBackups() { api?.openFolder?.('backups'); }
function openLogs() { api?.openFolder?.('logs'); }
function copyDiagnostics() {
  const v = appInfo.value;
  const t = `WinStartScanner v${v.version || '1.0.0'}\n` +
    `OS: ${v.os || navigator.platform} ${v.osRelease || ''}\n` +
    `Electron: ${v.electron || '—'} | Chromium: ${v.chrome || '—'} | Node: ${v.node || '—'}\n` +
    `Data folder: ${v.userData || '—'}\n` +
    `CPU cores: ${navigator.hardwareConcurrency} | RAM: ${(navigator.deviceMemory || 0) * 1024} GB\n` +
    `Language: ${navigator.language}`;
  navigator.clipboard?.writeText(t);
}
async function clearTemp() {
  if (!api) return;
  clearingTemp.value = true;
  tempNotice.value = '';
  try {
    const r = await api.clearTemp();
    tempNotice.value = `Cleaned: ${r.removed} file${r.removed === 1 ? '' : 's'} removed`;
  } catch { tempNotice.value = 'Unable to clean temporary files.'; }
  finally { clearingTemp.value = false; setTimeout(() => { tempNotice.value = ''; }, 4000); }
}
function resetAll() {
  settings.value.general = JSON.parse(JSON.stringify(sectionDefaults.general));
  settings.value.scan = JSON.parse(JSON.stringify(sectionDefaults.scan));
  settings.value.opencode = { smartSelectInstructions: '', organizeInstructions: '' };
  settings.value.shortcuts = JSON.parse(JSON.stringify(sectionDefaults.shortcuts));
  settings.value.updates = JSON.parse(JSON.stringify(sectionDefaults.updates));
  settings.value.advanced = {};
  confirmReset.value = false;
}

async function checkNow() {
  if (!api) return;
  checkingUpdate.value = true;
  updateNotice.value = '';
  updateResult.value = null;
  try {
    const info = await api.checkUpdate();
    updateResult.value = info;
    if (info.isAvailable) { updateNotice.value = `Update available: v${info.version}`; updateNoticeError.value = false; }
    else { updateNotice.value = 'You already have the latest version.'; updateNoticeError.value = false; }
  } catch { updateNotice.value = 'Unable to check for updates.'; updateNoticeError.value = true; }
  finally { checkingUpdate.value = false; }
}

async function downloadUpdate() {
  if (!api || !updateResult.value?.isAvailable) return;
  downloading.value = true;
  try {
    await api.downloadUpdate(updateResult.value);
    await api.applyUpdate();
  } catch { downloading.value = false; }
}
</script>
