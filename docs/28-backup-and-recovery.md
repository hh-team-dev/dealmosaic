# 28 — Backup and recovery dossier

> **Latest field-test and revenue review — 4 November 2026:** [40-hospitality-revenue-reset.md](40-hospitality-revenue-reset.md) records the owner’s ongoing device tests, provider failures, fresh campaign access, reversible withdrawal of five hotel promotions and the on-site revenue blueprint. Runtime remains 2.4.0; the proposed booking/merchant platform is not deployed.

> **Current 2.4.0 release:** [39-pet-friendly-directory.md](39-pet-friendly-directory.md) covers the sourced pet-friendly directory, separate eligible-offer panels, private planning, verification and recovery. The preceding 2.3.0 destination expansion is preserved in document 38; earlier release evidence below is historical.

> **Preceding enhancement — 2.1.1:** [36-persistent-install-and-deals.md](36-persistent-install-and-deals.md) records the globally persistent install invitation and floating offers, motion/accessibility controls, form protection, exact release verification and recovery. The 2.0.1 details below remain the preceding release's verified history.

> **PWA / website release 2.0.1 — 4 November 2026:** the distinctly marked handover is [35-pwa-handover.md](35-pwa-handover.md). It records installation, platform limits, static-only offline safety, shared-code feature parity, paired PWA/classic deployable packages and rollback. The exact pre-PWA website is preserved as `website-v1.4.0` / `release/website-v1.4.0` at `5f85cf3`, plus a complete verified Git bundle. For the preceding 2.0.1 deployment/test evidence read section 10 of the PWA handover; the audit release below remains historical evidence. Never roll back a PWA by serving old website files without the same-URL removal worker.

## Current recovery point — PWA / website 2.4.0

- Runtime tag: `pwa-v2.4.0` at `151bc4d01ebe20ec7c5fd6d46f1341f3a7896b05`.
- Paired packages: `/home/user/releases/dealmosaic-2.4.0/`; PWA `2.4.0-6a89cd91fc88`, classic `2.4.0-16ea84c91465`. Both archive checksums and shared-chunk parity pass; hospitality scenarios pass 81/81 on each flavor.
- Pages deployment: `316dae5b`; current evidence, source-backup and bundle ledger: `39-pet-friendly-directory.md`.
- Source archive: `backups/dealmosaic_2026-11-04_16-48-21.tar.gz`, 386 files, all manifest checks passed. SHA-256: `7fdc744328832603e20c91a4065e843ecb8b69e978877c165a77cde6848fce3c`. Full-history bundle: `backups/pwa-v2.4.0.bundle` with checksum sidecar. The archive predates its own note; the final Git bundle/PDFs retain that note.
- Retain the prior release recovery points. No backend/database replacement is required; classic uses the same-origin removal worker and preserves saved-list/account storage.

## Previous recovery point — PWA / website 2.3.0

- Runtime tag: `pwa-v2.3.0` at `e6baee38e84da6b5ef4822ecad398d4295c2b1f8`.
- Paired packages: `/home/user/releases/dealmosaic-2.3.0/`; PWA `2.3.0-33240826e285`, classic `2.3.0-b9f48fc99d99`. Both archive checksums and source-flavor parity pass; hospitality scenarios pass 57/57 on each flavor.
- Pages deployment: `76a560fc`; current handover and recovery ledger: `38-expanded-destinations.md`.
- Keep the prior 2.2.0, 2.1.1, 2.0.1 and original website artifacts. No backend/database replacement is needed to switch frontend flavors.

## Previous recovery point — PWA / website 2.2.0

- Runtime tag: `pwa-v2.2.0` at `882b6b31bb49c72f0fa948e5e860ea79449af5e0`.
- Paired packages: `/home/user/releases/dealmosaic-2.2.0/`; PWA build `2.2.0-81b6e3913008`, classic build `2.2.0-60ef862eb530`. Both SHA-256 checks pass and both hospitality interaction suites passed 45/45 cases.
- Pages deployment: `07ae339c`; current enhancement/phone tour: `37-hotels-and-dining.md`.
- The preceding 2.1.1, 2.0.1 and original website bundles/packages below remain recovery references. Do not replace the backend or database to switch frontend flavors.

## Previous recovery point — PWA / website 2.1.1

- Live source `d608712436c056f6b9880a394c8319ea32f86997`, tag `pwa-v2.1.1`, Pages `1a0b443a`.
- **Verified source archive:** `backups/dealmosaic_2026-11-04_13-29-18.tar.gz`, **325 files**, **1,769,832 bytes**, SHA-256 `fcfc9e203f8b684c9eb7d47d4c0c4c603e5857637463d8d0be0682db7364d355`. It contains source and final test/live evidence. This self-referential archive note and final cleanup bookkeeping follow the archive and are included in the final Git bundle/PDFs.
- Matched PWA/classic archives and exact SHA-256 values: document 36, section 8; `/home/user/releases/dealmosaic-2.1.1/`.
- Full-history recovery: `backups/pwa-v2.1.1.bundle`, including current handover and evidence; retain the immutable original website and 2.0.1 bundles as well.
- The intermediate 2.1.0 deployment is superseded by the verified 2.1.1 real-404 fix. Do not use it as this enhancement's recovery target.

## Previous recovery point — PWA / website 2.0.1

- Live app source: `2faf8e3`, tag `pwa-v2.0.1`; Pages `eaa528a8`.
- **Source archive:** `backups/dealmosaic_2026-11-04_12-30-38.tar.gz` — **314 checksum-verified files**, **1,714,899 bytes**, SHA-256 `ed9dd82d71a79969eb9f5967dc6da22e401c8fb9629697d1b3cd86ea3617ed79`.
- The archive contains the published source and the final test/production evidence. This self-referential archive note and subsequent PDF/cleanup bookkeeping follow the archive; their current copies are in Git and the final PDFs. The source recovery bundle includes the final documentation commit.
- Complete-history original website bundle: `backups/website-v1.4.0.bundle`; preserved baseline tag/branch at `5f85cf3`.
- Complete-history current source bundle: `backups/pwa-v2.0.1.bundle` (main, current release tag and original website refs). Validate with `git bundle verify` before restoring.
- Matched deployable frontend archives and checked SHA-256 sums: `/home/user/releases/dealmosaic-2.0.1/`. Use the **classic** archive for an operational online-only fallback; it removes an old worker safely while retaining current business functionality.
- The original `11-26-58` audited website archive remains available. Retired 2.0.0 candidate deployment archives are not a recommended recovery target and were removed.
- Current installation, fallback, test boundaries and device steps: **[35-pwa-handover.md](35-pwa-handover.md)**. Historical inventories/checksums below are not the latest source manifest.


