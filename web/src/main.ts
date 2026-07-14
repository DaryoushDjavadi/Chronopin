import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import './styles.css';
import { pickRound, modeLabel, modeDescription } from './data/rounds';
import { renderAvatar } from './data/avatars';
import {
  type AvatarCategory,
  type AvatarConfig,
  configWithCategoryOption,
  configWithCustomColor,
  DEFAULT_AVATAR_CONFIG,
  normalizeAvatarConfig,
  randomAvatarConfig,
} from './data/lpc-catalog';
import { hydrateAvatarCanvases } from './lib/avatar-animate';
import { createMapPinMarker, mountMapPinMarker } from './lib/map-pin-avatar';
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
  cancelOutgoingRequest,
  declineFriendRequest,
  getFriendById,
  getFriends,
  getSocialBadgeCount,
  isFriendOnline,
  sendFriendRequestByName,
  sendFriendRequestToUser,
  sendMessageToFriend,
} from './data/social';
import { getDirectoryUser } from './data/user-directory';
import {
  acceptCoopInvite,
  applyRemoteCoopRoom,
  applyRemoteCoopInvite,
  advanceCoopToVote,
  abandonCoopGame,
  bothCoopPinsPlaced,
  canISubmitPin,
  cancelCoopInvite,
  createCoopInvite,
  declineCoopInvite,
  finishCoopRoom,
  getCoopRoom,
  getResolvedCoopRoom,
  getCoopRound,
  getMyCoopRole,
  setActiveCoopRoomId,
  getMyActiveCoopRooms,
  describeCoopSession,
  leaveCoopRunLocally,
  simulatePartnerPin,
  simulatePartnerVote,
  startCoopRoom,
  submitCoopPin,
  submitCoopVote,
  type CoopPin,
  type CoopVoteChoice,
} from './data/coop';
import {
  renderCoopHud,
  renderCoopResult,
  renderCoopReveal,
  renderCoopSetupOverlay,
  renderCoopVote,
  renderCoopWaitScreen,
  renderMultiplayerFriendPicker,
} from './lib/coop-ui';
import { renderCreditsOverlayHtml } from './lib/credits-ui';
import { renderClassicRegionOverlayHtml } from './lib/classic-region-ui';
import { renderDailyHomeCard, renderDailyWheelOverlay } from './lib/daily-ui';
import {
  canPlayDaily,
  formatDailyCountdown,
  getNextDailyResetMs,
  markDailyCompleted,
  markDailyWheelSpun,
  pickDailyRound,
  resetDailyForTesting,
} from './lib/daily';
import { applyWheelReward, pickWeightedSegment, WHEEL_SEGMENTS } from './lib/daily-wheel';
import { alertDialog, confirmDialog } from './lib/dialog-ui';
import { renderSocialOverlayHtml, renderSocialSearchResultsHtml } from './lib/social-ui';
import { isAdminPlayer } from './lib/admin';
import { renderAdminOverlayHtml } from './lib/admin-ui';
import {
  adminDeletePlayer,
  adminGrantHearts,
  adminGrantStash,
  adminSearchPlayers,
  type AdminPlayerRow,
} from './lib/firebase-admin';
import { getBinocularHint, getStarHint } from './lib/inventory-hints';
import {
  formatDistance,
  scoreGuess,
  scoreGrade,
  renderHearts,
} from './lib/geo';
import {
  getVisiblePanoramas,
  trashPanorama,
  restoreFromTrash,
  restoreAllFromTrash,
  getTrashedPanoramas,
  getLibraryMapPanoramas,
  markPanoramaSeen,
  panoramaUrl,
  renderPanoramaBadges,
} from './lib/library';
import {
  classicRegionLabel,
  getClassicRegionPanoramaCount,
} from './lib/classic-regions';
import {
  hasProfile,
  getProfile,
  updateProfile,
  persistProfile,
  getDefaultAvatarConfig,
  getPlayerId,
} from './lib/profile';
import { isFirebaseConfigured } from './lib/firebase';
import { ensureFirebaseAuth, waitForFirebaseUid } from './lib/firebase-auth';
import {
  pushProfileToFirestore,
  syncLocalProfileWithFirebase,
  applyCloudPlayerBonuses,
} from './lib/firebase-profile';
import {
  pullCoopRoomFromFirestore,
  pullCoopInviteFromFirestore,
  pullMyCoopRoomsFromFirestore,
  startMyCoopRoomsListener,
  subscribeCoopRoom,
} from './lib/firebase-coop';
import { assetUrl } from './lib/asset-url';
import {
  syncSocialFromCloud,
  startCloudCoopInviteListener,
  stopCloudCoopInviteListener,
} from './lib/firebase-social';
import { loginWithName } from './lib/login';
import { factoryResetApp } from './lib/app-reset';
import { getMatchMessages, sendMatchChatMessage } from './data/match-chat';
import type { MatchChatMessage } from './data/match-chat';
import { subscribeCoopMatchChat, pullCoopMatchChat } from './lib/firebase-match-chat';
import {
  renderMatchChatOverlay,
  renderMatchChatToast,
  getCoopPartnerId,
} from './lib/match-chat-ui';
import {
  acceptFirestoreFriendRequest,
  declineFirestoreFriendRequest,
  sendFirestoreFriendRequest,
  searchFirestoreUsersByName,
} from './lib/firebase-friends';
import { getCloudIncomingCoopInvites } from './data/social';
import {
  addScoreboardEntry,
  getScoreboard,
  clearScoreboard,
  formatScoreDate,
  getPersonalBest,
  isScoreboardEntryMine,
  isScoreboardCloudEnabled,
  syncScoreboardFromCloud,
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
import {
  canUseInventoryItem,
  consumeStashItemCharge,
  countItemUsesThisRound,
  getStash,
  getStashItemCharges,
  takeBonusHeartsForRun,
  takeBonusPointsForRun,
} from './lib/stash';
import {
  MAX_HEARTS,
  DISTANCE_FAIL_KM,
  type AppState,
  type ClassicRegionFilter,
  type GameMode,
  type Round,
  type Screen,
} from './types';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

let state: AppState = {
  screen: 'home',
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
  socialAddNameDraft: '',
  socialToast: null,
  creditsOpen: false,
  classicSetupOpen: false,
  classicRegion: 'world',
  isDailyRun: false,
  dailyWheelOpen: false,
  dailyWheelResult: null,
  isCoopRun: false,
  coopRoomId: null,
  coopMyRole: null,
  coopSetupOpen: false,
  coopSetupFriendId: null,
  coopSyncMode: 'live',
  coopGameMode: 'classic',
  socialCloudSearch: [],
  matchChatOpen: false,
  matchChatDraft: '',
  matchChatUnread: 0,
  adminOpen: false,
  adminQuery: '',
  adminResults: [] as AdminPlayerRow[],
  adminSelectedUid: null as string | null,
  adminStatus: null as string | null,
};

let scoreSavedForSession = false;
let gameStatsRecorded = false;

let panoViewer: { destroy: () => void } | null = null;
let panoInitToken = 0;
let map: maplibregl.Map | null = null;
let guessMarker: maplibregl.Marker | null = null;
let answerMarker: maplibregl.Marker | null = null;
let socialOnlineTimer: ReturnType<typeof setInterval> | null = null;
let dailyCountdownTimer: ReturnType<typeof setInterval> | null = null;
let libraryMarkers: maplibregl.Marker[] = [];
let libraryMapInitToken = 0;
let matchChatUnsub: (() => void) | null = null;
let activeCoopRoomUnsub: (() => void) | null = null;
let coopWaitPollTimer: ReturnType<typeof setInterval> | null = null;
let namePromptBound = false;
let socialSearchTimer: ReturnType<typeof setTimeout> | null = null;
let adminSearchTimer: ReturnType<typeof setTimeout> | null = null;

const app = document.getElementById('app')!;

function render(): void {
  destroyPanorama();
  destroyMap();
  app.innerHTML = getScreenHtml(state.screen);
  bindScreenEvents(state.screen);
  void hydrateAvatarCanvases(app);
  if (state.screen === 'explore' || state.screen === 'guess') bindInventoryEvents();
  if (state.screen === 'coop-reveal') initCoopRevealMap();
  if (state.screen === 'coop-vote') initCoopVoteMap();
  if (state.screen === 'coop-result') initCoopResultMap();
  if (state.screen === 'home') {
    syncSocialOnlineTimer();
    syncDailyCountdownTimer();
  } else {
    clearSocialOnlineTimer();
    clearDailyCountdownTimer();
  }
  if (state.screen === 'explore' || state.screen === 'library-view') initPanorama();
  if (state.screen === 'guess') initGuessMap();
  if (state.screen === 'result') initResultMap();
  if (state.screen === 'library-map') initLibraryMap();
  if (isMatchChatScreen()) {
    const log = app.querySelector('[data-match-chat-log]');
    if (log) log.scrollTop = log.scrollHeight;
  }
}

function getScreenHtml(screen: Screen): string {
  switch (screen) {
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
    case 'library-map':
      return renderLibraryMap();
    case 'scoreboard':
      return renderScoreboard();
    case 'player-info':
      return renderPlayerInfo();
    case 'coop-wait':
      return renderCoopWait();
    case 'coop-reveal':
      return renderCoopRevealScreen();
    case 'coop-vote':
      return renderCoopVoteScreen();
    case 'coop-result':
      return renderCoopResultScreen();
    case 'onboarding':
      return renderHome();
  }
}

function renderHome(): string {
  const modes: GameMode[] = ['classic', 'past', 'future'];
  const modeIcons = { classic: '📍', past: '⏳', future: '🚀' };
  const panoCount = getVisiblePanoramas().length;
  const profile = getProfile();
  const avatarConfig = profile?.avatarConfig ?? state.avatarConfig;
  const displayName = profile?.name ?? 'Player';
  const pendingSocial = getSocialBadgeCount(getPlayerId());
  const soloActive = state.playType === 'solo';
  const incomingCoop = getCloudIncomingCoopInvites();
  const myActiveCoop = getMyActiveCoopRooms(getPlayerId());
  const hostJoinCoop = myActiveCoop.filter((r) => {
    const info = describeCoopSession(r, getPlayerId());
    return info.myRole === 'host' && info.needsAttention;
  });
  const mpFriends = getFriends();
  const mpFriendReady =
    mpFriends.length > 0 &&
    state.coopSetupFriendId !== null &&
    mpFriends.some((f) => f.id === state.coopSetupFriendId);

  return `
    <div class="screen screen-home">
      ${
        incomingCoop.length > 0 || hostJoinCoop.length > 0 || myActiveCoop.length > 0
          ? `<div class="home-coop-banner">
              ${incomingCoop
                .map(
                  (inv) => `
                <div class="home-coop-invite">
                  <span><strong>${escapeHtml(inv.fromName)}</strong> invited you to Co-op · ${escapeHtml(inv.syncMode === 'live' ? 'Live' : 'Async')}</span>
                  <div class="home-coop-invite-actions">
                    <button type="button" class="btn btn-primary btn-sm" data-action="accept-coop-home" data-invite="${inv.id}">Accept &amp; play</button>
                    <button type="button" class="btn btn-secondary btn-sm" data-action="decline-coop-home" data-invite="${inv.id}">Decline</button>
                  </div>
                </div>`,
                )
                .join('')}
              ${hostJoinCoop
                .map(
                  (room) => `
                <div class="home-coop-invite home-coop-ready">
                  <span><strong>${escapeHtml(room.guestName)}</strong> accepted · ${escapeHtml(room.roundTitle)}</span>
                  <div class="home-coop-invite-actions">
                    <button type="button" class="btn btn-primary btn-sm" data-action="enter-coop-room" data-room="${room.id}">Join game</button>
                  </div>
                </div>`,
                )
                .join('')}
              ${
                myActiveCoop.length > 0
                  ? `<div class="home-coop-invite">
                      <span>${myActiveCoop.length} active Co-op game${myActiveCoop.length === 1 ? '' : 's'}</span>
                      <div class="home-coop-invite-actions">
                        <button type="button" class="btn btn-secondary btn-sm" data-action="open-coop-games">Open games</button>
                      </div>
                    </div>`
                  : ''
              }
            </div>`
          : ''
      }
      <header class="hero">
        <div class="hero-profile-row">
          <button class="player-chip" data-action="player-info" aria-label="Player info">
            ${renderAvatar(avatarConfig, 'avatar avatar-lg avatar-idle')}
            <span class="player-name">${escapeHtml(displayName)}</span>
          </button>
          <button class="social-btn icon-btn" data-action="social" aria-label="Friends and social">
            <span class="social-btn-icon" aria-hidden="true">👥</span>
            ${pendingSocial > 0 ? `<span class="social-btn-badge">${pendingSocial}</span>` : ''}
          </button>
          ${isAdminPlayer() ? `<button class="icon-btn admin-btn" data-action="admin" aria-label="Admin panel" title="Admin">⚙</button>` : ''}
        </div>
        <img
          class="app-logo"
          src="${assetUrl('/ChronoPinLogo.png')}"
          alt="ChronoPin"
          width="220"
          height="220"
          decoding="async"
        />
        <p class="tagline">Guess <strong>where</strong>. In time modes, also guess <strong>when</strong>.</p>
        <span class="badge">${panoCount} panoramas · Solo &amp; Co-op</span>
      </header>

      <section class="panel">
        <div class="segmented" role="tablist">
          <button class="segmented-btn ${soloActive ? 'active' : ''}" data-play="solo" role="tab" aria-selected="${soloActive}">Solo</button>
          <button class="segmented-btn ${soloActive ? '' : 'active'}" data-play="multiplayer" role="tab" aria-selected="${!soloActive}">Multiplayer</button>
        </div>

        <div class="solo-panel${soloActive ? '' : ' hidden'}">
          ${renderDailyHomeCard()}

          <h2>Choose mode</h2>
          <p class="hint">3 hearts per run · bad guesses cost a heart</p>
          <div class="mode-grid">
            ${modes
              .map(
                (m) => `
              <button class="mode-card" data-mode="${m}" data-action="${m === 'classic' ? 'select-classic' : 'start-mode'}">
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
                <span>Your personal best runs</span>
              </span>
              <span class="tool-count">${getScoreboard().length}</span>
            </button>
            <button class="tool-card" data-action="library">
              <span class="tool-icon">🗂️</span>
              <span class="tool-info">
                <strong>Panorama Library</strong>
                <span>Browse, preview &amp; manage scenes</span>
              </span>
              <span class="tool-count">${panoCount}</span>
            </button>
          </div>
        </div>

        <div class="multi-panel${soloActive ? ' hidden' : ''}">
          <h2>Play together</h2>
          <p class="hint">Pick a friend, then choose a multiplayer mode.</p>
          ${renderMultiplayerFriendPicker(mpFriends, state.coopSetupFriendId)}
          <div class="mp-grid" data-mp-grid>
            ${renderMpCard('Co-op Decide', 'Blind pin → reveal → vote on one final pin', '2 players · Live or async', true, 'coop-decide', mpFriendReady)}
            ${renderMpCard('1v1 Duel', 'Same scene, closest guess wins the round', 'Best of 5 · Coming soon', false)}
            ${renderMpCard('Battle Royale', '4–8 players, elimination rounds', 'Coming soon', false)}
          </div>
        </div>
      </section>

      <footer class="home-footer">
        <p class="footer-note">Map: MapLibre + OpenFreeMap · Panoramas: Wikimedia, Panoramax &amp; more</p>
        <button type="button" class="credits-chip" data-action="credits">Attributes / Credits</button>
      </footer>
      ${renderNamePromptOverlay()}
      ${renderSocialOverlay()}
      ${renderCoopSetup()}
      ${renderCreditsOverlay()}
      ${renderClassicRegionOverlay()}
      ${renderDailyWheelOverlay(state.dailyWheelOpen, state.dailyWheelResult)}
    </div>
  `;
}

function renderStashPanel(): string {
  const stash = getStash();
  const items = [
    ['binoculars', '🔭 Binoculars'],
    ['star', '⭐ North Star'],
    ['compass', '🧭 Compass'],
    ['map', '🗺 Pocket map'],
  ] as const;
  const rows = items
    .map(([id, label]) => {
      const n = stash.itemCharges[id] ?? 0;
      return `<div class="stash-row"><span>${label}</span><strong>${n}×</strong></div>`;
    })
    .join('');
  return `
    <div class="stash-grid">
      ${rows}
      <div class="stash-row"><span>♥ Next run bonus</span><strong>+${stash.bonusHeartsNextRun}</strong></div>
      <div class="stash-row"><span>✨ Points bank</span><strong>${stash.bonusPointsBank.toLocaleString('en-GB')}</strong></div>
    </div>
    <p class="hint">Daily wheel prizes land here. Extra uses stack on inventory items.</p>`;
}

function syncDailyCountdownTimer(): void {
  clearDailyCountdownTimer();
  dailyCountdownTimer = setInterval(() => {
    const el = app.querySelector('[data-daily-countdown]');
    if (el) el.textContent = formatDailyCountdown(getNextDailyResetMs());
  }, 30_000);
}

function clearDailyCountdownTimer(): void {
  if (dailyCountdownTimer) {
    clearInterval(dailyCountdownTimer);
    dailyCountdownTimer = null;
  }
}

function openDailyWheel(): void {
  state.dailyWheelOpen = true;
  state.dailyWheelResult = null;
  if (state.screen === 'home') render();
  else patchDailyWheelOverlay();
}

function patchDailyWheelOverlay(): void {
  const html = renderDailyWheelOverlay(state.dailyWheelOpen, state.dailyWheelResult);
  const existing = app.querySelector('[data-daily-wheel-overlay]');
  if (existing) existing.outerHTML = html;
  else app.insertAdjacentHTML('beforeend', html);
}

function closeDailyWheel(): void {
  state.dailyWheelOpen = false;
  state.dailyWheelResult = null;
  state.isDailyRun = false;
  if (state.screen === 'home') render();
  else {
    app.querySelector('[data-daily-wheel-overlay]')?.remove();
    goHome();
  }
}

let dailyWheelBound = false;
let wheelSpinning = false;

function bindDailyEventsOnce(): void {
  if (dailyWheelBound) return;
  dailyWheelBound = true;

  app.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    if (target.closest('[data-action="start-daily"]')) {
      e.preventDefault();
      startDailyGame();
      return;
    }

    if (target.closest('[data-action="open-daily-wheel"]')) {
      e.preventDefault();
      openDailyWheel();
      return;
    }

    if (target.closest('[data-action="open-daily-wheel-result"]')) {
      e.preventDefault();
      openDailyWheel();
      return;
    }

    if (target.closest('[data-action="spin-daily-wheel"]')) {
      e.preventDefault();
      if (wheelSpinning) return;
      wheelSpinning = true;
      const btn = app.querySelector('[data-action="spin-daily-wheel"]') as HTMLButtonElement | null;
      if (btn) btn.disabled = true;
      const { segment, index } = pickWeightedSegment();
      const spinner = app.querySelector('[data-wheel-spinner]') as HTMLElement | null;
      if (!spinner) {
        wheelSpinning = false;
        return;
      }
      const segAngle = 360 / WHEEL_SEGMENTS.length;
      const offset = index * segAngle + segAngle / 2;
      const deg = 5 * 360 + (360 - offset);
      spinner.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      spinner.style.transform = `rotate(${deg}deg)`;
      window.setTimeout(() => {
        const msg = applyWheelReward(segment.id);
        markDailyWheelSpun();
        state.dailyWheelResult = `${segment.emoji} ${segment.label} — ${msg}`;
        wheelSpinning = false;
        patchDailyWheelOverlay();
      }, 4200);
      return;
    }

    if (target.closest('[data-action="close-daily-wheel"]')) {
      e.preventDefault();
      closeDailyWheel();
      return;
    }

    if (target.closest('[data-action="reset-daily-test"]')) {
      e.preventDefault();
      resetDailyForTesting();
      state.dailyWheelOpen = false;
      state.dailyWheelResult = null;
      render();
    }
  });
}

function startDailyGame(): void {
  if (!canPlayDaily()) return;
  if (!hasProfile()) {
    promptForName();
    return;
  }
  const round = pickDailyRound();
  if (!round) {
    void alertDialog('No panoramas available for today’s daily.', 'Daily unavailable');
    return;
  }
  destroyPanorama();
  destroyMap();
  scoreSavedForSession = false;
  gameStatsRecorded = false;
  resetRunStreak();
  state.mode = 'classic';
  state.isDailyRun = true;
  state.dailyWheelOpen = false;
  state.dailyWheelResult = null;
  state.inventoryOpen = false;
  state.session = {
    hearts: MAX_HEARTS,
    score: 0,
    roundNumber: 1,
    usedRoundIds: [round.id],
    lastLostHeart: false,
    lastRoundPoints: 0,
    usedItemsThisRound: [],
    activeHint: null,
    isDaily: true,
  };
  state.round = round;
  state.guess = null;
  markPanoramaSeen(round.panoramaId);
  state.screen = 'explore';
  render();
}

function renderLibraryMap(): string {
  const items = getLibraryMapPanoramas();
  const trashed = getTrashedPanoramas().length;
  return `
    <div class="screen screen-library-map">
      <div class="library-header">
        <button class="icon-btn" data-action="library" aria-label="Back to library">←</button>
        <div>
          <h2>World map</h2>
          <p>${items.length} active pins${trashed > 0 ? ` · ${trashed} in trash hidden` : ''}</p>
        </div>
      </div>
      <div id="library-map" class="map-container map-library-world" aria-label="Panorama world map"></div>
      <p class="library-map-legend">Only active library scenes — trashed panoramas are not shown.</p>
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

function renderNamePromptOverlay(): string {
  if (hasProfile()) return '';
  return `
    <div class="name-prompt-overlay open" data-name-prompt aria-modal="true" role="dialog" aria-label="Enter your name">
      <div class="name-prompt-card">
        <h2>What's your name?</h2>
        <p class="name-prompt-sub">Saved on this device — skip next time you visit.</p>
        <form class="name-prompt-form" data-action="login-form">
          <input
            id="login-name"
            class="login-input"
            name="name"
            type="text"
            maxlength="20"
            autocomplete="nickname"
            placeholder="e.g. Alex"
            required
          />
          <p class="login-error" data-login-error role="alert"></p>
          <button type="submit" class="btn btn-primary btn-lg login-submit">Continue</button>
        </form>
      </div>
    </div>`;
}

function promptForName(): void {
  state.screen = 'home';
  render();
}

async function completeNameSetup(
  result: Extract<Awaited<ReturnType<typeof loginWithName>>, { ok: true }>,
): Promise<void> {
  state.avatarConfig = normalizeAvatarConfig(result.profile.avatarConfig);
  render();
  if (result.authWarning) {
    setTimeout(() => {
      void alertDialog(result.authWarning!, 'Online mode unavailable');
    }, 0);
  }
  if (isFirebaseConfigured() && !result.offline) {
    void startPostLoginCloudSync();
  } else if (isFirebaseConfigured() && result.offline) {
    void startPostLoginCloudSync(true);
  }
}

async function startPostLoginCloudSync(backgroundOnly = false): Promise<void> {
  try {
    const uid = await Promise.race([
      waitForFirebaseUid(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), backgroundOnly ? 4000 : 8000)),
    ]);
    if (!uid) return;
    await applyCloudPlayerBonuses(uid).catch(() => undefined);
    await syncSocialFromCloud().catch(() => undefined);
    await syncScoreboardFromCloud().catch(() => undefined);
    startCloudCoopSync(() => {
      if (state.screen === 'home') render();
      else if (state.socialOpen) patchHomeOverlays();
    });
  } catch (err) {
    console.warn('[ChronoPin] Post-login cloud sync failed:', err);
  }
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
        <span class="sync-badge">${isFirebaseConfigured() ? 'Cloud sync on' : 'Offline mode'}</span>
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
            <strong>${stats.bestRunScore.toLocaleString('en-GB')}</strong>
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
            <strong>${stats.totalScore.toLocaleString('en-GB')}</strong>
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

      <section class="stats-panel">
        <h3>Reward stash</h3>
        ${renderStashPanel()}
        <button type="button" class="btn btn-secondary btn-sm dev-reset-daily" data-action="reset-daily-test">
          Reset daily (test)
        </button>
      </section>

      <section class="stats-panel edit-panel">
        <h3>Edit profile</h3>
        ${renderAvatarEditor(profile.name, 'Save changes')}
      </section>

      <section class="stats-panel danger-panel">
        <h3>Testing</h3>
        <p class="hint">Wipe all local data — you'll be asked for your name again.</p>
        <button type="button" class="btn btn-danger" data-action="factory-reset">Factory Reset</button>
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
        <button class="icon-btn" data-action="scoreboard-back" aria-label="Back">←</button>
        <div>
          <h2>Scoreboard</h2>
          <p>${isScoreboardCloudEnabled() ? 'Global best scores (online)' : 'Best scores on this device'}</p>
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
                <strong>${getPersonalBest(filter === 'all' ? undefined : filter).toLocaleString('en-GB')}</strong> pts
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
                  const isYou = isScoreboardEntryMine(e);
                  return `
                <li class="scoreboard-row ${isYou ? 'scoreboard-you' : ''}">
                  <span class="score-rank">${i + 1}</span>
                  ${renderAvatar(e.avatarConfig, 'avatar avatar-sm')}
                  <div class="score-meta">
                    <strong>${escapeHtml(e.playerName)}${isYou ? ' (you)' : ''}</strong>
                    <span>${modeLabel(e.mode)} · ${e.rounds} rnd · ${formatScoreDate(e.date)}</span>
                  </div>
                  <span class="score-points">${e.score.toLocaleString('en-GB')}</span>
                </li>`;
                })
                .join('')}
            </ol>`
      }

      ${
        entries.length > 0
          ? `<button class="btn btn-secondary scoreboard-clear" data-action="clear-scores">Clear local scores</button>`
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
  action?: string,
  ready = false,
): string {
  const enabled = action === 'coop-decide' && ready;
  const highlighted = highlight && enabled;
  return `
    <button class="mp-card ${highlighted ? 'mp-highlight' : ''}" ${enabled ? `data-action="${action}"` : 'disabled'}>
      <div class="mp-card-top">
        <strong>${title}</strong>
        ${enabled ? '<span class="mp-badge">Play</span>' : '<span class="soon-badge">Soon</span>'}
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
      <span class="session-score">${s.score.toLocaleString('en-GB')} pts</span>
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

