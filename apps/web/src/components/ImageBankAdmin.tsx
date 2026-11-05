/**
 * DEALMOSAIC — Admin: Image Bank Manager
 * ======================================
 * Owner-facing UI for the coupon image bank: generate default SVGs per
 * category, upload custom images, set defaults, and reorder.
 *
 * Zero-cost principle: all default images are SVG artwork generated in code
 * (no stock photography, no paid assets, no scraped retailer images). Admin
 * uploads are optional extras, capped at 500 KB each.
 */

import { useCallback, useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useToast } from './Toast';

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

type CategoryGroup = {
  slug: string;
  defaultImage: ImageRow | null;
  images: ImageRow[];
};

export default function ImageBankAdmin() {
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/coupon-images', {
        headers: { 'cache-control': 'no-cache' },
      });
      if (!r.ok) throw new Error(`Server said ${r.status}`);
      const data = await r.json();
      setGroups(data.categories ?? []);
    } catch (e) {
      toast.push(
        `Could not load image bank: ${e instanceof Error ? e.message : String(e)}`,
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const generateAll = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/coupon-images/generate-all', {
        method: 'POST',
        headers: { 'cache-control': 'no-cache' },
      });
      if (!r.ok) throw new Error(`Server said ${r.status}`);
      const data = await r.json();
      toast.push(
        `Image bank ready: ${data.created.length} generated, ${data.skipped.length} already had defaults`,
        'success',
      );
      void load();
    } catch (e) {
      toast.push(
        `Generate failed: ${e instanceof Error ? e.message : String(e)}`,
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [load, toast]);

  const setDefault = useCallback(async (id: string, slug: string) => {
    try {
      const r = await fetch(`/api/admin/coupon-images/${id}/default`, {
        method: 'POST',
        headers: { 'cache-control': 'no-cache' },
      });
      if (!r.ok) throw new Error(`Server said ${r.status}`);
      toast.push('Default image updated', 'success');
      void load();
    } catch (e) {
      toast.push(
        `Update failed: ${e instanceof Error ? e.message : String(e)}`,
        'error',
      );
    }
  }, [load, toast]);

  const delImage = useCallback(async (id: string) => {
    if (!window.confirm('Delete this image from the bank?')) return;
    try {
      const r = await fetch(`/api/admin/coupon-images/${id}`, {
        method: 'DELETE',
        headers: { 'cache-control': 'no-cache' },
      });
      if (!r.ok) throw new Error(`Server said ${r.status}`);
      toast.push('Image deleted', 'success');
      void load();
    } catch (e) {
      toast.push(
        `Delete failed: ${e instanceof Error ? e.message : String(e)}`,
        'error',
      );
    }
  }, [load, toast]);

  const upload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, slug: string) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const form = new FormData();
      form.append('file', file);
      form.append('categorySlug', slug);
      setLoading(true);
      try {
        const r = await fetch('/api/admin/coupon-images/upload', {
          method: 'POST',
          body: form,
          headers: { 'cache-control': 'no-cache' },
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error?.message ?? `Server said ${r.status}`);
        }
        toast.push('Image uploaded', 'success');
        e.target.value = '';
        void load();
      } catch (err) {
        toast.push(
          `Upload failed: ${err instanceof Error ? err.message : String(err)}`,
          'error',
        );
      } finally {
        setLoading(false);
      }
    },
    [load, toast],
  );

  if (loading) {
    return (
      <div className="card card-lg" style={{ padding: 48, textAlign: 'center' }}>
        <Icon name="alert" size={32} />
        <p style={{ marginTop: 12 }}>Loading image bank…</p>
      </div>
    );
  }

  return (
    <div className="card card-lg">
      <div className="card-head">
        <h2 className="card-title">Image Bank</h2>
        <p className="card-sub">
          Original artwork for coupon categories. Every hue stays inside the
          DealMosaic warm palette — no blue, no black, no stock photos.
        </p>
      </div>

      <div className="card-body">
        <div className="row gap-2">
          <button
            className="button button-solid"
            onClick={generateAll}
            disabled={loading}
          >
            <Icon name="sparkle" size={14} /> Generate defaults for all categories
          </button>
        </div>

        {groups.length === 0 && (
          <p className="muted">
            No categories yet. Tap “Generate defaults…” above.
          </p>
        )}

        {groups.map((group) => (
          <section
            key={group.slug}
            className="image-bank-category"
            style={{ marginTop: 24 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <span className="image-bank-cat-label">
                {group.slug.charAt(0).toUpperCase() + group.slug.slice(1)}
              </span>
              <span className="muted small">
                ({group.images.length} image{group.images.length !== 1 ? 's' : ''})
              </span>
            </div>

            <div className="image-bank-grid">
              {group.images.map((img) => {
                const isDefault = img.is_default === 1;
                const isSvg = img.image_type === 'svg';
                return (
                  <div
                    key={img.id}
                    className={`image-bank-item${isDefault ? ' is-default' : ''}`}
                  >
                    <div className="image-bank-preview">
                      <img
                        src={img.image_url}
                        alt={img.alt_text ?? group.slug}
                      />
                      {isDefault && (
                        <span className="image-bank-default-badge">Default</span>
                      )}
                    </div>
                    <div className="image-bank-controls">
                      <button
                        className="button button-outline"
                        onClick={() => setDefault(img.id, group.slug)}
                        disabled={isDefault}
                      >
                        {isDefault ? 'Default ✓' : 'Set default'}
                      </button>
                      <button
                        className="button button-outline"
                        onClick={() => delImage(img.id)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                    <div className="image-bank-meta">
                      <div className="image-bank-type">{img.image_type}</div>
                      <div className="image-bank-alt">{img.alt_text ?? '—'}</div>
                    </div>
                  </div>
                );
              })}

              {/* Upload slot */}
              <div className="image-bank-item image-bank-upload">
                <label className="image-bank-upload-label">
                  <span>+</span>
                  <span>Add image for {group.slug}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => upload(e, group.slug)}
                    style={{ display: 'none' }}
                  />
                </label>
                <div className="image-bank-controls">
                  <button className="button button-outline" disabled>
                    Upload
                  </button>
                </div>
                <div className="image-bank-meta">
                  <div className="image-bank-type">upload</div>
                  <div className="image-bank-alt">Max 500 KB</div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