## Latest release backup — 4 November 2026, 11:26:58 UTC

- Archive: `dealmosaic_2026-11-04_11-26-58.tar.gz`
- **295 files verified**, all manifest checksums match; **1,642,450 bytes**.
- SHA-256: `1ceb5ddd9fc12eed073ea43445c3c79a0f0efdd01316eaa768aae272083a7e47`.
- Includes code tree deployed as `00711ad`, reusable audit suites and compact
  before/after/interaction/owner evidence. This archive precedes the self-referential
  backup-record and final documentation-only commit; it contains the complete tested
  application source. No test DB, temporary session file or screenshot is included.
- Four release archives remain, plus original branding recovery assets. The normal
  retention policy pruned the oldest `18-43-32` archive during this audit; the short-lived
  intermediate `11-24-34` archive was replaced by this complete evidence snapshot.

## Previous release backup — 4 November 2026, 10:36:14 UTC

- Archive: `dealmosaic_2026-11-04_10-36-14.tar.gz`
- Files verified: **278**; all manifest checksums match.
- Size: **1,611,118 bytes**.
- SHA-256: `d3d6c65c6ea997a4df1f6daa428de63df01728606bf404d6f9366e07f9955d71`.
- Includes the direct-shop implementation and documentation with sales paused.
- The standard retention policy pruned the oldest `18-42-30` archive; newer recovery
  archives and original branding backups remain. The historical dossier below
  describes its named archives, not the current working tree.



> **4 November 2026 workspace update:** obsolete screenshots have been removed from the working tree. The screenshot entries in the historical archive manifest below describe that immutable archive, not current files. Existing recovery archives are preserved.

**Prepared:** 3 November 2026, 14:21 UTC · **Release:** tag `v1.1-warm`, commit `a29a461`
**Live:** `https://dealmosaic.pages.dev` (Cloudflare Pages `7fa2430b`) · API `https://dealmosaic-api.onrender.com`
**Status:** every artefact below was created, checksum-verified and (for the database) restored into a
scratch instance and compared row by row. Nothing in this document is an intention; each figure was
read back from the file.

---

## 1. The one-line answer

If this laptop disappeared right now, the project is recoverable from **four** places, in this order
of importance:

| # | What | Where it is | Contains |
|---|---|---|---|
| 1 | Source archive | **`backups/dealmosaic_2026-11-04_08-39-25.tar.gz`** (§2.4) | the entire codebase, docs, brand SVG/PNG masters, public DB snapshot — 265 files, 5.15 MB uncompressed |
| 2 | Git history | `github.com/hh-team-dev/dealmosaic` @ `v1.1-warm` | every commit, the deployed tree, and the workflow that keeps Render awake |
| 3 | Live data | Turso (hosted libSQL) + `db-snapshots/dealmosaic-public-2026-11-03.sql` | 441 rows of catalogue/offers/price history, in the archive and in the repo |
| 4 | Credentials | `~/.config/dealmosaic/deploy.env` (mode **600**) + the owner's password manager | API tokens. **Not** in the archive, by design |

Read §6 before you rely on #4. There is one gap in it that only the owner can close.

---

## 2. The project archive in detail

The detail below was written against the 14:20:59 archive. The archive to keep is the one in §2.4;
it is the same scope, plus everything the site-tour work added.

| Property | Value |
|---|---|
| File | `backups/dealmosaic_2026-11-03_14-20-59.tar.gz` |
| Archive size on disk | 3,363,875 bytes (3.21 MB) |
| Files inside | **265** |
| Uncompressed size | 5,398,710 bytes (5.15 MB) across 265 entries; the manifest tracks 263 tracked files / 5,369,088 bytes, the difference being the two files the archive writes about itself |
| SHA-256 of the archive | `7ff41b5270174a1eada0001c0f63951e38c818b8d11ea4717558baca93d34755` |
| Companion manifest | `backups/dealmosaic_2026-11-03_14-20-59.manifest.json` (per-file SHA-256, versions, byte totals) |
| Companion inventory | `backups/dealmosaic_2026-11-03_14-20-59.inventory.json` (same list, machine-readable, for diffing) |
| Built-in readme | `BACKUP-README.txt` and `BACKUP-MANIFEST.json` at the archive root, so the archive explains itself even after it is moved |
| Verification | `node scripts/backup.mjs --verify dealmosaic_2026-11-03_14-20-59.tar.gz` → **263 files, all checksums match** |
| Scope note | this archive was taken at 14:20:59 UTC, before documents §28 and the release tag were written. Appendix A lists *its* contents exactly. The final archive of the release is named in §2.4 and is a superset of it |

### 2.1 What is inside, by area

| Area | Files | Bytes | Size |
|---|---|---|---|
| `docs/` | 59 | 3,349,953 | 3271.4 KB |
| `apps/web` | 94 | 748,172 | 730.6 KB |
| `db-snapshots/` | 3 | 468,336 | 457.4 KB |
| `apps/api` | 59 | 429,485 | 419.4 KB |
| `(project root)` | 9 | 131,742 | 128.7 KB |
| `scripts/` | 12 | 128,898 | 125.9 KB |
| `packages/` | 18 | 128,217 | 125.2 KB |
| `deploy/` | 8 | 12,453 | 12.2 KB |
| `secrets/` | 2 | 801 | 0.8 KB |
| `.github/` | 1 | 653 | 0.6 KB |

### 2.2 What is inside, by file type

`ts` 80, `tsx` 37, `md` 33, `png` 29, `svg` 18, `json` 12, `jpg` 10, `mjs` 9, `txt` 5, `sql` 4, `html` 4, `js` 4, `(none)` 3, `py` 3, `yml` 2, `woff2` 2, `tsbuildinfo` 2, `example` 1, `ico` 1, `webmanifest` 1, `xml` 1, `css` 1, `csv` 1, `toml` 1, `yaml` 1

The important ones: **80 `.ts` + 37 `.tsx`** is the whole application (web, API, shared core);
**33 `.md`** is the documentation set that generates the PDFs; **29 `.png` + 18 `.svg`** is the
identity (every icon size, the maskable plates, the lockups, the monogram variants); **4 `.sql`** is
the schema plus the public data snapshot.

### 2.3 What is deliberately excluded, and where it actually lives

| Excluded | Why | Where the real thing is |
|---|---|---|
| `node_modules/`, `dist/`, `.vite/`, `.turbo/` | Reconstructible from `package-lock.json` in seconds; would multiply the archive 40× | `npm ci` |
| `.git/` | It duplicates every file in the tree, and `.git/config` can hold a token inside the remote URL — archiving it is how credentials leak into zip files | GitHub, `v1.1-warm` |
| `secrets/` (except its README) | A single forgotten plaintext file in that directory is the most likely route for a token into an archive. The whole directory is excluded rather than a file list | `~/.config/dealmosaic/deploy.env`, mode 600 |
| `.env`, `*.db`, `*.db-wal`, `*.db-shm` | Environment and scratch databases, per-machine | Recreated; see §6 and §7 |
| `backups/` itself | No recursion | — |

