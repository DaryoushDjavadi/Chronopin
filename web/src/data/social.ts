import type { AvatarConfig } from './lpc-catalog';
import { safeStorageSet } from '../lib/storage';
import { getProfile } from '../lib/profile';
import { isFirebaseConfigured } from '../lib/firebase';
import type { CoopInvite } from './coop';
import { getCoopGamesAttentionCount } from './coop';
import {
  directoryUserToFriend,
  getDirectoryUser,
  getDirectoryUserByName,
  searchDirectoryUsers,
  type DirectoryUser,
} from './user-directory';

export interface FriendStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  bestRunScore: number;
  winRate: number;
  strongestRegion: string;
  avgDistanceKm: number;
}

export interface FriendProfile {
  id: string;
  name: string;
  avatarConfig: AvatarConfig;
  tagline: string;
  memberSince: string;
  stats: FriendStats;
}

export interface FriendRequest {
  id: string;
  fromPlayerId: string;
  toUserId: string;
  name: string;
  avatarConfig: AvatarConfig;
  sentAt: number;
  direction: 'incoming' | 'outgoing';
}

const SOCIAL_KEY = 'chronopin-social';
const MESSAGES_KEY = 'chronopin-social-messages';

interface SocialStore {
  friendIds: string[];
  incomingRequestIds: string[];
  outgoingRequestIds: string[];
  dismissedRequestIds: string[];
}

const FRIEND_REGISTRY: Record<string, FriendProfile> = {};

let cloudFriendIds: string[] | null = null;
let cloudIncomingRequests: FriendRequest[] = [];
let cloudIncomingCoopInvites: CoopInvite[] = [];

export function registerCloudFriend(friend: FriendProfile): void {
  FRIEND_REGISTRY[friend.id] = friend;
}

export function setCloudFriendIds(ids: string[]): void {
  cloudFriendIds = ids;
}

export function setCloudIncomingRequests(requests: FriendRequest[]): void {
  cloudIncomingRequests = requests;
}

export function setCloudIncomingCoopInvites(invites: CoopInvite[]): void {
  cloudIncomingCoopInvites = invites;
}

export function getCloudIncomingCoopInvites(): CoopInvite[] {
  return cloudIncomingCoopInvites;
}

export function getCoopInviteBadgeCount(): number {
  return cloudIncomingCoopInvites.length;
}

function registerDirectoryFriend(user: DirectoryUser): FriendProfile {
  const friend = directoryUserToFriend(user);
  FRIEND_REGISTRY[user.id] = friend;
  return friend;
}

function ensureRegistry(): void {
  if (Object.keys(FRIEND_REGISTRY).length === 0) {
    registerDirectoryFriend(getDirectoryUser('max-mustermann')!);
  }
}

function defaultStore(): SocialStore {
  ensureRegistry();
  if (isFirebaseConfigured()) {
    return {
      friendIds: [],
      incomingRequestIds: [],
      outgoingRequestIds: [],
      dismissedRequestIds: [],
    };
  }
  return {
    friendIds: ['max-mustermann'],
    incomingRequestIds: ['req-lena'],
    outgoingRequestIds: [],
    dismissedRequestIds: [],
  };
}

