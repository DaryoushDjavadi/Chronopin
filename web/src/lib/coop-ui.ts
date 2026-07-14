import type { CoopInvite, CoopRoom, CoopSyncMode, CoopVoteChoice } from '../data/coop';
import {
  coopPhaseLabel,
  coopVoteLabel,
  coopVotesAgree,
  describeCoopSession,
  getMyActiveCoopRooms,
  getPendingCoopInvitesFromMe,
  syncModeLabel,
} from '../data/coop';
import type { FriendProfile } from '../data/social';
import { renderAvatar } from '../data/avatars';
import type { GameMode } from '../types';
import { modeLabel } from '../data/rounds';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderMultiplayerFriendPicker(
  friends: FriendProfile[],
  selectedFriendId: string | null,
): string {
  const selected = friends.find((f) => f.id === selectedFriendId);

  return `
    <div class="mp-friend-section" data-mp-friend-section>
      <h3 class="mp-section-title">Choose opponent</h3>
      ${
        friends.length === 0
          ? `<p class="coop-empty">Add friends first to play together.</p>
             <button type="button" class="btn btn-secondary btn-sm" data-action="social">Find friends</button>`
          : `<div class="coop-friend-pick mp-friend-pick">
              ${friends
                .map(
                  (f) => `
                <button type="button" class="coop-friend-chip ${selectedFriendId === f.id ? 'active' : ''}" data-action="pick-mp-friend" data-friend="${f.id}">
                  ${renderAvatar(f.avatarConfig, 'avatar avatar-xs')}
                  <span>${escapeHtml(f.name)}</span>
                </button>`,
                )
                .join('')}
            </div>
            <p class="mp-selected-hint">${
              selected
                ? `Playing against <strong>${escapeHtml(selected.name)}</strong>`
                : 'Select a friend to unlock multiplayer modes.'
            }</p>`
      }
    </div>`;
}

