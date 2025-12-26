const isBrowser = typeof window !== 'undefined';

const decodeBase64 = (value: string): string | null => {
  if (!isBrowser || typeof window.atob !== 'function') {
    return null;
  }
  try {
    return window.atob(value);
  } catch {
    return null;
  }
};

export function getPartitionCsvFromUrl(): string | null {
  if (!isBrowser) {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const payload = params.get('partitions');
  if (!payload) {
    return null;
  }

  if (payload.startsWith('base64:')) {
    return decodeBase64(payload.slice('base64:'.length));
  }

  try {
    return decodeURIComponent(payload);
  } catch {
    return decodeBase64(payload);
  }
}
