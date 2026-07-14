function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mountDialog(html: string): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'app-dialog-overlay open';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  return overlay;
}

function bindDismiss(
  overlay: HTMLElement,
  onClose: () => void,
): void {
  overlay.querySelector('[data-dialog-cancel]')?.addEventListener('click', onClose);
  overlay.querySelector('.app-dialog-backdrop')?.addEventListener('click', onClose);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);
}

/** In-app confirm — replaces native `confirm()`. */
export function confirmDialog(
  message: string,
  options: {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
  } = {},
): Promise<boolean> {
  const {
    title = 'Confirm',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
  } = options;

  return new Promise((resolve) => {
    const overlay = mountDialog(`
      <div class="app-dialog-backdrop" aria-hidden="true"></div>
      <div class="app-dialog-panel" role="alertdialog" aria-modal="true" aria-labelledby="app-dialog-title">
        <h2 id="app-dialog-title" class="app-dialog-title">${escapeHtml(title)}</h2>
        <p class="app-dialog-message">${escapeHtml(message)}</p>
        <div class="app-dialog-actions">
          <button type="button" class="btn btn-secondary" data-dialog-cancel>${escapeHtml(cancelLabel)}</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-dialog-confirm>${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `);

    const finish = (result: boolean) => {
      overlay.remove();
      resolve(result);
    };

    bindDismiss(overlay, () => finish(false));
    overlay.querySelector('[data-dialog-confirm]')?.addEventListener('click', () => finish(true));
    (overlay.querySelector('[data-dialog-confirm]') as HTMLButtonElement | null)?.focus();
  });
}

/** In-app alert — replaces native `alert()`. */
export function alertDialog(message: string, title = 'Notice'): Promise<void> {
  return new Promise((resolve) => {
    const overlay = mountDialog(`
      <div class="app-dialog-backdrop" aria-hidden="true"></div>
      <div class="app-dialog-panel" role="alertdialog" aria-modal="true" aria-labelledby="app-dialog-title">
        <h2 id="app-dialog-title" class="app-dialog-title">${escapeHtml(title)}</h2>
        <p class="app-dialog-message">${escapeHtml(message)}</p>
        <div class="app-dialog-actions app-dialog-actions-single">
          <button type="button" class="btn btn-primary" data-dialog-confirm>OK</button>
        </div>
      </div>
    `);

    const finish = () => {
      overlay.remove();
      resolve();
    };

    overlay.querySelector('[data-dialog-confirm]')?.addEventListener('click', finish);
    overlay.querySelector('.app-dialog-backdrop')?.addEventListener('click', finish);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        finish();
        document.removeEventListener('keydown', onKey);
      }
    };
    document.addEventListener('keydown', onKey);
    (overlay.querySelector('[data-dialog-confirm]') as HTMLButtonElement | null)?.focus();
  });
}
