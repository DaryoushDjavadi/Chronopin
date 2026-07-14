import type { FriendRequest } from '../data/social';
import {
  registerCloudFriend,
  setCloudFriendIds,
  setCloudIncomingRequests,
  setCloudIncomingCoopInvites,
} from '../data/social';
import { isFirebaseConfigured } from './firebase';
import { waitForFirebaseUid } from './firebase-auth';
import { subscribeIncomingCoopInvites } from './firebase-coop';
import {
  getFirestoreFriends,
  getIncomingFirestoreRequests,
  type FirestoreFriendRequest,
} from './firebase-friends';
import type { Unsubscribe } from 'firebase/firestore';

let coopInviteUnsub: Unsubscribe | null = null;

function mapFirestoreRequest(req: FirestoreFriendRequest): FriendRequest {
  return {
    id: req.id,
    fromPlayerId: req.fromUid,
    toUserId: req.toUid,
    name: req.fromName,
    avatarConfig: req.avatarConfig,
    sentAt: req.sentAt,
    direction: 'incoming',
  };
}

export async function syncSocialFromCloud(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const uid = await waitForFirebaseUid();
  if (!uid) return;

  const [friends, incoming] = await Promise.all([
    getFirestoreFriends(uid),
    getIncomingFirestoreRequests(uid),
  ]);

  friends.forEach((f) => registerCloudFriend(f));
  setCloudFriendIds(friends.map((f) => f.id));
  setCloudIncomingRequests(incoming.map(mapFirestoreRequest));
}

export function startCloudCoopInviteListener(onChange?: () => void): void {
  if (!isFirebaseConfigured()) return;
  void waitForFirebaseUid().then((uid) => {
    if (!uid) return;
    coopInviteUnsub?.();
    coopInviteUnsub = subscribeIncomingCoopInvites(uid, (invites) => {
      setCloudIncomingCoopInvites(invites);
      onChange?.();
    });
  });
}

export function stopCloudCoopInviteListener(): void {
  coopInviteUnsub?.();
  coopInviteUnsub = null;
}
