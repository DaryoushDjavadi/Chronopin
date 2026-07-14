import type { FriendProfile } from '../data/social';
import { modeLabel } from '../data/rounds';
import type { GameMode } from '../types';

type ModeCardMeta = {
  emoji: string;
  tagline: string;
  description: string;
  chips: string[];
};

const MODE_CARDS: Record<GameMode, ModeCardMeta> = {
  classic: {
    emoji: '🌍',
    tagline: 'Pin the present',
    description: 'Real-world streets and landscapes — drop your pin, no year needed.',
    chips: ['📍 Location only', '♥ 3 hearts'],
  },
  past: {
    emoji: '🏛️',
    tagline: 'Where & when?',
    description: 'Step into history — find the place and guess the year on the timeline.',
    chips: ['📍 Pin + 📅 Year', '♥ 3 hearts'],
  },
  future: {
    emoji: '🛸',
    tagline: 'Tomorrow’s world',
    description: 'Sci-fi skylines and speculative scenes — place and year both count.',
    chips: ['📍 Pin + 📅 Year', '♥ 3 hearts'],
  },
};

type MpCardTone = 'coop' | 'duel' | 'soon';

function mpReadyState(friends: FriendProfile[], selectedFriendId: string | null): {
  ready: boolean;
  badgeLabel: string;
  badgeClass: string;
} {
  const ready =
    friends.length > 0 &&
    selectedFriendId !== null &&
    friends.some((f) => f.id === selectedFriendId);
  const badgeLabel = friends.length === 0 ? 'Add friend' : ready ? 'Play' : 'Pick friend';
  const badgeClass =
    friends.length === 0 ? 'soon-badge' : ready ? 'mp-badge' : 'mp-badge mp-badge-muted';
  return { ready, badgeLabel, badgeClass };
}

export function renderModeCard(mode: GameMode, action: string): string {
  const meta = MODE_CARDS[mode];
  const chips = meta.chips.map((c) => `<span class="mode-chip">${c}</span>`).join('');

  return `
    <button class="mode-card mode-card--${mode}" type="button" data-mode="${mode}" data-action="${action}">
      <div class="mode-card-visual" aria-hidden="true">
        <span class="mode-card-emoji">${meta.emoji}</span>
      </div>
      <div class="mode-card-body">
        <div class="mode-card-head">
          <span class="mode-name">${modeLabel(mode)}</span>
          <span class="mode-tagline">${meta.tagline}</span>
        </div>
        <p class="mode-desc">${meta.description}</p>
        <div class="mode-chips">${chips}</div>
      </div>
      <span class="mode-card-chevron" aria-hidden="true">›</span>
    </button>`;
}

export function renderCoopDecideCard(friends: FriendProfile[], selectedFriendId: string | null): string {
  const { ready, badgeLabel, badgeClass } = mpReadyState(friends, selectedFriendId);

  return `
    <button class="mp-card mp-card--coop ${ready ? 'mp-highlight' : ''}" type="button" data-action="coop-decide">
      <div class="mp-card-visual" aria-hidden="true">🤝</div>
      <div class="mp-card-body">
        <div class="mp-card-top">
          <div class="mp-card-titles">
            <strong>Co-op Decide</strong>
            <span class="mp-card-tagline">Two minds, one pin</span>
          </div>
          <span class="${badgeClass}">${badgeLabel}</span>
        </div>
        <p class="mp-card-desc">Both guess blind, reveal together, then vote on the final answer.</p>
        <div class="mp-card-chips">
          <span class="mode-chip">👥 2 players</span>
          <span class="mode-chip">⚡ Live · Async</span>
        </div>
      </div>
    </button>`;
}

export function renderMpSoonCard(
  title: string,
  tagline: string,
  desc: string,
  meta: string,
  tone: MpCardTone,
  emoji: string,
): string {
  return `
    <button class="mp-card mp-card--${tone}" type="button" disabled>
      <div class="mp-card-visual" aria-hidden="true">${emoji}</div>
      <div class="mp-card-body">
        <div class="mp-card-top">
          <div class="mp-card-titles">
            <strong>${title}</strong>
            <span class="mp-card-tagline">${tagline}</span>
          </div>
          <span class="soon-badge">Soon</span>
        </div>
        <p class="mp-card-desc">${desc}</p>
        <span class="mp-meta">${meta}</span>
      </div>
    </button>`;
}
