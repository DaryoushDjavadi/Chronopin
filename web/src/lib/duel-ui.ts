import type { DuelInvite, DuelRoom, DuelSide, DuelSyncMode } from '../data/duel';
import {
  MAX_DUEL_HEARTS,
  describeDuelSession,
  duelPhaseLabel,
  getMyActiveDuelRooms,
  getPendingDuelInvitesFromMe,
  syncModeLabel,
} from '../data/duel';
import type { FriendProfile } from '../data/social';
import { renderAvatar } from '../data/avatars';
import type { GameMode } from '../types';
import { modeLabel } from '../data/rounds';
import { renderHearts } from '../lib/geo';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderDuelCard(friends: FriendProfile[], selectedFriendId: string | null): string {
  const ready =
    friends.length > 0 &&
    selectedFriendId !== null &&
    friends.some((f) => f.id === selectedFriendId);
  const badgeLabel = friends.length === 0 ? 'Add friend' : ready ? 'Play' : 'Pick friend';
  const badgeClass =
    friends.length === 0 ? 'soon-badge' : ready ? 'mp-badge' : 'mp-badge mp-badge-muted';

  return `
    <button class="mp-card mp-card--duel ${ready ? 'mp-highlight' : ''}" type="button" data-action="duel-pvp">
      <div class="mp-card-visual" aria-hidden="true">⚔️</div>
      <div class="mp-card-body">
        <div class="mp-card-top">
          <div class="mp-card-titles">
            <strong>1v1 Duel</strong>
            <span class="mp-card-tagline">Head-to-head</span>
          </div>
          <span class="${badgeClass}">${badgeLabel}</span>
        </div>
        <p class="mp-card-desc">Blind pins, simultaneous reveal — closest guess wins the round.</p>
        <div class="mp-card-chips">
          <span class="mode-chip">♥ 3 hearts each</span>
          <span class="mode-chip">⚡ Live · Async</span>
        </div>
      </div>
    </button>`;
}

