import { INVENTORY_ITEMS } from '../data/inventory';
import type { AdminPlayerRow } from './firebase-admin';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderAdminOverlayHtml(
  open: boolean,
  query: string,
  results: AdminPlayerRow[],
  selectedUid: string | null,
  status: string | null,
): string {
  if (!open) return '';

  const selected = results.find((r) => r.uid === selectedUid) ?? results[0] ?? null;
  const itemOptions = INVENTORY_ITEMS.map(
    (item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`,
  ).join('');

  return `
    <div class="admin-overlay" data-admin-overlay role="dialog" aria-modal="true" aria-label="Admin panel">
      <div class="admin-panel">
        <header class="admin-header">
          <h2>Admin</h2>
          <button type="button" class="icon-btn" data-action="close-admin" aria-label="Close">✕</button>
        </header>
        <p class="admin-hint">Manage players, stash items, and scores. Admin-only.</p>
        ${status ? `<p class="admin-status">${escapeHtml(status)}</p>` : ''}

        <label class="field-label" for="admin-search">Find player</label>
        <input id="admin-search" class="text-input" type="search" value="${escapeHtml(query)}" placeholder="Name…" autocomplete="off" />

        <div class="admin-results">
          ${
            results.length === 0
              ? '<p class="admin-empty">No players — type a name to search.</p>'
              : results
                  .map(
                    (r) => `
              <button type="button" class="admin-player-row ${selected?.uid === r.uid ? 'selected' : ''}" data-action="admin-pick" data-uid="${r.uid}">
                <strong>${escapeHtml(r.name)}</strong>
                <span>${escapeHtml(r.searchName)}</span>
              </button>`,
                  )
                  .join('')
          }
        </div>

        ${
          selected
            ? `
        <div class="admin-actions">
          <p class="admin-target">Selected: <strong>${escapeHtml(selected.name)}</strong></p>
          <div class="admin-grant-row">
            <select class="text-input admin-item-select" data-admin-item>
              ${itemOptions}
            </select>
            <input class="text-input admin-amount-input" type="number" min="1" max="99" value="3" data-admin-amount />
            <button type="button" class="btn btn-primary btn-sm" data-action="admin-grant-item">Grant items</button>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-action="admin-grant-hearts">+1 bonus heart (next run)</button>
          <button type="button" class="btn btn-danger btn-sm" data-action="admin-delete-player" data-name="${escapeHtml(selected.name)}">Delete player account</button>
        </div>`
            : ''
        }
      </div>
    </div>`;
}