function renderClassicRegionOverlay(): string {
  return renderClassicRegionOverlayHtml(state.classicSetupOpen, state.classicRegion);
}

function setClassicSetupOpen(open: boolean): void {
  state.classicSetupOpen = open;
  if (open) {
    state.socialOpen = false;
    state.creditsOpen = false;
  }
  if (state.screen === 'home') patchHomeOverlays();
}

function renderCreditsOverlay(): string {
  return renderCreditsOverlayHtml(state.creditsOpen);
}

function setCreditsOpen(open: boolean): void {
  state.creditsOpen = open;
  if (open) {
    state.socialOpen = false;
    state.classicSetupOpen = false;
  }
  if (state.screen === 'home') patchHomeOverlays();
}

function renderSocialOverlay(): string {
  return renderSocialOverlayHtml({
    open: state.socialOpen,
    tab: state.socialTab,
    view: state.socialView,
    selectedFriendId: state.socialSelectedFriendId,
    messageDraft: state.socialMessageDraft,
    addNameDraft: state.socialAddNameDraft,
    toast: state.socialToast,
    myPlayerId: getPlayerId(),
    cloudSearchResults: state.socialCloudSearch,
  });
}

function renderCoopSetup(): string {
  return renderCoopSetupOverlay({
    open: state.coopSetupOpen,
    friends: getFriends(),
    selectedFriendId: state.coopSetupFriendId,
    syncMode: state.coopSyncMode,
    gameMode: state.coopGameMode,
  });
}

