import { getVisiblePanoramas, panoramaUrl } from '../lib/library';
import {
  getMapillaryLiveCacheEntry,
  getMapillaryLiveImageId,
  isMapillaryLiveGameplayEnabled,
} from '../lib/mapillary-live-catalog';
import { filterPanoramasForClassicRegion } from '../lib/classic-regions';
import type { ClassicRegionFilter, GameMode, PanoramaAsset, Round } from '../types';

function assetToRound(asset: PanoramaAsset, mode: GameMode): Round | null {
  if (asset.mapillaryLive) {
    if (!isMapillaryLiveGameplayEnabled()) return null;
    const cached = getMapillaryLiveCacheEntry(asset.id);
    const imageId = getMapillaryLiveImageId(asset.id);
    if (!imageId) return null;
    const lat = cached?.lat ?? asset.lat;
    const lng = cached?.lng ?? asset.lng;
    const label = `${asset.title}, ${asset.region.split(',')[0]}`;
    return {
      id: `${asset.id}-${mode}`,
      panoramaId: asset.id,
      modes: ['classic'],
      title: asset.title,
      panorama: '',
      answer: { lat, lng, label },
      context: asset.context,
      attribution: asset.attribution,
      license: asset.license,
      mapillaryLive: true,
      mapillaryImageId: imageId,
    };
  }

  const label = `${asset.title}, ${asset.region.split(',')[0]}`;
  const year =
    mode === 'past'
      ? asset.year ?? 1900
      : mode === 'future'
        ? 2040
        : undefined;

  return {
    id: `${asset.id}-${mode}`,
    panoramaId: asset.id,
    modes: asset.modes.includes(mode) ? [mode] : [mode],
    title: asset.title,
    panorama: panoramaUrl(asset),
    panoConfig: asset.panoConfig,
    answer: {
      lat: asset.lat,
      lng: asset.lng,
      year,
      label,
    },
    context:
      mode === 'future'
        ? `${asset.context} (Future demo — speculative ${year}.)`
        : mode === 'past' && asset.year
          ? `${asset.context} Guess the year from visual clues.`
          : asset.context,
    attribution: asset.attribution,
    license: asset.license,
    isAiGenerated: mode === 'future' ? true : asset.isAiGenerated,
  };
}

export function getRoundPool(mode: GameMode, classicRegion: ClassicRegionFilter = 'world'): Round[] {
  let panos = getVisiblePanoramas().filter((p) => {
    if (mode === 'future') return p.modes.includes('classic') || p.modes.includes('future');
    return p.modes.includes(mode);
  });
  if (mode === 'classic' && classicRegion !== 'world') {
    panos = filterPanoramasForClassicRegion(panos, classicRegion);
  }
  return panos.map((p) => assetToRound(p, mode)).filter((r): r is Round => r != null);
}

export function pickRound(
  mode: GameMode,
  excludeIds: string[] = [],
  classicRegion: ClassicRegionFilter = 'world',
): Round | null {
  const pool = getRoundPool(mode, classicRegion).filter((r) => !excludeIds.includes(r.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function getRoundById(roundId: string, mode: GameMode): Round | null {
  const pool = getRoundPool(mode);
  return pool.find((r) => r.id === roundId) ?? null;
}

export function modeLabel(mode: GameMode): string {
  const labels: Record<GameMode, string> = {
    classic: 'Classic',
    past: 'Past',
    future: 'Future',
  };
  return labels[mode];
}

export function modeDescription(mode: GameMode): string {
  const descriptions: Record<GameMode, string> = {
    classic: 'Present-day location. Pin where you are.',
    past: 'Historical scene. Pin the place and guess the year.',
    future: 'Speculative fiction. Pin the place and guess the year.',
  };
  return descriptions[mode];
}
