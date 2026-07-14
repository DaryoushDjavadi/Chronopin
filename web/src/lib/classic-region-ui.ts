import {
  CLASSIC_REGION_OPTIONS,
  classicRegionLabel,
  getClassicRegionPanoramaCount,
} from './classic-regions';
import type { ClassicRegionFilter } from '../types';

export function renderClassicRegionOverlayHtml(
  open: boolean,
  selectedRegion: ClassicRegionFilter,
): string {
  const chips = CLASSIC_REGION_OPTIONS.map((opt) => {
    const count = getClassicRegionPanoramaCount(opt.id);
    const disabled = count === 0;
    const selected = selectedRegion === opt.id;
    return `
      <button
        type="button"
        class="region-filter-chip ${selected ? 'selected' : ''}"
        data-action="pick-classic-region"
        data-region="${opt.id}"
        ${disabled ? 'disabled' : ''}
        aria-pressed="${selected}"
      >
        <span class="region-filter-icon" aria-hidden="true">${opt.icon}</span>
        <span class="region-filter-meta">
          <span class="region-filter-label">${opt.label}</span>
          <span class="region-filter-count">${count} scene${count === 1 ? '' : 's'}</span>
        </span>
      </button>`;
  }).join('');

  const canStart = getClassicRegionPanoramaCount(selectedRegion) > 0;

  return `
    <div
      class="classic-overlay ${open ? 'open' : ''}"
      aria-hidden="${!open}"
      ${open ? '' : 'inert'}
      data-classic-overlay
    >
      <div class="classic-backdrop" data-action="close-classic-setup" aria-hidden="true"></div>
      <div class="classic-panel" role="dialog" aria-label="Classic region" aria-modal="true">
        <div class="classic-frame">
          <div class="classic-title-bar">
            <button type="button" class="classic-back icon-btn" data-action="close-classic-setup" aria-label="Back to mode selection">←</button>
            <div class="classic-title-meta">
              <span class="classic-title">Classic</span>
              <span class="classic-subtitle">Choose region</span>
            </div>
          </div>
          <div class="classic-body">
            <p class="classic-region-hint">Pick where scenes can come from, then start your run.</p>
            <div class="region-filter-grid" role="group" aria-label="Classic region filter">
              ${chips}
            </div>
            <button
              type="button"
              class="btn btn-primary btn-lg classic-region-start"
              data-action="start-classic"
              ${canStart ? '' : 'disabled'}
            >
              Start Classic · ${classicRegionLabel(selectedRegion)}
            </button>
          </div>
        </div>
      </div>
    </div>`;
}