### 2.4 Final archive of the release — the one to keep

| Property | Value |
|---|---|
| File | **`backups/dealmosaic_2026-11-04_08-39-25.tar.gz`** |
| Size on disk | 3,439,494 bytes (3.28 MB) |
| Tracked files inside | **277** (checked against the tree by the manifest) |
| SHA-256 | `ad99393b02be1981a398ee0ede0743fd41e0fe3b058c1562685985b4f2d2e5ea` |
| Manifest | `backups/dealmosaic_2026-11-03_18-42-30.manifest.json` (per-file hashes) |
| Verified | `node scripts/backup.mjs --verify dealmosaic_2026-11-04_08-39-25.tar.gz` → **277 files, all checksums match** |
| Difference from the previous release archive (`14-22-45`) | the site-tour work: `docs/29-site-tour-fixes.md`, `apps/api/src/lib/text.ts` with `splitSentences()`, `scripts/reclean-copy.ts`, `scripts/verify-pdfs.py`, the 290-test suite and the corrected handover §2.22 |

**An honest note about self-referencing archives.** The copy of *this* document inside the archive was
frozen at 08:39:25, which is before the table above could be filled in. So the file you are reading is
one revision newer than the copy stored in the archive — this is unavoidable for any archive that
describes itself, and it is why the authoritative checksum for an archive is never written inside it,
but printed by `--verify` and stored in its sibling `.manifest.json`.

**Four archives are kept, rotating.** Each `npm run backup` writes a new one and prunes the oldest; the
one named above is the release archive for `v1.3-earn`.

---

## 3. The database backup in detail

The database is split in two on purpose, because **the GitHub repository is public**.

### 3.1 Public snapshot — safe to publish, and it is published

| Property | Value |
|---|---|
| File | `db-snapshots/dealmosaic-public-2026-11-03.sql` |
| Size | 234,067 bytes |
| SHA-256 | `ad99393b02be1981a398ee0ede0743fd41e0fe3b058c1562685985b4f2d2e5ea` |
| Rows | **441** |
| Committed | yes — inside `db-snapshots/`, and therefore inside the project archive too |
| Restore-verified | `node scripts/db-backup.mjs --verify db-snapshots/dealmosaic-public-2026-11-03.sql` → every table matched, then a real query ran: *OnePlus 13R — 2 variants*, *Dettol Original Bathing Soap — 3 variants*, *Wakefit Orthopaedic Memory Foam Mattress — 2 variants* |

Row counts, read back from the restored copy:

| Table | Rows |
|---|---|
| `countries` | 5 |
| `currencies` | 9 |
| `platforms` | 14 |
| `catalogue_products` | 25 |
| `product_variants` | 46 |
| `offers` | 170 |
| `offer_snapshots` | 170 |
| `exchange_rates` | 0 |
| `trending_queries` | 2 |

`db-snapshots/latest.json` points at this file with its hash, so a consumer never has to guess which
snapshot is current.

### 3.2 Private snapshot — deliberately outside the repository

| Property | Value |
|---|---|
| Path | `~/.config/dealmosaic/db/dealmosaic-private-2026-11-03T14-20-57-800Z.sql` |
| Size | 56,015 bytes |
| Mode | **0600** (owner-only) |
| Committed | **never** — it is outside the repo and outside the archive |
| Contents | `users`, sessions, auth tokens, search history, saved products, price alerts, notification events, `dev_outbox` (13 rows) |
| Why the split exists | The allow-list is a **positive** list of public tables. A new personal table added later is excluded *by default*; a deny-list would silently leak it |

**Honest note:** the only non-empty private table today is `dev_outbox` (13 rows) — the rest are zero
because there are no real users yet. That makes this snapshot cheap to keep and cheap to lose, but the
machinery is in place for the day it is not.

### 3.3 Restore

```bash
# public data into a scratch DB (non-destructive; verifies table by table)
node scripts/db-backup.mjs --verify db-snapshots/dealmosaic-public-2026-11-03.sql

# private data — restore into the live database deliberately, never automatically
sqlite3 /tmp/restore.db < ~/.config/dealmosaic/db/dealmosaic-private-2026-11-03T14-20-57-800Z.sql
```

---

## 4. Identity assets — two full sets, on purpose

| Set | Location | When |
|---|---|---|
| **Current** (Ember + Coral) | `apps/web/public/brand/` (25 SVGs + 10 PNG sizes + maskable + social avatar), `public/favicon.svg`, `public/favicon.ico`, `public/apple-touch-icon.png`, `public/og.png` | 3 Nov 2026, after blue was removed |
| **Previous** (Cobalt + Coral) | `backups/brand-pre-ember/` — the full `brand/` directory plus the four root assets | preserved before the re-hue, exactly as the "back up branding before changing it" rule requires |
| Also preserved | `backups/brand-pre-ember/palette-options-gold-rejected.html` | the champagne-gold prototype set, kept as a record of a rejected direction |

All of it is generated from one source — `scripts/brand/brand.py` — so a future colour change is a
two-line edit there plus a re-run, not 39 hand-edited files. `scripts/generate-og.py` draws the social
card from the same constants.

---

## 5. Documentation and the PDF set

| Item | Where |
|---|---|
| Markdown source | `docs/` — 59 files, 3.3 MB, inside the archive |
| Rendered PDFs | `/home/user/handover-pdf/` — 7 documents + 1 combined, 72 pages total, 156 contents entries verified against their pages (0 wrong) |
| Generator | `scripts/handover-pdf.py`; regenerate with `python3 scripts/handover-pdf.py` |
| Document index | `docs/00-MASTER-HANDOVER.md`, PART 16 |

The PDFs are **not** in the archive (they are derived artefacts); the markdown they come from is.

---

## 6. Credentials — the exact state, including the gap

| Item | Location | State |
|---|---|---|
| Deployment tokens (.env form) | `~/.config/dealmosaic/deploy.env` | present, **permissions corrected to 600 on 3 Nov 2026** (they were world-readable 644) |
| Encrypted vault | `secrets/vault.json` | **not created.** `npm run vault:status` → "No vault present" |
| Secrets inside the archive | none | enforced by the exclusion rule in §2.3 and by `npm run secrets:scan` → **0 secrets in 220 scanned files** |

**The gap, stated plainly:** the tokens exist only as plaintext in `deploy.env`, protected by file
permissions and nothing else. Two things close it, and the first needs a decision only the owner can
make:

