import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { CoopInvite, CoopRoom } from '../data/coop';
import { applyRemoteCoopRoom, applyRemoteCoopInvite } from '../data/coop';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';

function roomRef(roomId: string) {
  return doc(getFirebaseDb(), 'coopRooms', roomId);
}

function inviteRef(inviteId: string) {
  return doc(getFirebaseDb(), 'coopInvites', inviteId);
}

function coopRoomFirestorePayload(room: CoopRoom): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...room, syncedAt: Date.now() };
  // Never push null pins/votes — merge would wipe the partner's data in Firestore.
  for (const key of ['hostPin', 'guestPin', 'hostVote', 'guestVote', 'finalPin'] as const) {
    if (payload[key] == null) delete payload[key];
  }
  return payload;
}

export async function pushCoopRoomToFirestore(room: CoopRoom): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await setDoc(roomRef(room.id), coopRoomFirestorePayload(room), { merge: true });
}

/** Patch-only sync — never wipes the partner's pin/vote on merge. */
export async function patchCoopRoomInFirestore(
  roomId: string,
  patch: Partial<Pick<CoopRoom, 'hostPin' | 'guestPin' | 'hostVote' | 'guestVote' | 'finalPin' | 'phase'>>,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const payload: Record<string, unknown> = { ...patch, updatedAt: Date.now(), syncedAt: Date.now() };
  for (const key of ['hostPin', 'guestPin', 'hostVote', 'guestVote', 'finalPin'] as const) {
    if (payload[key] == null) delete payload[key];
  }
  await setDoc(roomRef(roomId), payload, { merge: true });
}

export async function pushCoopInviteToFirestore(invite: CoopInvite): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const payload = {
    ...invite,
    toSearchName: invite.toSearchName ?? invite.toUid,
    syncedAt: Date.now(),
  };
  await setDoc(inviteRef(invite.id), payload, { merge: true });
}

export async function pullCoopRoomFromFirestore(roomId: string): Promise<CoopRoom | null> {
  if (!isFirebaseConfigured()) return null;
  const snap = await getDoc(roomRef(roomId));
  if (!snap.exists()) return null;
  return { ...(snap.data() as CoopRoom), id: roomId };
}

export async function pullCoopInviteFromFirestore(inviteId: string): Promise<CoopInvite | null> {
  if (!isFirebaseConfigured()) return null;
  const snap = await getDoc(inviteRef(inviteId));
  if (!snap.exists()) return null;
  return { ...(snap.data() as CoopInvite), id: inviteId };
}

export function subscribeCoopRoom(
  roomId: string,
  onUpdate: (room: CoopRoom | null) => void,
): Unsubscribe | null {
  if (!isFirebaseConfigured()) return null;
  return onSnapshot(
    roomRef(roomId),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const remote = { ...(snap.data() as CoopRoom), id: roomId };
      applyRemoteCoopRoom(remote);
      onUpdate(remote);
    },
    (err) => console.warn('[ChronoPin] coop room listener:', err),
  );
}

export function subscribeIncomingCoopInvites(
  uid: string,
  searchName: string,
  onUpdate: (invites: CoopInvite[]) => void,
): Unsubscribe | null {
  if (!isFirebaseConfigured()) return null;
  const db = getFirebaseDb();
  const byUid = new Map<string, CoopInvite>();
  const byName = new Map<string, CoopInvite>();

  const emit = () => {
    const merged = new Map([...byUid, ...byName]);
    const invites = [...merged.values()];
    invites.forEach((inv) => applyRemoteCoopInvite(inv));
    onUpdate(invites);
  };

  const unsubUid = onSnapshot(
    query(
      collection(db, 'coopInvites'),
      where('toUid', '==', uid),
      where('status', '==', 'pending'),
    ),
    (snap) => {
      byUid.clear();
      snap.docs.forEach((d) => {
        byUid.set(d.id, { ...(d.data() as CoopInvite), id: d.id });
      });
      emit();
    },
    (err) => console.warn('[ChronoPin] coop invite listener (uid):', err),
  );

  if (!searchName) {
    return unsubUid;
  }

  const unsubName = onSnapshot(
    query(
      collection(db, 'coopInvites'),
      where('toSearchName', '==', searchName),
      where('status', '==', 'pending'),
    ),
    (snap) => {
      byName.clear();
      snap.docs.forEach((d) => {
        byName.set(d.id, { ...(d.data() as CoopInvite), id: d.id });
      });
      emit();
    },
    (err) => console.warn('[ChronoPin] coop invite listener (name):', err),
  );

  return () => {
    unsubUid();
    unsubName();
  };
}

export async function pullMyCoopRoomsFromFirestore(uid: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirebaseDb();
  const [hostSnap, guestSnap] = await Promise.all([
    getDocs(query(collection(db, 'coopRooms'), where('hostPlayerId', '==', uid))),
    getDocs(query(collection(db, 'coopRooms'), where('guestUid', '==', uid))),
  ]);
  const seen = new Set<string>();
  for (const snap of [hostSnap, guestSnap]) {
    snap.docs.forEach((d) => {
      if (seen.has(d.id)) return;
      seen.add(d.id);
      const remote = { ...(d.data() as CoopRoom), id: d.id };
      if (remote.phase !== 'done') applyRemoteCoopRoom(remote);
    });
  }
}

export function subscribeMyCoopRooms(
  uid: string,
  onUpdate: () => void,
): Unsubscribe | null {
  if (!isFirebaseConfigured()) return null;
  const db = getFirebaseDb();
  const byId = new Map<string, CoopRoom>();

  const emit = () => {
    byId.forEach((room) => {
      if (room.phase !== 'done') applyRemoteCoopRoom(room);
    });
    onUpdate();
  };

  const applySnap = (snap: { docs: { id: string; data: () => Record<string, unknown> }[] }) => {
    snap.docs.forEach((d) => {
      const room = { ...(d.data() as unknown as CoopRoom), id: d.id };
      if (room.phase === 'done') byId.delete(d.id);
      else byId.set(d.id, room);
    });
    emit();
  };

  const unsubHost = onSnapshot(
    query(collection(db, 'coopRooms'), where('hostPlayerId', '==', uid)),
    applySnap,
    (err) => console.warn('[ChronoPin] my coop rooms (host):', err),
  );

  const unsubGuest = onSnapshot(
    query(collection(db, 'coopRooms'), where('guestUid', '==', uid)),
    applySnap,
    (err) => console.warn('[ChronoPin] my coop rooms (guest):', err),
  );

  return () => {
    unsubHost();
    unsubGuest();
  };
}

let myCoopRoomsUnsub: Unsubscribe | null = null;

export function startMyCoopRoomsListener(uid: string, onUpdate: () => void): void {
  myCoopRoomsUnsub?.();
  myCoopRoomsUnsub = subscribeMyCoopRooms(uid, onUpdate);
}

export function stopMyCoopRoomsListener(): void {
  myCoopRoomsUnsub?.();
  myCoopRoomsUnsub = null;
}
