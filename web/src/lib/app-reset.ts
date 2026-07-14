import { signOut } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './firebase';
import { clearAuthReadyCache, ensureFirebaseAuth } from './firebase-auth';

const CHRONOPIN_PREFIX = 'chronopin-';

/** Remove all ChronoPin localStorage keys (profile, stats, social, coop, …). */
export function clearChronopinLocalStorage(): void {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(CHRONOPIN_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}

/** Sign out Firebase and start a fresh anonymous session. */
export async function resetFirebaseSession(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  clearAuthReadyCache();
  const auth = getFirebaseAuth();
  try {
    await signOut(auth);
  } catch {
    /* ignore */
  }
  clearAuthReadyCache();
  await ensureFirebaseAuth();
}

/** Full wipe — same as opening the app for the first time. */
export async function factoryResetApp(): Promise<void> {
  clearChronopinLocalStorage();
  await resetFirebaseSession();
}
