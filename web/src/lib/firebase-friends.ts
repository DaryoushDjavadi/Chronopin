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
  toSearchName: string;
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

export async function resolveFirestoreUserUid(uid: string): Promise<string> {
  if (!isFirebaseConfigured()) return uid;
  const snap = await getDoc(doc(getFirebaseDb(), 'users', uid));
  if (!snap.exists()) return uid;
  const migratedTo = snap.data()?.migratedTo;
  if (typeof migratedTo === 'string' && migratedTo && migratedTo !== uid) {
    return resolveFirestoreUserUid(migratedTo);
  }
  return uid;
}

export async function searchFirestoreUsersByName(
  term: string,
  excludeUid: string,
  excludeSearchName?: string,
): Promise<{ uid: string; name: string; avatarConfig: AvatarConfig }[]> {
  if (!isFirebaseConfigured()) return [];
  const q = term.trim().toLowerCase();
  if (q.length < 2) return [];
  const excludeName = excludeSearchName?.trim().toLowerCase() ?? '';

  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), 'users'),
      where('searchName', '>=', q),
      where('searchName', '<=', `${q}\uf8ff`),
      limit(12),
    ),
  );

  const mapped = snap.docs
    .filter((d) => d.id !== excludeUid)
    .filter((d) => !d.data().migratedTo)
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        name: String(data.name ?? 'Player'),
        searchName: String(data.searchName ?? '').toLowerCase(),
        avatarConfig: normalizeAvatarConfig(data.avatarConfig as Partial<AvatarConfig>),
      };
    })
    .filter((u) => !excludeName || u.searchName !== excludeName);

  const byName = new Map<string, { uid: string; name: string; avatarConfig: AvatarConfig }>();
  for (const u of mapped) {
    const key = u.searchName || u.name.trim().toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, { uid: u.uid, name: u.name, avatarConfig: u.avatarConfig });
    }
  }
  return [...byName.values()];
}

export async function sendFirestoreFriendRequest(
  toUid: string,
  toName: string,
  fromName: string,
  avatarConfig: AvatarConfig,
): Promise<string | null> {
  const fromUid = await waitForFirebaseUid();
  if (!fromUid || !isFirebaseConfigured()) return null;
  if (toUid === fromUid || toName.trim().toLowerCase() === fromName.trim().toLowerCase()) {
    return null;
  }

  const id = `fr-${Date.now()}`;
  const req: FirestoreFriendRequest = {
    id,
    fromUid,
    toUid,
    toSearchName: toName.trim().toLowerCase(),
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
  searchName: string,
): Promise<FirestoreFriendRequest[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getFirebaseDb();
  const [byUid, byName] = await Promise.all([
    getDocs(
      query(
        collection(db, 'friendRequests'),
        where('toUid', '==', uid),
        where('status', '==', 'pending'),
      ),
    ),
    searchName
      ? getDocs(
          query(
            collection(db, 'friendRequests'),
            where('toSearchName', '==', searchName),
            where('status', '==', 'pending'),
          ),
        )
      : Promise.resolve(null),
  ]);

  const merged = new Map<string, FirestoreFriendRequest>();
  byUid.docs.forEach((d) => {
    merged.set(d.id, { ...(d.data() as FirestoreFriendRequest), id: d.id });
  });
  byName?.docs.forEach((d) => {
    merged.set(d.id, { ...(d.data() as FirestoreFriendRequest), id: d.id });
  });
  return [...merged.values()];
}

export async function acceptFirestoreFriendRequest(
  requestId: string,
  mySearchName?: string,
): Promise<void> {
  const uid = await waitForFirebaseUid();
  if (!uid || !isFirebaseConfigured()) return;

  const ref = doc(getFirebaseDb(), 'friendRequests', requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const req = snap.data() as FirestoreFriendRequest;
  const nameKey = mySearchName?.trim().toLowerCase() ?? '';
  const isRecipient =
    req.toUid === uid || (nameKey.length > 0 && req.toSearchName === nameKey);
  if (!isRecipient || req.status !== 'pending') return;

  await updateDoc(ref, { status: 'accepted', updatedAt: serverTimestamp() });

  const fsId = friendshipId(req.fromUid, uid);
  await setDoc(doc(getFirebaseDb(), 'friendships', fsId), {
    id: fsId,
    userA: req.fromUid,
    userB: uid,
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
  const resolvedUid = await resolveFirestoreUserUid(uid);
  const snap = await getDoc(doc(getFirebaseDb(), 'users', resolvedUid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: resolvedUid,
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
