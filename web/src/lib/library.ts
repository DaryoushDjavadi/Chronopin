import { PANORAMAS, panoramaUrl } from '../data/panoramas';
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

export function getPanoramaSource(asset: PanoramaAsset): PanoramaSource {
  return asset.source ?? 'wikimedia';
}

export function renderPanoramaBadges(asset: PanoramaAsset): string {
  const badges: string[] = [];
  if (isPanoramaNew(asset)) {
    badges.push('<span class="library-new-badge">new</span>');
  }
  const source = getPanoramaSource(asset);
  const label = SOURCE_BADGE_LABELS[source];
  badges.push(`<span class="library-source-badge library-source-${source}">${label}</span>`);
  return `<span class="library-badges">${badges.join('')}</span>`;
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
  return PANORAMAS.filter((p) => trash.has(p.id));
}

export function getVisiblePanoramas(): PanoramaAsset[] {
  migrateLegacyHidden();
  const trash = getTrashedIds();
  return PANORAMAS.filter((p) => !trash.has(p.id));
}

export function isPanoramaTrashed(id: string): boolean {
  return getTrashedIds().has(id);
}

/** Pins on the library world map — active scenes only, never trash. */
export function getLibraryMapPanoramas(): PanoramaAsset[] {
  return getVisiblePanoramas();
}

export function getPanoramaById(id: string): PanoramaAsset | undefined {
  return PANORAMAS.find((p) => p.id === id);
}

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

export { panoramaUrl };