export function renderCoopSetupOverlay(options: {
  open: boolean;
  friends: FriendProfile[];
  selectedFriendId: string | null;
  syncMode: CoopSyncMode;
  gameMode: GameMode;
}): string {
  const { open, friends, selectedFriendId, syncMode, gameMode } = options;
  const modes: GameMode[] = ['classic', 'past', 'future'];

  return `
    <div
      class="coop-overlay ${open ? 'open' : ''}"
      aria-hidden="${!open}"
      ${open ? '' : 'inert'}
      data-coop-overlay
    >
      <div class="coop-backdrop" data-action="close-coop-setup" aria-hidden="true"></div>
      <div class="coop-panel" role="dialog" aria-label="Co-op Decide setup" aria-modal="true">
        <div class="coop-frame">
          <div class="coop-title-bar">
            <span class="coop-title">Co-op Decide</span>
            <button type="button" class="inv-close icon-btn" data-action="close-coop-setup" aria-label="Close">×</button>
          </div>
          <div class="coop-body">
            <p class="coop-intro">Blind pin → reveal → vote on one final team guess. Pick a friend and sync style.</p>

            <label class="field-label">Friend</label>
            <div class="coop-friend-pick">
              ${
                friends.length === 0
                  ? `<p class="coop-empty">Add a friend first from the Friends menu.</p>`
                  : friends
                      .map(
                        (f) => `
                <button type="button" class="coop-friend-chip ${selectedFriendId === f.id ? 'active' : ''}" data-action="pick-coop-friend" data-friend="${f.id}">
                  ${renderAvatar(f.avatarConfig, 'avatar avatar-xs')}
                  <span>${escapeHtml(f.name)}</span>
                </button>`,
                      )
                      .join('')
              }
            </div>

            <label class="field-label">Sync mode</label>
            <div class="coop-segmented">
              <button type="button" class="segmented-btn ${syncMode === 'live' ? 'active' : ''}" data-action="pick-coop-sync" data-sync="live">Live</button>
              <button type="button" class="segmented-btn ${syncMode === 'async' ? 'active' : ''}" data-action="pick-coop-sync" data-sync="async">Async</button>
            </div>
            <p class="coop-hint">${syncMode === 'live' ? 'Both pin at the same time — pins stay hidden until both are in.' : 'Take turns over hours or days — host pins first, then guest.'}</p>

            <label class="field-label">Game mode</label>
            <div class="coop-mode-pick">
              ${modes
                .map(
                  (m) => `
                <button type="button" class="coop-mode-chip ${gameMode === m ? 'active' : ''}" data-action="pick-coop-mode" data-mode="${m}">${modeLabel(m)}</button>`,
                )
                .join('')}
            </div>

            <button type="button" class="btn btn-primary btn-lg coop-send-btn" data-action="send-coop-invite" ${!selectedFriendId || friends.length === 0 ? 'disabled' : ''}>
              Send game invite
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

export function renderCoopHud(room: CoopRoom, myRole: 'host' | 'guest'): string {
  return `
    <div class="coop-hud" role="status">
      <span class="coop-hud-mode">Co-op · ${syncModeLabel(room.syncMode)}</span>
      <span class="coop-hud-phase">${escapeHtml(coopPhaseLabel(room, myRole))}</span>
      <span class="coop-hud-partner">vs ${escapeHtml(myRole === 'host' ? room.guestName : room.hostName)}</span>
    </div>`;
}

export function renderCoopWaitScreen(
  room: CoopRoom,
  myRole: 'host' | 'guest',
  options: { offlineDemo?: boolean } = {},
): string {
  const { offlineDemo = false } = options;
  const partner = myRole === 'host' ? room.guestName : room.hostName;
  const canSimulate =
    offlineDemo &&
    ((room.phase === 'host_pinned' && myRole === 'host') ||
      (room.phase === 'explore' && room.syncMode === 'live' && (room.hostPin || room.guestPin)) ||
      (room.phase === 'explore' && room.syncMode === 'async' && myRole === 'host' && room.hostPin) ||
      (room.phase === 'vote' && (room.hostVote || room.guestVote)));

  const waitHint = offlineDemo
    ? `Offline testing — simulate ${escapeHtml(partner)}'s turn on this device.`
    : `Waiting for ${escapeHtml(partner)} — checking every few seconds…`;

  return `
    <div class="screen screen-coop-wait">
      <div class="coop-wait-content">
        <span class="coop-wait-icon">⏳</span>
        <h2>${escapeHtml(coopPhaseLabel(room, myRole))}</h2>
        <p class="coop-wait-sub">${modeLabel(room.gameMode)} · Mystery scene</p>
        <p class="coop-wait-hint">${waitHint}</p>
        <button type="button" class="btn btn-secondary" data-action="coop-refresh">Check now</button>
        ${
          canSimulate
            ? `<button type="button" class="btn btn-secondary" data-action="coop-simulate-partner">Simulate partner turn</button>`
            : ''
        }
        <button type="button" class="btn btn-secondary" data-action="quit">Leave game</button>
        <button type="button" class="btn btn-danger btn-sm coop-delete-btn" data-action="delete-coop-game" data-room="${room.id}">Delete game</button>
      </div>
    </div>`;
}

export function renderCoopReveal(room: CoopRoom): string {
  return `
    <div class="screen screen-coop-reveal">
      <div class="coop-reveal-header">
        <h2>Reveal!</h2>
        <p>Compare your hidden pins before voting on the final guess.</p>
      </div>
      <div id="coop-reveal-map" class="map-container map-result"></div>
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
      <button type="button" class="btn btn-primary btn-lg" data-action="coop-to-vote">Vote on final pin →</button>
    </div>`;
}

