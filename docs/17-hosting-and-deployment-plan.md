# Hosting & deployment plan (zero cost)

**Decision record + owner instructions. Last verified 2 November 2026.**

Every figure below was checked against current vendor documentation on the date
above. Free tiers change; re-verify before committing money or architecture.

---

## 1. The constraint that shapes everything

**Zero cost is non-negotiable.** That single rule eliminates most of the obvious
choices, and the reasons are not obvious:

| Option | Verdict | Why |
|---|---|---|
| **Vercel Hobby (free)** | ❌ Rejected | The Hobby tier **prohibits commercial use**. DEALMOSAIC will earn affiliate commission, so using it would breach their terms. Pro is $20/month. |
| **Netlify free** | ⚠️ Fallback | Works, and permits commercial use, but the free allowance is metered (100 GB/month) and their 2026 pricing change made overage expensive per 100 GB. |
| **Render free (web service)** | ✅ Accepted, with a caveat | Free, but **no persistent disk** and it sleeps after 15 minutes idle. |
| **Render free Postgres** | ❌ Rejected | Free databases **expire** (30–90 days depending on plan) and data is deleted. Unusable for real data. |
| **Fly.io** | ❌ Rejected | No genuine free tier any more. |
| **Railway** | ❌ Rejected | Trial credit only, then paid. |
| **Cloudflare Pages** | ✅ Accepted | **Unlimited static bandwidth at every tier**, 500 builds/month, free HTTPS and custom domains, **commercial use permitted**, no credit card. |
| **Cloudflare D1** | ⚠️ Phase 2 option | 5 GB free, 5 M row reads/day, 100 K writes/day, no card. But usable **only from Cloudflare Workers** — it decides your compute host too. |
| **Turso (libSQL)** | ✅ Accepted | 5 GB, 100 databases, 500 M row reads + 10 M writes/month, no card, **SQLite-compatible**, no expiry. |
| **Neon / Supabase Postgres** | ⚠️ Later | Free tiers exist but Supabase pauses idle projects; both need a full SQL-dialect migration. |

Two facts that matter more than the price:

1. **Render's free service has no disk.** Anything written to local storage is lost
   on restart or redeploy. A SQLite file would evaporate.
2. **D1 is Worker-only.** Choosing D1 means choosing Cloudflare Workers for the API.

---

## 2. The chosen architecture (Stage 1 — launch)

```
   User (India)
        │
        ▼
┌───────────────────────┐        ┌────────────────────────┐
│ Cloudflare Pages      │        │ Render free web service│
│ React SPA (static)    │──/api─▶│ Hono + Node            │
│ unlimited bandwidth   │        │ 750 hrs/month          │
│ free HTTPS + domain   │        │ no persistent disk     │
└───────────────────────┘        └───────────┬────────────┘
                                             │ libSQL over HTTPS
                                             ▼
                                 ┌────────────────────────┐
                                 │ Turso (libSQL / SQLite)│
                                 │ 5 GB · no expiry       │
                                 │ survives restarts      │
                                 └────────────────────────┘
```

| Layer | Service | Free allowance | Cost |
|---|---|---|---|
| Website | Cloudflare Pages | unlimited bandwidth, 500 builds/mo | ₹0 |
| API | Render free web service | 750 instance-hrs/mo | ₹0 |
| Database | Turso | 5 GB, 500 M reads/mo | ₹0 |
| DNS + CDN | Cloudflare | unlimited | ₹0 |
| Uptime keep-alive | UptimeRobot | 50 monitors, 5-min checks | ₹0 |
| Code hosting | GitHub free | unlimited private repos | ₹0 |
| **Total** | | | **₹0** |

### Why this split

- **Pages** is the only free host with unlimited bandwidth *and* commercial-use
  rights. A comparison site can go viral on a Reddit thread; metered bandwidth is a
  bill waiting to happen.
- **Render** runs real Node, so the existing API works with a database driver swap
  and nothing else. No rewrite to a serverless dialect.
- **Turso** is SQLite — the schema and all SQL stay identical. It decouples the
  database from the host, so moving the API later does not migrate data.

### The one compromise, stated plainly

Render's free web service sleeps after 15 minutes of no traffic; the next request
waits **30–60 seconds** while it wakes. For a site whose promise is fast comparison,
that is unacceptable.

