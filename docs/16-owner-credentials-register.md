# DEALMOSAIC — Owner Credentials Register

**PRIVATE — OWNER ONLY (shareable with a developer; contains no secrets)**

| | |
|---|---|
| Document version | 1.0 |
| Last updated | 2 November 2026 |
| Registered owner | ☐ *your legal name* |
| Owner contact email | ☐ *your email* |
| Vault location | `dealmosaic/secrets/vault.json` (encrypted) |
| Backup location | `dealmosaic/backups/` + ☐ *your off-site copy* |

---

## How this document works — read this first

This register records **which accounts exist, who owns them, and how access is
recovered**. It deliberately contains **no passwords, no API keys and no tokens**.
Those live in exactly one place: the encrypted vault (§8).

Why the split matters:

- A handover document gets shared, emailed, backed up and printed. A secret in it is
  a secret leaked.
- The vault is AES-256-GCM encrypted and excluded from every backup. Compromising
  the documentation reveals nothing an attacker can log in with.
- If you ever need to hand the project to someone else, you send them **this**
  document, and you re-issue credentials individually through the provider — never by
  forwarding the vault or its passphrase.

**Rule: if you are about to type a password or key into this file, stop.** It belongs
in the vault:

```bash
npm run vault:init      # first time
npm run vault:edit      # add or change entries
npm run vault:status    # confirm the vault exists and when it was written
```

---

## 1. Current state of accounts

**As of this handover, the project has no third-party accounts.** Nothing has been
registered, no service purchased, no API key obtained. The application runs entirely
locally with open-source dependencies.

This is deliberate. You told me not to create accounts, buy services or incur costs
without approval, so the honest inventory is short:

| Category | Accounts in existence | Needed for launch |
|---|---|---|
| Domain registrar | **0** | 1 |
| Hosting | **0** | 1 |
| Database (managed) | **0** | 0 now, 1 later |
| Email delivery | **0** | 1 |
| Retailer APIs | **0** | 1 (eBay) |
| Search engines | **0** | 2 (Google, Bing) |
| Payments | **0** | 0 |
| Analytics | **0** | optional |

Everything below is a **register template**: fill each row as you create the account.
Do not delete rows — mark them "not created" instead, so a future developer can tell
the difference between "does not exist" and "nobody wrote it down".

---

## 2. Accounts to create — in this order

Ordered so that the first two unblock the most work.

### 2.1 eBay Developers Program — *unblocks the only free live price source*

| Field | Value |
|---|---|
| Service | eBay Developers Program |
| Sign-up URL | `developer.ebay.com` |
| Purpose | Live price observations (Browse API, free ~5k calls/day) |
| Account email | ☐ |
| Username | ☐ |
| Ownership | ☐ Owner |
| Cost | ₹0 |
| Two-factor | ☐ enabled |
| Recovery email | ☐ |
| Keys held in vault? | ☐ `ebay.clientId`, `ebay.clientSecret` |
| Keyset type | ☐ Production ☐ Sandbox |
| Created on | ☐ |
| Notes | eBay has no India marketplace. Set `EBAY_MARKETPLACE_ID` (e.g. `EBAY_GB`) to test live data; results are filtered to India-sourced listings where the API allows. |

**Access instructions for a developer:** they do not need the keys for local
development — the app runs in demo mode without them. To exercise live data, the
owner sets `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` in the environment, or supplies
them through the vault. Never email keys; use the vault or a host's secret manager.

### 2.2 Domain name

| Field | Value |
|---|---|
| Registrar | ☐ (Cloudflare Registrar, Namecheap, GoDaddy…) |
| Domain | ☐ `dealmosaic.in` (or your choice) |
| Registration date | ☐ |
| Renewal date | ☐ **set a calendar reminder — expiry is the classic silent outage** |
| Auto-renew | ☐ on |
| WHOIS privacy | ☐ on |
| Registrar login email | ☐ |
| Ownership | ☐ Owner (must be in the owner's name, not a developer's) |
| Auth/EPP code location | ☐ vault: `domain.eppCode` |
| Transfer lock | ☐ on (turn off only to transfer) |
| DNS hosted at | ☐ |
| Notes | Changing the domain requires re-running `npm run seo` with a new `SITE_URL`, and re-verifying Search Console. |

### 2.3 Hosting — web (static)

| Field | Value |
|---|---|
| Provider | ☐ Cloudflare Pages / Netlify / Vercel |
| Account email | ☐ |
| Project name | ☐ `dealmosaic-web` |
| Build command | `npm run build` |
| Output directory | `apps/web/dist` |
| Root directory | `dealmosaic` |
| Node version | ☐ 20 |
| Custom domain | ☐ |
| Cost | ₹0 (free tier) |
| Ownership | ☐ Owner |
| API token location | ☐ vault: `cloudflare.apiToken` (scoped, not global) |
| Auto-deploy from Git | ☐ yes / no |