function setCoopSetupOpen(open: boolean, friendId?: string | null): void {
  state.coopSetupOpen = open;
  if (friendId !== undefined) state.coopSetupFriendId = friendId;
  if (open) {
    state.socialOpen = false;
    state.creditsOpen = false;
    state.classicSetupOpen = false;
  }
  if (state.screen === 'home') patchHomeOverlays();
}

function setSocialOpen(open: boolean): void {
  state.socialOpen = open;
  if (open) {
    state.creditsOpen = false;
    state.classicSetupOpen = false;
    state.coopSetupOpen = false;
    void syncSocialFromCloud().then(() => {
      if (state.screen === 'home') patchHomeOverlays();
    });
  }
  if (!open) {
    state.socialView = 'list';
    state.socialSelectedFriendId = null;
    state.socialMessageDraft = '';
    state.socialAddNameDraft = '';
    state.socialToast = null;
  }
  if (state.screen === 'home') patchHomeOverlays();
}

function showSocialToast(text: string): void {
  state.socialToast = text;
  patchHomeOverlays();
  setTimeout(() => {
    if (state.socialToast === text) {
      state.socialToast = null;
      if (state.screen === 'home' && state.socialOpen) patchHomeOverlays();
    }
  }, 2600);
}

function captureSocialFormState(): void {
  const msg = app.querySelector<HTMLInputElement>('[data-social-overlay] input[name="message"]');
  if (msg) state.socialMessageDraft = msg.value;
  const add = app.querySelector<HTMLInputElement>('#social-add-name');
  if (add) state.socialAddNameDraft = add.value;
}

function patchMultiplayerPanel(): void {
  const panel = app.querySelector('.multi-panel');
  if (!panel) return;

  const friends = getFriends();
  const selectedId = state.coopSetupFriendId;
  const coopReady =
    friends.length > 0 &&
    selectedId !== null &&
    friends.some((f) => f.id === selectedId);

  const friendSection = panel.querySelector('[data-mp-friend-section]');
  if (friendSection) {
    friendSection.outerHTML = renderMultiplayerFriendPicker(friends, selectedId);
  }

  const grid = panel.querySelector('[data-mp-grid]');
  if (grid) {
    grid.innerHTML = `
      ${renderMpCard('Co-op Decide', 'Blind pin → reveal → vote on one final pin', '2 players · Live or async', true, 'coop-decide', coopReady)}
      ${renderMpCard('1v1 Duel', 'Same scene, closest guess wins the round', 'Best of 5 · Coming soon', false)}
      ${renderMpCard('Battle Royale', '4–8 players, elimination rounds', 'Coming soon', false)}
    `;
  }
}

function patchSocialSearchResults(): void {
  const slot = app.querySelector('[data-social-search-slot]');
  if (!slot) return;
  slot.innerHTML = renderSocialSearchResultsHtml(
    state.socialAddNameDraft,
    state.socialCloudSearch,
  );
}

function scheduleAdminSearch(term: string): void {
  if (adminSearchTimer) clearTimeout(adminSearchTimer);
  adminSearchTimer = setTimeout(() => {
    adminSearchTimer = null;
    if (!state.adminOpen) return;
    void adminSearchPlayers(term).then((rows) => {
      state.adminResults = rows;
      if (!state.adminSelectedUid && rows[0]) state.adminSelectedUid = rows[0].uid;
      patchHomeOverlays();
    });
  }, 280);
}

function setAdminOpen(open: boolean): void {
  state.adminOpen = open;
  if (open && !state.adminQuery && getProfile()) {
    state.adminQuery = '';
    state.adminResults = [];
    state.adminSelectedUid = null;
    state.adminStatus = null;
  }
  if (!open) {
    state.adminStatus = null;
  }
  if (state.screen === 'home') patchHomeOverlays();
}

function scheduleSocialCloudSearch(term: string): void {
  if (socialSearchTimer) clearTimeout(socialSearchTimer);
  socialSearchTimer = setTimeout(() => {
    socialSearchTimer = null;
    if (!state.socialOpen || state.socialTab !== 'add') return;
    void waitForFirebaseUid().then((uid) => {
      if (!uid) return [];
      const myName = getProfile()?.name.trim().toLowerCase() ?? '';
      return searchFirestoreUsersByName(term, uid, myName);
    }).then((hits) => {
      state.socialCloudSearch = hits ?? [];
      patchSocialSearchResults();
    });
  }, 320);
}

function patchHomeOverlays(): void {
  const activeId = document.activeElement?.id ?? null;
  const activeInput =
    document.activeElement instanceof HTMLInputElement ? document.activeElement : null;
  const activeSel = activeInput?.selectionStart ?? null;

  captureSocialFormState();
  const screen = app.querySelector('.screen-home');
  if (!screen) return;

  const socialHtml = renderSocialOverlay();
  screen.querySelectorAll('.social-overlay ~ .social-overlay').forEach((el) => el.remove());
  const socialEl =
    screen.querySelector('[data-social-overlay]') ?? screen.querySelector('.social-overlay');
  if (socialEl) socialEl.outerHTML = socialHtml;
  else screen.insertAdjacentHTML('beforeend', socialHtml);

  const creditsHtml = renderCreditsOverlay();
  screen.querySelectorAll('.credits-overlay ~ .credits-overlay').forEach((el) => el.remove());
  const creditsEl =
    screen.querySelector('[data-credits-overlay]') ?? screen.querySelector('.credits-overlay');
  if (creditsEl) creditsEl.outerHTML = creditsHtml;
  else screen.insertAdjacentHTML('beforeend', creditsHtml);

  const classicHtml = renderClassicRegionOverlay();
  screen.querySelectorAll('.classic-overlay ~ .classic-overlay').forEach((el) => el.remove());
  const classicEl =
    screen.querySelector('[data-classic-overlay]') ?? screen.querySelector('.classic-overlay');
  if (classicEl) classicEl.outerHTML = classicHtml;
  else screen.insertAdjacentHTML('beforeend', classicHtml);

  const coopHtml = renderCoopSetup();
  screen.querySelectorAll('[data-coop-overlay] ~ [data-coop-overlay]').forEach((el) => el.remove());
  const coopEl = screen.querySelector('[data-coop-overlay]');
  if (coopEl) coopEl.outerHTML = coopHtml;
  else screen.insertAdjacentHTML('beforeend', coopHtml);

  const adminHtml = renderAdminOverlayHtml(
    state.adminOpen,
    state.adminQuery,
    state.adminResults,
    state.adminSelectedUid,
    state.adminStatus,
  );
  screen.querySelectorAll('[data-admin-overlay]').forEach((el) => el.remove());
  if (adminHtml) screen.insertAdjacentHTML('beforeend', adminHtml);

  const badge = screen.querySelector('.social-btn-badge');
  const pending = getSocialBadgeCount(getPlayerId());
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
  if (state.playType === 'multiplayer') patchMultiplayerPanel();

  if (activeId === 'social-add-name' || activeId === 'admin-search') {
    const input = app.querySelector<HTMLInputElement>(`#${activeId}`);
    if (input) {
      input.focus();
      const pos = activeSel ?? input.value.length;
      input.setSelectionRange(pos, pos);
    }
  }
}

function patchSocialOnlineStatus(): void {
  if (state.screen !== 'home' || !state.socialOpen) return;

  app.querySelectorAll<HTMLElement>('.social-friend-row').forEach((row) => {
    const friendId = row.dataset.friend;
    if (!friendId) return;
    const friend = getFriendById(friendId);
    if (!friend) return;
    const online = isFriendOnline(friendId);
    row.querySelector('.social-status')?.classList.toggle('online', online);
    row.querySelector('.social-status')?.classList.toggle('offline', !online);
    const meta = row.querySelector('.social-friend-meta span');
    if (meta) meta.textContent = `${online ? 'Online' : 'Offline'} · ${friend.tagline}`;
  });

  if (state.socialView === 'friend' && state.socialSelectedFriendId) {
    const friend = getFriendById(state.socialSelectedFriendId);
    if (friend) {
      const online = isFriendOnline(state.socialSelectedFriendId);
      const header = app.querySelector('.social-friend-detail-header');
      header?.querySelector('.social-status')?.classList.toggle('online', online);
      header?.querySelector('.social-status')?.classList.toggle('offline', !online);
      const label = header?.querySelector('.social-friend-meta span');
      if (label) label.textContent = `${online ? 'Online' : 'Offline'} · ${friend.tagline}`;
    }
  }
}

function clearSocialOnlineTimer(): void {
  if (socialOnlineTimer) {
    clearInterval(socialOnlineTimer);
    socialOnlineTimer = null;
  }
}

function syncSocialOnlineTimer(): void {
  clearSocialOnlineTimer();
  if (state.screen === 'home' && state.socialOpen) {
    socialOnlineTimer = setInterval(() => {
      if (state.screen === 'home' && state.socialOpen) patchSocialOnlineStatus();
      else clearSocialOnlineTimer();
    }, 5000);
  }
}

function closeHomeOverlays(): void {
  state.socialOpen = false;
  state.creditsOpen = false;
  state.classicSetupOpen = false;
  state.coopSetupOpen = false;
  state.adminOpen = false;
  state.socialView = 'list';
  state.socialSelectedFriendId = null;
  state.socialMessageDraft = '';
  state.socialAddNameDraft = '';
  state.socialToast = null;
  clearSocialOnlineTimer();
}

function navigateFromHome(screen: Screen): void {
  closeHomeOverlays();
  state.screen = screen;
  render();
  if (screen === 'scoreboard') refreshScoreboardCloud();
}

function leaveScoreboard(): void {
  if (state.session) {
    goHome();
    return;
  }
  state.screen = 'home';
  render();
}

