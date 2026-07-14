import { safeStorageSet } from './storage';

const PROGRESSION_KEY = 'chronopin-progression';

/** XP needed to reach each level (index = level - 1). */
const LEVEL_XP: number[] = [0, 150, 350, 600, 900, 1300, 1800, 2400, 3100, 3900, 4800];

export interface PlayerProgression {
  xp: number;
  lifetimeXp: number;
}

export interface XpAwardResult {
  amount: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  totalXp: number;
}

const EMPTY: PlayerProgression = { xp: 0, lifetimeXp: 0 };

export function getProgression(): PlayerProgression {
  try {
    const raw = localStorage.getItem(PROGRESSION_KEY);
    if (!raw) return { ...EMPTY };
    const data = JSON.parse(raw) as Partial<PlayerProgression>;
    return {
      xp: Math.max(0, Number(data.xp) || 0),
      lifetimeXp: Math.max(0, Number(data.lifetimeXp) || 0),
    };
  } catch {
    return { ...EMPTY };
  }
}

function saveProgression(prog: PlayerProgression): void {
  safeStorageSet(PROGRESSION_KEY, JSON.stringify(prog));
}

export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  const idx = level - 1;
  if (idx < LEVEL_XP.length) return LEVEL_XP[idx]!;
  const last = LEVEL_XP[LEVEL_XP.length - 1]!;
  const extraLevels = level - LEVEL_XP.length;
  return last + extraLevels * 600;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]!) {
      level = i + 1;
      break;
    }
  }
  if (xp >= LEVEL_XP[LEVEL_XP.length - 1]!) {
    const beyond = xp - LEVEL_XP[LEVEL_XP.length - 1]!;
    level = LEVEL_XP.length + Math.floor(beyond / 600);
  }
  return Math.max(1, level);
}

export function xpProgressInLevel(xp: number): {
  level: number;
  current: number;
  needed: number;
  pct: number;
} {
  const level = levelFromXp(xp);
  const floor = xpRequiredForLevel(level);
  const ceiling = xpRequiredForLevel(level + 1);
  const needed = Math.max(1, ceiling - floor);
  const current = xp - floor;
  const pct = Math.min(100, Math.round((current / needed) * 100));
  return { level, current, needed, pct };
}

export function getLevelTitle(level: number): string {
  if (level >= 20) return 'Chrono Master';
  if (level >= 15) return 'Time Walker';
  if (level >= 10) return 'Globe Trotter';
  if (level >= 7) return 'Pathfinder';
  if (level >= 5) return 'Scout';
  if (level >= 3) return 'Explorer';
  return 'Rookie';
}

/** Placeholder perks — wired up later for real bonuses. */
export function getLevelPerks(level: number): { unlocked: string[]; upcoming: string[] } {
  const unlocked: string[] = [];
  const upcoming: string[] = [];

  if (level >= 2) unlocked.push('Explorer profile flair');
  else upcoming.push('Lv 2 · Explorer flair');

  if (level >= 5) unlocked.push('Bonus heart on run start (soon)');
  else upcoming.push('Lv 5 · Extra heart');

  if (level >= 8) unlocked.push('Exclusive avatar unlocks (soon)');
  else upcoming.push('Lv 8 · Avatar items');

  if (level >= 12) unlocked.push('Daily XP boost (soon)');
  else upcoming.push('Lv 12 · Daily boost');

  return { unlocked, upcoming };
}

export function awardXp(amount: number): XpAwardResult {
  const gain = Math.max(0, Math.round(amount));
  const prog = getProgression();
  const oldLevel = levelFromXp(prog.xp);
  prog.xp += gain;
  prog.lifetimeXp += gain;
  saveProgression(prog);
  const newLevel = levelFromXp(prog.xp);
  return {
    amount: gain,
    leveledUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
    totalXp: prog.xp,
  };
}

export function awardXpForRound(
  points: number,
  maxPoints: number,
  lostHeart: boolean,
  options?: { daily?: boolean },
): XpAwardResult {
  const ratio = maxPoints > 0 ? points / maxPoints : 0;
  let amount = Math.round(12 + ratio * 88);
  if (!lostHeart) amount += 20;
  if (options?.daily) amount += 40;
  return awardXp(amount);
}

export function awardXpForRunEnd(won: boolean, rounds: number): XpAwardResult {
  const amount = won ? 60 + rounds * 8 : 15 + rounds * 3;
  return awardXp(amount);
}

export function awardXpForCoop(points: number, maxPoints: number): XpAwardResult {
  const ratio = maxPoints > 0 ? points / maxPoints : 0;
  return awardXp(Math.round(20 + ratio * 80));
}

export function renderLevelBadge(level: number, compact = false): string {
  const title = getLevelTitle(level);
  return compact
    ? `<span class="level-badge" title="${title}">Lv ${level}</span>`
    : `<span class="level-badge level-badge-lg" title="${title}"><span class="level-badge-num">${level}</span><span class="level-badge-label">${title}</span></span>`;
}

export function renderXpGainBanner(
  award: XpAwardResult | import('../types').XpAwardSnapshot | null | undefined,
): string {
  if (!award || award.amount <= 0) return '';
  return `
    <div class="xp-gain-banner">
      <span class="xp-gain-spark" aria-hidden="true">✦</span>
      <span class="xp-gain-amount">+${award.amount.toLocaleString('en-GB')} XP</span>
    </div>`;
}

function snapshotAward(award: XpAwardResult): import('../types').XpAwardSnapshot {
  return {
    amount: award.amount,
    leveledUp: award.leveledUp,
    oldLevel: award.oldLevel,
    newLevel: award.newLevel,
  };
}

export { snapshotAward as xpAwardSnapshot };

export function renderXpBar(xp: number): string {
  const { level, current, needed, pct } = xpProgressInLevel(xp);
  const perks = getLevelPerks(level);
  return `
    <div class="xp-panel">
      <div class="xp-panel-head">
        ${renderLevelBadge(level)}
        <span class="xp-panel-meta">${current.toLocaleString('en-GB')} / ${needed.toLocaleString('en-GB')} XP</span>
      </div>
      <div class="xp-bar-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="xp-bar-fill" style="width:${pct}%"></div>
      </div>
      <p class="xp-panel-total">${xp.toLocaleString('en-GB')} total XP · ${getLevelTitle(level)}</p>
      ${
        perks.unlocked.length > 0
          ? `<ul class="xp-perk-list unlocked">${perks.unlocked.map((p) => `<li>✓ ${p}</li>`).join('')}</ul>`
          : ''
      }
      ${
        perks.upcoming.length > 0
          ? `<p class="xp-perk-soon">Next: ${perks.upcoming[0]}</p>`
          : ''
      }
    </div>`;
}
