import { formatDistance } from './geo';
import { getJournalEntries } from './chrono-journal';
import { modeLabel } from '../data/rounds';
import type { ChronoJournalEntry } from '../types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatJournalDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function renderJournalCard(entry: ChronoJournalEntry): string {
  const pct = entry.maxScore > 0 ? Math.round((entry.score / entry.maxScore) * 100) : 0;
  const mode = modeLabel(entry.mode);
  const tag = entry.coop ? 'Co-op' : mode;

  return `
    <article class="journal-card">
      <div class="journal-card-thumb-wrap">
        <img class="journal-card-thumb" src="${escapeHtml(entry.thumb)}" alt="" loading="lazy" />
        <span class="journal-card-stamp" aria-hidden="true">📮</span>
      </div>
      <div class="journal-card-body">
        <h4 class="journal-card-title">${escapeHtml(entry.title)}</h4>
        <p class="journal-card-region">${escapeHtml(entry.region)}</p>
        <p class="journal-card-score">+${entry.score.toLocaleString('en-GB')} pts · ${pct}% · ${formatDistance(entry.distanceKm)} off</p>
        ${
          entry.context
            ? `<p class="journal-card-fact">${escapeHtml(entry.context)}</p>`
            : ''
        }
        <div class="journal-card-footer">
          <span class="journal-card-mode">${escapeHtml(tag)}</span>
          <time class="journal-card-date" datetime="${new Date(entry.date).toISOString()}">${formatJournalDate(entry.date)}</time>
        </div>
      </div>
    </article>`;
}

export function renderChronoJournalPanel(): string {
  const entries = getJournalEntries();

  if (entries.length === 0) {
    return `
      <section class="stats-panel journal-panel">
        <h3>Chrono Journal</h3>
        <p class="hint">Postcards from your travels — unlock one when you finish a round without losing a heart.</p>
        <div class="journal-empty">
          <span class="journal-empty-icon" aria-hidden="true">📮</span>
          <p>No postcards yet. Keep your heart on the next round!</p>
        </div>
      </section>`;
  }

  return `
    <section class="stats-panel journal-panel">
      <div class="journal-panel-head">
        <h3>Chrono Journal</h3>
        <span class="journal-count">${entries.length} postcard${entries.length === 1 ? '' : 's'}</span>
      </div>
      <p class="hint">Souvenirs from rounds where you kept your heart.</p>
      <div class="journal-grid">
        ${entries.map(renderJournalCard).join('')}
      </div>
    </section>`;
}
