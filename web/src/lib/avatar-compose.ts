import {
  type AvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  HAIR_COLORS,
  HAIR_STYLES,
  HEADWEAR,
  isHexColor,
  PANTS,
  SHOES,
  SKIN_TONES,
  TOPS,
  genderFile,
  getLpcBodyFiles,
  lpcAsset,
  normalizeAvatarConfig,
} from '../data/lpc-catalog';

const FRAME = 64;
const SOUTH_ROW = 2;
const DISPLAY = 64;

const SIZE_MAP: Record<string, number> = {
  'avatar-sm': 32,
  'avatar-lg': 40,
  'avatar-game': 36,
  'avatar-opt-thumb': 40,
  'avatar-acc-thumb': 28,
  'avatar-xl': 96,
  'avatar-xxl': 128,
  'avatar-preview': 128,
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const composeCache = new Map<string, Promise<string>>();

function configKey(config: AvatarConfig): string {
  return JSON.stringify(normalizeAvatarConfig(config));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  let pending = imageCache.get(src);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });
    imageCache.set(src, pending);
  }
  return pending;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frameIndex: number,
  rowIndex: number,
  dx: number,
  dy: number,
  size: number,
  filter = 'none',
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (filter !== 'none') ctx.filter = filter;
  ctx.drawImage(
    img,
    frameIndex * FRAME,
    rowIndex * FRAME,
    FRAME,
    FRAME,
    dx,
    dy,
    size,
    size,
  );
  ctx.restore();
}

function tintLayer(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  color: string,
  frameIndex: number,
): void {
  const off = document.createElement('canvas');
  off.width = FRAME;
  off.height = FRAME;
  const offCtx = off.getContext('2d')!;
  offCtx.imageSmoothingEnabled = false;
  drawFrame(offCtx, img, frameIndex, SOUTH_ROW, 0, 0, FRAME);
  offCtx.globalCompositeOperation = 'multiply';
  offCtx.fillStyle = color;
  offCtx.fillRect(0, 0, FRAME, FRAME);
  offCtx.globalCompositeOperation = 'destination-in';
  drawFrame(offCtx, img, frameIndex, SOUTH_ROW, 0, 0, FRAME);
  ctx.drawImage(off, 0, 0, FRAME, FRAME);
}

export function resolveAvatarCanvasSize(canvas: HTMLCanvasElement): number {
  const sizeClass = [...canvas.classList].find((c) => c.startsWith('avatar-'));
  return sizeClass ? (SIZE_MAP[sizeClass] ?? DISPLAY) : DISPLAY;
}

async function composeToCanvas(
  config: AvatarConfig,
  size = DISPLAY,
  frameIndex = 0,
): Promise<HTMLCanvasElement> {
  const cfg = normalizeAvatarConfig(config);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const skin = SKIN_TONES.find((s) => s.id === cfg.skin);
  const skinFilter = skin?.filter ?? 'none';

  const lpcBody = getLpcBodyFiles(cfg.body);
  const body = await loadImage(lpcBody.body);
  drawFrame(ctx, body, frameIndex, SOUTH_ROW, 0, 0, size, skinFilter);

  const pants = PANTS.find((p) => p.id === cfg.pants);
  if (pants) {
    const legs = await loadImage(lpcAsset(genderFile(pants.file, cfg.body)));
    tintLayer(ctx, legs, cfg.pantsColor, frameIndex);
  }

  const shoes = SHOES.find((s) => s.id === cfg.shoes);
  if (shoes) {
    const feet = await loadImage(lpcAsset(genderFile(shoes.file, cfg.body)));
    tintLayer(ctx, feet, cfg.shoesColor, frameIndex);
  }

  const top = TOPS.find((t) => t.id === cfg.top);
  if (top) {
    const torso = await loadImage(lpcAsset(genderFile(top.file, cfg.body)));
    tintLayer(ctx, torso, cfg.topColor, frameIndex);
  }

  const head = await loadImage(lpcBody.head);
  drawFrame(ctx, head, frameIndex, SOUTH_ROW, 0, 0, size, skinFilter);

  const headwear = HEADWEAR.find((h) => h.id === cfg.headwear);
  const showHair = cfg.hair !== 'none' && (cfg.headwear === 'none' || cfg.headwear === 'hood');
  if (showHair) {
    const hairStyle = HAIR_STYLES.find((h) => h.id === cfg.hair);
    if (hairStyle?.file) {
      const hair = await loadImage(lpcAsset(hairStyle.file));
      if (isHexColor(cfg.hairColor)) {
        tintLayer(ctx, hair, cfg.hairColor, frameIndex);
      } else {
        const hairColor = HAIR_COLORS.find((c) => c.id === cfg.hairColor);
        drawFrame(ctx, hair, frameIndex, SOUTH_ROW, 0, 0, size, hairColor?.filter ?? 'none');
      }
    }
  }

  if (headwear?.file) {
    const hat = await loadImage(lpcAsset(headwear.file));
    drawFrame(ctx, hat, frameIndex, SOUTH_ROW, 0, 0, size);
  }

  return canvas;
}

export async function composeAvatarDataUrl(config: AvatarConfig, size = DISPLAY): Promise<string> {
  const key = `${configKey(config)}@${size}`;
  let pending = composeCache.get(key);
  if (!pending) {
    pending = composeToCanvas(config, size).then((c) => c.toDataURL('image/png'));
    composeCache.set(key, pending);
  }
  return pending;
}

export async function drawAvatarToCanvas(
  target: HTMLCanvasElement,
  config: AvatarConfig,
  size?: number,
): Promise<void> {
  await drawAvatarFrameToCanvas(target, config, 0, size);
}

export async function drawAvatarFrameToCanvas(
  target: HTMLCanvasElement,
  config: AvatarConfig,
  frameIndex: number,
  size?: number,
): Promise<void> {
  const px = size ?? resolveAvatarCanvasSize(target) ?? (target.clientWidth || DISPLAY);
  target.width = px;
  target.height = px;
  const src = await composeToCanvas(config, px, frameIndex);
  const ctx = target.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, px, px);
  ctx.drawImage(src, 0, 0);
}

export function parseAvatarConfigAttr(raw: string | null | undefined): AvatarConfig {
  if (!raw) return { ...DEFAULT_AVATAR_CONFIG };
  try {
    return normalizeAvatarConfig(JSON.parse(decodeURIComponent(raw)) as Partial<AvatarConfig>);
  } catch {
    return { ...DEFAULT_AVATAR_CONFIG };
  }
}

export function encodeAvatarConfigAttr(config: AvatarConfig): string {
  return encodeURIComponent(JSON.stringify(normalizeAvatarConfig(config)));
}
