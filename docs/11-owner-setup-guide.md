# Owner Setup Guide — exactly what you do, in order

**Read this once.** It is the complete list of things only you can do. Everything else — code, database, tests, deployment commands, configuration — I do.

Total owner time: **~45 minutes across 7 steps**, all free except the optional domain.

---

## 0. What I can and cannot do for you

| I can do | I cannot do (and why) |
|---|---|
| Write all code, schema, tests, docs | Create accounts — every one needs your email/phone OTP and identity |
| Run migrations, seed data, build, deploy commands | Accept a merchant's or network's terms of service — that is a **legal agreement in your name** |
| Configure environment variables from credentials you give me | Buy a domain or enter payment details |
| Verify each integration works and report the result | Recover an account if a programme rejects or suspends it |

**Rule I will hold to:** never email/paste a long-lived credential that you cannot revoke. Step 6 explains the safe handover.

---

## 1. eBay Developers — **the single highest-value step** (5 min, free)
Unblocks **live, real prices** in US, UK, Germany, France, Australia, Canada, Italy, Spain, Netherlands, Ireland **and UNIVERSAL mode**.

1. Go to **https://developer.ebay.com** → *Register* (free, no card).
2. Sign in → **Hi [name] → Application Keysets** (or *My Account → Application Keys*).
3. You will see **Sandbox** and **Production** keysets. Open **Production**.
4. Copy two values:
   - **Client ID (App ID)** — looks like `YourName-Dealmo-abc123-XXXX`
   - **Client Secret (Cert ID)** — long string
5. Send me those two values (step 6). That is all — the OAuth call is `client_credentials`, no user login needed.

> Optional but recommended: apply for the **eBay Partner Network** (free) so eBay links carry attribution. Not required for data.

---

## 2. Cloudflare — hosting (5 min, free)
This is where the website will actually live, on a free `*.pages.dev` + `*.workers.dev` subdomain.

1. Sign up at **https://dash.cloudflare.com/sign-up** (no card).
2. From the dashboard, copy your **Account ID** (right-hand column of the Workers & Pages overview).
3. Go to **My Profile → API Tokens → Create Token → "Create Custom Token"**.
4. Name it `dealmosaic-deploy` and give it exactly these permissions:
   - **Account → Cloudflare Pages → Edit**
   - **Account → Workers Scripts → Edit**
   - **Account → Account Settings → Read**
5. Scope it to **your account only**, set **TTL 1 day**, Create, and copy the token **once** (it is shown only once).
6. Send me: **Account ID + the token**.

---

## 3. Supabase — production database (7 min, free)
Local development uses SQLite (already working here). Production uses Supabase Postgres, free tier.

1. Sign up at **https://supabase.com/dashboard** (GitHub or email, no card).
2. **New project** → name `dealmosaic` → choose the region closest to India (**Singapore** or **Mumbai** if offered) → generate a strong DB password and **save it**.
3. Wait ~2 min for provisioning. Then go to **Project Settings → API** and copy:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public key**
   - **service_role key** ← this one is powerful; handle per step 6
4. Go to **Project Settings → Database → Connection string → URI** and copy it, replacing `[YOUR-PASSWORD]` with the password from step 2.
5. Send me all four.

---

## 4. Email delivery — verification & password reset (5 min, free)
Without this, verification links appear in an in-app dev outbox (fine for testing, not for real users).

Pick **one**:
- **Brevo** — https://www.brevo.com → free 300 emails/day; then *SMTP & API → SMTP* (host, port 587, login, master password).
- **Resend** — https://resend.com → free 3,000/month; *API Keys → Create*; then verify your sending domain (or use their test domain initially).

Send me: provider name + SMTP/API credentials.

---

## 5. Affiliate & commerce accounts — this is what makes live Indian data possible

Do these in order of value. **Each is free; acceptance of terms is yours.**

### 5a. Amazon Associates India (10 min) — *the long game*
1. **https://affiliate-program.amazon.in** → sign up with your website (you can use the placeholder `dealmosaic.pages.dev` once live).
2. Get your **Associate tag** (e.g. `dealmosaic-21`). Send it to me — it makes all Amazon links attributed immediately.
3. **Creators API is gated**: you need **10 qualifying referred sales in a rolling 30-day window** before Amazon issues OAuth credentials. Until then the Amazon connector stays `pending_approval` — this is Amazon's rule, not ours.
4. When you get there: *Associates Central → Tools → Creators API → request credentials* → send me Client ID + Secret.