export function renderDuelSetupOverlay(options: {
  open: boolean;
  friends: FriendProfile[];
  selectedFriendId: string | null;
  syncMode: DuelSyncMode;
  gameMode: GameMode;
}): string {
  const { open, friends, selectedFriendId, syncMode, gameMode } = options;
  const modes: GameMode[] = ['classic', 'past', 'future'];

  return `
    <div
      class="coop-overlay duel-overlay ${open ? 'open' : ''}"
      aria-hidden="${!open}"
      ${open ? '' : 'inert'}
      data-duel-overlay
    >
      <div class="coop-backdrop" data-action="close-duel-setup" aria-hidden="true"></div>
      <div class="coop-panel" role="dialog" aria-label="1v1 Duel setup" aria-modal="true">
        <div class="coop-frame">
          <div class="coop-title-bar">
            <span class="coop-title">1v1 Duel</span>
            <button type="button" class="inv-close icon-btn" data-action="close-duel-setup" aria-label="Close">×</button>
          </div>
          <div class="coop-body">
            <p class="coop-intro">Both pin in secret. After reveal, the closer guess wins the round — loser loses a heart. First to zero hearts loses the match.</p>

            <label class="field-label">Opponent</label>
            <div class="coop-friend-pick">
              ${
                friends.length === 0
                  ? `<p class="coop-empty">Add a friend first from the Friends menu.</p>`
                  : friends
                      .map(
                        (f) => `
                <button type="button" class="coop-friend-chip ${selectedFriendId === f.id ? 'active' : ''}" data-action="pick-duel-friend" data-friend="${f.id}">
                  ${renderAvatar(f.avatarConfig, 'avatar avatar-xs')}
                  <span>${escapeHtml(f.name)}</span>
                </button>`,
                      )
                      .join('')
              }
            </div>

            <label class="field-label">Sync mode</label>
            <div class="coop-segmented">
              <button type="button" class="segmented-btn ${syncMode === 'live' ? 'active' : ''}" data-action="pick-duel-sync" data-sync="live">Live</button>
              <button type="button" class="segmented-btn ${syncMode === 'async' ? 'active' : ''}" data-action="pick-duel-sync" data-sync="async">Async</button>
            </div>
            <p class="coop-hint">${syncMode === 'live' ? 'Both pin at the same time — pins stay hidden until both are in.' : 'Host pins first, then guest — play over hours or days.'}</p>

            <label class="field-label">Game mode</label>
            <div class="coop-mode-pick">
              ${modes
                .map(
                  (m) => `
                <button type="button" class="coop-mode-chip ${gameMode === m ? 'active' : ''}" data-action="pick-duel-mode" data-mode="${m}">${modeLabel(m)}</button>`,
                )
                .join('')}
            </div>

            <button type="button" class="btn btn-primary btn-lg coop-send-btn" data-action="send-duel-invite" ${!selectedFriendId || friends.length === 0 ? 'disabled' : ''}>
              Send duel invite
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

export function renderDuelHud(room: DuelRoom, myRole: DuelSide): string {
  const hostHearts = renderHearts(room.hostHearts, MAX_DUEL_HEARTS);
  const guestHearts = renderHearts(room.guestHearts, MAX_DUEL_HEARTS);
  return `
    <div class="coop-hud duel-hud" role="status">
      <span class="coop-hud-mode">1v1 · ${syncModeLabel(room.syncMode)} · R${room.roundNumber}</span>
      <span class="coop-hud-phase">${escapeHtml(duelPhaseLabel(room, myRole))}</span>
      <span class="duel-hud-hearts">
        <span class="duel-hearts-row ${myRole === 'host' ? 'you' : ''}">${escapeHtml(room.hostName.slice(0, 10))} ${hostHearts}</span>
        <span class="duel-hearts-vs">vs</span>
        <span class="duel-hearts-row ${myRole === 'guest' ? 'you' : ''}">${escapeHtml(room.guestName.slice(0, 10))} ${guestHearts}</span>
      </span>
    </div>`;
}

export function renderDuelWaitScreen(
  room: DuelRoom,
  myRole: DuelSide,
  options: { offlineDemo?: boolean } = {},
): string {
  const { offlineDemo = false } = options;
  const partner = myRole === 'host' ? room.guestName : room.hostName;
  const canSimulate =
    offlineDemo &&
    ((room.phase === 'host_pinned' && myRole === 'host') ||
      (room.phase === 'explore' && room.syncMode === 'live' && (room.hostPin || room.guestPin)) ||
      (room.phase === 'explore' && room.syncMode === 'async' && myRole === 'host' && room.hostPin));

  const waitHint = offlineDemo
    ? `Offline testing — simulate ${escapeHtml(partner)}'s pin on this device.`
    : `Waiting for ${escapeHtml(partner)} — checking every few seconds…`;

  return `
    <div class="screen screen-duel-wait">
      <div class="coop-wait-content">
        <span class="coop-wait-icon">⏳</span>
        <h2>${escapeHtml(duelPhaseLabel(room, myRole))}</h2>
        <p class="coop-wait-sub">${modeLabel(room.gameMode)} · Round ${room.roundNumber}</p>
        <div class="duel-wait-hearts">
          <span>${escapeHtml(room.hostName)} ${renderHearts(room.hostHearts, MAX_DUEL_HEARTS)}</span>
          <span>${escapeHtml(room.guestName)} ${renderHearts(room.guestHearts, MAX_DUEL_HEARTS)}</span>
        </div>
        <p class="coop-wait-hint">${waitHint}</p>
        <button type="button" class="btn btn-secondary" data-action="duel-refresh">Check now</button>
        ${
          canSimulate
            ? `<button type="button" class="btn btn-secondary" data-action="duel-simulate-partner">Simulate opponent pin</button>`
            : ''
        }
        <button type="button" class="btn btn-secondary" data-action="quit">Leave duel</button>
        <button type="button" class="btn btn-danger btn-sm coop-delete-btn" data-action="delete-duel-game" data-room="${room.id}">Delete duel</button>
      </div>
    </div>`;
}

