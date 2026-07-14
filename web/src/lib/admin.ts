import { getProfile } from './profile';

const ADMIN_NAMES = new Set(['admin', 'dary', 'daryoush']);

export function isAdminName(name: string): boolean {
  return ADMIN_NAMES.has(name.trim().toLowerCase());
}

export function isAdminPlayer(): boolean {
  const profile = getProfile();
  if (!profile) return false;
  return isAdminName(profile.name);
}
