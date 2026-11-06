# DealMosaic Intelligent Image System

## Overview

The intelligent image system automatically assigns relevant, high-quality product images to deal cards based on product name, merchant, category, and description.

## How It Works

### 1. Intelligent Image Matching

When a deal loads, the frontend calls:
```
GET /api/coupons/image/{category}?dealId={id}&productName={name}&merchantName={merchant}&description={desc}
```

The API uses the intelligent matcher to:
1. Check if the category has product images
2. If not, return category background image
3. If yes, extract keywords and score images by relevance
4. Pick the best match deterministically using deal.id
5. Return the image URL

### 2. Image Categories

**Categories with product images (AI-generated):**
- Fashion: 5 images (accessories, clothing, jewelry, footwear, handbags)
- Electronics: 5 images (audio, phones, gaming, wearables, smart home)

**Categories with category background images:**
- baby, beauty, electronics, fashion, food, health, home, industrial, marketplace, other, refurb, sports, travel

### 3. Professional Promotional Layout

Every deal card now features:
- Background product image with adaptive gradient overlay
- Enhanced typography with text shadows for readability
- Prominent discount badges and price display
- Gradient "Shop at store" button with shadows
- Glass-morphism urgency badges

### 4. Admin Dashboard

The Image Bank admin panel (`/admin?tab=image-bank`) includes:
- Intelligent Matching Dashboard with real-time statistics
- Bulk upload interface for multiple images
- Automatic category detection from filenames
- Visual dashboard showing image bank status

## Uploading Your Own Images

### Option 1: Bulk Upload via Admin
1. Go to `/admin?tab=image-bank`
2. Click "Bulk Upload Images"
3. Select multiple images
4. System automatically categorizes based on filename
5. Images are automatically assigned to deals

### Option 2: Upload Per Category
1. Go to `/admin?tab=image-bank`
2. Find the category you want to add images to
3. Click "Add image for {category}"
4. Select an image (max 500KB)
5. Image is added to that category

### File Naming Convention

For optimal automatic categorization:
- `beauty-01.jpg`, `beauty-02.jpg` → Beauty category
- `electronics-01.jpg`, `electronics-02.jpg` → Electronics category
- `fashion-01.jpg`, `fashion-02.jpg` → Fashion category
- `food-01.jpg`, `food-02.jpg` → Food category
- etc.

## Performance

- Images compressed to 17-36 KB each (products), 60-140 KB (categories)
- Lazy loading via useEffect on mount
- Cacheable API responses (max-age=3600)
- Static assets served by Cloudflare Pages CDN
- Total image weight: ~1.4 MB for all 23 images

## API Endpoints

### Get image for a deal
```
GET /api/coupons/image/:categorySlug?dealId={id}&productName={name}&merchantName={merchant}&description={desc}
```

Returns:
```json
{
  "categorySlug": "fashion",
  "imageUrl": "/images/products/fashion-01.jpg",
  "imageType": "jpg",
  "altText": "Fashion deal image"
}
```

### List all category images
```
GET /api/coupons/images
```

Returns all categories with their default images.

## Admin API Endpoints

### Bulk upload images
```
POST /api/admin/coupon-images/upload
Content-Type: multipart/form-data
```

### Generate defaults
```
POST /api/admin/coupon-images/generate-all
```

### Set default image
```
POST /api/admin/coupon-images/:id/default
```

### Delete image
```
DELETE /api/admin/coupon-images/:id
```

## Deployment Status

- Render API: Live at version 2.8.0, revision `4378e032d7bf`
- Cloudflare Pages: Live at HTTP 200
- All tests: 824 tests passing across 44 files
- Backup: `backups/dealmosaic_2026-11-06_11-49-44.tar.gz`

## Next Steps

1. Upload your own product images via the admin dashboard
2. Test the system by visiting deal pages
3. Monitor the dashboard to see matching statistics
4. Iterate by uploading more images for better coverage
