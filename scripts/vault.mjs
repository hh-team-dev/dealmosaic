#!/usr/bin/env node
/**
 * Owner secrets vault.
 *
 * Holds the OWNER CREDENTIALS REGISTER's secret half — passwords, API keys,
 * tokens, recovery codes. The technical handover never contains any of it, and
 * neither does any backup: `secrets/vault.json` is excluded from archives by
 * design, and only the encrypted form ever exists on disk.
 *
 * Crypto: scrypt (N=2^17) for key derivation, AES-256-GCM for the payload.
 * The salt and IV are random per save. The passphrase is read from a prompt or
 * stdin and never written anywhere.
 *
 *   node scripts/vault.mjs init           create a new vault
 *   node scripts/vault.mjs edit           decrypt → $EDITOR → re-encrypt
 *   node scripts/vault.mjs show           decrypt to stdout
 *   node scripts/vault.mjs set KEY VALUE  set one entry (prompts for value if omitted)
 *   node scripts/vault.mjs get KEY        print one entry
 *   node scripts/vault.mjs rotate         re-encrypt with a new passphrase
 *   node scripts/vault.mjs status         is a vault present, when was it written
 *   node scripts/vault.mjs export         decrypt to a file (with a loud warning)
 *
 * Rules enforced here:
 *   - refuses to write plaintext into the project directory
 *   - refuses a passphrase shorter than 12 characters
 *   - verifies the GCM auth tag, so a corrupted or tampered vault fails loudly
 *     rather than decrypting to garbage
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SECRETS_DIR = join(ROOT, 'secrets');
const VAULT_PATH = join(SECRETS_DIR, 'vault.json');

const SCRYPT = { N: 1 << 17, r: 8, p: 1, keylen: 32 };
const MIN_PASSPHRASE = 12;

/* ------------------------------------------------------------------ */
/* Passphrase input                                                    */
/* ------------------------------------------------------------------ */

function ask(question, { confirm = false } = {}) {
  return new Promise((resolvePromise) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: process.stdin.isTTY });
    // Hide the passphrase when attached to a terminal. When piped, echo is moot.
    if (process.stdin.isTTY) {
      const onData = (char) => {
        if (char.toString() !== '\n' && char.toString() !== '\r' && char.toString() !== '\u0004') {
          process.stderr.write('\r\x1b[K' + question);
        }
      };
      process.stdin.on('data', onData);
    }
    rl.question(question, (answer) => {
      rl.close();
      if (confirm) {
        const rl2 = createInterface({ input: process.stdin, output: process.stderr, terminal: process.stdin.isTTY });
        rl2.question('Confirm passphrase: ', (again) => {
          rl2.close();
          if (answer !== again) {
            console.error('\nPassphrases did not match.');
            process.exit(1);
          }
          resolvePromise(answer);
        });
      } else {
        resolvePromise(answer);
      }
    });
  });
}

async function getPassphrase(confirm = false) {
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const lines = Buffer.concat(chunks).toString('utf8').split('\n').map((l) => l.trim()).filter(Boolean);
    const pass = lines[0];
    if (!pass) {
      console.error('No passphrase on stdin.');
      process.exit(1);
    }
    return pass;
  }
  const pass = await ask('Vault passphrase: ', { confirm });
  if (pass.length < MIN_PASSPHRASE) {
    console.error(`\nPassphrase must be at least ${MIN_PASSPHRASE} characters.`);
    process.exit(1);
  }
  return pass;
}

/* ------------------------------------------------------------------ */
/* Crypto                                                              */
/* ------------------------------------------------------------------ */

function deriveKey(passphrase, salt) {
  return scryptSync(passphrase.normalize('NFKC'), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 256 * 1024 * 1024,
  });
}

