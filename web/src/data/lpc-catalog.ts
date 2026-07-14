/** Universal LPC sprites bundled under /avatar/lpc — CC-BY-SA / OGA-BY (see LICENSE.md). */

export type BodyType = 'male' | 'female';

export interface AvatarConfig {
  body: BodyType;
  skin: string;
  hair: string;
  hairColor: string;
  headwear: string;
  top: string;
  topColor: string;
  pants: string;
  pantsColor: string;
  shoes: string;
  shoesColor: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  body: 'male',
  skin: 'light',
  hair: 'bob',
  hairColor: 'brown',
  headwear: 'none',
  top: 'tshirt',
  topColor: '#3d7ec9',
  pants: 'pants',
  pantsColor: '#3d7ec9',
  shoes: 'basic',
  shoesColor: '#8b6914',
};

export const BODY_TYPES = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
] as const;

export const SKIN_TONES = [
  { id: 'light', label: 'Light', filter: 'none' },
  { id: 'amber', label: 'Amber', filter: 'hue-rotate(14deg) saturate(1.08) brightness(1.03)' },
  { id: 'olive', label: 'Olive', filter: 'hue-rotate(28deg) saturate(0.95) brightness(0.96)' },
  { id: 'bronze', label: 'Bronze', filter: 'hue-rotate(-18deg) saturate(1.15) brightness(0.88)' },
  { id: 'dark', label: 'Dark', filter: 'hue-rotate(-32deg) saturate(0.85) brightness(0.68)' },
  { id: 'black', label: 'Black', filter: 'hue-rotate(-25deg) saturate(0.65) brightness(0.42)' },
] as const;

export const HAIR_STYLES = [
  { id: 'none', label: 'Bald', file: null },
  { id: 'bob', label: 'Bob', file: 'hair_bob_adult_walk.png' },
  { id: 'bangs', label: 'Bangs', file: 'hair_bangs_adult_walk.png' },
  { id: 'bedhead', label: 'Bedhead', file: 'hair_bedhead_adult_walk.png' },
  { id: 'buzzcut', label: 'Buzzcut', file: 'hair_buzzcut_adult_walk.png' },
  { id: 'messy', label: 'Messy', file: 'hair_messy2_adult_walk.png' },
] as const;

export const HEADWEAR = [
  { id: 'none', label: 'None', file: null },
  { id: 'hood', label: 'Hood', file: 'hat_cloth_hood_adult_walk.png' },
  { id: 'headband', label: 'Headband', file: 'hat_headband_thick_adult_walk.png' },
  { id: 'helmet', label: 'Helmet', file: 'hat_helmet_barbarian_adult_walk.png' },
] as const;

type GenderFiles = { male: string; female: string };

export const TOPS = [
  {
    id: 'tshirt',
    label: 'T-Shirt',
    file: {
      male: 'torso_clothes_shortsleeve_tshirt_male_walk.png',
      female: 'torso_clothes_shortsleeve_tshirt_female_walk.png',
    },
  },
  {
    id: 'vneck',
    label: 'V-Neck',
    file: {
      male: 'torso_clothes_shortsleeve_tshirt_vneck_male_walk.png',
      female: 'torso_clothes_shortsleeve_tshirt_vneck_female_walk.png',
    },
  },
  {
    id: 'longsleeve',
    label: 'Long sleeve',
    file: {
      male: 'torso_clothes_longsleeve_longsleeve_male_walk.png',
      female: 'torso_clothes_longsleeve_longsleeve_female_walk.png',
    },
  },
] as const satisfies ReadonlyArray<{ id: string; label: string; file: GenderFiles }>;

/** Legacy preset ids → hex (migration from older builds). */
export const LEGACY_TOP_COLORS: Record<string, string> = {
  blue: '#3d7ec9',
  red: '#c0392b',
  green: '#27ae60',
  purple: '#8e44ad',
  orange: '#e67e22',
  gray: '#5d6d7e',
  white: '#ecf0f1',
};

export const LEGACY_PANTS_COLORS: Record<string, string> = {
  blue: '#3d7ec9',
  teal: '#1a8a7a',
  brown: '#8b6914',
  black: '#2a2a2a',
};

export const LEGACY_SHOES_COLORS: Record<string, string> = {
  brown: '#8b6914',
  black: '#2a2a2a',
  white: '#ecf0f1',
};

