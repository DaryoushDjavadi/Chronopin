import {
  canPlayDaily,
  formatDailyCountdown,
  getNextDailyResetMs,
  isDailyFullyDoneToday,
  isDailyWheelPending,
} from './daily';
import { WHEEL_SEGMENTS } from './daily-wheel';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderDailyHomeCard(): string {
  const wheelPending = isDailyWheelPending();
  const done = isDailyFullyDoneToday();
  const playable = canPlayDaily();
  const countdown = formatDailyCountdown(getNextDailyResetMs());

  if (wheelPending) {
    return `
      <button type="button" class="daily-card daily-claim" data-action="open-daily-wheel">
        <span class="daily-icon" aria-hidden="true">🎡</span>
        <div class="daily-card-body">
          <strong>Daily reward ready!</strong>
          <span>Spin the wheel for your prize</span>
        </div>
        <span class="daily-cta daily-cta-glow">Spin →</span>
      </button>`;
  }

  if (done || !playable) {
    return `
      <div class="daily-card daily-done" aria-disabled="true">
        <span class="daily-icon" aria-hidden="true">📅</span>
        <div class="daily-card-body">
          <strong>Daily ChronoPin</strong>
          <span>Come back tomorrow for a new scene</span>
        </div>
        <span class="daily-timer" data-daily-countdown>${escapeHtml(countdown)}</span>
      </div>`;
  }

  return `
    <button type="button" class="daily-card daily-available" data-action="start-daily">
      <span class="daily-icon" aria-hidden="true">📅</span>
      <div class="daily-card-body">
        <strong>Daily ChronoPin</strong>
        <span class="daily-card-lead">Play Daily Challenge</span>
        <span>Spin the wheel for loot</span>
      </div>
      <span class="daily-cta">Play →</span>
    </button>`;
}

export function renderDailyWheelOverlay(open: boolean, resultText: string | null): string {
  const segmentCount = WHEEL_SEGMENTS.length;
  const step = 360 / segmentCount;
  const gradientStops = WHEEL_SEGMENTS.map((seg, i) => {
    const start = i * step;
    const end = (i + 1) * step;
    return `${seg.color} ${start}deg ${end}deg`;
  }).join(', ');

  const labels = WHEEL_SEGMENTS.map((seg, i) => {
    const angle = i * step + step / 2;
    return `
      <span class="wheel-label" style="--wheel-angle:${angle}deg">
        <span class="wheel-label-inner">${seg.emoji}<br>${escapeHtml(seg.label)}</span>
      </span>`;
  }).join('');

  return `
    <div class="daily-wheel-overlay ${open ? 'open' : ''}" data-daily-wheel-overlay aria-hidden="${!open}" ${open ? '' : 'inert'}>
      <div class="daily-wheel-backdrop" data-action="close-daily-wheel" aria-hidden="true"></div>
      <div class="daily-wheel-panel" role="dialog" aria-modal="true" aria-label="Daily reward">
        <div class="daily-wheel-header">
          <h2>Daily reward</h2>
          <p>Spin the wheel — prizes go to your stash for future runs.</p>
        </div>
        <div class="wheel-stage">
          <div class="wheel-pointer" aria-hidden="true">▼</div>
          <div class="wheel-spinner-wrap">
            <div class="wheel-spinner" data-wheel-spinner style="background: conic-gradient(${gradientStops})">
              ${labels}
            </div>
          </div>
        </div>
        ${
          resultText
            ? `<p class="wheel-result" role="status">${escapeHtml(resultText)}</p>
               <button type="button" class="btn btn-primary btn-lg" data-action="close-daily-wheel">Collect &amp; continue</button>`
            : `<button type="button" class="btn btn-primary btn-lg wheel-spin-btn" data-action="spin-daily-wheel">Spin!</button>`
        }
      </div>
    </div>`;
}
