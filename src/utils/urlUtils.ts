/**
 * Ensures a URL has a proper protocol (https://)
 * @param url - The URL to validate and fix
 * @returns A properly formatted URL with protocol
 */
export const ensureHttpsProtocol = (url: string): string => {
  if (!url) return url;
  
  // If URL already has a protocol, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If URL starts with www. or is a domain, add https://
  if (url.startsWith('www.') || url.includes('.')) {
    return `https://${url}`;
  }
  
  // For other cases, add https://
  return `https://${url}`;
};

/**
 * Validates and fixes social media URLs
 * @param socialLinks - Object containing social media links
 * @returns Object with properly formatted URLs
 */
export const normalizeSocialLinks = (socialLinks: Record<string, string>): Record<string, string> => {
  const normalized: Record<string, string> = {};
  
  for (const [platform, url] of Object.entries(socialLinks)) {
    if (url && url.trim()) {
      normalized[platform] = ensureHttpsProtocol(url.trim());
    }
  }
  
  return normalized;
};

/**
 * Extracts a Google Drive file ID from various Google Drive URL formats:
 * - https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
 * - https://drive.google.com/open?id={FILE_ID}
 * - https://drive.google.com/uc?id={FILE_ID}
 * - https://lh3.googleusercontent.com/d/{FILE_ID}
 */
export const extractGoogleDriveFileId = (url: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();

  // Pattern 1: drive.google.com/file/d/{FILE_ID}
  const fileIdMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    return fileIdMatch[1];
  }

  // Pattern 2: drive.google.com/...?...id={FILE_ID}
  const idParamMatch = trimmed.match(/drive\.google\.com\/[^\s?]*\?(?:[^&\s]+&)*id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // Pattern 3: lh3.googleusercontent.com/d/{FILE_ID}
  const lh3Match = trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match && lh3Match[1]) {
    return lh3Match[1];
  }

  return null;
};

/**
 * Normalizes an image URL. If it is a Google Drive share link, converts it
 * to the direct Google CDN image stream URL (lh3.googleusercontent.com/d/{FILE_ID})
 * so it can be embedded directly in <img> tags.
 */
export const normalizeImageUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();

  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  return ensureHttpsProtocol(trimmed);
};

/**
 * Alternative fallback direct URL for Google Drive images
 */
export const getGoogleDriveFallbackUrl = (url: string): string | null => {
  const driveId = extractGoogleDriveFileId(url);
  if (!driveId) return null;
  return `https://drive.google.com/thumbnail?id=${driveId}&sz=w2500`;
};

