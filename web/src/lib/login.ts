import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDefaultAvatarConfig, saveProfile, type PlayerProfile } from './profile';
import { normalizeAvatarConfig } from '../data/lpc-catalog';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import { waitForFirebaseUid } from './firebase-auth';
import { pullProfileFromFirestore, pushProfileToFirestore } from './firebase-profile';

export type LoginResult =
  | { ok: true; profile: PlayerProfile; returning: boolean }
  | { ok: false; error: string };

export function normalizeLoginName(name: string): string {
  return name.trim().slice(0, 20);
}

export function nameToSearchKey(name: string): string {
  return normalizeLoginName(name).toLowerCase();
}

interface LoginNameRecord {
  uid: string;
  displayName: string;
  createdAt: number;
  updatedAt?: number;
}

async function loginWithNameCloud(name: string): Promise<LoginResult> {
  const uid = await waitForFirebaseUid();
  if (!uid) {
    return { ok: false, error: 'Could not connect. Check your connection and try again.' };
  }

  const displayName = normalizeLoginName(name);
  const searchName = nameToSearchKey(name);
  const nameRef = doc(getFirebaseDb(), 'loginNames', searchName);
  const nameSnap = await getDoc(nameRef);

  if (nameSnap.exists()) {
    const record = nameSnap.data() as LoginNameRecord;
    const linkedUid = record.uid;

    if (linkedUid !== uid) {
      await setDoc(nameRef, {
        uid,
        displayName,
        updatedAt: Date.now(),
      });
    }

    const remote = await pullProfileFromFirestore(linkedUid);
    const avatarConfig = remote?.avatarConfig
      ? normalizeAvatarConfig(remote.avatarConfig)
      : getDefaultAvatarConfig();
    const resolvedName = remote?.name ?? record.displayName ?? displayName;

    const profile: PlayerProfile = {
      playerId: uid,
      name: resolvedName,
      avatarConfig,
      createdAt: remote?.createdAt ?? new Date().toISOString(),
    };

    saveProfile(profile.name, profile.avatarConfig, uid);
    try {
      await pushProfileToFirestore(profile, uid);
    } catch (err) {
      console.warn('[ChronoPin] Profile cloud sync failed:', err);
      return { ok: false, error: 'Could not sign in. Try again.' };
    }

    return { ok: true, profile, returning: true };
  }

  await setDoc(nameRef, {
    uid,
    displayName,
    createdAt: Date.now(),
  } satisfies LoginNameRecord);

  const profile = saveProfile(displayName, getDefaultAvatarConfig(), uid);
  try {
    await pushProfileToFirestore(profile, uid);
  } catch (err) {
    console.warn('[ChronoPin] Profile cloud create failed:', err);
    return { ok: false, error: 'Could not create your account. Try again.' };
  }

  return { ok: true, profile, returning: false };
}

export async function loginWithName(rawName: string): Promise<LoginResult> {
  const name = normalizeLoginName(rawName);
  if (!name) {
    return { ok: false, error: 'Please enter a name.' };
  }

  if (isFirebaseConfigured()) {
    return loginWithNameCloud(name);
  }

  const profile = saveProfile(name, getDefaultAvatarConfig());
  return { ok: true, profile, returning: false };
}
