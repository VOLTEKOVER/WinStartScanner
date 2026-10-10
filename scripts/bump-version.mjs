import fs from 'node:fs';

const OUT = process.env.GITHUB_OUTPUT;

function parse(v) {
  const s = String(v || '').replace(/^v/, '').split('.');
  const nums = s.slice(0, 3).map((seg) => {
    const n = parseInt(String(seg).replace(/[^0-9].*$/, ''), 10);
    return Number.isNaN(n) ? 0 : n;
  });
  while (nums.length < 3) nums.push(0);
  return nums;
}

function cmp(a, b) {
  for (let i = 0; i < 3; i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

const fmt = (a) => `${a[0]}.${a[1]}.${a[2]}`;

const pkgUrl = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(fs.readFileSync(pkgUrl, 'utf8'));
const current = pkg.version;

let latest = null;
try {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: {
      'User-Agent': 'winstartscanner-ci',
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.ok) {
    const data = await res.json();
    if (data.tag_name) latest = String(data.tag_name).replace(/^v/, '');
  } else {
    console.warn(`latest release lookup HTTP ${res.status}`);
  }
} catch (err) {
  console.warn(`latest release lookup failed: ${err.message}`);
}

let next;
if (!latest) {
  next = current;
} else if (cmp(parse(current), parse(latest)) > 0) {
  next = current;
} else {
  const base = parse(latest);
  base[2] += 1;
  next = fmt(base);
}

pkg.version = next;
fs.writeFileSync(pkgUrl, JSON.stringify(pkg, null, 2) + '\n');

console.log(`current=${current} latest=${latest || 'none'} next=${next}`);
if (OUT) fs.appendFileSync(OUT, `version=${next}\n`);
