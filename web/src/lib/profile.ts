import type { AvatarConfig } from '../data/lpc-catalog';
import { DEFAULT_AVATAR_CONFIG, normalizeAvatarConfig } from '../data/lpc-catalog';

export type { AvatarConfig };

export interface PlayerProfile {
  name: string;
  avatarConfig: AvatarConfig;
  createdAt: string;
  /** Legacy emoji avatar id from early prototype builds */
  avatarId?: string;
}

const PROFILE_KEY = 'chronopin-profile';

function migrateProfile(raw: Record<string, unknown>): PlayerProfile {
  const name = typeof raw.name === 'string' ? raw.name : 'Explorer';
  const createdAt =
    typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
  const avatarConfig = normalizeAvatarConfig(
    (raw.avatarConfig as Partial<AvatarConfig> | undefined) ?? null,
  );
  const avatarId = typeof raw.avatarId === 'string' ? raw.avatarId : undefined;
  return { name, avatarConfig, createdAt, avatarId };
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

export function hasProfile(): boolean {
  return getProfile() !== null;
}

export function saveProfile(name: string, avatarConfig: AvatarConfig): PlayerProfile {
  const trimmed = name.trim().slice(0, 20);
  const profile: PlayerProfile = {
    name: trimmed || 'Explorer',
    avatarConfig: normalizeAvatarConfig(avatarConfig),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function updateProfile(name: string, avatarConfig: AvatarConfig): PlayerProfile {
  const existing = getProfile();
  const profile: PlayerProfile = {
    name: name.trim().slice(0, 20) || 'Explorer',
    avatarConfig: normalizeAvatarConfig(avatarConfig),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function getDefaultAvatarConfig(): AvatarConfig {
  return { ...DEFAULT_AVATAR_CONFIG };
}
