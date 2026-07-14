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

const LOGIN_TIMEOUT_MS = 6_000;
const AUTH_TIMEOUT_MS = 6_000;

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms);
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
  let remote: Partial<PlayerProfile> | null = null;
  try {
    remote = await withTimeout(pullProfileFromFirestore(previousUid), LOGIN_TIMEOUT_MS, 'Profile load');
  } catch {
    remote = null;
  }

  await withTimeout(
    setDoc(
      nameRef,
      {
        uid: currentUid,
        displayName,
        createdAt: record.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      },
      { merge: true },
    ),
    LOGIN_TIMEOUT_MS,
    'Name reclaim',
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
  void pushProfileToFirestore(profile, currentUid).catch((err) =>
    console.warn('[ChronoPin] Reclaim profile sync failed:', err),
  );
  return { ok: true, profile, returning: true };
}

async function syncCloudLogin(
  profile: PlayerProfile,
  uid: string,
  searchName: string,
  displayName: string,
  createLoginName: boolean,
): Promise<void> {
  try {
    if (createLoginName) {
      await withTimeout(
        setDoc(doc(getFirebaseDb(), 'loginNames', searchName), {
          uid,
          displayName,
          createdAt: Date.now(),
        } satisfies LoginNameRecord),
        LOGIN_TIMEOUT_MS,
        'Name registration',
      );
    }
    await withTimeout(pushProfileToFirestore(profile, uid), LOGIN_TIMEOUT_MS, 'Profile save');
  } catch (err) {
    console.warn('[ChronoPin] Cloud login sync failed:', err);
  }
}

async function loginWithNameCloud(name: string): Promise<LoginResult> {
  const displayName = normalizeLoginName(name);
  const searchName = nameToSearchKey(name);

  let uid: string | null = null;
  try {
    const user = await withTimeout(ensureFirebaseAuth(), AUTH_TIMEOUT_MS, 'Sign-in');
    uid = user?.uid ?? null;
  } catch {
    uid = null;
  }

  if (!uid) {
    const detail = getLastFirebaseAuthError();
    console.warn('[ChronoPin] Firebase auth unavailable — continuing offline:', detail);
    const profile = saveProfile(displayName, getDefaultAvatarConfig());
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

  const nameRef = doc(getFirebaseDb(), 'loginNames', searchName);

  try {
    const nameSnap = await withTimeout(getDoc(nameRef), LOGIN_TIMEOUT_MS, 'Profile lookup');

    if (nameSnap.exists()) {
      const record = nameSnap.data() as LoginNameRecord;
      const linkedUid = record.uid;

      if (linkedUid !== uid) {
        try {
          return await withTimeout(
            reclaimNameOnDevice(displayName, searchName, linkedUid, uid, record),
            LOGIN_TIMEOUT_MS,
            'Account reclaim',
          );
        } catch (err) {
          console.warn('[ChronoPin] Reclaim failed:', err);
          const profile = saveProfile(displayName, getDefaultAvatarConfig(), uid);
          void syncCloudLogin(profile, uid, searchName, displayName, false);
          return {
            ok: true,
            profile,
            returning: true,
            offline: true,
            authWarning: 'Cloud reclaim slow — profile saved locally. Reload to retry sync.',
          };
        }
      }

      let remote: Partial<PlayerProfile> | null = null;
      try {
        remote = await withTimeout(pullProfileFromFirestore(linkedUid), LOGIN_TIMEOUT_MS, 'Profile load');
      } catch {
        remote = null;
      }

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
      void syncCloudLogin(profile, uid, searchName, displayName, false);
      return { ok: true, profile, returning: true };
    }

    const profile = saveProfile(displayName, getDefaultAvatarConfig(), uid);
    void syncCloudLogin(profile, uid, searchName, displayName, true);
    return { ok: true, profile, returning: false };
  } catch (err) {
    console.warn('[ChronoPin] Cloud login failed:', err);
    const message = err instanceof Error ? err.message : 'Could not save your profile.';
    const code = (err as { code?: string })?.code;

    if (code === 'permission-denied') {
      const profile = saveProfile(displayName, getDefaultAvatarConfig(), uid);
      return {
        ok: true,
        profile,
        returning: false,
        offline: true,
        authWarning:
          'Firestore access denied — publish firestore.rules in Firebase Console. Playing offline for now.',
      };
    }

    const profile = saveProfile(displayName, getDefaultAvatarConfig(), uid);
    void syncCloudLogin(profile, uid, searchName, displayName, true);
    return {
      ok: true,
      profile,
      returning: false,
      offline: true,
      authWarning: message.includes('timed out')
        ? 'Cloud sync is slow — you can play now. Reload later to retry online features.'
        : 'Cloud sync pending — you can play now.',
    };
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
