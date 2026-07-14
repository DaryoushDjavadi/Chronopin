import { safeStorageSet } from '../lib/storage';
import { pushCoopMatchChat } from '../lib/firebase-match-chat';

export interface MatchChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  at: number;
}

const STORAGE_KEY = 'chronopin-match-chat';

function loadAll(): MatchChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as MatchChatMessage[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveAll(messages: MatchChatMessage[]): void {
  safeStorageSet(STORAGE_KEY, JSON.stringify(messages));
}

export function getMatchMessages(roomId: string): MatchChatMessage[] {
  return loadAll()
    .filter((m) => m.roomId === roomId)
    .sort((a, b) => a.at - b.at);
}

export function appendMatchMessage(message: MatchChatMessage): void {
  const all = loadAll();
  if (all.some((m) => m.id === message.id)) return;
  all.push(message);
  saveAll(all);
}

export function createMatchChatMessage(
  roomId: string,
  senderId: string,
  senderName: string,
  text: string,
): MatchChatMessage | null {
  const trimmed = text.trim().slice(0, 280);
  if (!trimmed) return null;
  return {
    id: `mchat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    roomId,
    senderId,
    senderName,
    text: trimmed,
    at: Date.now(),
  };
}

export function sendMatchChatMessage(
  roomId: string,
  senderId: string,
  senderName: string,
  text: string,
): MatchChatMessage | null {
  const msg = createMatchChatMessage(roomId, senderId, senderName, text);
  if (!msg) return null;
  appendMatchMessage(msg);
  void pushCoopMatchChat(roomId, msg).catch((err) =>
    console.warn('[ChronoPin] Match chat sync failed:', err),
  );
  return msg;
}

export function formatMatchChatTime(at: number): string {
  return new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
