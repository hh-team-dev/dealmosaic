import { useState, useRef } from 'react';
import { Icon } from './Icon';

/**
 * IMAGE UPLOAD — Admin interface for uploading product images
 *
 * Allows the owner to upload images that will be used by the intelligent
 * matching system to decorate deal cards.
 *
 * Features:
 *   • Drag-and-drop or click to upload
 *   • Automatic category detection based on filename
 *   • Image preview and validation
 *   • Bulk upload support
 *   • Smart filename parsing (e.g., "beauty-01.jpg" → beauty category)
 */

interface UploadedImage {
  id: string;
  filename: string;
  url: string;
  category: string;
  size: number;
}

export function ImageUpload({ onUploadComplete }: { onUploadComplete: (images: UploadedImage[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    const newImages: UploadedImage[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 500 * 1024) continue; // Max 500KB per image

      const formData = new FormData();
      formData.append('image', file);
      formData.append('category', extractCategoryFromFilename(file.name));

      try {
        const response = await fetch('/api/admin/coupon-images/upload', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': getCSRFToken(),
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          newImages.push({
            id: data.id,
            filename: data.filename,
            url: data.url,
            category: data.category,
            size: file.size,
          });
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    setUploaded((prev) => [...prev, ...newImages]);
    setUploading(false);

    if (newImages.length > 0) {
      onUploadComplete(newImages);
    }
  };

  const extractCategoryFromFilename = (filename: string): string => {
    // Remove extension and split by common delimiters
    const base = filename.replace(/\.[^.]+$/, '');
    const parts = base.split(/[-_ ]+/);
    // Check if any part matches a known category
    const knownCategories = [
      'fashion', 'electronics', 'beauty', 'food', 'sports',
      'health', 'home', 'baby', 'industrial', 'refurb',
      'marketplace', 'travel', 'other'
    ];
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (knownCategories.includes(lower)) {
        return lower;
      }
    }
    return 'other';
  };

  const getCSRFToken = (): string => {
    // Get CSRF token from session storage or cookie
    return sessionStorage.getItem('csrf_token') || '';
  };

  return (
    <div className="image-upload">
      <div
        className={`upload-zone${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Icon name="download" size={48} />
        <h3>Upload Product Images</h3>
        <p>Drag and drop images here, or click to browse</p>
        <p className="upload-hint">Supports JPG, PNG, WebP (max 500KB each)</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
          }}
          style={{ display: 'none' }}
        />
      </div>

      {uploading && (
        <div className="upload-progress">
          <Icon name="alert" size={24} />
          <span>Uploading images...</span>
        </div>
      )}

      {uploaded.length > 0 && (
        <div className="upload-success">
          <Icon name="check" size={24} />
          <span>Successfully uploaded {uploaded.length} image{uploaded.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
