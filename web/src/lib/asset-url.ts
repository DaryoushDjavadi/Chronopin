/** Prefix static asset paths with Vite `base` (e.g. /app/Chrono/ on Strato). */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${normalized}`;
}
