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

export interface LibrarySourceGroup {
  key: PanoramaSource;
  label: string;
  items: PanoramaAsset[];
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

export function librarySourceLabel(source: PanoramaSource): string {
  return SOURCE_BADGE_LABELS[source];
}

export function groupVisiblePanoramasBySource(items: PanoramaAsset[]): LibrarySourceGroup[] {
  const buckets = new Map<PanoramaSource, PanoramaAsset[]>();
  for (const item of items) {
    const key = getPanoramaSource(item);
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }
  return LIBRARY_GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
    key,
    label: SOURCE_BADGE_LABELS[key],
    items: buckets.get(key)!,
  }));
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
