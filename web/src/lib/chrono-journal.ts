import { getPanoramaById, panoramaUrl } from './library';
import { safeStorageSet } from './storage';
import type { ChronoJournalEntry, GameMode, Round, ScoreResult } from '../types';

const JOURNAL_KEY = 'chronopin-journal';
const MAX_ENTRIES = 120;

function readEntries(): ChronoJournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChronoJournalEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: ChronoJournalEntry[]): void {
  safeStorageSet(JOURNAL_KEY, JSON.stringify(entries));
}

/** Good round = heart kept (within distance/year limits). */
export function isGoodRoundForJournal(score: ScoreResult): boolean {
  return !score.lostHeart && score.points > 0;
}

export function getJournalEntries(): ChronoJournalEntry[] {
  return readEntries();
}

export function getJournalCount(): number {
  return readEntries().length;
}

export function tryAddJournalEntry(
  round: Round,
  score: ScoreResult,
  mode: GameMode,
  options?: { coop?: boolean },
): boolean {
  if (!isGoodRoundForJournal(score)) return false;

  const entries = readEntries();
  if (entries.some((e) => e.id === round.id)) return false;

  const asset = getPanoramaById(round.panoramaId);
  const thumb = asset ? panoramaUrl(asset) : round.panorama;
  if (!thumb) return false;

  const entry: ChronoJournalEntry = {
    id: round.id,
    panoId: round.panoramaId,
    title: round.title,
    region: asset?.region ?? round.answer.label,
    thumb,
    score: score.points,
    maxScore: score.maxPoints,
    distanceKm: score.distanceKm,
    mode,
    date: Date.now(),
    context: round.context?.slice(0, 140) || undefined,
    coop: options?.coop ?? false,
  };

  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  writeEntries(entries);
  return true;
}
