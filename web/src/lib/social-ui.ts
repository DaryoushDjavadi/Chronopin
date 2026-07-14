import { renderAvatar } from '../data/avatars';
import {
  type FriendProfile,
  formatMessageTime,
  getFriendById,
  getFriends,
  getMessagesForFriend,
  getPendingRequestCount,
  getPendingRequests,
  isFriendOnline,
} from '../data/social';

export type SocialTab = 'friends' | 'add';
export type SocialView = 'list' | 'friend';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderOnlineBadge(online: boolean): string {
  return `<span class="social-status ${online ? 'online' : 'offline'}" aria-label="${online ? 'Online' : 'Offline'}"></span>`;
}

function renderFriendRow(friend: FriendProfile): string {
  const online = isFriendOnline(friend.id);
  return `
    <button type="button" class="social-friend-row" data-action="open-friend" data-friend="${friend.id}">
      <span class="social-friend-avatar-wrap">
        ${renderAvatar(friend.avatarConfig, 'avatar avatar-sm')}
        ${renderOnlineBadge(online)}
      </span>
      <span class="social-friend-meta">
        <strong>${escapeHtml(friend.name)}</strong>
        <span>${online ? 'Online' : 'Offline'} · ${escapeHtml(friend.tagline)}</span>
      </span>
      <span class="social-friend-chevron" aria-hidden="true">›</span>
    </button>`;
}

function renderFriendsTab(): string {
  const friends = getFriends();
  if (friends.length === 0) {
    return `<div class="social-empty"><p>No friends yet. Add someone from the Requests tab.</p></div>`;
  }
  return `<div class="social-friend-list">${friends.map(renderFriendRow).join('')}</div>`;
}

function renderAddTab(): string {
  const requests = getPendingRequests();
  return `
    <div class="social-add-section">
      <label class="field-label" for="social-add-name">Add friend</label>
      <div class="social-add-row">
        <input
          id="social-add-name"
          class="text-input social-add-input"
          type="text"
          maxlength="24"
          placeholder="Username"
          autocomplete="off"
        />
        <button type="button" class="btn btn-primary social-add-btn" data-action="send-friend-request">Send</button>
      </div>
      <p class="social-add-hint">Firebase sync coming later · demo sends a local toast only.</p>
    </div>

    <div class="social-requests-section">
      <h3 class="social-subhead">Friend requests</h3>
      ${
        requests.length === 0
          ? `<p class="social-empty-inline">No pending requests.</p>`
          : `<div class="social-request-list">
              ${requests
                .map(
                  (req) => `
                <div class="social-request-card">
                  <span class="social-request-avatar">${renderAvatar(req.avatarConfig, 'avatar avatar-sm')}</span>
                  <span class="social-request-meta">
                    <strong>${escapeHtml(req.name)}</strong>
                    <span>Sent ${escapeHtml(req.sentAt)}</span>
                  </span>
                  <div class="social-request-actions">
                    <button type="button" class="btn btn-primary btn-sm" data-action="accept-request" data-request="${req.id}">Accept</button>
                    <button type="button" class="btn btn-secondary btn-sm" data-action="decline-request" data-request="${req.id}">Decline</button>
                  </div>
                </div>`,
                )
                .join('')}
            </div>`
      }
    </div>`;
}

