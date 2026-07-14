import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import './styles.css';
import { pickRound, modeLabel, modeDescription } from './data/rounds';
import { renderAvatar } from './data/avatars';
import {
  type AvatarCategory,
  configWithCategoryOption,
  configWithCustomColor,
  DEFAULT_AVATAR_CONFIG,
  normalizeAvatarConfig,
  randomAvatarConfig,
} from './data/lpc-catalog';
import { hydrateAvatarCanvases } from './lib/avatar-animate';
import {
  renderAvatarEditorForm,
  renderAvatarEditorPanel,
  updateHeroAvatarCanvases,
} from './lib/avatar-editor-ui';
import type { InventoryItemId } from './data/inventory';
import { getInventoryItem } from './data/inventory';
import { bindInventoryDetailPreview, renderInventoryOverlayHtml } from './lib/inventory-ui';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getPendingRequestCount,
  sendFriendRequestByName,
  sendMessageToFriend,
} from './data/social';
import { renderSocialOverlayHtml } from './lib/social-ui';
import { getBinocularHint, getStarHint } from './lib/inventory-hints';
import {
  formatDistance,
  scoreGuess,
  scoreGrade,
  renderHearts,
} from './lib/geo';
import {
  getVisiblePanoramas,
  hidePanorama,
  restoreAllPanoramas,
  panoramaUrl,
} from './lib/library';
import {
  hasProfile,
  getProfile,
  saveProfile,
  updateProfile,
  getDefaultAvatarConfig,
} from './lib/profile';
import {
  addScoreboardEntry,
  getScoreboard,
  clearScoreboard,
  formatScoreDate,
  getPersonalBest,
} from './lib/scoreboard';
import {
  getStats,
  recordRoundResult,
  recordGameEnd,
  resetRunStreak,
  getStrongestRegion,
  getRegionBreakdown,
  formatMemberSince,
  winRate,
} from './lib/stats';
import { MAX_HEARTS, DISTANCE_FAIL_KM, type AppState, type GameMode, type Round, type Screen } from './types';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

let state: AppState = {
  screen: hasProfile() ? 'home' : 'onboarding',
  playType: 'solo',
  mode: null,
  round: null,
  guess: null,
  session: null,
  libraryIndex: 0,
  libraryViewId: null,
  scoreboardFilter: 'all',
  avatarConfig: getProfile()?.avatarConfig ?? getDefaultAvatarConfig(),
  avatarEditorOpenCategory: null,
  inventoryOpen: false,
  socialOpen: false,
  socialTab: 'friends',
  socialView: 'list',
  socialSelectedFriendId: null,
  socialMessageDraft: '',
  socialToast: null,
};

let scoreSavedForSession = false;
let gameStatsRecorded = false;

let panoViewer: { destroy: () => void } | null = null;
let panoInitToken = 0;
let map: maplibregl.Map | null = null;
let guessMarker: maplibregl.Marker | null = null;
let answerMarker: maplibregl.Marker | null = null;
let socialOnlineTimer: ReturnType<typeof setInterval> | null = null;

const app = document.getElementById('app')!;

function render(): void {
  app.innerHTML = getScreenHtml(state.screen);
  bindScreenEvents(state.screen);
  void hydrateAvatarCanvases(app);
  if (state.screen === 'explore' || state.screen === 'guess') bindInventoryEvents();
  if (state.screen === 'home') syncSocialOnlineTimer();
  if (state.screen === 'explore' || state.screen === 'library-view') initPanorama();
  if (state.screen === 'guess') initGuessMap();
  if (state.screen === 'result') initResultMap();
}

function getScreenHtml(screen: Screen): string {
  switch (screen) {
    case 'onboarding':
      return renderOnboarding();
    case 'home':
      return renderHome();
    case 'explore':
      return renderExplore();
    case 'guess':
      return renderGuess();
    case 'result':
      return renderResult();
    case 'gameover':
      return renderGameOver();
    case 'library':
      return renderLibrary();
    case 'library-view':
      return renderLibraryView();
    case 'scoreboard':
      return renderScoreboard();
    case 'player-info':
      return renderPlayerInfo();
  }
}