1. **Create the vault.** `npm run vault:init`, choose a 12+ character passphrase, store the passphrase
   in a password manager *and* offline. If the passphrase is lost the contents are unrecoverable by
   design. I cannot invent it for you, and I should not.
2. **Rotate the tokens.** They travelled through a chat window to get here. Cloudflare (needs
   *Workers Scripts: Edit*), Render, GitHub (needs *Contents: write* and *Workflows: write*), Turso,
   Brevo, Cuelinks. This is still open from the previous handover and it is the highest-value five
   minutes in this entire document.

Tokens are pasted into Render by the owner in the dashboard; I verify by API afterwards.

---

## 7. Recovery runbook — from archive to live site

```bash
# 1. Prove the archive is intact before trusting it
node scripts/backup.mjs --verify dealmosaic_2026-11-03_14-20-59.tar.gz

# 2. Restore the tree
mkdir dealmosaic && tar -xzf dealmosaic_2026-11-03_14-20-59.tar.gz -C dealmosaic
cd dealmosaic

# 3. Dependencies, from the lockfile only
npm ci

# 4. Environment: recreate .env.example → .env, then fill from the vault / Render dashboard
cat .env.example

# 5. Verify before deploying anything
npm run check        # typecheck + 270 tests + design audit + secrets scan
npm run build        # 53 pages, 52 unique <h1>

# 6. Ship
npx wrangler@3.114.15 pages deploy apps/web/dist --project-name=dealmosaic --branch=main
```

Notes that cost hours if you skip them: `wrangler@latest` needs Node ≥ 22 and this environment has
Node 20, so the version is pinned; `git push` here authenticates with
`https://x-access-token:$GITHUB_TOKEN@github.com/...` because the `http.extraheader` bearer form
returns 401 on this token; the Render API rebuilds from GitHub `main`, so push before deploying the API.

### 7.1 Disaster scenarios

| If this happens | Recovery | Realistic time |
|---|---|---|
| Laptop lost | Archive + GitHub + Turso. Clone, `npm ci`, `npm run check` | ~15 min |
| Cloudflare Pages project deleted | Re-run the wrangler deploy from the archive; the Pages Function `_worker.js` is in `apps/web/public/` | ~10 min |
| Render service deleted | `deploy/render.yaml` recreates it; re-paste env vars from the vault | ~20 min |
| Turso database deleted | Restore the public snapshot; private data is gone unless a private snapshot was taken — run `--private` before any risky migration | ~20 min |
| GitHub repo deleted | The archive is the tree; re-create the repo and push. History is lost — the tag lives only on GitHub | ~10 min |
| Domain / DNS wrong | Canonicals are host-parameterised (`%SITE_URL%`) since the earlier fix; nothing to re-generate | ~5 min |
| Social card stale | `python3 scripts/generate-og.py` | ~1 min |

---

## 8. Retention and cadence

- Default retention is **8 archives**; the oldest is pruned automatically on each run (this run pruned
  `dealmosaic_2026-11-03_13-40-50.tar.gz`).
- Take a backup **before every deploy that changes code**, and after any change to the brand assets.
- Take a **private** DB snapshot before any schema migration: `node scripts/db-backup.mjs --private`.
- Quarterly: verify the newest archive *and* the newest DB snapshot, and confirm the vault passphrase is
  still in the password manager. A backup nobody has opened is a rumour, not a backup.

---

## 9. Verification log — this run

```
node scripts/backup.mjs
  ✅ Backup created: backups/dealmosaic_2026-11-03_14-20-59.tar.gz  (3285 KB, 263 files)
  ✅ Pruned old backup: dealmosaic_2026-11-03_13-40-50.tar.gz

node scripts/backup.mjs --verify dealmosaic_2026-11-03_14-20-59.tar.gz
  ✅ Verified 263 files — all checksums match.

node scripts/db-backup.mjs
  ✅ 441 rows · sha256 564e32fd3bc86172… · 228.6 KB · no personal data (allow-list)

node scripts/db-backup.mjs --private
  ✅ 5 private tables written to ~/.config/dealmosaic/db/ (mode 0600, never committed)

node scripts/db-backup.mjs --verify db-snapshots/dealmosaic-public-2026-11-03.sql
  ✅ Restore verified: the snapshot loads cleanly into a fresh database.

npm run secrets:scan
  ✅ No secrets found in 220 scanned files.
```

---

## 10. Handover checklist for the next developer

1. Read `docs/00-MASTER-HANDOVER.md` PART 17 (*the honest summary*) before anything else.
2. Run `npm run check` and `npm run build`; both must be green before you touch a file.
3. Read `npm run audit:design` output once. It is the mechanical form of three owner rules: no black,
   no blue/near-blue, no sub-AA contrast, one gradient only.
4. Never present demo data as live: the catalogue's 25 products are watermarked and `data-origin="demo"`.
5. Turso is the database; there is no D1 port and no plan for one.
6. Commission is never an input to ranking, and every affiliate link says so on the page.
7. Take a backup before you deploy; verify it after you make it.
8. The owner reads on a 390 px Android. Check every change at that width first.
9. Delete screenshots and scratch directories when you finish.
10. If something in this document disagrees with the code, the code wins — then fix the document.

---

## Appendix A — every file in the archive

`sha256` shown truncated to 16 hex characters; the full 64-character hashes are in
`backups/dealmosaic_2026-11-03_14-20-59.manifest.json` and `.inventory.json`.

