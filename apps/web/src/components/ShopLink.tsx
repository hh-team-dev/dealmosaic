import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CouponView } from '../lib/coupons-api';
import { Icon } from './Icon';

/** One user gesture attempts to copy the code and opens the recorded network
 * link. Publisher tracking is preserved; a unique sub-id helps reconcile clicks.
 * Neither action auto-applies a code, makes it exclusive or guarantees attribution.
 * Clipboard permission failures must never prevent navigation. */
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
  const [opened, setOpened] = useState(false);
  async function onTap() {
    setOpened(true);
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
    <>
    <a
      className={`btn btn-primary shop-link${compact ? ' shop-link-sm' : ''}`}
      href={`/api/go/${coupon.id}?src=${encodeURIComponent(source)}`}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      onClick={() => void onTap()}
      aria-label={`Shop at ${coupon.platformName} in a new tab${coupon.code ? `, offer code ${coupon.code}` : ''}`}
    >
      {label ?? `Shop at ${coupon.platformName}`}
      <Icon name="external" size={14} />
    </a>
    {opened && <Link className="tiny store-link-help" to={`/store-link-help?offer=${encodeURIComponent(coupon.id)}`}>Store not opening? Keep your code & get help</Link>}
    </>
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
          <strong>Tap Shop at store.</strong> The store opens. If copying is blocked, long-press the code to copy it.
        </span>
      </li>
      <li>
        <span className="how-step">2</span>
        <span className="how-text">
          <strong>Add the item to the cart.</strong> Paste the code, if one is shown, in the coupon box at checkout.
        </span>
      </li>
      <li>
        <span className="how-step">3</span>
        <span className="how-text">
          <strong>Check your final saving.</strong> Confirm the code is accepted, then check delivery, taxes and exclusions before you pay.
        </span>
      </li>
    </ol>
  );
}