**Mitigation:** a free uptime monitor pings `/api/health` every 5 minutes, so the
service never idles. 750 instance-hours/month covers 744 hours (31 days) — a single
keep-alive service fits inside the allowance almost exactly.

Honest caveats:
- It is a **workaround, not a guarantee**. Render may restart a free service at any
  time.
- If it becomes a real problem, **Stage 2 fixes it properly** (§6).

---

## 3. What has to change in the code

The app currently uses `better-sqlite3`, a **synchronous** driver. Turso's
`@libsql/client` is **asynchronous**. So ~40 database call sites change from

```ts
const row = db.prepare('SELECT … WHERE id = ?').get(id);
```
to
```ts
const row = await db.prepare('SELECT … WHERE id = ?').get(id);
```

This is mechanical but it touches every route, the search service and the middleware.
Two things make it safe:

- **SQL does not change at all.** Same schema, same statements, same indexes.
- `@libsql/client` also supports a **local file URL**, so development keeps running
  against `file:./apps/api/data/dealmosaic.db` with the same driver — no second code
  path, no "works in dev, fails in prod".

Estimated work: one focused session, with the existing 78 tests as the safety net.

---

## 4. What I can and cannot do

This is the part worth being blunt about.

| Task | Who | Why |
|---|---|---|
| Write all code, refactor, test | **Me** | — |
| Configure the API, environment variables, build settings | **Me** | — |
| Run the deployment from this environment | **Me** | Verified: this sandbox has working network egress to `api.cloudflare.com`, `api.render.com` and `api.turso.tech` |
| Verify the live site, smoke-test it, fix what breaks | **Me** | — |
| **Create the accounts** | **Owner** | See below |
| **Accept the terms of service** | **Owner** | Must be the account holder |
| Google Business Profile | **Owner** | Requires identity verification |
| Domain registration + payment details | **Owner** | Even at ₹0 the registrar needs an account holder |

### Why I cannot create the accounts

1. **No email inbox.** Every one of these services verifies a new account by sending
   a confirmation link to an email address. I cannot receive email.
2. **No phone number.** Some require SMS verification.
3. **Terms of service.** Signing up means accepting a contract. That contract must be
   accepted by the person who will own the account — otherwise you own nothing, which
   directly contradicts your non-negotiable requirement.
4. **An account created under a false identity gets suspended**, and suspension
   attached to a domain harms its search standing.

So the "I do everything and hand you the password at the end" model does not work —
not because I am being cautious, but because it is not possible, and would produce an
account portfolio you do not actually own.

### The model that does work — and is better for you

**You create the account in your name. You give me a scoped, revocable API token.
I do all the work.**

A token is not a password:

| | Password | Scoped API token |
|---|---|---|
| Grants | everything the account can do | only the named permission |
| Revocable | by changing it | instantly, without touching your login |
| Exposed in logs | catastrophic | limited, and you can see it was used |
| 2FA | must be disabled to share | irrelevant — 2FA stays on |

You keep the login and 2FA. I get a key that can publish a site and nothing else.
When the work is done you can revoke it in one click and lose nothing.

---

## 5. Account creation checklist (owner)

Each is free, needs no payment card, and takes a few minutes. Do them in this order —
each unlocks the next step.

### 5.1 Cloudflare (website hosting + DNS)

1. Go to **dash.cloudflare.com** → Sign up with your email.
2. Verify the email. Enable 2FA (Settings → Authentication).
3. **Do not create the Pages project yet** — I will do that with the token.
4. Create the token: **My Profile → API Tokens → Create Token → Custom token**
   - Permissions: `Account → Cloudflare Pages → Edit`
   - Account Resources: *your account*
   - TTL: 90 days (renewable)
5. Copy **Account ID** (right-hand sidebar of the dashboard) and the **token**.
   Give both to me — the Account ID is not secret; the token is.

### 5.2 Render (API hosting)

1. **render.com** → Sign up with GitHub or email.
2. Verify, enable 2FA.
3. **Account Settings → API Keys → Create API Key.**
4. Give me the key. (Do not create the service yourself — I will.)

### 5.3 Turso (database)

1. **turso.tech** → Sign up (GitHub login is fastest).
2. Verify.
3. **Settings → API Tokens → Create token** (or use the CLI: `turso auth login`).
4. Give me the token. I create the database and run the schema.

### 5.4 GitHub (recommended, not required)

