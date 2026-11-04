/**
 * File Signature & Format Normalizer
 * Conforms to Module M1.9: Storage Drive Extension & Magic Bytes Policy
 * Automatically resolves FILE_CONTENT_MISMATCH (e.g. WebP saved as .jpg)
 */

function convertImageToJpegBlob(file) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      return reject(new Error('Window environment not available'));
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));
        // Solid white background for transparent pixels
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob failed'));
          },
          'image/jpeg',
          0.95
        );
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

export async function normalizeFileForUpload(file) {
  if (!file || !(file instanceof Blob)) return file;

  try {
    const slice = file.slice(0, 16);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const originalName = file.name || 'document';
    const lastDotIndex = originalName.lastIndexOf('.');
    const baseName = lastDotIndex !== -1 ? originalName.slice(0, lastDotIndex) : originalName;
    const currentExt = lastDotIndex !== -1 ? originalName.slice(lastDotIndex + 1).toLowerCase() : '';

    // Check actual binary signatures
    const isJpegBytes = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPngBytes = bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isWebPBytes =
      bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    const isGifBytes = bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
    const isPdfBytes = bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    const isZipBytes = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;

    // 1. WebP data saved with .jpg / .jpeg extension (The classic web download mismatch)
    if (isWebPBytes && (currentExt === 'jpg' || currentExt === 'jpeg')) {
      try {
        const jpegBlob = await convertImageToJpegBlob(file);
        if (jpegBlob) {
          return new File([jpegBlob], `${baseName}.jpg`, { type: 'image/jpeg' });
        }
      } catch {
        // Fallback: rename to genuine .webp extension
        return new File([file], `${baseName}.webp`, { type: 'image/webp' });
      }
    }

    // 2. PNG data saved with .jpg / .jpeg extension
    if (isPngBytes && (currentExt === 'jpg' || currentExt === 'jpeg')) {
      try {
        const jpegBlob = await convertImageToJpegBlob(file);
        if (jpegBlob) {
          return new File([jpegBlob], `${baseName}.jpg`, { type: 'image/jpeg' });
        }
      } catch {
        return new File([file], `${baseName}.png`, { type: 'image/png' });
      }
    }

    // 3. JPEG data saved with .png extension
    if (isJpegBytes && currentExt === 'png') {
      return new File([file], `${baseName}.jpg`, { type: 'image/jpeg' });
    }

    // 4. WebP data saved with .png extension
    if (isWebPBytes && currentExt === 'png') {
      return new File([file], `${baseName}.webp`, { type: 'image/webp' });
    }

    // 5. PDF data saved with wrong extension
    if (isPdfBytes && currentExt !== 'pdf') {
      return new File([file], `${baseName}.pdf`, { type: 'application/pdf' });
    }

    // 6. ZIP data saved with wrong extension
    if (isZipBytes && currentExt !== 'zip') {
      return new File([file], `${baseName}.zip`, { type: 'application/zip' });
    }

    return file;
  } catch (err) {
    console.warn('File signature normalization notice:', err);
    return file;
  }
}

export default normalizeFileForUpload;

