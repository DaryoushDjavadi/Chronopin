import { MAPILLARY_LIVE_SPOTS, type MapillaryLiveSpot } from '../data/mapillary-live-spots';
import type { PanoramaAsset } from '../types';
import {
  findMapillaryPanoNear,
  isMapillaryLiveEnabled,
  type MapillaryImageHit,
} from './mapillary-api';
import { safeStorageSet } from './storage';

const CACHE_KEY = 'chronopin-mapillary-live-cache';
const PREFS_KEY = 'chronopin-mapillary-live-prefs';
const RECENT_KEY = 'chronopin-mapillary-live-recent';

export interface MapillaryLiveCacheEntry {
  imageId: string;
  lat: number;
  lng: number;
  thumbUrl?: string;
  fetchedAt: number;
}

export interface MapillaryLivePrefs {
  libraryEnabled: boolean;
  includeInGameplay: boolean;
}

const DEFAULT_PREFS: MapillaryLivePrefs = {
  libraryEnabled: true,
  includeInGameplay: false,
};

function readCache(): Record<string, MapillaryLiveCacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, MapillaryLiveCacheEntry>;
  } catch {
    return {};
  }
}

function writeCache(map: Record<string, MapillaryLiveCacheEntry>): void {
  safeStorageSet(CACHE_KEY, JSON.stringify(map));
}

export function readMapillaryLivePrefs(): MapillaryLivePrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const data = JSON.parse(raw) as Partial<MapillaryLivePrefs>;
    return {
      libraryEnabled: data.libraryEnabled ?? DEFAULT_PREFS.libraryEnabled,
      includeInGameplay: data.includeInGameplay ?? DEFAULT_PREFS.includeInGameplay,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writeMapillaryLivePrefs(prefs: MapillaryLivePrefs): void {
  safeStorageSet(PREFS_KEY, JSON.stringify(prefs));
}

export function isMapillaryLiveLibraryEnabled(): boolean {
  return isMapillaryLiveEnabled() && readMapillaryLivePrefs().libraryEnabled;
}

export function isMapillaryLiveGameplayEnabled(): boolean {
  return isMapillaryLiveLibraryEnabled() && readMapillaryLivePrefs().includeInGameplay;
}

export function mapillaryLiveAssetId(spotId: string): string {
  return `mapillary-live-${spotId}`;
}

export function spotIdFromMapillaryAssetId(assetId: string): string | null {
  return assetId.startsWith('mapillary-live-') ? assetId.slice('mapillary-live-'.length) : null;
}

export function getMapillaryLiveSpot(spotId: string): MapillaryLiveSpot | undefined {
  return MAPILLARY_LIVE_SPOTS.find((s) => s.id === spotId);
}

export function buildMapillaryLiveAsset(spot: MapillaryLiveSpot): PanoramaAsset {
  return {
    id: mapillaryLiveAssetId(spot.id),
    filename: '',
    title: `${spot.label} · Live`,
    region: spot.region,
    lat: spot.lat,
    lng: spot.lng,
    modes: ['classic'],
    context: 'Live 360° street panorama streamed from Mapillary (refreshed on demand).',
    attribution: '© Mapillary contributors',
    license: 'CC BY-SA',
    source: 'mapillary',
    mapillaryLive: true,
    sourceId: spot.id,
    isNew: true,
  };
}

export function getMapillaryLivePanoramaAssets(): PanoramaAsset[] {
  if (!isMapillaryLiveLibraryEnabled()) return [];
  return MAPILLARY_LIVE_SPOTS.map(buildMapillaryLiveAsset);
}

export function getMapillaryLiveCacheEntry(assetId: string): MapillaryLiveCacheEntry | null {
  return readCache()[assetId] ?? null;
}

export function getMapillaryLiveImageId(assetId: string): string | null {
  return getMapillaryLiveCacheEntry(assetId)?.imageId ?? null;
}

export function getMapillaryLiveThumbUrl(assetId: string): string | null {
  return getMapillaryLiveCacheEntry(assetId)?.thumbUrl ?? null;
}

function readRecentImageIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function pushRecentImageId(imageId: string): void {
  const recent = readRecentImageIds().filter((id) => id !== imageId);
  recent.unshift(imageId);
  safeStorageSet(RECENT_KEY, JSON.stringify(recent.slice(0, 24)));
}

function storeHit(assetId: string, hit: MapillaryImageHit): MapillaryLiveCacheEntry {
  const entry: MapillaryLiveCacheEntry = {
    imageId: hit.id,
    lat: hit.lat,
    lng: hit.lng,
    thumbUrl: hit.thumbUrl,
    fetchedAt: Date.now(),
  };
  const cache = readCache();
  cache[assetId] = entry;
  writeCache(cache);
  pushRecentImageId(hit.id);
  return entry;
}

export async function ensureMapillaryAssetResolved(
  assetId: string,
  options?: { force?: boolean },
): Promise<MapillaryLiveCacheEntry | null> {
  if (!isMapillaryLiveEnabled()) return null;
  const spotId = spotIdFromMapillaryAssetId(assetId);
  const spot = spotId ? getMapillaryLiveSpot(spotId) : null;
  if (!spot) return null;

  if (!options?.force) {
    const existing = getMapillaryLiveCacheEntry(assetId);
    if (existing) return existing;
  }

  const exclude = new Set(readRecentImageIds());
  const current = getMapillaryLiveCacheEntry(assetId);
  if (current) exclude.add(current.imageId);

  for (let attempt = 0; attempt < 4; attempt++) {
    const hit = await findMapillaryPanoNear(spot.lat, spot.lng, {
      excludeIds: [...exclude],
      jitterDeg: 0.012 + attempt * 0.006,
    });
    if (hit) return storeHit(assetId, hit);
  }
  return null;
}

export async function refreshAllMapillaryLivePreviews(): Promise<number> {
  let count = 0;
  for (const spot of MAPILLARY_LIVE_SPOTS) {
    const assetId = mapillaryLiveAssetId(spot.id);
    const hit = await ensureMapillaryAssetResolved(assetId, { force: true });
    if (hit) count++;
  }
  return count;
}

export function getMapillaryLiveResolvedCount(): number {
  return getMapillaryLivePanoramaAssets().filter((a) => getMapillaryLiveCacheEntry(a.id)).length;
}

export async function pickRandomMapillaryLiveRound(): Promise<{
  asset: PanoramaAsset;
  entry: MapillaryLiveCacheEntry;
} | null> {
  const assets = [...getMapillaryLivePanoramaAssets()].sort(() => Math.random() - 0.5);
  for (const asset of assets) {
    const entry = (await ensureMapillaryAssetResolved(asset.id)) ??
      getMapillaryLiveCacheEntry(asset.id);
    if (entry) return { asset, entry };
  }
  return null;
}

export function isMapillaryPanoramaAsset(asset: PanoramaAsset | undefined): boolean {
  return Boolean(asset?.mapillaryLive);
}