function renderFriendDetail(friendId: string, messageDraft: string): string {
  const friend = getFriendById(friendId);
  if (!friend) {
    return `<div class="social-empty"><p>Friend not found.</p></div>`;
  }

  const online = isFriendOnline(friend.id);
  const messages = getMessagesForFriend(friend.id);
  const s = friend.stats;

  return `
    <div class="social-detail">
      <button type="button" class="social-back" data-action="social-back">← Friends</button>

      <div class="social-detail-hero">
        <span class="social-detail-avatar-wrap">
          ${renderAvatar(friend.avatarConfig, 'avatar avatar-lg')}
          ${renderOnlineBadge(online)}
        </span>
        <h3>${escapeHtml(friend.name)}</h3>
        <p class="social-detail-tagline">${escapeHtml(friend.tagline)}</p>
        <span class="social-detail-status ${online ? 'is-online' : 'is-offline'}">${online ? 'Online now' : 'Offline'}</span>
      </div>

      <section class="social-stats-panel">
        <h4>Stats</h4>
        <div class="social-stats-grid">
          <div class="social-stat"><span>Games</span><strong>${s.gamesPlayed}</strong></div>
          <div class="social-stat"><span>W / L</span><strong>${s.gamesWon} / ${s.gamesLost}</strong></div>
          <div class="social-stat"><span>Win rate</span><strong>${s.winRate}%</strong></div>
          <div class="social-stat"><span>Best run</span><strong>${s.bestRunScore.toLocaleString('de-DE')}</strong></div>
          <div class="social-stat"><span>Strongest</span><strong>${escapeHtml(s.strongestRegion)}</strong></div>
          <div class="social-stat"><span>Avg. miss</span><strong>${s.avgDistanceKm} km</strong></div>
        </div>
        <p class="social-member-since">Playing since ${new Date(friend.memberSince).toLocaleDateString('de-DE')}</p>
      </section>

      <section class="social-chat">
        <h4>Messages</h4>
        <div class="social-chat-log" data-chat-log>
          ${
            messages.length === 0
              ? `<p class="social-chat-empty">No messages yet. Say hi!</p>`
              : messages
                  .map(
                    (m) => `
              <div class="social-chat-bubble ${m.fromMe ? 'mine' : 'theirs'}">
                <p>${escapeHtml(m.text)}</p>
                <time>${formatMessageTime(m.at)}</time>
              </div>`,
                  )
                  .join('')
          }
        </div>
        <form class="social-chat-form" data-action="send-message">
          <input
            type="text"
            class="text-input social-chat-input"
            name="message"
            maxlength="280"
            placeholder="${online ? 'Write a message…' : 'Leave a message (offline)…'}"
            value="${escapeHtml(messageDraft)}"
            autocomplete="off"
          />
          <button type="submit" class="btn btn-primary social-chat-send">Send</button>
        </form>
      </section>
    </div>`;
}

export function renderSocialOverlayHtml(options: {
  open: boolean;
  tab: SocialTab;
  view: SocialView;
  selectedFriendId: string | null;
  messageDraft: string;
  toast: string | null;
}): string {
  const { open, tab, view, selectedFriendId, messageDraft, toast } = options;
  const pending = getPendingRequestCount();

  const body =
    view === 'friend' && selectedFriendId
      ? renderFriendDetail(selectedFriendId, messageDraft)
      : `
        <div class="social-segmented" role="tablist">
          <button type="button" class="segmented-btn ${tab === 'friends' ? 'active' : ''}" data-social-tab="friends" role="tab" aria-selected="${tab === 'friends'}">
            Friends
          </button>
          <button type="button" class="segmented-btn ${tab === 'add' ? 'active' : ''}" data-social-tab="add" role="tab" aria-selected="${tab === 'add'}">
            Add / Requests${pending > 0 ? `<span class="social-tab-badge">${pending}</span>` : ''}
          </button>
        </div>
        ${tab === 'friends' ? renderFriendsTab() : renderAddTab()}`;

  return `
    <div class="social-overlay ${open ? 'open' : ''}" aria-hidden="${!open}" data-social-overlay">
      <div class="social-backdrop" data-action="close-social" aria-hidden="true"></div>
      <div class="social-panel" role="dialog" aria-label="Friends" aria-modal="true">
        <div class="social-frame">
          <div class="social-title-bar">
            <span class="social-title">Friends</span>
            <button type="button" class="inv-close icon-btn" data-action="close-social" aria-label="Close">×</button>
          </div>
          <div class="social-body">
            ${toast ? `<p class="social-toast" role="status">${escapeHtml(toast)}</p>` : ''}
            ${body}
          </div>
        </div>
      </div>
    </div>`;
}
