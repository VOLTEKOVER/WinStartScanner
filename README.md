# WinStartScanner

An advanced Windows desktop application for complete Start Menu management: locate orphaned executables, organize shortcuts by category, clean up broken links, and manage automated backups.

---

## 🚀 Key Features

* **Orphan Executable Scanner:** Scans system directories (`Program Files`, `Program Files (x86)`, `LocalAppData`) for executables missing from the Start Menu.
* **Shortcut Creation & Cleanup:** Create missing shortcuts in bulk and eliminate broken `.lnk` files pointing to non-existent targets.
* **Smart Category Organization:** Group Start Menu items into category folders with an interactive Launchpad-style UI or automated drag-and-drop animations.
* **AI Integration (OpenCode):** Utilize OpenCode CLI to receive intelligent AI suggestions for selecting and organizing applications.
* **Safety & Security:** Every action is preceded by an automatic Start Menu snapshot for one-click restoration. Executables include digital signature verification.

---

## 💻 Requirements & Installation

* **OS:** Windows 10 / 11 (x64)
* **AI Features (Optional):** Requires [OpenCode](https://github.com) added to your system `PATH`.

### Installation
1. Download `WinStartScanner Setup 1.0.0.exe` from the **Releases** section and run the installer.
2. *Alternative:* Download the portable `win-unpacked` folder and run `WinStartScanner.exe` directly.

> **Note:** The app automatically checks for updates on launch.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Desktop Shell** | Electron 44 |
| **Frontend** | Nuxt 3 (Vue 3, Composition API, SPA mode) |
| **Styling** | Tailwind CSS v4 + Custom CSS Design Tokens (Dark Theme, Accent `#edff00`) |
| **Backend / OS Integration** | PowerShell 5.1 (Scanning, Shortcuts, Backups) |
| **AI Integration** | OpenCode CLI (`opencode run --format json`) |
| **Packaging** | electron-builder (NSIS Installer) |

---

## 🏗️ Architecture

The application is structured into three main layers:

```text
┌──────────────────────────────── Electron ────────────────────────────────┐
│  RENDERER (Nuxt/Vue)          BRIDGE           MAIN (Node/Electron)      │
│  pages/*.vue   ──window.electronAPI──►  preload.js   ──IPC──►  main.mjs   │
│        ▲                                               │                 │
│        └────── Events (scan-progress, status…) ◄───────┘                 │
│                                                                │         │
│  Static HTTP (127.0.0.1:port) ◄──────── .output/public        │         │
│                                                                ▼         │
│                                    PowerShell (.ps1) / OpenCode          │
└──────────────────────────────────────────────────────────────────────────┘
```

1. **Renderer:** Static Nuxt SPA served locally via a random HTTP port on `127.0.0.1` (no `file://` protocol).
2. **Bridge:** `preload.js` exposes `window.electronAPI` via `contextBridge` with `contextIsolation: true` and `nodeIntegration: false`.
3. **Main:** `main.mjs` orchestrates window lifecycle, system tray, background jobs, PowerShell scripts, and OpenCode CLI processes.
4. **IPC Security:** Incoming IPC calls are validated by `ipc-guard.mjs` (restricting operations strictly to Start Menu paths and validated URLs).

---

## ⚙️ How It Works

### 🔍 Orphan Scanning (`/scan`)
Scans `.lnk` targets across Start Menu directories and compares them with executables found in program folders. Streams progress in real-time and logs digital signature status, executable metadata, and file sizes.

### 🤖 Smart Selection & AI (`OpenCode`)
Combines local heuristic scoring for popular software (e.g., Chrome, VS Code, Steam) with AI-powered analysis via OpenCode CLI. Prompt generation and responses stream directly to the UI in real-time.

### 📂 Start Menu Organizer (`/organize`)
Provides an interactive drag-and-drop preview layout. AI-assisted auto-grouping animates items into category folders. Changes are only written to the filesystem once **Apply changes** is confirmed.

### 🔄 Automatic Backups (`/history`)
Creates native filesystem snapshots before any modification using Node's `fs/promises`. Allows instant rollback to previous Start Menu configurations.

---

## 📁 Storage & Data Paths

All application data is saved locally under `%APPDATA%\WinStartScanner`:

| File / Folder | Content |
| :--- | :--- |
| `settings.json` | Application configuration & default preferences |
| `scan-history.json` | Log of the last 100 scan results |
| `history.json` | Restore point metadata |
| `backups/` | Native Start Menu filesystem snapshots |
| `opencode-prompts/` | Generated OpenCode prompts |
| `opencode-responses/` | Saved AI responses |

---

## 💻 Development Commands

```bash
# Start Development Environment (Nuxt Dev Server + Electron with HMR)
npm run dev:electron

# Start Nuxt Dev Server Only
npm run dev

# Generate Static Frontend Build
npm run build

# Build Windows Installer (dist-electron/)
npm run electron:build

# Launch App from Existing Production Build
npm start
```

> **Build Tip:** If you do not have a code signing certificate, disable auto-discovery before building:
> ```powershell
> $env:CSC_IDENTITY_AUTO_DISCOVERY="false"; npm run electron:build
> ```

---

## 📄 License

Open Source Project. **WinStartScanner** © 2026.
