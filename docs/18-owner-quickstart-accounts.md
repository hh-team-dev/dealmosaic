# START HERE — Owner's 15-minute account setup

**For:** the DEALMOSAIC owner. **Time:** about 15 minutes total. **Cost:** ₹0.
**Payment card:** not required for any of the three.

Do these three, in this order. Then send me three tokens and I take over completely.

---

## Before you start

You will need:
- An email address you control (this becomes the owner of everything)
- Your phone, for two-factor authentication — turn 2FA **on** everywhere, on purpose
- A password manager if you have one (Bitwarden / Google / iCloud are all free)

**Rules that never change:**
- ❌ Never send me your account password
- ❌ Never send me a 2FA / one-time code
- ✅ Only ever send **API tokens** — they are limited, revocable, and worth little alone

---

## Step 1 — Cloudflare (hosts the website)

1. Open **dash.cloudflare.com** → **Sign up**.
2. Use your own email. Pick a strong password (save it in your password manager).
3. Click the verification link in the email they send.
4. **Turn on 2FA:** top-right avatar → **My Profile** → **Authentication** →
   *Two-Factor Authentication* → **Manage** → follow the prompts.
5. Create the token: **My Profile** → **API Tokens** → **Create Token** →
   scroll to **Custom token** → **Get started**.
   - **Token name:** `dealmosaic-deploy`
   - **Permissions:** `Account` · `Cloudflare Pages` · `Edit`
   - **Account Resources:** *Include* → your account
   - **TTL:** set an end date about 90 days away
   - **Continue to summary** → **Create Token**
6. **Copy the token now** — Cloudflare shows it only once. If you lose it, delete it
   and make another; nothing is damaged.
7. Also copy your **Account ID**: it is in the right-hand sidebar of the dashboard
   home page. *(This one is not a secret — it is just an identifier.)*

**Send me:** the token + the Account ID.

---

## Step 2 — Render (runs the API)

1. Open **render.com** → **Get Started** → sign up with GitHub or email.
2. Verify your email.
3. Turn on 2FA: **Account Settings** → **Security**.
4. Go to **Account Settings** → **API Keys** → **Create API Key**.
   - **Name:** `dealmosaic-deploy`
5. Copy the key.

⚠️ **Do not create a web service yourself.** I create it with the exact settings it
needs — creating it manually usually means deleting and redoing it.

**Send me:** the API key.

---

## Step 3 — Turso (the database)

1. Open **turso.tech** → **Sign up** (signing in with GitHub is the fastest route).
2. Verify your email.
3. Turn on 2FA if offered.
4. Create a token: **Settings** → **API Tokens** → **Create Token**.
   - **Name:** `dealmosaic-deploy`
5. Copy the token.

**Send me:** the token.

---

## Step 4 — Github (optional, 2 minutes, recommended)

This gives you an independent copy of the code off this machine, with full history.

1. **github.com** → new **private** repository called `dealmosaic`.
   Do not tick "add README" — it should start empty.
2. **Settings** → **Developer settings** → **Personal access tokens** →
   **Fine-grained tokens** → **Generate new token**.
   - **Repository access:** only `dealmosaic`
   - **Permissions** → **Repository permissions** → **Contents:** `Read and write`
   - **Expiration:** 90 days
3. Copy the token.

**Send me:** the token.

*Why bother:* if this machine were lost tomorrow, the code would still exist. It is
the cheapest insurance in the project.

---

## How to send the tokens

Paste them in the chat. That is fine and normal for this stage.

**Then I will tell you to rotate them once the site is live.** Rotation is one click
per service and takes 30 seconds — it means a leaked token from an old chat log is
worthless. I will walk you through it at the end.

If you would rather not paste them at all, say so and I will give you the alternative
(a local encrypted file you fill in yourself).

---

## When you are done

Just say **"tokens sent"** — or send them one at a time as you create them. I can start
on Cloudflare and Turso without waiting for Render.

I will then:
1. Test each token works (a bad token is caught before anything is created)
2. Create the database and load the catalogue
3. Refactor the data layer, keeping all 78 tests green
4. Deploy the API, then the website
5. Give you a live URL and smoke-test every page myself

---

## Questions you might have

**"What if I get stuck?"** Say so at any step and send me what you see. I will
diagnose it. None of these three is hard, and none of them can break the project.

**"Can I use a different email for different services?"** Use **one** email for all of
them. Using several makes account recovery a nightmare later.

**"What if a service asks for a card?"** None of the three should. If one does, **stop**
and tell me — that means a free-tier term changed, and I will find an alternative.
Do not enter card details.

**"Can I do this on my phone?"** Yes. The Cloudflare and Render dashboards work on
mobile, though they are easier on a laptop.

**"What about the Google Business Profile?"** Not now. It needs your business identity
and verification, and it only matters once the site is live on a real domain. We
revisit it after launch, as you said.
