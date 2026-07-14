import type { GameMode } from '../types';
import { pickDailyRound } from '../lib/daily';
import { getRoundById, pickRound } from './rounds';
import type { Round } from '../types';
import { safeStorageSet } from '../lib/storage';
import { pushCoopInviteToFirestore, pushCoopRoomToFirestore } from '../lib/firebase-coop';
import { isFirebaseConfigured } from '../lib/firebase';
import { getDirectoryUser } from './user-directory';

export type CoopSyncMode = 'live' | 'async';

export type CoopPhase =
  | 'invite_pending'
  | 'explore'
  | 'host_pinned'
  | 'guest_pinned'
  | 'reveal'
  | 'vote'
  | 'result'
  | 'done';

export type CoopVoteChoice = 'host' | 'guest' | 'midpoint';

export interface CoopPin {
  lat: number;
  lng: number;
  year?: number;
  label: string;
  at: number;
}

export interface CoopRoom {
  id: string;
  hostPlayerId: string;
  hostName: string;
  guestFriendId: string;
  guestName: string;
  /** Firebase uid of guest (same as guestFriendId for cloud friends) */
  guestUid: string;
  syncMode: CoopSyncMode;
  gameMode: GameMode;
  roundId: string;
  panoramaId: string;
  roundTitle: string;
  phase: CoopPhase;
  hostPin: CoopPin | null;
  guestPin: CoopPin | null;
  hostVote: CoopVoteChoice | null;
  guestVote: CoopVoteChoice | null;
  finalPin: CoopPin | null;
  guestAccepted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CoopInvite {
  id: string;
  roomId: string;
  fromPlayerId: string;
  fromName: string;
  toFriendId: string;
  /** Firebase uid of invite recipient */
  toUid: string;
  /** Lowercase name — survives device / uid changes */
  toSearchName?: string;
  syncMode: CoopSyncMode;
  gameMode: GameMode;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

const COOP_ROOMS_KEY = 'chronopin-coop-rooms';
const COOP_INVITES_KEY = 'chronopin-coop-invites';
const COOP_ACTIVE_KEY = 'chronopin-coop-active';

function loadRooms(): CoopRoom[] {
  try {
    const raw = localStorage.getItem(COOP_ROOMS_KEY);
    return raw ? (JSON.parse(raw) as CoopRoom[]) : [];
  } catch {
    return [];
  }
}

function saveRooms(rooms: CoopRoom[]): void {
  safeStorageSet(COOP_ROOMS_KEY, JSON.stringify(rooms));
}

function loadInvites(): CoopInvite[] {
  try {
    const raw = localStorage.getItem(COOP_INVITES_KEY);
    return raw ? (JSON.parse(raw) as CoopInvite[]) : [];
  } catch {
    return [];
  }
}

function saveInvites(invites: CoopInvite[]): void {
  safeStorageSet(COOP_INVITES_KEY, JSON.stringify(invites));
}

export function getActiveCoopRoomId(): string | null {
  return localStorage.getItem(COOP_ACTIVE_KEY);
}

export function setActiveCoopRoomId(id: string | null): void {
  if (id) safeStorageSet(COOP_ACTIVE_KEY, id);
  else localStorage.removeItem(COOP_ACTIVE_KEY);
}

export function getCoopRoom(id: string): CoopRoom | undefined {
  return loadRooms().find((r) => r.id === id);
}

export function getActiveCoopRoom(): CoopRoom | undefined {
  const id = getActiveCoopRoomId();
  return id ? getCoopRoom(id) : undefined;
}

export function applyRemoteCoopRoom(room: CoopRoom): void {
  const rooms = loadRooms();
  const idx = rooms.findIndex((r) => r.id === room.id);
  if (idx >= 0) rooms[idx] = room;
  else rooms.push(room);
  saveRooms(rooms);
}

export function applyRemoteCoopInvite(invite: CoopInvite): void {
  const invites = loadInvites();
  const idx = invites.findIndex((i) => i.id === invite.id);
  if (idx >= 0) invites[idx] = invite;
  else invites.push(invite);
  saveInvites(invites);
}

export function updateCoopRoom(room: CoopRoom, options?: { skipCloud?: boolean }): void {
  room.updatedAt = Date.now();
  applyRemoteCoopRoom(room);
  if (!options?.skipCloud) {
    void pushCoopRoomToFirestore(room).catch((err) =>
      console.warn('[ChronoPin] Firestore coop room sync failed:', err),
    );
  }
}

function persistInvite(invite: CoopInvite, options?: { skipCloud?: boolean }): void {
  applyRemoteCoopInvite(invite);
  if (!options?.skipCloud) {
    void pushCoopInviteToFirestore(invite).catch((err) =>
      console.warn('[ChronoPin] Firestore coop invite sync failed:', err),
    );
  }
}

function pickCoopRound(mode: GameMode): Round | null {
  if (mode === 'classic') return pickDailyRound() ?? pickRound('classic', []);
  return pickRound(mode, []);
}

export function createCoopInvite(
  hostPlayerId: string,
  hostName: string,
  guestFriendId: string,
  guestName: string,
  syncMode: CoopSyncMode,
  gameMode: GameMode,
): CoopInvite | null {
  const round = pickCoopRound(gameMode);
  if (!round) return null;

  const roomId = `coop-${Date.now()}`;
  const inviteId = `inv-${Date.now()}`;

  const room: CoopRoom = {
    id: roomId,
    hostPlayerId,
    hostName,
    guestFriendId,
    guestName,
    guestUid: guestFriendId,
    syncMode,
    gameMode,
    roundId: round.id,
    panoramaId: round.panoramaId,
    roundTitle: round.title,
    phase: 'invite_pending',
    hostPin: null,
    guestPin: null,
    hostVote: null,
    guestVote: null,
    finalPin: null,
    guestAccepted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const invite: CoopInvite = {
    id: inviteId,
    roomId,
    fromPlayerId: hostPlayerId,
    fromName: hostName,
    toFriendId: guestFriendId,
    toUid: guestFriendId,
    toSearchName: guestName.trim().toLowerCase(),
    syncMode,
    gameMode,
    status: 'pending',
    createdAt: Date.now(),
  };

  updateCoopRoom(room);
  const invites = loadInvites();
  invites.push(invite);
  saveInvites(invites);
  persistInvite(invite);

  const guestUser = getDirectoryUser(guestFriendId);
  if (guestUser?.demoAutoAccept && !isFirebaseConfigured()) {
    setTimeout(() => acceptCoopInvite(inviteId), 1200);
  }

  return invite;
}

export function getPendingCoopInvitesForFriend(friendId: string): CoopInvite[] {
  return loadInvites().filter((i) => i.toFriendId === friendId && i.status === 'pending');
}

export function getPendingCoopInvitesFromMe(myPlayerId: string): CoopInvite[] {
  return loadInvites().filter((i) => i.fromPlayerId === myPlayerId && i.status === 'pending');
}

export function getCoopInvitesWithFriend(friendId: string, myPlayerId: string): CoopInvite[] {
  return loadInvites().filter(
    (i) =>
      i.status === 'pending' &&
      ((i.toFriendId === friendId && i.fromPlayerId === myPlayerId) ||
        (i.fromPlayerId !== myPlayerId && i.toFriendId === friendId)),
  );
}

export function getIncomingCoopInvitesForMe(myUid: string): CoopInvite[] {
  return loadInvites().filter((i) => i.status === 'pending' && i.toUid === myUid);
}

export function getCoopInviteCount(): number {
  return loadInvites().filter((i) => i.status === 'pending').length;
}

export function acceptCoopInvite(inviteId: string): CoopRoom | null {
  const invites = loadInvites();
  const invite = invites.find((i) => i.id === inviteId);
  if (!invite || invite.status !== 'pending') return null;

  invite.status = 'accepted';
  saveInvites(invites);
  persistInvite(invite);

  const room = getCoopRoom(invite.roomId);
  if (!room) return null;

  room.guestAccepted = true;
  room.guestUid = invite.toUid;
  room.phase = 'explore';
  updateCoopRoom(room);
  return room;
}

export function declineCoopInvite(inviteId: string): void {
  const invites = loadInvites();
  const invite = invites.find((i) => i.id === inviteId);
  if (!invite) return;
  invite.status = 'declined';
  saveInvites(invites);
  persistInvite(invite);
  const room = getCoopRoom(invite.roomId);
  if (room) {
    room.phase = 'done';
    updateCoopRoom(room);
  }
}

export function startCoopRoom(roomId: string): CoopRoom | null {
  const room = getCoopRoom(roomId);
  if (!room || room.phase === 'invite_pending' && !room.guestAccepted) return null;
  if (room.phase === 'invite_pending') room.phase = 'explore';
  setActiveCoopRoomId(roomId);
  updateCoopRoom(room);
  return room;
}

export function getCoopRound(room: CoopRoom): Round | null {
  return getRoundById(room.roundId, room.gameMode);
}

export function submitCoopPin(
  roomId: string,
  role: 'host' | 'guest',
  pin: CoopPin,
): CoopRoom | null {
  const room = getCoopRoom(roomId);
  if (!room) return null;

  if (role === 'host') room.hostPin = pin;
  else room.guestPin = pin;

  if (room.syncMode === 'live') {
    room.phase = room.hostPin && room.guestPin ? 'reveal' : 'explore';
  } else if (role === 'host' && !room.guestPin) {
    room.phase = 'host_pinned';
  } else if (role === 'guest' && room.hostPin && !room.guestPin) {
    room.phase = 'guest_pinned';
  } else if (room.hostPin && room.guestPin) {
    room.phase = 'reveal';
  }

  updateCoopRoom(room);
  return room;
}

export function simulatePartnerPin(
  roomId: string,
  answerLat: number,
  answerLng: number,
): CoopRoom | null {
  const room = getCoopRoom(roomId);
  if (!room) return null;

  const role: 'host' | 'guest' | null =
    room.hostPin && !room.guestPin ? 'guest' : !room.hostPin ? 'host' : null;
  if (!role) return room;

  const pin: CoopPin = {
    lat: answerLat + (Math.random() - 0.5) * 4,
    lng: answerLng + (Math.random() - 0.5) * 4,
    label: role === 'host' ? room.hostName : room.guestName,
    at: Date.now(),
  };
  return submitCoopPin(roomId, role, pin);
}

export function submitCoopVote(
  roomId: string,
  role: 'host' | 'guest',
  vote: CoopVoteChoice,
): CoopRoom | null {
  const room = getCoopRoom(roomId);
  if (!room) return null;

  if (role === 'host') room.hostVote = vote;
  else room.guestVote = vote;

  if (room.hostVote && room.guestVote) {
    const finalChoice =
      room.hostVote === room.guestVote ? room.hostVote : 'midpoint';
    room.finalPin = computeFinalPin(room, finalChoice);
    room.phase = 'result';
  } else {
    room.phase = 'vote';
  }

  updateCoopRoom(room);
  return room;
}

function computeFinalPin(room: CoopRoom, choice: CoopVoteChoice): CoopPin {
  if (choice === 'host' && room.hostPin) return { ...room.hostPin, label: `${room.hostName}'s pin` };
  if (choice === 'guest' && room.guestPin) return { ...room.guestPin, label: `${room.guestName}'s pin` };
  if (room.hostPin && room.guestPin) {
    return {
      lat: (room.hostPin.lat + room.guestPin.lat) / 2,
      lng: (room.hostPin.lng + room.guestPin.lng) / 2,
      label: 'Team midpoint',
      at: Date.now(),
    };
  }
  return { ...(room.hostPin ?? room.guestPin)! };
}

export function simulatePartnerVote(roomId: string): CoopRoom | null {
  const room = getCoopRoom(roomId);
  if (!room) return null;
  const role: 'host' | 'guest' | null = room.hostVote && !room.guestVote
    ? 'guest'
    : !room.hostVote
      ? 'host'
      : null;
  if (!role) return room;
  const choices: CoopVoteChoice[] = ['host', 'guest', 'midpoint'];
  const vote = choices[Math.floor(Math.random() * choices.length)]!;
  return submitCoopVote(roomId, role, vote);
}

export function advanceCoopToVote(roomId: string): CoopRoom | null {
  const room = getCoopRoom(roomId);
  if (!room || room.phase !== 'reveal') return null;
  room.phase = 'vote';
  updateCoopRoom(room);
  return room;
}

export function finishCoopRoom(roomId: string): void {
  const room = getCoopRoom(roomId);
  if (room) {
    room.phase = 'done';
    updateCoopRoom(room);
  }
  setActiveCoopRoomId(null);
}

export function cancelCoopInvite(inviteId: string): void {
  declineCoopInvite(inviteId);
}

export function getReadyCoopRoomWithFriend(
  friendId: string,
  myPlayerId: string,
): CoopRoom | undefined {
  return loadRooms().find(
    (r) =>
      r.hostPlayerId === myPlayerId &&
      r.guestFriendId === friendId &&
      r.guestAccepted &&
      (r.phase === 'explore' || r.phase === 'invite_pending'),
  );
}

export function getHostReadyCoopRooms(hostPlayerId: string): CoopRoom[] {
  return loadRooms().filter(
    (r) =>
      r.hostPlayerId === hostPlayerId &&
      r.guestAccepted &&
      (r.phase === 'explore' || r.phase === 'invite_pending'),
  );
}

export function leaveCoopRunLocally(): void {
  setActiveCoopRoomId(null);
}

export function syncModeLabel(mode: CoopSyncMode): string {
  return mode === 'live' ? 'Live (same time)' : 'Async (take turns)';
}

export function coopPhaseLabel(room: CoopRoom, myRole: 'host' | 'guest'): string {
  switch (room.phase) {
    case 'invite_pending':
      return room.guestAccepted ? 'Ready to start' : 'Waiting for friend to accept…';
    case 'explore':
      return room.syncMode === 'live'
        ? 'Both players: explore and pin (hidden until reveal)'
        : myRole === 'host'
          ? 'Your turn — drop your pin'
          : room.hostPin
            ? 'Your turn — drop your pin'
            : `Waiting for ${room.hostName}…`;
    case 'host_pinned':
      return myRole === 'guest'
        ? 'Your turn — drop your pin'
        : `Waiting for ${room.guestName}…`;
    case 'guest_pinned':
      return 'Both pins in — ready to reveal';
    case 'reveal':
      return 'Compare pins — then vote on the final guess';
    case 'vote':
      return room.hostVote && room.guestVote
        ? 'Votes locked in'
        : myRole === 'host' && !room.hostVote
          ? 'Pick the team pin'
          : myRole === 'guest' && !room.guestVote
            ? 'Pick the team pin'
            : `Waiting for partner vote…`;
    case 'result':
      return 'Round complete';
    default:
      return '';
  }
}

export function getMyCoopRole(room: CoopRoom, myPlayerId: string): 'host' | 'guest' {
  if (room.hostPlayerId === myPlayerId) return 'host';
  return 'guest';
}

export function canISubmitPin(room: CoopRoom, myRole: 'host' | 'guest'): boolean {
  if (room.phase !== 'explore' && room.phase !== 'host_pinned' && room.phase !== 'guest_pinned') {
    return false;
  }
  if (myRole === 'host') return !room.hostPin;
  if (room.syncMode === 'async' && !room.hostPin) return false;
  return !room.guestPin;
}
