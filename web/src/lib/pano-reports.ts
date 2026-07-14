import { isAdminPlayer } from './admin';
import {
  fetchPanoramaReportsFromFirestore,
  resolvePanoramaReportInFirestore,
  submitPanoramaReportToFirestore,
} from './firebase-pano-reports';
import { isFirebaseConfigured } from './firebase';
import { waitForFirebaseUid } from './firebase-auth';
import { getPanoramaById, isPanoramaTrashed, trashPanorama } from './library';
import { getProfile } from './profile';
import { safeStorageSet } from './storage';
import type { PanoramaAsset } from '../types';

export type PanoramaReportStatus = 'pending' | 'dismissed' | 'trashed';

export interface PanoramaReportRecord {
  panoId: string;
  status: PanoramaReportStatus;
  reportCount: number;
  updatedAt: number;
  lastReporterUid: string;
  lastReporterName: string;
  reviewedAt?: number;
  reviewedByUid?: string;
  reviewedByName?: string;
}

const REPORTS_KEY = 'chronopin-pano-reports';
const USER_REPORTS_KEY = 'chronopin-pano-reports-sent';

let cloudReportsSynced = false;

function readReports(): Record<string, PanoramaReportRecord> {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PanoramaReportRecord>;
  } catch {
    return {};
  }
}

function writeReports(map: Record<string, PanoramaReportRecord>): void {
  safeStorageSet(REPORTS_KEY, JSON.stringify(map));
}

function readUserSentReports(): Set<string> {
  try {
    const raw = localStorage.getItem(USER_REPORTS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function markUserSentReport(panoId: string): void {
  const ids = readUserSentReports();
  ids.add(panoId);
  safeStorageSet(USER_REPORTS_KEY, JSON.stringify([...ids]));
}

export function hasUserReportedPanorama(panoId: string): boolean {
  return readUserSentReports().has(panoId);
}

export function getPanoramaReport(panoId: string): PanoramaReportRecord | null {
  return readReports()[panoId] ?? null;
}

export function getPendingPanoramaReports(): PanoramaReportRecord[] {
  return Object.values(readReports())
    .filter((r) => r.status === 'pending')
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getPendingReportCount(): number {
  return getPendingPanoramaReports().length;
}

export function getPanoramasPendingReview(): PanoramaAsset[] {
  return getPendingPanoramaReports()
    .map((r) => getPanoramaById(r.panoId))
    .filter((p): p is PanoramaAsset => p != null && !isPanoramaTrashed(p.id));
}

export function isPanoramaReportsCloudEnabled(): boolean {
  return isFirebaseConfigured() && cloudReportsSynced;
}

export async function reportPanorama(panoId: string): Promise<void> {
  if (hasUserReportedPanorama(panoId)) return;

  const profile = getProfile();
  const now = Date.now();
  const map = readReports();
  const prev = map[panoId];
  const reportCount = (prev?.reportCount ?? 0) + 1;

  map[panoId] = {
    panoId,
    status: 'pending',
    reportCount,
    updatedAt: now,
    lastReporterUid: '',
    lastReporterName: profile?.name ?? 'Player',
  };
  writeReports(map);
  markUserSentReport(panoId);

  try {
    const uid = await waitForFirebaseUid();
    if (uid) {
      await submitPanoramaReportToFirestore(panoId, uid, profile?.name ?? 'Player');
    }
  } catch (err) {
    console.warn('[ChronoPin] Panorama report push failed:', err);
  }
}

export async function keepReportedPanorama(panoId: string): Promise<void> {
  if (!isAdminPlayer()) return;

  const profile = getProfile();
  const map = readReports();
  const prev = map[panoId];
  if (!prev) return;

  const now = Date.now();
  map[panoId] = {
    ...prev,
    status: 'dismissed',
    updatedAt: now,
    reviewedAt: now,
    reviewedByUid: '',
    reviewedByName: profile?.name ?? 'Admin',
  };
  writeReports(map);

  try {
    const uid = await waitForFirebaseUid();
    if (uid) {
      await resolvePanoramaReportInFirestore(
        panoId,
        'dismissed',
        uid,
        profile?.name ?? 'Admin',
      );
    }
  } catch (err) {
    console.warn('[ChronoPin] Panorama report keep failed:', err);
  }
}

export async function trashReportedPanorama(panoId: string): Promise<void> {
  if (!isAdminPlayer()) return;

  trashPanorama(panoId);

  const profile = getProfile();
  const map = readReports();
  const prev = map[panoId];
  const now = Date.now();

  map[panoId] = {
    panoId,
    status: 'trashed',
    reportCount: prev?.reportCount ?? 1,
    updatedAt: now,
    lastReporterUid: prev?.lastReporterUid ?? '',
    lastReporterName: prev?.lastReporterName ?? 'Player',
    reviewedAt: now,
    reviewedByUid: '',
    reviewedByName: profile?.name ?? 'Admin',
  };
  writeReports(map);

  try {
    const uid = await waitForFirebaseUid();
    if (uid) {
      await resolvePanoramaReportInFirestore(panoId, 'trashed', uid, profile?.name ?? 'Admin');
    }
  } catch (err) {
    console.warn('[ChronoPin] Panorama report trash failed:', err);
  }
}

/** Admin: merge Firestore reports into local cache. */
export async function syncPanoramaReportsFromCloud(): Promise<boolean> {
  if (!isFirebaseConfigured() || !isAdminPlayer()) {
    cloudReportsSynced = false;
    return false;
  }

  try {
    const remote = await fetchPanoramaReportsFromFirestore();
    const local = readReports();
    const merged: Record<string, PanoramaReportRecord> = { ...local };
    let changed = false;

    for (const [id, remoteEntry] of Object.entries(remote)) {
      const localEntry = local[id];
      if (!localEntry || remoteEntry.updatedAt >= localEntry.updatedAt) {
        if (JSON.stringify(localEntry) !== JSON.stringify(remoteEntry)) changed = true;
        merged[id] = remoteEntry;
      }
    }

    const before = JSON.stringify(local);
    writeReports(merged);
    cloudReportsSynced = true;
    return changed || before !== JSON.stringify(merged);
  } catch (err) {
    console.warn('[ChronoPin] Panorama reports cloud sync failed:', err);
    return false;
  }
}

export function formatReportMeta(report: PanoramaReportRecord): string {
  const count =
    report.reportCount === 1 ? '1 Meldung' : `${report.reportCount} Meldungen`;
  return `${count} · zuletzt von ${report.lastReporterName}`;
}
