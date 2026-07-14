import type { CoopRoom } from '../data/coop';
import type { MatchChatMessage } from '../data/match-chat';
import { formatMatchChatTime } from '../data/match-chat';
import { renderAvatar } from '../data/avatars';
import { getFriendById } from '../data/social';
import { getPlayerId } from '../lib/profile';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getCoopPartnerId(room: CoopRoom, myRole: 'host' | 'guest'): string {
  return myRole === 'host' ? room.guestFriendId : room.hostPlayerId;
}

export function getCoopPartnerName(room: CoopRoom, myRole: 'host' | 'guest'): string {
  return myRole === 'host' ? room.guestName : room.hostName;
}

const QUICK_CHIPS = ['👍 Nice!', '😂', '🤔 Hmm…', '🎯 Ready?'] as const;

export function renderMatchChatOverlay(options: {
  room: CoopRoom;
  myRole: 'host' | 'guest';
  open: boolean;
  draft: string;
  unread: number;
  messages: MatchChatMessage[];
}): string {
  const { room, myRole, open, draft, unread, messages } = options;
  const myId = getPlayerId();
  const partnerId = getCoopPartnerId(room, myRole);
  const partnerName = getCoopPartnerName(room, myRole);
  const partner = getFriendById(partnerId);
  const partnerAvatar = partner?.avatarConfig ?? null;

  return `
    <div class="match-chat-root" data-match-chat-root>
      <div class="match-chat-toasts" data-match-chat-toasts aria-live="polite"></div>

      <button
        type="button"
        class="match-chat-fab ${open ? 'open' : ''}"
        data-action="toggle-match-chat"
        aria-label="${open ? 'Close match chat' : 'Open match chat'}"
        aria-expanded="${open}"
      >
        <span class="match-chat-fab-icon" aria-hidden="true">💬</span>
        ${unread > 0 && !open ? `<span class="match-chat-badge">${unread > 9 ? '9+' : unread}</span>` : ''}
      </button>

      <div class="match-chat-panel ${open ? 'open' : ''}" data-match-chat-panel aria-hidden="${!open}">
        <div class="match-chat-panel-head">
          <div class="match-chat-partner">
            ${partnerAvatar ? renderAvatar(partnerAvatar, 'avatar avatar-xs') : '<span class="match-chat-partner-fallback">👤</span>'}
            <div>
              <strong>${escapeHtml(partnerName)}</strong>
              <span>Match chat</span>
            </div>
          </div>
          <button type="button" class="icon-btn match-chat-close" data-action="close-match-chat" aria-label="Close">×</button>
        </div>

        <div class="match-chat-log" data-match-chat-log>
          ${
            messages.length === 0
              ? `<p class="match-chat-empty">Say something to your partner…</p>`
              : messages
                  .map((m) => {
                    const mine = m.senderId === myId;
                    return `
              <div class="match-chat-bubble ${mine ? 'mine' : 'theirs'}">
                ${!mine ? `<span class="match-chat-sender">${escapeHtml(m.senderName)}</span>` : ''}
                <p>${escapeHtml(m.text)}</p>
                <time>${formatMatchChatTime(m.at)}</time>
              </div>`;
                  })
                  .join('')
          }
        </div>

        <div class="match-chat-quick">
          ${QUICK_CHIPS.map(
            (chip) =>
              `<button type="button" class="match-chat-quick-btn" data-action="match-chat-quick" data-text="${escapeHtml(chip)}">${chip}</button>`,
          ).join('')}
        </div>

        <form class="match-chat-form" data-action="send-match-chat">
          <input
            class="match-chat-input"
            name="message"
            type="text"
            maxlength="280"
            placeholder="Message…"
            value="${escapeHtml(draft)}"
            autocomplete="off"
          />
          <button type="submit" class="btn btn-primary match-chat-send">Send</button>
        </form>
      </div>
    </div>`;
}

export function renderMatchChatToast(message: MatchChatMessage, partnerAvatar: import('../data/lpc-catalog').AvatarConfig | null): string {
  return `
    <div class="match-chat-toast" data-match-chat-toast="${message.id}" role="status">
      <div class="match-chat-toast-inner">
        ${partnerAvatar ? renderAvatar(partnerAvatar, 'avatar avatar-xs') : '<span aria-hidden="true">💬</span>'}
        <div class="match-chat-toast-body">
          <strong>${escapeHtml(message.senderName)}</strong>
          <p>${escapeHtml(message.text)}</p>
        </div>
      </div>
    </div>`;
}
