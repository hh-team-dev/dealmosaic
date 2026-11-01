# Email delivery — what it means and what you need to do

**For the owner. Cost: ₹0. Time: about 5 minutes.**

---

## 1. Why the site needs to send email at all

Right now, when someone creates an account, the site generates a confirmation
link — but it cannot deliver it, because there is no mail server. The link is
written to a private development log instead. That means:

- Registration works, but **nobody can confirm their email** unless you copy the
  link out of the log by hand.
- Password reset cannot work at all.
- The site is therefore not ready for real users, even though it looks finished.

Everything else on the site works. Email is the last thing standing between
"live" and "usable by a stranger".

---

## 2. Two ways to fix it — and which one you should use now

| | **Gmail (now)** | **Professional provider (later)** |
|---|---|---|
| Needs a domain? | ❌ No | ✅ Yes |
| Cost | ₹0 | ₹0 on free tiers |
| Setup time | 5 minutes | 1 hour, plus DNS records |
| Sends from | `hh.team.dev@gmail.com` | `hello@dealmosaic.in` |
| Daily limit | ~500 recipients | Resend 3,000/mo · Brevo 300/day |
| Deliverability | Good (Google signs it) | Better |

**Start with Gmail.** It works today, needs no domain and no payment, and the
free limit is far beyond anything you will send in the first months. Move to
Resend or Brevo the day you buy a domain — that is a config change, not a code
change.

---

## 3. Step-by-step: the Gmail App Password

An "App Password" is a 16-character password that works only for one app and can
be revoked without touching your real Google password. **You never send me your
Gmail password** — only this throwaway code.

1. Go to **myaccount.google.com** and sign in as `hh.team.dev@gmail.com`.
2. **Security** → turn on **2-Step Verification** if it is not already on.
   (App Passwords are impossible without it — this is a Google rule.)
3. Open **myaccount.google.com/apppasswords** directly.
4. **App name:** type `DealMosaic` → **Create**.
5. Google shows a 16-character code like `abcd efgh ijkl mnop`.
   **Copy it now** — it is shown once and never again. Spaces do not matter.

If the App Passwords page says the option is unavailable, 2-Step Verification is
not on yet. Go back to step 2.

---

## 4. Where to put it — do this yourself, not through me

**Paste it directly into Render.** This is better than sending it to me: the
credential then never exists in any chat log, and you can rotate it without
asking anyone.

1. Open **dashboard.render.com** → click the **dealmosaic-api** service.
2. Left sidebar → **Environment**.
3. **Add Environment Variable** — add these three, one at a time:

   | Key | Value |
   |---|---|
   | `SMTP_USER` | `hh.team.dev@gmail.com` |
   | `SMTP_PASS` | the 16-character app password (no spaces) |
   | `MAIL_FROM` | `hh.team.dev@gmail.com` |

4. Click **Save Changes**. Render redeploys automatically — about 2 minutes.
5. When I tell you it is done, I will test it by registering a throwaway address
   and confirming the mail actually arrives.

Defaults if you add nothing else: host `smtp.gmail.com`, port `587`, TLS on.
Those are the correct Gmail settings.

**Tell me only "email is configured"** — I do not need the password itself.

---

## 5. What I have built on the code side (done)

| Piece | What it does |
|---|---|
| `lib/mailer.ts` | Sends through SMTP. Reads credentials from environment variables only — never from code. |
| Outbox | Every message is written to the database **before** sending, so there is always a record even if delivery fails. |
| Delivery state | Each row records `sent_at` on success or `send_error` on failure. You can therefore prove whether an email went out. |
| Failure policy | **A dead mail server never blocks registration.** The error is logged and the user still gets their account. |
| Tests | 9 assertions, including "broken credentials fail softly" and "the password never appears in status output". |

Honest limitation: Gmail is not designed to be a bulk sender. At ~500
recipients/day it is fine for launch. If you ever email thousands of people in a
day, Google will throttle the account and you should move to Resend or Brevo with
a proper domain. That is a good problem to have, and it is a one-hour change.

---

## 6. The one-line summary

Enable 2-Step Verification on `hh.team.dev@gmail.com` → create an App Password →
paste three values into Render's Environment tab. That turns email on. Nothing
else in the project needs to change.
