function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensurePanoWrap(pano: HTMLElement): HTMLElement {
  const parent = pano.parentElement;
  if (parent?.classList.contains('pano-wrap')) return parent;

  const wrap = document.createElement('div');
  wrap.className = 'pano-wrap';
  parent?.insertBefore(wrap, pano);
  wrap.appendChild(pano);
  return wrap;
}

export function showPanoLoading(message = 'Loading panorama…'): void {
  const pano = document.getElementById('pano');
  if (!pano) return;

  const wrap = ensurePanoWrap(pano);
  let overlay = wrap.querySelector('[data-pano-loading]') as HTMLElement | null;
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'pano-loading';
    overlay.dataset.panoLoading = '1';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    wrap.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="pano-loading-inner">
      <div class="pano-loading-spinner" aria-hidden="true"></div>
      <p class="pano-loading-text">${escapeHtml(message)}</p>
    </div>`;
  wrap.classList.add('pano-loading-active');
}

export function hidePanoLoading(): void {
  document.querySelectorAll('.pano-wrap.pano-loading-active').forEach((wrap) => {
    wrap.classList.remove('pano-loading-active');
  });
}
