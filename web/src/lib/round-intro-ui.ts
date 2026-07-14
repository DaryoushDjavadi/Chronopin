import type { GameMode } from '../types';
import { modeLabel } from '../data/rounds';
import { levelFromXp, getProgression, renderLevelBadge } from './progression';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MODE_ICONS: Record<GameMode, string> = {
  classic: '📍',
  past: '⏳',
  future: '🚀',
};

export function renderRoundIntroOverlay(options: {
  open: boolean;
  mode: GameMode;
  roundNumber: number;
  isCoop?: boolean;
  isDaily?: boolean;
}): string {
  if (!options.open) return '';
  const { mode, roundNumber, isCoop, isDaily } = options;
  const level = levelFromXp(getProgression().xp);
  const modeText = isCoop ? 'Co-op' : isDaily ? 'Daily' : modeLabel(mode);

  return `
    <div class="round-intro-overlay open" data-round-intro aria-hidden="false">
      <div class="round-intro-backdrop" data-action="dismiss-round-intro"></div>
      <div class="round-intro-card" role="dialog" aria-label="Round starting">
        <div class="round-intro-burst" aria-hidden="true"></div>
        <div class="round-intro-ring" aria-hidden="true"></div>
        <span class="round-intro-mode-icon">${MODE_ICONS[mode]}</span>
        <p class="round-intro-eyebrow">${escapeHtml(modeText)} · Round ${roundNumber}</p>
        <h2 class="round-intro-title">Mystery scene</h2>
        <p class="round-intro-sub">${isCoop ? 'Team up — pin hidden until reveal' : 'Look around, then drop your pin'}</p>
        <div class="round-intro-level">${renderLevelBadge(level)}</div>
        <button type="button" class="btn btn-primary btn-lg round-intro-go" data-action="dismiss-round-intro">
          Let's go →
        </button>
      </div>
    </div>`;
}
