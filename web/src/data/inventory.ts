import { inventoryIconHtml } from './inventory-icons';

export type InventoryItemId =
  | 'binoculars'
  | 'star'
  | 'compass'
  | 'map'
  | 'hourglass';

export interface InventoryItem {
  id: InventoryItemId;
  name: string;
  description: string;
  /** Usable in-game (false = placeholder / coming soon) */
  usable: boolean;
}

export const INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'binoculars',
    name: 'Binoculars',
    description: 'Spot a famous place somewhere in the area.',
    usable: true,
  },
  {
    id: 'star',
    name: 'North Star',
    description: 'Reveals the country and region of the scene.',
    usable: true,
  },
  {
    id: 'compass',
    name: 'Compass',
    description: 'Points toward the answer — coming soon.',
    usable: false,
  },
  {
    id: 'map',
    name: 'Pocket map',
    description: 'Highlights the correct continent — coming soon.',
    usable: false,
  },
  {
    id: 'hourglass',
    name: 'Time shard',
    description: 'Narrows the year in time modes — coming soon.',
    usable: false,
  },
];

/** 3×3 grid: 5 items + 4 empty padding slots (Minecraft-style). */
export const INVENTORY_SLOT_COUNT = 9;

export function getInventoryItem(id: InventoryItemId): InventoryItem | undefined {
  return INVENTORY_ITEMS.find((item) => item.id === id);
}

export function renderInventorySlotIcon(item: InventoryItem | null): string {
  if (!item) return inventoryIconHtml('empty');
  return inventoryIconHtml(item.id);
}
