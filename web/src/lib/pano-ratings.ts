import {
  fetchPanoramaRatingsFromFirestore,
  pushPanoramaRatingToFirestore,
  removePanoramaRatingFromFirestore,
} from './firebase-pano-ratings';
import { isFirebaseConfigured } from './firebase';
import { safeStorageSet } from './storage';

/** 1 = easy · 2 = medium · 3 = hard (for future difficulty filters) */
export type PanoramaDifficulty = 1 | 2 | 3;

const RATINGS_KEY = 'chronopin-pano-ratings';

interface StoredPanoramaRating {
  rating: PanoramaDifficulty;
  updatedAt: number;
}

let cloudRatingsSynced = false;

function readRatings(): Record<string, StoredPanoramaRating> {
  try {
    const raw = localStorage.getItem(RATINGS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, number | StoredPanoramaRating>;
    const out: Record<string, StoredPanoramaRating> = {};
    for (const [id, val] of Object.entries(data)) {
      if (typeof val === 'number' && (val === 1 || val === 2 || val === 3)) {
        out[id] = { rating: val, updatedAt: 0 };
        continue;
      }
      if (val && typeof val === 'object' && 'rating' in val) {
        const rating = Number(val.rating);
        if (rating === 1 || rating === 2 || rating === 3) {
          out[id] = { rating, updatedAt: Number(val.updatedAt ?? 0) };
        }
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeRatings(map: Record<string, StoredPanoramaRating>): void {
  safeStorageSet(RATINGS_KEY, JSON.stringify(map));
}

export function isPanoramaRatingsCloudEnabled(): boolean {
  return isFirebaseConfigured() && cloudRatingsSynced;
}

export function getPanoramaDifficulty(id: string): PanoramaDifficulty | null {
  return readRatings()[id]?.rating ?? null;
}

export function setPanoramaDifficulty(id: string, rating: PanoramaDifficulty | null): void {
  const map = readRatings();
  const updatedAt = Date.now();
  if (rating == null) {
    delete map[id];
    writeRatings(map);
    void removePanoramaRatingFromFirestore(id).catch((err) => {
      console.warn('[ChronoPin] Panorama rating delete failed:', err);
    });
    return;
  }
  map[id] = { rating, updatedAt };
  writeRatings(map);
  void pushPanoramaRatingToFirestore(id, rating, updatedAt).catch((err) => {
    console.warn('[ChronoPin] Panorama rating push failed:', err);
  });
}

/** Merge Firestore ratings with local cache (newest updatedAt wins). */
export async function syncPanoramaRatingsFromCloud(): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    cloudRatingsSynced = false;
    return false;
  }

  try {
    const remote = await fetchPanoramaRatingsFromFirestore();
    const local = readRatings();
    const merged: Record<string, StoredPanoramaRating> = { ...local };
    let changed = false;

    for (const [id, remoteEntry] of Object.entries(remote)) {
      const localEntry = local[id];
      if (!localEntry || remoteEntry.updatedAt >= localEntry.updatedAt) {
        if (!localEntry || localEntry.rating !== remoteEntry.rating) changed = true;
        merged[id] = { rating: remoteEntry.rating, updatedAt: remoteEntry.updatedAt };
      }
    }

    for (const [id, localEntry] of Object.entries(local)) {
      const remoteEntry = remote[id];
      if (!remoteEntry || localEntry.updatedAt > remoteEntry.updatedAt) {
        await pushPanoramaRatingToFirestore(id, localEntry.rating, localEntry.updatedAt);
      }
    }

    const before = JSON.stringify(local);
    writeRatings(merged);
    cloudRatingsSynced = true;
    return changed || before !== JSON.stringify(merged);
  } catch (err) {
    console.warn('[ChronoPin] Panorama ratings cloud sync failed:', err);
    return false;
  }
}

const DIFFICULTY_LABELS: Record<PanoramaDifficulty, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

export function difficultyLabel(rating: PanoramaDifficulty): string {
  return DIFFICULTY_LABELS[rating];
}

export function panoramaRatingSaveHint(): string {
  return isPanoramaRatingsCloudEnabled()
    ? '1★ easy · 2★ medium · 3★ hard — tap to rate (synced to cloud)'
    : '1★ easy · 2★ medium · 3★ hard — tap to rate (saved locally until cloud sync)';
}

/** Interactive or read-only star row for library UI. */
export function renderPanoramaDifficultyStars(
  id: string,
  options?: { interactive?: boolean; compact?: boolean },
): string {
  const rating = getPanoramaDifficulty(id);
  const interactive = options?.interactive ?? false;
  const compact = options?.compact ?? false;
  const label = rating ? difficultyLabel(rating) : 'Unrated';

  const stars = ([1, 2, 3] as const)
    .map((n) => {
      const filled = rating != null && n <= rating;
      const attrs = interactive
        ? ` type="button" data-pano-rating="${n}" data-pano-id="${id}" aria-label="Rate ${n} star${n === 1 ? '' : 's'} — ${difficultyLabel(n)}"`
        : '';
      const tag = interactive ? 'button' : 'span';
      return `<${tag} class="pano-star ${filled ? 'filled' : ''}"${attrs} aria-hidden="${interactive ? 'false' : 'true'}">★</${tag}>`;
    })
    .join('');

  return `<div class="pano-difficulty ${compact ? 'pano-difficulty-compact' : ''}" role="${interactive ? 'group' : 'img'}" aria-label="Difficulty: ${label}">
    <span class="pano-difficulty-stars">${stars}</span>
    ${compact ? '' : `<span class="pano-difficulty-label">${label}</span>`}
  </div>`;
}
