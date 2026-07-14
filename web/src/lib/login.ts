import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getDefaultAvatarConfig, saveProfile, type PlayerProfile } from './profile';
import { normalizeAvatarConfig } from '../data/lpc-catalog';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import { ensureFirebaseAuth, getLastFirebaseAuthError } from './firebase-auth';
import { pullProfileFromFirestore, pushProfileToFirestore } from './firebase-profile';

export type LoginResult =
  | { ok: true; profile: PlayerProfile; returning: boolean; offline?: boolean; authWarning?: string }
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

const LOGIN_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out — try again.`)), ms);
    }),
  ]);
}

/** Move a name + cloud profile to the current browser's Firebase session (new device / reset). */
async function reclaimNameOnDevice(
  displayName: string,
  searchName: string,
  previousUid: string,
  currentUid: string,
  record: LoginNameRecord,
): Promise<LoginResult> {
  const nameRef = doc(getFirebaseDb(), 'loginNames', searchName);
  const remote = await pullProfileFromFirestore(previousUid);

  await setDoc(
    nameRef,
    {
      uid: currentUid,
      displayName,
      createdAt: record.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  if (previousUid !== currentUid) {
    try {
      const oldRef = doc(getFirebaseDb(), 'users', previousUid);
      const oldSnap = await getDoc(oldRef);
      const oldSearchName =
        typeof oldSnap.data()?.searchName === 'string' ? oldSnap.data()!.searchName : searchName;
      await updateDoc(oldRef, { migratedTo: currentUid, searchName: oldSearchName });
    } catch {
      /* old profile may be missing or rules may block — reclaim still works via loginNames */
    }
  }

  const avatarConfig = remote?.avatarConfig
    ? normalizeAvatarConfig(remote.avatarConfig)
    : getDefaultAvatarConfig();
  const resolvedName = remote?.name ?? record.displayName ?? displayName;

  const profile: PlayerProfile = {
    playerId: currentUid,
    name: resolvedName,
    avatarConfig,
    createdAt: remote?.createdAt ?? new Date().toISOString(),
  };

  saveProfile(profile.name, profile.avatarConfig, currentUid);
  await pushProfileToFirestore(profile, currentUid);
  return { ok: true, profile, returning: true };
}

async function loginWithNameCloud(name: string): Promise<LoginResult> {
  const user = await withTimeout(ensureFirebaseAuth(), LOGIN_TIMEOUT_MS, 'Sign-in');
  const uid = user?.uid ?? null;
  if (!uid) {
    const detail = getLastFirebaseAuthError();
    console.warn('[ChronoPin] Firebase auth unavailable — continuing offline:', detail);
    const profile = saveProfile(normalizeLoginName(name), getDefaultAvatarConfig());
    return {
      ok: true,
      profile,
      returning: false,
      offline: true,
      authWarning:
        detail ??
        'Firebase Auth not available. Solo works offline; enable Anonymous Auth for multiplayer.',
    };
  }

  const displayName = normalizeLoginName(name);
  const searchName = nameToSearchKey(name);
  const nameRef = doc(getFirebaseDb(), 'loginNames', searchName);

  try {
    const nameSnap = await withTimeout(getDoc(nameRef), LOGIN_TIMEOUT_MS, 'Profile lookup');

    if (nameSnap.exists()) {
      const record = nameSnap.data() as LoginNameRecord;
      const linkedUid = record.uid;

      if (linkedUid !== uid) {
        return reclaimNameOnDevice(displayName, searchName, linkedUid, uid, record);
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
      await pushProfileToFirestore(profile, uid);
      return { ok: true, profile, returning: true };
    }

    await setDoc(nameRef, {
      uid,
      displayName,
      createdAt: Date.now(),
    } satisfies LoginNameRecord);

    const profile = saveProfile(displayName, getDefaultAvatarConfig(), uid);
    await pushProfileToFirestore(profile, uid);
    return { ok: true, profile, returning: false };
  } catch (err) {
    console.warn('[ChronoPin] Cloud login failed:', err);
    const message = err instanceof Error ? err.message : 'Could not save your profile.';
    const code = (err as { code?: string })?.code;
    if (code === 'permission-denied') {
      return {
        ok: false,
        error: 'Firestore access denied — publish the latest firestore.rules in Firebase Console.',
      };
    }
    if (message.includes('timed out')) {
      const profile = saveProfile(normalizeLoginName(name), getDefaultAvatarConfig());
      return {
        ok: true,
        profile,
        returning: false,
        offline: true,
        authWarning: `${message} Continuing offline — reload to retry cloud sync.`,
      };
    }
    return { ok: false, error: message || 'Could not save your profile. Check Firebase rules and try again.' };
  }
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
  return { ok: true, profile, returning: false, offline: true };
}