function loadStore(): SocialStore {
  ensureRegistry();
  try {
    const raw = localStorage.getItem(SOCIAL_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<SocialStore>;
    return {
      friendIds: Array.isArray(parsed.friendIds) ? parsed.friendIds : ['max-mustermann'],
      incomingRequestIds: Array.isArray(parsed.incomingRequestIds)
        ? parsed.incomingRequestIds
        : ['req-lena'],
      outgoingRequestIds: Array.isArray(parsed.outgoingRequestIds) ? parsed.outgoingRequestIds : [],
      dismissedRequestIds: Array.isArray(parsed.dismissedRequestIds) ? parsed.dismissedRequestIds : [],
    };
  } catch {
    return defaultStore();
  }
}

function saveStore(store: SocialStore): void {
  safeStorageSet(SOCIAL_KEY, JSON.stringify(store));
}

const INCOMING_REQUESTS: Record<
  string,
  { userId: string; name: string; avatarConfig: AvatarConfig; sentAt: number }
> = {
  'req-lena': {
    userId: 'lena-vogt',
    name: 'Lena Vogt',
    avatarConfig: getDirectoryUser('lena-vogt')!.avatarConfig,
    sentAt: Date.now() - 1000 * 60 * 120,
  },
};

/** Online indicator — real friends show as available when cloud is active. */
export function isFriendOnline(friendId: string): boolean {
  if (isFirebaseConfigured() && cloudFriendIds !== null && cloudFriendIds.includes(friendId)) {
    return true;
  }
  const phase = friendId.charCodeAt(0) % 20_000;
  return Math.floor((Date.now() + phase) / 40_000) % 2 === 0;
}

export function getFriends(): FriendProfile[] {
  const ids =
    isFirebaseConfigured() && cloudFriendIds !== null ? cloudFriendIds : loadStore().friendIds;
  return ids
    .map((id) => {
      if (!FRIEND_REGISTRY[id]) {
        const user = getDirectoryUser(id);
        if (user) registerDirectoryFriend(user);
      }
      return FRIEND_REGISTRY[id];
    })
    .filter((f): f is FriendProfile => Boolean(f));
}

export function getFriendById(id: string): FriendProfile | undefined {
  ensureRegistry();
  if (!FRIEND_REGISTRY[id]) {
    const user = getDirectoryUser(id);
    if (user) return registerDirectoryFriend(user);
  }
  return FRIEND_REGISTRY[id];
}

export function isFriend(userId: string): boolean {
  if (cloudFriendIds?.includes(userId)) return true;
  return loadStore().friendIds.includes(userId);
}

export function hasPendingOutgoingTo(userId: string): boolean {
  const store = loadStore();
  return store.outgoingRequestIds.some((id) => {
    const req = OUTGOING_REQUESTS[id];
    return req?.toUserId === userId;
  });
}

const OUTGOING_REQUESTS: Record<
  string,
  { toUserId: string; name: string; avatarConfig: AvatarConfig; sentAt: number }
> = {};

function formatRelativeTime(at: number): string {
  const mins = Math.floor((Date.now() - at) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

export function getPendingRequests(): FriendRequest[] {
  const store = loadStore();
  const incoming: FriendRequest[] = store.incomingRequestIds
    .filter((id) => !store.dismissedRequestIds.includes(id))
    .flatMap((id) => {
      const meta = INCOMING_REQUESTS[id];
      if (!meta) return [];
      return [
        {
          id,
          fromPlayerId: meta.userId,
          toUserId: meta.userId,
          name: meta.name,
          avatarConfig: meta.avatarConfig,
          sentAt: meta.sentAt,
          direction: 'incoming' as const,
        },
      ];
    });

  const outgoing: FriendRequest[] = store.outgoingRequestIds.flatMap((id) => {
    const meta = OUTGOING_REQUESTS[id];
    if (!meta) return [];
    return [
      {
        id,
        fromPlayerId: 'me',
        toUserId: meta.toUserId,
        name: meta.name,
        avatarConfig: meta.avatarConfig,
        sentAt: meta.sentAt,
        direction: 'outgoing' as const,
      },
    ];
  });

  if (isFirebaseConfigured()) {
    return [...cloudIncomingRequests, ...outgoing];
  }

  return [...incoming, ...outgoing];
}

export function getPendingRequestCount(): number {
  return getPendingRequests().filter((r) => r.direction === 'incoming').length;
}

export function getSocialBadgeCount(myPlayerId: string): number {
  return (
    getPendingRequestCount() +
    getCloudIncomingCoopInvites().length +
    getCoopGamesAttentionCount(myPlayerId)
  );
}

export function searchUsers(query: string): DirectoryUser[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const profile = getProfile();
  const myName = profile?.name.trim().toLowerCase() ?? '';
  const store = loadStore();
  return searchDirectoryUsers(q).filter(
    (u) =>
      !store.friendIds.includes(u.id) &&
      !hasPendingOutgoingTo(u.id) &&
      u.name.trim().toLowerCase() !== myName,
  );
}

export type SendFriendRequestResult =
  | 'sent'
  | 'empty'
  | 'already_friend'
  | 'already_sent'
  | 'not_found'
  | 'self';

export function sendFriendRequestByName(
  name: string,
  myPlayerId: string,
): SendFriendRequestResult {
  const trimmed = name.trim();
  if (!trimmed) return 'empty';

  const user = getDirectoryUserByName(trimmed) ?? searchDirectoryUsers(trimmed)[0];
  if (!user) return 'not_found';
  return sendFriendRequestToUser(user, myPlayerId);
}

export function sendFriendRequestToUid(
  toUid: string,
  toName: string,
  _avatarConfig: AvatarConfig,
): SendFriendRequestResult {
  const profile = getProfile();
  if (profile && toName.toLowerCase() === profile.name.toLowerCase()) return 'self';
  if (isFriend(toUid)) return 'already_friend';
  return 'sent';
}

export function sendFriendRequestToUser(
  user: DirectoryUser,
  _myPlayerId: string,
): SendFriendRequestResult {
  const profile = getProfile();
  if (profile && user.name.toLowerCase() === profile.name.toLowerCase()) return 'self';
  const store = loadStore();
  if (store.friendIds.includes(user.id) || isFriend(user.id)) return 'already_friend';
  if (hasPendingOutgoingTo(user.id)) return 'already_sent';

  const reqId = `req-out-${Date.now()}`;
  OUTGOING_REQUESTS[reqId] = {
    toUserId: user.id,
    name: user.name,
    avatarConfig: user.avatarConfig,
    sentAt: Date.now(),
  };
  store.outgoingRequestIds.push(reqId);
  saveStore(store);

  if (user.demoAutoAccept && !isFirebaseConfigured()) {
    setTimeout(() => acceptOutgoingRequest(reqId), 800);
  }

  return 'sent';
}

function acceptOutgoingRequest(requestId: string): void {
  const store = loadStore();
  if (!store.outgoingRequestIds.includes(requestId)) return;
  const meta = OUTGOING_REQUESTS[requestId];
  if (!meta) return;

  registerDirectoryFriend(getDirectoryUser(meta.toUserId)!);
  if (!store.friendIds.includes(meta.toUserId)) {
    store.friendIds.push(meta.toUserId);
  }
  store.outgoingRequestIds = store.outgoingRequestIds.filter((id) => id !== requestId);
  saveStore(store);

  const messages = loadMessages();
  if (!messages.some((m) => m.friendId === meta.toUserId)) {
    messages.push({
      id: `seed-${meta.toUserId}`,
      friendId: meta.toUserId,
      fromMe: false,
      text: `Hey! ${meta.name} accepted your friend request. Up for Co-op Decide?`,
      at: Date.now() - 1000 * 30,
    });
    saveMessages(messages);
  }
}

export function acceptFriendRequest(requestId: string): void {
  const store = loadStore();
  const meta = INCOMING_REQUESTS[requestId];
  if (!meta || !store.incomingRequestIds.includes(requestId)) return;

  const user = getDirectoryUser(meta.userId);
  if (user) registerDirectoryFriend(user);
  if (!store.friendIds.includes(meta.userId)) {
    store.friendIds.push(meta.userId);
  }
  store.incomingRequestIds = store.incomingRequestIds.filter((id) => id !== requestId);

  const messages = loadMessages();
  if (!messages.some((m) => m.friendId === meta.userId)) {
    messages.push({
      id: `seed-${meta.userId}`,
      friendId: meta.userId,
      fromMe: false,
      text: 'Thanks for accepting! Up for Co-op Decide later?',
      at: Date.now() - 1000 * 60 * 5,
    });
    saveMessages(messages);
  }

  saveStore(store);
}

export function declineFriendRequest(requestId: string): void {
  const store = loadStore();
  store.incomingRequestIds = store.incomingRequestIds.filter((id) => id !== requestId);
  store.outgoingRequestIds = store.outgoingRequestIds.filter((id) => id !== requestId);
  store.dismissedRequestIds.push(requestId);
  saveStore(store);
}

export function cancelOutgoingRequest(requestId: string): void {
  const store = loadStore();
  store.outgoingRequestIds = store.outgoingRequestIds.filter((id) => id !== requestId);
  delete OUTGOING_REQUESTS[requestId];
  saveStore(store);
}

export interface ChatMessage {
  id: string;
  friendId: string;
  fromMe: boolean;
  text: string;
  at: number;
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (!raw) return seedMessages();
    const list = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(list) ? list : seedMessages();
  } catch {
    return seedMessages();
  }
}

function seedMessages(): ChatMessage[] {
  const seeded: ChatMessage[] = [
    {
      id: 'seed-1',
      friendId: 'max-mustermann',
      fromMe: false,
      text: 'Hey! Fancy Co-op Decide later? I found a tough Tokyo pano.',
      at: Date.now() - 1000 * 60 * 90,
    },
  ];
  safeStorageSet(MESSAGES_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveMessages(messages: ChatMessage[]): void {
  safeStorageSet(MESSAGES_KEY, JSON.stringify(messages));
}

export function getMessagesForFriend(friendId: string): ChatMessage[] {
  return loadMessages()
    .filter((m) => m.friendId === friendId)
    .sort((a, b) => a.at - b.at);
}

export function sendMessageToFriend(friendId: string, text: string): ChatMessage | null {
  const trimmed = text.trim();
  if (!trimmed || !getFriendById(friendId)) return null;
  const msg: ChatMessage = {
    id: `msg-${Date.now()}`,
    friendId,
    fromMe: true,
    text: trimmed,
    at: Date.now(),
  };
  const all = loadMessages();
  all.push(msg);
  saveMessages(all);
  return msg;
}

export function formatMessageTime(at: number): string {
  const d = new Date(at);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatRequestTime(at: number): string {
  return formatRelativeTime(at);
}
