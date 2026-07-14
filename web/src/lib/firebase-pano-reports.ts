import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import { waitForFirebaseUid } from './firebase-auth';
import { isAdminPlayer } from './admin';
import type { PanoramaReportRecord, PanoramaReportStatus } from './pano-reports';

export async function fetchPanoramaReportsFromFirestore(): Promise<
  Record<string, PanoramaReportRecord>
> {
  if (!isFirebaseConfigured() || !isAdminPlayer()) return {};
  const uid = await waitForFirebaseUid();
  if (!uid) return {};

  const snap = await getDocs(collection(getFirebaseDb(), 'panoramaReports'));
  const out: Record<string, PanoramaReportRecord> = {};
  for (const d of snap.docs) {
    const data = d.data();
    const status = data.status as PanoramaReportStatus;
    if (status !== 'pending' && status !== 'dismissed' && status !== 'trashed') continue;
    out[d.id] = {
      panoId: d.id,
      status,
      reportCount: Number(data.reportCount ?? 1),
      updatedAt: Number(data.updatedAt ?? 0),
      lastReporterUid: String(data.lastReporterUid ?? ''),
      lastReporterName: String(data.lastReporterName ?? 'Player'),
      reviewedAt: data.reviewedAt != null ? Number(data.reviewedAt) : undefined,
      reviewedByUid: data.reviewedByUid != null ? String(data.reviewedByUid) : undefined,
      reviewedByName: data.reviewedByName != null ? String(data.reviewedByName) : undefined,
    };
  }
  return out;
}

export async function submitPanoramaReportToFirestore(
  panoId: string,
  reporterUid: string,
  reporterName: string,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const uid = await waitForFirebaseUid();
  if (!uid) return;

  const ref = doc(getFirebaseDb(), 'panoramaReports', panoId);
  const snap = await getDoc(ref);
  const now = Date.now();
  const prev = snap.exists() ? snap.data() : null;
  const reportCount = (Number(prev?.reportCount ?? 0) || 0) + 1;

  const payload: PanoramaReportRecord = {
    panoId,
    status: 'pending',
    reportCount,
    updatedAt: now,
    lastReporterUid: reporterUid,
    lastReporterName: reporterName,
  };
  await setDoc(ref, payload);
}

export async function resolvePanoramaReportInFirestore(
  panoId: string,
  resolution: 'dismissed' | 'trashed',
  reviewerUid: string,
  reviewerName: string,
): Promise<void> {
  if (!isFirebaseConfigured() || !isAdminPlayer()) return;
  const uid = await waitForFirebaseUid();
  if (!uid) return;

  const ref = doc(getFirebaseDb(), 'panoramaReports', panoId);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? snap.data() : null;
  const now = Date.now();

  await setDoc(ref, {
    panoId,
    status: resolution,
    reportCount: Number(prev?.reportCount ?? 1),
    updatedAt: now,
    lastReporterUid: String(prev?.lastReporterUid ?? reviewerUid),
    lastReporterName: String(prev?.lastReporterName ?? 'Player'),
    reviewedAt: now,
    reviewedByUid: reviewerUid,
    reviewedByName: reviewerName,
  });
}
