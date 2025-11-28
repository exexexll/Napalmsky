/**
 * Client-Side Image Compression
 * Converts images to WebP format for 25-30% size reduction
 * Source: Google Developers - WebP is 25-34% smaller than JPEG
 */

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
}

/**
 * Compress image to WebP format
 * @param file - Original image blob or File
 * @param maxWidth - Maximum width (default: 800)
 * @param maxHeight - Maximum height (default: 800)
 * @param quality - Quality 0-1 (default: 0.85)
 */
export async function compressImage(
  file: Blob,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.85
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create blob URL and track it for cleanup
    let blobUrl: string | null = null;

    const cleanup = () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
    };

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions (maintain aspect ratio)
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first (best compression)
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              const result: CompressionResult = {
                blob,
                originalSize: file.size,
                compressedSize: blob.size,
                reductionPercent: ((1 - blob.size / file.size) * 100),
              };
              console.log('[Compression] Image:', 
                (file.size / 1024).toFixed(0), 'KB →',
                (blob.size / 1024).toFixed(0), 'KB',
                `(${result.reductionPercent.toFixed(1)}% reduction)`
              );
              resolve(result);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/webp',
          quality
        );
      } else {
        cleanup();
        reject(new Error('Canvas context not available'));
      }
    };

    img.onerror = (e) => {
      cleanup();
      console.error('[Compression] Image load error:', e);
      reject(new Error('Image load failed - file may be corrupted or unsupported format'));
    };
    
    // CRITICAL: Read file as data URL first for better compatibility
    // Some browsers have issues with blob URLs from File objects
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      // Fallback to blob URL if FileReader fails
      console.log('[Compression] FileReader failed, falling back to blob URL');
      try {
        blobUrl = URL.createObjectURL(file);
        img.src = blobUrl;
      } catch (err) {
        reject(new Error('Failed to read image file'));
      }
    };
    reader.readAsDataURL(file);
  });
}