1. **github.com** → new **private** repository named `dealmosaic`.
2. Create a fine-grained token: repo → Settings → Developer settings →
   Personal access tokens → Fine-grained → **Contents: Read and write** only.
3. Give me that token.

*Why bother:* it gives you an independent, off-machine copy of the code that updates
on every push, plus a full history. It is the cheapest insurance in the project.

### 5.5 What to send me

Only the tokens. **Never** your account passwords, and never your 2FA codes.

Where to put them: **not in chat if you can avoid it** — paste them into the encrypted
vault (`npm run vault:init`, then `npm run vault:set`), or send them in a chat message
and rotate them once deployment is verified. If they do go through chat, treat them as
burned: revoke and reissue after launch.

---

## 6. Stage 2 (later, optional): consolidate onto Cloudflare

If Render's cold start or the three-account spread becomes a nuisance, the API can
move to **Cloudflare Workers + D1**:

- Unlimited static bandwidth, no cold starts (V8 isolates, sub-50 ms).
- 100,000 API requests/day free.
- One vendor, one token, one place to look.
- **Data does not need migrating** from Turso if we stay on libSQL — or move to D1 in
  one export/import, because both are SQLite.

Cost of doing it: port the DB layer to the D1 binding, and change password hashing from
**scrypt** (unavailable in the Workers runtime) to **PBKDF2**, which WebCrypto provides.
That is a security-relevant change and needs its own review — which is exactly why it
is Stage 2 and not Stage 1.

**Do not start Stage 2 until Stage 1 is live and measured.** Optimising an unreleased
site is guessing.

---

## 7. Decision status

| Decision | Status |
|---|---|
| Zero cost throughout | ✅ Locked |
| Website on Cloudflare Pages | ✅ Chosen |
| API on Render free | ✅ Chosen (Stage 1) |
| Database on Turso | ✅ Chosen |
| Accounts created by owner, tokens delegated to builder | ✅ Chosen |
| Google Business Profile | Owner, later, own credentials |
| **Domain — launch on the free `*.pages.dev` address** | ✅ **Decided 2026-11-02.** Truly ₹0. A custom domain can be added later with zero code rework — only `SITE_URL` changes and `npm run seo` regenerates canonical URLs + sitemap |
| Sequencing: accounts created before any refactor begins | ✅ **Decided 2026-11-02.** No code churn until the owner is ready |
| Phase 3 scope: proceed on builder's judgement (data pipeline → community prices → e2e suite) | ✅ **Decided 2026-11-02** |
| Stage 2 Workers/D1 consolidation | Deferred |

---

## 8. What happens the moment the tokens arrive

No further questions are needed from the owner. The sequence is fixed:

1. **Verify each token works** — a read-only call against each API, so a dead or
   over-scoped token is caught before anything is created.
2. **Create the Turso database** and run the existing schema, then load the 25-product
   demo catalogue as a smoke test.
3. **Refactor the data layer** from `better-sqlite3` to `@libsql/client` (async). The
   78 existing tests must stay green throughout; `file:` URLs keep local dev working
   through the identical code path.
4. **Deploy the API to Render**, wiring `SITE_URL`, `TURSO_DATABASE_URL` and the auth
   token as environment variables — never committed.
5. **Deploy the front end to Cloudflare Pages** (`npm run build` output), with `/api`
   proxied to the Render host so the browser only ever talks to one origin (this also
   keeps cookies first-party and avoids CORS problems).
6. **Set the free uptime monitor** on `/api/health`, every 5 minutes, to defeat the
   15-minute spin-down.
7. **Smoke-test the live site** — real HTTP requests against the public URL, checking
   search, a product page, registration, and that `robots.txt` / `sitemap.xml` /
   `llms.txt` are served correctly.
8. **Re-run the full gate** (`npm run check`), take a fresh backup, and update
   `docs/15` with the live URLs.

If any step fails, the previous step's artefact is unchanged — nothing is half-migrated.

## 9. Security notes for the token handover

- Tokens are **read from environment variables only**, never written to disk in the
  repo, and `npm run secrets:scan` runs before every backup.
- The tokens will **not** appear in any archive — the scanner is verified to catch
  exactly this class of leak (tested with a planted canary credential).
- After a successful deploy, the owner should **rotate all three tokens** and issue
  fresh ones only if further deployment work is needed. Rotating costs one click and
  invalidates anything that may have leaked.
- The owner's account **passwords and 2FA codes are never requested and must not be
  sent**. Only scoped tokens.
