import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { InventoryItemId } from '../data/inventory';
import { nameToSearchKey } from './login';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import { waitForFirebaseUid } from './firebase-auth';
import { isAdminPlayer } from './admin';

export interface AdminPlayerRow {
  uid: string;
  name: string;
  searchName: string;
  migratedTo?: string;
}

async function requireAdmin(): Promise<string> {
  if (!isFirebaseConfigured() || !isAdminPlayer()) {
    throw new Error('Admin access required.');
  }
  const uid = await waitForFirebaseUid();
  if (!uid) throw new Error('Not signed in.');
  return uid;
}

export async function adminSearchPlayers(term: string): Promise<AdminPlayerRow[]> {
  await requireAdmin();
  const q = term.trim().toLowerCase();
  if (q.length < 1) return [];

  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), 'users'),
      where('searchName', '>=', q),
      where('searchName', '<=', `${q}\uf8ff`),
      limit(20),
    ),
  );

  const rows: AdminPlayerRow[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (typeof data.migratedTo === 'string' && data.migratedTo) continue;
    rows.push({
      uid: d.id,
      name: String(data.name ?? 'Player'),
      searchName: String(data.searchName ?? d.id),
    });
  }

  const byName = new Map<string, AdminPlayerRow>();
  for (const row of rows) {
    if (!byName.has(row.searchName)) byName.set(row.searchName, row);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function adminDeletePlayer(searchName: string): Promise<void> {
  await requireAdmin();
  const key = nameToSearchKey(searchName);
  if (!key) throw new Error('Invalid name.');

  const nameRef = doc(getFirebaseDb(), 'loginNames', key);
  const nameSnap = await getDoc(nameRef);
  const uid = nameSnap.exists() ? String(nameSnap.data().uid ?? '') : '';

  await deleteDoc(nameRef);
  if (uid) {
    await deleteDoc(doc(getFirebaseDb(), 'users', uid)).catch(() => undefined);
    for (const mode of ['classic', 'past', 'future'] as const) {
      await deleteDoc(doc(getFirebaseDb(), 'scoreboard', `${key}_${mode}`)).catch(
        () => undefined,
      );
    }
  }
}

export async function adminGrantStash(
  searchName: string,
  itemId: InventoryItemId,
  amount: number,
): Promise<void> {
  await requireAdmin();
  const key = nameToSearchKey(searchName);
  const nameSnap = await getDoc(doc(getFirebaseDb(), 'loginNames', key));
  if (!nameSnap.exists()) throw new Error('Player not found.');
  const uid = String(nameSnap.data().uid ?? '');
  if (!uid) throw new Error('Player not found.');

  const userRef = doc(getFirebaseDb(), 'users', uid);
  const userSnap = await getDoc(userRef);
  const existing = (userSnap.data()?.bonusStash ?? {}) as Record<string, number>;
  const next = { ...existing, [itemId]: (existing[itemId] ?? 0) + amount };
  await setDoc(userRef, { bonusStash: next }, { merge: true });
}

export async function adminGrantHearts(searchName: string, amount: number): Promise<void> {
  await requireAdmin();
  const key = nameToSearchKey(searchName);
  const nameSnap = await getDoc(doc(getFirebaseDb(), 'loginNames', key));
  if (!nameSnap.exists()) throw new Error('Player not found.');
  const uid = String(nameSnap.data().uid ?? '');

  const userRef = doc(getFirebaseDb(), 'users', uid);
  const userSnap = await getDoc(userRef);
  const current = Number(userSnap.data()?.bonusHeartsNextRun ?? 0);
  await updateDoc(userRef, { bonusHeartsNextRun: current + amount });
}
