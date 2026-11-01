#!/usr/bin/env node
/**
 * Project backup.
 *
 * Creates a timestamped, self-contained archive of the whole project plus a
 * SHA-256 manifest, so any future developer can verify they received an intact
 * copy. Secrets are never included: the vault is encrypted and the plaintext
 * register does not exist on disk.
 *
 *   node scripts/backup.mjs              create a backup
 *   node scripts/backup.mjs --list       list existing backups
 *   node scripts/backup.mjs --verify F   verify an archive against its manifest
 *   node scripts/backup.mjs --keep 10    change retention (default 8)
 *
 * Excluded from the archive, because each is reconstructible and would bloat it:
 *   node_modules, dist, .vite, *.db / -wal / -shm, .env, backups/ itself.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BACKUP_DIR = join(ROOT, 'backups');

/** Never archived. Path prefixes are matched against the project-relative path. */
const EXCLUDE_PREFIXES = ['node_modules/', 'backups/', 'apps/web/dist/', 'dist/'];

/**
 * The whole `secrets/` directory is excluded — not just the vault. A test proved
 * that a single forgotten file there (an exported token, a scratch plaintext) is
 * the most likely way a secret reaches an archive. Only documentation survives.
 */
const ALWAYS_INCLUDE = new Set(['secrets/README.md', 'secrets/.gitignore', '.env.example']);
const EXCLUDE_PATTERNS = [
  /\/\.vite\//,
  /\/\.turbo\//,
  /\/__pycache__\//,
  /\.db$/,
  /\.db-wal$/,
  /\.db-shm$/,
  /^\.env$/,
  /^\.env\.local$/,
  /^secrets\/.+$/,        // every file under secrets/ except the allow-list above
  /^secrets\/.*\.plain$/,
  /^\.env\..*$/,         // .env.local etc — but .env.example is allowed below
  /\.(pem|key|p12|pfx)$/,
  /(^|\/)deploy\.env$/,
  /(^|\/)[^\/]*tokens?[^\/]*\.(env|txt|json)$/,
];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const valueOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

