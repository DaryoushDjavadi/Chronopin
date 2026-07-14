import { getRoundPool } from '../data/rounds';
import type { Round } from '../types';
import { safeStorageSet } from './storage';

const DAILY_KEY = 'chronopin-daily';

interface DailyStore {
  /** UTC date YYYY-MM-DD when the scene was completed */
  completedDate: string | null;
  /** UTC date when the reward wheel was spun */
  wheelSpunDate: string | null;
}

function loadDaily(): DailyStore {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return { completedDate: null, wheelSpunDate: null };
    const parsed = JSON.parse(raw) as Partial<DailyStore>;
    return {
      completedDate: parsed.completedDate ?? null,
      wheelSpunDate: parsed.wheelSpunDate ?? null,
    };
  } catch {
    return { completedDate: null, wheelSpunDate: null };
  }
}

function saveDaily(store: DailyStore): void {
  safeStorageSet(DAILY_KEY, JSON.stringify(store));
}

export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isDailyCompletedToday(): boolean {
  return loadDaily().completedDate === getTodayKey();
}

export function isDailyWheelPending(): boolean {
  const d = loadDaily();
  return d.completedDate === getTodayKey() && d.wheelSpunDate !== getTodayKey();
}

export function isDailyFullyDoneToday(): boolean {
  const d = loadDaily();
  return d.completedDate === getTodayKey() && d.wheelSpunDate === getTodayKey();
}

/** Can start today's daily scene (not yet completed). */
export function canPlayDaily(): boolean {
  return !isDailyCompletedToday();
}

export function markDailyCompleted(): void {
  const store = loadDaily();
  store.completedDate = getTodayKey();
  saveDaily(store);
}

export function markDailyWheelSpun(): void {
  const store = loadDaily();
  store.wheelSpunDate = getTodayKey();
  saveDaily(store);
}

export function resetDailyForTesting(): void {
  saveDaily({ completedDate: null, wheelSpunDate: null });
}

export function getNextDailyResetMs(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(0, next - now.getTime());
}

export function formatDailyCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Same scene for everyone on a given UTC day. */
export function pickDailyRound(): Round | null {
  const pool = getRoundPool('classic', 'world');
  if (pool.length === 0) return null;
  const key = getTodayKey();
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  return pool[seed % pool.length]!;
}
