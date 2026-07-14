import type { GameMode, Round } from '../types';
import { scoreGuess } from '../lib/geo';
import { pickDailyRound } from '../lib/daily';
import { getRoundById, pickRound } from './rounds';
import { safeStorageSet } from '../lib/storage';
import {
  patchDuelRoomInFirestore,
  pushDuelInviteToFirestore,
  pushDuelRoomToFirestore,
} from '../lib/firebase-duel';
import { isFirebaseConfigured } from '../lib/firebase';
import { getDirectoryUser } from './user-directory';
import type { CoopPin } from './coop';

export type DuelSyncMode = 'live' | 'async';

export type DuelPhase =
  | 'invite_pending'
  | 'explore'
  | 'host_pinned'
  | 'guest_pinned'
  | 'reveal'
  | 'round_result'
  | 'done';

export type DuelSide = 'host' | 'guest';

export interface DuelRoom {
  id: string;
  hostPlayerId: string;
  hostName: string;
  guestFriendId: string;
  guestName: string;
  guestUid: string;
  syncMode: DuelSyncMode;
  gameMode: GameMode;
  roundId: string;
  panoramaId: string;
  roundTitle: string;
  phase: DuelPhase;
  hostPin: CoopPin | null;
  guestPin: CoopPin | null;
  hostHearts: number;
  guestHearts: number;
  roundNumber: number;
  usedRoundIds: string[];
  lastRoundWinner: DuelSide | 'tie' | null;
  lastRoundHostPoints: number | null;
  lastRoundGuestPoints: number | null;
  lastRoundHostDistKm: number | null;
  lastRoundGuestDistKm: number | null;
  matchWinner: DuelSide | null;
  guestAccepted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DuelInvite {
  id: string;
  roomId: string;
  fromPlayerId: string;
  fromName: string;
  toFriendId: string;
  toUid: string;
  toSearchName?: string;
  syncMode: DuelSyncMode;
  gameMode: GameMode;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export const MAX_DUEL_HEARTS = 3;

const DUEL_ROOMS_KEY = 'chronopin-duel-rooms';
const DUEL_INVITES_KEY = 'chronopin-duel-invites';
const DUEL_ACTIVE_KEY = 'chronopin-duel-active';

function loadRooms(): DuelRoom[] {
  try {
    const raw = localStorage.getItem(DUEL_ROOMS_KEY);
    return raw ? (JSON.parse(raw) as DuelRoom[]) : [];
  } catch {
    return [];
  }
}

function saveRooms(rooms: DuelRoom[]): void {
  safeStorageSet(DUEL_ROOMS_KEY, JSON.stringify(rooms));
}

function loadInvites(): DuelInvite[] {
  try {
    const raw = localStorage.getItem(DUEL_INVITES_KEY);
    return raw ? (JSON.parse(raw) as DuelInvite[]) : [];
  } catch {
    return [];
  }
}

function saveInvites(invites: DuelInvite[]): void {
  safeStorageSet(DUEL_INVITES_KEY, JSON.stringify(invites));
}

function newerPin(a: CoopPin | null, b: CoopPin | null): CoopPin | null {
  if (!a) return b;
  if (!b) return a;
  return (b.at ?? 0) >= (a.at ?? 0) ? b : a;
}

export function mergeDuelRoomState(local: DuelRoom, remote: DuelRoom): DuelRoom {
  const hostPin = newerPin(local.hostPin, remote.hostPin);
  const guestPin = newerPin(local.guestPin, remote.guestPin);
  const newer = remote.updatedAt >= local.updatedAt ? remote : local;
  let phase = newer.phase;
  const phaseRank = (p: DuelPhase) =>
    ['invite_pending', 'explore', 'host_pinned', 'guest_pinned', 'reveal', 'round_result', 'done'].indexOf(p);
  if (phaseRank(phase) < phaseRank(local.phase)) phase = local.phase;
  if (hostPin && guestPin && phaseRank(phase) < phaseRank('reveal')) phase = 'reveal';

  return {
    ...newer,
    hostPin,
    guestPin,
    hostHearts: Math.min(MAX_DUEL_HEARTS, Math.max(0, newer.hostHearts ?? MAX_DUEL_HEARTS)),
    guestHearts: Math.min(MAX_DUEL_HEARTS, Math.max(0, newer.guestHearts ?? MAX_DUEL_HEARTS)),
    guestAccepted: local.guestAccepted || remote.guestAccepted,
    phase,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  };
}

export function getDuelRoom(roomId: string): DuelRoom | undefined {
  return loadRooms().find((r) => r.id === roomId);
}

export function getResolvedDuelRoom(roomId: string): DuelRoom | undefined {
  return getDuelRoom(roomId);
}

export function applyRemoteDuelRoom(remote: DuelRoom): void {
  const rooms = loadRooms();
  const idx = rooms.findIndex((r) => r.id === remote.id);
  if (idx >= 0) rooms[idx] = mergeDuelRoomState(rooms[idx]!, remote);
  else rooms.push(remote);
  saveRooms(rooms);
}

export function applyRemoteDuelInvite(invite: DuelInvite): void {
  const invites = loadInvites();
  const idx = invites.findIndex((i) => i.id === invite.id);
  if (idx >= 0) invites[idx] = invite;
  else invites.push(invite);
  saveInvites(invites);
}

function persistRoom(room: DuelRoom, options?: { skipCloud?: boolean }): void {
  applyRemoteDuelRoom(room);
  if (!options?.skipCloud) {
    void pushDuelRoomToFirestore(room).catch((err) =>
      console.warn('[ChronoPin] Firestore duel room sync failed:', err),
    );
  }
}

function persistInvite(invite: DuelInvite, options?: { skipCloud?: boolean }): void {
  applyRemoteDuelInvite(invite);
  if (!options?.skipCloud) {
    void pushDuelInviteToFirestore(invite).catch((err) =>
      console.warn('[ChronoPin] Firestore duel invite sync failed:', err),
    );
  }
}

export function updateDuelRoom(room: DuelRoom, options?: { skipCloud?: boolean }): void {
  const existing = getDuelRoom(room.id);
  const merged = existing ? mergeDuelRoomState(existing, room) : room;
  merged.updatedAt = Date.now();
  persistRoom(merged, options);
}

function pickDuelRound(mode: GameMode, usedRoundIds: string[]): Round | null {
  if (mode === 'classic') {
    return pickRound('classic', usedRoundIds, 'world') ?? pickDailyRound();
  }
  return pickRound(mode, usedRoundIds) ?? pickRound(mode, []);
}

export function createDuelInvite(
  hostPlayerId: string,
  hostName: string,
  guestFriendId: string,
  guestName: string,
  syncMode: DuelSyncMode,
  gameMode: GameMode,
): DuelInvite | null {
  const round = pickDuelRound(gameMode, []);
  if (!round) return null;

  const roomId = `duel-${Date.now()}`;
  const inviteId = `duel-inv-${Date.now()}`;

  const room: DuelRoom = {
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
    hostHearts: MAX_DUEL_HEARTS,
    guestHearts: MAX_DUEL_HEARTS,
    roundNumber: 1,
    usedRoundIds: [round.id],
    lastRoundWinner: null,
    lastRoundHostPoints: null,
    lastRoundGuestPoints: null,
    lastRoundHostDistKm: null,
    lastRoundGuestDistKm: null,
    matchWinner: null,
    guestAccepted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const invite: DuelInvite = {
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

  updateDuelRoom(room);
  const invites = loadInvites();
  invites.push(invite);
  saveInvites(invites);
  persistInvite(invite);

  const guestUser = getDirectoryUser(guestFriendId);
  if (guestUser?.demoAutoAccept && !isFirebaseConfigured()) {
    setTimeout(() => acceptDuelInvite(inviteId), 1200);
  }

  return invite;
}

export function acceptDuelInvite(inviteId: string): DuelRoom | null {
  const invites = loadInvites();
  const invite = invites.find((i) => i.id === inviteId);
  if (!invite || invite.status !== 'pending') return null;

  invite.status = 'accepted';
  saveInvites(invites);
  persistInvite(invite);

  const room = getDuelRoom(invite.roomId);
  if (!room) return null;

  room.guestAccepted = true;
  room.guestUid = invite.toUid;
  room.phase = 'explore';
  updateDuelRoom(room);
  return room;
}

export function declineDuelInvite(inviteId: string): void {
  const invites = loadInvites();
  const invite = invites.find((i) => i.id === inviteId);
  if (!invite) return;
  invite.status = 'declined';
  saveInvites(invites);
  persistInvite(invite);
  const room = getDuelRoom(invite.roomId);
  if (room) {
    room.phase = 'done';
    updateDuelRoom(room);
  }
}

export function cancelDuelInvite(inviteId: string): void {
  declineDuelInvite(inviteId);
}

export function getMyActiveDuelRooms(myPlayerId: string): DuelRoom[] {
  return loadRooms()
    .filter((r) => r.phase !== 'done')
    .filter(
      (r) =>
        r.hostPlayerId === myPlayerId ||
        r.guestUid === myPlayerId ||
        r.guestFriendId === myPlayerId,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getMyDuelRole(room: DuelRoom, myPlayerId: string): DuelSide {
  if (room.hostPlayerId === myPlayerId) return 'host';
  return 'guest';
}

export function canISubmitDuelPin(room: DuelRoom, myRole: DuelSide): boolean {
  if (room.phase !== 'explore' && room.phase !== 'host_pinned' && room.phase !== 'guest_pinned') {
    return false;
  }
  if (myRole === 'host') return !room.hostPin;
  if (room.syncMode === 'async' && !room.hostPin) return false;
  return !room.guestPin;
}

export function bothDuelPinsPlaced(room: DuelRoom): boolean {
  return Boolean(room.hostPin && room.guestPin);
}

export function submitDuelPin(
  roomId: string,
  role: DuelSide,
  pin: CoopPin,
): DuelRoom | null {
  const room = getDuelRoom(roomId);
  if (!room) return null;

  if (role === 'host') room.hostPin = pin;
  else room.guestPin = pin;

  if (room.syncMode === 'live') {
    room.phase = room.hostPin && room.guestPin ? 'reveal' : 'explore';
  } else if (role === 'host' && !room.guestPin) {
    room.phase = 'host_pinned';
  } else if (room.hostPin && room.guestPin) {
    room.phase = 'reveal';
  }

  updateDuelRoom(room, { skipCloud: true });
  const patch: Partial<DuelRoom> = { phase: room.phase };
  if (role === 'host') patch.hostPin = pin;
  else patch.guestPin = pin;
  void patchDuelRoomInFirestore(roomId, patch).catch((err) =>
    console.warn('[ChronoPin] Firestore duel pin sync failed:', err),
  );

  return room;
}

export function simulateDuelPartnerPin(
  roomId: string,
  answerLat: number,
  answerLng: number,
): DuelRoom | null {
  const room = getDuelRoom(roomId);
  if (!room) return null;
  const role: DuelSide | null =
    room.hostPin && !room.guestPin ? 'guest' : !room.hostPin ? 'host' : null;
  if (!role) return room;
  const pin: CoopPin = {
    lat: answerLat + (Math.random() - 0.5) * 4,
    lng: answerLng + (Math.random() - 0.5) * 4,
    label: role === 'host' ? room.hostName : room.guestName,
    at: Date.now(),
  };
  return submitDuelPin(roomId, role, pin);
}

export function resolveDuelRound(roomId: string): DuelRoom | null {
  const room = getDuelRoom(roomId);
  if (!room || room.phase !== 'reveal' || !room.hostPin || !room.guestPin) return room ?? null;

  const round = getDuelRound(room);
  if (!round) return null;

  const hostScore = scoreGuess(round, {
    lat: room.hostPin.lat,
    lng: room.hostPin.lng,
    year: room.hostPin.year,
  });
  const guestScore = scoreGuess(round, {
    lat: room.guestPin.lat,
    lng: room.guestPin.lng,
    year: room.guestPin.year,
  });

  room.lastRoundHostPoints = hostScore.points;
  room.lastRoundGuestPoints = guestScore.points;
  room.lastRoundHostDistKm = hostScore.distanceKm;
  room.lastRoundGuestDistKm = guestScore.distanceKm;

  let winner: DuelSide | 'tie';
  if (hostScore.points > guestScore.points) winner = 'host';
  else if (guestScore.points > hostScore.points) winner = 'guest';
  else winner = 'tie';

  room.lastRoundWinner = winner;

  if (winner === 'host') room.guestHearts = Math.max(0, room.guestHearts - 1);
  else if (winner === 'guest') room.hostHearts = Math.max(0, room.hostHearts - 1);

  if (room.hostHearts <= 0) room.matchWinner = 'guest';
  else if (room.guestHearts <= 0) room.matchWinner = 'host';

  room.phase = room.matchWinner ? 'done' : 'round_result';
  updateDuelRoom(room, { skipCloud: true });
  void patchDuelRoomInFirestore(roomId, {
    phase: room.phase,
    hostHearts: room.hostHearts,
    guestHearts: room.guestHearts,
    lastRoundWinner: room.lastRoundWinner,
    lastRoundHostPoints: room.lastRoundHostPoints,
    lastRoundGuestPoints: room.lastRoundGuestPoints,
    lastRoundHostDistKm: room.lastRoundHostDistKm,
    lastRoundGuestDistKm: room.lastRoundGuestDistKm,
    matchWinner: room.matchWinner,
  }).catch((err) => console.warn('[ChronoPin] Firestore duel resolve sync failed:', err));

  return room;
}

export function startDuelNextRound(roomId: string): DuelRoom | null {
  const room = getDuelRoom(roomId);
  if (!room || room.matchWinner || room.phase !== 'round_result') return null;

  const next = pickDuelRound(room.gameMode, room.usedRoundIds);
  if (!next) return null;

  room.roundId = next.id;
  room.panoramaId = next.panoramaId;
  room.roundTitle = next.title;
  room.usedRoundIds = [...room.usedRoundIds, next.id];
  room.roundNumber += 1;
  room.hostPin = null;
  room.guestPin = null;
  room.lastRoundWinner = null;
  room.lastRoundHostPoints = null;
  room.lastRoundGuestPoints = null;
  room.lastRoundHostDistKm = null;
  room.lastRoundGuestDistKm = null;
  room.phase = 'explore';
  updateDuelRoom(room);
  return room;
}

export function startDuelRoom(roomId: string): DuelRoom | null {
  const room = getDuelRoom(roomId);
  if (!room || (room.phase === 'invite_pending' && !room.guestAccepted)) return null;
  if (room.phase === 'invite_pending') room.phase = 'explore';
  setActiveDuelRoomId(roomId);
  updateDuelRoom(room);
  return room;
}

export function getDuelRound(room: DuelRoom): Round | null {
  return getRoundById(room.roundId, room.gameMode);
}

export function abandonDuelGame(roomId: string): void {
  const room = getDuelRoom(roomId);
  if (!room) return;
  room.phase = 'done';
  room.updatedAt = Date.now();
  updateDuelRoom(room, { skipCloud: true });
  void patchDuelRoomInFirestore(roomId, { phase: 'done' }).catch((err) =>
    console.warn('[ChronoPin] Firestore duel abandon sync failed:', err),
  );
  if (getActiveDuelRoomId() === roomId) setActiveDuelRoomId(null);
}

export function finishDuelRoom(roomId: string): void {
  const room = getDuelRoom(roomId);
  if (room) {
    room.phase = 'done';
    updateDuelRoom(room);
  }
  setActiveDuelRoomId(null);
}

export function leaveDuelRunLocally(): void {
  setActiveDuelRoomId(null);
}

export function getActiveDuelRoomId(): string | null {
  return localStorage.getItem(DUEL_ACTIVE_KEY);
}

export function setActiveDuelRoomId(roomId: string | null): void {
  if (roomId) safeStorageSet(DUEL_ACTIVE_KEY, roomId);
  else localStorage.removeItem(DUEL_ACTIVE_KEY);
}

export function syncModeLabel(mode: DuelSyncMode): string {
  return mode === 'live' ? 'Live (same time)' : 'Async (take turns)';
}

export function duelPhaseLabel(room: DuelRoom, myRole: DuelSide): string {
  switch (room.phase) {
    case 'invite_pending':
      return room.guestAccepted ? 'Ready to start' : 'Waiting for friend to accept…';
    case 'explore':
      return room.syncMode === 'live'
        ? 'Both players: pin in secret'
        : myRole === 'host'
          ? 'Your turn — drop your pin'
          : room.hostPin
            ? 'Your turn — drop your pin'
            : `Waiting for ${room.hostName}…`;
    case 'host_pinned':
      return myRole === 'guest' ? 'Your turn — drop your pin' : `Waiting for ${room.guestName}…`;
    case 'guest_pinned':
      return 'Both pins in';
    case 'reveal':
      return 'Both pins revealed — see the result';
    case 'round_result':
      return room.matchWinner ? 'Match over' : 'Round result — next scene ready';
    case 'done':
      return room.matchWinner
        ? `${room.matchWinner === 'host' ? room.hostName : room.guestName} wins!`
        : 'Duel ended';
    default:
      return '';
  }
}

export function describeDuelSession(room: DuelRoom, myPlayerId: string): {
  room: DuelRoom;
  myRole: DuelSide;
  partnerName: string;
  phaseLabel: string;
  canEnter: boolean;
  enterLabel: string;
  needsAttention: boolean;
} {
  const myRole = getMyDuelRole(room, myPlayerId);
  const partnerName = myRole === 'host' ? room.guestName : room.hostName;
  const phaseLabel = duelPhaseLabel(room, myRole);
  const myTurn = canISubmitDuelPin(room, myRole);
  const canEnter =
    room.phase !== 'done' &&
    !(myRole === 'host' && !room.guestAccepted && room.phase === 'invite_pending');

  let enterLabel = 'Continue';
  if (myTurn) enterLabel = 'Your turn';
  else if (room.phase === 'reveal') enterLabel = 'View reveal';
  else if (room.phase === 'round_result') enterLabel = 'Round result';
  else if (room.phase === 'done') enterLabel = 'Match over';

  const needsAttention = Boolean(
    myTurn ||
      (myRole === 'guest' && room.syncMode === 'async' && !!room.hostPin && !room.guestPin) ||
      room.phase === 'reveal',
  );

  return { room, myRole, partnerName, phaseLabel, canEnter, enterLabel, needsAttention };
}

export function simulatePartnerPinForDuel(
  roomId: string,
  lat: number,
  lng: number,
): DuelRoom | null {
  return simulateDuelPartnerPin(roomId, lat, lng);
}

export function getPendingDuelInvitesFromMe(myPlayerId: string): DuelInvite[] {
  return loadInvites().filter((i) => i.fromPlayerId === myPlayerId && i.status === 'pending');
}

export function getDuelGamesAttentionCount(myPlayerId: string): number {
  return getMyActiveDuelRooms(myPlayerId).filter((r) => describeDuelSession(r, myPlayerId).needsAttention)
    .length;
}

export function loadDuelInvitesLocal(): DuelInvite[] {
  return loadInvites();
}
