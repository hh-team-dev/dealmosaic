/**
 * DEALMOSAIC — Admin: Coupon Image Bank
 * ====================================
 * Admin manages the image bank: upload images, assign them to coupon
 * categories, set defaults per category, and reorder.
 *
 * All routes require admin authentication (mounted behind requireAdmin in
 * admin.ts). Read-only for non-admins is handled by the public routes below.
 */

import { Hono } from 'hono';
import { db, newId, nowIso } from '../db/index.js';
import type { AppBindings } from '../middleware/session.js';
import { requireAdmin, requireUser } from '../middleware/session.js';
import { createRateLimiter } from '../lib/rate-limit.js';
import { couponImageDataUrl } from '../lib/coupon-images.js';

type ImageRow = {
  id: string;
  category_slug: string;
  image_url: string;
  image_type: string;
  alt_text: string | null;
  sort_order: number;
  is_default: number;
  uploaded_by: string | null;
  created_at: string;
};

export const adminCouponImageRoutes = new Hono<AppBindings>();

const uploadLimiter = createRateLimiter({
  name: 'coupon-image-upload',
  windowMs: 60_000,
  max: 20,
});

/**
 * GET /api/admin/coupon-images
 * List all images in the bank, grouped by category.
 */
adminCouponImageRoutes.get('/', requireUser, requireAdmin, async (c) => {
  const result = await db
    .prepare(
      `SELECT id, category_slug, image_url, image_type, alt_text,
              sort_order, is_default, uploaded_by, created_at
         FROM coupon_images
        ORDER BY category_slug, sort_order ASC, created_at DESC`
    )
    .all();
  const rows = result as unknown as ImageRow[];

  // Group by category for the admin UI.
  const byCategory = new Map<string, Array<typeof rows[0]>>();
  for (const row of rows) {
    const list = byCategory.get(row.category_slug) ?? [];
    list.push(row);
    byCategory.set(row.category_slug, list);
  }

  return c.json({
    categories: Array.from(byCategory.entries()).map(([slug, images]) => ({
      slug: slug,
      defaultImage: images.find((i) => i.is_default === 1) ?? null,
      images,
    })),
    total: rows.length,
  });
});

/**
 * POST /api/admin/coupon-images/generate
 * Generate the default SVG image for a category (if it doesn't exist yet).
 * Body: { categorySlug: string }
 */
adminCouponImageRoutes.post(
  '/generate',
  requireUser,
  requireAdmin,
  uploadLimiter,
  async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const categorySlug: string | undefined = body.categorySlug;
    if (!categorySlug || typeof categorySlug !== 'string') {
      return c.json(
        { error: { code: 'invalid_request', message: 'categorySlug is required' } },
        400,
      );
    }

    // Check if a default already exists for this category.
    const existing = (await db
      .prepare(
        'SELECT id FROM coupon_images WHERE category_slug = ? AND is_default = 1 LIMIT 1',
      )
      .get(categorySlug)) as { id: string } | undefined;
    if (existing) {
      return c.json({ ok: true, message: 'Default image already exists', id: existing.id });
    }

    const dataUrl = couponImageDataUrl(categorySlug);
    const id = newId();
    const now = nowIso();

    await db
      .prepare(
        `INSERT INTO coupon_images (id, category_slug, image_url, image_type, alt_text, sort_order, is_default, uploaded_by, created_at)
         VALUES (?, ?, ?, 'svg', ?, 0, 1, ?, ?)`,
      )
      .run(
        id,
        categorySlug,
        dataUrl,
        `Original artwork for ${categorySlug} deals`,
        c.get('user')?.id ?? null,
        now,
      );

    return c.json({ ok: true, id, imageUrl: dataUrl, categorySlug });
  },
);

/**
 * POST /api/admin/coupon-images/upload
 * Upload an image file for a category. Accepts image/jpeg, image/png, image/webp.
 * Max 500 KB per file.
 */
