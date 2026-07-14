import type { InventoryItemId } from '../data/inventory';
import { safeStorageSet } from './storage';

const STASH_KEY = 'chronopin-stash';

export interface PlayerStash {
  itemCharges: Partial<Record<InventoryItemId, number>>;
  bonusHeartsNextRun: number;
  bonusPointsBank: number;
}

const EMPTY: PlayerStash = {
  itemCharges: {},
  bonusHeartsNextRun: 0,
  bonusPointsBank: 0,
};

function loadStash(): PlayerStash {
  try {
    const raw = localStorage.getItem(STASH_KEY);
    if (!raw) return { ...EMPTY, itemCharges: {} };
    const parsed = JSON.parse(raw) as Partial<PlayerStash>;
    return {
      itemCharges: { ...(parsed.itemCharges ?? {}) },
      bonusHeartsNextRun: Number(parsed.bonusHeartsNextRun ?? 0),
      bonusPointsBank: Number(parsed.bonusPointsBank ?? 0),
    };
  } catch {
    return { ...EMPTY, itemCharges: {} };
  }
}

function saveStash(stash: PlayerStash): void {
  safeStorageSet(STASH_KEY, JSON.stringify(stash));
}

export function getStash(): PlayerStash {
  return loadStash();
}

export function getStashItemCharges(itemId: InventoryItemId): number {
  return loadStash().itemCharges[itemId] ?? 0;
}

export function addStashItemCharge(itemId: InventoryItemId, amount = 1): void {
  const stash = loadStash();
  stash.itemCharges[itemId] = (stash.itemCharges[itemId] ?? 0) + amount;
  saveStash(stash);
}

export function consumeStashItemCharge(itemId: InventoryItemId): boolean {
  const stash = loadStash();
  const current = stash.itemCharges[itemId] ?? 0;
  if (current <= 0) return false;
  stash.itemCharges[itemId] = current - 1;
  if (stash.itemCharges[itemId] === 0) delete stash.itemCharges[itemId];
  saveStash(stash);
  return true;
}

export function addBonusHeartsNextRun(amount = 1): void {
  const stash = loadStash();
  stash.bonusHeartsNextRun += amount;
  saveStash(stash);
}

export function takeBonusHeartsForRun(): number {
  const stash = loadStash();
  const hearts = stash.bonusHeartsNextRun;
  stash.bonusHeartsNextRun = 0;
  saveStash(stash);
  return hearts;
}

export function addBonusPoints(amount: number): void {
  const stash = loadStash();
  stash.bonusPointsBank += amount;
  saveStash(stash);
}

export function takeBonusPointsForRun(): number {
  const stash = loadStash();
  const pts = stash.bonusPointsBank;
  stash.bonusPointsBank = 0;
  saveStash(stash);
  return pts;
}

/** Max uses per round = 1 base + stash charges for that item. */
export function maxItemUsesPerRound(itemId: InventoryItemId): number {
  return 1 + getStashItemCharges(itemId);
}

export function countItemUsesThisRound(usedIds: string[], itemId: InventoryItemId): number {
  return usedIds.filter((id) => id === itemId).length;
}

export function canUseInventoryItem(
  itemId: InventoryItemId,
  usable: boolean,
  usedIds: string[],
): boolean {
  const uses = countItemUsesThisRound(usedIds, itemId);
  const max = maxItemUsesPerRound(itemId);
  if (uses >= max) return false;
  if (usable) return true;
  return uses >= 1 && getStashItemCharges(itemId) > 0;
}