function renderHome(): string {
  const modes: GameMode[] = ['classic', 'past', 'future'];
  const modeIcons = { classic: '📍', past: '⏳', future: '🚀' };
  const panoCount = getVisiblePanoramas().length;
  const profile = getProfile()!;
  const pendingSocial = getPendingRequestCount();

  return `
    <div class="screen screen-home">
      <header class="hero">
        <div class="hero-profile-row">
          <button class="player-chip" data-action="player-info" aria-label="Player info">
            ${renderAvatar(profile.avatarConfig, 'avatar avatar-lg avatar-idle')}
            <span class="player-name">${escapeHtml(profile.name)}</span>
          </button>
          <button class="social-btn icon-btn" data-action="social" aria-label="Friends and social">
            <span class="social-btn-icon" aria-hidden="true">👥</span>
            ${pendingSocial > 0 ? `<span class="social-btn-badge">${pendingSocial}</span>` : ''}
          </button>
        </div>
        <div class="logo-mark">CP</div>
        <h1>ChronoPin</h1>
        <p class="tagline">Guess <strong>where</strong>. In time modes, also guess <strong>when</strong>.</p>
        <span class="badge">Web prototype · ${panoCount} panoramas</span>
      </header>

      <section class="panel">
        <div class="segmented" role="tablist">
          <button class="segmented-btn active" data-play="solo" role="tab" aria-selected="true">Solo</button>
          <button class="segmented-btn" data-play="multiplayer" role="tab" aria-selected="false">Multiplayer</button>
        </div>

        <div class="solo-panel">
          <h2>Choose mode</h2>
          <p class="hint">3 hearts per run · bad guesses cost a heart</p>
          <div class="mode-grid">
            ${modes
              .map(
                (m) => `
              <button class="mode-card" data-mode="${m}">
                <span class="mode-icon">${modeIcons[m]}</span>
                <span class="mode-name">${modeLabel(m)}</span>
                <span class="mode-desc">${modeDescription(m)}</span>
              </button>
            `,
              )
              .join('')}
          </div>

          <div class="tools-section">
            <h2>Tools</h2>
            <button class="tool-card" data-action="scoreboard">
              <span class="tool-icon">🏆</span>
              <span class="tool-info">
                <strong>Scoreboard</strong>
                <span>Local high scores · Firebase later</span>
              </span>
              <span class="tool-count">${getScoreboard().length}</span>
            </button>
            <button class="tool-card" data-action="library">
              <span class="tool-icon">🗂️</span>
              <span class="tool-info">
                <strong>Panorama Library</strong>
                <span>Browse, preview &amp; remove test scenes</span>
              </span>
              <span class="tool-count">${panoCount}</span>
            </button>
          </div>
        </div>

        <div class="multi-panel hidden">
          <h2>Play together</h2>
          <p class="hint">Multiplayer UI preview — not wired up yet.</p>
          <div class="mp-grid">
            ${renderMpCard('Co-op Decide', 'Blind pin → reveal → argue → one final pin', '2 players', true)}
            ${renderMpCard('1v1 Duel', 'Same scene, closest guess wins the round', 'Best of 5', true)}
            ${renderMpCard('Battle Royale', '4–8 players, elimination rounds', 'Later', false)}
          </div>
        </div>
      </section>

      <footer class="footer-note">
        Map: MapLibre + OpenFreeMap · Panoramas: Wikimedia Commons
      </footer>
      ${renderSocialOverlay()}
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAvatarEditor(defaultName: string, submitLabel: string): string {
  return renderAvatarEditorForm(
    defaultName,
    state.avatarConfig,
    state.avatarEditorOpenCategory,
    submitLabel,
  );
}

function renderOnboarding(): string {
  return `
    <div class="screen screen-onboarding">
      <div class="onboarding-card">
        <div class="onboarding-header">
          ${renderAvatar(state.avatarConfig, 'avatar avatar-xl avatar-idle')}
          <h1>Welcome to ChronoPin</h1>
          <p>Pick your name and build your pixel avatar.</p>
        </div>
        ${renderAvatarEditor('', 'Start playing')}
      </div>
    </div>
  `;
}

function renderPlayerInfo(): string {
  const profile = getProfile()!;
  const stats = getStats();
  const strongest = getStrongestRegion();
  const regions = getRegionBreakdown();
  const avatar = state.avatarConfig;

  return `
    <div class="screen screen-player-info">
      <div class="player-info-header">
        <button class="icon-btn" data-action="home" aria-label="Back">←</button>
        <h2>Player info</h2>
        <span class="sync-badge">Local · Firebase later</span>
      </div>

      <div class="player-info-hero">
        ${renderAvatar(avatar, 'avatar avatar-xxl avatar-idle')}
        <h1>${escapeHtml(profile.name)}</h1>
        <p class="member-since">Playing since ${formatMemberSince(profile.createdAt)}</p>
      </div>

      <section class="stats-panel">
        <h3>Statistics</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">Games played</span>
            <strong>${stats.gamesPlayed}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Won / Lost</span>
            <strong>${stats.gamesWon} / ${stats.gamesLost}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Win rate</span>
            <strong>${winRate(stats)}%</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Best run</span>
            <strong>${stats.bestRunScore.toLocaleString('de-DE')}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Rounds ♥ kept</span>
            <strong>${stats.roundsWon}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Rounds ♥ lost</span>
            <strong>${stats.roundsLost}</strong>
          </div>
          <div class="stat-card stat-wide">
            <span class="stat-label">Best round streak (no heart lost)</span>
            <strong>${stats.bestRoundStreak}</strong>
          </div>
          <div class="stat-card stat-wide">
            <span class="stat-label">Total points earned</span>
            <strong>${stats.totalScore.toLocaleString('de-DE')}</strong>
          </div>
        </div>
      </section>

      <section class="stats-panel">
        <h3>World knowledge</h3>
        ${
          strongest
            ? `<p class="strongest-region">Strongest in <strong>${strongest.label}</strong> (${strongest.pct}% within range)</p>`
            : `<p class="hint">Play more rounds to unlock regional stats.</p>`
        }
        ${
          regions.length > 0
            ? `<ul class="region-list">
                ${regions
                  .map(
                    (r) => `
                  <li class="region-row">
                    <span>${r.label}</span>
                    <div class="region-bar-wrap">
                      <div class="region-bar" style="width:${r.pct}%"></div>
                    </div>
                    <span class="region-pct">${r.pct}% · ${r.total} rnd</span>
                  </li>`,
                  )
                  .join('')}
              </ul>`
            : ''
        }
      </section>

      <section class="stats-panel edit-panel">
        <h3>Edit profile</h3>
        ${renderAvatarEditor(profile.name, 'Save changes')}
      </section>
    </div>
  `;
}

function renderScoreboard(): string {
  const filter = state.scoreboardFilter;
  const entries = getScoreboard(filter);
  const profile = getProfile();
  const filters: Array<{ id: GameMode | 'all'; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'classic', label: 'Classic' },
    { id: 'past', label: 'Past' },
    { id: 'future', label: 'Future' },
  ];

  return `
    <div class="screen screen-scoreboard">
      <div class="library-header">
        <button class="icon-btn" data-action="home" aria-label="Home">←</button>
        <div>
          <h2>Scoreboard</h2>
          <p>Local only · sync coming with Firebase</p>
        </div>
      </div>

      <div class="scoreboard-filters">
        ${filters
          .map(
            (f) =>
              `<button class="filter-chip ${filter === f.id ? 'active' : ''}" data-filter="${f.id}">${f.label}</button>`,
          )
          .join('')}
      </div>

      ${
        profile
          ? `<div class="personal-best">
              ${renderAvatar(profile.avatarConfig, 'avatar')}
              <span>Your best${filter !== 'all' ? ` (${modeLabel(filter as GameMode)})` : ''}:
                <strong>${getPersonalBest(filter === 'all' ? undefined : filter).toLocaleString('de-DE')}</strong> pts
              </span>
            </div>`
          : ''
      }

      ${
        entries.length === 0
          ? `<div class="library-empty"><p>No scores yet. Play a run!</p></div>`
          : `<ol class="scoreboard-list">
              ${entries
                .map((e, i) => {
                  const isYou = profile && e.playerName === profile.name;
                  return `
                <li class="scoreboard-row ${isYou ? 'scoreboard-you' : ''}">
                  <span class="score-rank">${i + 1}</span>
                  ${renderAvatar(e.avatarConfig, 'avatar avatar-sm')}
                  <div class="score-meta">
                    <strong>${escapeHtml(e.playerName)}${isYou ? ' (you)' : ''}</strong>
                    <span>${modeLabel(e.mode)} · ${e.rounds} rnd · ${formatScoreDate(e.date)}</span>
                  </div>
                  <span class="score-points">${e.score.toLocaleString('de-DE')}</span>
                </li>`;
                })
                .join('')}
            </ol>`
      }

      ${
        entries.length > 0
          ? `<button class="btn btn-secondary scoreboard-clear" data-action="clear-scores">Clear scoreboard</button>`
          : ''
      }
    </div>
  `;
}

function renderMpCard(
  title: string,
  desc: string,
  meta: string,
  highlight: boolean,
): string {
  return `
    <button class="mp-card ${highlight ? 'mp-highlight' : ''}" disabled>
      <div class="mp-card-top">
        <strong>${title}</strong>
        <span class="soon-badge">Soon</span>
      </div>
      <p>${desc}</p>
      <span class="mp-meta">${meta}</span>
    </button>
  `;
}

function renderSessionHud(): string {
  const s = state.session!;
  return `
    <div class="session-hud">
      <span class="hearts" aria-label="${s.hearts} of ${MAX_HEARTS} hearts">${renderHearts(s.hearts, MAX_HEARTS)}</span>
      <span class="session-score">${s.score.toLocaleString('de-DE')} pts</span>
      <span class="session-round">R${s.roundNumber}</span>
    </div>
  `;
}

function renderGameAvatarButton(): string {
  const profile = getProfile();
  if (!profile) return '';
  return `
    <button class="game-avatar-btn" data-action="inventory" aria-label="Open inventory">
      ${renderAvatar(profile.avatarConfig, 'avatar avatar-game avatar-walk')}
    </button>
  `;
}

function renderHintBanner(): string {
  const hint = state.session?.activeHint;
  if (!hint) return '';
  const hintGlyph = hint.itemId === 'binoculars' ? '🔭' : hint.itemId === 'star' ? '⭐' : '✦';
  return `
    <div class="hint-banner pixel-hint" role="status">
      <span class="hint-icon">${hintGlyph}</span>
      <p class="hint-text">${escapeHtml(hint.text)}</p>
      <button type="button" class="hint-dismiss" data-action="dismiss-hint" aria-label="Dismiss hint">×</button>
    </div>
  `;
}

function renderSocialOverlay(): string {
  return renderSocialOverlayHtml({
    open: state.socialOpen,
    tab: state.socialTab,
    view: state.socialView,
    selectedFriendId: state.socialSelectedFriendId,
    messageDraft: state.socialMessageDraft,
    toast: state.socialToast,
  });
}

function setSocialOpen(open: boolean): void {
  state.socialOpen = open;
  if (!open) {
    state.socialView = 'list';
    state.socialSelectedFriendId = null;
    state.socialMessageDraft = '';
    state.socialToast = null;
  }
  if (state.screen === 'home') patchHomeSocial();
}

function showSocialToast(text: string): void {
  state.socialToast = text;
  patchHomeSocial();
  setTimeout(() => {
    if (state.socialToast === text) {
      state.socialToast = null;
      if (state.screen === 'home' && state.socialOpen) patchHomeSocial();
    }
  }, 2600);
}

function patchHomeSocial(): void {
  const screen = app.querySelector('.screen-home');
  if (!screen) return;

  const overlayHtml = renderSocialOverlay();
  const existing = screen.querySelector('[data-social-overlay]');
  if (existing) existing.outerHTML = overlayHtml;
  else screen.insertAdjacentHTML('beforeend', overlayHtml);

  const badge = screen.querySelector('.social-btn-badge');
  const pending = getPendingRequestCount();
  const btn = screen.querySelector('[data-action="social"]');
  if (btn) {
    if (pending > 0) {
      if (badge) badge.textContent = String(pending);
      else
        btn.insertAdjacentHTML(
          'beforeend',
          `<span class="social-btn-badge">${pending}</span>`,
        );
    } else {
      badge?.remove();
    }
  }

  void hydrateAvatarCanvases(app);
  const log = app.querySelector('[data-chat-log]');
  if (log) log.scrollTop = log.scrollHeight;
  syncSocialOnlineTimer();
}

function syncSocialOnlineTimer(): void {
  if (socialOnlineTimer) {
    clearInterval(socialOnlineTimer);
    socialOnlineTimer = null;
  }
  if (state.screen === 'home' && state.socialOpen) {
    socialOnlineTimer = setInterval(() => {
      if (state.screen === 'home' && state.socialOpen) patchHomeSocial();
      else syncSocialOnlineTimer();
    }, 5000);
  }
}

let socialEventsBound = false;

function bindSocialEventsOnce(): void {
  if (socialEventsBound) return;
  socialEventsBound = true;

  app.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    if (target.closest('[data-action="social"]')) {
      if (state.screen === 'home') {
        e.preventDefault();
        setSocialOpen(!state.socialOpen);
      }
      return;
    }

    if (target.closest('[data-action="close-social"]')) {
      e.preventDefault();
      setSocialOpen(false);
      return;
    }

    const tabBtn = target.closest<HTMLElement>('[data-social-tab]');
    if (tabBtn && state.socialOpen) {
      state.socialTab = tabBtn.dataset.socialTab as 'friends' | 'add';
      state.socialView = 'list';
      state.socialSelectedFriendId = null;
      patchHomeSocial();
      return;
    }

    const friendBtn = target.closest<HTMLElement>('[data-action="open-friend"]');
    if (friendBtn && state.socialOpen) {
      state.socialView = 'friend';
      state.socialSelectedFriendId = friendBtn.dataset.friend ?? null;
      state.socialMessageDraft = '';
      patchHomeSocial();
      return;
    }

    if (target.closest('[data-action="social-back"]') && state.socialOpen) {
      state.socialView = 'list';
      state.socialSelectedFriendId = null;
      state.socialMessageDraft = '';
      patchHomeSocial();
      return;
    }

    const acceptBtn = target.closest<HTMLElement>('[data-action="accept-request"]');
    if (acceptBtn && state.socialOpen) {
      acceptFriendRequest(acceptBtn.dataset.request!);
      showSocialToast('Request accepted.');
      return;
    }

    const declineBtn = target.closest<HTMLElement>('[data-action="decline-request"]');
    if (declineBtn && state.socialOpen) {
      declineFriendRequest(declineBtn.dataset.request!);
      showSocialToast('Request declined.');
      return;
    }

    const sendReqBtn = target.closest('[data-action="send-friend-request"]');
    if (sendReqBtn && state.socialOpen) {
      const input = app.querySelector<HTMLInputElement>('#social-add-name');
      const result = sendFriendRequestByName(input?.value ?? '');
      if (result === 'empty') showSocialToast('Enter a username first.');
      else {
        if (input) input.value = '';
        showSocialToast('Friend request sent (demo).');
      }
    }
  });

  app.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-action="send-message"]')) return;
    e.preventDefault();
    if (!state.socialSelectedFriendId) return;
    const input = form.querySelector<HTMLInputElement>('input[name="message"]');
    const text = input?.value ?? '';
    const msg = sendMessageToFriend(state.socialSelectedFriendId, text);
    if (msg) {
      state.socialMessageDraft = '';
      patchHomeSocial();
    }
  });
}

function renderInventoryOverlay(): string {
  if (!state.session) return '';
  return renderInventoryOverlayHtml(state.inventoryOpen, state.session.usedItemsThisRound);
}

function renderGameChrome(): string {
  return `${renderHintBanner()}${renderInventoryOverlay()}`;
}

function renderExplore(): string {
  const round = state.round!;
  const showYearHint = round.answer.year != null;

  return `
    <div class="screen screen-explore">
      <div class="top-bar">
        <button class="icon-btn" data-action="quit" aria-label="Quit">←</button>
        <div class="top-bar-center">
          <span class="mode-pill mode-${state.mode}">${modeLabel(state.mode!)}</span>
          <span class="round-title">${round.title}</span>
        </div>
        <div class="top-bar-right">
          ${renderGameAvatarButton()}
          ${renderSessionHud()}
        </div>
      </div>

      ${renderGameChrome()}

      ${round.isAiGenerated ? '<div class="ai-banner">AI / speculative content (demo)</div>' : ''}

      <div id="pano" class="pano-container" aria-label="360 panorama — drag to look around"></div>

      <div class="explore-hud">
        <p class="explore-tip">Drag to look around · Pinch to zoom</p>
        ${showYearHint ? '<p class="explore-tip accent">You will also guess the year</p>' : ''}
        <button class="btn btn-primary btn-lg" data-action="guess">Drop your pin</button>
      </div>
    </div>
  `;
}

function renderGuess(): string {
  const needsYear = state.round!.answer.year != null;
  const defaultYear =
    state.mode === 'past' ? 1920 : state.mode === 'future' ? 2050 : new Date().getFullYear();
  const year = state.guess?.year ?? defaultYear;

  return `
    <div class="screen screen-guess">
      <div class="guess-header">
        <button class="icon-btn" data-action="back-explore" aria-label="Back">←</button>
        <div class="guess-header-text">
          <h2>Where is this?</h2>
          ${needsYear ? '<p>Tap the map, then set the year</p>' : '<p>Tap the map to place your pin</p>'}
        </div>
        <div class="guess-header-right">
          ${renderGameAvatarButton()}
          ${state.session ? renderSessionHud() : ''}
        </div>
      </div>

      ${renderGameChrome()}

      <div id="guess-map" class="map-container"></div>

      <div class="guess-sheet">
        ${
          needsYear
            ? `
          <div class="year-control">
            <div class="year-labels">
              <label for="year-slider">Year guess</label>
              <output id="year-value" class="year-value">${year}</output>
            </div>
            <input id="year-slider" type="range"
              min="${state.mode === 'past' ? 1000 : 2026}"
              max="${state.mode === 'past' ? 2025 : 2200}"
              step="1" value="${year}" />
            <div class="era-chips">${getEraChips(state.mode!, year)}</div>
          </div>`
            : ''
        }
        <button class="btn btn-primary btn-lg" data-action="submit" disabled>Submit guess</button>
      </div>
    </div>
  `;
}

function getEraChips(mode: GameMode, current: number): string {
  const chips =
    mode === 'past'
      ? [
          { label: 'Medieval', year: 1350 },
          { label: '1800s', year: 1850 },
          { label: '1920s', year: 1925 },
          { label: '1960s', year: 1965 },
        ]
      : [
          { label: '2030', year: 2030 },
          { label: '2040', year: 2040 },
          { label: '2080', year: 2080 },
          { label: '2150', year: 2150 },
        ];
  return chips
    .map(
      (c) =>
        `<button type="button" class="era-chip ${c.year === current ? 'active' : ''}" data-year="${c.year}">${c.label}</button>`,
    )
    .join('');
}

function renderResult(): string {
  const round = state.round!;
  const guess = state.guess!;
  const score = scoreGuess(round, guess);
  const grade = scoreGrade(score.points, score.maxPoints);
  const s = state.session!;
  const canContinue = s.hearts > 0;

  return `
    <div class="screen screen-result">
      <div class="result-top">
        ${renderSessionHud()}
      </div>

      <div class="result-header">
        <span class="grade-badge">${grade}</span>
        <h2>${Math.round((score.points / score.maxPoints) * 100)}%</h2>
        <p class="score-sub">+${score.points.toLocaleString('de-DE')} pts this round</p>
        ${
          score.lostHeart
            ? `<p class="heart-lost">♥ Lost a heart — ${score.failReason}</p>`
            : `<p class="heart-kept">♥ Nice guess — heart kept</p>`
        }
      </div>

      <div class="result-stats">
        <div class="stat-card">
          <span class="stat-label">Distance off</span>
          <strong>${formatDistance(score.distanceKm)}</strong>
        </div>
        ${
          score.yearError != null
            ? `<div class="stat-card"><span class="stat-label">Year off</span><strong>${score.yearError} years</strong></div>`
            : ''
        }
      </div>

      <div id="result-map" class="map-container map-result"></div>

      <div class="result-card">
        <h3>${round.answer.label}</h3>
        ${
          round.answer.year
            ? `<p class="answer-year">Actual: <strong>${round.answer.year}</strong>${guess.year != null ? ` · You: ${guess.year}` : ''}</p>`
            : ''
        }
        <p>${round.context}</p>
        <p class="attribution">${round.attribution} · ${round.license}</p>
      </div>

      <div class="result-actions">
        <button class="btn btn-secondary" data-action="quit">${canContinue ? 'Quit' : 'Home'}</button>
        <button class="btn btn-primary" data-action="next">${canContinue ? 'Next round →' : 'See results'}</button>
      </div>
    </div>
  `;
}

function renderGameOver(): string {
  const s = state.session!;
  const rounds = s.roundNumber;

  return `
    <div class="screen screen-gameover">
      <div class="gameover-content">
        <span class="gameover-icon">💔</span>
        <h1>Game Over</h1>
        <p class="gameover-sub">No hearts left after ${rounds} round${rounds === 1 ? '' : 's'}</p>

        <div class="gameover-stats">
          <div class="stat-card stat-highlight">
            <span class="stat-label">Final score</span>
            <strong>${s.score.toLocaleString('de-DE')}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Mode</span>
            <strong>${modeLabel(state.mode!)}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Rounds</span>
            <strong>${rounds}</strong>
          </div>
        </div>

        <div class="gameover-actions">
          <button class="btn btn-primary btn-lg" data-action="retry">Play again</button>
          <button class="btn btn-secondary btn-lg" data-action="scoreboard">Scoreboard</button>
          <button class="btn btn-secondary btn-lg" data-action="home">Home</button>
        </div>
      </div>
    </div>
  `;
}

function renderLibrary(): string {
  const items = getVisiblePanoramas();

  return `
    <div class="screen screen-library">
      <div class="library-header">
        <button class="icon-btn" data-action="home" aria-label="Home">←</button>
        <div>
          <h2>Panorama Library</h2>
          <p>${items.length} scenes · tap to preview</p>
        </div>
      </div>

      ${
        items.length === 0
          ? `<div class="library-empty">
              <p>All panoramas hidden.</p>
              <button class="btn btn-secondary" data-action="restore-all">Restore all</button>
            </div>`
          : `<ul class="library-list">
              ${items
                .map(
                  (p, i) => `
                <li class="library-item" data-id="${p.id}" data-index="${i}">
                  <img class="library-thumb" src="${panoramaUrl(p)}" alt="" loading="lazy" />
                  <div class="library-meta">
                    <strong>${p.title}${p.isNew ? ' <span class="library-new-badge">new</span>' : ''}</strong>
                    <span>${p.region}</span>
                    <span class="library-tags">${p.modes.join(' · ')}</span>
                  </div>
                  <button class="library-delete" data-delete="${p.id}" aria-label="Remove ${p.title}" title="Remove from library">🗑</button>
                </li>`,
                )
                .join('')}
            </ul>`
      }

      ${
        localStorage.getItem('chronopin-hidden-panos')
          ? `<button class="btn btn-secondary library-restore" data-action="restore-all">Restore hidden panoramas</button>`
          : ''
      }
    </div>
  `;
}

function renderLibraryView(): string {
  const items = getVisiblePanoramas();
  const idx = state.libraryIndex;
  const item = items[idx];
  if (!item) return renderLibrary();

  return `
    <div class="screen screen-library-view">
      <div class="top-bar">
        <button class="icon-btn" data-action="library-back" aria-label="Back to list">←</button>
        <div class="top-bar-center">
          <span class="round-title">${item.title}</span>
          <span class="library-view-region">${item.region}</span>
        </div>
        <span class="library-nav-count">${idx + 1}/${items.length}</span>
      </div>

      <div id="pano" class="pano-container" aria-label="360 preview"></div>

      <div class="library-view-bar">
        <button class="btn btn-secondary" data-action="lib-prev" ${idx === 0 ? 'disabled' : ''}>← Prev</button>
        <button class="btn btn-secondary" data-action="lib-delete" data-id="${item.id}">Remove</button>
        <button class="btn btn-secondary" data-action="lib-next" ${idx >= items.length - 1 ? 'disabled' : ''}>Next →</button>
      </div>
    </div>
  `;
}

function bindScreenEvents(screen: Screen): void {
  if (screen === 'onboarding') bindProfileFormEvents('onboarding');
  if (screen === 'player-info') bindProfileFormEvents('player-info');
  if (screen === 'home') bindHomeEvents();
  if (screen === 'explore') bindExploreEvents();
  if (screen === 'guess') bindGuessEvents();
  if (screen === 'result') bindResultEvents();
  if (screen === 'gameover') bindGameOverEvents();
  if (screen === 'library') bindLibraryEvents();
  if (screen === 'library-view') bindLibraryViewEvents();
  if (screen === 'scoreboard') bindScoreboardEvents();
}

function patchAvatarEditor(): void {
  const screen = app.querySelector('.screen-player-info, .screen-onboarding') as HTMLElement | null;
  const scrollTop = screen?.scrollTop ?? 0;

  const panel = app.querySelector('#avatar-editor-panel');
  if (panel) {
    panel.outerHTML = renderAvatarEditorPanel(
      state.avatarConfig,
      state.avatarEditorOpenCategory,
    );
  }

  updateHeroAvatarCanvases(app, state.avatarConfig);
  bindAvatarEditorEvents();
  void hydrateAvatarCanvases(app);

  if (screen) {
    screen.scrollTop = scrollTop;
    const openAcc = app.querySelector('.avatar-acc.open');
    openAcc?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function bindAvatarEditorEvents(): void {
  app.querySelectorAll('[data-action="toggle-avatar-cat"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = (btn as HTMLElement).dataset.cat as AvatarCategory;
      state.avatarEditorOpenCategory = state.avatarEditorOpenCategory === cat ? null : cat;
      patchAvatarEditor();
    });
  });

  app.querySelectorAll('[data-action="pick-avatar"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement;
      const cat = el.dataset.cat as AvatarCategory;
      const value = el.dataset.value!;
      state.avatarConfig = configWithCategoryOption(cat, value, state.avatarConfig);
      patchAvatarEditor();
    });
  });

  app.querySelectorAll('[data-action="pick-hair-color"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.avatarConfig = {
        ...state.avatarConfig,
        hairColor: (btn as HTMLElement).dataset.value!,
      };
      patchAvatarEditor();
    });
  });

  app.querySelectorAll<HTMLInputElement>('[data-action="pick-custom-color"]').forEach((input) => {
    input.addEventListener('input', () => {
      const kind = input.dataset.kind as 'top' | 'pants' | 'shoes';
      state.avatarConfig = configWithCustomColor(kind, input.value, state.avatarConfig);
      const hexLabel = input.parentElement?.querySelector('.avatar-color-hex');
      if (hexLabel) hexLabel.textContent = input.value.toLowerCase();
      updateHeroAvatarCanvases(app, state.avatarConfig);
      void hydrateAvatarCanvases(app);
    });
  });

  app.querySelector('[data-action="avatar-reset"]')?.addEventListener('click', () => {
    state.avatarConfig = { ...DEFAULT_AVATAR_CONFIG };
    patchAvatarEditor();
  });

  app.querySelector('[data-action="avatar-random"]')?.addEventListener('click', () => {
    state.avatarConfig = randomAvatarConfig();
    patchAvatarEditor();
  });
}

function bindProfileFormEvents(mode: 'onboarding' | 'player-info'): void {
  if (mode === 'player-info') {
    app.querySelector('[data-action="home"]')?.addEventListener('click', () => {
      state.screen = 'home';
      render();
    });
  }

  bindAvatarEditorEvents();

  app.querySelector('[data-action="save-profile"]')?.addEventListener('click', () => {
    const nameInput = app.querySelector('#player-name') as HTMLInputElement;
    const name = nameInput?.value ?? '';
    const avatarConfig = normalizeAvatarConfig(state.avatarConfig);
    if (mode === 'player-info') {
      updateProfile(name, avatarConfig);
      state.screen = 'home';
    } else {
      saveProfile(name, avatarConfig);
      state.screen = 'home';
    }
    render();
  });
}

let inventoryEventsBound = false;

function bindInventoryEventsOnce(): void {
  if (inventoryEventsBound) return;
  inventoryEventsBound = true;

  app.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    if (target.closest('[data-action="inventory"]')) {
      if (state.screen === 'explore' || state.screen === 'guess') {
        e.preventDefault();
        e.stopPropagation();
        setInventoryOpen(!state.inventoryOpen);
      }
      return;
    }

    if (target.closest('[data-action="close-inventory"]')) {
      e.preventDefault();
      e.stopPropagation();
      setInventoryOpen(false);
      return;
    }

    const itemEl = target.closest<HTMLElement>('[data-item]:not([aria-disabled="true"])');
    if (itemEl && state.inventoryOpen) {
      e.preventDefault();
      e.stopPropagation();
      useInventoryItem(itemEl.dataset.item as InventoryItemId);
      return;
    }

    if (target.closest('[data-action="dismiss-hint"]')) {
      e.preventDefault();
      dismissHint();
    }
  });
}

function bindInventoryEvents(): void {
  bindInventoryDetailPreview(app);
}

function setInventoryOpen(open: boolean): void {
  state.inventoryOpen = open;
  if (state.screen === 'explore' || state.screen === 'guess') {
    patchGameChrome();
    return;
  }
  render();
}

function patchGameChrome(): void {
  const screen = app.querySelector('.screen-explore, .screen-guess');
  if (!screen) return;

  const hintHtml = renderHintBanner();
  const existingHint = screen.querySelector('.hint-banner');
  if (hintHtml) {
    if (existingHint) existingHint.outerHTML = hintHtml;
    else {
      const anchor = screen.querySelector('.top-bar, .guess-header');
      anchor?.insertAdjacentHTML('afterend', hintHtml);
    }
  } else {
    existingHint?.remove();
  }

  syncInventoryOverlay(screen);

  bindInventoryEvents();
  void hydrateAvatarCanvases(app);
}

function syncInventoryOverlay(screen: Element): void {
  if (!state.session) {
    screen.querySelector('[data-inventory-overlay]')?.remove();
    return;
  }

  const usedKey = state.session.usedItemsThisRound.join(',');
  let overlay = screen.querySelector<HTMLElement>('[data-inventory-overlay]');
  const overlayHtml = renderInventoryOverlay();

  if (!overlay) {
    screen.insertAdjacentHTML('beforeend', overlayHtml);
    return;
  }

  if (overlay.dataset.usedItems !== usedKey) {
    overlay.outerHTML = overlayHtml;
    overlay = screen.querySelector<HTMLElement>('[data-inventory-overlay]');
    if (!overlay) return;
  }

  overlay.classList.toggle('open', state.inventoryOpen);
  overlay.setAttribute('aria-hidden', String(!state.inventoryOpen));
}

function useInventoryItem(itemId: InventoryItemId): void {
  if (!state.session || !state.round) return;
  const item = getInventoryItem(itemId);
  if (!item?.usable || state.session.usedItemsThisRound.includes(itemId)) return;

  const { lat, lng } = state.round.answer;
  let text = '';
  if (itemId === 'binoculars') text = getBinocularHint(lat, lng);
  else if (itemId === 'star') text = getStarHint(lat, lng);
  else return;

  state.session.usedItemsThisRound.push(itemId);
  state.session.activeHint = { itemId, text };
  state.inventoryOpen = false;
  patchGameChrome();
}

function dismissHint(): void {
  if (!state.session) return;
  state.session.activeHint = null;
  patchGameChrome();
}

function bindScoreboardEvents(): void {
  app.querySelector('[data-action="home"]')?.addEventListener('click', goHome);

  app.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.scoreboardFilter = (btn as HTMLElement).dataset.filter as GameMode | 'all';
      render();
    });
  });

  app.querySelector('[data-action="clear-scores"]')?.addEventListener('click', () => {
    if (confirm('Clear all local scores?')) {
      clearScoreboard();
      render();
    }
  });
}

function bindHomeEvents(): void {
  app.querySelectorAll('.segmented-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const play = (btn as HTMLElement).dataset.play as 'solo' | 'multiplayer';
      state.playType = play;
      app.querySelectorAll('.segmented-btn').forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      app.querySelector('.solo-panel')?.classList.toggle('hidden', play !== 'solo');
      app.querySelector('.multi-panel')?.classList.toggle('hidden', play !== 'multiplayer');
    });
  });

  app.querySelectorAll('.mode-card').forEach((card) => {
    card.addEventListener('click', () => {
      if (!hasProfile()) {
        state.screen = 'onboarding';
        render();
        return;
      }
      startGame((card as HTMLElement).dataset.mode as GameMode);
    });
  });

  app.querySelector('[data-action="library"]')?.addEventListener('click', () => {
    state.screen = 'library';
    render();
  });

  app.querySelector('[data-action="scoreboard"]')?.addEventListener('click', () => {
    state.screen = 'scoreboard';
    render();
  });

  app.querySelector('[data-action="player-info"]')?.addEventListener('click', () => {
    const profile = getProfile();
    if (profile) state.avatarConfig = normalizeAvatarConfig(profile.avatarConfig);
    state.screen = 'player-info';
    render();
  });
}

function bindExploreEvents(): void {
  app.querySelector('[data-action="quit"]')?.addEventListener('click', goHome);
  app.querySelector('[data-action="guess"]')?.addEventListener('click', () => {
    state.screen = 'guess';
    if (!state.guess && state.round?.answer.year != null) {
      state.guess = { lat: NaN, lng: NaN, year: state.mode === 'past' ? 1920 : 2050 };
    }
    render();
  });
}

function bindGuessEvents(): void {
  app.querySelector('[data-action="back-explore"]')?.addEventListener('click', () => {
    state.screen = 'explore';
    render();
  });

  app.querySelector('[data-action="submit"]')?.addEventListener('click', submitGuess);

  const slider = app.querySelector('#year-slider') as HTMLInputElement | null;
  slider?.addEventListener('input', () => {
    const year = Number(slider.value);
    const output = app.querySelector('#year-value');
    if (output) output.textContent = slider.value;
    if (state.guess) state.guess.year = year;
    app.querySelectorAll('.era-chip').forEach((chip) => {
      chip.classList.toggle('active', Number((chip as HTMLElement).dataset.year) === year);
    });
  });

  app.querySelectorAll('.era-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const year = Number((chip as HTMLElement).dataset.year);
      if (slider) {
        slider.value = String(year);
        slider.dispatchEvent(new Event('input'));
      }
    });
  });
}

function bindResultEvents(): void {
  app.querySelector('[data-action="quit"]')?.addEventListener('click', () => {
    finishRunEarly();
    goHome();
  });
  app.querySelector('[data-action="next"]')?.addEventListener('click', () => {
    if (state.session && state.session.hearts > 0) {
      nextRound();
    } else {
      showGameOver();
    }
  });
}

function finishRunEarly(): void {
  if (!state.session || !state.mode || gameStatsRecorded) return;
  if (state.session.hearts > 0) {
    recordGameEnd(state.session.score, state.session.roundNumber, false);
    if (!scoreSavedForSession) {
      addScoreboardEntry(state.mode, state.session.score, state.session.roundNumber);
      scoreSavedForSession = true;
    }
    gameStatsRecorded = true;
  }
}

function showGameOver(): void {
  if (state.session && state.mode) {
    if (!scoreSavedForSession) {
      addScoreboardEntry(state.mode, state.session.score, state.session.roundNumber);
      scoreSavedForSession = true;
    }
    if (!gameStatsRecorded) {
      recordGameEnd(state.session.score, state.session.roundNumber, true);
      gameStatsRecorded = true;
    }
  }
  state.screen = 'gameover';
  render();
}

function bindGameOverEvents(): void {
  app.querySelector('[data-action="retry"]')?.addEventListener('click', () => {
    if (state.mode) startGame(state.mode);
  });
  app.querySelector('[data-action="scoreboard"]')?.addEventListener('click', () => {
    state.screen = 'scoreboard';
    render();
  });
  app.querySelector('[data-action="home"]')?.addEventListener('click', goHome);
}

function bindLibraryEvents(): void {
  app.querySelector('[data-action="home"]')?.addEventListener('click', goHome);

  app.querySelectorAll('.library-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-delete]')) return;
      const index = Number((item as HTMLElement).dataset.index);
      state.libraryIndex = index;
      state.libraryViewId = (item as HTMLElement).dataset.id ?? null;
      state.screen = 'library-view';
      render();
    });
  });

  app.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.delete!;
      if (confirm('Remove this panorama from the library? (Hidden locally — file stays in repo.)')) {
        hidePanorama(id);
        render();
      }
    });
  });

  app.querySelector('[data-action="restore-all"]')?.addEventListener('click', () => {
    restoreAllPanoramas();
    render();
  });
}

function bindLibraryViewEvents(): void {
  app.querySelector('[data-action="library-back"]')?.addEventListener('click', () => {
    state.screen = 'library';
    render();
  });

  app.querySelector('[data-action="lib-prev"]')?.addEventListener('click', () => {
    if (state.libraryIndex > 0) {
      state.libraryIndex--;
      render();
    }
  });

  app.querySelector('[data-action="lib-next"]')?.addEventListener('click', () => {
    const max = getVisiblePanoramas().length - 1;
    if (state.libraryIndex < max) {
      state.libraryIndex++;
      render();
    }
  });

  app.querySelector('[data-action="lib-delete"]')?.addEventListener('click', () => {
    const id = (app.querySelector('[data-action="lib-delete"]') as HTMLElement).dataset.id;
    if (id && confirm('Remove this panorama from the library?')) {
      hidePanorama(id);
      const remaining = getVisiblePanoramas();
      if (remaining.length === 0) {
        state.screen = 'library';
      } else if (state.libraryIndex >= remaining.length) {
        state.libraryIndex = remaining.length - 1;
      }
      state.screen = remaining.length === 0 ? 'library' : 'library-view';
      render();
    }
  });
}

function startGame(mode: GameMode): void {
  destroyPanorama();
  destroyMap();
  scoreSavedForSession = false;
  gameStatsRecorded = false;
  resetRunStreak();
  state.mode = mode;
  state.inventoryOpen = false;
  state.session = {
    hearts: MAX_HEARTS,
    score: 0,
    roundNumber: 0,
    usedRoundIds: [],
    lastLostHeart: false,
    lastRoundPoints: 0,
    usedItemsThisRound: [],
    activeHint: null,
  };
  nextRound();
}

function nextRound(): void {
  if (!state.mode || !state.session) return;

  let round = pickRound(state.mode, state.session.usedRoundIds);
  if (!round) {
    state.session.usedRoundIds = [];
    round = pickRound(state.mode);
  }
  if (!round) {
    alert('No panoramas available for this mode. Check the library or restore hidden scenes.');
    goHome();
    return;
  }

  state.session.roundNumber++;
  state.session.usedRoundIds.push(round.id);
  state.session.usedItemsThisRound = [];
  state.session.activeHint = null;
  state.inventoryOpen = false;
  state.round = round;
  state.guess = null;
  state.screen = 'explore';
  render();
}

function submitGuess(): void {
  if (!state.guess || !state.round || !state.session) return;

  const score = scoreGuess(state.round, state.guess);
  recordRoundResult(
    state.round.answer.lat,
    state.round.answer.lng,
    score.distanceKm,
    score.points,
    score.lostHeart,
    DISTANCE_FAIL_KM,
  );

  state.session.score += score.points;
  state.session.lastRoundPoints = score.points;
  state.session.lastLostHeart = score.lostHeart;
  if (score.lostHeart) state.session.hearts = Math.max(0, state.session.hearts - 1);

  state.screen = 'result';
  render();
}

function goHome(): void {
  destroyPanorama();
  destroyMap();
  state = {
    screen: hasProfile() ? 'home' : 'onboarding',
    playType: state.playType,
    mode: null,
    round: null,
    guess: null,
    session: null,
    libraryIndex: 0,
    libraryViewId: null,
    scoreboardFilter: state.scoreboardFilter,
    avatarConfig: getProfile()?.avatarConfig ?? getDefaultAvatarConfig(),
    avatarEditorOpenCategory: null,
    inventoryOpen: false,
    socialOpen: false,
    socialTab: 'friends',
    socialView: 'list',
    socialSelectedFriendId: null,
    socialMessageDraft: '',
    socialToast: null,
  };
  scoreSavedForSession = false;
  gameStatsRecorded = false;
  render();
}

function getActivePanoSource(): { panorama: string; panoConfig?: Round['panoConfig'] } {
  if (state.screen === 'library-view') {
    const items = getVisiblePanoramas();
    const item = items[state.libraryIndex];
    return { panorama: panoramaUrl(item), panoConfig: item.panoConfig };
  }
  const round = state.round!;
  return { panorama: round.panorama, panoConfig: round.panoConfig };
}

function initPanorama(): void {
  const src = getActivePanoSource();
  const token = ++panoInitToken;
  destroyPanorama();

  const config: Record<string, unknown> = {
    type: 'equirectangular',
    panorama: src.panorama,
    autoLoad: true,
    showControls: false,
    compass: false,
    hfov: 100,
    minHfov: 50,
    maxHfov: 120,
    ...src.panoConfig,
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const validScreens: Screen[] = ['explore', 'library-view'];
      if (token !== panoInitToken || !validScreens.includes(state.screen)) return;
      if (!document.getElementById('pano')) return;
      panoViewer = pannellum.viewer('pano', config);
    });
  });
}

function initGuessMap(): void {
  const round = state.round!;
  destroyMap();

  map = new maplibregl.Map({
    container: 'guess-map',
    style: MAP_STYLE,
    center: [10, 25],
    zoom: 1.2,
    attributionControl: { compact: true },
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  map.on('load', () => {
    map?.resize();
    if (state.guess && !Number.isNaN(state.guess.lat)) {
      placeGuessMarker(state.guess.lng, state.guess.lat);
    }
  });

  map.on('click', (e) => {
    state.guess = {
      lat: e.lngLat.lat,
      lng: e.lngLat.lng,
      year: state.guess?.year ?? round.answer.year ?? undefined,
    };
    placeGuessMarker(state.guess.lng, state.guess.lat);
    const submitBtn = app.querySelector('[data-action="submit"]') as HTMLButtonElement | null;
    if (submitBtn) submitBtn.disabled = false;
  });
}

function placeGuessMarker(lng: number, lat: number): void {
  if (!map) return;
  guessMarker?.remove();
  const el = document.createElement('div');
  el.className = 'map-pin map-pin-guess';
  el.setAttribute('aria-label', 'Your guess');
  guessMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat([lng, lat])
    .addTo(map);
}

function initResultMap(): void {
  const round = state.round!;
  const guess = state.guess!;
  destroyMap();

  const bounds = new maplibregl.LngLatBounds();
  bounds.extend([guess.lng, guess.lat]);
  bounds.extend([round.answer.lng, round.answer.lat]);

  map = new maplibregl.Map({
    container: 'result-map',
    style: MAP_STYLE,
    bounds,
    fitBoundsOptions: { padding: 60, maxZoom: 8 },
    attributionControl: { compact: true },
  });

  map.on('load', () => {
    if (!map) return;
    map.addSource('result-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [guess.lng, guess.lat],
            [round.answer.lng, round.answer.lat],
          ],
        },
      },
    });
    map.addLayer({
      id: 'result-line-layer',
      type: 'line',
      source: 'result-line',
      paint: {
        'line-color': '#3dd6c6',
        'line-width': 3,
        'line-dasharray': [2, 2],
        'line-opacity': 0.85,
      },
    });

    const guessEl = document.createElement('div');
    guessEl.className = 'map-pin map-pin-guess';
    guessEl.textContent = 'You';
    guessMarker = new maplibregl.Marker({ element: guessEl, anchor: 'bottom' })
      .setLngLat([guess.lng, guess.lat])
      .addTo(map);

    const answerEl = document.createElement('div');
    answerEl.className = 'map-pin map-pin-answer';
    answerEl.textContent = '✓';
    answerMarker = new maplibregl.Marker({ element: answerEl, anchor: 'bottom' })
      .setLngLat([round.answer.lng, round.answer.lat])
      .addTo(map);
  });
}

function destroyPanorama(): void {
  panoViewer?.destroy();
  panoViewer = null;
}

function destroyMap(): void {
  guessMarker?.remove();
  guessMarker = null;
  answerMarker?.remove();
  answerMarker = null;
  map?.remove();
  map = null;
}

bindInventoryEventsOnce();
bindSocialEventsOnce();
render();