function refreshScoreboardCloud(): void {
  if (!isFirebaseConfigured()) return;
  void syncScoreboardFromCloud().then(() => {
    if (state.screen === 'scoreboard') render();
  });
}

function resolveLibraryIndex(): number {
  const items = getVisiblePanoramas();
  if (items.length === 0) return 0;
  if (state.libraryViewId) {
    const byId = items.findIndex((p) => p.id === state.libraryViewId);
    if (byId >= 0) return byId;
  }
  return Math.min(Math.max(0, state.libraryIndex), items.length - 1);
}

function quitRun(): void {
  void (async () => {
    if (state.session && state.session.roundNumber > 0 && state.session.score > 0 && !gameStatsRecorded) {
      const ok = await confirmDialog(
        'Quit this run? Your score so far will be saved to the local scoreboard.',
        { title: 'Quit run?', confirmLabel: 'Quit & save', cancelLabel: 'Keep playing' },
      );
      if (!ok) return;
      finishRunEarly();
    }
    goHome();
  })();
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

    if (target.closest('[data-action="admin"]')) {
      if (state.screen === 'home' && isAdminPlayer()) {
        e.preventDefault();
        setAdminOpen(!state.adminOpen);
      }
      return;
    }

    if (target.closest('[data-action="close-admin"]')) {
      e.preventDefault();
      setAdminOpen(false);
      return;
    }

    if (target.closest('[data-action="admin-pick"]')) {
      const uid = (target.closest('[data-action="admin-pick"]') as HTMLElement).dataset.uid;
      if (uid) {
        state.adminSelectedUid = uid;
        patchHomeOverlays();
      }
      return;
    }

    if (target.closest('[data-action="admin-grant-item"]')) {
      const selected = state.adminResults.find((r) => r.uid === state.adminSelectedUid);
      const panel = target.closest('[data-admin-overlay]');
      const itemEl = panel?.querySelector<HTMLSelectElement>('[data-admin-item]');
      const amountEl = panel?.querySelector<HTMLInputElement>('[data-admin-amount]');
      if (!selected || !itemEl || !amountEl) return;
      void adminGrantStash(
        selected.searchName,
        itemEl.value as import('./data/inventory').InventoryItemId,
        Number(amountEl.value) || 1,
      ).then(() => {
        state.adminStatus = `Granted ${amountEl.value}× ${itemEl.value} to ${selected.name}.`;
        patchHomeOverlays();
      }).catch((err) => {
        state.adminStatus = err instanceof Error ? err.message : 'Grant failed.';
        patchHomeOverlays();
      });
      return;
    }

    if (target.closest('[data-action="admin-grant-hearts"]')) {
      const selected = state.adminResults.find((r) => r.uid === state.adminSelectedUid);
      if (!selected) return;
      void adminGrantHearts(selected.searchName, 1).then(() => {
        state.adminStatus = `+1 bonus heart queued for ${selected.name}.`;
        patchHomeOverlays();
      }).catch((err) => {
        state.adminStatus = err instanceof Error ? err.message : 'Grant failed.';
        patchHomeOverlays();
      });
      return;
    }

    if (target.closest('[data-action="admin-delete-player"]')) {
      const btn = target.closest('[data-action="admin-delete-player"]') as HTMLElement;
      const name = btn.dataset.name ?? '';
      void (async () => {
        const ok = await confirmDialog(
          `Delete account "${name}" from cloud? They can register again with the same name.`,
          { title: 'Delete player', confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true },
        );
        if (!ok) return;
        try {
          await adminDeletePlayer(name);
          state.adminStatus = `Deleted ${name}.`;
          state.adminResults = state.adminResults.filter(
            (r) => r.name.toLowerCase() !== name.toLowerCase(),
          );
          patchHomeOverlays();
        } catch (err) {
          state.adminStatus = err instanceof Error ? err.message : 'Delete failed.';
          patchHomeOverlays();
        }
      })();
      return;
    }

    if (target.closest('[data-action="credits"]')) {
      if (state.screen === 'home') {
        e.preventDefault();
        setCreditsOpen(!state.creditsOpen);
      }
      return;
    }

    if (target.closest('[data-action="close-credits"]')) {
      e.preventDefault();
      e.stopPropagation();
      setCreditsOpen(false);
      return;
    }

    if (target.closest('[data-action="select-classic"]')) {
      if (state.screen === 'home') {
        e.preventDefault();
        if (!hasProfile()) {
          promptForName();
          return;
        }
        setClassicSetupOpen(true);
      }
      return;
    }

    if (target.closest('[data-action="close-classic-setup"]')) {
      e.preventDefault();
      setClassicSetupOpen(false);
      return;
    }

    if (target.closest('[data-action="pick-classic-region"]') && state.classicSetupOpen) {
      const btn = target.closest<HTMLElement>('[data-action="pick-classic-region"]');
      const region = btn?.dataset.region as ClassicRegionFilter | undefined;
      if (region && getClassicRegionPanoramaCount(region) > 0) {
        state.classicRegion = region;
        patchHomeOverlays();
      }
      return;
    }

    if (target.closest('[data-action="start-classic"]') && state.classicSetupOpen) {
      e.preventDefault();
      if (getClassicRegionPanoramaCount(state.classicRegion) === 0) return;
      setClassicSetupOpen(false);
      startGame('classic');
      return;
    }

    const tabBtn = target.closest<HTMLElement>('[data-social-tab]');
    if (tabBtn && state.socialOpen) {
      state.socialTab = tabBtn.dataset.socialTab as 'friends' | 'games' | 'add';
      state.socialView = 'list';
      state.socialSelectedFriendId = null;
      patchHomeOverlays();
      return;
    }

    const friendBtn = target.closest<HTMLElement>('[data-action="open-friend"]');
    if (friendBtn && state.socialOpen) {
      state.socialView = 'friend';
      state.socialSelectedFriendId = friendBtn.dataset.friend ?? null;
      state.socialMessageDraft = '';
      patchHomeOverlays();
      return;
    }

    if (target.closest('[data-action="social-back"]') && state.socialOpen) {
      state.socialView = 'list';
      state.socialSelectedFriendId = null;
      state.socialMessageDraft = '';
      patchHomeOverlays();
      return;
    }

    const acceptBtn = target.closest<HTMLElement>('[data-action="accept-request"]');
    if (acceptBtn && state.socialOpen) {
      const requestId = acceptBtn.dataset.request ?? '';
      if (requestId.startsWith('fr-')) {
        void acceptFirestoreFriendRequest(
          requestId,
          getProfile()?.name.trim().toLowerCase(),
        ).then(() => syncSocialFromCloud()).then(() => {
          showSocialToast('Request accepted — say hi!');
          patchHomeOverlays();
        });
      } else {
        acceptFriendRequest(requestId);
        patchHomeOverlays();
        showSocialToast('Request accepted — say hi!');
      }
      return;
    }

    const declineBtn = target.closest<HTMLElement>('[data-action="decline-request"]');
    if (declineBtn && state.socialOpen) {
      const requestId = declineBtn.dataset.request ?? '';
      if (requestId.startsWith('fr-')) {
        void declineFirestoreFriendRequest(requestId).then(() => syncSocialFromCloud()).then(patchHomeOverlays);
      } else {
        declineFriendRequest(requestId);
        showSocialToast('Request declined.');
      }
      return;
    }

    const sendReqBtn = target.closest('[data-action="send-friend-request"]');
    if (sendReqBtn && state.socialOpen) {
      const input = app.querySelector<HTMLInputElement>('#social-add-name');
      const name = input?.value ?? '';
      const profile = getProfile();

      if (isFirebaseConfigured() && name.trim().length >= 2 && profile) {
        const exact = state.socialCloudSearch.find(
          (u) => u.name.toLowerCase() === name.trim().toLowerCase(),
        );
        const hit = exact ?? state.socialCloudSearch[0];
        if (hit) {
          if (hit.name.trim().toLowerCase() === profile.name.trim().toLowerCase()) {
            showSocialToast("That's you — pick someone else.");
            return;
          }
          void sendFirestoreFriendRequest(hit.uid, hit.name, profile.name, profile.avatarConfig).then(
            (id) => {
              if (id) {
                state.socialAddNameDraft = '';
                if (input) input.value = '';
                showSocialToast(`Request sent to ${hit.name}!`);
                patchHomeOverlays();
              } else {
                showSocialToast('Could not send request.');
              }
            },
          );
          return;
        }
      }

      const result = sendFriendRequestByName(name, getPlayerId());
      if (result === 'empty') showSocialToast('Enter a name to search.');
      else if (result === 'not_found') showSocialToast('No player found with that name.');
      else if (result === 'already_friend') showSocialToast('Already friends!');
      else if (result === 'already_sent') showSocialToast('Request already pending.');
      else if (result === 'self') showSocialToast('That is you!');
      else {
        state.socialAddNameDraft = '';
        if (input) input.value = '';
        showSocialToast('Friend request sent!');
        patchHomeOverlays();
      }
      return;
    }

    const sendToBtn = target.closest<HTMLElement>('[data-action="send-request-to"]');
    if (sendToBtn && state.socialOpen) {
      const userId = sendToBtn.dataset.user;
      const source = sendToBtn.dataset.source;
      const profile = getProfile();
      if (source === 'cloud' && userId && profile) {
        const name = sendToBtn.dataset.name ?? 'Player';
        if (name.trim().toLowerCase() === profile.name.trim().toLowerCase()) {
          showSocialToast("That's you — pick someone else.");
          return;
        }
        void waitForFirebaseUid().then((uid) => {
          if (uid === userId) {
            showSocialToast("That's you — pick someone else.");
            return;
          }
          void sendFirestoreFriendRequest(
            userId,
            name,
            profile.name,
            profile.avatarConfig,
          ).then((id) => {
            if (id) showSocialToast(`Request sent to ${name}!`);
            else showSocialToast('Could not send request.');
          });
        });
      } else if (userId) {
        const user = getDirectoryUser(userId);
        if (user) {
          const result = sendFriendRequestToUser(user, getPlayerId());
          if (result === 'sent') showSocialToast(`Request sent to ${user.name}!`);
          else if (result === 'already_friend') showSocialToast('Already friends!');
          else if (result === 'already_sent') showSocialToast('Request already pending.');
          else if (result === 'self') showSocialToast("That's you — pick someone else.");
          patchHomeOverlays();
        }
      }
      return;
    }

    const cancelReqBtn = target.closest<HTMLElement>('[data-action="cancel-request"]');
    if (cancelReqBtn && state.socialOpen) {
      cancelOutgoingRequest(cancelReqBtn.dataset.request!);
      showSocialToast('Request cancelled.');
      patchHomeOverlays();
      return;
    }

    if (target.closest('[data-action="open-coop-setup"]')) {
      const btn = target.closest<HTMLElement>('[data-action="open-coop-setup"]');
      setCoopSetupOpen(true, btn?.dataset.friend ?? null);
      return;
    }

    if (target.closest('[data-action="close-coop-setup"]')) {
      setCoopSetupOpen(false);
      return;
    }

    const pickMpFriend = target.closest<HTMLElement>('[data-action="pick-mp-friend"]');
    if (pickMpFriend && state.screen === 'home' && state.playType === 'multiplayer') {
      state.coopSetupFriendId = pickMpFriend.dataset.friend ?? null;
      patchMultiplayerPanel();
      void hydrateAvatarCanvases(app);
      return;
    }

    const pickCoopFriend = target.closest<HTMLElement>('[data-action="pick-coop-friend"]');
    if (pickCoopFriend && state.coopSetupOpen) {
      state.coopSetupFriendId = pickCoopFriend.dataset.friend ?? null;
      patchHomeOverlays();
      return;
    }

    const pickCoopSync = target.closest<HTMLElement>('[data-action="pick-coop-sync"]');
    if (pickCoopSync && state.coopSetupOpen) {
      state.coopSyncMode = (pickCoopSync.dataset.sync as 'live' | 'async') ?? 'live';
      patchHomeOverlays();
      return;
    }

    const pickCoopMode = target.closest<HTMLElement>('[data-action="pick-coop-mode"]');
    if (pickCoopMode && state.coopSetupOpen) {
      state.coopGameMode = (pickCoopMode.dataset.mode as GameMode) ?? 'classic';
      patchHomeOverlays();
      return;
    }

    if (target.closest('[data-action="send-coop-invite"]') && state.coopSetupOpen) {
      sendCoopInviteFromSetup();
      return;
    }

    const acceptCoopBtn = target.closest<HTMLElement>('[data-action="accept-coop-invite"]');
    if (acceptCoopBtn && state.socialOpen) {
      void acceptAndJoinCoopInvite(acceptCoopBtn.dataset.invite!);
      return;
    }

    const acceptCoopHome = target.closest<HTMLElement>('[data-action="accept-coop-home"]');
    if (acceptCoopHome) {
      void acceptAndJoinCoopInvite(acceptCoopHome.dataset.invite!);
      return;
    }

    const declineCoopHome = target.closest<HTMLElement>('[data-action="decline-coop-home"]');
    if (declineCoopHome) {
      declineCoopInvite(declineCoopHome.dataset.invite!);
      void syncSocialFromCloud().then(() => render());
      return;
    }

    const declineCoopBtn = target.closest<HTMLElement>('[data-action="decline-coop-invite"]');
    if (declineCoopBtn && state.socialOpen) {
      declineCoopInvite(declineCoopBtn.dataset.invite!);
      showSocialToast('Invite declined.');
      patchHomeOverlays();
      return;
    }

    const cancelCoopBtn = target.closest<HTMLElement>('[data-action="cancel-coop-invite"]');
    if (cancelCoopBtn && state.socialOpen) {
      cancelCoopInvite(cancelCoopBtn.dataset.invite!);
      showSocialToast('Invite cancelled.');
      patchHomeOverlays();
      return;
    }

    const enterCoopBtn = target.closest<HTMLElement>('[data-action="enter-coop-room"]');
    if (enterCoopBtn) {
      const roomId = enterCoopBtn.dataset.room;
      if (roomId) void enterCoopRoom(roomId);
      return;
    }

    const deleteCoopBtn = target.closest<HTMLElement>('[data-action="delete-coop-game"]');
    if (deleteCoopBtn) {
      const roomId = deleteCoopBtn.dataset.room;
      if (roomId) void confirmDeleteCoopGame(roomId);
      return;
    }

    if (target.closest('[data-action="open-coop-games"]')) {
      state.socialOpen = true;
      state.socialTab = 'games';
      state.socialView = 'list';
      patchHomeOverlays();
      return;
    }

    const startCoopBtn = target.closest<HTMLElement>('[data-action="start-coop-room"]');
    if (startCoopBtn) {
      const roomId = startCoopBtn.dataset.room;
      if (roomId) void enterCoopRoom(roomId);
      return;
    }

    if (target.closest('[data-action="coop-decide"]') && state.screen === 'home') {
      if (!hasProfile()) {
        promptForName();
        return;
      }
      if (!state.coopSetupFriendId) {
        showSocialToast('Pick a friend from your list first.');
        return;
      }
      state.playType = 'multiplayer';
      setCoopSetupOpen(true, state.coopSetupFriendId);
      return;
    }
  });

  app.addEventListener('input', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.matches('[data-social-overlay] input[name="message"]')) {
      state.socialMessageDraft = target.value;
    }
    if (target.id === 'social-add-name') {
      state.socialAddNameDraft = target.value;
      if (state.socialOpen && state.socialTab === 'add') {
        scheduleSocialCloudSearch(target.value);
      }
    }
    if (target.id === 'admin-search') {
      state.adminQuery = target.value;
      if (state.adminOpen) scheduleAdminSearch(target.value);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || state.screen !== 'home') return;
    if (state.coopSetupOpen) {
      e.preventDefault();
      setCoopSetupOpen(false);
    } else if (state.socialOpen) {
      e.preventDefault();
      setSocialOpen(false);
    } else if (state.adminOpen) {
      e.preventDefault();
      setAdminOpen(false);
    } else if (state.creditsOpen) {
      e.preventDefault();
      setCreditsOpen(false);
    } else if (state.classicSetupOpen) {
      e.preventDefault();
      setClassicSetupOpen(false);
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
      patchHomeOverlays();
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
  const coopRoom = state.isCoopRun && state.coopRoomId ? getCoopRoom(state.coopRoomId) : null;
  const coopHud =
    coopRoom && state.coopMyRole ? renderCoopHud(coopRoom, state.coopMyRole) : '';

  return `
    <div class="screen screen-explore">
      <div class="top-bar">
        <button class="icon-btn" data-action="quit" aria-label="Quit">←</button>
        <div class="top-bar-center">
          <span class="mode-pill mode-${state.mode}">${coopRoom ? 'Co-op' : state.session?.isDaily ? 'Daily' : state.mode === 'classic' && state.classicRegion !== 'world' ? `Classic · ${classicRegionLabel(state.classicRegion)}` : modeLabel(state.mode!)}</span>
          <span class="round-title">${round.title}</span>
        </div>
        <div class="top-bar-right">
          ${state.isCoopRun ? '' : renderGameAvatarButton()}
          ${state.isCoopRun ? '' : renderSessionHud()}
        </div>
      </div>

      ${coopHud}
      ${state.isCoopRun ? '' : renderGameChrome()}

      ${round.isAiGenerated ? '<div class="ai-banner">Speculative / AI-assisted scene</div>' : ''}

      <div id="pano" class="pano-container" aria-label="360 panorama — drag to look around"></div>

      <div class="explore-hud">
        <p class="explore-tip">${state.isCoopRun ? 'Co-op: your pin stays hidden until reveal' : 'Drag to look around · Pinch to zoom'}</p>
        ${showYearHint ? '<p class="explore-tip accent">You will also guess the year</p>' : ''}
        <button class="btn btn-primary btn-lg" data-action="guess">${state.isCoopRun ? 'Drop your hidden pin' : 'Drop your pin'}</button>
      </div>
      ${renderCoopMatchChatChrome()}
    </div>
  `;
}

