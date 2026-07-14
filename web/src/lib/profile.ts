import type { AvatarConfig } from '../data/lpc-catalog';
import { DEFAULT_AVATAR_CONFIG, normalizeAvatarConfig } from '../data/lpc-catalog';
import { safeStorageSet } from './storage';

export type { AvatarConfig };

export interface PlayerProfile {
  /** Stable id for multiplayer / Firebase sync */
  playerId: string;
  name: string;
  avatarConfig: AvatarConfig;
  createdAt: string;
  /** Legacy emoji avatar id from early prototype builds */
  avatarId?: string;
}

const PROFILE_KEY = 'chronopin-profile';

function createPlayerId(): string {
  return `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function migrateProfile(raw: Record<string, unknown>): PlayerProfile {
  const name = typeof raw.name === 'string' ? raw.name : 'Explorer';
  const createdAt =
    typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
  const avatarConfig = normalizeAvatarConfig(
    (raw.avatarConfig as Partial<AvatarConfig> | undefined) ?? null,
  );
  const avatarId = typeof raw.avatarId === 'string' ? raw.avatarId : undefined;
  const playerId =
    typeof raw.playerId === 'string' && raw.playerId.trim()
      ? raw.playerId
      : createPlayerId();
  return { playerId, name, avatarConfig, createdAt, avatarId };
}

export function getProfile(): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return migrateProfile(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function persistProfile(profile: PlayerProfile): PlayerProfile {
  safeStorageSet(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function hasProfile(): boolean {
  return getProfile() !== null;
}

export function saveProfile(name: string, avatarConfig: AvatarConfig, playerId?: string): PlayerProfile {
  const trimmed = name.trim().slice(0, 20);
  const profile: PlayerProfile = {
    playerId: playerId ?? createPlayerId(),
    name: trimmed || 'Explorer',
    avatarConfig: normalizeAvatarConfig(avatarConfig),
    createdAt: new Date().toISOString(),
  };
  return persistProfile(profile);
}

export function updateProfile(name: string, avatarConfig: AvatarConfig, playerId?: string): PlayerProfile {
  const existing = getProfile();
  const profile: PlayerProfile = {
    playerId: playerId ?? existing?.playerId ?? createPlayerId(),
    name: name.trim().slice(0, 20) || 'Explorer',
    avatarConfig: normalizeAvatarConfig(avatarConfig),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  return persistProfile(profile);
}

export function getPlayerId(): string {
  const profile = getProfile();
  if (profile?.playerId) return profile.playerId;
  if (profile) {
    const updated = updateProfile(profile.name, profile.avatarConfig);
    return updated.playerId;
  }
  return createPlayerId();
}

export function getDefaultAvatarConfig(): AvatarConfig {
  return { ...DEFAULT_AVATAR_CONFIG };
}
