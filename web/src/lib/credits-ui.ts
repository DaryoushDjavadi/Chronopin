import { AVATAR_CREDITS_OGA_URL, AVATAR_EDITOR_CREDITS } from '../data/avatar-credits';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function linkifyNotes(notes: string): string {
  const escaped = escapeHtml(notes);
  return escaped.replace(
    /(https:\/\/[^\s;]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
  );
}

export function renderCreditsOverlayHtml(open: boolean): string {
  const blocks = AVATAR_EDITOR_CREDITS.map(
    (block) => `
      <article class="credits-block">
        <code class="credits-path">${escapeHtml(block.assetPath)}</code>
        <p class="credits-notes">${linkifyNotes(block.notes)}</p>
        <p class="credits-meta"><span>Licenses:</span> ${escapeHtml(block.licenses)}</p>
        <p class="credits-meta"><span>Authors:</span> ${escapeHtml(block.authors)}</p>
      </article>`,
  ).join('');

  return `
    <div
      class="credits-overlay ${open ? 'open' : ''}"
      aria-hidden="${!open}"
      ${open ? '' : 'inert'}
      data-credits-overlay
    >
      <div class="credits-backdrop" data-action="close-credits" aria-hidden="true"></div>
      <div class="credits-panel" role="dialog" aria-label="Attributes and credits" aria-modal="true">
        <div class="credits-frame">
          <div class="credits-title-bar">
            <span class="credits-title">Attributes / Credits</span>
            <button type="button" class="inv-close icon-btn" data-action="close-credits" aria-label="Close">×</button>
          </div>
          <div class="credits-body">
            <p class="credits-intro">
              Character editor assets from
              <a href="https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator" target="_blank" rel="noopener noreferrer">Universal LPC</a>.
              Prototype uses walk sprite sheets derived from the same sources.
            </p>
            <h3 class="credits-subhead">Maps &amp; panoramas</h3>
            <article class="credits-block">
              <code class="credits-path">MapLibre GL + OpenFreeMap</code>
              <p class="credits-notes">Guess map tiles and styles for the prototype guess screen.</p>
              <p class="credits-meta"><span>Licenses:</span> BSD-3-Clause (MapLibre) · see OpenFreeMap terms</p>
            </article>
            <article class="credits-block">
              <code class="credits-path">Panorama library</code>
              <p class="credits-notes">
                Wikimedia Commons (CC BY-SA), Panoramax crowdsourced imagery (CC BY-SA), and optional
                Mapillary / KartaView imports. Full file list:
                <code>web/public/panoramas/LICENSE.md</code>
              </p>
              <p class="credits-meta"><span>Viewer:</span> Pannellum (MIT)</p>
            </article>
            <h3 class="credits-subhead">Character Editor</h3>
            ${blocks}
            <p class="credits-footer-link">
              <a href="${AVATAR_CREDITS_OGA_URL}" target="_blank" rel="noopener noreferrer">LPC Character Bases on OpenGameArt</a>
            </p>
          </div>
        </div>
      </div>
    </div>`;
}