function renderGuess(): string {
  const needsYear = state.round!.answer.year != null;
  const defaultYear =
    state.mode === 'past' ? 1920 : state.mode === 'future' ? 2050 : new Date().getFullYear();
  const year = state.guess?.year ?? defaultYear;
  const coopRoom = state.isCoopRun && state.coopRoomId ? getCoopRoom(state.coopRoomId) : null;
  const coopHud =
    coopRoom && state.coopMyRole ? renderCoopHud(coopRoom, state.coopMyRole) : '';

  return `
    <div class="screen screen-guess">
      <div class="guess-header">
        <button class="icon-btn" data-action="back-explore" aria-label="Back">←</button>
        <div class="guess-header-text">
          <h2>${state.isCoopRun ? 'Hidden team pin' : 'Where is this?'}</h2>
          ${needsYear ? '<p>Tap the map, then set the year</p>' : '<p>Tap the map to place your pin</p>'}
        </div>
        <div class="guess-header-right">
          ${state.isCoopRun ? '' : renderGameAvatarButton()}
          ${state.isCoopRun ? '' : state.session ? renderSessionHud() : ''}
        </div>
      </div>

      ${coopHud}
      ${state.isCoopRun ? '' : renderGameChrome()}

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
      ${renderCoopMatchChatChrome()}
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
  const canContinue = s.hearts > 0 && !s.isDaily;
  const isDaily = Boolean(s.isDaily);

  return `
    <div class="screen screen-result">
      ${isDaily ? '<div class="daily-result-banner">📅 Daily ChronoPin complete!</div>' : ''}
      <div class="result-top">
        ${renderSessionHud()}
      </div>

      <div class="result-header">
        <span class="grade-badge">${grade}</span>
        <h2>${Math.round((score.points / score.maxPoints) * 100)}%</h2>
        <p class="score-sub">+${score.points.toLocaleString('en-GB')} pts this round</p>
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
        ${
          isDaily
            ? `<button class="btn btn-primary btn-lg" data-action="open-daily-wheel-result">Spin for reward 🎡</button>
               <button class="btn btn-secondary" data-action="quit">Home</button>`
            : `<button class="btn btn-secondary" data-action="quit">${canContinue ? 'Quit' : 'Home'}</button>
               <button class="btn btn-primary" data-action="next">${canContinue ? 'Next round →' : 'See results'}</button>`
        }
      </div>
      ${isDaily || state.dailyWheelOpen ? renderDailyWheelOverlay(state.dailyWheelOpen, state.dailyWheelResult) : ''}
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
            <strong>${s.score.toLocaleString('en-GB')}</strong>
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
  const trashed = getTrashedPanoramas();

  return `
    <div class="screen screen-library">
      <div class="library-header">
        <button class="icon-btn" data-action="home" aria-label="Home">←</button>
        <div>
          <h2>Panorama Library</h2>
          <p>${items.length} active · ${trashed.length} in trash</p>
        </div>
        <button class="icon-btn library-map-btn" data-action="library-map" aria-label="World map" title="World map">🌍</button>
      </div>

      ${
        items.length === 0
          ? `<div class="library-empty">
              <p>No active panoramas.</p>
              ${trashed.length > 0 ? `<button class="btn btn-secondary" data-action="restore-all-trash">Restore all from trash</button>` : ''}
            </div>`
          : `<ul class="library-list">
              ${items
                .map(
                  (p, i) => `
                <li class="library-item" data-id="${p.id}" data-index="${i}">
                  <img class="library-thumb" src="${panoramaUrl(p)}" alt="${escapeHtml(p.title)}" loading="lazy" />
                  <div class="library-meta">
                    <strong>${p.title}${renderPanoramaBadges(p)}</strong>
                    <span>${p.region}</span>
                    <span class="library-tags">${p.modes.join(' · ')}</span>
                  </div>
                  <button class="library-delete" data-delete="${p.id}" aria-label="Move ${p.title} to trash" title="Move to trash">🗑</button>
                </li>`,
                )
                .join('')}
            </ul>`
      }

      ${
        trashed.length > 0
          ? `<section class="library-trash-section">
              <h3 class="library-trash-title">🗑 Trash (${trashed.length})</h3>
              <p class="hint">Removed scenes stay here until you restore them.</p>
              <ul class="library-list library-trash-list">
                ${trashed
                  .map(
                    (p) => `
                  <li class="library-item library-item-trash" data-id="${p.id}">
                    <div class="library-meta">
                      <strong>${p.title}</strong>
                      <span>${p.region}</span>
                    </div>
                    <button class="btn btn-secondary btn-sm" data-restore="${p.id}">Restore</button>
                  </li>`,
                  )
                  .join('')}
              </ul>
              <button class="btn btn-secondary library-restore" data-action="restore-all-trash">Restore all from trash</button>
            </section>`
          : ''
      }
    </div>
  `;
}

function renderLibraryView(): string {
  const items = getVisiblePanoramas();
  const idx = resolveLibraryIndex();
  state.libraryIndex = idx;
  const item = items[idx];
  if (!item) return renderLibrary();

  return `
    <div class="screen screen-library-view">
      <div class="top-bar">
        <button class="icon-btn" data-action="library-back" aria-label="Back to list">←</button>
        <div class="top-bar-center">
          <span class="round-title">${item.title}${renderPanoramaBadges(item)}</span>
          <span class="library-view-region">${item.region}</span>
        </div>
        <span class="library-nav-count">${idx + 1}/${items.length}</span>
      </div>

      <div id="pano" class="pano-container" aria-label="360 preview"></div>

      <div class="library-view-bar">
        <button class="btn btn-secondary" data-action="lib-prev" ${idx === 0 ? 'disabled' : ''}>← Prev</button>
        <button class="btn btn-secondary" data-action="lib-delete" data-id="${item.id}">Trash</button>
        <button class="btn btn-secondary" data-action="lib-next" ${idx >= items.length - 1 ? 'disabled' : ''}>Next →</button>
      </div>
      <p class="library-view-attribution">${escapeHtml(item.attribution)} · ${escapeHtml(item.license)}</p>
    </div>
  `;
}