| File | Bytes | SHA-256 |
|---|---:|---|
| `.env.example` | 2,120 | `3703ea073d93f286` |
| `.github/workflows/keepalive.yml` | 653 | `25ee57548b719dec` |
| `.gitignore` | 837 | `c73f9fc910a62c88` |
| `BACKUP-MANIFEST.json` | 28,834 | `20092dddddfeee51` |
| `BACKUP-README.txt` | 788 | `e156f9bc480b07ad` |
| `README.md` | 5,614 | `12e28f961dc30dc3` |
| `apps/api/package.json` | 402 | `9537db9437b61ba8` |
| `apps/api/src/app.ts` | 5,628 | `b45df4110ab60029` |
| `apps/api/src/connectors/demo.ts` | 3,371 | `860148b41b7b00aa` |
| `apps/api/src/connectors/ebay.ts` | 7,544 | `1c48d1880aca7024` |
| `apps/api/src/connectors/feed.ts` | 14,987 | `4dea7dae326e12f8` |
| `apps/api/src/connectors/index.ts` | 6,097 | `01ff1e64d2d1f5e5` |
| `apps/api/src/connectors/types.ts` | 2,910 | `5d8e28382cce28ed` |
| `apps/api/src/db/catalog-data.ts` | 22,788 | `aed0edd9b7bbd6ce` |
| `apps/api/src/db/catalog-seed.ts` | 5,439 | `c069c94680fea057` |
| `apps/api/src/db/catalog.sql` | 8,210 | `3b506b8673620467` |
| `apps/api/src/db/index.ts` | 22,560 | `a41b9025680ca645` |
| `apps/api/src/db/schema.sql` | 6,426 | `501a5a780571363a` |
| `apps/api/src/lib/audit.ts` | 627 | `3ef2e8b5d2dc4c7c` |
| `apps/api/src/lib/cuelinks.ts` | 9,448 | `52c5c3f0aa843392` |
| `apps/api/src/lib/http.ts` | 4,147 | `5f1bedfe5e60321a` |
| `apps/api/src/lib/mailer.ts` | 9,878 | `a709f6256a35273f` |
| `apps/api/src/lib/outbox.ts` | 3,840 | `e1f9b7d5521146d5` |
| `apps/api/src/lib/rate-limit.ts` | 2,100 | `31bc594d47cc188d` |
| `apps/api/src/lib/security.ts` | 2,449 | `b11e5d400539252c` |
| `apps/api/src/middleware/session.ts` | 6,070 | `75ec96def078292f` |
| `apps/api/src/routes/admin.ts` | 12,667 | `e390c643e390e874` |
| `apps/api/src/routes/alerts.ts` | 6,814 | `fb34a4201d9c0032` |
| `apps/api/src/routes/auth.ts` | 14,502 | `b3b4b2d42b7a38f3` |
| `apps/api/src/routes/catalogue.ts` | 12,961 | `fd737c151e388946` |
| `apps/api/src/routes/community.ts` | 4,838 | `774c97b9d1c370a6` |
| `apps/api/src/routes/coupons.ts` | 21,857 | `7a273e24fd490d1e` |
| `apps/api/src/routes/dev.ts` | 1,043 | `47c9ce6932e04e69` |
| `apps/api/src/routes/fx.ts` | 3,708 | `04cee28362cb538a` |
| `apps/api/src/routes/location.ts` | 4,530 | `731bc5821bd90a33` |
| `apps/api/src/routes/maintenance.ts` | 1,573 | `a23478e4edce7aa4` |
| `apps/api/src/routes/me.ts` | 6,327 | `b3ea3f78dd443fce` |
| `apps/api/src/routes/meta.ts` | 2,097 | `7c1868eb62272bd5` |
| `apps/api/src/routes/search.ts` | 3,773 | `d3d54f13c3fbc236` |
| `apps/api/src/server.ts` | 463 | `129a8bc39eda11c4` |
| `apps/api/src/services/affiliate-campaigns.ts` | 7,838 | `ee7beb5c6a3fbf95` |
| `apps/api/src/services/affiliate-sync.ts` | 5,736 | `1c9b2f99786febbc` |
| `apps/api/src/services/alerts.ts` | 7,399 | `262238f9e1161e3a` |
| `apps/api/src/services/coupon-confidence.ts` | 7,757 | `31d060cad6f2de9e` |
| `apps/api/src/services/daily-job.ts` | 7,558 | `c0ba536bbd7a77fa` |
| `apps/api/src/services/discover.ts` | 7,852 | `b47805ea13413a6b` |
| `apps/api/src/services/offer-search.ts` | 4,114 | `d9f35c1cf71cea12` |
| `apps/api/src/services/price-history.ts` | 8,803 | `91d388be337887ad` |
| `apps/api/src/services/price-origin.ts` | 2,549 | `e20dbc431c921712` |
| `apps/api/src/services/search.ts` | 26,042 | `d019f0dad001795d` |
| `apps/api/src/services/snapshots.ts` | 2,450 | `e5c9c1431878ac6d` |
| `apps/api/tests/admin.test.ts` | 8,592 | `af9362580bf9aeb3` |
| `apps/api/tests/alerts.test.ts` | 11,728 | `539b161def13adc9` |
| `apps/api/tests/auth.test.ts` | 18,275 | `1c78d6967eae313b` |
| `apps/api/tests/coupon-confidence.test.ts` | 5,450 | `efc45c1faff3d3cc` |
| `apps/api/tests/coupon-reports.test.ts` | 7,718 | `4cb88d4333d1b3d0` |
| `apps/api/tests/coupons.test.ts` | 9,818 | `8cf42d24a4c6ce25` |
| `apps/api/tests/db-safety.test.ts` | 1,291 | `2c5f2db080ee69cf` |
| `apps/api/tests/discover.test.ts` | 9,136 | `666a6c4551ea63af` |
| `apps/api/tests/feed.test.ts` | 6,962 | `dad9d1de7421975d` |
| `apps/api/tests/mailer.test.ts` | 6,365 | `40dd510b2789c89f` |
| `apps/api/tests/offer-search.test.ts` | 5,331 | `6b720eac27ed37a0` |
| `apps/api/tests/price-history.test.ts` | 6,000 | `443ebf68caa26106` |
| `apps/api/tests/price-origin.test.ts` | 2,367 | `d51261604dc9a1e0` |
| `apps/api/tsconfig.json` | 280 | `9872c9e3a0d927ec` |
| `apps/web/index.html` | 7,534 | `fabc06dc21e3f951` |
| `apps/web/package.json` | 472 | `9ba78bed952b0792` |
| `apps/web/public/404.html` | 2,888 | `ea1c9f325167719e` |
| `apps/web/public/748571880d8a9f04ac688fac5bd91f59.txt` | 33 | `7e551010427c6d77` |
| `apps/web/public/_headers` | 642 | `6b0e980af455478a` |
| `apps/web/public/_worker.js` | 4,824 | `c8c22dc8f58c4300` |
| `apps/web/public/apple-touch-icon.png` | 3,089 | `c87d9333f03da9d6` |
| `apps/web/public/brand/dm-icon-1024.png` | 29,265 | `a911f7cea13b3bf0` |
| `apps/web/public/brand/dm-icon-128.png` | 2,769 | `d2ea1e6f0a5e2f87` |
| `apps/web/public/brand/dm-icon-16.png` | 592 | `d80563c84ff53c4d` |
| `apps/web/public/brand/dm-icon-180.png` | 3,861 | `0217d656d5b9a32d` |
| `apps/web/public/brand/dm-icon-192.png` | 3,988 | `410c37ea036aa42c` |
| `apps/web/public/brand/dm-icon-256.png` | 5,391 | `0b069509ea7e4a48` |
| `apps/web/public/brand/dm-icon-32.png` | 1,148 | `7333aada7c56aa52` |
| `apps/web/public/brand/dm-icon-48.png` | 1,476 | `11796fbb020e2421` |
| `apps/web/public/brand/dm-icon-512.png` | 13,278 | `98d62d5479a27291` |
| `apps/web/public/brand/dm-icon-64.png` | 1,929 | `915a2f27aa3e3bc5` |
| `apps/web/public/brand/dm-icon-96.png` | 2,341 | `0e370db4766758c0` |
| `apps/web/public/brand/dm-icon-dark.svg` | 300 | `350a99c0358f903f` |
| `apps/web/public/brand/dm-icon-maskable-512.png` | 7,761 | `f81d7d7f63ed6acf` |
| `apps/web/public/brand/dm-icon-mono-cream.svg` | 300 | `2723cc0bba9097ad` |
| `apps/web/public/brand/dm-icon-mono.svg` | 300 | `7749065612deca0e` |
| `apps/web/public/brand/dm-icon-plate-512.png` | 8,667 | `248baaa564c5a1be` |
| `apps/web/public/brand/dm-icon.svg` | 300 | `f68189b9c43d9caa` |
| `apps/web/public/brand/dm-logo-compact-dark.svg` | 4,174 | `d923c630a59d3967` |
| `apps/web/public/brand/dm-logo-compact.png` | 13,367 | `39f440c4c9e73619` |
| `apps/web/public/brand/dm-logo-compact.svg` | 4,174 | `95976b8c7a6455de` |
| `apps/web/public/brand/dm-logo-horizontal-dark.png` | 20,243 | `f18178ab3c7bb247` |
| `apps/web/public/brand/dm-logo-horizontal-dark.svg` | 4,168 | `ff2a527df8729c4f` |
| `apps/web/public/brand/dm-logo-horizontal-mono.svg` | 4,168 | `7d66c3e05ca3cb10` |
| `apps/web/public/brand/dm-logo-horizontal.png` | 18,926 | `d58934f82c0b172c` |
| `apps/web/public/brand/dm-logo-horizontal.svg` | 4,168 | `f0f1793d4f52247b` |
| `apps/web/public/brand/dm-social-avatar-512.png` | 7,355 | `c3999c3ec57f9baa` |
| `apps/web/public/brand/dm-social-avatar-dark-512.png` | 8,190 | `277db30a6433a4ea` |
| `apps/web/public/brand/dm-wordmark-mono-cream.svg` | 3,951 | `70008f15cd898e4b` |
| `apps/web/public/brand/dm-wordmark.svg` | 3,951 | `491d94feb2a7ee5e` |
| `apps/web/public/favicon.ico` | 3,392 | `a343fbfa2e064682` |
| `apps/web/public/favicon.svg` | 300 | `f68189b9c43d9caa` |
| `apps/web/public/fonts/Outfit.woff2` | 32,292 | `6c18d579fd87c377` |
| `apps/web/public/fonts/Plus-Jakarta-Sans.woff2` | 27,348 | `153fc85b70298bee` |
| `apps/web/public/llms.txt` | 2,074 | `4e83bc7ad23c4503` |
| `apps/web/public/manifest.webmanifest` | 837 | `01a71379322efb8d` |
| `apps/web/public/og.png` | 43,222 | `43aad52b8ff16eef` |
| `apps/web/public/robots.txt` | 540 | `d09b91f59d78d2db` |
| `apps/web/public/sitemap.xml` | 9,114 | `77e736ff52c35733` |
| `apps/web/src/App.tsx` | 3,918 | `d018e2eb10f4182a` |
| `apps/web/src/components/AuthLayout.tsx` | 1,364 | `9ecee0c345320f45` |
| `apps/web/src/components/Chrome.tsx` | 5,790 | `70dd3bc4e2c960db` |
| `apps/web/src/components/DealCard.tsx` | 6,160 | `8e445fbf00e82fd9` |
| `apps/web/src/components/DealFacts.tsx` | 2,939 | `f6fd71fcac98c184` |
| `apps/web/src/components/DealSignals.tsx` | 9,144 | `ce2bb6ded837984a` |
| `apps/web/src/components/DealsTicker.tsx` | 2,544 | `78ed8da951bc2261` |
| `apps/web/src/components/DiscoverShelves.tsx` | 6,411 | `fd61caae0afdca26` |
| `apps/web/src/components/Icon.tsx` | 5,765 | `5633ac0df2764f1c` |
| `apps/web/src/components/Logo.tsx` | 2,103 | `a0f51181dad0655c` |
| `apps/web/src/components/OfferCard.tsx` | 4,654 | `6f792e0694b17d2a` |
| `apps/web/src/components/Podium.tsx` | 4,291 | `72171f602eba1235` |
| `apps/web/src/components/PriceTruth.tsx` | 5,435 | `02de11b768140fa3` |
| `apps/web/src/components/ProductInsights.tsx` | 25,021 | `97ffb537055d1d7c` |
| `apps/web/src/components/PublicChrome.tsx` | 380 | `55a0c05dc4709f33` |
| `apps/web/src/components/SampleComparison.tsx` | 13,554 | `e1e2e34d8b71115f` |
| `apps/web/src/components/Toast.tsx` | 1,921 | `3c867a42f8a97b76` |
| `apps/web/src/components/Ui.tsx` | 8,127 | `f4c68bb4578a5268` |
| `apps/web/src/design/theme.css` | 99,579 | `a5b9e26c221047cb` |
| `apps/web/src/lib/admin-api.ts` | 3,774 | `28b44f0f512d2705` |
| `apps/web/src/lib/alerts-api.ts` | 1,068 | `0a74a2b02fb786a3` |
| `apps/web/src/lib/api.ts` | 2,755 | `540bcd060d9b4313` |
| `apps/web/src/lib/coupons-api.ts` | 9,703 | `0257d1d2b84a70e9` |
| `apps/web/src/lib/format.ts` | 1,745 | `aa7b0ebe3cb340c2` |
| `apps/web/src/lib/pincode.ts` | 3,250 | `df8d9b8ef98fef78` |
| `apps/web/src/lib/saved.ts` | 5,752 | `7d789c1338e228d6` |
| `apps/web/src/lib/search-api.ts` | 10,795 | `55fe6464c3c3817d` |
| `apps/web/src/lib/seo.tsx` | 7,569 | `103a74dd08d07f0d` |
| `apps/web/src/lib/session.tsx` | 3,474 | `23aeef10a1be7d83` |
| `apps/web/src/main.tsx` | 324 | `55a29dc659e7386c` |
| `apps/web/src/routes/Admin.tsx` | 19,189 | `a24c894b80192db9` |
| `apps/web/src/routes/Browse.tsx` | 5,412 | `09a8bc756db76135` |
| `apps/web/src/routes/Dashboard.tsx` | 9,438 | `9664fa890928fdc9` |
| `apps/web/src/routes/Deals.tsx` | 16,804 | `9ebc344eb0b06aea` |
| `apps/web/src/routes/ForgotPassword.tsx` | 3,560 | `0c8328b7a642326c` |
| `apps/web/src/routes/Landing.tsx` | 17,069 | `0d7802c55e756301` |
| `apps/web/src/routes/Legal.tsx` | 16,542 | `de0187b7a710bd08` |
| `apps/web/src/routes/Login.tsx` | 3,740 | `0fe1b47cb834ee2b` |
| `apps/web/src/routes/Method.tsx` | 11,058 | `331edb1c1f0a66d9` |
| `apps/web/src/routes/Product.tsx` | 9,959 | `0400577acf74c36d` |
| `apps/web/src/routes/Register.tsx` | 9,011 | `3c450380f555beac` |
| `apps/web/src/routes/ResetPassword.tsx` | 4,181 | `7d446b7357368447` |
| `apps/web/src/routes/Saved.tsx` | 8,121 | `80c539452d26d39c` |
| `apps/web/src/routes/Search.tsx` | 17,616 | `2974a4a22472f56d` |
| `apps/web/src/routes/Settings.tsx` | 11,503 | `6183c153439b0dda` |
| `apps/web/src/routes/VerifyEmail.tsx` | 3,570 | `77a335131ff51e9e` |
| `apps/web/tsconfig.json` | 419 | `31798d86ccdf5e2d` |
| `apps/web/tsconfig.tsbuildinfo` | 1,314 | `8a5e48a41d9f28d8` |
| `apps/web/vite.config.ts` | 1,255 | `d4171deacd65e4aa` |
| `db-snapshots/dealmosaic-public-2026-11-01.sql` | 233,818 | `2bd28b210460f112` |
| `db-snapshots/dealmosaic-public-2026-11-03.sql` | 234,067 | `564e32fd3bc86172` |
| `db-snapshots/latest.json` | 451 | `83b0977b83c9849f` |
| `deploy/feeds/example-feed.csv` | 734 | `1f7880f4d53d74a5` |
| `deploy/feeds/mapping.example.json` | 888 | `a0421ac28914d297` |
| `deploy/keepalive/cloudflare-worker-keepalive.js` | 3,266 | `9f2e0c32b3612120` |
| `deploy/keepalive/github-actions-keepalive.yml` | 1,693 | `5744909bc3ddd3ee` |
| `deploy/keepalive/src/index.js` | 3,493 | `0f2649ad02d22273` |
| `deploy/keepalive/worker-minimal.js` | 400 | `54324571d98286bc` |
| `deploy/keepalive/wrangler.toml` | 593 | `5636f5173e9a88e9` |
| `deploy/render.yaml` | 1,386 | `f23a5a1e181d5f7e` |
| `docs/00-MASTER-HANDOVER.md` | 79,849 | `3c27f83f331ed0ad` |
| `docs/00-executive-summary.md` | 11,143 | `2501f7daaf063c8d` |
| `docs/01-research-competitive-matrix.md` | 6,976 | `65b3e1cc7ceb3b3e` |
| `docs/02-connector-feasibility.md` | 8,523 | `0890200be9efae1f` |
| `docs/03-architecture.md` | 7,042 | `d75912a4d353afab` |
| `docs/04-design-system.md` | 14,287 | `e6fb50ed9dd23842` |
| `docs/05-data-model.md` | 10,103 | `cf4d3891ac7d596a` |
| `docs/06-roadmap.md` | 9,662 | `99030213b1961fdd` |
| `docs/07-test-strategy.md` | 5,603 | `59f73007f3c10b03` |
| `docs/08-zero-cost-ledger.md` | 6,243 | `123ae1eaa6c118a0` |
| `docs/09-risks-assumptions.md` | 4,552 | `04a2a891a94c18f4` |
| `docs/10-quickcommerce-grocery.md` | 13,105 | `a4e14a44687a42c7` |
| `docs/11-owner-setup-guide.md` | 9,131 | `c69fb068d257de2c` |
| `docs/12-phase1-report.md` | 8,932 | `1648a7f1e72c84a2` |
| `docs/13-phase2-report.md` | 8,654 | `6a4ab36056878472` |
| `docs/14-seo-launch-checklist.md` | 10,080 | `1d3882003e442e7e` |
| `docs/15-project-handover.md` | 49,911 | `7aec68632639dbab` |
| `docs/16-owner-credentials-register.md` | 16,155 | `7867083b5cc8b08b` |
| `docs/17-hosting-and-deployment-plan.md` | 19,490 | `2eb3030e025eb73b` |
| `docs/18-owner-quickstart-accounts.md` | 5,221 | `513813174606d573` |
| `docs/19-data-acquisition.md` | 12,247 | `127ae0e7c0309759` |
| `docs/20-email-delivery.md` | 5,459 | `c49bd0d05da23557` |
| `docs/21-location-and-maps.md` | 8,737 | `de68af1f9c964f9d` |
| `docs/22-audit-and-redesign.md` | 15,490 | `9aa8858852661ecb` |
| `docs/23-affiliate-status.md` | 3,590 | `8c675d816a263121` |
| `docs/24-seo-indexing.md` | 7,732 | `fa5b0d9a2c5cf221` |
| `docs/25-competitive-gap-analysis.md` | 14,717 | `586ac5645bee383e` |
| `docs/26-grandmaster-audit-2.md` | 14,368 | `1b04a799c42956b1` |
| `docs/27-five-agent-consolidation.md` | 17,207 | `00bb86fa0c8f22cd` |
| `docs/DEALMOSAIC-STRATEGY.html` | 52,776 | `14e8b3d10229972c` |
| `docs/brand-identity.md` | 13,464 | `adb39d8999a11be8` |
| `docs/brand/README.md` | 1,487 | `ab349eb685691fe5` |
| `docs/brand/concepts/board-colour-pairs.png` | 138,404 | `73c1135dad35d8bd` |
| `docs/brand/concepts/board-refinement-1.png` | 38,468 | `c93c569dfa2fe037` |
| `docs/brand/concepts/board-refinement-2.png` | 44,000 | `474e410b091efe3b` |
| `docs/brand/concepts/board-refinement-3.png` | 40,406 | `248d49694675e638` |
| `docs/brand/concepts/board-refinement-4.png` | 40,165 | `a6e963eedffba010` |
| `docs/brand/concepts/board-three-concepts.png` | 69,337 | `e5e0fa02615e2b3b` |
| `docs/brand/concepts/concept-a-mono.svg` | 519 | `8a84251ac84afa0a` |
| `docs/brand/concepts/concept-a.svg` | 519 | `3e466a142990fca7` |
| `docs/brand/concepts/concept-b-mono.svg` | 397 | `651ae1d853ef61c9` |
| `docs/brand/concepts/concept-b.svg` | 397 | `4a18ec6b06162ec3` |
| `docs/brand/concepts/concept-c-mono.svg` | 229 | `a2035097d94903cb` |
| `docs/brand/concepts/concept-c.svg` | 229 | `f9e1016a4d7f88d0` |
| `docs/brand/concepts/maskable-and-small-sizes.png` | 28,666 | `37e679bd8108dd12` |
| `docs/brand/concepts/masters-rendered.png` | 165,883 | `18cefeabdac8ff84` |
| `docs/brand/concepts/png-export-sheet.png` | 105,424 | `ae339bf50c90c8e2` |
| `docs/design-preview.html` | 27,065 | `5893ab0acbe53d07` |
| `docs/screenshots/01-landing-mobile.jpg` | 123,888 | `f9d710697e19bff9` |
| `docs/screenshots/02-email-verification-mobile.jpg` | 113,320 | `36577e2ca41d69f8` |
| `docs/screenshots/03-dashboard-mobile.jpg` | 248,017 | `88e133b767550486` |
| `docs/screenshots/04-comparison-desktop.jpg` | 132,429 | `9d08ffe2aeb59170` |
| `docs/screenshots/05-comparison-tablet.jpg` | 322,850 | `7b4837ea1f65b419` |
| `docs/screenshots/06-comparison-mobile.jpg` | 440,223 | `88a4c78b7afd8621` |
| `docs/screenshots/07-phase2-comparison.jpg` | 214,562 | `2d5c2cc25bb857f4` |
| `docs/screenshots/08-phase2-mobile.jpg` | 201,779 | `2fd3073ae6ad53bc` |
| `docs/screenshots/09-phase2-grocery.jpg` | 251,669 | `eda949b78698dfb0` |
| `docs/screenshots/10-phase2-product-page.jpg` | 96,674 | `c51fb3017cd0f970` |
| `docs/source/MASTER_BUILD_PROMPT.txt` | 32,498 | `c86cebbdfe183120` |
| `package-lock.json` | 91,152 | `3c84cfc8091bb81c` |
| `package.json` | 1,819 | `3412a2d57299c157` |
| `packages/core/dist/tsconfig.tsbuildinfo` | 34,648 | `8e045a5631b90534` |
| `packages/core/package.json` | 162 | `b5a49153aedee735` |
| `packages/core/src/countries.ts` | 3,142 | `ac72e2a0d283ada4` |
| `packages/core/src/index.ts` | 244 | `0c2ad62f2a970291` |
| `packages/core/src/location.ts` | 10,321 | `604e9ba7fb9ac606` |
| `packages/core/src/matching.ts` | 12,639 | `c10c288366aebf72` |
| `packages/core/src/money.ts` | 10,280 | `47f2fc0d8b7cade0` |
| `packages/core/src/offer-text.ts` | 10,186 | `fb41dc869518e0b4` |
| `packages/core/src/ranking.ts` | 9,466 | `a2d1bb8bafeea97c` |
| `packages/core/src/types.ts` | 1,408 | `1c61de8cc579b50c` |
| `packages/core/src/validate.ts` | 2,735 | `003b97c778b3ca2f` |
| `packages/core/tests/location.test.ts` | 4,715 | `86de1b2f6c83dcc2` |
| `packages/core/tests/matching.test.ts` | 7,194 | `512ddd65e5400ff7` |
| `packages/core/tests/money.test.ts` | 5,756 | `0b2e852251682843` |
| `packages/core/tests/offer-text.test.ts` | 5,558 | `54d41f05b4c24f78` |
| `packages/core/tests/ranking.test.ts` | 7,372 | `0abecdb4f877f4d5` |
| `packages/core/tests/validate.test.ts` | 2,215 | `99b0bc1bb5b3b825` |
| `packages/core/tsconfig.json` | 176 | `9b34a78dca07ba87` |
| `scripts/audit-design.mjs` | 9,991 | `44363b9b375f54fd` |
| `scripts/backup.mjs` | 10,202 | `544aa8b458cfb483` |
| `scripts/brand/brand.py` | 17,595 | `85de05abc4a69557` |
| `scripts/db-backup.mjs` | 8,947 | `a26701f32ddd1584` |
| `scripts/dev.mjs` | 859 | `6cf9adee25c8bf20` |
| `scripts/generate-og.py` | 4,827 | `4886d17736d260a9` |
| `scripts/generate-seo.mjs` | 6,668 | `e7b17e38eb3ba3a2` |
| `scripts/handover-pdf.py` | 18,905 | `bc5e07775a5e2a78` |
| `scripts/prerender.mjs` | 29,402 | `8c31b616ff4eb304` |
| `scripts/secrets-scan.mjs` | 5,063 | `92a5b2dd1c3bd356` |
| `scripts/vault.mjs` | 12,933 | `0f7caebb7e607292` |
| `scripts/verify-prerender.mjs` | 3,506 | `94b1fd0944221a3e` |
| `secrets/.gitignore` | 68 | `6667568c4c6d9149` |
| `secrets/README.md` | 733 | `e0164276ec793f0f` |
| `tsconfig.base.json` | 358 | `b6a3fdcef09292a2` |
| `vitest.config.ts` | 220 | `24507a09b7d4b500` |

