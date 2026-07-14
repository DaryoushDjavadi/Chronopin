import { INVENTORY_ITEMS, INVENTORY_SLOT_COUNT, renderInventorySlotIcon } from '../data/inventory';
import { inventoryIconHtml } from '../data/inventory-icons';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderInventoryOverlayHtml(
  open: boolean,
  usedItemIds: string[],
): string {
  const slots: Array<(typeof INVENTORY_ITEMS)[number] | null> = [
    ...INVENTORY_ITEMS,
    ...Array(Math.max(0, INVENTORY_SLOT_COUNT - INVENTORY_ITEMS.length)).fill(null),
  ];

  const slotHtml = slots
    .map((item) => {
      if (!item) {
        return `<li class="inv-slot inv-slot-empty" aria-hidden="true"></li>`;
      }

      const spent = usedItemIds.includes(item.id);
      const locked = !item.usable;
      const disabled = locked || spent;
      const statusTag = locked ? 'Soon' : spent ? 'Used' : '';

      return `
        <li>
          <button
            type="button"
            class="inv-slot ${disabled ? 'inv-slot-disabled' : ''} ${spent ? 'inv-slot-spent' : ''} ${locked ? 'inv-slot-locked' : ''}"
            data-item="${item.id}"
            data-inv-name="${escapeHtml(item.name)}"
            data-inv-desc="${escapeHtml(item.description)}"
            ${disabled ? 'aria-disabled="true" tabindex="-1"' : ''}
            aria-label="${escapeHtml(item.name)}${statusTag ? ` · ${statusTag}` : ''}"
            aria-describedby="inv-tip-${item.id}"
          >
            ${renderInventorySlotIcon(item)}
            ${statusTag ? `<span class="inv-slot-tag">${statusTag}</span>` : ''}
            ${locked ? `<span class="inv-slot-lock">${inventoryIconHtml('lock')}</span>` : ''}
            <span class="inv-tooltip" id="inv-tip-${item.id}" role="tooltip">
              <strong>${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(item.description)}</span>
            </span>
          </button>
        </li>`;
    })
    .join('');

  const defaultItem = INVENTORY_ITEMS.find((i) => i.usable && !usedItemIds.includes(i.id));

  return `
    <div
      class="inventory-overlay ${open ? 'open' : ''}"
      aria-hidden="${!open}"
      data-inventory-overlay
      data-used-items="${escapeHtml(usedItemIds.join(','))}"
    >
      <div class="inventory-backdrop" data-action="close-inventory" aria-hidden="true"></div>
      <div class="inventory-panel" role="dialog" aria-label="Inventory" aria-modal="true">
        <div class="inv-frame">
          <div class="inv-title-bar">
            <span class="inv-title">Inventory</span>
            <button type="button" class="inv-close icon-btn" data-action="close-inventory" aria-label="Close inventory">×</button>
          </div>

          <div class="inv-body">
            <p class="inv-hint">Tap an item · one use per round</p>

            <ul class="inv-slots" aria-label="Inventory slots">
              ${slotHtml}
            </ul>

            <div class="inv-detail" data-inv-detail aria-live="polite">
              <span class="inv-detail-name">${escapeHtml(defaultItem?.name ?? '—')}</span>
              <span class="inv-detail-desc">${escapeHtml(defaultItem?.description ?? 'Hover or tap an item for details')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

export function bindInventoryDetailPreview(root: ParentNode = document): void {
  const slots = root.querySelector('.inv-slots');
  if (!slots || slots.hasAttribute('data-inv-preview')) return;
  slots.setAttribute('data-inv-preview', 'true');

  const showFromEvent = (e: Event) => {
    const slot = (e.target as Element).closest<HTMLElement>('.inv-slot[data-item]');
    if (slot) updateInventoryDetail(root, slot);
  };

  slots.addEventListener('pointerover', showFromEvent);
  slots.addEventListener('focusin', showFromEvent);
}

function updateInventoryDetail(root: ParentNode, slot: HTMLElement): void {
  const detail = root.querySelector('[data-inv-detail]');
  if (!detail) return;
  const nameEl = detail.querySelector('.inv-detail-name');
  const descEl = detail.querySelector('.inv-detail-desc');
  if (nameEl) nameEl.textContent = slot.dataset.invName ?? '';
  if (descEl) descEl.textContent = slot.dataset.invDesc ?? '';
}

export function updateInventoryDetailByItemId(root: ParentNode, itemId: string): void {
  const slot = root.querySelector<HTMLElement>(`.inv-slot[data-item="${itemId}"]`);
  if (slot) updateInventoryDetail(root, slot);
}
