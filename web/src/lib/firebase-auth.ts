import {
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './firebase';

let authReady: Promise<User | null> | null = null;
let lastAuthError: string | null = null;

export function clearAuthReadyCache(): void {
  authReady = null;
  lastAuthError = null;
}

function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not set up yet. Open Firebase Console → Build → Authentication → Get started → Sign-in method → enable Anonymous.';
    case 'auth/operation-not-allowed':
      return 'Anonymous sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method → Anonymous.';
    case 'auth/network-request-failed':
      return 'Network error — check your internet connection.';
    case 'auth/admin-restricted-operation':
      return 'Anonymous sign-in is not allowed for this project.';
    default:
      return code ? `Firebase auth failed (${code}).` : 'Firebase auth failed.';
  }
}

/** Anonymous sign-in — one Firebase uid per browser session (persisted by Firebase). */
export function ensureFirebaseAuth(force = false): Promise<User | null> {
  if (!isFirebaseConfigured()) return Promise.resolve(null);
  if (authReady && !force) return authReady;

  authReady = new Promise((resolve) => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (user) {
        lastAuthError = null;
        resolve(user);
        return;
      }
      try {
        const cred = await signInAnonymously(auth);
        lastAuthError = null;
        resolve(cred.user);
      } catch (err) {
        lastAuthError = mapAuthError(err);
        console.warn('[ChronoPin] Firebase anonymous auth failed:', err);
        resolve(null);
      }
    });
  });

  return authReady;
}

export function getLastFirebaseAuthError(): string | null {
  return lastAuthError;
}

export function getFirebaseUid(): string | null {
  if (!isFirebaseConfigured()) return null;
  return getFirebaseAuth().currentUser?.uid ?? null;
}

export async function waitForFirebaseUid(): Promise<string | null> {
  let user = await ensureFirebaseAuth();
  if (!user) {
    clearAuthReadyCache();
    user = await ensureFirebaseAuth(true);
  }
  return user?.uid ?? null;
}
