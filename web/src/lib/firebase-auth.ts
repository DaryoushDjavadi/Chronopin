import {
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './firebase';

let authReady: Promise<User | null> | null = null;

export function clearAuthReadyCache(): void {
  authReady = null;
}

/** Anonymous sign-in — one Firebase uid per browser session (persisted by Firebase). */
export function ensureFirebaseAuth(): Promise<User | null> {
  if (!isFirebaseConfigured()) return Promise.resolve(null);
  if (authReady) return authReady;

  authReady = new Promise((resolve) => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (user) {
        resolve(user);
        return;
      }
      try {
        const cred = await signInAnonymously(auth);
        resolve(cred.user);
      } catch (err) {
        console.warn('[ChronoPin] Firebase anonymous auth failed:', err);
        resolve(null);
      }
    });
  });

  return authReady;
}

export function getFirebaseUid(): string | null {
  if (!isFirebaseConfigured()) return null;
  return getFirebaseAuth().currentUser?.uid ?? null;
}

export function waitForFirebaseUid(): Promise<string | null> {
  return ensureFirebaseAuth().then((u) => u?.uid ?? null);
}