export function renderCoopVote(
  room: CoopRoom,
  myRole: 'host' | 'guest',
  myVote: CoopVoteChoice | null,
  options: { offlineDemo?: boolean } = {},
): string {
  const { offlineDemo = false } = options;
  const partnerName = myRole === 'host' ? room.guestName : room.hostName;
  const partnerVote = myRole === 'host' ? room.guestVote : room.hostVote;
  const agree = coopVotesAgree(room);

  const voteBtn = (choice: CoopVoteChoice, title: string, sub: string) => {
    const partnerPicked = partnerVote === choice;
    const myPicked = myVote === choice;
    return `
      <button
        type="button"
        class="coop-vote-btn ${myPicked ? 'active' : ''} ${partnerPicked ? 'partner-picked' : ''}"
        data-action="coop-vote"
        data-vote="${choice}"
      >
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(sub)}</span>
        ${partnerPicked ? `<em class="coop-vote-partner-tag">${escapeHtml(partnerName)} picked this</em>` : ''}
        ${myPicked ? `<em class="coop-vote-you-tag">Your pick</em>` : ''}
      </button>`;
  };

  return `
    <div class="screen screen-coop-vote">
      <div class="coop-vote-header">
        <h2>Team vote</h2>
        <p>Pick a final team guess — you can change until you both agree and submit.</p>
      </div>
      <div id="coop-vote-map" class="map-container map-result"></div>

      <div class="coop-vote-status">
        <div class="coop-vote-status-row">
          <span>You</span>
          <strong>${myVote ? escapeHtml(coopVoteLabel(room, myVote)) : 'Not chosen yet'}</strong>
        </div>
        <div class="coop-vote-status-row">
          <span>${escapeHtml(partnerName)}</span>
          <strong>${partnerVote ? escapeHtml(coopVoteLabel(room, partnerVote)) : 'Still choosing…'}</strong>
        </div>
      </div>

      ${
        agree
          ? `<p class="coop-vote-agree">✓ You both picked <strong>${escapeHtml(coopVoteLabel(room, myVote!))}</strong></p>`
          : myVote && partnerVote
            ? `<p class="coop-vote-disagree">Different picks — talk it out or change your choice.</p>`
            : `<p class="coop-vote-hint">Tap a pin option below. You can switch anytime before submitting.</p>`
      }

      <div class="coop-vote-options">
        ${voteBtn('host', `${room.hostName}'s pin`, 'Use host guess')}
        ${voteBtn('midpoint', 'Midpoint', 'Split the difference')}
        ${voteBtn('guest', `${room.guestName}'s pin`, 'Use guest guess')}
      </div>

      <button
        type="button"
        class="btn btn-primary btn-lg coop-confirm-vote-btn"
        data-action="coop-confirm-vote"
        ${agree ? '' : 'disabled'}
      >Submit team guess</button>

      ${
        offlineDemo && partnerVote && !agree
          ? `<button type="button" class="btn btn-secondary" data-action="coop-simulate-vote">Simulate partner vote</button>`
          : ''
      }
      <button type="button" class="btn btn-secondary" data-action="quit">Leave</button>
    </div>`;
}

export function renderCoopResult(
  room: CoopRoom,
  myRole: 'host' | 'guest',
  distanceKm: number,
  points: number,
  maxPoints: number,
  xpBannerHtml = '',
): string {
  const pct = Math.round((points / maxPoints) * 100);
  const partnerName = myRole === 'host' ? room.guestName : room.hostName;
  return `
    <div class="screen screen-coop-result">
      <div class="coop-result-header">
        <span class="grade-badge">${pct >= 80 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'D'}</span>
        <h2>${pct}% team score</h2>
        <p>+${points.toLocaleString('en-GB')} pts · ${distanceKm.toFixed(0)} km off</p>
        ${xpBannerHtml}
      </div>
      <div id="coop-result-map" class="map-container map-result"></div>
      <div class="coop-result-card">
        <h3>${escapeHtml(room.roundTitle)}</h3>
        <p>Final team pin: ${room.finalPin ? `${room.finalPin.lat.toFixed(2)}°, ${room.finalPin.lng.toFixed(2)}°` : '—'}</p>
        <p class="coop-result-mode">${syncModeLabel(room.syncMode)} · ${modeLabel(room.gameMode)}</p>
      </div>
      <div class="result-actions">
        <button type="button" class="btn btn-secondary" data-action="quit">Home</button>
        <button type="button" class="btn btn-primary" data-action="coop-play-again">Play again with ${escapeHtml(partnerName)}</button>
      </div>
    </div>`;
}

export function renderCoopInvitePanel(
  friendId: string,
  invites: { id: string; fromName: string; syncMode: CoopSyncMode; gameMode: GameMode; direction: 'incoming' | 'outgoing' }[],
): string {
  if (invites.length === 0) return '';
  return `
    <section class="social-coop-section">
      <h4>Co-op invites</h4>
      <div class="social-coop-list">
        ${invites
          .map(
            (inv) => `
          <div class="social-coop-card">
            <div class="social-coop-meta">
              <strong>${inv.direction === 'incoming' ? escapeHtml(inv.fromName) : 'Your invite'}</strong>
              <span>${syncModeLabel(inv.syncMode)} · ${modeLabel(inv.gameMode)}</span>
            </div>
            <div class="social-coop-actions">
              ${
                inv.direction === 'incoming'
                  ? `<button type="button" class="btn btn-primary btn-sm" data-action="accept-coop-invite" data-invite="${inv.id}">Accept</button>
                     <button type="button" class="btn btn-secondary btn-sm" data-action="decline-coop-invite" data-invite="${inv.id}">Decline</button>`
                  : `<button type="button" class="btn btn-secondary btn-sm" data-action="cancel-coop-invite" data-invite="${inv.id}">Cancel</button>`
              }
            </div>
          </div>`,
          )
          .join('')}
      </div>
      <button type="button" class="btn btn-primary coop-invite-btn" data-action="open-coop-setup" data-friend="${friendId}">
        Send Co-op invite
      </button>
    </section>`;
}

export function renderCoopGamesTab(
  myPlayerId: string,
  cloudIncomingInvites: CoopInvite[],
): string {
  const activeRooms = getMyActiveCoopRooms(myPlayerId);
  const outgoingPending = getPendingCoopInvitesFromMe(myPlayerId);

  const roomRows = activeRooms
    .map((room) => {
      const info = describeCoopSession(room, myPlayerId);
      const attention = info.needsAttention ? ' needs-attention' : '';
      return `
        <div class="coop-game-card${attention}">
          <div class="coop-game-meta">
            <strong>vs ${escapeHtml(info.partnerName)}</strong>
            <span>${syncModeLabel(room.syncMode)} · ${modeLabel(room.gameMode)}</span>
            <span class="coop-game-scene">${room.phase === 'result' || room.phase === 'done' ? escapeHtml(room.roundTitle) : 'Mystery scene'}</span>
            <span class="coop-game-phase">${escapeHtml(info.phaseLabel)}</span>
          </div>
          <div class="coop-game-actions">
            <button
              type="button"
              class="btn ${info.needsAttention ? 'btn-primary' : 'btn-secondary'} btn-sm"
              data-action="enter-coop-room"
              data-room="${room.id}"
            >${escapeHtml(info.enterLabel)}</button>
            <button type="button" class="btn btn-danger btn-sm" data-action="delete-coop-game" data-room="${room.id}" title="Delete game">✕</button>
          </div>
        </div>`;
    })
    .join('');

  const incomingRows = cloudIncomingInvites
    .map(
      (inv) => `
        <div class="coop-game-card needs-attention">
          <div class="coop-game-meta">
            <strong>Invite from ${escapeHtml(inv.fromName)}</strong>
            <span>${syncModeLabel(inv.syncMode)} · ${modeLabel(inv.gameMode)}</span>
            <span class="coop-game-phase">Pending — accept to play</span>
          </div>
          <div class="coop-game-actions">
            <button type="button" class="btn btn-primary btn-sm" data-action="accept-coop-invite" data-invite="${inv.id}">Accept</button>
            <button type="button" class="btn btn-secondary btn-sm" data-action="decline-coop-invite" data-invite="${inv.id}">Decline</button>
          </div>
        </div>`,
    )
    .join('');

  const outgoingRows = outgoingPending
    .map(
      (inv) => `
        <div class="coop-game-card">
          <div class="coop-game-meta">
            <strong>Waiting for friend</strong>
            <span>${syncModeLabel(inv.syncMode)} · ${modeLabel(inv.gameMode)}</span>
            <span class="coop-game-phase">Invite sent — waiting for accept</span>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-action="cancel-coop-invite" data-invite="${inv.id}">Cancel</button>
        </div>`,
    )
    .join('');

  const hasContent = roomRows || incomingRows || outgoingRows;

  return `
    <div class="coop-games-tab">
      <p class="coop-games-intro">Active Co-op games and invites. Async games stay here until you finish the round.</p>
      ${
        !hasContent
          ? `<div class="social-empty"><p>No active games. Pick a friend under Multiplayer or Friends to start Co-op Decide.</p></div>`
          : `<div class="coop-games-list">
              ${incomingRows}
              ${roomRows}
              ${outgoingRows}
            </div>`
      }
    </div>`;
}