### 5b. Cuelinks (10 min) — *covers the Indian grocery/quick-commerce family*
1. **https://www.cuelinks.com** → *Sign up* as a publisher (free).
2. After approval, copy your **Publisher ID** and generate an **API key** (*Account → API*).
3. Send both. This gives us **link monetisation** for BigBasket, JioMart, Swiggy, Flipkart-family and others.
4. ⚠️ Understand the limit: Cuelinks monetises *links*. It does **not** give us product data or prices. Say it back to me if that is unclear — it is the exact mistake the brief warned about.

### 5c. Quick-commerce affiliate reality (read before spending time)
- **Blinkit** — CPS programme (₹110/install, up to ₹40/order) exists but is app-install oriented and campaign availability has been reported **paused**. Treat as *maybe*.
- **Zepto** — no public consumer affiliate programme found. Skip.
- **Swiggy Instamart** — Swiggy affiliate programme (up to ~15%) is real; join via Swiggy's programme or a network such as Cuelinks/AdmitAd/EarnKaro.
- **BigBasket / JioMart** — affiliate programmes exist (rates vary, short cookie windows on some).
- **Flipkart Minutes** — Flipkart affiliate closed to new signups since 2018; only via networks.

**Conclusion for you:** quick-commerce *prices* will come from **Mosaic Community Price** reports and **deep links**, not from an API. Monetisation comes later through whichever affiliate programmes approve you. I am not going to pretend otherwise.

---

## 6. ⚠️ How to hand over credentials safely

**Do not paste secrets into a chat message that stays in history, and never send a token you cannot revoke.**

Recommended method:
1. I will create a file `deploy/SECRETS.local.env` (git-ignored, and I will **not** commit it).
2. You paste the values directly into that file in the workspace editor.
3. I read it during deployment, write the variables to Cloudflare/Supabase via their CLIs, then **delete the file** and tell you to **revoke/rotate** the Cloudflare token and Supabase `service_role` key from the dashboards.
4. From then on, production uses variables held by Cloudflare/Supabase — never in the repo, never in my context.

Rules I enforce regardless:
- All secrets server-side only; the build fails if a key-like string appears in `apps/web`.
- Cloudflare token scoped to Pages + Workers only, TTL 1 day.
- Supabase `service_role` never reaches the browser (only `anon` does).
- Nothing is deployed with billing enabled; no plan upgrades; no card on file.

---

## 7. What I do the moment you send step 1–4

1. Verify each credential with a live call (eBay OAuth → one real search; Supabase → `select 1`; Cloudflare → account read; email → test send).
2. Apply the full schema (29+ tables) to Supabase, seed countries/currencies/retailers/platform registry.
3. Build the production bundle, deploy web to Pages and API to Workers, set all env vars.
4. Run the smoke suite against the **live URL**: register → verify → log in → country select → search → compare → watchlist → alert → logout.
5. Send you **the working URL** plus a short report of what passed, what is demo, and what is still pending approval.

---

## 8. Optional, later (paid — your decision only)
| Item | Why | Cost |
|---|---|---|
| Domain (`dealmosaic.com` etc.) | Branded launch | ~₹800–1,200/yr |
| Trademark search & filing (India class 35/42) | Protect the name commercially | varies |
| Supabase Pro | Only above 500 MB or to stop inactivity pausing | ~$25/mo |
| Workers Paid | Only above 100k requests/day | ~$5/mo |

I will never enable any of these. If a free-tier limit is approaching, I will tell you the number and the options.

---

## 9. Your checklist (tick as you go)

- [ ] **1** eBay Production Client ID + Secret
- [ ] **2** Cloudflare Account ID + scoped API token
- [ ] **3** Supabase Project URL + anon key + service_role key + DB URI
- [ ] **4** Brevo **or** Resend credentials
- [ ] **5a** Amazon Associates India tag (+ Creators API creds later)
- [ ] **5b** Cuelinks Publisher ID + API key
- [ ] **5c** Swiggy / BigBasket / JioMart via network (optional, when you have time)
- [ ] **Approve Phase 1** so the build starts

You do not need all nine before I start. **Steps 1–4 are enough for a fully live deployment**; 5a–5c can arrive at any time afterwards.
