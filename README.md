# WinStartScanner

![Windows](https://img.shields.io/badge/Windows-0078D6?style=flat-square&logo=windows&logoColor=white)
![Electron](https://img.shields.io/badge/Electron_44-47848F?style=flat-square&logo=electron&logoColor=white)
![Nuxt](https://img.shields.io/badge/Nuxt_3-00DC82?style=flat-square&logo=nuxtdotjs&logoColor=white)
![Vue](https://img.shields.io/badge/Vue_3-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)
![PowerShell](https://img.shields.io/badge/PowerShell_5.1-5391FE?style=flat-square&logo=powershell&logoColor=white)
![GitHub Release](https://img.shields.io/github/v/release/VOLTEKOVER/WinStartScanner?style=flat-square)

> **Versione corrente: 1.0.0** — seleziona la release più recente per l'ultimo `.exe` (l'app verifica gli aggiornamenti automaticamente all'avvio).

## Installazione

Scarica **`WinStartScanner Setup 1.0.0.exe`** dalla sezione [Releases](https://github.com/VOLTEKOVER/WinStartScanner/releases) ed esegui l'installer NSIS (directory di installazione liberamente modificabile). In alternativa, la cartella `win-unpacked` è **portabile**: apri solo `WinStartScanner.exe`.

Requisiti: **Windows 10/11 x64**. L'integrazione AI richiede l'installazione di [OpenCode](https://opencode.ai) (`opencode` presente nel `PATH`).

Applicazione desktop Windows per la **gestione completa del Menu Start**: trova gli orfani, organizza le voci per categoria, ripulisce i collegamenti rotti e gestisce i backup.

Scansiona le cartelle di programma alla ricerca di **eseguibili non collegati al Menu Start** e ti permette di:

- creare i collegamenti mancanti in un'unica operazione,
- organizzare le voci del Menu Start in cartelle per categoria,
- eliminare i `.lnk` rotti (collegamenti a file inesistenti),
- ripristinare qualsiasi modifica grazie a backup automatici,
- verificare la firma digitale degli eseguibili,
- ottenere suggerimenti di selezione/organizzazione tramite AI (OpenCode).

## Stack tecnologico

| Livello | Tecnologia |
|---|---|
| Shell desktop | **Electron 44** |
| Frontend | **Nuxt 3** (Vue 3, Composition API, SPA con `ssr: false`) |
| Styling | **Tailwind CSS v4** + design token CSS custom (tema dark, accent `#edff00`) |
| Backend / OS | **PowerShell 5.1** (scansione, shortcut, backup) |
| Integrazione AI | **OpenCode CLI** (spawn `opencode run --format json`) |
| Packaging | **electron-builder** (installer NSIS) per Windows |

## Architettura

L'app è suddivisa in tre blocchi:

```
┌────────────────────────────── Electron ──────────────────────────────┐
│  RENDERER (Nuxt/Vue)         BRIDGE          MAIN (Node/Electron)      │
│  pages/*.vue  ──window.electronAPI──►  preload.js  ──IPC──►  main.mjs  │
│       ▲                                              │                 │
│       └────── eventi (scan-progress, status…) ◄──────┘                 │
│                                                                │        │
│  HTTP statico (127.0.0.1:porta) ◄──────── .output/public      │        │
│                                                                ▼        │
│                                    PowerShell (.ps1) / OpenCode         │
└───────────────────────────────────────────────────────────────────────┘
```

1. **Renderer** — l'interfaccia Nuxt viene compilata staticamente in `.output/public` e servita da un mini **server HTTP locale** su `127.0.0.1` con porta casuale (niente `file://`).
2. **Bridge** — `electron/preload.js` espone `window.electronAPI` tramite `contextBridge`, con `contextIsolation: true` e `nodeIntegration: false`. Il frontend comunica solo tramite canali IPC.
3. **Main** — `electron/main.mjs` gestisce finestra, tray, notifiche, autostart, aggiornamenti e fa da orchestratore verso gli script PowerShell e l'integrazione AI.

**Sicurezza IPC**: ogni input dal renderer viene validato in `electron/ipc-guard.mjs` prima di raggiungere il sistema — paths vincolati al Menu Start, percorsi assoluti obbligatori, niente `..`, URL di download limitati a `github.com`, sanitizzazione delle impostazioni.

## Funzionamento delle feature

### Scansione degli orfani (`pages/scan.vue` + `electron/scan.ps1`)
1. Lo script legge tutti i collegamenti `.lnk` presenti nel Menu Start (utente e comune) e colleziona i **target**.
2. Scansiona `Program Files`, `Program Files (x86)` e `LocalAppData` cercando gli `.exe`, saltando cartelle di sistema (WinSxS, WindowsApps, node_modules, ...).
3. Ogni `.exe` **non referenziato** da un collegamento è un **orfano**: vengono estratti nome, percorso, dimensione, azienda, descrizione e stato della firma digitale.
4. Il progresso è inviato in tempo reale all'interfaccia (`PROGRESS:`, `STATUS:`, `ORPHAN:` su stdout) e viene salvato uno storico delle scansioni.

### Smart selection / AI (`smartSelect` + OpenCode)
- **Euristico locale**: una lista di app note (Chrome, VS Code, Steam, ...) con un punteggio di soglia determina quali orfani sono "applicazioni utili".
- **Con OpenCode**: i dati degli orfani vengono trasformati in un prompt strutturato e lanciati con `opencode run --format json`; la risposta (array di indici) seleziona automaticamente gli elementi da aggiungere. Il testo generato dall'AI viene **inoltrato al renderer in tempo reale** (`ai-text` via IPC) durante la generazione, così l'interfaccia può mostrare l'output mentre viene scritto.

### Organizzazione del Menu Start (`pages/organize.vue` + `apply-organization.ps1`)
Legge la struttura del Menu Start (`read-startmenu.ps1`) e la mostra in una **griglia stile Launchpad**: apri una cartella per vedere cosa contiene, trascina le app sopra le cartelle (o su un livello del breadcrumb) per spostarle. Tutto avviene come **anteprima colorata**: mentre trascini l'icona diventa **arancione**, una volta dentro la cartella resta una "ghost" **arancione e semitrasparente** nella vecchia posizione con scritto *moved to …*, mentre l'icona **verde** appare dentro la cartella di destinazione. Con **OpenCode** (`aiOrganize`) propone un raggruppamento automatico per categorie: le app restano visibili durante il calcolo e, alla risposta, **volano letteralmente dentro le nuove cartelle**. Nessuna modifica viene applicata finché non premi **Apply changes**. **Ogni operazione è preceduta da un backup automatico.**

### Collegamenti rotti (`pages/broken-links.vue` + `check-broken-links.ps1`)
Trova tutti i `.lnk` che puntano a file inesistenti e permette di eliminarli. La cancellazione è limitata ai file `.lnk` contenuti nel Menu Start.

### Backup e cronologia (`pages/history.vue` + `electron/backups.mjs`)
Prima di ogni modifica viene creato uno snapshot delle cartelle Start Menu interessate, **nativamente tramite `fs/promises` di Node.js** (niente processi esterni). Da qui puoi creare, ripristinare ed eliminare i backup, e vedere lo storico delle scansioni.

### Aggiornamenti automatici
All'avvio l'app interroga le GitHub Releases del repository (`check-update`). Se è disponibile una versione più recente del pacchetto, il nuovo `.exe` viene scaricato in background (con barra di progresso) e installato silenziosamente al riavvio.

### Pannello impostazioni (`components/SettingsPanel.vue`)
Il pannello è organizzato in cinque categorie (General, Scan, OpenCode, Shortcuts, **Updates & info** — Info e Advanced sono stati unificati qui):

- **Ogni impostazione** ha una descrizione, un eventuale badge colorato (giallo = *Recommended*, arancione = *Careful* per azioni delicate, blu = AI) e un **reset singolo** verde che compare solo quando il valore si allontana dal default.
- **OpenCode**: card di stato `[OpenCode] → [WinStartScanner]` centrata con percorso di installazione (`where opencode`), **istruzioni AI modificabili** per selezione e organizzazione (con pulsante "View built-in prompt" per mostrare il prompt di default) e pulizia dei **file temporanei AI** (`opencode-prompts`/`opencode-responses`).
- **Shortcuts**: destinazione mostrata come **percorso completo precompilato** (`...\Start Menu\Programs\WinStartScanner`) e posizione dei **backup automatici**.
- **Updates & info**: grafica di aggiornamento (Installed → Latest con freccia), versione dell'app, build di Electron/Chromium/Node, OS, diagnosi copiabile negli appunti, pulizia file temporanei, reset totale.
- **Default consigliati** già attivi: auto-scan all'avvio, profondità di scansione 3, dimensione minima file 100 KB, suoni attivati, minimize-to-tray disattivato.

### Title bar (`components/TitleBar.vue`)
Barra senza `app-region: drag` (il drag è gestito via IPC con polling della posizione del cursore) così i tooltip globali (`AppTooltip`) funzionano ovunque, doppio click per massimizzare/ripristinare con sincronizzazione dello stato, e **pill colorate dei processi in background** eseguiti in parallelo: gialla (scan), ambra (AI), arancione (broken links), blu (organize).

## Dati salvati

Tutto è memorizzato localmente in `%APPDATA%\WinStartScanner`:

| File / cartella | Contenuto |
|---|---|
| `settings.json` | impostazioni dell'app |
| `scan-history.json` | storico delle scansioni (ultime 100) |
| `history.json` | storico dei backup |
| `backups/` | snapshot del Menu Start |
| `opencode-prompts/` | prompt generati per OpenCode |
| `opencode-responses/` | risposte salvate da OpenCode |

## Comandi

```bash
# Sviluppo: Nuxt + Electron insieme (HMR attivo sul frontend)
npm run dev:electron

# Solo dev server Nuxt
npm run dev

# Build statica del frontend
npm run build

# Genera il frontend e crea l'installer Windows (dist-electron/)
npm run electron:build

# Se non possiedi un certificato di firma, disattiva il rilevamento automatico (evita il fallimento del download dei tool di firma su sistemi senza privilegi)
# (PowerShell)
# $env:CSC_IDENTITY_AUTO_DISCOVERY="false"; npm run electron:build

# Avvia l'app da build esistente (.output/public)
npm start
```

In sviluppo (`dev:electron`) `scripts/dev.mjs` avvia Nuxt, rileva l'URL del dev server e lancia Electron con `NUXT_DEV_URL` impostato: la finestra carica il dev server, quindi **le modifiche al frontend vengono ricaricate a caldo (HMR)** senza ricompilare. Senza quella variabile, Electron carica la build statica servita dal server HTTP locale.

## Struttura del progetto

```
app.vue                  # shell principale (title bar, ticker, router-view)
assets/css/main.css      # design system (token, bottoni, animazioni)
components/              # componenti UI (TitleBar, SettingsPanel, St* form controls)
composables/             # stato condiviso (useAppState, useJobState)
electron/
  main.mjs               # processo main + handler IPC
  preload.js             # bridge contextBridge -> window.electronAPI
  ipc-guard.mjs          # validazione input IPC (sicurezza)
  backups.mjs            # backup/ripristino nativi con fs/promises
  *.ps1                  # operazioni di sistema (scan, links, firme digitali)
scripts/dev.mjs          # avvio dev Nuxt + Electron con HMR
layouts/default.vue      # layout vuoto
pages/                   # index, scan, organize, broken-links, history, verify
nuxt.config.ts           # configurazione Nuxt (ssr:false, Tailwind v4, Nitro static)
```

## Licenza

Progetto open source. WinStartScanner © 2026.