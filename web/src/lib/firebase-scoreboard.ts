import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import type { AvatarConfig } from '../data/lpc-catalog';
import { normalizeAvatarConfig } from '../data/lpc-catalog';
import type { GameMode } from '../types';
import type { ScoreboardEntry } from './scoreboard';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import { waitForFirebaseUid } from './firebase-auth';

export interface FirestoreScoreboardDoc {
  playerId: string;
  playerName: string;
  searchName: string;
  avatarConfig: AvatarConfig;
  mode: GameMode;
  score: number;
  rounds: number;
  date: string;
  updatedAt: number;
}

function scoreDocId(searchName: string, mode: GameMode): string {
  return `${searchName}_${mode}`;
}

function mapDoc(id: string, data: FirestoreScoreboardDoc): ScoreboardEntry {
  return {
    id,
    playerId: data.playerId,
    playerName: data.playerName,
    searchName: data.searchName,
    avatarConfig: normalizeAvatarConfig(data.avatarConfig),
    mode: data.mode,
    score: data.score,
    rounds: data.rounds,
    date: data.date,
  };
}

export async function pushBestScoreToFirestore(entry: ScoreboardEntry): Promise<void> {
  if (!isFirebaseConfigured() || !entry.searchName) return;
  const uid = await waitForFirebaseUid();
  if (!uid) return;

  const ref = doc(getFirebaseDb(), 'scoreboard', scoreDocId(entry.searchName, entry.mode));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const existing = snap.data() as FirestoreScoreboardDoc;
    if (existing.score > entry.score) return;
    if (existing.score === entry.score && existing.rounds >= entry.rounds) return;
  }

  const payload: FirestoreScoreboardDoc = {
    playerId: uid,
    playerName: entry.playerName,
    searchName: entry.searchName,
    avatarConfig: entry.avatarConfig,
    mode: entry.mode,
    score: entry.score,
    rounds: entry.rounds,
    date: entry.date,
    updatedAt: Date.now(),
  };
  await setDoc(ref, payload);
}

export async function fetchScoreboardFromFirestore(
  filterMode?: GameMode | 'all',
): Promise<ScoreboardEntry[]> {
  if (!isFirebaseConfigured()) return [];
  const uid = await waitForFirebaseUid();
  if (!uid) return [];

  const db = getFirebaseDb();
  const snap =
    filterMode && filterMode !== 'all'
      ? await getDocs(
          query(
            collection(db, 'scoreboard'),
            where('mode', '==', filterMode),
            orderBy('score', 'desc'),
            limit(100),
          ),
        )
      : await getDocs(
          query(collection(db, 'scoreboard'), orderBy('score', 'desc'), limit(200)),
        );

  return snap.docs.map((d) => mapDoc(d.id, d.data() as FirestoreScoreboardDoc));
}