adminCouponImageRoutes.post(
  '/upload',
  requireUser,
  requireAdmin,
  uploadLimiter,
  async (c) => {
    const body = await c.req.parseBody();
    const file = body.file;
    const categorySlug = typeof body.categorySlug === 'string' ? body.categorySlug : '';
    const isDefault = body.isDefault === '1';

    if (!file || !(file instanceof File)) {
      return c.json(
        { error: { code: 'invalid_request', message: 'No file uploaded' } },
        400,
      );
    }
    if (!categorySlug) {
      return c.json(
        { error: { code: 'invalid_request', message: 'categorySlug is required' } },
        400,
      );
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      return c.json(
        {
          error: {
            code: 'invalid_request',
            message: `Unsupported image type: ${file.type}. Use JPEG, PNG or WebP.`,
          },
        },
        400,
      );
    }

    const maxBytes = 500 * 1024;
    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) {
      return c.json(
        {
          error: {
            code: 'invalid_request',
            message: `Image too large: ${Math.round(arrayBuffer.byteLength / 1024)} KB. Maximum 500 KB.`,
          },
        },
        400,
      );
    }

    // Convert to a data URL for storage (zero external dependencies, no S3).
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i] ?? 0);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:${file.type};base64,${base64}`;

    const id = newId();
    const now = nowIso();

    // If this is set as default, clear other defaults for this category.
    if (isDefault) {
      await db
        .prepare('UPDATE coupon_images SET is_default = 0 WHERE category_slug = ?')
        .run(categorySlug);
    }

    await db
      .prepare(
        `INSERT INTO coupon_images (id, category_slug, image_url, image_type, alt_text, sort_order, is_default, uploaded_by, created_at)
         VALUES (?, ?, ?, 'upload', ?, 0, ?, ?, ?)`,
      )
      .run(
        id,
        categorySlug,
        dataUrl,
        file.name || `${categorySlug} image`,
        isDefault ? 1 : 0,
        c.get('user')?.id ?? null,
        now,
      );

    return c.json({ ok: true, id, imageUrl: dataUrl, categorySlug, isDefault });
  },
);

/**
 * DELETE /api/admin/coupon-images/:id
 * Delete an image from the bank.
 */
adminCouponImageRoutes.delete(
  '/:id',
  requireUser,
  requireAdmin,
  async (c) => {
    const id = c.req.param('id');
    const result = await db.prepare('DELETE FROM coupon_images WHERE id = ?').run(id);
    if (result.changes === 0) {
      return c.json({ error: { code: 'not_found', message: 'Image not found' } }, 404);
    }
    return c.json({ ok: true, message: 'Image deleted' });
  },
);

/**
 * POST /api/admin/coupon-images/:id/default
 * Set an image as the default for its category (clears other defaults).
 */
adminCouponImageRoutes.post(
  '/:id/default',
  requireUser,
  requireAdmin,
  async (c) => {
    const id = c.req.param('id');
    const row = (await db
      .prepare('SELECT category_slug FROM coupon_images WHERE id = ?')
      .get(id)) as { category_slug: string } | undefined;
    if (!row) {
      return c.json({ error: { code: 'not_found', message: 'Image not found' } }, 404);
    }

    await db
      .prepare('UPDATE coupon_images SET is_default = 0 WHERE category_slug = ?')
      .run(row.category_slug);
    await db
      .prepare('UPDATE coupon_images SET is_default = 1 WHERE id = ?')
      .run(id);

    return c.json({ ok: true, message: 'Default image updated', categorySlug: row.category_slug });
  },
);

/**
 * POST /api/admin/coupon-images/:id/reorder
 * Change the sort order of an image within its category.
 * Body: { sortOrder: number }
 */
adminCouponImageRoutes.post(
  '/:id/reorder',
  requireUser,
  requireAdmin,
  async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const sortOrder = Number(String(body.sortOrder ?? ''));
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      return c.json(
        { error: { code: 'invalid_request', message: 'sortOrder must be a non-negative number' } },
        400,
      );
    }
    await db
      .prepare('UPDATE coupon_images SET sort_order = ? WHERE id = ?')
      .run(sortOrder, id);
    return c.json({ ok: true, sortOrder });
  },
);

/**
 * POST /api/admin/coupon-images/generate-all
 * Generate default SVG images for all known categories that don't have one yet.
 */
adminCouponImageRoutes.post(
  '/generate-all',
  requireUser,
  requireAdmin,
  uploadLimiter,
  async (c) => {
    const categories = [
      'fashion', 'electronics', 'beauty', 'food', 'sports', 'health', 'home',
      'baby', 'industrial', 'refurb', 'marketplace', 'travel', 'other',
    ];

    const created: Array<{ categorySlug: string; id: string }> = [];
    const skipped: string[] = [];

    for (const slug of categories) {
      const existing = (await db
        .prepare(
          'SELECT id FROM coupon_images WHERE category_slug = ? AND is_default = 1 LIMIT 1',
        )
        .get(slug)) as { id: string } | undefined;
      if (existing) {
        skipped.push(slug);
        continue;
      }

      const dataUrl = couponImageDataUrl(slug);
      const id = newId();
      const now = nowIso();

      await db
        .prepare(
          `INSERT INTO coupon_images (id, category_slug, image_url, image_type, alt_text, sort_order, is_default, uploaded_by, created_at)
           VALUES (?, ?, ?, 'svg', ?, 0, 1, ?, ?)`,
        )
        .run(
          id,
          slug,
          dataUrl,
          `Original artwork for ${slug} deals`,
          c.get('user')?.id ?? null,
          now,
        );
      created.push({ categorySlug: slug, id });
    }

    return c.json({
      ok: true,
      created,
      skipped,
      totalCategories: categories.length,
    });
  },
);
