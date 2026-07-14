import type { AvatarConfig } from './lpc-catalog';
import { normalizeAvatarConfig } from './lpc-catalog';

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
  name: string;
  avatarConfig: AvatarConfig;
  sentAt: string;
}

const SOCIAL_KEY = 'chronopin-social';
const MESSAGES_KEY = 'chronopin-social-messages';

export const MAX_MUSTERMANN: FriendProfile = {
  id: 'max-mustermann',
  name: 'Max Mustermann',
  avatarConfig: normalizeAvatarConfig({
    body: 'male',
    skin: 'olive',
    hair: 'messy',
    hairColor: 'brown',
    headwear: 'none',
    top: 'vneck',
    topColor: '#27ae60',
    pants: 'pants',
    pantsColor: '#2a2a2a',
    shoes: 'basic',
    shoesColor: '#5d6d7e',
  }),
  tagline: 'Panorama hunter · Berlin',
  memberSince: '2024-03-12',
  stats: {
    gamesPlayed: 47,
    gamesWon: 32,
    gamesLost: 15,
    bestRunScore: 4280,
    winRate: 68,
    strongestRegion: 'Europe',
    avgDistanceKm: 312,
  },
};

const PENDING_REQUESTS: FriendRequest[] = [
  {
    id: 'req-lena',
    name: 'Lena Vogt',
    avatarConfig: normalizeAvatarConfig({
      body: 'female',
      skin: 'light',
      hair: 'bob',
      hairColor: 'blonde',
      headwear: 'none',
      top: 'tshirt',
      topColor: '#8e44ad',
      pants: 'pants',
      pantsColor: '#3d7ec9',
      shoes: 'basic',
      shoesColor: '#ecf0f1',
    }),
    sentAt: '2 h ago',
  },
];

interface SocialStore {
  friendIds: string[];
  pendingRequestIds: string[];
  dismissedRequestIds: string[];
}

const FRIEND_REGISTRY: Record<string, FriendProfile> = {
  [MAX_MUSTERMANN.id]: MAX_MUSTERMANN,
};

function defaultStore(): SocialStore {
  return {
    friendIds: [MAX_MUSTERMANN.id],
    pendingRequestIds: PENDING_REQUESTS.map((r) => r.id),
    dismissedRequestIds: [],
  };
}

function loadStore(): SocialStore {
  try {
    const raw = localStorage.getItem(SOCIAL_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<SocialStore>;
    return {
      friendIds: Array.isArray(parsed.friendIds) ? parsed.friendIds : [MAX_MUSTERMANN.id],
      pendingRequestIds: Array.isArray(parsed.pendingRequestIds)
        ? parsed.pendingRequestIds
        : PENDING_REQUESTS.map((r) => r.id),
      dismissedRequestIds: Array.isArray(parsed.dismissedRequestIds) ? parsed.dismissedRequestIds : [],
    };
  } catch {
    return defaultStore();
  }
}

function saveStore(store: SocialStore): void {
  localStorage.setItem(SOCIAL_KEY, JSON.stringify(store));
}

/** Demo: toggles every ~40 s so Max appears online/offline. */
export function isFriendOnline(friendId: string): boolean {
  if (friendId !== MAX_MUSTERMANN.id) return false;
  return Math.floor(Date.now() / 40_000) % 2 === 0;
}

export function getFriends(): FriendProfile[] {
  const store = loadStore();
  return store.friendIds
    .map((id) => FRIEND_REGISTRY[id])
    .filter((f): f is FriendProfile => Boolean(f));
}

export function getFriendById(id: string): FriendProfile | undefined {
  return FRIEND_REGISTRY[id];
}

export function getPendingRequests(): FriendRequest[] {
  const store = loadStore();
  return PENDING_REQUESTS.filter(
    (r) => store.pendingRequestIds.includes(r.id) && !store.dismissedRequestIds.includes(r.id),
  );
}

export function getPendingRequestCount(): number {
  return getPendingRequests().length;
}

export function acceptFriendRequest(requestId: string): void {
  const store = loadStore();
  const req = PENDING_REQUESTS.find((r) => r.id === requestId);
  if (!req || !store.pendingRequestIds.includes(requestId)) return;
  store.pendingRequestIds = store.pendingRequestIds.filter((id) => id !== requestId);
  saveStore(store);
}

export function declineFriendRequest(requestId: string): void {
  const store = loadStore();
  store.pendingRequestIds = store.pendingRequestIds.filter((id) => id !== requestId);
  store.dismissedRequestIds.push(requestId);
  saveStore(store);
}

export function sendFriendRequestByName(_name: string): 'sent' | 'empty' {
  const trimmed = _name.trim();
  if (!trimmed) return 'empty';
  return 'sent';
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
      friendId: MAX_MUSTERMANN.id,
      fromMe: false,
      text: 'Hey! Fancy a duel later? I found a tough Tokyo pano.',
      at: Date.now() - 1000 * 60 * 90,
    },
  ];
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveMessages(messages: ChatMessage[]): void {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

export function getMessagesForFriend(friendId: string): ChatMessage[] {
  return loadMessages()
    .filter((m) => m.friendId === friendId)
    .sort((a, b) => a.at - b.at);
}

export function sendMessageToFriend(friendId: string, text: string): ChatMessage | null {
  const trimmed = text.trim();
  if (!trimmed || !FRIEND_REGISTRY[friendId]) return null;
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
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
