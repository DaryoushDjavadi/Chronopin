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
import type { DuelInvite, DuelRoom } from '../data/duel';
import { applyRemoteDuelInvite, applyRemoteDuelRoom, getResolvedDuelRoom } from '../data/duel';
import type { CoopPin } from '../data/coop';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';

function roomRef(roomId: string) {
  return doc(getFirebaseDb(), 'duelRooms', roomId);
}

function inviteRef(inviteId: string) {
  return doc(getFirebaseDb(), 'duelInvites', inviteId);
}

function sanitizePin(pin: CoopPin): CoopPin {
  const clean: CoopPin = {
    lat: pin.lat,
    lng: pin.lng,
    label: pin.label,
    at: pin.at,
  };
  if (pin.year != null && Number.isFinite(pin.year)) clean.year = pin.year;
  return clean;
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...payload };
  for (const key of ['hostPin', 'guestPin'] as const) {
    if (clean[key] && typeof clean[key] === 'object') {
      clean[key] = sanitizePin(clean[key] as CoopPin);
    }
  }
  return clean;
}

function duelRoomPayload(room: DuelRoom): Record<string, unknown> {
  const payload: Record<string, unknown> = sanitizePayload({ ...room, syncedAt: Date.now() });
  for (const key of ['hostPin', 'guestPin'] as const) {
    if (payload[key] == null) delete payload[key];
  }
  return payload;
}

export async function pushDuelRoomToFirestore(room: DuelRoom): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await setDoc(roomRef(room.id), duelRoomPayload(room), { merge: true });
}

export async function patchDuelRoomInFirestore(
  roomId: string,
  patch: Partial<DuelRoom>,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const payload = sanitizePayload({ ...patch, updatedAt: Date.now(), syncedAt: Date.now() });
  for (const key of ['hostPin', 'guestPin'] as const) {
    if (payload[key] == null) delete payload[key];
  }
  await setDoc(roomRef(roomId), payload, { merge: true });
}

export async function pushDuelInviteToFirestore(invite: DuelInvite): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await setDoc(
    inviteRef(invite.id),
    {
      ...invite,
      toSearchName: invite.toSearchName ?? invite.toUid,
      syncedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function pullDuelRoomFromFirestore(roomId: string): Promise<DuelRoom | null> {
  if (!isFirebaseConfigured()) return null;
  const snap = await getDoc(roomRef(roomId));
  if (!snap.exists()) return null;
  return { ...(snap.data() as DuelRoom), id: roomId };
}

export async function pullDuelInviteFromFirestore(inviteId: string): Promise<DuelInvite | null> {
  if (!isFirebaseConfigured()) return null;
  const snap = await getDoc(inviteRef(inviteId));
  if (!snap.exists()) return null;
  return { ...(snap.data() as DuelInvite), id: inviteId };
}

export function subscribeDuelRoom(
  roomId: string,
  onUpdate: (room: DuelRoom | null) => void,
): Unsubscribe | null {
  if (!isFirebaseConfigured()) return null;
  return onSnapshot(
    roomRef(roomId),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const remote = { ...(snap.data() as DuelRoom), id: roomId };
      applyRemoteDuelRoom(remote);
      onUpdate(getResolvedDuelRoom(roomId) ?? remote);
    },
    (err) => console.warn('[ChronoPin] duel room listener:', err),
  );
}

export function subscribeIncomingDuelInvites(
  uid: string,
  searchName: string,
  onUpdate: (invites: DuelInvite[]) => void,
): Unsubscribe | null {
  if (!isFirebaseConfigured()) return null;
  const db = getFirebaseDb();
  const byUid = new Map<string, DuelInvite>();
  const byName = new Map<string, DuelInvite>();

  const emit = () => {
    const merged = new Map([...byUid, ...byName]);
    onUpdate([...merged.values()]);
  };

  const unsubUid = onSnapshot(
    query(collection(db, 'duelInvites'), where('toUid', '==', uid), where('status', '==', 'pending')),
    (snap) => {
      byUid.clear();
      snap.docs.forEach((d) => {
        const inv = { ...(d.data() as DuelInvite), id: d.id };
        byUid.set(d.id, inv);
        applyRemoteDuelInvite(inv);
      });
      emit();
    },
    (err) => console.warn('[ChronoPin] duel invite listener (uid):', err),
  );

  if (!searchName) return unsubUid;

  const unsubName = onSnapshot(
    query(
      collection(db, 'duelInvites'),
      where('toSearchName', '==', searchName),
      where('status', '==', 'pending'),
    ),
    (snap) => {
      byName.clear();
      snap.docs.forEach((d) => {
        const inv = { ...(d.data() as DuelInvite), id: d.id };
        byName.set(d.id, inv);
        applyRemoteDuelInvite(inv);
      });
      emit();
    },
    (err) => console.warn('[ChronoPin] duel invite listener (name):', err),
  );

  return () => {
    unsubUid();
    unsubName();
  };
}

export async function pullMyDuelRoomsFromFirestore(uid: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirebaseDb();
  const [hostSnap, guestSnap] = await Promise.all([
    getDocs(query(collection(db, 'duelRooms'), where('hostPlayerId', '==', uid))),
    getDocs(query(collection(db, 'duelRooms'), where('guestUid', '==', uid))),
  ]);
  const seen = new Set<string>();
  for (const snap of [hostSnap, guestSnap]) {
    snap.docs.forEach((d) => {
      if (seen.has(d.id)) return;
      seen.add(d.id);
      const remote = { ...(d.data() as DuelRoom), id: d.id };
      if (remote.phase !== 'done') applyRemoteDuelRoom(remote);
    });
  }
}

export function startMyDuelRoomsListener(uid: string, onChange: () => void): Unsubscribe | null {
  if (!isFirebaseConfigured()) return null;
  const db = getFirebaseDb();
  const handle = (snap: { docs: { id: string; data: () => unknown }[] }) => {
    snap.docs.forEach((d) => {
      const remote = { ...(d.data() as DuelRoom), id: d.id };
      if (remote.phase !== 'done') applyRemoteDuelRoom(remote);
    });
    onChange();
  };

  const unsubHost = onSnapshot(
    query(collection(db, 'duelRooms'), where('hostPlayerId', '==', uid)),
    handle,
    (err) => console.warn('[ChronoPin] duel rooms listener (host):', err),
  );
  const unsubGuest = onSnapshot(
    query(collection(db, 'duelRooms'), where('guestUid', '==', uid)),
    handle,
    (err) => console.warn('[ChronoPin] duel rooms listener (guest):', err),
  );

  return () => {
    unsubHost();
    unsubGuest();
  };
}
