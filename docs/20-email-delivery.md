# Email delivery — what it means and what you need to do

**For the owner. Cost: ₹0. Time: about 10 minutes.**

> **Correction (2 Nov 2026).** An earlier version of this document told you to use
> a Gmail App Password over SMTP. **That cannot work on Render's free tier.** Render
> has blocked outbound SMTP on ports 25, 465 and 587 since September 2025, so the
> connection dies during the TLS handshake, before any password is even checked.
> The failure looks like a mysterious timeout rather than a credentials problem.
> We found this by actually sending an email and reading the error, not by
> trusting the plan. The instructions below are the corrected ones.

---

## 1. Why the site needs to send email at all

When someone creates an account the site generates a confirmation link. Without a
mail provider it can only write that link to a private log, which means:

- Registration works, but **nobody can confirm their email** without you copying
  the link out by hand.
- Password reset cannot work at all.
- The site is not yet usable by a stranger, even though it looks finished.

Email is the last thing between "live" and "usable".

---

## 2. What was tried, and what the test showed

| Attempt | Result |
|---|---|
| Gmail SMTP, port 587 | ❌ `Connection timeout` from Render. Port blocked at the platform, not a password problem. |
| Gmail SMTP on port 2525 | ❌ Gmail does not listen on 2525 — that escape hatch only exists for some other relays. |
| **HTTPS API (Brevo / Resend)** | ✅ Works: ordinary outbound HTTPS on 443, unaffected by the block. |

The code now prefers an HTTPS provider automatically, and keeps SMTP for hosts
that permit it (such as running locally).

---

## 3. Which provider — Brevo, and why

| | **Brevo** | Resend |
|---|---|---|
| Free allowance | 300 emails/day | 3,000/month |
| Credit card | Not required | Not required |
| Needs a domain? | **No** — verify a single sender address by clicking a link | **Yes** — to send to anyone but yourself |
| Verdict | ✅ **Use this now** | ⏳ Use after you own a domain |

The deciding factor is the domain. Brevo will verify
`hh.team.dev@gmail.com` as a sender with a confirmation email. Resend insists on a
verified domain before it will deliver to third parties. Before the project owns a
domain, that difference is the whole ballgame.

---

## 4. Steps — Brevo (do this now)

1. Go to **brevo.com** → **Sign up free**. No card.
2. Verify your email address.
3. Top-right menu → **SMTP & API** → **API Keys** tab → **Generate a new API key**.
   - Name: `DealMosaic`
   - Copy the key. It starts with `xkeysib-`.
4. **Verify the sender** — this is the step people forget:
   - **Senders & IP** → **Senders** → **Add a sender**
   - From email: `hh.team.dev@gmail.com`, name: `DealMosaic`
   - Brevo emails you a confirmation link. **Click it.**
   - Until this is done, every send fails with "sender not verified".
5. Go to **dashboard.render.com** → `dealmosaic-api` → **Environment** → **+ Add variable**
   (the plain option, not the `⌄` menu):

   | KEY | VALUE |
   |---|---|
   | `BREVO_API_KEY` | `xkeysib-...` (the key from step 3) |
   | `MAIL_FROM` | `hh.team.dev@gmail.com` |

6. **Save, rebuild, and deploy.** About 2 minutes.

### Then delete the two Gmail values

You still have `SMTP_USER` and `SMTP_PASS` on Render from the earlier attempt.
They are harmless — the code prefers Brevo — but they are dead weight and an
unnecessary secret sitting in the account. Use the 🗑 icon to remove both.

---

## 5. Telling me it is done

Say **"Brevo is configured"**. I will then:

1. Register a throwaway account through the live API.
2. Check the outbox row for `sent_at` (proof of delivery) or `send_error`
   (proof of what went wrong).
3. Report the exact provider response if anything fails — Brevo's own error text
   names the real cause: unverified sender, bad key, quota.
4. Delete the test account afterwards.

---

## 6. What is built on the code side (done)

| Piece | What it does |
|---|---|
| `lib/mailer.ts` | Chooses Brevo → Resend → SMTP → none, automatically, from environment variables. Credentials never appear in code. |
| Outbox | Every message is written to the database **before** sending, so a record exists even if delivery fails. |
| Delivery state | `sent_at` on success, `send_error` on failure — delivery is provable, not assumed. |
| Failure policy | **A dead mail provider never blocks registration.** The user still gets their account; the error is logged. |
| Readable errors | A blocked SMTP port now says so explicitly, with the fix, instead of a bare timeout. |
| App-password tolerance | Spaces Google inserts (`abcd efgh ijkl mnop`) are stripped automatically. |
| Tests | 15 assertions, including "a rejected key returns a clear HTTP error without throwing" and "HTTPS is preferred over SMTP". |

---

## 7. Honest limits

- **Brevo free is 300 emails/day.** Fine for launch; a busy day of signups will
  not approach it.
- **Sending as a Gmail address works but is not ideal for a brand.** Once you buy
  `dealmosaic.in`, verify the domain in Brevo, send from `hello@dealmosaic.in`,
  and add SPF/DKIM. That improves deliverability and looks professional. It is a
  config change, not new code.
- **Do not use a free Gmail address for bulk mail.** Google throttles it and it
  damages sender reputation. Transactional trickle only — which is all this is.
