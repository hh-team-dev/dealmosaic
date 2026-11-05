# 45 — Store-link recovery and the owner connection desk

**DealMosaic 2.7.1 · 5 November 2026 · website, installed PWA and classic website**

## 1. The short, plain-language answer

**Your phone failure is real.** The first investigation found 1,123 currently eligible offer rows, all using the same affiliate redirect host, `linksredirect.com`. Different stores can therefore fail at the same shared step. The phone showed `DNS_PROBE_FINISHED_NXDOMAIN`; another screenshot showed a blank first-party redirect page. Server-side and Google/Cloudflare DNS queries resolved the domain. That does not prove it resolves through the phone’s connection, identify a particular VPN/filter, or prove that checkout tracking works.

**The recovery route is now separate from the earning route.** Where the imported campaign domain agrees with the link’s embedded merchant destination, the shopper can open the merchant homepage directly. This does not replace the sponsored button or secretly switch destinations. It avoids our network redirect, may lose affiliate-only benefits, and must not be counted as an affiliate visit or assumed to earn commission. The advertised item may need to be found again. The merchant still decides whether the code works.

**The hotel section is not a live hotel comparison engine.** It currently helps customers find curated places, inspect available provider promotions, compare quotes they enter themselves, plan a trip budget and prepare questions. It does not combine live Agoda, Booking.com or Skyscanner property availability and room prices. The existing 40 hotel and 33 dining records, plus the separate pet-friendly directory, are sourced records, not proof of supplier API access or bookable room inventory.

**How hotels could earn:** customer follows an approved tracked promotion → completes the qualifying booking/event with the provider → the network validates it → DealMosaic receives the approved commission. Opening a directory record, using the planner or following an ordinary venue link does not automatically pay. No new payable hotel click programme or direct venue-fee agreement was activated in this release. There is no defensible monthly rupee forecast without real eligible traffic, conversion, validation and net payout data.

**What the requested hotel experience still needs:** authorised hotel content and rate access, agreed zero-cost terms, a working adapter and any required certification; then native property results, correctly matched room/occupancy/cancellation/tax comparisons and returned tracked links to the provider’s checkout. A second authorised supplier is needed for genuine cross-provider comparisons. More planning tools are not a substitute for these connections.

## 2. What changed for shoppers

- Homepage cards, offer lists, search offer matches and newly saved offers receive the same server-validated merchant-homepage field.
- “Store not opening? Open its homepage” is available before a failed affiliate attempt, wherever that direct destination is confirmed. An absent or mismatched campaign domain does not produce a guessed replacement.
- The recovery page preserves a valid offer’s code and conditions, explains the two routes and provides separate sponsored retry and direct-homepage links. Rejected, expired and future offers do not expose their code or destination through this endpoint.
- Saved items created before this field existed retain a link to current offer details; they do not gain an invented merchant address. Offline saved items do not advertise an online action as available.
- The original affiliate link and publisher parameters are retained. Direct links do not pass through the affiliate-click logging endpoint. No automatic clicks, new tabs, host substitution, proxy tracking or security-disabling advice was introduced.

### Application-side blank-page safeguards

The click-record database insert now has an actual **800 ms wait limit**. Previously its comment promised a short limit, but the code awaited it without one. A slow analytics write must not hold up an otherwise valid redirect. A sub-ID helps reconcile attempts; it is not a guarantee of payment or a universal prerequisite for publisher attribution.

The deployed Cloudflare Pages proxy explicitly uses **manual redirect mode**. Redirects are returned to the shopper’s browser, not followed by the edge server. A store-link upstream failure or 12-second wait limit returns a readable recovery document, not a blank document. Other API failures return a clear JSON error. Request bodies, authentication headers and response cookies are preserved.

These are application hardening changes, **not proof that either caused the phone’s DNS error**. Cross-origin browser failures cannot be reliably detected by the originating page. We cannot claim that all sponsored clicks now work on the owner’s phone.

## 3. Where the owner should look

Open **Admin → Connections**, or visit:

https://dealmosaic.pages.dev/admin?tab=connections

The desk has three clearly separated sections:

