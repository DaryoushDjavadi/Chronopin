import type { AvatarConfig } from '../data/lpc-catalog';
import {
  drawAvatarToCanvas,
  drawAvatarFrameToCanvas,
  parseAvatarConfigAttr,
  resolveAvatarCanvasSize,
} from './avatar-compose';

export type AvatarAnimMode = 'idle' | 'walk';

const IDLE_SEQUENCE = [0, 1, 2, 1] as const;
const WALK_SEQUENCE = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
const FRAME_MS: Record<AvatarAnimMode, number> = { idle: 420, walk: 110 };

interface RunningAnim {
  cancel: () => void;
}

const running = new WeakMap<HTMLCanvasElement, RunningAnim>();

export function resolveAnimMode(canvas: HTMLCanvasElement): AvatarAnimMode | null {
  if (canvas.classList.contains('avatar-walk')) return 'walk';
  if (canvas.classList.contains('avatar-idle')) return 'idle';
  return null;
}

export function stopAvatarAnimation(canvas: HTMLCanvasElement): void {
  running.get(canvas)?.cancel();
  running.delete(canvas);
}

export function stopAvatarAnimations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-avatar-config]').forEach(stopAvatarAnimation);
}

export function startAvatarAnimation(
  canvas: HTMLCanvasElement,
  config: AvatarConfig,
  mode: AvatarAnimMode,
  size?: number,
): void {
  stopAvatarAnimation(canvas);

  const px = size ?? resolveAvatarCanvasSize(canvas);
  const sequence = mode === 'idle' ? IDLE_SEQUENCE : WALK_SEQUENCE;
  let seqIdx = 0;
  let lastTick = 0;
  let rafId = 0;
  let alive = true;

  const tick = (now: number) => {
    if (!alive) return;
    if (!lastTick || now - lastTick >= FRAME_MS[mode]) {
      lastTick = now;
      const frame = sequence[seqIdx]!;
      seqIdx = (seqIdx + 1) % sequence.length;
      const currentConfig = parseAvatarConfigAttr(canvas.dataset.avatarConfig) ?? config;
      void drawAvatarFrameToCanvas(canvas, currentConfig, frame, px);
    }
    rafId = requestAnimationFrame(tick);
  };

  const cancel = () => {
    alive = false;
    cancelAnimationFrame(rafId);
  };

  running.set(canvas, { cancel });
  rafId = requestAnimationFrame(tick);
}

export async function hydrateAvatarCanvases(root: ParentNode = document): Promise<void> {
  stopAvatarAnimations(root);

  const nodes = root.querySelectorAll<HTMLCanvasElement>('canvas[data-avatar-config]');
  await Promise.all(
    [...nodes].map(async (canvas) => {
      const config = parseAvatarConfigAttr(canvas.dataset.avatarConfig);
      const size = resolveAvatarCanvasSize(canvas);
      const mode = resolveAnimMode(canvas);
      if (mode) {
        startAvatarAnimation(canvas, config, mode, size);
        return;
      }
      await drawAvatarToCanvas(canvas, config, size);
    }),
  );
}