export function renderDuelReveal(room: DuelRoom): string {
  return `
    <div class="screen screen-duel-reveal">
      <div class="coop-reveal-header">
        <h2>Reveal!</h2>
        <p>Both hidden pins are shown — see who was closer after the result.</p>
      </div>
      <div id="duel-reveal-map" class="map-container map-result"></div>
      <div class="coop-pin-cards">
        <div class="coop-pin-card host">
          <strong>${escapeHtml(room.hostName)}</strong>
          <span>${room.hostPin ? `${room.hostPin.lat.toFixed(2)}°, ${room.hostPin.lng.toFixed(2)}°` : '—'}</span>
        </div>
        <div class="coop-pin-card guest">
          <strong>${escapeHtml(room.guestName)}</strong>
          <span>${room.guestPin ? `${room.guestPin.lat.toFixed(2)}°, ${room.guestPin.lng.toFixed(2)}°` : '—'}</span>
        </div>
      </div>
      <button type="button" class="btn btn-primary btn-lg" data-action="duel-show-result">Show round result →</button>
      <button type="button" class="btn btn-secondary" data-action="quit">Leave</button>
    </div>`;
}

export function renderDuelRoundResult(
  room: DuelRoom,
  myRole: DuelSide,
  roundTitle: string,
  xpBannerHtml = '',
): string {
  const iWonRound = room.lastRoundWinner === myRole;
  const iLostRound = room.lastRoundWinner != null && room.lastRoundWinner !== 'tie' && room.lastRoundWinner !== myRole;
  const matchOver = Boolean(room.matchWinner);
  const iWonMatch = room.matchWinner === myRole;
  const iLostMatch = room.matchWinner != null && room.matchWinner !== myRole;

  let headline = 'Round tied — no heart lost';
  if (room.lastRoundWinner === 'host') headline = `${room.hostName} wins the round`;
  else if (room.lastRoundWinner === 'guest') headline = `${room.guestName} wins the round`;

  if (matchOver) {
    headline = iWonMatch ? 'You win the duel!' : iLostMatch ? 'You lost the duel' : 'Duel over';
  }

  const roundDetail =
    room.lastRoundHostPoints != null && room.lastRoundGuestPoints != null
      ? `${escapeHtml(room.hostName)}: ${room.lastRoundHostPoints.toLocaleString('en-GB')} pts (${room.lastRoundHostDistKm?.toFixed(0) ?? '—'} km) · ${escapeHtml(room.guestName)}: ${room.lastRoundGuestPoints.toLocaleString('en-GB')} pts (${room.lastRoundGuestDistKm?.toFixed(0) ?? '—'} km)`
      : '';

  return `
    <div class="screen screen-duel-result">
      <div class="duel-result-header ${iWonRound ? 'won' : iLostRound ? 'lost' : 'tie'}">
        <h2>${escapeHtml(headline)}</h2>
        <p class="duel-result-detail">${roundDetail}</p>
        <div class="duel-result-hearts">
          <span>${escapeHtml(room.hostName)} ${renderHearts(room.hostHearts, MAX_DUEL_HEARTS)}</span>
          <span>${escapeHtml(room.guestName)} ${renderHearts(room.guestHearts, MAX_DUEL_HEARTS)}</span>
        </div>
        ${xpBannerHtml}
      </div>
      <div id="duel-result-map" class="map-container map-result"></div>
      <div class="coop-result-card">
        <h3>${escapeHtml(roundTitle)}</h3>
        <p class="coop-result-mode">${syncModeLabel(room.syncMode)} · ${modeLabel(room.gameMode)} · Round ${room.roundNumber}</p>
      </div>
      <div class="result-actions">
        ${
          matchOver
            ? `<button type="button" class="btn btn-secondary" data-action="quit">Home</button>
               <button type="button" class="btn btn-primary" data-action="duel-play-again">Rematch</button>`
            : `<button type="button" class="btn btn-primary" data-action="duel-next-round">Next round →</button>
               <button type="button" class="btn btn-secondary" data-action="quit">Leave</button>`
        }
      </div>
    </div>`;
}

