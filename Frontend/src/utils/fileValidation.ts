export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_EXTENSIONS = '.png,.gif,.jpg,.jpeg,.webp';
export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/gif',
  'image/jpeg',
  'image/webp',
];

/**
 * Validate an image file for type and size.
 * Returns an error message string, or null if valid.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Invalid file type. Allowed: PNG, GIF, JPG, WebP';
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return 'File too large. Maximum size is 5MB';
  }
  return null;
}
