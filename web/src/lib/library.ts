import { PANORAMAS, panoramaUrl as staticPanoramaUrl } from '../data/panoramas';
import { getMapillaryLivePanoramaAssets, getMapillaryLiveThumbUrl } from './mapillary-live-catalog';
import { safeStorageSet } from './storage';
import type { PanoramaAsset, PanoramaSource } from '../types';

const TRASH_KEY = 'chronopin-trashed-panos';
const LEGACY_HIDDEN_KEY = 'chronopin-hidden-panos';
const SEEN_KEY = 'chronopin-seen-panos';

function readIdSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeIdSet(key: string, ids: Set<string>): void {
  safeStorageSet(key, JSON.stringify([...ids]));
}

let migrated = false;

function migrateLegacyHidden(): void {
  if (migrated) return;
  migrated = true;
  const legacy = readIdSet(LEGACY_HIDDEN_KEY);
  if (legacy.size === 0) return;
  const trash = readIdSet(TRASH_KEY);
  legacy.forEach((id) => trash.add(id));
  writeIdSet(TRASH_KEY, trash);
  localStorage.removeItem(LEGACY_HIDDEN_KEY);
}

export function getTrashedIds(): Set<string> {
  migrateLegacyHidden();
  return readIdSet(TRASH_KEY);
}

export function getSeenPanoramaIds(): Set<string> {
  return readIdSet(SEEN_KEY);
}

export function markPanoramaSeen(id: string): void {
  const seen = getSeenPanoramaIds();
  if (seen.has(id)) return;
  seen.add(id);
  writeIdSet(SEEN_KEY, seen);
}

export function isPanoramaNew(asset: PanoramaAsset): boolean {
  return Boolean(asset.isNew) && !getSeenPanoramaIds().has(asset.id);
}

const SOURCE_BADGE_LABELS: Record<PanoramaSource, string> = {
  wikimedia: 'wikimedia',
  mapillary: 'mapillary',
  kartaview: 'kartaview',
  panoramax: 'panoramax',
};

const LIBRARY_GROUP_ORDER: PanoramaSource[] = ['wikimedia', 'panoramax', 'mapillary', 'kartaview'];
const LIBRARY_GROUPS_KEY = 'chronopin-library-groups';
const LIBRARY_TRASH_EXPANDED_KEY = 'chronopin-library-trash-expanded';

export interface LibraryCountryGroup {
  key: string;
  label: string;
  items: PanoramaAsset[];
}

export interface LibrarySourceGroup {
  key: PanoramaSource;
  label: string;
  countries: LibraryCountryGroup[];
  items: PanoramaAsset[];
}

const LIBRARY_COUNTRIES_KEY = 'chronopin-library-countries';

