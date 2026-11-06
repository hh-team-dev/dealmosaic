/**
 * DEALMOSAIC — Intelligent Product Image Matcher
 * ============================================
 * Assigns relevant, high-quality product images to deals based on:
 *   - Product name keywords
 *   - Merchant name
 *   - Category
 *   - Description
 *
 * Design principles:
 *   • Deterministic: same deal always gets same image (cacheable)
 *   • Diverse: avoids repetition across deals
 *   • Relevant: keyword matching finds the most appropriate image
 *   • Fast: O(1) lookup with pre-built keyword indexes
 *
 * Image sources:
 *   • AI-generated product photos (apps/web/public/images/products/)
 *   • User-uploaded category images (apps/web/public/images/categories/)
 *
 * All images are original AI artwork — no licensing issues, no scraped photos.
 */

import { createHash } from 'node:crypto';

/** Product image category keys — only categories with actual product images */
export type ProductImageCategory =
  | 'fashion'
  | 'electronics';

/** A single product image entry */
interface ProductImage {
  filename: string;
  url: string;
  keywords: string[];
  category: ProductImageCategory;
}

/**
 * Product image library — maps category to available images.
 * Only fashion and electronics have product images. Other categories
 * use category background images as fallback.
 */
const PRODUCT_IMAGES: Record<ProductImageCategory, ProductImage[]> = {
  fashion: [
    {
      filename: 'fashion-01.jpg',
      url: '/images/products/fashion-01.jpg',
      keywords: ['scarf', 'scarves', 'silk', 'accessories', 'sunglasses', 'handbag', 'bag', 'purse'],
      category: 'fashion',
    },
    {
      filename: 'fashion-02.jpg',
      url: '/images/products/fashion-02.jpg',
      keywords: ['clothing', 'clothes', 'tshirt', 't-shirt', 'dress', 'jacket', 'shirt', 'apparel', 'wear'],
      category: 'fashion',
    },
    {
      filename: 'fashion-03.jpg',
      url: '/images/products/fashion-03.jpg',
      keywords: ['jewelry', 'jewellery', 'bracelet', 'necklace', 'earring', 'ring', 'watch', 'accessory'],
      category: 'fashion',
    },
    {
      filename: 'fashion-04.jpg',
      url: '/images/products/fashion-04.jpg',
      keywords: ['shoes', 'footwear', 'sneaker', 'sandal', 'shoe', 'boot', 'foot'],
      category: 'fashion',
    },
    {
      filename: 'fashion-05.jpg',
      url: '/images/products/fashion-05.jpg',
      keywords: ['handbag', 'bag', 'wallet', 'clutch', 'leather', 'designer'],
      category: 'fashion',
    },
  ],
  electronics: [
    {
      filename: 'electronics-01.jpg',
      url: '/images/products/electronics-01.jpg',
      keywords: ['headphone', 'earphone', 'earbud', 'speaker', 'audio', 'sound', 'music'],
      category: 'electronics',
    },
    {
      filename: 'electronics-02.jpg',
      url: '/images/products/electronics-02.jpg',
      keywords: ['phone', 'smartphone', 'mobile', 'tablet', 'laptop', 'computer', 'device', 'gadget'],
      category: 'electronics',
    },
    {
      filename: 'electronics-03.jpg',
      url: '/images/products/electronics-03.jpg',
      keywords: ['gaming', 'game', 'controller', 'console', 'playstation', 'xbox', 'gaming'],
      category: 'electronics',
    },
    {
      filename: 'electronics-04.jpg',
      url: '/images/products/electronics-04.jpg',
      keywords: ['smartwatch', 'fitness', 'tracker', 'wearable', 'watch', 'health', 'sport'],
      category: 'electronics',
    },
    {
      filename: 'electronics-05.jpg',
      url: '/images/products/electronics-05.jpg',
      keywords: ['smart', 'home', 'automation', 'iot', 'camera', 'security', 'voice'],
      category: 'electronics',
    },
  ],
};

/**
 * Keyword index for fast lookup.
 * Maps keyword → list of (category, imageIndex) pairs.
 */
interface KeywordIndex {
  [keyword: string]: Array<{ category: ProductImageCategory; index: number }>;
}

