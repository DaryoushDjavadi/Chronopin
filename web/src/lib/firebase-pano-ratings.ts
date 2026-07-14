import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import { waitForFirebaseUid } from './firebase-auth';
import { getProfile } from './profile';

type PanoramaDifficulty = 1 | 2 | 3;

export interface FirestorePanoramaRating {
  rating: PanoramaDifficulty;
  updatedAt: number;
  updatedBy: string;
  updatedByName: string;
}

export async function fetchPanoramaRatingsFromFirestore(): Promise<
  Record<string, FirestorePanoramaRating>
> {
  if (!isFirebaseConfigured()) return {};
  const uid = await waitForFirebaseUid();
  if (!uid) return {};

  const snap = await getDocs(collection(getFirebaseDb(), 'panoramaRatings'));
  const out: Record<string, FirestorePanoramaRating> = {};
  for (const d of snap.docs) {
    const data = d.data();
    const rating = Number(data.rating);
    if (rating !== 1 && rating !== 2 && rating !== 3) continue;
    out[d.id] = {
      rating: rating as PanoramaDifficulty,
      updatedAt: Number(data.updatedAt ?? 0),
      updatedBy: String(data.updatedBy ?? ''),
      updatedByName: String(data.updatedByName ?? ''),
    };
  }
  return out;
}

export async function pushPanoramaRatingToFirestore(
  panoId: string,
  rating: PanoramaDifficulty,
  updatedAt: number,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const uid = await waitForFirebaseUid();
  if (!uid) return;

  const profile = getProfile();
  const payload: FirestorePanoramaRating = {
    rating,
    updatedAt,
    updatedBy: uid,
    updatedByName: profile?.name ?? 'Player',
  };
  await setDoc(doc(getFirebaseDb(), 'panoramaRatings', panoId), payload);
}

export async function removePanoramaRatingFromFirestore(panoId: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const uid = await waitForFirebaseUid();
  if (!uid) return;
  await deleteDoc(doc(getFirebaseDb(), 'panoramaRatings', panoId));
}
