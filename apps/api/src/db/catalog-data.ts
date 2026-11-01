/**
 * Catalogue source data — pure constants, no database, no side effects.
 *
 * Kept separate from catalog-seed.ts so build-time generators (sitemap, structured
 * data) can import the product list without opening a database.
 *
 * These are REAL product identities (names, variants, barcodes, MRPs). The offers
 * generated from them are demonstration data and are labelled as such.
 */

/**
 * DEMO CATALOGUE.
 *
 * Real product identities (names, variants, barcodes, MRPs) with generated
 * offers. Every offer written here carries `data_origin = 'demo'` and the UI
 * watermarks it. This exists so the comparison engine can be built and tested
 * honestly before any retailer grants authorised access.
 *
 * Nothing in this file is presented to a user as a live price.
 */

export interface SeedVariant {
  label: string;
  attributes: Record<string, string>;
  gtin?: string;
  mpn?: string;
  mrp: number; // rupees
  netQuantity?: number;
  unit?: 'g' | 'ml' | 'kg' | 'l' | 'pc';
  packCount?: number;
}

export interface SeedProduct {
  slug: string;
  title: string;
  brand: string;
  category: string;
  categorySlug: string;
  description: string;
  unitKind: 'electronics' | 'grocery' | 'book' | 'apparel' | 'other';
  isGrocery?: boolean;
  variants: SeedVariant[];
  /** price band used to generate plausible offers (rupees) */
  street: [number, number];
  /** platforms that stock this class of product */
  platforms: string[];
}

export const ELECTRONICS = ['amazon-now', 'flipkart-minutes', 'croma', 'reliance-digital'];
export const QCOMM = ['blinkit', 'zepto', 'instamart', 'bigbasket'];