function bindScreenEvents(screen: Screen): void {
  if (screen === 'player-info') bindProfileFormEvents();
  if (screen === 'home') bindHomeEvents();
  if (screen === 'explore') bindExploreEvents();
  if (screen === 'guess') bindGuessEvents();
  if (screen === 'result') bindResultEvents();
  if (screen === 'gameover') bindGameOverEvents();
  if (screen === 'library') bindLibraryEvents();
  if (screen === 'library-view') bindLibraryViewEvents();
  if (screen === 'library-map') bindLibraryMapEvents();
  if (screen === 'scoreboard') bindScoreboardEvents();
  if (screen === 'coop-wait') bindCoopWaitEvents();
  if (screen === 'coop-reveal') bindCoopRevealEvents();
  if (screen === 'coop-vote') bindCoopVoteEvents();
  if (screen === 'coop-result') bindCoopResultEvents();
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

  app.querySelectorAll('[data-action="pick-preset-color"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement;
      const kind = el.dataset.kind as 'hair' | 'top' | 'pants' | 'shoes';
      const value = el.dataset.value!;
      state.avatarConfig = configWithCustomColor(kind, value, state.avatarConfig);
      patchAvatarEditor();
    });
  });

  app.querySelectorAll<HTMLInputElement>('[data-action="pick-custom-color"]').forEach((input) => {
    input.addEventListener('input', () => {
      const kind = input.dataset.kind as 'hair' | 'top' | 'pants' | 'shoes';
      state.avatarConfig = configWithCustomColor(kind, input.value, state.avatarConfig);
      updateHeroAvatarCanvases(app, state.avatarConfig);
      void hydrateAvatarCanvases(app);
    });
    input.addEventListener('change', () => {
      patchAvatarEditor();
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

function isMatchChatScreen(): boolean {
  return (
    state.isCoopRun &&
    (state.screen === 'explore' ||
      state.screen === 'guess' ||
      state.screen === 'coop-wait' ||
      state.screen === 'coop-reveal' ||
      state.screen === 'coop-vote' ||
      state.screen === 'coop-result')
  );
}

function renderCoopMatchChatChrome(): string {
  if (!state.isCoopRun || !state.coopRoomId || !state.coopMyRole) return '';
  const room = getCoopRoom(state.coopRoomId);
  if (!room) return '';
  return renderMatchChatOverlay({
    room,
    myRole: state.coopMyRole,
    open: state.matchChatOpen,
    draft: state.matchChatDraft,
    unread: state.matchChatUnread,
    messages: getMatchMessages(state.coopRoomId),
  });
}

function stopMatchChatListener(): void {
  matchChatUnsub?.();
  matchChatUnsub = null;
}

function pushMatchChatToast(msg: MatchChatMessage): void {
  const room = state.coopRoomId ? getCoopRoom(state.coopRoomId) : null;
  if (!room || !state.coopMyRole) return;
  const partnerId = getCoopPartnerId(room, state.coopMyRole);
  const partner = getFriendById(partnerId);
  const container = app.querySelector('[data-match-chat-toasts]');
  if (!container) return;
  if (container.querySelector(`[data-match-chat-toast="${msg.id}"]`)) return;

  container.insertAdjacentHTML(
    'beforeend',
    renderMatchChatToast(msg, partner?.avatarConfig ?? null),
  );
  void hydrateAvatarCanvases(container as HTMLElement);

  const el = container.querySelector(`[data-match-chat-toast="${msg.id}"]`);
  if (el) {
    requestAnimationFrame(() => el.classList.add('visible'));
    window.setTimeout(() => {
      el.classList.add('leaving');
      window.setTimeout(() => el.remove(), 280);
    }, 4200);
  }
}

function handleIncomingMatchMessage(msg: MatchChatMessage): void {
  if (msg.senderId === getPlayerId()) return;
  if (!state.matchChatOpen) state.matchChatUnread += 1;
  if (isMatchChatScreen()) {
    pushMatchChatToast(msg);
    patchMatchChatOverlay();
  }
}

function startMatchChatListener(roomId: string): void {
  stopMatchChatListener();
  state.matchChatUnread = 0;
  state.matchChatOpen = false;
  state.matchChatDraft = '';

  void pullCoopMatchChat(roomId)
    .then(() => {
      if (state.coopRoomId === roomId && isMatchChatScreen()) patchMatchChatOverlay();
    })
    .catch((err) => console.warn('[ChronoPin] Match chat pull failed:', err));

  const unsub = subscribeCoopMatchChat(roomId, (msg) => {
    handleIncomingMatchMessage(msg);
    if (state.matchChatOpen && state.coopRoomId === roomId) patchMatchChatOverlay();
  });
  if (unsub) matchChatUnsub = unsub;
}

function patchMatchChatOverlay(): void {
  if (!isMatchChatScreen()) return;
  const html = renderCoopMatchChatChrome();
  const existing = app.querySelector('[data-match-chat-root]');
  if (existing) existing.outerHTML = html;
  else app.insertAdjacentHTML('beforeend', html);
  const log = app.querySelector('[data-match-chat-log]');
  if (log) log.scrollTop = log.scrollHeight;
  void hydrateAvatarCanvases(app);
}

function sendCurrentMatchChat(text: string): void {
  if (!state.coopRoomId) return;
  const profile = getProfile();
  if (!profile) return;
  const msg = sendMatchChatMessage(state.coopRoomId, getPlayerId(), profile.name, text);
  if (!msg) return;
  state.matchChatDraft = '';
  patchMatchChatOverlay();
}

function bindNamePromptEvents(): void {
  if (namePromptBound) return;
  namePromptBound = true;

  app.addEventListener('submit', (e) => {
    const form = (e.target as Element).closest('[data-action="login-form"]');
    if (!form) return;
    e.preventDefault();
    const input = app.querySelector('#login-name') as HTMLInputElement | null;
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const errEl = app.querySelector('[data-login-error]');
    if (!input || !submitBtn) return;

    void (async () => {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Loading…';
      if (errEl) errEl.textContent = '';

      try {
        const result = await loginWithName(input.value);
        if (!result.ok) {
          if (errEl) errEl.textContent = result.error;
          return;
        }
        await completeNameSetup(result);
      } catch (err) {
        if (errEl) errEl.textContent = 'Something went wrong — try again.';
        console.warn('[ChronoPin] Login failed:', err);
      } finally {
        if (!hasProfile()) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Continue';
        }
      }
    })();
  });
}

function bindProfileFormEvents(): void {
  app.querySelector('[data-action="home"]')?.addEventListener('click', () => {
    state.screen = 'home';
    render();
  });

  bindAvatarEditorEvents();

  app.querySelector('[data-action="save-profile"]')?.addEventListener('click', () => {
    const nameInput = app.querySelector('#player-name') as HTMLInputElement;
    const name = nameInput?.value ?? '';
    const avatarConfig = normalizeAvatarConfig(state.avatarConfig);
    void (async () => {
      const uid = await waitForFirebaseUid();
      const profile = updateProfile(name, avatarConfig, uid ?? undefined);
      if (uid) {
        try {
          await pushProfileToFirestore(profile, uid);
        } catch (err) {
          console.warn('[ChronoPin] Profile cloud sync failed:', err);
        }
      }
      state.avatarConfig = profile.avatarConfig;
      state.screen = 'home';
      render();
    })();
  });

  app.querySelector('[data-action="factory-reset"]')?.addEventListener('click', () => {
    void (async () => {
      const ok = await confirmDialog(
        'This clears all local progress, friends, scores, and settings. You will return to the login screen.',
        {
          title: 'Factory Reset',
          confirmLabel: 'Reset everything',
          cancelLabel: 'Cancel',
          danger: true,
        },
      );
      if (!ok) return;
      stopCoopFirestoreListener();
      stopCloudCoopInviteListener();
      stopMatchChatListener();
      clearSocialOnlineTimer();
      clearDailyCountdownTimer();
      await factoryResetApp();
      resetStateForLogin();
      render();
    })();
  });
}

function resetStateForLogin(): void {
  scoreSavedForSession = false;
  gameStatsRecorded = false;
  state = {
    screen: 'home',
    playType: 'solo',
    mode: null,
    round: null,
    guess: null,
    session: null,
    libraryIndex: 0,
    libraryViewId: null,
    scoreboardFilter: 'all',
    avatarConfig: getDefaultAvatarConfig(),
    avatarEditorOpenCategory: null,
    inventoryOpen: false,
    socialOpen: false,
    socialTab: 'friends',
    socialView: 'list',
    socialSelectedFriendId: null,
    socialMessageDraft: '',
    socialAddNameDraft: '',
    socialToast: null,
    creditsOpen: false,
    classicSetupOpen: false,
    classicRegion: 'world',
    isDailyRun: false,
    dailyWheelOpen: false,
    dailyWheelResult: null,
    isCoopRun: false,
    coopRoomId: null,
    coopMyRole: null,
    coopSetupOpen: false,
    coopSetupFriendId: null,
    coopSyncMode: 'live',
    coopGameMode: 'classic',
    socialCloudSearch: [],
    matchChatOpen: false,
    matchChatDraft: '',
    matchChatUnread: 0,
    adminOpen: false,
    adminQuery: '',
    adminResults: [],
    adminSelectedUid: null,
    adminStatus: null,
  };
}

let inventoryEventsBound = false;
let matchChatEventsBound = false;

function bindMatchChatEventsOnce(): void {
  if (matchChatEventsBound) return;
  matchChatEventsBound = true;

  app.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    if (target.closest('[data-action="toggle-match-chat"]')) {
      e.preventDefault();
      state.matchChatOpen = !state.matchChatOpen;
      if (state.matchChatOpen) state.matchChatUnread = 0;
      patchMatchChatOverlay();
      return;
    }

    if (target.closest('[data-action="close-match-chat"]')) {
      e.preventDefault();
      state.matchChatOpen = false;
      patchMatchChatOverlay();
      return;
    }

    const quickBtn = target.closest<HTMLElement>('[data-action="match-chat-quick"]');
    if (quickBtn && state.isCoopRun) {
      e.preventDefault();
      sendCurrentMatchChat(quickBtn.dataset.text ?? '');
    }
  });

  app.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-action="send-match-chat"]')) return;
    e.preventDefault();
    const input = form.querySelector<HTMLInputElement>('input[name="message"]');
    sendCurrentMatchChat(input?.value ?? '');
  });

  app.addEventListener('input', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.matches('.match-chat-input[name="message"]')) {
      state.matchChatDraft = target.value;
    }
  });
}

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
  if (!item || !canUseInventoryItem(itemId, item.usable, state.session.usedItemsThisRound)) return;
  if (!item.usable) return;

  const uses = countItemUsesThisRound(state.session.usedItemsThisRound, itemId);
  if (uses >= 1 && getStashItemCharges(itemId) > 0) {
    consumeStashItemCharge(itemId);
  }

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
  app.querySelector('[data-action="scoreboard-back"]')?.addEventListener('click', leaveScoreboard);

  app.querySelectorAll('.scoreboard-filters [data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.scoreboardFilter = (btn as HTMLElement).dataset.filter as GameMode | 'all';
      render();
    });
  });

  app.querySelector('[data-action="clear-scores"]')?.addEventListener('click', () => {
    void (async () => {
      const ok = await confirmDialog('Clear all local scores? This cannot be undone.', {
        title: 'Clear scoreboard',
        confirmLabel: 'Clear all',
        cancelLabel: 'Cancel',
        danger: true,
      });
      if (ok) {
        clearScoreboard();
        render();
      }
    })();
  });
}

function bindHomeEvents(): void {
  bindNamePromptEvents();

  if (!hasProfile()) {
    requestAnimationFrame(() => {
      app.querySelector<HTMLInputElement>('#login-name')?.focus();
    });
  }

  app.querySelectorAll('.segmented-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const play = (btn as HTMLElement).dataset.play as 'solo' | 'multiplayer';
      state.playType = play;
      if (play === 'multiplayer') {
        const friends = getFriends();
        if (friends.length > 0 && !state.coopSetupFriendId) {
          state.coopSetupFriendId = friends[0]!.id;
        }
      }
      app.querySelectorAll('.segmented-btn').forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      app.querySelector('.solo-panel')?.classList.toggle('hidden', play !== 'solo');
      app.querySelector('.multi-panel')?.classList.toggle('hidden', play !== 'multiplayer');
      if (play === 'multiplayer') {
        patchMultiplayerPanel();
        void hydrateAvatarCanvases(app);
      }
    });
  });

  app.querySelectorAll('[data-action="start-mode"]').forEach((card) => {
    card.addEventListener('click', () => {
      if (!hasProfile()) {
        promptForName();
        return;
      }
      startGame((card as HTMLElement).dataset.mode as GameMode);
    });
  });

  app.querySelector('[data-action="library"]')?.addEventListener('click', () => {
    navigateFromHome('library');
  });

  app.querySelector('[data-action="scoreboard"]')?.addEventListener('click', () => {
    navigateFromHome('scoreboard');
  });

  app.querySelector('[data-action="player-info"]')?.addEventListener('click', () => {
    if (!hasProfile()) {
      promptForName();
      return;
    }
    const profile = getProfile();
    if (profile) state.avatarConfig = normalizeAvatarConfig(profile.avatarConfig);
    navigateFromHome('player-info');
  });
}

function bindCoopWaitEvents(): void {
  app.querySelector('[data-action="quit"]')?.addEventListener('click', goHome);
  app.querySelector('[data-action="coop-refresh"]')?.addEventListener('click', () => {
    if (!state.coopRoomId) return;
    void pullCoopRoomFromFirestore(state.coopRoomId).then((remote) => {
      if (remote) applyRemoteCoopRoom(remote);
      routeCoopScreen();
    });
  });
  app.querySelector('[data-action="coop-simulate-partner"]')?.addEventListener('click', () => {
    const room = state.coopRoomId ? getCoopRoom(state.coopRoomId) : null;
    if (!room || !state.round) return;
    simulatePartnerPin(room.id, state.round.answer.lat, state.round.answer.lng);
    routeCoopScreen();
  });
}