export const HAIR_COLORS = [
  { id: 'black', filter: 'brightness(0.35) saturate(0.4)' },
  { id: 'brown', filter: 'none' },
  { id: 'blonde', filter: 'hue-rotate(-15deg) saturate(0.7) brightness(1.35)' },
  { id: 'red', filter: 'hue-rotate(-45deg) saturate(1.4) brightness(0.95)' },
  { id: 'gray', filter: 'saturate(0.15) brightness(1.1)' },
  { id: 'blue', filter: 'hue-rotate(180deg) saturate(1.2) brightness(0.9)' },
] as const;

export const PANTS = [
  {
    id: 'pants',
    label: 'Pants',
    file: {
      male: 'legs_pants_male_base_walk.png',
      female: 'legs_pants_female_walk.png',
    },
  },
] as const satisfies ReadonlyArray<{ id: string; label: string; file: GenderFiles }>;

export const SHOES = [
  {
    id: 'basic',
    label: 'Shoes',
    file: {
      male: 'feet_shoes_basic_male_base_walk.png',
      female: 'feet_shoes_basic_female_walk.png',
    },
  },
] as const satisfies ReadonlyArray<{ id: string; label: string; file: GenderFiles }>;

export type AvatarCategory =
  | 'body'
  | 'skin'
  | 'hair'
  | 'headwear'
  | 'top'
  | 'pants'
  | 'shoes';

export const AVATAR_CATEGORIES: Array<{ id: AvatarCategory; label: string }> = [
  { id: 'body', label: 'Body' },
  { id: 'skin', label: 'Skin' },
  { id: 'hair', label: 'Hair' },
  { id: 'headwear', label: 'Headwear' },
  { id: 'top', label: 'Top' },
  { id: 'pants', label: 'Pants' },
  { id: 'shoes', label: 'Shoes' },
];

const LPC_BASE = '/avatar/lpc';
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function lpcAsset(file: string): string {
  return `${LPC_BASE}/${file}`;
}

export function getLpcBodyFiles(body: BodyType): { body: string; head: string } {
  return {
    body: lpcAsset(
      body === 'male' ? 'body_bodies_male_walk.png' : 'body_bodies_female_walk.png',
    ),
    head: lpcAsset(
      body === 'male' ? 'head_heads_human_male_walk.png' : 'head_heads_human_female_walk.png',
    ),
  };
}

export function genderFile(files: GenderFiles, body: BodyType): string {
  return files[body];
}

export function normalizeHexColor(
  value: string | undefined,
  fallback: string,
  legacy?: Record<string, string>,
): string {
  if (value && HEX_RE.test(value)) return value.toLowerCase();
  if (value && legacy?.[value]) return legacy[value]!;
  return fallback;
}

export function normalizeAvatarConfig(raw: Partial<AvatarConfig> | null | undefined): AvatarConfig {
  const d = DEFAULT_AVATAR_CONFIG;
  if (!raw) return { ...d };

  const body: BodyType = raw.body === 'female' ? 'female' : 'male';

  let pants = raw.pants ?? d.pants;
  let pantsColor = normalizeHexColor(raw.pantsColor, d.pantsColor, LEGACY_PANTS_COLORS);
  if (PANTS.every((p) => p.id !== pants) && LEGACY_PANTS_COLORS[pants]) {
    pantsColor = LEGACY_PANTS_COLORS[pants]!;
    pants = 'pants';
  }

  let shoes = raw.shoes ?? d.shoes;
  let shoesColor = normalizeHexColor(raw.shoesColor, d.shoesColor, LEGACY_SHOES_COLORS);
  if (SHOES.every((s) => s.id !== shoes) && LEGACY_SHOES_COLORS[shoes]) {
    shoesColor = LEGACY_SHOES_COLORS[shoes]!;
    shoes = 'basic';
  }

  return {
    body,
    skin: SKIN_TONES.some((s) => s.id === raw.skin) ? raw.skin! : d.skin,
    hair: HAIR_STYLES.some((h) => h.id === raw.hair) ? raw.hair! : d.hair,
    hairColor: HAIR_COLORS.some((c) => c.id === raw.hairColor) ? raw.hairColor! : d.hairColor,
    headwear: HEADWEAR.some((h) => h.id === raw.headwear) ? raw.headwear! : d.headwear,
    top: TOPS.some((t) => t.id === raw.top) ? raw.top! : d.top,
    topColor: normalizeHexColor(raw.topColor, d.topColor, LEGACY_TOP_COLORS),
    pants: PANTS.some((p) => p.id === pants) ? pants : d.pants,
    pantsColor,
    shoes: SHOES.some((s) => s.id === shoes) ? shoes : d.shoes,
    shoesColor,
  };
}

