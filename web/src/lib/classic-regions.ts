import { getVisiblePanoramas } from './library';
import { CONTINENT_LABELS, continentFromLatLng, type ContinentId } from './regions';
import type { PanoramaAsset, ClassicRegionFilter } from '../types';

export type { ClassicRegionFilter };

export const CLASSIC_REGION_OPTIONS: Array<{
  id: ClassicRegionFilter;
  label: string;
  icon: string;
}> = [
  { id: 'world', label: 'Worldwide', icon: '🌍' },
  { id: 'europe', label: 'Europe', icon: '🇪🇺' },
  { id: 'asia', label: 'Asia', icon: '🌏' },
  { id: 'north_america', label: 'North America', icon: '🗽' },
  { id: 'south_america', label: 'South America', icon: '🌎' },
  { id: 'africa', label: 'Africa', icon: '🌍' },
  { id: 'oceania', label: 'Oceania', icon: '🦘' },
];

export function panoramaContinent(asset: PanoramaAsset): ContinentId {
  return continentFromLatLng(asset.lat, asset.lng);
}

export function filterPanoramasForClassicRegion(
  panoramas: PanoramaAsset[],
  region: ClassicRegionFilter,
): PanoramaAsset[] {
  if (region === 'world') return panoramas;
  return panoramas.filter((p) => panoramaContinent(p) === region);
}

export function getClassicPanoramas(region: ClassicRegionFilter = 'world'): PanoramaAsset[] {
  const classic = getVisiblePanoramas().filter((p) => p.modes.includes('classic'));
  return filterPanoramasForClassicRegion(classic, region);
}

export function getClassicRegionPanoramaCount(region: ClassicRegionFilter): number {
  return getClassicPanoramas(region).length;
}

export function classicRegionLabel(region: ClassicRegionFilter): string {
  if (region === 'world') return 'Worldwide';
  return CONTINENT_LABELS[region];
}
