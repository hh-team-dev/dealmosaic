# Part 19 — Test Strategy & Acceptance Matrix

Automation: **Vitest** (unit + API integration against a temporary SQLite DB), **Playwright** (E2E, installed if browsers can be fetched in this environment; otherwise documented as a manual checklist with recorded evidence). Every test maps to a mandated item from Part 19 — nothing is skipped silently.

## Legend
`AUTO` = automated test · `MANUAL` = scripted manual check with evidence · `BLOCKED` = needs an external credential/approval; test exists and runs against the interface.

| # | Mandated test | Type | How it is proven |
|---|---|---|---|
| 1 | Registration + email verification | AUTO | Register → token issued → verify → `email_verified_at` set; unverified user cannot search |
| 2 | Login / logout | AUTO | Correct creds set session cookie; wrong creds 401 + generic message; logout revokes server-side and cookie cannot be replayed |
| 3 | Password reset | AUTO | Reset token single-use, expiry enforced, old password fails, new password works |
| 4 | Search authentication gate | AUTO + E2E | Anonymous `POST /api/search` → 401; UI shows gate screen, never results |
| 5 | Country selection | AUTO + E2E | Country change alters connector set, currency, and persisted preference |
| 6 | Universal mode | AUTO | `ZZ` returns multi-market offers, original + converted amounts, conversion date |
| 7 | Exact product search | AUTO | `"Samsung Galaxy S25 Ultra 512GB"` resolves one variant, offers ranked |
| 8 | Ambiguous product search | AUTO | `"Galaxy S25"` → `needsSelection` with 256/512/1TB candidates, no merged offers |
| 9 | Exact variant matching | AUTO | 512GB offer never matches a 256GB query; GTIN collision test; colour/edition split |
| 10 | Three-offer display | AUTO + E2E | Exactly 3 columns, ordering matches ranker output, podium order equals list order |
| 11 | 2-offer and 1-offer fallback | AUTO | Never padded; UI shows an explanatory "only N verified offers" note |
| 12 | Price-breakdown calculation | AUTO | Known total = item + shipping + tax + fees − confirmed discounts (integer minor units, property-tested) |
| 13 | Unknown shipping/tax display | AUTO | `NULL` renders "Not available" + `TOTAL NOT FULLY VERIFIED`; never `0`, never counted as cheapest |
| 14 | Currency conversion | AUTO | Frankfurter rate applied with rate date; converted ≠ payable labelling; no rate → falls back to original with notice |
| 15 | Product vs seller rating distinction | AUTO + E2E | Separate DOM nodes, separate labels, separate aria-labels; test asserts they are never merged |
| 16 | Affiliate link redirection | AUTO | `/api/out/:id` 302s to the resolved URL, logs the click with `data_origin`, refuses unknown/expired offers |
| 17 | Reward eligibility controls | AUTO | Amazon purchase rewards cannot be enabled; rate changes flow from `reward_policy_rules`, not code |
| 18 | Watchlist | AUTO | Add/remove idempotent; per-user isolation; XP awarded once |
| 19 | Price alerts | AUTO | Alert triggers only on genuine drop below target; notification created; no duplicate triggers |
| 20 | Privacy & account deletion | AUTO | Export returns user data; delete cascades all user rows; sessions revoked; email reusable after deletion |
| 21 | Administrator access | AUTO | Non-admin 403 on every `/api/admin/*`; role checked server-side; audit log row written |
| 22 | Product correction reporting | AUTO | Report created, XP awarded once, appears in admin queue, status transitions audited |
| 23 | Mobile responsiveness | E2E + MANUAL | 360/390/414/768/1024/1440/1920 screenshots; no horizontal scroll; comparison usable by swipe |
| 24 | Reduced-motion accessibility | MANUAL + AUTO | `prefers-reduced-motion: reduce` disables loops/confetti/parallax; DOM check for `data-motion="reduced"` |
| 25 | API failures | AUTO | Connector 500 / timeout / 429 / malformed JSON → partial results or honest error; never a crash |
| 26 | Stale-price handling | AUTO | Freshness buckets decay confidence and ranking; UI shows last-checked + stale warning |
| 27 | Rate limiting | AUTO | Auth endpoints 429 after N attempts with `Retry-After`; search limit separate and generous |
| 28 | Cross-user data isolation | AUTO | User B cannot read/update/delete User A's watchlist, alerts, XP, tickets, sessions |

## Additional engineering tests (self-imposed)
- **Commission-blind ranking:** running the ranker with affiliate rates permuted must produce identical order.
- **Money invariants:** property test — total in minor units equals sum of parts; no float drift; rounding applied once at display.
- **Demo watermark:** rendering any offer with `dataOrigin='demo'` mounts the watermark (component-level assertion).
- **Connector contract suite:** each connector must satisfy the shared `RetailerConnector` contract (shape, null-handling, error envelope).
- **Secret scan:** build fails if a key-like pattern appears in the client bundle.
- **Migration integrity:** migrations run forward from empty DB, twice (idempotent).
- **XSS:** user-supplied display name, search query and report body are escaped everywhere they render.
- **A11y contrast token test:** asserts every text token pair ≥4.5:1 and no token is near-black (`L* < 8`).

## Definition of Done (every feature)
1. Works on mobile 360 px and desktop 1920 px. 2. Keyboard reachable with visible focus. 3. Loading, empty, error and success states designed. 4. Server-side authorisation verified. 5. Unit/integration tests written and green. 6. Data provenance displayed honestly. 7. No console errors. 8. Documented in the feature-status table.
