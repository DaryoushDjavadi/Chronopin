import type { AvatarConfig } from '../data/lpc-catalog';
import { resolveAvatarConfig } from '../data/avatars';
import { hydrateAvatarCanvases } from './avatar-animate';
import { encodeAvatarConfigAttr } from './avatar-compose';

export type MapPinVariant = 'guess' | 'host' | 'guest' | 'team' | 'answer';
export type MapPinBehavior = 'orbit-walk' | 'idle-near' | 'sit';

export interface MapPinMarkerOptions {
  avatarConfig?: AvatarConfig | null;
  pinVariant?: MapPinVariant;
  behavior?: MapPinBehavior;
  label?: string;
}

export function createMapPinMarker(options: MapPinMarkerOptions): HTMLElement {
  const pinVariant = options.pinVariant ?? 'guess';
  const behavior =
    options.behavior ?? (pinVariant === 'answer' ? 'idle-near' : 'orbit-walk');
  const config = resolveAvatarConfig(options.avatarConfig);
  const encoded = encodeAvatarConfigAttr(config);
  const animClass = behavior === 'orbit-walk' ? 'avatar-walk' : 'avatar-idle';

  const root = document.createElement('div');
  root.className = `map-marker map-marker-${pinVariant} map-marker-behavior-${behavior}`;
  root.setAttribute('role', 'img');
  root.setAttribute(
    'aria-label',
    options.label ? `${options.label} pin` : 'Map pin',
  );

  const pin = document.createElement('div');
  pin.className = 'map-marker-pin';
  pin.setAttribute('aria-hidden', 'true');
  root.appendChild(pin);

  if (pinVariant !== 'answer') {
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'map-marker-avatar';
    const canvas = document.createElement('canvas');
    canvas.className = `avatar-canvas avatar avatar-map ${animClass}`;
    canvas.dataset.avatarConfig = encoded;
    canvas.width = 48;
    canvas.height = 48;
    canvas.setAttribute('aria-hidden', 'true');
    avatarWrap.appendChild(canvas);
    root.appendChild(avatarWrap);
  } else if (options.label) {
    const badge = document.createElement('span');
    badge.className = 'map-marker-answer-badge';
    badge.textContent = options.label;
    root.appendChild(badge);
  }

  if (options.label && pinVariant !== 'answer') {
    const label = document.createElement('span');
    label.className = 'map-marker-label';
    label.textContent = options.label;
    root.appendChild(label);
  }

  return root;
}

export function mountMapPinMarker(root: HTMLElement): void {
  void hydrateAvatarCanvases(root);
}
