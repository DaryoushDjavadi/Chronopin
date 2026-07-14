import type { XpAwardSnapshot } from '../types';
import { getLevelPerks, getLevelTitle } from './progression';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function newlyUnlockedPerk(oldLevel: number, newLevel: number): string | null {
  const before = new Set(getLevelPerks(oldLevel).unlocked);
  const fresh = getLevelPerks(newLevel).unlocked.filter((p) => !before.has(p));
  return fresh[0] ?? null;
}

function renderParticles(): string {
  const colors = ['#3dd6c6', '#8b7cf6', '#ffd166', '#ff6b9d', '#6ee7ff'];
  return Array.from({ length: 18 }, (_, i) => {
    const left = 8 + ((i * 17) % 84);
    const delay = (i * 0.07).toFixed(2);
    const color = colors[i % colors.length];
    return `<span class="level-up-particle" style="--p-left:${left}%;--p-delay:${delay}s;--p-color:${color}"></span>`;
  }).join('');
}

export function renderLevelUpOverlay(options: {
  open: boolean;
  award: XpAwardSnapshot | null;
}): string {
  if (!options.open || !options.award?.leveledUp) return '';

  const { award } = options;
  const title = getLevelTitle(award.newLevel);
  const perk = newlyUnlockedPerk(award.oldLevel, award.newLevel);
  const levelsGained = Math.max(1, award.newLevel - award.oldLevel);

  return `
    <div class="level-up-overlay open" data-level-up aria-hidden="false">
      <div class="level-up-backdrop" data-action="dismiss-level-up"></div>
      <div class="level-up-particles" aria-hidden="true">${renderParticles()}</div>
      <div class="level-up-card" role="dialog" aria-label="Level up">
        <div class="level-up-rays" aria-hidden="true"></div>
        <div class="level-up-ring level-up-ring-1" aria-hidden="true"></div>
        <div class="level-up-ring level-up-ring-2" aria-hidden="true"></div>
        <p class="level-up-eyebrow">Level Up${levelsGained > 1 ? ' ×' + levelsGained : ''}!</p>
        <div class="level-up-number-wrap">
          <span class="level-up-from">Lv ${award.oldLevel}</span>
          <span class="level-up-arrow" aria-hidden="true">▲</span>
          <span class="level-up-to" data-level="${award.newLevel}">${award.newLevel}</span>
        </div>
        <p class="level-up-title">${escapeHtml(title)}</p>
        <p class="level-up-xp-chip">+${award.amount.toLocaleString('en-GB')} XP</p>
        ${
          perk
            ? `<p class="level-up-perk"><span class="level-up-perk-icon" aria-hidden="true">✦</span> Unlocked: ${escapeHtml(perk)}</p>`
            : `<p class="level-up-perk level-up-perk-soon">Keep playing to unlock perks</p>`
        }
        <button type="button" class="btn btn-primary btn-lg level-up-continue" data-action="dismiss-level-up">
          Continue
        </button>
      </div>
    </div>`;
}
