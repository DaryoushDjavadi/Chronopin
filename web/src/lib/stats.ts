import { continentFromLatLng, CONTINENT_LABELS, type ContinentId } from './regions';

export interface RegionStat {
  correct: number;
  total: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  roundsPlayed: number;
  roundsWon: number;
  roundsLost: number;
  totalScore: number;
  bestRunScore: number;
  bestRoundStreak: number;
  regions: Partial<Record<ContinentId, RegionStat>>;
}

const STATS_KEY = 'chronopin-player-stats';

const EMPTY_STATS: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  roundsPlayed: 0,
  roundsWon: 0,
  roundsLost: 0,
  totalScore: 0,
  bestRunScore: 0,
  bestRoundStreak: 0,
  regions: {},
};

export function getStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...EMPTY_STATS, regions: {} };
    return { ...EMPTY_STATS, ...JSON.parse(raw), regions: { ...JSON.parse(raw).regions } };
  } catch {
    return { ...EMPTY_STATS, regions: {} };
  }
}

function saveStats(stats: PlayerStats): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

let currentRunStreak = 0;

export function resetRunStreak(): void {
  currentRunStreak = 0;
}

export function recordRoundResult(
  answerLat: number,
  answerLng: number,
  distanceKm: number,
  roundPoints: number,
  lostHeart: boolean,
  distanceFailKm: number,
): void {
  const stats = getStats();
  stats.roundsPlayed++;
  stats.totalScore += roundPoints;

  if (lostHeart) {
    stats.roundsLost++;
    currentRunStreak = 0;
  } else {
    stats.roundsWon++;
    currentRunStreak++;
    if (currentRunStreak > stats.bestRoundStreak) {
      stats.bestRoundStreak = currentRunStreak;
    }
  }

  const continent = continentFromLatLng(answerLat, answerLng);
  if (!stats.regions[continent]) {
    stats.regions[continent] = { correct: 0, total: 0 };
  }
  stats.regions[continent]!.total++;
  if (distanceKm <= distanceFailKm) {
    stats.regions[continent]!.correct++;
  }

  saveStats(stats);
}

export function recordGameEnd(runScore: number, _rounds: number, lostAllHearts: boolean): void {
  const stats = getStats();
  stats.gamesPlayed++;
  if (lostAllHearts) {
    stats.gamesLost++;
  } else {
    stats.gamesWon++;
  }
  if (runScore > stats.bestRunScore) {
    stats.bestRunScore = runScore;
  }
  saveStats(stats);
  currentRunStreak = 0;
}

export function getStrongestRegion(): { id: ContinentId; label: string; pct: number } | null {
  const stats = getStats();
  let best: { id: ContinentId; pct: number } | null = null;

  for (const [id, data] of Object.entries(stats.regions) as [ContinentId, RegionStat][]) {
    if (!data || data.total < 2) continue;
    const pct = Math.round((data.correct / data.total) * 100);
    if (!best || pct > best.pct || (pct === best.pct && data.total > (stats.regions[best.id]?.total ?? 0))) {
      best = { id, pct };
    }
  }

  if (!best) return null;
  return { id: best.id, label: CONTINENT_LABELS[best.id], pct: best.pct };
}

export function getRegionBreakdown(): Array<{ label: string; pct: number; total: number }> {
  const stats = getStats();
  return (Object.entries(stats.regions) as [ContinentId, RegionStat][])
    .filter(([, d]) => d && d.total > 0)
    .map(([id, d]) => ({
      label: CONTINENT_LABELS[id],
      pct: Math.round((d.correct / d.total) * 100),
      total: d.total,
    }))
    .sort((a, b) => b.pct - a.pct || b.total - a.total);
}

export function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function winRate(stats: PlayerStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
}
