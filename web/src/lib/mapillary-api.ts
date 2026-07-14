/** Mapillary Graph API — live 360° lookup (no JPG download). */

export interface MapillaryImageHit {
  id: string;
  lat: number;
  lng: number;
  isPano: boolean;
  thumbUrl?: string;
}

export function getMapillaryAccessToken(): string | null {
  const token = import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN?.trim();
  return token || null;
}

export function isMapillaryLiveEnabled(): boolean {
  return Boolean(getMapillaryAccessToken());
}

/** Search for a 360° Mapillary image near a point. Requires free client token. */
export async function findMapillaryPanoNear(
  lat: number,
  lng: number,
  options?: { radiusDeg?: number; limit?: number; excludeIds?: string[]; jitterDeg?: number },
): Promise<MapillaryImageHit | null> {
  const token = getMapillaryAccessToken();
  if (!token) return null;

  const jitter = options?.jitterDeg ?? 0.01;
  const searchLat = lat + (Math.random() - 0.5) * jitter;
  const searchLng = lng + (Math.random() - 0.5) * jitter;
  const radius = options?.radiusDeg ?? 0.00015;
  const limit = options?.limit ?? 10;
  const exclude = new Set(options?.excludeIds ?? []);
  const bbox = `${searchLng - radius},${searchLat - radius},${searchLng + radius},${searchLat + radius}`;
  const url =
    `https://graph.mapillary.com/images?access_token=${encodeURIComponent(token)}` +
    `&fields=id,computed_geometry,is_pano,captured_at,thumb_256_url` +
    `&bbox=${bbox}&is_pano=true&limit=${limit}`;

  const res = await fetch(url);
  const data = (await res.json()) as {
    data?: {
      id: number;
      is_pano?: boolean;
      computed_geometry?: { coordinates: [number, number] };
      thumb_256_url?: string;
    }[];
    error?: { message?: string };
  };

  if (data.error) {
    throw new Error(data.error.message ?? 'Mapillary API error');
  }

  const images = data.data ?? [];
  if (!images.length) return null;

  const panos = images.filter((img) => img.is_pano && !exclude.has(String(img.id)));
  const pool = panos.length ? panos : images.filter((img) => !exclude.has(String(img.id)));
  if (!pool.length) return null;

  const pick = pool[Math.floor(Math.random() * pool.length)]!;
  const [hitLng, hitLat] = pick.computed_geometry?.coordinates ?? [searchLng, searchLat];
  return {
    id: String(pick.id),
    lat: hitLat,
    lng: hitLng,
    isPano: Boolean(pick.is_pano),
    thumbUrl: pick.thumb_256_url,
  };
}

export async function testMapillaryConnection(): Promise<{ ok: boolean; message: string; sampleId?: string }> {
  if (!getMapillaryAccessToken()) {
    return {
      ok: false,
      message: 'No token — add VITE_MAPILLARY_ACCESS_TOKEN to web/.env (free at mapillary.com/dashboard/developers)',
    };
  }
  try {
    const hit = await findMapillaryPanoNear(52.52, 13.405);
    if (!hit) {
      return { ok: true, message: 'Token works, but no 360° pano found in Berlin test bbox (try another city).' };
    }
    return { ok: true, message: `Token OK — sample image ${hit.id} near Berlin`, sampleId: hit.id };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
