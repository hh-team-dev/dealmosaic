import { Hono } from 'hono';
import { COUNTRIES, CURRENCIES, type PlatformSummary } from '@dealmosaic/core';
import { db } from '../db/index.js';
import type { AppBindings } from '../middleware/session.js';

export const metaRoutes = new Hono<AppBindings>();

metaRoutes.get('/countries', (c) =>
  c.json({
    countries: COUNTRIES,
    active: COUNTRIES.filter((x) => x.enabled).map((x) => x.code),
    note: 'DEALMOSAIC is launching in India. Other markets are present but disabled — they are never presented as available.',
  }),
);

metaRoutes.get('/currencies', (c) => c.json({ currencies: Object.values(CURRENCIES) }));

metaRoutes.get('/platforms', (c) => {
  const rows = db.prepare('SELECT * FROM platforms ORDER BY sort_order').all() as Array<{
    slug: string;
    name: string;
    kind: PlatformSummary['kind'];
    status: PlatformSummary['status'];
    status_note: string;
    delivery_promise: string | null;
    deep_link_template: string | null;
    affiliate: number;
  }>;
  const platforms: PlatformSummary[] = rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    status: r.status,
    statusNote: r.status_note,
    deliveryPromise: r.delivery_promise,
    deepLinkTemplate: r.deep_link_template,
    affiliate: Boolean(r.affiliate),
  }));
  return c.json({
    platforms,
    disclosure:
      'None of these platforms publishes an authorised price API. Prices shown for them will be community-reported and clearly labelled, or absent — never invented.',
  });
});