/* ------------------------------------------------------------------ */
/* File walking                                                        */
/* ------------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(ROOT, full).split('\\').join('/');
    if (ALWAYS_INCLUDE.has(rel)) { out.push(rel); continue; }
    if (EXCLUDE_PREFIXES.some((p) => rel === p.replace(/\/$/, '') || rel.startsWith(p))) continue;
    if (EXCLUDE_PATTERNS.some((re) => re.test(rel) || re.test(`/${rel}`))) continue;

    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(rel);
    // symlinks are skipped deliberately: an archive that follows links can escape
    // the project and silently capture something outside it.
  }
  return out;
}

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function packageVersions() {
  const read = (p) => {
    try {
      return JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
    } catch {
      return null;
    }
  };
  const root = read('package.json');
  return {
    root: root ? { name: root.name, version: root.version } : null,
    workspaces: {
      api: read('apps/api/package.json')?.version ?? null,
      web: read('apps/web/package.json')?.version ?? null,
      core: read('packages/core/package.json')?.version ?? null,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

function list() {
  if (!existsSync(BACKUP_DIR)) return console.log('No backups yet. Run: npm run backup');
  const files = readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.tar.gz')).sort();
  if (files.length === 0) return console.log('No backups yet. Run: npm run backup');
  console.log(`${files.length} backup(s) in backups/\n`);
  for (const f of files) {
    const size = (statSync(join(BACKUP_DIR, f)).size / 1024).toFixed(0);
    const manifest = join(BACKUP_DIR, f.replace('.tar.gz', '.manifest.json'));
    let extra = '';
    if (existsSync(manifest)) {
      try {
        const m = JSON.parse(readFileSync(manifest, 'utf8'));
        extra = ` · ${m.fileCount} files · ${m.gitCommit ?? 'no git'}`;
      } catch {
        extra = ' · manifest unreadable';
      }
    }
    console.log(`  ${f}  ${size} KB${extra}`);
  }
}

function verify(archivePath) {
  const base = archivePath.replace(/\.tar\.gz$/, '');
  const manifestPath = `${base}.manifest.json`;
  if (!existsSync(manifestPath)) {
    console.error(`No manifest at ${relative(ROOT, manifestPath)} — cannot verify.`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const tmp = join(BACKUP_DIR, '.verify');
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  execFileSync('tar', ['-xzf', archivePath, '-C', tmp]);

  let bad = 0;
  for (const [file, expected] of Object.entries(manifest.files)) {
    const full = join(tmp, file);
    if (!existsSync(full)) {
      console.error(`  MISSING  ${file}`);
      bad++;
      continue;
    }
    const actual = sha256(full);
    if (actual !== expected) {
      console.error(`  CORRUPT  ${file}`);
      bad++;
    }
  }
  rmSync(tmp, { recursive: true, force: true });
  if (bad === 0) {
    console.log(`✅ Verified ${manifest.fileCount} files in ${archivePath} — all checksums match.`);
  } else {
    console.error(`❌ ${bad} file(s) failed verification.`);
    process.exit(1);
  }
}

function create() {
  mkdirSync(BACKUP_DIR, { recursive: true });

  const files = walk(ROOT).sort();
  if (files.length === 0) {
    console.error('Nothing to back up.');
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const name = `dealmosaic_${stamp}`;
  const archive = join(BACKUP_DIR, `${name}.tar.gz`);

  // A staging copy makes it possible to include a manifest of exactly what went in,
  // including a MANIFEST.txt the recipient can read without any tooling.
  const stage = join(BACKUP_DIR, '.stage');
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });

  const checksums = {};
  let totalBytes = 0;
  for (const rel of files) {
    const src = join(ROOT, rel);
    const dest = join(stage, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    checksums[rel] = sha256(src);
    totalBytes += statSync(src).size;
  }

  const manifest = {
    project: 'DEALMOSAIC',
    generatedAt: new Date().toISOString(),
    generator: 'scripts/backup.mjs',
    node: process.version,
    versions: packageVersions(),
    fileCount: files.length,
    totalBytes,
    note: 'node_modules, build output, SQLite databases and .env are excluded by design. Reconstruct with `npm install` then `npm run build`.',
    files: checksums,
  };

  writeFileSync(join(stage, 'BACKUP-MANIFEST.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(
    join(stage, 'BACKUP-README.txt'),
    `DEALMOSAIC — backup ${stamp}
=====================================================

This archive contains the complete project except:
  - node_modules        (reinstall: npm install)
  - build output        (rebuild:   npm run build)
  - SQLite databases    (schema is in apps/api/src/db/*.sql; seeded on boot)
  - .env                (template is .env.example)
  - the encrypted vault (NOT included — keep it separately and securely)

To restore:
  tar -xzf ${name}.tar.gz && cd dealmosaic
  npm install
  npm run dev

Read docs/15-project-handover.md first.
Integrity: BACKUP-MANIFEST.json holds a SHA-256 for every file.
Verify with: node scripts/backup.mjs --verify <archive>.tar.gz

Files in this archive: ${files.length}
Created: ${manifest.generatedAt}
`,
  );

  // tar from inside the stage dir so archive paths are project-relative and the
  // archive unpacks into a clean tree rather than an absolute path.
  execFileSync('tar', ['-czf', archive, '-C', stage, '.'], { stdio: 'pipe' });
  rmSync(stage, { recursive: true, force: true });

  writeFileSync(join(BACKUP_DIR, `${name}.manifest.json`), JSON.stringify(manifest, null, 2));

  const kb = (statSync(archive).size / 1024).toFixed(0);
  console.log(`✅ Backup created: backups/${name}.tar.gz  (${kb} KB, ${files.length} files)`);
  console.log(`   Manifest:       backups/${name}.manifest.json`);
  console.log(`   Verify with:    node scripts/backup.mjs --verify ${name}.tar.gz`);

  // Retention: keep the newest N archives and their manifests.
  const keep = Number.parseInt(valueOf('--keep', '4'), 10);
  const archives = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('dealmosaic_') && f.endsWith('.tar.gz'))
    .sort();
  const excess = archives.slice(0, Math.max(0, archives.length - keep));
  for (const old of excess) {
    rmSync(join(BACKUP_DIR, old), { force: true });
    rmSync(join(BACKUP_DIR, old.replace('.tar.gz', '.manifest.json')), { force: true });
    console.log(`   Pruned old backup: ${old}`);
  }
}

if (flag('--list')) list();
else if (flag('--verify')) {
  const target = valueOf('--verify');
  if (!target) {
    console.error('Usage: node scripts/backup.mjs --verify <archive.tar.gz>');
    process.exit(1);
  }
  verify(existsSync(target) ? target : join(BACKUP_DIR, target));
} else create();