### 2.4 Hosting — API

| Field | Value |
|---|---|
| Provider | ☐ Render / Fly.io / Railway free tier |
| Account email | ☐ |
| Service name | ☐ `dealmosaic-api` |
| Start command | `node apps/api/src/server.js` (after `tsc`) or `npx tsx apps/api/src/server.ts` |
| Port | 8787 (`PORT` env) |
| Health check path | `/api/health` |
| Persistent disk | ☐ required for SQLite — or migrate to Postgres |
| Environment variables set | ☐ `NODE_ENV=production`, `PORT`, `DB_PATH` |
| Cost | ₹0 (free tier) |
| Ownership | ☐ Owner |

> **Warning:** most free tiers have an **ephemeral filesystem**. SQLite on ephemeral
> storage loses data on every redeploy. Either attach a persistent volume, or move to
> Postgres (Phase 5) before storing anything you care about — real price history in
> particular.

### 2.5 Google Search Console

| Field | Value |
|---|---|
| URL | `search.google.com/search-console` |
| Google account | ☐ |
| Property type | ☐ **Domain** (DNS verification — recommended) |
| Verification TXT record | ☐ at registrar |
| Sitemap submitted | ☐ `https://<domain>/sitemap.xml` |
| Ownership | ☐ Owner |
| Access for developer | ☐ Add as **Full** user, or share the property |
| Created on | ☐ |
| Notes | Rankings and performance history belong to the property. Changing domain or verification method loses history. |

### 2.6 Bing Webmaster Tools

| Field | Value |
|---|---|
| URL | `bing.com/webmasters` |
| Account | ☐ (Google, Microsoft, or email) |
| Imported from Search Console | ☐ (one click) |
| Sitemap submitted | ☐ |
| Ownership | ☐ Owner |
| Notes | Also powers DuckDuckGo and several AI answer engines. Worth 10 minutes. |

### 2.7 Google Business Profile — *owner verification only*

| Field | Value |
|---|---|
| URL | `business.google.com` |
| Business name | ☐ |
| Category | ☐ "Price comparison service" / "Shopping service" |
| Address | ☐ must be a real, verifiable address |
| Phone | ☐ a number you answer |
| Website | ☐ |
| Verification method | ☐ postcard / phone / video |
| Verified on | ☐ |
| Ownership | ☐ Owner's Google account — **cannot be transferred; re-verification required** |

> **Eligibility warning.** Google requires a real business presence. An online-only
> comparison service with no customer-facing location may be **ineligible**, and
> applying with a virtual office, a friend's address, or a fake location risks
> suspension and can damage the domain's standing. Read
> `docs/14-seo-launch-checklist.md` §2.5 before applying. Skipping it is a legitimate
> outcome; Search Console plus good content is the correct channel for a site like
> this.

### 2.8 Business registration

| Field | Value |
|---|---|
| Udyam (MSME) registration | ☐ `udyamregistration.gov.in`, free |
| Udyam number | ☐ vault: `business.udyamNumber` |
| GST registered | ☐ required above ₹20 lakh turnover, or immediately for B2B invoicing |
| GSTIN | ☐ vault: `business.gstin` |
| Business bank account | ☐ |
| PAN | ☐ vault: `business.pan` |
| Ownership | ☐ Owner |

### 2.9 Email delivery (before public launch)

| Field | Value |
|---|---|
| Provider | ☐ Brevo / Resend free tier |
| Account email | ☐ |
| Sending domain | ☐ |
| DNS records added (SPF, DKIM, DMARC) | ☐ |
| API key location | ☐ vault: `email.apiKey` |
| Rate limit | ☐ (free tiers are typically 100–300/day) |
| Ownership | ☐ Owner |
| Code status | **Not integrated yet.** `EMAIL_PROVIDER` is read only to log; no mail is sent. See handover §14 item 3. |

### 2.10 Database (when scaling beyond one instance)

| Field | Value |
|---|---|
| Provider | ☐ Supabase / Neon free tier |
| Account email | ☐ |
| Project ref | ☐ |
| Connection string | ☐ vault: `database.url` |
| Service role key | ☐ vault: `database.serviceRoleKey` |
| Region | ☐ nearest to India (Mumbai/Singapore) |
| Ownership | ☐ Owner |
| Code status | **Not implemented.** SQLite only; no Postgres driver installed. |

### 2.11 Optional — analytics

| Field | Value |
|---|---|
| Provider | ☐ Cloudflare Web Analytics (cookie-free, no consent banner needed) |
| Account | ☐ |
| Notes | Prefer cookie-free. A cookie-based analytics tool adds a DPDP consent obligation for no product benefit. |