**Verified 2.2.0 source archive:** `backups/dealmosaic_2026-11-04_15-15-37.tar.gz` — 348 files, 1,872,272 bytes; SHA-256 `b87da9aa98a91ce205c96d3b188c0734cba05efd10fcabc40f54ffc0756240a2`. The archive contains application source, final test/live evidence, the PDF wrapping fix and the first complete PDF validation. Final backup notes and PDF bookkeeping follow the archive and are included in the final Git history/bundle.

**Complete-history recovery bundle:** `backups/pwa-v2.2.0.bundle`, with `.bundle.sha256`; it preserves the runtime tag and final documentation commits. The preceding source bundles and paired deployment packages are retained.

**PDF delivery:** `37-hotels-and-dining.pdf` plus the fully regenerated `DEALMOSAIC-handover-set.pdf`; 18 PDFs in the set. All contents entries and text bounds are checked by the committed validator.


**Verified 2.3.0 source archive:** `backups/dealmosaic_2026-11-04_15-49-31.tar.gz` — 360 checksum-verified files, 1,943,811 bytes; SHA-256 `ef595dd2c5f7b5678f39be4bcbc9ef87a7af6e8ed8b1cd7ce38bc507595445f2`. Final self-referential archive notes and PDF verification follow this archive and are retained in the complete-history 2.3.0 Git bundle.
