# DEALMOSAIC

> **NEW DEVELOPER? START HERE → [`docs/00-MASTER-HANDOVER.md`](docs/00-MASTER-HANDOVER.md)**
> One document connecting the concept, the architecture, the live systems, every
> bug found, what is blocked on a human, and exactly what to do next. Written so
> you can continue without asking a question.



**One search. Three real deals. Zero price surprises.**

A price-comparison product for India. Search a product → we resolve the exact
variant → query every *authorised* retailer connector → compute a comparable,
itemised landed total → rank at most three offers and explain exactly why each one
sits where it does.

> **Current state: PHASE 2 COMPLETE and running.** 78 tests passing, 33 design
> assertions passing, production build clean, live in a dev environment.
> Next: Phase 3 (real connector data).

---

## Start here

| Read | Why |
|---|---|
| **[`docs/15-project-handover.md`](docs/15-project-handover.md)** | **The complete handover.** Everything a new developer needs — concept, architecture, decisions, known issues, exact next steps. Start here. |
| [`docs/16-owner-credentials-register.md`](docs/16-owner-credentials-register.md) | The **private** owner register: accounts, ownership, access. No secrets in it — the encrypted vault is separate. |
| [`docs/DEALMOSAIC-STRATEGY.html`](docs/DEALMOSAIC-STRATEGY.html) | The original strategy dossier (visual, printable) |
| [`docs/00-executive-summary.md`](docs/00-executive-summary.md) | Charter, feasibility verdict, decisions taken |
| [`docs/13-phase2-report.md`](docs/13-phase2-report.md) | What Phase 2 built, and the 10 defects verification caught |
| [`docs/14-seo-launch-checklist.md`](docs/14-seo-launch-checklist.md) | SEO: done in code vs. what only the owner can do |
| [`docs/source/MASTER_BUILD_PROMPT.txt`](docs/source/MASTER_BUILD_PROMPT.txt) | The original brief, archived verbatim |

The full strategy pack (`docs/00`–`docs/11`) covers research, connector
feasibility, architecture, the design system, the data model, the roadmap, the test
strategy, the zero-cost ledger, risks, Indian quick commerce, and the owner setup
guide.

## Quick start

```bash
npm install
npm run dev      # API :8787 · website :5173
npm test         # 78 tests
npm run check    # tests + no-black / WCAG design audit
npm run build    # generates sitemap, robots, llms.txt, then builds the web app
```

## Backup, handover and credentials

```bash
npm run backup           # timestamped archive + SHA-256 manifest → backups/
npm run backup:list      # list existing backups
npm run vault:init       # create the encrypted owner secrets vault (passphrase on stdin)
npm run vault:edit       # decrypt → edit → re-encrypt
```

- **`backups/`** — self-contained archives of the whole project. All source,
  config, docs and assets. `node_modules` and build output excluded, and
  reconstructible with `npm install` + `npm run build`.
- **`secrets/`** — the encrypted credentials vault. Plaintext never touches disk.
  See [`docs/16-owner-credentials-register.md`](docs/16-owner-credentials-register.md).

## The three things to know before reading anything else

1. **Zero cost holds.** Every component is free-tier or open-source; nothing
   auto-upgrades and no payment method is configured.
2. **Live Indian retail prices cannot be free or legal right now.** Amazon's API
   needs 10 qualifying sales/30 days; Flipkart has paused affiliate sign-ups since
   2018; the rest publish no authorised API. So we ship a **watermarked demo
   connector** and a **live-capable eBay connector** that stays disabled until keys
   are supplied. Nothing demo is ever presented as live.
3. **No black, anywhere.** Mosaic Plum `#452B5E` replaces near-black, and the eight
   accents ship in dual tones because six fail WCAG AA as text. Machine-enforced by
   `npm run audit:design`.

## Repository layout

```
dealmosaic/
├── apps/api        Hono + Node · SQLite · routes, services, connectors, db
├── apps/web        React 19 + TS + Vite · design tokens, components, routes
├── packages/core   money · matching · ranking · countries (zero-dependency, tested)
├── scripts         dev, design audit, SEO generator, backup, vault
├── docs            00–16 documentation pack + screenshots + source brief
├── backups         generated archives (git-ignored)
└── secrets         encrypted vault only (git-ignored)
```

## Owner action list

Full instructions: [`docs/11-owner-setup-guide.md`](docs/11-owner-setup-guide.md)
and [`docs/14-seo-launch-checklist.md`](docs/14-seo-launch-checklist.md).

- [ ] eBay Developers Program keyset → `EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET`
      *(unblocks the only free, legal live price source today)*
- [ ] Domain registration (e.g. `dealmosaic.in`)
- [ ] Cloudflare (or Netlify) free account → deploy the web app
- [ ] Google Search Console + Bing Webmaster → submit `sitemap.xml`
- [ ] Udyam registration (free) → for Google Business Profile eligibility
- [ ] Decide on PostgreSQL hosting when traffic justifies it

---

**Ownership:** all source code, documentation, data and assets in this repository
belong to the project owner. Nothing is escrowed, licensed back, or held by a
third party. `docs/15-project-handover.md` §13 lists the few items that live outside
the repository and how to transfer each one.
