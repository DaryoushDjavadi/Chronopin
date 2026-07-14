import type { AvatarConfig } from '../data/lpc-catalog';
import { normalizeAvatarConfig } from '../data/lpc-catalog';
import { getProfile } from './profile';
import type { GameMode } from '../types';

export interface ScoreboardEntry {
  id: string;
  playerName: string;
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

function loadEntries(): ScoreboardEntry[] {
  try {
    const raw = localStorage.getItem(SCOREBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((e) => ({
      id: String(e.id ?? ''),
      playerName: String(e.playerName ?? 'Anonymous'),
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
  localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function getScoreboard(filterMode?: GameMode | 'all'): ScoreboardEntry[] {
  let entries = loadEntries();
  if (filterMode && filterMode !== 'all') {
    entries = entries.filter((e) => e.mode === filterMode);
  }
  return entries.sort((a, b) => b.score - a.score || b.rounds - a.rounds);
}

export function addScoreboardEntry(
  mode: GameMode,
  score: number,
  rounds: number,
): ScoreboardEntry {
  const profile = getProfile();
  const entry: ScoreboardEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    playerName: profile?.name ?? 'Anonymous',
    avatarConfig: normalizeAvatarConfig(profile?.avatarConfig),
    mode,
    score,
    rounds,
    date: new Date().toISOString(),
  };
  const entries = [entry, ...loadEntries()];
  saveEntries(entries);
  return entry;
}

export function clearScoreboard(): void {
  localStorage.removeItem(SCOREBOARD_KEY);
}

export function formatScoreDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getPersonalBest(mode?: GameMode): number {
  const profile = getProfile();
  if (!profile) return 0;
  const entries = getScoreboard(mode);
  const mine = entries.filter((e) => e.playerName === profile.name);
  return mine.length > 0 ? mine[0]!.score : 0;
}
