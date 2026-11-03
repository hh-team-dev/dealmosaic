import type { CouponView } from '../lib/coupons-api';
import { Icon } from './Icon';

/**
 * THE BUTTON THAT PAYS FOR THE SITE.
 *
 * Before this existed, a coupon card offered exactly one action: copy the code.
 * The shopper copied it, left, pasted it at the merchant's checkout that they
 * opened themselves — and the sale was never attributed to DealMosaic, so it was
 * never paid for. Traffic without attribution is charity.
 *
 * So every card now has a second, primary action: **Shop at {store}**. It does two
 * things in one tap, in this order:
 *
 *   1. copies the code (best effort — a blocked clipboard must not stop the sale);
 *   2. opens `/api/go/{couponId}?src=…`, our own route, which mints a unique
 *      sub-id, records the click and forwards to the merchant through the
 *      affiliate network.
 *
 * The copy has to happen synchronously inside the tap, which is why it is a plain
 * `<a>` with an `onClick` rather than an async handler that redirects afterwards —
 * browsers only allow clipboard writes during a user gesture, and a redirect would
 * end the gesture.
 *
 * `rel="sponsored nofollow noopener noreferrer"` is not decoration: it is the
 * machine-readable version of the disclosure, and it is what Google asks for from
 * a page with paid links.
 */
export function ShopLink({
  coupon,
  source,
  compact = false,
  label,
}: {
  coupon: Pick<CouponView, 'id' | 'platformName' | 'code'>;
  source: string;
  compact?: boolean;
  label?: string;
}) {
  async function onTap() {
    if (!coupon.code) return;
    try {
      // Trimmed on purpose: a clipboard that pastes `NEW200 ` into a checkout
      // field is a bug the shopper has to work around.
      await navigator.clipboard.writeText(coupon.code.trim());
    } catch {
      // Clipboard refused (insecure context, permission). The code is on screen,
      // and the link still works, so nothing is lost.
    }
  }

  return (
    <a
      className={`btn btn-action shop-link${compact ? ' shop-link-sm' : ''}`}
      href={`/api/go/${coupon.id}?src=${encodeURIComponent(source)}`}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      onClick={() => void onTap()}
      aria-label={`Shop at ${coupon.platformName} in a new tab${coupon.code ? `, code ${coupon.code} copied` : ''}`}
    >
      {label ?? `Shop at ${coupon.platformName}`}
      <Icon name="external" size={14} />
    </a>
  );
}

/**
 * THREE STEPS, WRITTEN THE WAY A PERSON WOULD SAY THEM.
 *
 * The tour made it obvious that nothing on the page told a shopper what to do with
 * a copied code. This strip sits above the list on the deals page and above the
 * shelves on the home page, and it is deliberately three short sentences rather
 * than a paragraph — it has to be readable on a phone, by someone who is not a
 * confident English reader, in about four seconds.
 */
export function HowItWorks({ className = '' }: { className?: string }) {
  return (
    <ol className={`how-it-works ${className}`.trim()}>
      <li>
        <span className="how-step">1</span>
        <span className="how-text">
          <strong>Tap Shop at store.</strong> The code is copied for you, and the store opens.
        </span>
      </li>
      <li>
        <span className="how-step">2</span>
        <span className="how-text">
          <strong>Add the item to the cart.</strong> Paste the code in the coupon box at checkout.
        </span>
      </li>
      <li>
        <span className="how-step">3</span>
        <span className="how-text">
          <strong>Pay the lower price.</strong> We earn a small commission from the store — never from you.
        </span>
      </li>
    </ol>
  );
}
