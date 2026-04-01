export const resolveDrivePreviewUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('data:') || url.startsWith('/api/files/preview/')) return url;

  const driveIdMatch =
    url.match(/[?&]id=([^&]+)/) ||
    url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);

  if (driveIdMatch?.[1]) {
    return `/api/files/preview/${driveIdMatch[1]}`;
  }

  return url;
};
