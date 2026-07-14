import {
  collection,
  doc,
  getDoc,
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

export async function pushCoopRoomToFirestore(room: CoopRoom): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await setDoc(roomRef(room.id), { ...room, syncedAt: Date.now() }, { merge: true });
}

export async function pushCoopInviteToFirestore(invite: CoopInvite): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await setDoc(inviteRef(invite.id), { ...invite, syncedAt: Date.now() }, { merge: true });
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
  onUpdate: (invites: CoopInvite[]) => void,
): Unsubscribe | null {
  if (!isFirebaseConfigured()) return null;
  const q = query(
    collection(getFirebaseDb(), 'coopInvites'),
    where('toUid', '==', uid),
    where('status', '==', 'pending'),
  );
  return onSnapshot(
    q,
    (snap) => {
      const invites = snap.docs.map((d) => ({ ...(d.data() as CoopInvite), id: d.id }));
      invites.forEach((inv) => applyRemoteCoopInvite(inv));
      onUpdate(invites);
    },
    (err) => console.warn('[ChronoPin] coop invite listener:', err),
  );
}
