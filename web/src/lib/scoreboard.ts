import type { AvatarConfig } from '../data/lpc-catalog';
import { normalizeAvatarConfig } from '../data/lpc-catalog';
import { getProfile } from './profile';
import { safeStorageSet } from './storage';
import type { GameMode } from '../types';
import { isFirebaseConfigured } from './firebase';
import {
  fetchScoreboardFromFirestore,
  pushBestScoreToFirestore,
} from './firebase-scoreboard';

export interface ScoreboardEntry {
  id: string;
  playerId?: string;
  playerName: string;
  searchName: string;
  avatarConfig: AvatarConfig;
  /** Legacy emoji avatar id */
  avatarId?: string;
  mode: GameMode;
  score: number;
  rounds: number;
  date: string;
}

const SCOREBOARD_KEY = 'chronopin-scoreboard';
const MAX_ENTRIES = 100;

let cloudScoresCache: ScoreboardEntry[] | null = null;

function playerKey(entry: ScoreboardEntry): string {
  return entry.searchName || entry.playerName.trim().toLowerCase();
}

function dedupeBestPerPlayer(entries: ScoreboardEntry[]): ScoreboardEntry[] {
  const best = new Map<string, ScoreboardEntry>();
  for (const entry of entries) {
    const key = playerKey(entry);
    const prev = best.get(key);
    if (
      !prev ||
      entry.score > prev.score ||
      (entry.score === prev.score && entry.rounds > prev.rounds)
    ) {
      best.set(key, entry);
    }
  }
  return [...best.values()].sort(
    (a, b) => b.score - a.score || b.rounds - a.rounds || b.date.localeCompare(a.date),
  );
}

function loadEntries(): ScoreboardEntry[] {
  try {
    const raw = localStorage.getItem(SCOREBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((e) => ({
      id: String(e.id ?? ''),
      playerId: typeof e.playerId === 'string' ? e.playerId : undefined,
      playerName: String(e.playerName ?? 'Anonymous'),
      searchName: String(
        e.searchName ?? String(e.playerName ?? 'Anonymous').trim().toLowerCase(),
      ),
      avatarConfig: normalizeAvatarConfig(
        (e.avatarConfig as Partial<AvatarConfig> | undefined) ?? null,
      ),
      avatarId: typeof e.avatarId === 'string' ? e.avatarId : undefined,
      mode: e.mode as GameMode,
      score: Number(e.score ?? 0),
      rounds: Number(e.rounds ?? 0),
      date: String(e.date ?? new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}

function saveEntries(entries: ScoreboardEntry[]): void {
  safeStorageSet(SCOREBOARD_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export async function syncScoreboardFromCloud(): Promise<void> {
  if (!isFirebaseConfigured()) {
    cloudScoresCache = null;
    return;
  }
  try {
    cloudScoresCache = await fetchScoreboardFromFirestore('all');
  } catch (err) {
    console.warn('[ChronoPin] Scoreboard cloud sync failed:', err);
  }
}

export function isScoreboardCloudEnabled(): boolean {
  return isFirebaseConfigured() && cloudScoresCache !== null;
}

export function getScoreboard(filterMode?: GameMode | 'all'): ScoreboardEntry[] {
  const local = loadEntries();
  const cloud = cloudScoresCache ?? [];
  const merged = [...cloud, ...local];
  let filtered = merged;
  if (filterMode && filterMode !== 'all') {
    filtered = merged.filter((e) => e.mode === filterMode);
  }
  return dedupeBestPerPlayer(filtered);
}

export function addScoreboardEntry(
  mode: GameMode,
  score: number,
  rounds: number,
): ScoreboardEntry {
  const profile = getProfile();
  const playerName = profile?.name ?? 'Anonymous';
  const searchName = playerName.trim().toLowerCase();
  const entry: ScoreboardEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    playerId: profile?.playerId,
    playerName,
    searchName,
    avatarConfig: normalizeAvatarConfig(profile?.avatarConfig),
    mode,
    score,
    rounds,
    date: new Date().toISOString(),
  };

  const entries = loadEntries();
  const existingIdx = entries.findIndex(
    (e) => playerKey(e) === searchName && e.mode === mode,
  );
  if (existingIdx >= 0) {
    const existing = entries[existingIdx]!;
    const isBetter =
      score > existing.score || (score === existing.score && rounds > existing.rounds);
    if (!isBetter) return existing;
    entries[existingIdx] = entry;
  } else {
    entries.unshift(entry);
  }
  saveEntries(entries);

  void pushBestScoreToFirestore(entry).then(() => syncScoreboardFromCloud());

  return entry;
}

export function clearScoreboard(): void {
  localStorage.removeItem(SCOREBOARD_KEY);
}

export function formatScoreDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isScoreboardEntryMine(entry: ScoreboardEntry): boolean {
  const profile = getProfile();
  if (!profile) return false;
  const mine = profile.name.trim().toLowerCase();
  return entry.searchName === mine || entry.playerName.toLowerCase() === mine;
}

export function getPersonalBest(mode?: GameMode): number {
  const profile = getProfile();
  if (!profile) return 0;
  const entries = getScoreboard(mode);
  const mine = entries.find((e) => isScoreboardEntryMine(e));
  return mine?.score ?? 0;
}