function readLibraryCountriesExpanded(): Partial<Record<string, boolean>> {
  try {
    const raw = localStorage.getItem(LIBRARY_COUNTRIES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<string, boolean>>;
  } catch {
    return {};
  }
}

export function libraryCountryGroupKey(source: PanoramaSource, country: string): string {
  return `${source}::${country}`;
}

export function isLibraryCountryExpanded(source: PanoramaSource, country: string): boolean {
  return readLibraryCountriesExpanded()[libraryCountryGroupKey(source, country)] ?? false;
}

export function toggleLibraryCountryExpanded(source: PanoramaSource, country: string): boolean {
  const map = readLibraryCountriesExpanded();
  const key = libraryCountryGroupKey(source, country);
  const next = !isLibraryCountryExpanded(source, country);
  map[key] = next;
  safeStorageSet(LIBRARY_COUNTRIES_KEY, JSON.stringify(map));
  return next;
}

/** Last segment of region string — e.g. "Berlin, Germany" → "Germany". */
export function getPanoramaCountry(asset: PanoramaAsset): string {
  const region = asset.region?.trim();
  if (!region) return 'Unknown';
  const parts = region.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return 'Unknown';
  if (parts.length === 1) return parts[0]!;
  const last = parts[parts.length - 1]!;
  if (last === 'UK') return 'United Kingdom';
  return last;
}

/** City / locality without country — for list rows under a country header. */
export function getPanoramaLocality(asset: PanoramaAsset): string {
  const region = asset.region?.trim();
  if (!region) return asset.title;
  const parts = region.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return region;
  if (parts[parts.length - 1] === 'USA' && parts.length >= 3) {
    return parts.slice(0, -1).join(', ');
  }
  return parts.slice(0, -1).join(', ') || parts[0]!;
}

function groupItemsByCountry(items: PanoramaAsset[]): LibraryCountryGroup[] {
  const buckets = new Map<string, PanoramaAsset[]>();
  for (const item of items) {
    const country = getPanoramaCountry(item);
    const list = buckets.get(country) ?? [];
    list.push(item);
    buckets.set(country, list);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map(([country, countryItems]) => ({
      key: country,
      label: country,
      items: countryItems.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
    }));
}

export function groupVisiblePanoramasBySource(items: PanoramaAsset[]): LibrarySourceGroup[] {
  const buckets = new Map<PanoramaSource, PanoramaAsset[]>();
  for (const item of items) {
    const key = getPanoramaSource(item);
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }
  return LIBRARY_GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => {
    const sourceItems = buckets.get(key)!;
    return {
      key,
      label: SOURCE_BADGE_LABELS[key],
      items: sourceItems,
      countries: groupItemsByCountry(sourceItems),
    };
  });
}

function readLibraryGroupsExpanded(): Partial<Record<PanoramaSource, boolean>> {
  try {
    const raw = localStorage.getItem(LIBRARY_GROUPS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<PanoramaSource, boolean>>;
  } catch {
    return {};
  }
}

export function isLibraryGroupExpanded(source: PanoramaSource): boolean {
  return readLibraryGroupsExpanded()[source] ?? false;
}

export function toggleLibraryGroupExpanded(source: PanoramaSource): boolean {
  const map = readLibraryGroupsExpanded();
  const next = !isLibraryGroupExpanded(source);
  map[source] = next;
  safeStorageSet(LIBRARY_GROUPS_KEY, JSON.stringify(map));
  return next;
}

function readLibraryTrashExpanded(): boolean {
  try {
    return localStorage.getItem(LIBRARY_TRASH_EXPANDED_KEY) === '1';
  } catch {
    return false;
  }
}

export function isLibraryTrashExpanded(): boolean {
  return readLibraryTrashExpanded();
}

export function toggleLibraryTrashExpanded(): boolean {
  const next = !isLibraryTrashExpanded();
  safeStorageSet(LIBRARY_TRASH_EXPANDED_KEY, next ? '1' : '0');
  return next;
}

export function librarySourceLabel(source: PanoramaSource): string {
  return SOURCE_BADGE_LABELS[source];
}

export function getPanoramaSource(asset: PanoramaAsset): PanoramaSource {
  return asset.source ?? 'wikimedia';
}

export function renderPanoramaBadges(
  asset: PanoramaAsset,
  options?: { hideSource?: boolean; compact?: boolean },
): string {
  const badges: string[] = [];
  if (isPanoramaNew(asset)) {
    badges.push('<span class="library-new-badge">new</span>');
  }
  if (!options?.hideSource) {
    const source = getPanoramaSource(asset);
    const label = SOURCE_BADGE_LABELS[source];
    badges.push(`<span class="library-source-badge library-source-${source}">${label}</span>`);
  }
  if (!badges.length) return '';
  return `<span class="library-badges${options?.compact ? ' library-badges-compact' : ''}">${badges.join('')}</span>`;
}

/** Move panorama to in-app trash (hidden from library & gameplay). */
export function trashPanorama(id: string): void {
  migrateLegacyHidden();
  const trash = getTrashedIds();
  trash.add(id);
  writeIdSet(TRASH_KEY, trash);
}

export function restoreFromTrash(id: string): void {
  const trash = getTrashedIds();
  trash.delete(id);
  writeIdSet(TRASH_KEY, trash);
}

export function restoreAllFromTrash(): void {
  localStorage.removeItem(TRASH_KEY);
}

export function getTrashedPanoramas(): PanoramaAsset[] {
  const trash = getTrashedIds();
  return allPanoramaAssets().filter((p) => trash.has(p.id));
}

function allPanoramaAssets(): PanoramaAsset[] {
  return [...PANORAMAS, ...getMapillaryLivePanoramaAssets()];
}

export function getVisiblePanoramas(): PanoramaAsset[] {
  migrateLegacyHidden();
  const trash = getTrashedIds();
  return allPanoramaAssets().filter((p) => !trash.has(p.id));
}

export function isPanoramaTrashed(id: string): boolean {
  return getTrashedIds().has(id);
}

/** Pins on the library world map — active scenes only, never trash. */
export function getLibraryMapPanoramas(): PanoramaAsset[] {
  return getVisiblePanoramas();
}

export function getPanoramaById(id: string): PanoramaAsset | undefined {
  return allPanoramaAssets().find((p) => p.id === id);
}

export function panoramaUrl(asset: PanoramaAsset): string {
  if (asset.mapillaryLive) {
    return getMapillaryLiveThumbUrl(asset.id) ?? '';
  }
  return staticPanoramaUrl(asset);
}

export { staticPanoramaUrl as panoramaStaticUrl };

/** @deprecated use trashPanorama */
export function hidePanorama(id: string): void {
  trashPanorama(id);
}

/** @deprecated use restoreAllFromTrash */
export function restoreAllPanoramas(): void {
  restoreAllFromTrash();
}

/** @deprecated */
export function getHiddenIds(): Set<string> {
  return getTrashedIds();
}