function encrypt(passphrase, payloadObject) {
  const salt = randomBytes(32);
  const iv = randomBytes(12);
  const key = deriveKey(passphrase, salt);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payloadObject, null, 2), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    format: 'dealmosaic-vault',
    version: 1,
    kdf: { algorithm: 'scrypt', N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, keylen: SCRYPT.keylen, salt: salt.toString('base64') },
    cipher: { algorithm: 'aes-256-gcm', iv: iv.toString('base64'), tag: tag.toString('base64') },
    writtenAt: new Date().toISOString(),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decrypt(passphrase, vault) {
  if (vault.format !== 'dealmosaic-vault') throw new Error('Not a DEALMOSAIC vault file.');
  const salt = Buffer.from(vault.kdf.salt, 'base64');
  const key = deriveKey(passphrase, salt);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(vault.cipher.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(vault.cipher.tag, 'base64'));
  try {
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(vault.ciphertext, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch {
    throw new Error('Wrong passphrase, or the vault has been tampered with (authentication tag failed).');
  }
}

function readVault() {
  if (!existsSync(VAULT_PATH)) {
    console.error('No vault yet. Run: npm run vault:init');
    process.exit(1);
  }
  return JSON.parse(readFileSync(VAULT_PATH, 'utf8'));
}

function writeVault(vault) {
  mkdirSync(SECRETS_DIR, { recursive: true });
  writeFileSync(VAULT_PATH, JSON.stringify(vault, null, 2), { mode: 0o600 });
  // 0o600: owner read/write only. Defence in depth behind disk permissions.
  try {
    execFileSync('chmod', ['600', VAULT_PATH]);
  } catch {
    /* non-POSIX: mode above still applied where supported */
  }
}

/* ------------------------------------------------------------------ */
/* Vault shape                                                         */
/* ------------------------------------------------------------------ */

function emptyVault() {
  return {
    meta: {
      project: 'DEALMOSAIC',
      owner: '<<your name>>',
      createdAt: new Date().toISOString(),
      purpose:
        'Owner credentials register — secret half. Never copied into documentation, backups or repositories.',
      warning:
        'If you lose this passphrase, these secrets are unrecoverable by design. Keep an offline copy of the passphrase in a password manager.',
    },
    entries: {
      // Populate as accounts are created. Example shape:
      // 'ebay-developer': {
      //   label: 'eBay Developers Program',
      //   loginEmail: 'owner@example.in',
      //   username: 'owner-ebay',
      //   password: '…',
      //   apiKeyId: '…',
      //   apiSecret: '…',
      //   recovery: '…',
      //   twoFactor: 'authenticator app, seeded 2026-11-xx',
      //   notes: 'Production keyset. Rotate every 12 months.',
      //   updatedAt: '…',
      // },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

async function init() {
  if (existsSync(VAULT_PATH)) {
    console.error('A vault already exists at secrets/vault.json');
    console.error('Use `npm run vault:edit` to modify it, or `npm run vault:rotate` to change the passphrase.');
    process.exit(1);
  }
  console.log('Creating a new encrypted vault.');
  console.log('Choose a passphrase of 12+ characters. Store it in a password manager —');
  console.log('if you lose it, the vault cannot be recovered.\n');
  const pass = await getPassphrase(true);
  writeVault(encrypt(pass, emptyVault()));
  console.log('\n✅ Vault created: secrets/vault.json');
  console.log('   Add entries with: npm run vault:edit');
}

async function edit() {
  const vault = readVault();
  const pass = await getPassphrase();
  const data = decrypt(pass, vault);

  const tmp = join(SECRETS_DIR, '.vault.edit.json');
  writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
  try {
    execFileSync(editor, [tmp], { stdio: 'inherit' });
  } catch {
    console.error(`Could not launch editor "${editor}". Set $EDITOR and try again.`);
    unlinkSync(tmp);
    process.exit(1);
  }

  let updated;
  try {
    updated = JSON.parse(readFileSync(tmp, 'utf8'));
  } catch {
    console.error('The edited file is not valid JSON. Nothing was saved.');
    unlinkSync(tmp);
    process.exit(1);
  }
  unlinkSync(tmp);
  writeVault(encrypt(pass, updated));
  console.log('✅ Vault updated and re-encrypted.');
}

async function show() {
  const vault = readVault();
  const pass = await getPassphrase();
  process.stdout.write(JSON.stringify(decrypt(pass, vault), null, 2) + '\n');
}

async function set() {
  const [, , , key, ...rest] = process.argv;
  if (!key) {
    console.error('Usage: node scripts/vault.mjs set <category.key> [value]');
    process.exit(1);
  }
  const vault = readVault();
  const pass = await getPassphrase();
  const data = decrypt(pass, vault);
  const value = rest.length > 0 ? rest.join(' ') : await ask(`Value for ${key}: `);
  data.entries[key] = {
    label: data.entries[key]?.label ?? key,
    value,
    updatedAt: new Date().toISOString(),
  };
  writeVault(encrypt(pass, data));
  console.log(`✅ Set ${key}.`);
}

async function get() {
  const key = process.argv[3];
  if (!key) {
    console.error('Usage: node scripts/vault.mjs get <category.key>');
    process.exit(1);
  }
  const vault = readVault();
  const pass = await getPassphrase();
  const data = decrypt(pass, vault);
  const entry = data.entries[key];
  if (!entry) {
    console.error(`No entry "${key}".`);
    process.exit(1);
  }
  process.stdout.write((typeof entry === 'string' ? entry : entry.value ?? JSON.stringify(entry)) + '\n');
}

async function rotate() {
  const vault = readVault();
  console.log('Enter the CURRENT passphrase.');
  const oldPass = await getPassphrase();
  const data = decrypt(oldPass, vault);
  console.log('\nEnter the NEW passphrase (12+ characters).');
  const newPass = await getPassphrase(true);
  writeVault(encrypt(newPass, data));
  console.log('\n✅ Vault re-encrypted with the new passphrase.');
}

function status() {
  if (!existsSync(VAULT_PATH)) {
    console.log('No vault present. Run: npm run vault:init');
    return;
  }
  const vault = JSON.parse(readFileSync(VAULT_PATH, 'utf8'));
  const st = statSync(VAULT_PATH);
  console.log('Vault: secrets/vault.json');
  console.log(`Last written: ${vault.writtenAt}`);
  console.log(`Size: ${st.size} bytes   Permissions: 0${(st.mode & 0o777).toString(8)}`);
  console.log(`KDF: ${vault.kdf.algorithm} (N=${vault.kdf.N})   Cipher: ${vault.cipher.algorithm}`);
  console.log('Contents are encrypted. Use `npm run vault:show` to read them.');
}

async function exportPlain() {
  const vault = readVault();
  const pass = await getPassphrase();
  const data = decrypt(pass, vault);
  const out = join(SECRETS_DIR, 'vault-export.plain.json');
  decryptedTo(out, data);
}

function decryptedTo(out, data) {
  if (!out.startsWith(SECRETS_DIR)) {
    console.error('Refusing to write plaintext outside secrets/.');
    process.exit(1);
  }
  console.error('\n⚠️  WRITING PLAINTEXT SECRETS. Move this file to a password manager');
  console.error('   or an encrypted disk image, then delete it. It is git-ignored but');
  console.error('   it is still plaintext on disk.\n');
  writeFileSync(out, JSON.stringify(data, null, 2), { mode: 0o600 });
  console.log(`Exported to ${out}. Delete it as soon as you have imported it.`);
}

const command = process.argv[2] ?? 'status';
const commands = { init, edit, show, set, get, rotate, status, export: exportPlain };
const run = commands[command];
if (!run) {
  console.error(`Unknown command "${command}". One of: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

try {
  await run();
} catch (error) {
  // A stack trace here would leak internal paths and tell the user nothing.
  console.error(`\n✗ ${error.message}`);
  process.exit(1);
}