function buildKeywordIndex(): KeywordIndex {
  const index: KeywordIndex = {};
  for (const [category, images] of Object.entries(PRODUCT_IMAGES)) {
    images.forEach((img, imgIndex) => {
      for (const keyword of img.keywords) {
        if (!index[keyword]) {
          index[keyword] = [];
        }
        index[keyword].push({ category: category as ProductImageCategory, index: imgIndex });
      }
    });
  }
  return index;
}

const KEYWORD_INDEX = buildKeywordIndex();

/**
 * Extract keywords from a deal's text fields.
 * Returns lowercase, deduplicated keywords.
 */
function extractKeywords(...texts: (string | undefined | null)[]): string[] {
  const keywords = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    const lower = text.toLowerCase();
    // Split on common delimiters and extract words
    const words = lower
      .split(/[^a-z0-9]+/i)
      .filter((w) => w.length > 2); // Skip very short words
    for (const word of words) {
      keywords.add(word);
    }
  }
  return Array.from(keywords);
}

/**
 * Select the best image for a deal.
 *
 * Algorithm:
 *   1. Check if the target category has product images
 *   2. If not, return category background image
 *   3. If yes, extract keywords from product name, merchant, category, description
 *   4. Score images by keyword match count
 *   5. Pick the best match deterministically using deal.id
 *   6. Return the image URL
 *
 * @param dealId - unique deal ID (for deterministic selection)
 * @param productName - product name
 * @param merchantName - merchant/store name
 * @param category - category slug
 * @param description - deal description
 * @returns URL to the best matching product image or category background
 */
export function selectProductImage(
  dealId: string,
  productName?: string | null,
  merchantName?: string | null,
  category?: string | null,
  description?: string | null,
): string {
  // Check if the target category has actual product images
  const targetCat = (category as ProductImageCategory) ?? 'other';
  const hasProductImages = PRODUCT_IMAGES[targetCat] && PRODUCT_IMAGES[targetCat].length > 0;

  // If the category has no product images, use category background image
  if (!hasProductImages) {
    return `/images/categories/${targetCat}.jpg`;
  }

  // Extract keywords from all deal fields
  const keywords = extractKeywords(productName, merchantName, category, description);

  // Score images by keyword match count
  const scores = new Map<string, number>();
  for (const keyword of keywords) {
    const matches = KEYWORD_INDEX[keyword];
    if (!matches) continue;
    for (const { category: cat, index } of matches) {
      const key = `${cat}-${index}`;
      scores.set(key, (scores.get(key) ?? 0) + 1);
    }
  }

  // Convert scores to sorted array (highest first)
  const ranked = Array.from(scores.entries())
    .map(([key, score]) => ({ key, score }))
    .sort((a, b) => b.score - a.score);

  // If we have matches, pick the best one deterministically
  if (ranked.length > 0) {
    // Group by score, pick from the top score group using deal.id
    const topScore = ranked[0]!.score;
    const topMatches = ranked.filter((r) => r.score === topScore);
    const chosen = topMatches[Math.abs(hashString(dealId)) % topMatches.length]!;
    const parts = chosen.key.split('-');
    const catKey = parts[0] as ProductImageCategory;
    const idx = parseInt(parts[1] ?? '0', 10);
    return PRODUCT_IMAGES[catKey]![idx]!.url;
  }

  // Fallback: use category-based selection from product images
  const catImages = PRODUCT_IMAGES[targetCat];
  if (catImages && catImages.length > 0) {
    const idx = Math.abs(hashString(dealId)) % catImages.length;
    return catImages[idx]!.url;
  }

  // Final fallback: use category background image
  return `/images/categories/${targetCat}.jpg`;
}

/**
 * Simple string hash for deterministic selection.
 */
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Get all available images for a category (for admin dashboard).
 */
export function getCategoryImages(category: ProductImageCategory): ProductImage[] {
  return PRODUCT_IMAGES[category] ?? [];
}

/**
 * Get all categories with their images (for admin dashboard).
 */
export function getAllImages(): Record<ProductImageCategory, ProductImage[]> {
  return PRODUCT_IMAGES;
}
