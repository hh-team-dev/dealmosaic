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

/** Product image category keys */
export type ProductImageCategory =
  | 'fashion' | 'electronics' | 'beauty' | 'food' | 'sports'
  | 'health' | 'home' | 'baby' | 'industrial' | 'refurb'
  | 'marketplace' | 'travel' | 'other';

/** A single product image entry */
interface ProductImage {
  filename: string;
  url: string;
  keywords: string[];
  category: ProductImageCategory;
}

/**
 * Product image library — maps category to available images.
 * Each category has multiple images to avoid repetition.
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
  beauty: [
    {
      filename: 'beauty-01.jpg',
      url: '/images/products/beauty-01.jpg',
      keywords: ['cosmetic', 'makeup', 'lipstick', 'nail', 'polish', 'beauty', 'glam'],
      category: 'beauty',
    },
    {
      filename: 'beauty-02.jpg',
      url: '/images/products/beauty-02.jpg',
      keywords: ['skincare', 'skin', 'cream', 'serum', 'mask', 'face', 'moisturizer'],
      category: 'beauty',
    },
    {
      filename: 'beauty-03.jpg',
      url: '/images/products/beauty-03.jpg',
      keywords: ['hair', 'shampoo', 'conditioner', 'oil', 'treatment', 'haircare'],
      category: 'beauty',
    },
    {
      filename: 'beauty-04.jpg',
      url: '/images/products/beauty-04.jpg',
      keywords: ['perfume', 'fragrance', 'cologne', 'scent', 'deodorant', 'perfume'],
      category: 'beauty',
    },
    {
      filename: 'beauty-05.jpg',
      url: '/images/products/beauty-05.jpg',
      keywords: ['personal', 'care', 'soap', 'lotion', 'hygiene', 'grooming'],
      category: 'beauty',
    },
  ],
  food: [
    {
      filename: 'food-01.jpg',
      url: '/images/products/food-01.jpg',
      keywords: ['snack', 'chips', 'cookie', 'biscuit', 'candy', 'sweet', 'treat'],
      category: 'food',
    },
    {
      filename: 'food-02.jpg',
      url: '/images/products/food-02.jpg',
      keywords: ['drink', 'beverage', 'tea', 'coffee', 'juice', 'cold', 'drink'],
      category: 'food',
    },
    {
      filename: 'food-03.jpg',
      url: '/images/products/food-03.jpg',
      keywords: ['grocery', 'staple', 'rice', 'wheat', 'flour', 'oil', 'cooking'],
      category: 'food',
    },
    {
      filename: 'food-04.jpg',
      url: '/images/products/food-04.jpg',
      keywords: ['fruit', 'vegetable', 'fresh', 'organic', 'produce', 'natural'],
      category: 'food',
    },
    {
      filename: 'food-05.jpg',
      url: '/images/products/food-05.jpg',
      keywords: ['instant', 'noodle', 'pasta', 'ready', 'meal', 'convenience'],
      category: 'food',
    },
  ],
  sports: [
    {
      filename: 'sports-01.jpg',
      url: '/images/products/sports-01.jpg',
      keywords: ['yoga', 'mat', 'exercise', 'fitness', 'workout', 'gym', 'pilates'],
      category: 'sports',
    },
    {
      filename: 'sports-02.jpg',
      url: '/images/products/sports-02.jpg',
      keywords: ['cricket', 'bat', 'ball', 'bat', 'sport', 'game'],
      category: 'sports',
    },
    {
      filename: 'sports-03.jpg',
      url: '/images/products/sports-03.jpg',
      keywords: ['football', 'soccer', 'ball', 'sport', 'game', 'match'],
      category: 'sports',
    },
    {
      filename: 'sports-04.jpg',
      url: '/images/products/sports-04.jpg',
      keywords: ['badminton', 'racket', 'shuttle', 'sport', 'game'],
      category: 'sports',
    },
    {
      filename: 'sports-05.jpg',
      url: '/images/products/sports-05.jpg',
      keywords: ['swimming', 'swim', 'pool', 'water', 'sport', 'aqua'],
      category: 'sports',
    },
  ],
  health: [
    {
      filename: 'health-01.jpg',
      url: '/images/products/health-01.jpg',
      keywords: ['vitamin', 'supplement', 'health', 'wellness', 'nutrition', 'nutri'],
      category: 'health',
    },
    {
      filename: 'health-02.jpg',
      url: '/images/products/health-02.jpg',
      keywords: ['medicine', 'drug', 'tablet', 'capsule', 'pharmacy', 'treatment'],
      category: 'health',
    },
    {
      filename: 'health-03.jpg',
      url: '/images/products/health-03.jpg',
      keywords: ['protein', 'powder', 'shake', 'muscle', 'bodybuilding', 'fitness'],
      category: 'health',
    },
    {
      filename: 'health-04.jpg',
      url: '/images/products/health-04.jpg',
      keywords: ['ayurveda', 'herbal', 'natural', 'remedy', 'traditional', 'organic'],
      category: 'health',
    },
    {
      filename: 'health-05.jpg',
      url: '/images/products/health-05.jpg',
      keywords: ['care', 'support', 'brace', 'support', 'compression', 'medical'],
      category: 'health',
    },
  ],
  home: [
    {
      filename: 'home-01.jpg',
      url: '/images/products/home-01.jpg',
      keywords: ['furniture', 'chair', 'table', 'sofa', 'couch', 'decor', 'home'],
      category: 'home',
    },
    {
      filename: 'home-02.jpg',
      url: '/images/products/home-02.jpg',
      keywords: ['kitchen', 'cookware', 'utensil', 'pot', 'pan', 'cooking', 'appliance'],
      category: 'home',
    },
    {
      filename: 'home-03.jpg',
      url: '/images/products/home-03.jpg',
      keywords: ['cleaning', 'cleaner', 'detergent', 'wash', 'soap', 'hygiene'],
      category: 'home',
    },
    {
      filename: 'home-04.jpg',
      url: '/images/products/home-04.jpg',
      keywords: ['decor', 'decoration', 'art', 'painting', 'frame', 'wall', 'design'],
      category: 'home',
    },
    {
      filename: 'home-05.jpg',
      url: '/images/products/home-05.jpg',
      keywords: ['storage', 'organizer', 'box', 'container', 'rack', 'shelf'],
      category: 'home',
    },
  ],
  baby: [
    {
      filename: 'baby-01.jpg',
      url: '/images/products/baby-01.jpg',
      keywords: ['baby', 'infant', 'child', 'kid', 'toddler', 'baby'],
      category: 'baby',
    },
    {
      filename: 'baby-02.jpg',
      url: '/images/products/baby-02.jpg',
      keywords: ['diaper', 'nappy', 'baby', 'care', 'hygiene', 'infant'],
      category: 'baby',
    },
    {
      filename: 'baby-03.jpg',
      url: '/images/products/baby-03.jpg',
      keywords: ['toy', 'game', 'play', 'child', 'kid', 'baby'],
      category: 'baby',
    },
    {
      filename: 'baby-04.jpg',
      url: '/images/products/baby-04.jpg',
      keywords: ['feeding', 'bottle', 'milk', 'food', 'baby', 'infant'],
      category: 'baby',
    },
    {
      filename: 'baby-05.jpg',
      url: '/images/products/baby-05.jpg',
      keywords: ['clothing', 'dress', 'suit', 'baby', 'kid', 'child'],
      category: 'baby',
    },
  ],
  industrial: [
    {
      filename: 'industrial-01.jpg',
      url: '/images/products/industrial-01.jpg',
      keywords: ['tool', 'tools', 'hardware', 'equipment', 'industrial', 'work'],
      category: 'industrial',
    },
    {
      filename: 'industrial-02.jpg',
      url: '/images/products/industrial-02.jpg',
      keywords: ['safety', 'helmet', 'vest', 'protective', 'work', 'industrial'],
      category: 'industrial',
    },
    {
      filename: 'industrial-03.jpg',
      url: '/images/products/industrial-03.jpg',
      keywords: ['power', 'drill', 'tool', 'electric', 'equipment', 'machine'],
      category: 'industrial',
    },
    {
      filename: 'industrial-04.jpg',
      url: '/images/products/industrial-04.jpg',
      keywords: ['plumbing', 'pipe', 'fitting', 'tool', 'equipment', 'industrial'],
      category: 'industrial',
    },
    {
      filename: 'industrial-05.jpg',
      url: '/images/products/industrial-05.jpg',
      keywords: ['welding', 'soldering', 'metal', 'work', 'tool', 'equipment'],
      category: 'industrial',
    },
  ],
  refurb: [
    {
      filename: 'refurb-01.jpg',
      url: '/images/products/refurb-01.jpg',
      keywords: ['refurbished', 'refurb', 'renewed', 'used', 'second', 'hand'],
      category: 'refurb',
    },
    {
      filename: 'refurb-02.jpg',
      url: '/images/products/refurb-02.jpg',
      keywords: ['open', 'box', 'sealed', 'return', 'exchange', 'renewed'],
      category: 'refurb',
    },
    {
      filename: 'refurb-03.jpg',
      url: '/images/products/refurb-03.jpg',
      keywords: ['discount', 'deal', 'offer', 'save', 'cheap', 'budget'],
      category: 'refurb',
    },
    {
      filename: 'refurb-04.jpg',
      url: '/images/products/refurb-04.jpg',
      keywords: ['quality', 'tested', 'verified', 'checked', 'approved'],
      category: 'refurb',
    },
    {
      filename: 'refurb-05.jpg',
      url: '/images/products/refurb-05.jpg',
      keywords: ['warranty', 'guarantee', 'protection', 'coverage', 'insurance'],
      category: 'refurb',
    },
  ],
  marketplace: [
    {
      filename: 'marketplace-01.jpg',
      url: '/images/products/marketplace-01.jpg',
      keywords: ['market', 'general', 'merchandise', 'goods', 'products', 'shop'],
      category: 'marketplace',
    },
    {
      filename: 'marketplace-02.jpg',
      url: '/images/products/marketplace-02.jpg',
      keywords: ['variety', 'mixed', 'diverse', 'collection', 'assortment'],
      category: 'marketplace',
    },
    {
      filename: 'marketplace-03.jpg',
      url: '/images/products/marketplace-03.jpg',
      keywords: ['everyday', 'essential', 'daily', 'household', 'needs'],
      category: 'marketplace',
    },
    {
      filename: 'marketplace-04.jpg',
      url: '/images/products/marketplace-04.jpg',
      keywords: ['sale', 'offer', 'deal', 'discount', 'promotion', 'save'],
      category: 'marketplace',
    },
    {
      filename: 'marketplace-05.jpg',
      url: '/images/products/marketplace-05.jpg',
      keywords: ['new', 'arrival', 'fresh', 'latest', 'trending', 'popular'],
      category: 'marketplace',
    },
  ],
  travel: [
    {
      filename: 'travel-01.jpg',
      url: '/images/products/travel-01.jpg',
      keywords: ['luggage', 'bag', 'suitcase', 'travel', 'trip', 'journey'],
      category: 'travel',
    },
    {
      filename: 'travel-02.jpg',
      url: '/images/products/travel-02.jpg',
      keywords: ['accessory', 'organizer', 'holder', 'passport', 'travel', 'trip'],
      category: 'travel',
    },
    {
      filename: 'travel-03.jpg',
      url: '/images/products/travel-03.jpg',
      keywords: ['backpack', 'bag', 'carrier', 'hiking', 'adventure', 'outdoor'],
      category: 'travel',
    },
    {
      filename: 'travel-04.jpg',
      url: '/images/products/travel-04.jpg',
      keywords: ['comfort', 'neck', 'pillow', 'rest', 'sleep', 'travel'],
      category: 'travel',
    },
    {
      filename: 'travel-05.jpg',
      url: '/images/products/travel-05.jpg',
      keywords: ['camera', 'photo', 'memory', 'capture', 'document', 'travel'],
      category: 'travel',
    },
  ],
  other: [
    {
      filename: 'other-01.jpg',
      url: '/images/products/other-01.jpg',
      keywords: ['general', 'miscellaneous', 'various', 'different', 'other'],
      category: 'other',
    },
    {
      filename: 'other-02.jpg',
      url: '/images/products/other-02.jpg',
      keywords: ['product', 'item', 'goods', 'merchandise', 'stock'],
      category: 'other',
    },
    {
      filename: 'other-03.jpg',
      url: '/images/products/other-03.jpg',
      keywords: ['quality', 'premium', 'standard', 'regular', 'normal'],
      category: 'other',
    },
    {
      filename: 'other-04.jpg',
      url: '/images/products/other-04.jpg',
      keywords: ['value', 'affordable', 'budget', 'economic', 'cheap'],
      category: 'other',
    },
    {
      filename: 'other-05.jpg',
      url: '/images/products/other-05.jpg',
      keywords: ['special', 'unique', 'exclusive', 'limited', 'rare'],
      category: 'other',
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
 *   1. Extract keywords from product name, merchant, category, description
 *   2. For each keyword, look up matching images in the keyword index
 *   3. Score each image by how many keywords it matches
 *   4. Among the top-scoring images, pick one using deal.id for determinism
 *   5. Return the image URL
 *
 * @param dealId - unique deal ID (for deterministic selection)
 * @param productName - product name
 * @param merchantName - merchant/store name
 * @param category - category slug
 * @param description - deal description
 * @returns URL to the best matching product image
 */
export function selectProductImage(
  dealId: string,
  productName?: string | null,
  merchantName?: string | null,
  category?: string | null,
  description?: string | null,
): string {
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

  // Fallback: use category-based selection
  const cat = (category as ProductImageCategory) ?? 'other';
  const catImages = PRODUCT_IMAGES[cat];
  if (catImages && catImages.length > 0) {
    const idx = Math.abs(hashString(dealId)) % catImages.length;
    return catImages[idx]!.url;
  }

  // Final fallback: "other" category
  return PRODUCT_IMAGES.other[0]!.url;
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