---

## 3. Secrets inventory

**What exists and where it belongs.** Values are not recorded here — only the key
names used in the vault, so a new developer knows what to ask for.

| Vault key | What it is | Provider | Status |
|---|---|---|---|
| `ebay.clientId` | eBay OAuth client ID | eBay | ☐ not obtained |
| `ebay.clientSecret` | eBay OAuth client secret | eBay | ☐ not obtained |
| `domain.eppCode` | Domain transfer authorisation code | Registrar | ☐ not obtained |
| `domain.registrarLogin` | Registrar account login | Registrar | ☐ not obtained |
| `cloudflare.apiToken` | Scoped API token for DNS/deploy | Cloudflare | ☐ not obtained |
| `email.apiKey` | Transactional email API key | Brevo/Resend | ☐ not obtained |
| `database.url` | Postgres connection string | Supabase/Neon | ☐ not obtained |
| `database.serviceRoleKey` | Postgres service role key | Supabase | ☐ not obtained |
| `business.udyamNumber` | MSME registration number | Govt. of India | ☐ not obtained |
| `business.gstin` | GST identification number | Govt. of India | ☐ not obtained |
| `business.pan` | Permanent account number | Govt. of India | ☐ not obtained |
| `hosting.deployHook` | Deploy webhook / build hook URL | Hosting | ☐ not obtained |

Add new keys here **when you add them to the vault**, never before.

---

## 4. Application-level accounts (inside the product)

These are accounts *within* DEALMOSAIC, not third-party services.

| Field | Value |
|---|---|
| First admin account email | ☐ |
| Admin role assignment | ☐ `role = 'admin'` in the `users` table (no admin UI yet) |
| Admin seed method | ☐ manual SQL, or a seed script to be written in Phase 4 |
| Password policy | 12+ chars, strength meter, scrypt-hashed |
| Session model | Opaque random token, SHA-256 hashed in DB, revocable server-side |
| Session cookie | `dm_session`, httpOnly, same-site |
| Two-factor | **Not implemented** — Phase 4 |

**Local development accounts** are disposable. The database is
`apps/api/data/dealmosaic.db` and can be deleted at any time; the catalogue reseeds
on boot. There is nothing to preserve in it today.

---

## 5. Recovery plan — if the owner is unavailable

Written so a successor is never locked out.

| Asset | Recovery path | Time |
|---|---|---|
| Domain | Registrar account recovery → registered email → 2FA backup codes. If both lost: ICANN transfer dispute, slow and uncertain. **Keep 2FA backup codes offline.** | hours → weeks |
| Hosting | Account recovery via email; or deploy the code afresh from a backup archive — no state is lost except environment variables | ~1 hour |
| eBay API | Create a new keyset under a new developer account; update env | ~30 min |
| Search Console | Re-verify via DNS TXT; history is lost but the property re-registers | ~1 hour |
| Google Business Profile | Cannot be transferred; requires re-verification by the new owner | days |
| Vault | **Unrecoverable without the passphrase, by design.** Mitigation: keep the passphrase in a password manager *and* an offline written copy in a safe. Losing it means re-issuing every credential — annoying, not fatal | varies |
| Source code | Restore from `backups/*.tar.gz`, verified against its SHA-256 manifest | minutes |

**The one non-negotiable:** the vault passphrase must exist in two independent
places. Everything in this register can be rebuilt except that.

---

## 6. Handing the project to another developer

The order matters:

1. **Code and docs** — send the latest backup archive plus this register. Verify:
   `node scripts/backup.mjs --verify <archive>.tar.gz`.
2. **Not the vault.** Instead, for each credential they genuinely need, either:
   - add them as a **member** of the provider (Cloudflare, hosting, Search Console)
     with the minimum role, or
   - issue a **new, scoped key** and put it in their environment directly.
3. Revoke your old keys when they confirm access.
4. Transfer domain ownership at the registrar only after they are operational.
5. Tell them to read `docs/15-project-handover.md` §1 before touching anything.

**Never** send: the vault file, the vault passphrase, a screenshot of a credential
screen, or a `.env` file. Chat and email are not secure channels.

---

## 7. What the owner retains, unconditionally

- All source code, documentation, data and design assets — no escrow, no licence-back
- The domain, in the owner's name
- Every account, in the owner's name
- The right to move the entire project to another developer or host at any time
- Full data export (the app supports self-service export at `GET /api/me/export`)

Nothing in this build depends on a vendor that cannot be replaced. The stack is
Node, SQLite, Hono, React and Vite — all open source, all self-hostable.

---

## 8. Change log

| Date | Change | By |
|---|---|---|
| 2 Nov 2026 | Register created. Zero third-party accounts exist; all rows are templates. Vault tooling built and tested. | Development |
| | | |