1. **APIs & tie-ups:** configured affiliate/data connectors, unconnected native product/grocery APIs, hotel inventory providers, dining, the own shop and operational services. Configuration is distinguished from healthy access and a signed partnership. Credentials and banking details are not exposed.
2. **Campaign access:** cached worldwide open access, the subset listing India, pending, not-applied and unknown access. These are not earnings or blanket placement permissions. The stored cache is primarily CPS, not the full CPC catalogue. Explicit links open live network inventory and the live CPC view with country/event rules; no zero-CPC-income conclusion is drawn from an incomplete cache.
3. **Published offers:** campaigns with currently eligible offer rows, their offer counts, and the smaller selection actually chosen for homepage shelves. The homepage count uses the same shelf builder as the customer page. Public caching and duplicate-code filters can explain small differences between snapshots and displayed cards.

Categories stay separate: products/online shopping; grocery/FMCG/quick commerce; hotels; dining/QSR/food delivery; other travel/experiences; and other/unclassified services. Classification uses stored network categories, explicit hotel/dining source or name rules, then imported offer categories. The basis is visible per campaign. A name-based classification is not supplier approval. Unclear cases stay separate rather than being invented.

Search by campaign name, domain or ID, combine category/access/country/publication filters, and page through the results. Each row shows its last stored access check, country evidence, published rows, homepage cards and direct-fallback coverage. “View public offers” opens an internal listing without generating an affiliate click.

The desk also shows which redirect hosts published offers depend on. **A recorded outbound attempt is not a confirmed store arrival, completed sale or approved earning.** Trivago campaign 2516 retains the explicit placement-permission warning; no programme was activated merely because its cached access says open.

## 4. Data and safety boundaries

- Two additive nullable cache columns retain network-provided categories and country codes. NULL means not read, not worldwide eligibility. Old application releases can still read the table.
- Routine campaign refreshes read up to 500 rows per request, with the existing throttle between pages. A page-limit stop is reported as incomplete. This avoids a slow one-request-per-small-page refresh without ignoring network limits.
- The explicit cache-maintenance script reads campaign metadata and updates only the campaign cache. It does not import the app, run the daily mail job, apply to campaigns, modify offers, place orders or follow links. The script refuses unintended local/test execution and requires an explicit production maintenance flag.
- Reading the owner desk performs database reads only. It does not ping affiliate URLs or produce “test” clicks. Admin authentication remains enforced on the server; regular users and anonymous visitors are denied.
- Direct fallback requires a public merchant origin, a matching embedded merchant destination, safe schemes and no userinfo/ports. It strips product paths, queries and fragments rather than carrying unknown affiliate parameters into a supposed direct route. It never trusts a visitor-supplied URL.
- The three phone screenshots were visually reviewed and deleted. Their hashes and textual findings remain; no screenshot copies are included in the release.

## 5. Validation and recovery

Unit, browser, production and release receipts are stored under `docs/source/` with the prefix `2026-11-05-click-repair-`. They distinguish local simulated redirects from read-only production checks and do not claim physical-device success.

Tests cover domain/destination validation, protected owner reads, category/country persistence, approval versus publication, direct-link reads without click records, a stuck analytics write, manual edge redirects, readable upstream-failure recovery, preserved request bodies/cookies, mobile layout, saved offers and owner filtering/retry. Existing shopping, hospitality, planner, account, notification and PWA suites are retained.

Both website flavours are packaged from the same runtime revision under `releases/dealmosaic-2.7.1/`. Exact deployment IDs and hashes are in the release receipts. Document 28 records the source backup and Git recovery chain; older recovery files are retained.

### Remaining phone check — not waived by automated tests

After the update, inspect one sponsored offer link and its direct-homepage alternative. If the sponsored link still reports NXDOMAIN, identify the trusted network/VPN/private-DNS service in use; do not disable device security or install an unknown app. The key/VPN icon alone is not a diagnosis. A network-approved alternate link path would need confirmation, including its downstream hosts and attribution. Do not replace `linksredirect.com` with a similar-looking hostname or assume a short URL avoids the same failing host.

Official Cuelinks documentation describes optional `clnk.in` short URLs, but that is not proof of an independent redirect chain or a solution to this phone’s failure: https://developers.cuelinks.com/docs . No shortened-link substitution was activated.
