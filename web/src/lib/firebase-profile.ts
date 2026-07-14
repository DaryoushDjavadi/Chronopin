import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { PlayerProfile } from './profile';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import { waitForFirebaseUid } from './firebase-auth';

export interface FirestoreUserProfile {
  name: string;
  avatarConfig: PlayerProfile['avatarConfig'];
  createdAt: string;
  searchName: string;
  updatedAt: ReturnType<typeof serverTimestamp>;
}

export async function ensureLoginNameRegistered(profile: PlayerProfile, uid: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const searchName = profile.name.trim().toLowerCase();
  if (!searchName) return;
  const nameRef = doc(getFirebaseDb(), 'loginNames', searchName);
  const snap = await getDoc(nameRef);
  if (!snap.exists() || snap.data().uid === uid) {
    await setDoc(
      nameRef,
      { uid, displayName: profile.name, updatedAt: Date.now() },
      { merge: true },
    );
  }
}

export async function pullProfileFromFirestore(uid: string): Promise<Partial<PlayerProfile> | null> {
  if (!isFirebaseConfigured()) return null;
  const snap = await getDoc(doc(getFirebaseDb(), 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data() as FirestoreUserProfile;
  return {
    playerId: uid,
    name: data.name,
    avatarConfig: data.avatarConfig,
    createdAt: data.createdAt,
  };
}

export async function pushProfileToFirestore(profile: PlayerProfile, uid: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const payload: FirestoreUserProfile = {
    name: profile.name,
    avatarConfig: profile.avatarConfig,
    createdAt: profile.createdAt,
    searchName: profile.name.trim().toLowerCase(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(getFirebaseDb(), 'users', uid), payload, { merge: true });
  await ensureLoginNameRegistered(profile, uid);
}

export async function syncLocalProfileWithFirebase(
  local: PlayerProfile | null,
  onMerged: (profile: PlayerProfile) => void,
): Promise<string | null> {
  const uid = await waitForFirebaseUid();
  if (!uid) return null;

  if (local) {
    const merged: PlayerProfile = { ...local, playerId: uid };
    onMerged(merged);
    await pushProfileToFirestore(merged, uid);
    return uid;
  }

  const remote = await pullProfileFromFirestore(uid);
  if (remote?.name && remote.avatarConfig) {
    onMerged({
      playerId: uid,
      name: remote.name,
      avatarConfig: remote.avatarConfig,
      createdAt: remote.createdAt ?? new Date().toISOString(),
    });
  }

  return uid;
}
