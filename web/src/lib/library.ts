import { PANORAMAS, panoramaUrl } from '../data/panoramas';
import type { PanoramaAsset } from '../types';

const STORAGE_KEY = 'chronopin-hidden-panos';

export function getHiddenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function hidePanorama(id: string): void {
  const hidden = getHiddenIds();
  hidden.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]));
}

export function restoreAllPanoramas(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getVisiblePanoramas(): PanoramaAsset[] {
  const hidden = getHiddenIds();
  return PANORAMAS.filter((p) => !hidden.has(p.id));
}

export function getPanoramaById(id: string): PanoramaAsset | undefined {
  return PANORAMAS.find((p) => p.id === id);
}

export { panoramaUrl };