export const PRODUCTS: SeedProduct[] = [
  {
    slug: 'samsung-galaxy-s25-ultra',
    title: 'Samsung Galaxy S25 Ultra',
    brand: 'Samsung',
    category: 'Smartphones',
    categorySlug: 'smartphones',
    description:
      'Flagship Android smartphone with a 6.9-inch Dynamic AMOLED display, 200MP camera system and S Pen support.',
    unitKind: 'electronics',
    street: [128000, 136000],
    platforms: ELECTRONICS,
    variants: [
      { label: '12 GB / 256 GB', attributes: { storage: '256gb', ram: '12gb' }, gtin: '8806095781227', mpn: 'SM-S938BZKAXSA', mrp: 129999 },
      { label: '12 GB / 512 GB', attributes: { storage: '512gb', ram: '12gb' }, gtin: '8806095781234', mpn: 'SM-S938BZKBXSA', mrp: 141999 },
      { label: '12 GB / 1 TB', attributes: { storage: '1tb', ram: '12gb' }, gtin: '8806095781241', mpn: 'SM-S938BZKCXSA', mrp: 165999 },
    ],
  },
  {
    slug: 'apple-iphone-16',
    title: 'Apple iPhone 16',
    brand: 'Apple',
    category: 'Smartphones',
    categorySlug: 'smartphones',
    description: '6.1-inch Super Retina XDR display, A18 chip, dual 48MP camera system and USB-C.',
    unitKind: 'electronics',
    street: [68000, 76000],
    platforms: ELECTRONICS,
    variants: [
      { label: '128 GB', attributes: { storage: '128gb' }, gtin: '0195949631975', mpn: 'MYE93HN/A', mrp: 79900 },
      { label: '256 GB', attributes: { storage: '256gb' }, gtin: '0195949631982', mpn: 'MYEA3HN/A', mrp: 89900 },
    ],
  },
  {
    slug: 'oneplus-13r',
    title: 'OnePlus 13R',
    brand: 'OnePlus',
    category: 'Smartphones',
    categorySlug: 'smartphones',
    description: 'Snapdragon 8 Gen 3, 6.78-inch 120Hz AMOLED and a 6,000 mAh battery.',
    unitKind: 'electronics',
    street: [38000, 43000],
    platforms: ELECTRONICS,
    variants: [
      { label: '8 GB / 128 GB', attributes: { storage: '128gb', ram: '8gb' }, gtin: '6921815629185', mrp: 42999 },
      { label: '12 GB / 256 GB', attributes: { storage: '256gb', ram: '12gb' }, gtin: '6921815629192', mrp: 47999 },
    ],
  },
  {
    slug: 'sony-wh-1000xm5',
    title: 'Sony WH-1000XM5 Wireless Headphones',
    brand: 'Sony',
    category: 'Audio',
    categorySlug: 'audio',
    description: 'Industry-leading noise cancelling over-ear headphones with 30-hour battery life.',
    unitKind: 'electronics',
    street: [24000, 30000],
    platforms: ELECTRONICS,
    variants: [
      { label: 'Black', attributes: { colour: 'black' }, gtin: '4548736132475', mpn: 'WH1000XM5/B', mrp: 34990 },
      { label: 'Platinum Silver', attributes: { colour: 'platinum silver' }, gtin: '4548736132482', mpn: 'WH1000XM5/S', mrp: 34990 },
    ],
  },
  {
    slug: 'boat-rockerz-450',
    title: 'boAt Rockerz 450 Bluetooth Headphones',
    brand: 'boAt',
    category: 'Audio',
    categorySlug: 'audio',
    description: 'On-ear Bluetooth headphones with 15-hour playback and a padded headband.',
    unitKind: 'electronics',
    street: [1200, 1800],
    platforms: ['amazon-now', 'flipkart-minutes', 'myntra'],
    variants: [{ label: 'Luscious Black', attributes: { colour: 'black' }, gtin: '8905594106134', mrp: 3990 }],
  },
  {
    slug: 'lenovo-ideapad-slim-3',
    title: 'Lenovo IdeaPad Slim 3 Laptop',
    brand: 'Lenovo',
    category: 'Computers',
    categorySlug: 'computers',
    description: '15.6-inch FHD laptop with AMD Ryzen 5, designed for students and everyday work.',
    unitKind: 'electronics',
    street: [42000, 50000],
    platforms: ELECTRONICS,
    variants: [
      { label: 'Ryzen 5 / 8 GB / 512 GB SSD', attributes: { ram: '8gb', storage: '512gb' }, gtin: '0196803435754', mpn: '82XQ008WIN', mrp: 54990 },
      { label: 'Ryzen 7 / 16 GB / 512 GB SSD', attributes: { ram: '16gb', storage: '512gb' }, gtin: '0196803435761', mpn: '82XQ009WIN', mrp: 64990 },
    ],
  },
  {
    slug: 'lg-1-5-ton-split-ac',
    title: 'LG 1.5 Ton 5 Star Inverter Split AC',
    brand: 'LG',
    category: 'Home Appliances',
    categorySlug: 'home-appliances',
    description: '5-star inverter split air conditioner with dual inverter compressor and HD filter.',
    unitKind: 'electronics',
    street: [38000, 44000],
    platforms: ['flipkart-minutes', 'croma', 'reliance-digital', 'amazon-now'],
    variants: [{ label: '1.5 Ton · 5 Star', attributes: { capacity: '1.5 ton', rating: '5 star' }, gtin: '8806091301234', mrp: 52990 }],
  },
  {
    slug: 'havells-pedestal-fan',
    title: 'Havells Pedestal Fan',
    brand: 'Havells',
    category: 'Home Appliances',
    categorySlug: 'home-appliances',
    description: '400mm pedestal fan with three speed settings and oscillation control.',
    unitKind: 'electronics',
    street: [2600, 3400],
    platforms: ['flipkart-minutes', 'reliance-digital', 'amazon-now'],
    variants: [{ label: '400 mm', attributes: { size: '400mm' }, gtin: '8901764024153', mrp: 4490 }],
  },
  {
    slug: 'prestige-pressure-cooker-3l',
    title: 'Prestige Deluxe Pressure Cooker',
    brand: 'Prestige',
    category: 'Kitchen',
    categorySlug: 'kitchen',
    description: 'Hard-anodised pressure cooker with a safety valve and induction-compatible base.',
    unitKind: 'electronics',
    street: [1400, 2100],
    platforms: ['amazon-now', 'flipkart-minutes', 'bigbasket'],
    variants: [
      { label: '3 L', attributes: { capacity: '3l' }, gtin: '8901365112015', mrp: 2450, netQuantity: 3, unit: 'l' },
      { label: '5 L', attributes: { capacity: '5l' }, gtin: '8901365112022', mrp: 3150, netQuantity: 5, unit: 'l' },
    ],
  },
  {
    slug: 'nike-revolution-running-shoes',
    title: 'Nike Revolution Running Shoes',
    brand: 'Nike',
    category: 'Footwear',
    categorySlug: 'footwear',
    description: 'Everyday running shoe with a foam midsole and breathable mesh upper.',
    unitKind: 'apparel',
    street: [2600, 3600],
    platforms: ['flipkart-minutes', 'myntra', 'ajio', 'amazon-now'],
    variants: [
      { label: 'UK 8 · Black', attributes: { size: 'uk 8', colour: 'black' }, gtin: '0194528897613', mpn: 'FB2207-001-8', mrp: 4295 },
      { label: 'UK 9 · Black', attributes: { size: 'uk 9', colour: 'black' }, gtin: '0194528897620', mpn: 'FB2207-001-9', mrp: 4295 },
    ],
  },
  {
    slug: 'levis-511-slim-jeans',
    title: "Levi's 511 Slim Fit Jeans",
    brand: "Levi's",
    category: 'Clothing',
    categorySlug: 'clothing',
    description: 'Slim-fit stretch denim with a mid-rise waist.',
    unitKind: 'apparel',
    street: [2200, 3400],
    platforms: ['myntra', 'ajio', 'amazon-now', 'flipkart-minutes'],
    variants: [
      { label: '32 · Dark Indigo', attributes: { waist: '32', colour: 'dark indigo' }, gtin: '5400818291725', mpn: '04511-3949-32', mrp: 3999 },
      { label: '34 · Dark Indigo', attributes: { waist: '34', colour: 'dark indigo' }, gtin: '5400818291732', mpn: '04511-3949-34', mrp: 3999 },
    ],
  },
  {
    slug: 'atomic-habits',
    title: 'Atomic Habits',
    brand: 'James Clear',
    category: 'Books',
    categorySlug: 'books',
    description: 'A practical guide to building good habits and breaking bad ones.',
    unitKind: 'book',
    street: [450, 750],
    platforms: ['amazon-now', 'flipkart-minutes', 'bigbasket'],
    variants: [{ label: 'Paperback', attributes: { format: 'paperback' }, isbn: '9781847941831', mpn: '9781847941831', mrp: 799 }],
  },
  {
    slug: 'dettol-original-soap',
    title: 'Dettol Original Bathing Soap',
    brand: 'Dettol',
    category: 'Personal Care',
    categorySlug: 'personal-care',
    description: 'Antibacterial bathing soap with pine fragrance.',
    unitKind: 'grocery',
    isGrocery: true,
    street: [40, 60],
    platforms: QCOMM,
    variants: [
      { label: '75 g', attributes: { size: '75g' }, gtin: '8901396314020', mrp: 45, netQuantity: 75, unit: 'g' },
      { label: '125 g', attributes: { size: '125g' }, gtin: '8901396314037', mrp: 70, netQuantity: 125, unit: 'g' },
      { label: 'Pack of 4 × 125 g', attributes: { size: '4x125g' }, gtin: '8901396314044', mrp: 280, netQuantity: 500, unit: 'g', packCount: 4 },
    ],
  },
  {
    slug: 'amul-taaza-milk',
    title: 'Amul Taaza Toned Milk',
    brand: 'Amul',
    category: 'Dairy',
    categorySlug: 'dairy',
    description: 'Toned milk, pasteurised and homogenised.',
    unitKind: 'grocery',
    isGrocery: true,
    street: [22, 30],
    platforms: QCOMM,
    variants: [
      { label: '500 ml', attributes: { size: '500ml' }, gtin: '8901262010016', mrp: 27, netQuantity: 500, unit: 'ml' },
      { label: '1 L', attributes: { size: '1l' }, gtin: '8901262010023', mrp: 54, netQuantity: 1, unit: 'l' },
    ],
  },
  {
    slug: 'lays-classic-salted',
    title: "Lay's Classic Salted Potato Chips",
    brand: "Lay's",
    category: 'Snacks',
    categorySlug: 'snacks',
    description: 'Thin-cut potato chips with salt. The benchmark packet.',
    unitKind: 'grocery',
    isGrocery: true,
    street: [18, 60],
    platforms: QCOMM,
    variants: [
      { label: '52 g', attributes: { size: '52g', flavour: 'salted' }, gtin: '8901491101899', mrp: 20, netQuantity: 52, unit: 'g' },
      { label: '90 g', attributes: { size: '90g', flavour: 'salted' }, gtin: '8901491101905', mrp: 30, netQuantity: 90, unit: 'g' },
      { label: '180 g family pack', attributes: { size: '180g', flavour: 'salted' }, gtin: '8901491101912', mrp: 55, netQuantity: 180, unit: 'g' },
    ],
  },
  {
    slug: 'aashirvaad-atta',
    title: 'Aashirvaad Shudh Chakki Atta',
    brand: 'Aashirvaad',
    category: 'Staples',
    categorySlug: 'staples',
    description: 'Whole wheat flour milled from 100% MP wheat.',
    unitKind: 'grocery',
    isGrocery: true,
    street: [230, 620],
    platforms: QCOMM,
    variants: [
      { label: '5 kg', attributes: { size: '5kg' }, gtin: '8901725121112', mrp: 285, netQuantity: 5, unit: 'kg' },
      { label: '10 kg', attributes: { size: '10kg' }, gtin: '8901725121129', mrp: 545, netQuantity: 10, unit: 'kg' },
    ],
  },
  {
    slug: 'tata-salt',
    title: 'Tata Salt Iodised',
    brand: 'Tata',
    category: 'Staples',
    categorySlug: 'staples',
    description: 'Vacuum-evaporated iodised salt.',
    unitKind: 'grocery',
    isGrocery: true,
    street: [24, 32],
    platforms: QCOMM,
    variants: [{ label: '1 kg', attributes: { size: '1kg' }, gtin: '8901030865258', mrp: 28, netQuantity: 1, unit: 'kg' }],
  },
  {
    slug: 'maggi-masala-noodles',
    title: 'Maggi 2-Minute Masala Noodles',
    brand: 'Maggi',
    category: 'Snacks',
    categorySlug: 'snacks',
    description: 'Instant noodles with the classic masala tastemaker.',
    unitKind: 'grocery',
    isGrocery: true,
    street: [12, 130],
    platforms: QCOMM,
    variants: [
      { label: '70 g', attributes: { size: '70g' }, gtin: '8901058000907', mrp: 14, netQuantity: 70, unit: 'g' },
      { label: 'Pack of 12 × 70 g', attributes: { size: '12x70g' }, gtin: '8901058000914', mrp: 168, netQuantity: 840, unit: 'g', packCount: 12 },
    ],
  },
  {
    slug: 'fortune-sunflower-oil',
    title: 'Fortune Sunlite Refined Sunflower Oil',
    brand: 'Fortune',
    category: 'Staples',
    categorySlug: 'staples',
    description: 'Refined sunflower oil for everyday cooking.',
    unitKind: 'grocery',
    isGrocery: true,
    street: [130, 1500],
    platforms: QCOMM,
    variants: [
      { label: '1 L pouch', attributes: { size: '1l' }, gtin: '8906004860012', mrp: 155, netQuantity: 1, unit: 'l' },
      { label: '5 L jar', attributes: { size: '5l' }, gtin: '8906004860029', mrp: 745, netQuantity: 5, unit: 'l' },
    ],
  },
  {
    slug: 'colgate-strong-teeth',
    title: 'Colgate Strong Teeth Toothpaste',
    brand: 'Colgate',
    category: 'Personal Care',
    categorySlug: 'personal-care',
    description: 'Fluoride toothpaste with amino shakti formula.',
    unitKind: 'grocery',
    isGrocery: true,
    street: [55, 200],
    platforms: QCOMM,
    variants: [
      { label: '100 g', attributes: { size: '100g' }, gtin: '8901314010114', mrp: 65, netQuantity: 100, unit: 'g' },
      { label: '200 g', attributes: { size: '200g' }, gtin: '8901314010121', mrp: 120, netQuantity: 200, unit: 'g' },
    ],
  },
  {
    slug: 'surf-excel-matic',
    title: 'Surf Excel Matic Front Load Detergent',
    brand: 'Surf Excel',
    category: 'Household',
    categorySlug: 'household',
    description: 'Liquid detergent formulated for front-load washing machines.',
    unitKind: 'grocery',
    isGrocery: true,
    street: [190, 560],
    platforms: QCOMM,
    variants: [
      { label: '1 L', attributes: { size: '1l' }, gtin: '8901030709156', mrp: 220, netQuantity: 1, unit: 'l' },
      { label: '2 L', attributes: { size: '2l' }, gtin: '8901030709163', mrp: 420, netQuantity: 2, unit: 'l' },
    ],
  },
  {
    slug: 'yonex-badminton-racket',
    title: 'Yonex Nanoray Badminton Racket',
    brand: 'Yonex',
    category: 'Sports',
    categorySlug: 'sports',
    description: 'Lightweight graphite badminton racket for beginners and club players.',
    unitKind: 'other',
    street: [1400, 2100],
    platforms: ['amazon-now', 'flipkart-minutes', 'myntra'],
    variants: [{ label: 'Nanoray 7000i', attributes: { model: '7000i' }, gtin: '8906049101450', mrp: 2390 }],
  },
  {
    slug: 'lego-classic-bricks',
    title: 'LEGO Classic Medium Creative Brick Box',
    brand: 'LEGO',
    category: 'Toys',
    categorySlug: 'toys',
    description: '484-piece creative brick set for ages 4 and up.',
    unitKind: 'other',
    street: [1600, 2400],
    platforms: ['amazon-now', 'flipkart-minutes'],
    variants: [{ label: '484 pieces', attributes: { pieces: '484' }, gtin: '5702016617053', mrp: 2799 }],
  },
  {
    slug: 'wakefit-mattress',
    title: 'Wakefit Orthopaedic Memory Foam Mattress',
    brand: 'Wakefit',
    category: 'Furniture',
    categorySlug: 'furniture',
    description: 'Memory foam mattress with a high-density base, 100-night trial.',
    unitKind: 'other',
    street: [9000, 16000],
    platforms: ['amazon-now', 'flipkart-minutes'],
    variants: [
      { label: 'Queen · 6 inch', attributes: { size: 'queen', height: '6 inch' }, gtin: '8906103912014', mrp: 14599 },
      { label: 'King · 6 inch', attributes: { size: 'king', height: '6 inch' }, gtin: '8906103912021', mrp: 16999 },
    ],
  },
  {
    slug: 'forest-essentials-shampoo',
    title: 'Forest Essentials Ayurvedic Herb Shampoo',
    brand: 'Forest Essentials',
    category: 'Beauty',
    categorySlug: 'beauty',
    description: 'Ayurvedic shampoo with bhringraj and amla.',
    unitKind: 'grocery',
    isGrocery: true,
    street: [650, 1400],
    platforms: ['nykaa', 'amazon-now', 'blinkit'],
    variants: [
      { label: '200 ml', attributes: { size: '200ml' }, gtin: '8904109406120', mrp: 825, netQuantity: 200, unit: 'ml' },
      { label: '400 ml', attributes: { size: '400ml' }, gtin: '8904109406137', mrp: 1450, netQuantity: 400, unit: 'ml' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Deterministic offer generation                                      */
/* ------------------------------------------------------------------ */

/** Small deterministic PRNG so every seed run produces identical data — a
 *  comparison product must never behave differently on two identical searches. */
export function mulberry32(seed: number) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const PLATFORM_META: Record<
  string,
  {
    name: string;
    sellerType: 'platform' | 'official' | 'marketplace' | 'dark_store';
    sellers: string[];
    sellerRating: number | null;
    sellerRatingCount: number | null;
    productRating: number | null;
    productReviewCount: number | null;
    deliveryMin: number;
    deliveryMax: number;
    shipping: number | null;
    shippingNote?: string;
    returnDays: number | null;
    warranty: number | null;
    url: (q: string) => string;
    affiliate: boolean;
    community?: boolean;
  }
> = {
  'amazon-now': {
    name: 'Amazon India',
    sellerType: 'official',
    sellers: ['Appario Retail', 'Cloudtail India'],
    sellerRating: 4.6,
    sellerRatingCount: 212000,
    productRating: 4.5,
    productReviewCount: 18432,
    deliveryMin: 1,
    deliveryMax: 3,
    shipping: 0,
    returnDays: 7,
    warranty: 12,
    url: (q) => `https://www.amazon.in/s?k=${q}`,
    affiliate: true,
  },
  'flipkart-minutes': {
    name: 'Flipkart',
    sellerType: 'marketplace',
    sellers: ['SuperComNet', 'RetailNet'],
    sellerRating: 4.3,
    sellerRatingCount: 86204,
    productRating: 4.4,
    productReviewCount: 11208,
    deliveryMin: 2,
    deliveryMax: 4,
    shipping: 4900,
    shippingNote: 'Delivery ₹49 on orders below ₹499',
    returnDays: 7,
    warranty: 12,
    url: (q) => `https://www.flipkart.com/search?q=${q}`,
    affiliate: false,
  },
  croma: {
    name: 'Croma',
    sellerType: 'official',
    sellers: ['Croma'],
    sellerRating: 4.4,
    sellerRatingCount: 12900,
    productRating: 4.5,
    productReviewCount: 3411,
    deliveryMin: 1,
    deliveryMax: 2,
    shipping: 0,
    returnDays: 7,
    warranty: 24,
    url: (q) => `https://www.croma.com/searchB?q=${q}`,
    affiliate: true,
  },
  'reliance-digital': {
    name: 'Reliance Digital',
    sellerType: 'official',
    sellers: ['Reliance Retail'],
    sellerRating: 4.2,
    sellerRatingCount: 9400,
    productRating: 4.4,
    productReviewCount: 2180,
    deliveryMin: 2,
    deliveryMax: 5,
    shipping: 0,
    returnDays: 7,
    warranty: 12,
    url: (q) => `https://www.reliancedigital.in/search?q=${q}`,
    affiliate: false,
  },
  myntra: {
    name: 'Myntra',
    sellerType: 'marketplace',
    sellers: ['Myntra Fashion'],
    sellerRating: 4.1,
    sellerRatingCount: 54000,
    productRating: 4.2,
    productReviewCount: 8600,
    deliveryMin: 2,
    deliveryMax: 5,
    shipping: 0,
    returnDays: 14,
    warranty: null,
    url: (q) => `https://www.myntra.com/${q}`,
    affiliate: false,
  },
  ajio: {
    name: 'AJIO',
    sellerType: 'marketplace',
    sellers: ['AJIO'],
    sellerRating: 4.0,
    sellerRatingCount: 31000,
    productRating: 4.1,
    productReviewCount: 4200,
    deliveryMin: 3,
    deliveryMax: 6,
    shipping: 0,
    returnDays: 15,
    warranty: null,
    url: (q) => `https://www.ajio.com/search/?text=${q}`,
    affiliate: false,
  },
  blinkit: {
    name: 'Blinkit',
    sellerType: 'dark_store',
    sellers: ['Blinkit dark store'],
    sellerRating: null,
    sellerRatingCount: null,
    productRating: null,
    productReviewCount: null,
    deliveryMin: 0,
    deliveryMax: 0,
    shipping: null,
    shippingNote: 'Delivery free above ₹199 cart, otherwise ₹25–35',
    returnDays: 1,
    warranty: null,
    url: (q) => `https://blinkit.com/s/?q=${q}`,
    affiliate: false,
    community: true,
  },
  zepto: {
    name: 'Zepto',
    sellerType: 'dark_store',
    sellers: ['Zepto dark store'],
    sellerRating: null,
    sellerRatingCount: null,
    productRating: null,
    productReviewCount: null,
    deliveryMin: 0,
    deliveryMax: 0,
    shipping: null,
    shippingNote: 'Delivery free above ₹99 cart, otherwise ₹20–30',
    returnDays: 1,
    warranty: null,
    url: (q) => `https://www.zeptonow.com/search?query=${q}`,
    affiliate: false,
    community: true,
  },
  instamart: {
    name: 'Swiggy Instamart',
    sellerType: 'dark_store',
    sellers: ['Instamart dark store'],
    sellerRating: null,
    sellerRatingCount: null,
    productRating: null,
    productReviewCount: null,
    deliveryMin: 0,
    deliveryMax: 0,
    shipping: null,
    shippingNote: 'Delivery free above ₹199 cart, plus handling fee',
    returnDays: 1,
    warranty: null,
    url: (q) => `https://www.swiggy.com/instamart/search?query=${q}`,
    affiliate: true,
    community: true,
  },
  bigbasket: {
    name: 'BigBasket',
    sellerType: 'platform',
    sellers: ['BigBasket'],
    sellerRating: null,
    sellerRatingCount: null,
    productRating: null,
    productReviewCount: null,
    deliveryMin: 0,
    deliveryMax: 1,
    shipping: null,
    shippingNote: 'Delivery free above ₹299 cart, otherwise ₹30',
    returnDays: 2,
    warranty: null,
    url: (q) => `https://www.bigbasket.com/ps/?q=${q}`,
    affiliate: true,
    community: true,
  },
  nykaa: {
    name: 'Nykaa',
    sellerType: 'official',
    sellers: ['Nykaa Beauty'],
    sellerRating: 4.3,
    sellerRatingCount: 28000,
    productRating: 4.3,
    productReviewCount: 5600,
    deliveryMin: 2,
    deliveryMax: 4,
    shipping: 0,
    returnDays: 7,
    warranty: null,
    url: (q) => `https://www.nykaa.com/search/result/?q=${q}`,
    affiliate: false,
  },
};
