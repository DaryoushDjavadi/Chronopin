import { renderAvatar } from '../data/avatars';
import { encodeAvatarConfigAttr } from './avatar-compose';
import {
  type AvatarCategory,
  type AvatarConfig,
  AVATAR_CATEGORIES,
  BODY_TYPES,
  DEFAULT_AVATAR_CONFIG,
  HAIR_COLORS,
  HAIR_COLOR_HEX,
  HAIR_STYLES,
  HEADWEAR,
  isHexColor,
  PANTS_COLOR_PRESETS,
  SHOES_COLOR_PRESETS,
  SKIN_TONES,
  TOP_COLOR_PRESETS,
  TOPS,
  configWithCategoryOption,
  getCategoryLabel,
} from '../data/lpc-catalog';

const CATEGORY_EMOJI: Record<AvatarCategory, string> = {
  body: '👤',
  skin: '🧑',
  hair: '💇',
  headwear: '🎩',
  top: '👕',
  pants: '👖',
  shoes: '👟',
};

const SKIN_SWATCH: Record<string, string> = {
  light: '#f0c9a8',
  amber: '#ddb08a',
  olive: '#c49a6c',
  bronze: '#a67b5b',
  dark: '#6b4423',
  black: '#2a1810',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSkinSwatch(skinId: string, selected: boolean): string {
  return `<span class="avatar-skin-swatch ${selected ? 'selected' : ''}" style="background:${SKIN_SWATCH[skinId] ?? '#ccc'}" aria-hidden="true"></span>`;
}

function renderOptionThumb(config: AvatarConfig, selected: boolean): string {
  return renderAvatar(config, `avatar avatar-opt-thumb ${selected ? 'selected' : ''}`);
}

function renderSkinOptions(config: AvatarConfig): string {
  return SKIN_TONES.map(
    (tone) => `
    <button
      type="button"
      class="avatar-opt ${config.skin === tone.id ? 'selected' : ''}"
      data-action="pick-avatar"
      data-cat="skin"
      data-value="${tone.id}"
      aria-pressed="${config.skin === tone.id}"
    >
      ${renderSkinSwatch(tone.id, config.skin === tone.id)}
      <span class="avatar-opt-label">${tone.label}</span>
    </button>`,
  ).join('');
}

function renderBodyOptions(config: AvatarConfig): string {
  return BODY_TYPES.map(
    (body) => `
    <button
      type="button"
      class="avatar-opt ${config.body === body.id ? 'selected' : ''}"
      data-action="pick-avatar"
      data-cat="body"
      data-value="${body.id}"
      aria-pressed="${config.body === body.id}"
    >
      ${renderOptionThumb({ ...config, body: body.id }, config.body === body.id)}
      <span class="avatar-opt-label">${body.label}</span>
    </button>`,
  ).join('');
}

function getCategoryValue(category: AvatarCategory, config: AvatarConfig): string {
  switch (category) {
    case 'body':
      return config.body;
    case 'skin':
      return config.skin;
    case 'hair':
      return config.hair;
    case 'headwear':
      return config.headwear;
    case 'top':
      return config.top;
    case 'pants':
      return config.pants;
    case 'shoes':
      return config.shoes;
  }
}

function renderCanvasOptions(
  category: AvatarCategory,
  config: AvatarConfig,
  options: ReadonlyArray<{ id: string; label: string }>,
): string {
  const current = getCategoryValue(category, config);
  return options
    .map((opt) => {
      const previewConfig = configWithCategoryOption(category, opt.id, config);
      const selected = current === opt.id;
      return `
    <button
      type="button"
      class="avatar-opt ${selected ? 'selected' : ''}"
      data-action="pick-avatar"
      data-cat="${category}"
      data-value="${opt.id}"
      aria-pressed="${selected}"
    >
      ${renderOptionThumb(previewConfig, selected)}
      <span class="avatar-opt-label">${opt.label}</span>
    </button>`;
    })
    .join('');
}

const COLOR_PICKER_ICON = `<svg class="avatar-color-custom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 22a1 1 0 0 1-1-1v-2H8a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2v-1a6 6 0 0 1 11.2-3 7 7 0 0 1 .75 8.3"/>
  <circle cx="12" cy="6" r="1"/>
  <circle cx="8" cy="8" r="1"/>
  <circle cx="6" cy="12" r="1"/>
</svg>`;

type ColorKind = 'hair' | 'top' | 'pants' | 'shoes';

function normalizeHex(value: string): string {
  return value.toLowerCase();
}

function resolveHairPickerHex(hairColor: string): string {
  if (isHexColor(hairColor)) return normalizeHex(hairColor);
  return HAIR_COLOR_HEX[hairColor as keyof typeof HAIR_COLOR_HEX] ?? '#6b4423';
}

function isHairPresetSelected(hairColor: string, presetId: string): boolean {
  return !isHexColor(hairColor) && hairColor === presetId;
}

function isClothingPresetSelected(currentHex: string, presetHex: string): boolean {
  return normalizeHex(currentHex) === normalizeHex(presetHex);
}

function isCustomColorActive(
  kind: ColorKind,
  config: AvatarConfig,
  presets: readonly string[],
): boolean {
  if (kind === 'hair') {
    return isHexColor(config.hairColor);
  }
  const current = config[`${kind}Color`];
  return !presets.some((hex) => isClothingPresetSelected(current, hex));
}

function renderColorSelectorRow(kind: ColorKind, config: AvatarConfig): string {
  const labels: Record<ColorKind, string> = {
    hair: 'Hair color',
    top: 'Shirt color',
    pants: 'Pants color',
    shoes: 'Shoes color',
  };

  let presetButtons = '';
  let pickerValue = '';
  let customActive = false;

  if (kind === 'hair') {
    pickerValue = resolveHairPickerHex(config.hairColor);
    customActive = isCustomColorActive('hair', config, []);
    presetButtons = HAIR_COLORS.map((c) => {
      const hex = HAIR_COLOR_HEX[c.id];
      const selected = isHairPresetSelected(config.hairColor, c.id);
      return `
        <button
          type="button"
          class="avatar-color-dot ${selected ? 'selected' : ''}"
          data-action="pick-preset-color"
          data-kind="hair"
          data-value="${c.id}"
          style="background:${hex}"
          aria-label="${c.id}"
          aria-pressed="${selected}"
        ></button>`;
    }).join('');
  } else {
    const presets =
      kind === 'top'
        ? TOP_COLOR_PRESETS
        : kind === 'pants'
          ? PANTS_COLOR_PRESETS
          : SHOES_COLOR_PRESETS;
    const current = config[`${kind}Color`];
    pickerValue = current;
    customActive = isCustomColorActive(kind, config, presets);
    presetButtons = presets
      .map((hex) => {
        const selected = isClothingPresetSelected(current, hex);
        return `
        <button
          type="button"
          class="avatar-color-dot ${selected ? 'selected' : ''}"
          data-action="pick-preset-color"
          data-kind="${kind}"
          data-value="${hex}"
          style="background:${hex}"
          aria-label="${hex}"
          aria-pressed="${selected}"
        ></button>`;
      })
      .join('');
  }

  const customInner = customActive
    ? `<span class="avatar-color-custom-fill" style="background:${escapeHtml(pickerValue)}"></span>`
    : COLOR_PICKER_ICON;

  return `
    <div class="avatar-color-row">
      <span class="avatar-color-label">${labels[kind]}</span>
      <div class="avatar-color-swatches">
        ${presetButtons}
        <label
          class="avatar-color-custom ${customActive ? 'selected' : ''}"
          title="Pick custom color"
        >
          <input
            type="color"
            class="avatar-color-input"
            data-action="pick-custom-color"
            data-kind="${kind}"
            value="${escapeHtml(pickerValue)}"
            aria-label="Custom ${labels[kind].toLowerCase()}"
          />
          <span class="avatar-color-custom-ring" aria-hidden="true">
            <span class="avatar-color-custom-face">${customInner}</span>
          </span>
          <span class="avatar-color-custom-label">Custom</span>
        </label>
      </div>
    </div>`;
}

function renderCategoryBody(category: AvatarCategory, config: AvatarConfig): string {
  switch (category) {
    case 'body':
      return `<div class="avatar-opt-grid avatar-opt-grid-2">${renderBodyOptions(config)}</div>`;
    case 'skin':
      return `<div class="avatar-opt-grid">${renderSkinOptions(config)}</div>`;
    case 'hair':
      return `
        <div class="avatar-opt-grid">${renderCanvasOptions(category, config, HAIR_STYLES)}</div>
        ${config.hair !== 'none' ? renderColorSelectorRow('hair', config) : ''}`;
    case 'headwear':
      return `<div class="avatar-opt-grid">${renderCanvasOptions(category, config, HEADWEAR)}</div>`;
    case 'top':
      return `
        <div class="avatar-opt-grid">${renderCanvasOptions(category, config, TOPS)}</div>
        ${renderColorSelectorRow('top', config)}`;
    case 'pants':
      return renderColorSelectorRow('pants', config);
    case 'shoes':
      return renderColorSelectorRow('shoes', config);
  }
}

function renderCategoryPreviewChip(category: AvatarCategory, config: AvatarConfig): string {
  if (category === 'skin') {
    return renderSkinSwatch(config.skin, true);
  }
  if (category === 'top') {
    return `<span class="avatar-acc-chip" style="background:${config.topColor}" aria-hidden="true"></span>`;
  }
  if (category === 'pants') {
    return `<span class="avatar-acc-chip" style="background:${config.pantsColor}" aria-hidden="true"></span>`;
  }
  if (category === 'shoes') {
    return `<span class="avatar-acc-chip" style="background:${config.shoesColor}" aria-hidden="true"></span>`;
  }
  return renderAvatar(config, 'avatar avatar-acc-thumb');
}

function renderCategoryAccordion(
  category: AvatarCategory,
  label: string,
  config: AvatarConfig,
  openCategory: AvatarCategory | null,
): string {
  const open = openCategory === category;
  const current = getCategoryLabel(category, config);

  return `
    <div class="avatar-acc ${open ? 'open' : ''}" data-avatar-acc="${category}">
      <button
        type="button"
        class="avatar-acc-head"
        data-action="toggle-avatar-cat"
        data-cat="${category}"
        aria-expanded="${open}"
      >
        <span class="avatar-acc-emoji">${CATEGORY_EMOJI[category]}</span>
        <span class="avatar-acc-meta">
          <span class="avatar-acc-title">${label}</span>
          <span class="avatar-acc-current">${escapeHtml(current)}</span>
        </span>
        <span class="avatar-acc-preview-wrap">${renderCategoryPreviewChip(category, config)}</span>
        <span class="avatar-acc-chevron" aria-hidden="true"></span>
      </button>
      <div class="avatar-acc-body" ${open ? '' : 'hidden'}>
        ${renderCategoryBody(category, config)}
      </div>
    </div>`;
}

function renderAvatarQuickActions(): string {
  return `
    <div class="avatar-quick-actions">
      <button type="button" class="btn btn-secondary avatar-quick-btn" data-action="avatar-reset">
        Reset
      </button>
      <button type="button" class="btn btn-secondary avatar-quick-btn" data-action="avatar-random">
        🎲 Random
      </button>
    </div>`;
}

/** Accordion panel + large preview (patchable without full screen re-render). */
export function renderAvatarEditorPanel(
  config: AvatarConfig,
  openCategory: AvatarCategory | null,
): string {
  return `
    <div id="avatar-editor-panel" class="avatar-editor-panel">
      <div class="avatar-editor-preview-wrap">
        ${renderAvatar(config, 'avatar avatar-preview avatar-idle')}
        <p class="avatar-preview-hint">Live preview</p>
        ${renderAvatarQuickActions()}
      </div>
      <div class="avatar-accordions">
        ${AVATAR_CATEGORIES.map((c) =>
          renderCategoryAccordion(c.id, c.label, config, openCategory),
        ).join('')}
      </div>
    </div>`;
}

export function renderAvatarEditorForm(
  defaultName: string,
  config: AvatarConfig,
  openCategory: AvatarCategory | null,
  submitLabel: string,
): string {
  return `
        <label class="field-label" for="player-name">Display name</label>
        <input
          id="player-name"
          class="text-input"
          type="text"
          maxlength="20"
          placeholder="Explorer"
          value="${escapeHtml(defaultName)}"
          autocomplete="nickname"
        />

        <p class="field-label">Character</p>
        ${renderAvatarEditorPanel(config, openCategory)}

        <p class="avatar-credits">
          Avatars use <a href="https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator" target="_blank" rel="noopener">Universal LPC</a>
          (CC-BY-SA · attribution required).
        </p>

        <button class="btn btn-primary btn-lg" data-action="save-profile">${submitLabel}</button>
  `;
}

export function updateHeroAvatarCanvases(root: ParentNode, config: AvatarConfig): void {
  const encoded = encodeAvatarConfigAttr(config);
  root.querySelectorAll<HTMLCanvasElement>('.avatar-xxl, .avatar-xl, .avatar-preview').forEach((canvas) => {
    canvas.dataset.avatarConfig = encoded;
  });
}

export { DEFAULT_AVATAR_CONFIG };