function bindCoopRevealEvents(): void {
  app.querySelector('[data-action="coop-to-vote"]')?.addEventListener('click', () => {
    if (state.coopRoomId) advanceCoopToVote(state.coopRoomId);
    routeCoopScreen();
  });
}

function bindCoopVoteEvents(): void {
  app.querySelector('[data-action="quit"]')?.addEventListener('click', goHome);
  app.querySelectorAll('[data-action="coop-vote"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!state.coopRoomId || !state.coopMyRole) return;
      const vote = (btn as HTMLElement).dataset.vote as CoopVoteChoice;
      submitCoopVote(state.coopRoomId, state.coopMyRole, vote);
      routeCoopScreen();
    });
  });
  app.querySelector('[data-action="coop-simulate-vote"]')?.addEventListener('click', () => {
    if (state.coopRoomId) simulatePartnerVote(state.coopRoomId);
    routeCoopScreen();
  });
}

function bindCoopResultEvents(): void {
  app.querySelector('[data-action="quit"]')?.addEventListener('click', goHome);
  app.querySelector('[data-action="coop-play-again"]')?.addEventListener('click', () => {
    const room = state.coopRoomId ? getCoopRoom(state.coopRoomId) : null;
    if (!room) return goHome();
    finishCoopRoom(room.id);
    state.coopSetupFriendId = room.guestFriendId;
    state.coopSyncMode = room.syncMode;
    state.coopGameMode = room.gameMode;
    state.screen = 'home';
    state.isCoopRun = false;
    state.coopRoomId = null;
    state.coopMyRole = null;
    setCoopSetupOpen(true, room.guestFriendId);
    render();
  });
}

function bindExploreEvents(): void {
  app.querySelector('[data-action="quit"]')?.addEventListener('click', () => {
    if (state.isCoopRun) goHome();
    else quitRun();
  });
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
    if (state.session?.isDaily) {
      goHome();
      return;
    }
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
    refreshScoreboardCloud();
  });
  app.querySelector('[data-action="home"]')?.addEventListener('click', goHome);
}

function bindLibraryEvents(): void {
  app.querySelector('[data-action="home"]')?.addEventListener('click', goHome);

  app.querySelector('[data-action="library-map"]')?.addEventListener('click', () => {
    state.screen = 'library-map';
    render();
  });

  app.querySelectorAll('.library-item:not(.library-item-trash)').forEach((item) => {
    item.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-delete]')) return;
      const id = (item as HTMLElement).dataset.id;
      if (id) markPanoramaSeen(id);
      const index = Number((item as HTMLElement).dataset.index);
      state.libraryIndex = index;
      state.libraryViewId = id ?? null;
      state.screen = 'library-view';
      render();
    });
  });

  app.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.delete!;
      void (async () => {
        const ok = await confirmDialog(
          'Move this panorama to trash? It will be hidden from gameplay until restored.',
          { title: 'Move to trash', confirmLabel: 'Move to trash', danger: true },
        );
        if (ok) {
          trashPanorama(id);
          render();
        }
      })();
    });
  });

  app.querySelectorAll('[data-restore]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      restoreFromTrash((btn as HTMLElement).dataset.restore!);
      render();
    });
  });

  app.querySelector('[data-action="restore-all-trash"]')?.addEventListener('click', () => {
    restoreAllFromTrash();
    render();
  });
}

function bindLibraryMapEvents(): void {
  app.querySelector('[data-action="library"]')?.addEventListener('click', () => {
    state.screen = 'library';
    render();
  });
}

