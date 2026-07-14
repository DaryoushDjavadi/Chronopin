import {
  getMapillaryLivePanoramaAssets,
  getMapillaryLiveResolvedCount,
  isMapillaryLiveLibraryEnabled,
  readMapillaryLivePrefs,
} from './mapillary-live-catalog';
import { isMapillaryLiveEnabled } from './mapillary-api';

export function renderMapillaryLiveOverlayHtml(open: boolean, status: string | null): string {
  if (!isMapillaryLiveEnabled()) return '';

  const prefs = readMapillaryLivePrefs();
  const total = getMapillaryLivePanoramaAssets().length;
  const resolved = getMapillaryLiveResolvedCount();
  const libraryOn = isMapillaryLiveLibraryEnabled();

  return `
    <div
      class="mapillary-overlay ${open ? 'open' : ''}"
      aria-hidden="${!open}"
      ${open ? '' : 'inert'}
      data-mapillary-overlay
    >
      <div class="mapillary-backdrop" data-action="close-mapillary-setup" aria-hidden="true"></div>
      <div class="mapillary-panel" role="dialog" aria-label="Mapillary Live settings" aria-modal="true">
        <div class="mapillary-panel-header">
          <button type="button" class="icon-btn" data-action="close-mapillary-setup" aria-label="Close">×</button>
          <div>
            <h2>Mapillary Live</h2>
            <p class="hint">Stream real 360° street panoramas via API</p>
          </div>
          <span class="tool-badge ${libraryOn ? 'tool-badge-live' : ''}">${libraryOn ? 'ON' : 'OFF'}</span>
        </div>

        <div class="mapillary-panel-body">
          <p class="mapillary-status">${resolved}/${total} city previews cached · ${libraryOn ? 'visible in library' : 'hidden from library'}</p>
          ${status ? `<p class="mapillary-action-status">${status}</p>` : ''}

          <div class="mapillary-toggle-list">
            <label class="mapillary-toggle-row">
              <span>
                <strong>Show in Panorama Library</strong>
                <span class="hint">Browse &amp; preview live scenes per city</span>
              </span>
              <input type="checkbox" data-mapillary-pref="libraryEnabled" ${prefs.libraryEnabled ? 'checked' : ''} />
            </label>
            <label class="mapillary-toggle-row">
              <span>
                <strong>Include in Classic mode</strong>
                <span class="hint">Random live panos can appear in Classic runs</span>
              </span>
              <input type="checkbox" data-mapillary-pref="includeInGameplay" ${prefs.includeInGameplay ? 'checked' : ''} ${!prefs.libraryEnabled ? 'disabled' : ''} />
            </label>
          </div>

          <div class="mapillary-action-grid">
            <button type="button" class="btn btn-secondary" data-action="mapillary-refresh-all">
              ↻ Refresh all previews
            </button>
            <button type="button" class="btn btn-secondary" data-action="mapillary-open-library">
              🗂️ Open library
            </button>
            <button type="button" class="btn btn-primary btn-lg" data-action="mapillary-play-random">
              ▶ Play random live round
            </button>
          </div>
        </div>
      </div>
    </div>`;
}
