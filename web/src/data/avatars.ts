import {
  type AvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  normalizeAvatarConfig,
} from './lpc-catalog';
import { encodeAvatarConfigAttr } from '../lib/avatar-compose';

export type { AvatarConfig };

export function resolveAvatarConfig(source: AvatarConfig | string | null | undefined): AvatarConfig {
  if (!source || typeof source === 'string') {
    return { ...DEFAULT_AVATAR_CONFIG };
  }
  return normalizeAvatarConfig(source);
}

export function renderAvatar(
  configOrLegacy: AvatarConfig | string | null | undefined,
  className = 'avatar',
): string {
  const config = resolveAvatarConfig(
    typeof configOrLegacy === 'object' ? configOrLegacy : null,
  );
  const encoded = encodeAvatarConfigAttr(config);
  return `<canvas class="avatar-canvas ${className}" data-avatar-config="${encoded}" width="64" height="64" aria-hidden="true"></canvas>`;
}

export function renderAvatarFromProfile(profile: {
  avatarConfig?: AvatarConfig;
  avatarId?: string;
}): string {
  const config = profile.avatarConfig
    ? normalizeAvatarConfig(profile.avatarConfig)
    : DEFAULT_AVATAR_CONFIG;
  return renderAvatar(config);
}