function bindLibraryViewEvents(): void {
  const items = getVisiblePanoramas();
  const item = items[state.libraryIndex];
  if (item) markPanoramaSeen(item.id);

  app.querySelector('[data-action="library-back"]')?.addEventListener('click', () => {
    state.screen = 'library';
    render();
  });

  app.querySelector('[data-action="lib-prev"]')?.addEventListener('click', () => {
    if (state.libraryIndex > 0) {
      state.libraryIndex--;
      const items = getVisiblePanoramas();
      state.libraryViewId = items[state.libraryIndex]?.id ?? null;
      if (state.libraryViewId) markPanoramaSeen(state.libraryViewId);
      render();
    }
  });

  app.querySelector('[data-action="lib-next"]')?.addEventListener('click', () => {
    const items = getVisiblePanoramas();
    const max = items.length - 1;
    if (state.libraryIndex < max) {
      state.libraryIndex++;
      state.libraryViewId = items[state.libraryIndex]?.id ?? null;
      if (state.libraryViewId) markPanoramaSeen(state.libraryViewId);
      render();
    }
  });

  app.querySelector('[data-action="lib-delete"]')?.addEventListener('click', () => {
    const id = (app.querySelector('[data-action="lib-delete"]') as HTMLElement).dataset.id;
    if (!id) return;
    void (async () => {
      const ok = await confirmDialog('Move this panorama to trash?', {
        title: 'Move to trash',
        confirmLabel: 'Move to trash',
        danger: true,
      });
      if (!ok) return;
      trashPanorama(id);
      const remaining = getVisiblePanoramas();
      if (remaining.length === 0) {
        state.screen = 'library';
      } else if (state.libraryIndex >= remaining.length) {
        state.libraryIndex = remaining.length - 1;
      }
      state.screen = remaining.length === 0 ? 'library' : 'library-view';
      render();
    })();
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
  const bonusHearts = takeBonusHeartsForRun();
  const bonusPoints = takeBonusPointsForRun();
  state.session = {
    hearts: MAX_HEARTS + bonusHearts,
    score: bonusPoints,
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

  const classicRegion = state.mode === 'classic' ? state.classicRegion : 'world';
  let round = pickRound(state.mode, state.session.usedRoundIds, classicRegion);
  if (!round) {
    state.session.usedRoundIds = [];
    round = pickRound(state.mode, [], classicRegion);
  }
  if (!round) {
    const scope =
      state.mode === 'classic' ? classicRegionLabel(state.classicRegion) : modeLabel(state.mode);
    void alertDialog(
      `No panoramas available for ${scope}. Check the library or restore hidden scenes.`,
      'No scenes',
    ).then(() => goHome());
    return;
  }

  state.session.roundNumber++;
  state.session.usedRoundIds.push(round.id);
  state.session.usedItemsThisRound = [];
  state.session.activeHint = null;
  state.inventoryOpen = false;
  state.round = round;
  state.guess = null;
  markPanoramaSeen(round.panoramaId);
  state.screen = 'explore';
  render();
}

function submitGuess(): void {
  if (!state.guess || !state.round || !state.session) return;

  if (state.isCoopRun) {
    submitCoopGuess();
    return;
  }

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

  if (state.session.isDaily) {
    markDailyCompleted();
    state.isDailyRun = false;
  }

  state.screen = 'result';
  render();
}

function renderCoopWait(): string {
  const room = getCoopRoom(state.coopRoomId!);
  if (!room || !state.coopMyRole) return '';
  return (
    renderCoopWaitScreen(room, state.coopMyRole, { offlineDemo: !isFirebaseConfigured() }) +
    renderCoopMatchChatChrome()
  );
}

function renderCoopRevealScreen(): string {
  const room = getCoopRoom(state.coopRoomId!);
  if (!room) return '';
  return renderCoopReveal(room) + renderCoopMatchChatChrome();
}

function renderCoopVoteScreen(): string {
  const room = getCoopRoom(state.coopRoomId!);
  if (!room || !state.coopMyRole) return '';
  const myVote = state.coopMyRole === 'host' ? room.hostVote : room.guestVote;
  return (
    renderCoopVote(room, state.coopMyRole, myVote, { offlineDemo: !isFirebaseConfigured() }) +
    renderCoopMatchChatChrome()
  );
}

function renderCoopResultScreen(): string {
  const room = getCoopRoom(state.coopRoomId!);
  const round = state.round;
  if (!room || !round || !room.finalPin || !state.coopMyRole) return '';
  const score = scoreGuess(round, {
    lat: room.finalPin.lat,
    lng: room.finalPin.lng,
    year: room.finalPin.year,
  });
  return (
    renderCoopResult(room, state.coopMyRole, score.distanceKm, score.points, score.maxPoints) +
    renderCoopMatchChatChrome()
  );
}

function clearCoopWaitPoll(): void {
  if (coopWaitPollTimer) {
    clearInterval(coopWaitPollTimer);
    coopWaitPollTimer = null;
  }
}

function syncCoopWaitPoll(): void {
  clearCoopWaitPoll();
  if (!state.isCoopRun || !state.coopRoomId || state.screen !== 'coop-wait') return;

  const poll = () => {
    if (!state.isCoopRun || !state.coopRoomId) return;
    void pullCoopRoomFromFirestore(state.coopRoomId).then((remote) => {
      if (remote) applyRemoteCoopRoom(remote);
      routeCoopScreen();
    });
  };

  poll();
  coopWaitPollTimer = setInterval(poll, 2500);
}

function routeCoopScreen(): void {
  const roomId = state.coopRoomId;
  if (!roomId) {
    goHome();
    return;
  }
  const room = getResolvedCoopRoom(roomId);
  if (!room) {
    goHome();
    return;
  }
  const myRole = state.coopMyRole ?? getMyCoopRole(room, getPlayerId());
  state.coopMyRole = myRole;

  if (bothCoopPinsPlaced(room) && room.phase !== 'vote' && room.phase !== 'result' && room.phase !== 'done') {
    state.screen = 'coop-reveal';
    clearCoopWaitPoll();
    render();
    return;
  }

  switch (room.phase) {
    case 'explore':
    case 'host_pinned':
    case 'guest_pinned':
      state.screen = canISubmitPin(room, myRole) ? 'explore' : 'coop-wait';
      break;
    case 'reveal':
      state.screen = 'coop-reveal';
      break;
    case 'vote':
      state.screen = 'coop-vote';
      break;
    case 'result':
      state.screen = 'coop-result';
      break;
    default:
      goHome();
      return;
  }
  if (state.screen === 'coop-wait') syncCoopWaitPoll();
  else clearCoopWaitPoll();
  render();
}

function stopCoopFirestoreListener(): void {
  activeCoopRoomUnsub?.();
  activeCoopRoomUnsub = null;
}

function startActiveCoopRoomListener(roomId: string): void {
  stopCoopFirestoreListener();
  const unsub = subscribeCoopRoom(roomId, () => {
    if (state.isCoopRun && state.coopRoomId === roomId) routeCoopScreen();
  });
  if (unsub) activeCoopRoomUnsub = unsub;
}

function startCloudCoopSync(onChange?: () => void): void {
  startCloudCoopInviteListener(onChange);
  void waitForFirebaseUid().then(async (uid) => {
    if (!uid) return;
    await pullMyCoopRoomsFromFirestore(uid);
    startMyCoopRoomsListener(uid, () => {
      if (state.isCoopRun && state.coopRoomId) routeCoopScreen();
      else onChange?.();
    });
  });
}

async function confirmDeleteCoopGame(roomId: string): Promise<void> {
  const room = getCoopRoom(roomId);
  if (!room) return;
  const myId = getPlayerId();
  const partner = room.hostPlayerId === myId ? room.guestName : room.hostName;
  const ok = await confirmDialog(
    `Delete Co-op game vs ${partner}? This cannot be undone.`,
    { title: 'Delete game', confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true },
  );
  if (!ok) return;
  abandonCoopGame(roomId);
  if (state.isCoopRun && state.coopRoomId === roomId) {
    state.isCoopRun = false;
    state.coopRoomId = null;
    state.coopMyRole = null;
    goHome();
  } else if (state.socialOpen) {
    patchHomeOverlays();
  } else if (state.screen === 'home') {
    render();
  }
  showSocialToast('Game deleted.');
}

async function enterCoopRoom(roomId: string): Promise<void> {
  const remote = await pullCoopRoomFromFirestore(roomId);
  if (remote) applyRemoteCoopRoom(remote);

  let room = getCoopRoom(roomId);
  if (!room) {
    showSocialToast('Game not found.');
    return;
  }

  if (room.phase === 'done') {
    showSocialToast('This game is already finished.');
    return;
  }

  const myUid = getPlayerId();
  const myRole = getMyCoopRole(room, myUid);

  if (myRole === 'host' && !room.guestAccepted) {
    showSocialToast(`Waiting for ${room.guestName} to accept…`);
    if (state.socialOpen) patchHomeOverlays();
    return;
  }

  const inProgress = ['explore', 'host_pinned', 'guest_pinned', 'reveal', 'vote', 'result'].includes(
    room.phase,
  );
  const started = startCoopRoom(roomId);
  room = getCoopRoom(roomId)!;

  if (!started && !inProgress) {
    showSocialToast('Cannot join this game yet.');
    return;
  }

  if (!started && inProgress) setActiveCoopRoomId(roomId);

  const round = getCoopRound(room);
  if (!round) {
    showSocialToast('Scene not found for this game.');
    return;
  }

  closeHomeOverlays();
  destroyPanorama();
  destroyMap();
  state.isCoopRun = true;
  state.coopRoomId = roomId;
  state.coopMyRole = myRole;
  state.playType = 'multiplayer';
  state.mode = room.gameMode;
  state.round = round;
  state.guess = null;
  state.session = {
    hearts: MAX_HEARTS,
    score: 0,
    roundNumber: 1,
    usedRoundIds: [round.id],
    lastLostHeart: false,
    lastRoundPoints: 0,
    usedItemsThisRound: [],
    activeHint: null,
  };
  markPanoramaSeen(round.panoramaId);
  startActiveCoopRoomListener(roomId);
  startMatchChatListener(roomId);
  routeCoopScreen();
}

async function acceptAndJoinCoopInvite(inviteId: string): Promise<void> {
  const remoteInvite = await pullCoopInviteFromFirestore(inviteId);
  if (remoteInvite) applyRemoteCoopInvite(remoteInvite);

  const invite = remoteInvite ?? loadCoopInvitesLocal().find((i) => i.id === inviteId);
  if (!invite) {
    showSocialToast('Invite not found.');
    return;
  }

  const remoteRoom = await pullCoopRoomFromFirestore(invite.roomId);
  if (remoteRoom) applyRemoteCoopRoom(remoteRoom);

  acceptCoopInvite(inviteId);
  setSocialOpen(false);
  await enterCoopRoom(invite.roomId);
  void syncSocialFromCloud();
  showSocialToast('Joined Co-op — good luck!');
}

function loadCoopInvitesLocal(): import('./data/coop').CoopInvite[] {
  try {
    const raw = localStorage.getItem('chronopin-coop-invites');
    return raw ? (JSON.parse(raw) as import('./data/coop').CoopInvite[]) : [];
  } catch {
    return [];
  }
}

function submitCoopGuess(): void {
  if (!state.guess || !state.round || !state.coopRoomId || !state.coopMyRole) return;
  if (!Number.isFinite(state.guess.lat) || !Number.isFinite(state.guess.lng)) return;
  const room = getCoopRoom(state.coopRoomId);
  if (!room) return;

  const pin: CoopPin = {
    lat: state.guess.lat,
    lng: state.guess.lng,
    year: state.guess.year,
    label: state.coopMyRole === 'host' ? room.hostName : room.guestName,
    at: Date.now(),
  };
  submitCoopPin(state.coopRoomId, state.coopMyRole, pin);
  routeCoopScreen();
}

function sendCoopInviteFromSetup(): void {
  const profile = getProfile();
  if (!profile || !state.coopSetupFriendId) return;
  const friend = getFriendById(state.coopSetupFriendId);
  if (!friend) return;

  const invite = createCoopInvite(
    getPlayerId(),
    profile.name,
    friend.id,
    friend.name,
    state.coopSyncMode,
    state.coopGameMode,
  );
  if (!invite) {
    showSocialToast('No scenes available for that mode.');
    return;
  }

  setCoopSetupOpen(false);
  state.socialOpen = true;
  state.socialTab = 'games';
  state.socialView = 'list';
  state.socialSelectedFriendId = friend.id;
  showSocialToast(`Invite sent to ${friend.name}!`);
  patchHomeOverlays();
}

function goHome(): void {
  stopCoopFirestoreListener();
  clearCoopWaitPoll();
  stopMatchChatListener();
  if (state.coopRoomId && state.screen === 'coop-result') {
    finishCoopRoom(state.coopRoomId);
  } else if (state.isCoopRun && state.coopRoomId) {
    leaveCoopRunLocally();
  }
  clearSocialOnlineTimer();
  state = {
    screen: 'home',
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
    socialAddNameDraft: '',
    socialToast: null,
    creditsOpen: false,
    classicSetupOpen: false,
    classicRegion: state.classicRegion,
    isDailyRun: false,
    dailyWheelOpen: false,
    dailyWheelResult: null,
    isCoopRun: false,
    coopRoomId: null,
    coopMyRole: null,
    coopSetupOpen: false,
    coopSetupFriendId: null,
    coopSyncMode: state.coopSyncMode,
    coopGameMode: state.coopGameMode,
    socialCloudSearch: [],
    matchChatOpen: false,
    matchChatDraft: '',
    matchChatUnread: 0,
    adminOpen: false,
    adminQuery: '',
    adminResults: [],
    adminSelectedUid: null,
    adminStatus: null,
  };
  scoreSavedForSession = false;
  gameStatsRecorded = false;
  render();
}

function getActivePanoSource(): { panorama: string; panoConfig?: Round['panoConfig'] } {
  if (state.screen === 'library-view') {
    const items = getVisiblePanoramas();
    const idx = resolveLibraryIndex();
    const item = items[idx];
    if (!item) return { panorama: '' };
    return { panorama: panoramaUrl(item), panoConfig: item.panoConfig };
  }
  const round = state.round!;
  return { panorama: round.panorama, panoConfig: round.panoConfig };
}

function initPanorama(): void {
  const src = getActivePanoSource();
  if (!src.panorama) return;
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

function resolvePlayerAvatar(playerId: string): AvatarConfig {
  const profile = getProfile();
  if (profile && profile.playerId === playerId) return profile.avatarConfig;
  const friend = getFriendById(playerId);
  if (friend?.avatarConfig) return friend.avatarConfig;
  return getDefaultAvatarConfig();
}

function placeGuessMarker(lng: number, lat: number): void {
  if (!map) return;
  guessMarker?.remove();
  const el = createMapPinMarker({
    avatarConfig: getProfile()?.avatarConfig,
    pinVariant: 'guess',
    behavior: 'orbit-walk',
  });
  guessMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat([lng, lat])
    .addTo(map);
  mountMapPinMarker(el);
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

    const guessEl = createMapPinMarker({
      avatarConfig: getProfile()?.avatarConfig,
      pinVariant: 'guess',
      behavior: 'sit',
      label: 'You',
    });
    guessMarker = new maplibregl.Marker({ element: guessEl, anchor: 'bottom' })
      .setLngLat([guess.lng, guess.lat])
      .addTo(map);
    mountMapPinMarker(guessEl);

    const answerEl = createMapPinMarker({
      pinVariant: 'answer',
      label: '✓',
    });
    answerMarker = new maplibregl.Marker({ element: answerEl, anchor: 'bottom' })
      .setLngLat([round.answer.lng, round.answer.lat])
      .addTo(map);
  });
}

function initCoopRevealMap(): void {
  const room = state.coopRoomId ? getCoopRoom(state.coopRoomId) : null;
  if (!room?.hostPin || !room.guestPin) return;
  initCoopDualPinMap(
    'coop-reveal-map',
    room.hostPin,
    room.guestPin,
    room.hostName,
    room.guestName,
    room.hostPlayerId,
    room.guestFriendId,
  );
}

function initCoopVoteMap(): void {
  const room = state.coopRoomId ? getCoopRoom(state.coopRoomId) : null;
  if (!room?.hostPin || !room.guestPin) return;
  initCoopDualPinMap(
    'coop-vote-map',
    room.hostPin,
    room.guestPin,
    room.hostName,
    room.guestName,
    room.hostPlayerId,
    room.guestFriendId,
  );
}

function initCoopResultMap(): void {
  const room = state.coopRoomId ? getCoopRoom(state.coopRoomId) : null;
  const round = state.round;
  if (!room?.finalPin || !round) return;
  destroyMap();
  const bounds = new maplibregl.LngLatBounds();
  bounds.extend([room.finalPin.lng, room.finalPin.lat]);
  bounds.extend([round.answer.lng, round.answer.lat]);
  map = new maplibregl.Map({
    container: 'coop-result-map',
    style: MAP_STYLE,
    bounds,
    fitBoundsOptions: { padding: 60, maxZoom: 8 },
    attributionControl: { compact: true },
  });
  map.on('load', () => {
    if (!map || !room.finalPin) return;
    addCoopMapPin(map, room.finalPin.lng, room.finalPin.lat, {
      pinVariant: 'team',
      avatarConfig: getProfile()?.avatarConfig,
      behavior: 'sit',
      label: 'Team',
    });
    addCoopMapPin(map, round.answer.lng, round.answer.lat, {
      pinVariant: 'answer',
      label: '✓',
    });
  });
}

function initCoopDualPinMap(
  containerId: string,
  hostPin: CoopPin,
  guestPin: CoopPin,
  hostName: string,
  guestName: string,
  hostPlayerId: string,
  guestPlayerId: string,
): void {
  destroyMap();
  const bounds = new maplibregl.LngLatBounds();
  bounds.extend([hostPin.lng, hostPin.lat]);
  bounds.extend([guestPin.lng, guestPin.lat]);
  map = new maplibregl.Map({
    container: containerId,
    style: MAP_STYLE,
    bounds,
    fitBoundsOptions: { padding: 60, maxZoom: 6 },
    attributionControl: { compact: true },
  });
  map.on('load', () => {
    if (!map) return;
    addCoopMapPin(map, hostPin.lng, hostPin.lat, {
      pinVariant: 'host',
      avatarConfig: resolvePlayerAvatar(hostPlayerId),
      behavior: 'orbit-walk',
      label: hostName.slice(0, 8),
    });
    addCoopMapPin(map, guestPin.lng, guestPin.lat, {
      pinVariant: 'guest',
      avatarConfig: resolvePlayerAvatar(guestPlayerId),
      behavior: 'idle-near',
      label: guestName.slice(0, 8),
    });
  });
}

function addCoopMapPin(
  targetMap: maplibregl.Map,
  lng: number,
  lat: number,
  options: Parameters<typeof createMapPinMarker>[0],
): void {
  const el = createMapPinMarker(options);
  new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(targetMap);
  mountMapPinMarker(el);
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
  libraryMarkers.forEach((m) => m.remove());
  libraryMarkers = [];
  map?.remove();
  map = null;
}

function syncLibraryMapPins(): void {
  if (!map || state.screen !== 'library-map') return;
  libraryMarkers.forEach((m) => m.remove());
  libraryMarkers = [];
  const items = getLibraryMapPanoramas();
  for (const p of items) {
    const el = document.createElement('div');
    el.className = 'library-map-pin';
    el.title = p.title;
    libraryMarkers.push(
      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([p.lng, p.lat])
        .addTo(map),
    );
  }
  if (items.length > 0) {
    const bounds = new maplibregl.LngLatBounds();
    for (const p of items) bounds.extend([p.lng, p.lat]);
    map.fitBounds(bounds, { padding: 56, maxZoom: 8, duration: 0 });
  }
}

function initLibraryMap(): void {
  destroyMap();
  const token = ++libraryMapInitToken;

  map = new maplibregl.Map({
    container: 'library-map',
    style: MAP_STYLE,
    center: [10, 25],
    zoom: 1.2,
    attributionControl: { compact: true },
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  map.on('load', () => {
    if (token !== libraryMapInitToken || state.screen !== 'library-map' || !map) return;
    syncLibraryMapPins();
    map.resize();
  });
}

bindInventoryEventsOnce();
bindMatchChatEventsOnce();
bindSocialEventsOnce();
bindDailyEventsOnce();

async function bootstrap(): Promise<void> {
  render();

  if (!isFirebaseConfigured()) return;

  void (async () => {
    try {
      await ensureFirebaseAuth();
      if (!hasProfile()) return;

      await syncLocalProfileWithFirebase(getProfile(), (merged) => {
        persistProfile(merged);
        state.avatarConfig = normalizeAvatarConfig(merged.avatarConfig);
      }).catch(() => undefined);

      await syncSocialFromCloud().catch(() => undefined);
      await syncScoreboardFromCloud().catch(() => undefined);

      startCloudCoopSync(() => {
        if (state.screen === 'home') render();
        else if (state.socialOpen) patchHomeOverlays();
      });
    } catch (err) {
      console.warn('[ChronoPin] Firebase init skipped:', err);
    }
  })();
}

void bootstrap();