export function randomAvatarConfig(): AvatarConfig {
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;
  const hex = (): string =>
    `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')}`;

  let cfg: AvatarConfig = {
    body: Math.random() > 0.5 ? 'male' : 'female',
    skin: pick(SKIN_TONES).id,
    hair: pick(HAIR_STYLES).id,
    hairColor: pick(HAIR_COLORS).id,
    headwear: pick(HEADWEAR).id,
    top: pick(TOPS).id,
    topColor: hex(),
    pants: 'pants',
    pantsColor: hex(),
    shoes: 'basic',
    shoesColor: hex(),
  };

  if (cfg.headwear !== 'none' && cfg.headwear !== 'hood') cfg.hair = 'none';
  return normalizeAvatarConfig(cfg);
}

export function getCategoryLabel(category: AvatarCategory, config: AvatarConfig): string {
  switch (category) {
    case 'body':
      return BODY_TYPES.find((b) => b.id === config.body)?.label ?? config.body;
    case 'skin':
      return SKIN_TONES.find((s) => s.id === config.skin)?.label ?? config.skin;
    case 'hair':
      return HAIR_STYLES.find((h) => h.id === config.hair)?.label ?? config.hair;
    case 'headwear':
      return HEADWEAR.find((h) => h.id === config.headwear)?.label ?? config.headwear;
    case 'top':
      return TOPS.find((t) => t.id === config.top)?.label ?? config.top;
    case 'pants':
      return 'Pants';
    case 'shoes':
      return 'Shoes';
  }
}

export function cycleCategoryOption(
  category: AvatarCategory,
  config: AvatarConfig,
  direction: 1 | -1,
): AvatarConfig {
  const next = { ...config };
  const cycle = <T extends { id: string }>(list: readonly T[], key: keyof AvatarConfig) => {
    const idx = list.findIndex((item) => item.id === config[key]);
    const nextIdx = (idx + direction + list.length) % list.length;
    (next[key] as string) = list[nextIdx]!.id;
  };

  switch (category) {
    case 'body':
      cycle(BODY_TYPES, 'body');
      break;
    case 'skin':
      cycle(SKIN_TONES, 'skin');
      break;
    case 'hair':
      cycle(HAIR_STYLES, 'hair');
      break;
    case 'headwear':
      cycle(HEADWEAR, 'headwear');
      if (next.headwear !== 'none' && next.headwear !== 'hood') next.hair = 'none';
      break;
    case 'top':
      cycle(TOPS, 'top');
      break;
    case 'pants':
      cycle(PANTS, 'pants');
      break;
    case 'shoes':
      cycle(SHOES, 'shoes');
      break;
  }
  return next;
}

export function cycleHairColor(config: AvatarConfig, direction: 1 | -1): AvatarConfig {
  const idx = HAIR_COLORS.findIndex((c) => c.id === config.hairColor);
  const nextIdx = (idx + direction + HAIR_COLORS.length) % HAIR_COLORS.length;
  return { ...config, hairColor: HAIR_COLORS[nextIdx]!.id };
}

export function configWithCategoryOption(
  category: AvatarCategory,
  value: string,
  base: AvatarConfig,
): AvatarConfig {
  const next = { ...base };
  switch (category) {
    case 'body':
      next.body = value === 'female' ? 'female' : 'male';
      break;
    case 'skin':
      next.skin = value;
      break;
    case 'hair':
      next.hair = value;
      break;
    case 'headwear':
      next.headwear = value;
      if (value !== 'none' && value !== 'hood') next.hair = 'none';
      break;
    case 'top':
      next.top = value;
      break;
    case 'pants':
      next.pants = value;
      break;
    case 'shoes':
      next.shoes = value;
      break;
  }
  return normalizeAvatarConfig(next);
}

export function configWithCustomColor(
  kind: 'top' | 'pants' | 'shoes',
  hex: string,
  base: AvatarConfig,
): AvatarConfig {
  const color = normalizeHexColor(hex, DEFAULT_AVATAR_CONFIG[`${kind}Color`]);
  return normalizeAvatarConfig({ ...base, [`${kind}Color`]: color });
}
