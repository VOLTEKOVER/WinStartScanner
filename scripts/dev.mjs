import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const electronPath = require('electron');

const URL_RE = /https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/?/;
const ANSI_RE = /\u001B\[[0-9;]*[a-zA-Z]/g;
const isWin = process.platform === 'win32';

let nuxt = null;
let electronProc = null;
let electronStarted = false;
let buffer = '';

function pipe(prefix, chunk) {
  for (const line of chunk.toString().split(/\r?\n/)) {
    if (line.trim()) process.stdout.write(`${prefix} ${line}\n`);
  }
}

function startElectron(url) {
  if (electronStarted) return;
  electronStarted = true;
  process.stdout.write(`[dev] Nuxt pronto su ${url} — avvio Electron con HMR attivo\n`);
  electronProc = spawn(electronPath, ['electron/main.mjs'], {
    env: { ...process.env, NUXT_DEV_URL: url },
    stdio: 'inherit',
  });
  electronProc.on('close', (code) => {
    shutdown();
    process.exit(code ?? 0);
  });
}

function shutdown() {
  if (nuxt && !nuxt.killed) nuxt.kill();
  if (electronProc && !electronProc.killed) electronProc.kill();
}

process.stdout.write('[dev] Avvio Nuxt dev server...\n');
nuxt = spawn('npx', ['nuxt', 'dev'], {
  shell: isWin,
  stdio: ['inherit', 'pipe', 'pipe'],
});

function onData(chunk) {
  const clean = chunk.toString().replace(ANSI_RE, '');
  pipe('[nuxt]', chunk);
  if (electronStarted) return;
  buffer += clean;
  const match = buffer.match(URL_RE);
  if (match) startElectron(match[0]);
}

nuxt.stdout.on('data', onData);
nuxt.stderr.on('data', onData);
nuxt.on('close', (code) => {
  if (!electronStarted) {
    process.stderr.write(`[dev] Nuxt terminato (code ${code}) prima di avviare Electron.\n`);
    process.exit(code ?? 1);
  }
});

process.on('SIGINT', () => { shutdown(); process.exit(0); });
process.on('SIGTERM', () => { shutdown(); process.exit(0); });
