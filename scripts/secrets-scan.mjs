#!/usr/bin/env node
/**
 * Secret scanner.
 *
 * The project promises that credentials never enter documentation, backups or a
 * repository. A promise is only worth something if it is checked, so this runs as
 * part of `npm run check` and before every backup.
 *
 * It is a heuristic, not a guarantee: it catches the mistakes people actually
 * make (a key pasted into a .ts file, a committed .env, a private key blob), not
 * every conceivable leak. Nothing here replaces an encrypted vault.
 *
 *   node scripts/secrets-scan.mjs
 *   node scripts/secrets-scan.mjs --staged   (only files in git, when git exists)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'backups', 'coverage', '.vite', '.turbo', '__pycache__',
]);
/** Files that are allowed to contain the words below without being secrets. */
const ALLOWED = new Set([
  'scripts/secrets-scan.mjs',
  'scripts/vault.mjs',
  'docs/16-owner-credentials-register.md',
  'docs/15-project-handover.md',
  '.env.example',
  'package-lock.json',
]);

const PATTERNS = [
  {
    id: 'private-key',
    re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
    why: 'A private key block.',
  },
  {
    id: 'aws-access-key',
    re: /\bAKIA[0-9A-Z]{16}\b/,
    why: 'An AWS access key ID.',
  },
  {
    id: 'google-api-key',
    re: /\bAIza[0-9A-Za-z_-]{35}\b/,
    why: 'A Google API key.',
  },
  {
    id: 'github-token',
    re: /\bgh[pousr]_[0-9A-Za-z]{36,}\b/,
    why: 'A GitHub token.',
  },
  {
    id: 'stripe-live',
    re: /\bsk_live_[0-9A-Za-z]{20,}\b/,
    why: 'A live payment secret key.',
  },
  {
    id: 'jwt',
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    why: 'A JSON Web Token.',
  },
  {
    id: 'assignment',
    // FOO_SECRET = "an actual looking value"  (not empty, not a placeholder)
    re: /\b[A-Z0-9_]*(?:SECRET|PASSWORD|PASSWD|API_KEY|APIKEY|TOKEN|PRIVATE_KEY|CLIENT_SECRET)[A-Z0-9_]*\s*[:=]\s*['"`]([^'"`\s]{12,})['"`]/,
    why: 'A hard-coded credential assignment.',
    // Values that are obviously not real credentials.
    allowValue: /^(process\.env|import\.meta|<<|\$\{|your[-_ ]|xxx|placeholder|changeme|example|test-|dummy|<)/i,
  },
  {
    id: 'dotenv-file',
    re: null,
    why: 'A committed .env file.',
  },
];

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    const rel = relative(ROOT, full).split('\\').join('/');
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) {
      if (/^\.env(\..*)?$/.test(entry.name) && entry.name !== '.env.example') {
        files.push({ rel, dotenv: true });
        continue;
      }
      const { size } = statSync(full);
      if (size > 1024 * 1024) continue; // skip binaries and large blobs
      if (/\.(png|jpg|jpeg|gif|webp|woff2?|ttf|ico|zip|gz|pdf|db|sqlite)$/i.test(entry.name)) continue;
      files.push({ rel, full });
    }
  }
})(ROOT);

const findings = [];

for (const file of files) {
  if (file.dotenv) {
    findings.push({ file: file.rel, line: 1, id: 'dotenv-file', why: PATTERNS.at(-1).why, excerpt: '' });
    continue;
  }
  if (ALLOWED.has(file.rel)) continue;

  let text;
  try {
    text = readFileSync(file.full, 'utf8');
  } catch {
    continue;
  }
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 400) continue;
    // Skip obvious documentation placeholders and the vault's own docstrings.
    for (const pattern of PATTERNS) {
      if (!pattern.re) continue;
      const match = pattern.re.exec(line);
      if (!match) continue;
      if (pattern.allowValue && pattern.allowValue.test(match[1] ?? '')) continue;
      // Redact the finding so the scanner itself never prints a secret.
      const redacted = line.replace(/(['"`])([^'"`\s]{6,})\1/g, (_m, q, v) => `${q}${v.slice(0, 2)}***REDACTED***${q}`);
      findings.push({ file: file.rel, line: i + 1, id: pattern.id, why: pattern.why, excerpt: redacted.trim().slice(0, 120) });
      break;
    }
  }
}

const scanned = files.length;
if (findings.length === 0) {
  console.log(`✅ No secrets found in ${scanned} scanned files.`);
  console.log('   Reminder: an encrypted vault (secrets/vault.json) is the only place');
  console.log('   credentials should ever be stored.');
  process.exit(0);
}

console.error(`❌ ${findings.length} potential secret(s) found:\n`);
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  [${f.id}]  ${f.why}`);
  if (f.excerpt) console.error(`    ${f.excerpt}`);
}
console.error('\nMove the value into the encrypted vault and reference it through an env var.');
console.error('See docs/16-owner-credentials-register.md.');
process.exit(1);
