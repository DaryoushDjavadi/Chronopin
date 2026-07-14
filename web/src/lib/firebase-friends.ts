import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import type { AvatarConfig } from '../data/lpc-catalog';
import { normalizeAvatarConfig } from '../data/lpc-catalog';
import type { FriendProfile } from '../data/social';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import { waitForFirebaseUid } from './firebase-auth';

export interface FirestoreFriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  toName: string;
  avatarConfig: AvatarConfig;
  status: 'pending' | 'accepted' | 'declined';
  sentAt: number;
}

export interface FirestoreFriendship {
  id: string;
  userA: string;
  userB: string;
  createdAt: number;
}

function friendshipId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export async function searchFirestoreUsersByName(
  term: string,
  excludeUid: string,
): Promise<{ uid: string; name: string; avatarConfig: AvatarConfig }[]> {
  if (!isFirebaseConfigured()) return [];
  const q = term.trim().toLowerCase();
  if (q.length < 2) return [];

  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), 'users'),
      where('searchName', '>=', q),
      where('searchName', '<=', `${q}\uf8ff`),
      limit(12),
    ),
  );

  return snap.docs
    .filter((d) => d.id !== excludeUid)
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        name: String(data.name ?? 'Player'),
        avatarConfig: normalizeAvatarConfig(data.avatarConfig as Partial<AvatarConfig>),
      };
    });
}

export async function sendFirestoreFriendRequest(
  toUid: string,
  toName: string,
  fromName: string,
  avatarConfig: AvatarConfig,
): Promise<string | null> {
  const fromUid = await waitForFirebaseUid();
  if (!fromUid || !isFirebaseConfigured()) return null;

  const id = `fr-${Date.now()}`;
  const req: FirestoreFriendRequest = {
    id,
    fromUid,
    toUid,
    fromName,
    toName,
    avatarConfig,
    status: 'pending',
    sentAt: Date.now(),
  };

  await setDoc(doc(getFirebaseDb(), 'friendRequests', id), {
    ...req,
    updatedAt: serverTimestamp(),
  });

  return id;
}

export async function getIncomingFirestoreRequests(
  uid: string,
): Promise<FirestoreFriendRequest[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), 'friendRequests'),
      where('toUid', '==', uid),
      where('status', '==', 'pending'),
    ),
  );
  return snap.docs.map((d) => ({ ...(d.data() as FirestoreFriendRequest), id: d.id }));
}

export async function acceptFirestoreFriendRequest(requestId: string): Promise<void> {
  const uid = await waitForFirebaseUid();
  if (!uid || !isFirebaseConfigured()) return;

  const ref = doc(getFirebaseDb(), 'friendRequests', requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const req = snap.data() as FirestoreFriendRequest;
  if (req.toUid !== uid || req.status !== 'pending') return;

  await updateDoc(ref, { status: 'accepted', updatedAt: serverTimestamp() });

  const fsId = friendshipId(req.fromUid, req.toUid);
  await setDoc(doc(getFirebaseDb(), 'friendships', fsId), {
    id: fsId,
    userA: req.fromUid,
    userB: req.toUid,
    createdAt: Date.now(),
  } satisfies FirestoreFriendship);
}

export async function declineFirestoreFriendRequest(requestId: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await updateDoc(doc(getFirebaseDb(), 'friendRequests', requestId), {
    status: 'declined',
    updatedAt: serverTimestamp(),
  });
}

async function fetchUserProfile(uid: string): Promise<FriendProfile | null> {
  const snap = await getDoc(doc(getFirebaseDb(), 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: uid,
    name: String(data.name ?? 'Player'),
    tagline: 'ChronoPin player',
    avatarConfig: normalizeAvatarConfig(data.avatarConfig as Partial<AvatarConfig>),
    memberSince: String(data.createdAt ?? new Date().toISOString()).slice(0, 10),
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      bestRunScore: 0,
      winRate: 0,
      strongestRegion: '—',
      avgDistanceKm: 0,
    },
  };
}

export async function getFirestoreFriends(uid: string): Promise<FriendProfile[]> {
  if (!isFirebaseConfigured()) return [];

  const [asA, asB] = await Promise.all([
    getDocs(query(collection(getFirebaseDb(), 'friendships'), where('userA', '==', uid))),
    getDocs(query(collection(getFirebaseDb(), 'friendships'), where('userB', '==', uid))),
  ]);

  const friendUids = new Set<string>();
  asA.docs.forEach((d) => {
    const data = d.data() as FirestoreFriendship;
    if (data.userB !== uid) friendUids.add(data.userB);
  });
  asB.docs.forEach((d) => {
    const data = d.data() as FirestoreFriendship;
    if (data.userA !== uid) friendUids.add(data.userA);
  });

  const profiles = await Promise.all([...friendUids].map((id) => fetchUserProfile(id)));
  return profiles.filter((p): p is FriendProfile => Boolean(p));
}

export async function getFirestoreUser(uid: string): Promise<FriendProfile | null> {
  if (!isFirebaseConfigured()) return null;
  return fetchUserProfile(uid);
}