export function renderDuelGamesTab(
  myPlayerId: string,
  cloudIncomingInvites: DuelInvite[],
): string {
  const activeRooms = getMyActiveDuelRooms(myPlayerId);
  const outgoingPending = getPendingDuelInvitesFromMe(myPlayerId);

  const roomRows = activeRooms
    .map((room) => {
      const info = describeDuelSession(room, myPlayerId);
      const attention = info.needsAttention ? ' needs-attention' : '';
      return `
        <div class="coop-game-card duel-game-card${attention}">
          <div class="coop-game-meta">
            <strong>1v1 vs ${escapeHtml(info.partnerName)}</strong>
            <span>${syncModeLabel(room.syncMode)} · ${modeLabel(room.gameMode)}</span>
            <span class="coop-game-scene">${room.phase === 'round_result' || room.phase === 'done' ? escapeHtml(room.roundTitle) : 'Mystery scene'}</span>
            <span class="coop-game-phase">${escapeHtml(info.phaseLabel)}</span>
            <span class="duel-game-hearts">${renderHearts(room.hostHearts, MAX_DUEL_HEARTS)} vs ${renderHearts(room.guestHearts, MAX_DUEL_HEARTS)}</span>
          </div>
          <div class="coop-game-actions">
            <button
              type="button"
              class="btn ${info.needsAttention ? 'btn-primary' : 'btn-secondary'} btn-sm"
              data-action="enter-duel-room"
              data-room="${room.id}"
            >${escapeHtml(info.enterLabel)}</button>
            <button type="button" class="btn btn-danger btn-sm" data-action="delete-duel-game" data-room="${room.id}" title="Delete duel">✕</button>
          </div>
        </div>`;
    })
    .join('');

  const incomingRows = cloudIncomingInvites
    .map(
      (inv) => `
        <div class="coop-game-card duel-game-card needs-attention">
          <div class="coop-game-meta">
            <strong>Duel from ${escapeHtml(inv.fromName)}</strong>
            <span>${syncModeLabel(inv.syncMode)} · ${modeLabel(inv.gameMode)}</span>
            <span class="coop-game-phase">Pending — accept to duel</span>
          </div>
          <div class="coop-game-actions">
            <button type="button" class="btn btn-primary btn-sm" data-action="accept-duel-invite" data-invite="${inv.id}">Accept</button>
            <button type="button" class="btn btn-secondary btn-sm" data-action="decline-duel-invite" data-invite="${inv.id}">Decline</button>
          </div>
        </div>`,
    )
    .join('');

  const outgoingRows = outgoingPending
    .map(
      (inv) => `
        <div class="coop-game-card duel-game-card">
          <div class="coop-game-meta">
            <strong>Duel invite sent</strong>
            <span>${syncModeLabel(inv.syncMode)} · ${modeLabel(inv.gameMode)}</span>
            <span class="coop-game-phase">Waiting for accept</span>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-action="cancel-duel-invite" data-invite="${inv.id}">Cancel</button>
        </div>`,
    )
    .join('');

  if (!roomRows && !incomingRows && !outgoingRows) return '';

  return `
    <section class="duel-games-section">
      <h4 class="coop-games-section-title">1v1 Duels</h4>
      <div class="coop-games-list">
        ${incomingRows}${outgoingRows}${roomRows}
      </div>
      <button type="button" class="btn btn-secondary btn-sm" data-action="open-duel-setup">New duel invite</button>
    </section>`;
}
