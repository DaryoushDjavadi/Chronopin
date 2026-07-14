/** 16×16 pixel-style SVG icons for inventory slots (scaled up with crisp edges). */

export const INVENTORY_ICON_SVG: Record<string, string> = {
  binoculars: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="1" y="5" width="5" height="5" fill="#4a5568"/><rect x="2" y="6" width="3" height="3" fill="#7aabcc"/>
    <rect x="10" y="5" width="5" height="5" fill="#4a5568"/><rect x="11" y="6" width="3" height="3" fill="#7aabcc"/>
    <rect x="6" y="7" width="4" height="2" fill="#6b7280"/><rect x="5" y="8" width="1" height="1" fill="#9ca3af"/><rect x="10" y="8" width="1" height="1" fill="#9ca3af"/>
  </svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="7" y="1" width="2" height="2" fill="#fde68a"/><rect x="6" y="3" width="4" height="1" fill="#fde68a"/>
    <rect x="1" y="6" width="2" height="2" fill="#fde68a"/><rect x="13" y="6" width="2" height="2" fill="#fde68a"/>
    <rect x="3" y="7" width="10" height="2" fill="#fbbf24"/><rect x="5" y="5" width="6" height="1" fill="#fbbf24"/>
    <rect x="6" y="9" width="4" height="1" fill="#fbbf24"/><rect x="7" y="10" width="2" height="4" fill="#f59e0b"/>
    <rect x="5" y="11" width="1" height="2" fill="#d97706"/><rect x="10" y="11" width="1" height="2" fill="#d97706"/>
  </svg>`,
  compass: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="4" y="2" width="8" height="1" fill="#78716c"/><rect x="3" y="3" width="10" height="10" fill="#57534e"/>
    <rect x="4" y="4" width="8" height="8" fill="#d6d3d1"/><rect x="7" y="5" width="2" height="2" fill="#ef4444"/>
    <rect x="6" y="7" width="4" height="2" fill="#1e293b"/><rect x="7" y="9" width="2" height="2" fill="#3b82f6"/>
    <rect x="2" y="7" width="1" height="2" fill="#78716c"/><rect x="13" y="7" width="1" height="2" fill="#78716c"/>
  </svg>`,
  map: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="2" y="3" width="12" height="10" fill="#d4a574"/><rect x="3" y="4" width="10" height="8" fill="#86efac"/>
    <rect x="4" y="6" width="3" height="2" fill="#4ade80"/><rect x="9" y="5" width="2" height="3" fill="#22c55e"/>
    <rect x="6" y="9" width="4" height="1" fill="#166534"/><rect x="2" y="3" width="1" height="10" fill="#92400e"/>
    <rect x="13" y="3" width="1" height="10" fill="#92400e"/><rect x="5" y="7" width="2" height="2" fill="#ef4444"/>
  </svg>`,
  hourglass: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="4" y="2" width="8" height="2" fill="#a8a29e"/><rect x="3" y="4" width="10" height="2" fill="#78716c"/>
    <rect x="5" y="6" width="6" height="1" fill="#fde68a"/><rect x="6" y="7" width="4" height="1" fill="#fbbf24"/>
    <rect x="7" y="8" width="2" height="1" fill="#f59e0b"/><rect x="6" y="9" width="4" height="1" fill="#fbbf24"/>
    <rect x="5" y="10" width="6" height="1" fill="#fde68a"/><rect x="3" y="11" width="10" height="2" fill="#78716c"/>
    <rect x="4" y="13" width="8" height="1" fill="#a8a29e"/>
  </svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="5" y="7" width="6" height="5" fill="#9ca3af"/><rect x="6" y="8" width="4" height="3" fill="#6b7280"/>
    <rect x="6" y="4" width="4" height="4" fill="none" stroke="#9ca3af" stroke-width="2"/>
  </svg>`,
  empty: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"></svg>`,
};

export function inventoryIconHtml(id: string): string {
  const svg = INVENTORY_ICON_SVG[id] ?? INVENTORY_ICON_SVG.empty;
  return `<span class="inv-slot-icon" aria-hidden="true">${svg}</span>`;
}
