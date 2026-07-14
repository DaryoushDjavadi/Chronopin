import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import type { MatchChatMessage } from '../data/match-chat';
import { appendMatchMessage } from '../data/match-chat';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';

function messagesCol(roomId: string) {
  return collection(getFirebaseDb(), 'coopRooms', roomId, 'messages');
}

export async function pullCoopMatchChat(roomId: string): Promise<MatchChatMessage[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(query(messagesCol(roomId), orderBy('at', 'asc')));
  const messages = snap.docs.map((d) => ({ ...(d.data() as MatchChatMessage), id: d.id }));
  messages.forEach((m) => appendMatchMessage(m));
  return messages;
}

export async function pushCoopMatchChat(roomId: string, message: MatchChatMessage): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await setDoc(doc(getFirebaseDb(), 'coopRooms', roomId, 'messages', message.id), message);
}

export function subscribeCoopMatchChat(
  roomId: string,
  onMessage: (message: MatchChatMessage) => void,
): Unsubscribe | null {
  if (!isFirebaseConfigured()) return null;

  let primed = false;

  return onSnapshot(
    query(messagesCol(roomId), orderBy('at', 'asc')),
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const msg = { ...(change.doc.data() as MatchChatMessage), id: change.doc.id };
        appendMatchMessage(msg);
        if (primed) onMessage(msg);
      });
      primed = true;
    },
    (err) => console.warn('[ChronoPin] match chat listener:', err),
  );
}
