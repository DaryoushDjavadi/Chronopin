import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import './styles.css';
import { pickRound, modeLabel, modeDescription } from './data/rounds';
import {
  formatDistance,
  scoreGuess,
  scoreGrade,
  renderHearts,
} from './lib/geo';
import {
  getVisiblePanoramas,
  hidePanorama,
  restoreAllPanoramas,
  panoramaUrl,
} from './lib/library';
import {
  MAX_HEARTS,
  type AppState,
  type GameMode,
  type Round,
  type Screen,
} from './types';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

let state: AppState = {
  screen: 'home',
  playType: 'solo',
  mode: null,
  round: null,
  guess: null,
  session: null,
  libraryIndex: 0,
  libraryViewId: null,
};

let panoViewer: { destroy: () => void } | null = null;
let panoInitToken = 0;
let map: maplibregl.Map | null = null;
let guessMarker: maplibregl.Marker | null = null;
let answerMarker: maplibregl.Marker | null = null;

const app = document.getElementById('app')!;

function render(): void {
  app.innerHTML = getScreenHtml(state.screen);
  bindScreenEvents(state.screen);
  if (state.screen === 'explore' || state.screen === 'library-view') initPanorama();
  if (state.screen === 'guess') initGuessMap();
  if (state.screen === 'result') initResultMap();
}

function getScreenHtml(screen: Screen): string {
  switch (screen) {
    case 'home':
      return renderHome();
    case 'explore':
      return renderExplore();
    case 'guess':
      return renderGuess();
    case 'result':
      return renderResult();
    case 'gameover':
      return renderGameOver();
    case 'library':
      return renderLibrary();
    case 'library-view':
      return renderLibraryView();
  }
}

function renderHome(): string {
  const modes: GameMode[] = ['classic', 'past', 'future'];
  const modeIcons = { classic: '📍', past: '⏳', future: '🚀' };
  const panoCount = getVisiblePanoramas().length;

  return `
    <div class="screen screen-home">
      <header class="hero">
        <div class="logo-mark">CP</div>
        <h1>ChronoPin</h1>
        <p class="tagline">Guess <strong>where</strong>. In time modes, also guess <strong>when</strong>.</p>
        <span class="badge">Web prototype · ${panoCount} panoramas</span>
      </header>

      <section class="panel">
        <div class="segmented" role="tablist">
          <button class="segmented-btn active" data-play="solo" role="tab" aria-selected="true">Solo</button>
          <button class="segmented-btn" data-play="multiplayer" role="tab" aria-selected="false">Multiplayer</button>
        </div>

        <div class="solo-panel">
          <h2>Choose mode</h2>
          <p class="hint">3 hearts per run · bad guesses cost a heart</p>
          <div class="mode-grid">
            ${modes
              .map(
                (m) => `
              <button class="mode-card" data-mode="${m}">
                <span class="mode-icon">${modeIcons[m]}</span>
                <span class="mode-name">${modeLabel(m)}</span>
                <span class="mode-desc">${modeDescription(m)}</span>
              </button>
            `,
              )
              .join('')}
          </div>

          <div class="tools-section">
            <h2>Tools</h2>
            <button class="tool-card" data-action="library">
              <span class="tool-icon">🗂️</span>
              <span class="tool-info">
                <strong>Panorama Library</strong>
                <span>Browse, preview &amp; remove test scenes</span>
              </span>
              <span class="tool-count">${panoCount}</span>
            </button>
          </div>
        </div>

        <div class="multi-panel hidden">
          <h2>Play together</h2>
          <p class="hint">Multiplayer UI preview — not wired up yet.</p>
          <div class="mp-grid">
            ${renderMpCard('Co-op Decide', 'Blind pin → reveal → argue → one final pin', '2 players', true)}
            ${renderMpCard('1v1 Duel', 'Same scene, closest guess wins the round', 'Best of 5', true)}
            ${renderMpCard('Battle Royale', '4–8 players, elimination rounds', 'Later', false)}
          </div>
        </div>
      </section>

      <footer class="footer-note">
        Map: MapLibre + OpenFreeMap · Panoramas: Wikimedia Commons
      </footer>
    </div>
  `;
}

function renderMpCard(
  title: string,
  desc: string,
  meta: string,
  highlight: boolean,
): string {
  return `
    <button class="mp-card ${highlight ? 'mp-highlight' : ''}" disabled>
      <div class="mp-card-top">
        <strong>${title}</strong>
        <span class="soon-badge">Soon</span>
      </div>
      <p>${desc}</p>
      <span class="mp-meta">${meta}</span>
    </button>
  `;
}

function renderSessionHud(): string {
  const s = state.session!;
  return `
    <div class="session-hud">
      <span class="hearts" aria-label="${s.hearts} of ${MAX_HEARTS} hearts">${renderHearts(s.hearts, MAX_HEARTS)}</span>
      <span class="session-score">${s.score.toLocaleString('de-DE')} pts</span>
      <span class="session-round">R${s.roundNumber}</span>
    </div>
  `;
}

function renderExplore(): string {
  const round = state.round!;
  const showYearHint = round.answer.year != null;

  return `
    <div class="screen screen-explore">
      <div class="top-bar">
        <button class="icon-btn" data-action="quit" aria-label="Quit">←</button>
        <div class="top-bar-center">
          <span class="mode-pill mode-${state.mode}">${modeLabel(state.mode!)}</span>
          <span class="round-title">${round.title}</span>
        </div>
        ${renderSessionHud()}
      </div>

      ${round.isAiGenerated ? '<div class="ai-banner">AI / speculative content (demo)</div>' : ''}

      <div id="pano" class="pano-container" aria-label="360 panorama — drag to look around"></div>

      <div class="explore-hud">
        <p class="explore-tip">Drag to look around · Pinch to zoom</p>
        ${showYearHint ? '<p class="explore-tip accent">You will also guess the year</p>' : ''}
        <button class="btn btn-primary btn-lg" data-action="guess">Drop your pin</button>
      </div>
    </div>
  `;
}

function renderGuess(): string {
  const needsYear = state.round!.answer.year != null;
  const defaultYear =
    state.mode === 'past' ? 1920 : state.mode === 'future' ? 2050 : new Date().getFullYear();
  const year = state.guess?.year ?? defaultYear;

  return `
    <div class="screen screen-guess">
      <div class="guess-header">
        <button class="icon-btn" data-action="back-explore" aria-label="Back">←</button>
        <div class="guess-header-text">
          <h2>Where is this?</h2>
          ${needsYear ? '<p>Tap the map, then set the year</p>' : '<p>Tap the map to place your pin</p>'}
        </div>
        ${state.session ? renderSessionHud() : ''}
      </div>

      <div id="guess-map" class="map-container"></div>

      <div class="guess-sheet">
        ${
          needsYear
            ? `
          <div class="year-control">
            <div class="year-labels">
              <label for="year-slider">Year guess</label>
              <output id="year-value" class="year-value">${year}</output>
            </div>
            <input id="year-slider" type="range"
              min="${state.mode === 'past' ? 1000 : 2026}"
              max="${state.mode === 'past' ? 2025 : 2200}"
              step="1" value="${year}" />
            <div class="era-chips">${getEraChips(state.mode!, year)}</div>
          </div>`
            : ''
        }
        <button class="btn btn-primary btn-lg" data-action="submit" disabled>Submit guess</button>
      </div>
    </div>
  `;
}

function getEraChips(mode: GameMode, current: number): string {
  const chips =
    mode === 'past'
      ? [
          { label: 'Medieval', year: 1350 },
          { label: '1800s', year: 1850 },
          { label: '1920s', year: 1925 },
          { label: '1960s', year: 1965 },
        ]
      : [
          { label: '2030', year: 2030 },
          { label: '2040', year: 2040 },
          { label: '2080', year: 2080 },
          { label: '2150', year: 2150 },
        ];
  return chips
    .map(
      (c) =>
        `<button type="button" class="era-chip ${c.year === current ? 'active' : ''}" data-year="${c.year}">${c.label}</button>`,
    )
    .join('');
}

function renderResult(): string {
  const round = state.round!;
  const guess = state.guess!;
  const score = scoreGuess(round, guess);
  const grade = scoreGrade(score.points, score.maxPoints);
  const s = state.session!;
  const canContinue = s.hearts > 0;

  return `
    <div class="screen screen-result">
      <div class="result-top">
        ${renderSessionHud()}
      </div>

      <div class="result-header">
        <span class="grade-badge">${grade}</span>
        <h2>${Math.round((score.points / score.maxPoints) * 100)}%</h2>
        <p class="score-sub">+${score.points.toLocaleString('de-DE')} pts this round</p>
        ${
          score.lostHeart
            ? `<p class="heart-lost">♥ Lost a heart — ${score.failReason}</p>`
            : `<p class="heart-kept">♥ Nice guess — heart kept</p>`
        }
      </div>

      <div class="result-stats">
        <div class="stat-card">
          <span class="stat-label">Distance off</span>
          <strong>${formatDistance(score.distanceKm)}</strong>
        </div>
        ${
          score.yearError != null
            ? `<div class="stat-card"><span class="stat-label">Year off</span><strong>${score.yearError} years</strong></div>`
            : ''
        }
      </div>

      <div id="result-map" class="map-container map-result"></div>

      <div class="result-card">
        <h3>${round.answer.label}</h3>
        ${
          round.answer.year
            ? `<p class="answer-year">Actual: <strong>${round.answer.year}</strong>${guess.year != null ? ` · You: ${guess.year}` : ''}</p>`
            : ''
        }
        <p>${round.context}</p>
        <p class="attribution">${round.attribution} · ${round.license}</p>
      </div>

      <div class="result-actions">
        <button class="btn btn-secondary" data-action="quit">${canContinue ? 'Quit' : 'Home'}</button>
        <button class="btn btn-primary" data-action="next">${canContinue ? 'Next round →' : 'See results'}</button>
      </div>
    </div>
  `;
}

function renderGameOver(): string {
  const s = state.session!;
  const rounds = s.roundNumber;

  return `
    <div class="screen screen-gameover">
      <div class="gameover-content">
        <span class="gameover-icon">💔</span>
        <h1>Game Over</h1>
        <p class="gameover-sub">No hearts left after ${rounds} round${rounds === 1 ? '' : 's'}</p>

        <div class="gameover-stats">
          <div class="stat-card stat-highlight">
            <span class="stat-label">Final score</span>
            <strong>${s.score.toLocaleString('de-DE')}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Mode</span>
            <strong>${modeLabel(state.mode!)}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Rounds</span>
            <strong>${rounds}</strong>
          </div>
        </div>

        <div class="gameover-actions">
          <button class="btn btn-primary btn-lg" data-action="retry">Play again</button>
          <button class="btn btn-secondary btn-lg" data-action="home">Home</button>
        </div>
      </div>
    </div>
  `;
}

function renderLibrary(): string {
  const items = getVisiblePanoramas();

  return `
    <div class="screen screen-library">
      <div class="library-header">
        <button class="icon-btn" data-action="home" aria-label="Home">←</button>
        <div>
          <h2>Panorama Library</h2>
          <p>${items.length} scenes · tap to preview</p>
        </div>
      </div>

      ${
        items.length === 0
          ? `<div class="library-empty">
              <p>All panoramas hidden.</p>
              <button class="btn btn-secondary" data-action="restore-all">Restore all</button>
            </div>`
          : `<ul class="library-list">
              ${items
                .map(
                  (p, i) => `
                <li class="library-item" data-id="${p.id}" data-index="${i}">
                  <img class="library-thumb" src="${panoramaUrl(p)}" alt="" loading="lazy" />
                  <div class="library-meta">
                    <strong>${p.title}</strong>
                    <span>${p.region}</span>
                    <span class="library-tags">${p.modes.join(' · ')}</span>
                  </div>
                  <button class="library-delete" data-delete="${p.id}" aria-label="Remove ${p.title}" title="Remove from library">🗑</button>
                </li>`,
                )
                .join('')}
            </ul>`
      }

      ${
        localStorage.getItem('chronopin-hidden-panos')
          ? `<button class="btn btn-secondary library-restore" data-action="restore-all">Restore hidden panoramas</button>`
          : ''
      }
    </div>
  `;
}

function renderLibraryView(): string {
  const items = getVisiblePanoramas();
  const idx = state.libraryIndex;
  const item = items[idx];
  if (!item) return renderLibrary();

  return `
    <div class="screen screen-library-view">
      <div class="top-bar">
        <button class="icon-btn" data-action="library-back" aria-label="Back to list">←</button>
        <div class="top-bar-center">
          <span class="round-title">${item.title}</span>
          <span class="library-view-region">${item.region}</span>
        </div>
        <span class="library-nav-count">${idx + 1}/${items.length}</span>
      </div>

      <div id="pano" class="pano-container" aria-label="360 preview"></div>

      <div class="library-view-bar">
        <button class="btn btn-secondary" data-action="lib-prev" ${idx === 0 ? 'disabled' : ''}>← Prev</button>
        <button class="btn btn-secondary" data-action="lib-delete" data-id="${item.id}">Remove</button>
        <button class="btn btn-secondary" data-action="lib-next" ${idx >= items.length - 1 ? 'disabled' : ''}>Next →</button>
      </div>
    </div>
  `;
}

function bindScreenEvents(screen: Screen): void {
  if (screen === 'home') bindHomeEvents();
  if (screen === 'explore') bindExploreEvents();
  if (screen === 'guess') bindGuessEvents();
  if (screen === 'result') bindResultEvents();
  if (screen === 'gameover') bindGameOverEvents();
  if (screen === 'library') bindLibraryEvents();
  if (screen === 'library-view') bindLibraryViewEvents();
}

function bindHomeEvents(): void {
  app.querySelectorAll('.segmented-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const play = (btn as HTMLElement).dataset.play as 'solo' | 'multiplayer';
      state.playType = play;
      app.querySelectorAll('.segmented-btn').forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      app.querySelector('.solo-panel')?.classList.toggle('hidden', play !== 'solo');
      app.querySelector('.multi-panel')?.classList.toggle('hidden', play !== 'multiplayer');
    });
  });

  app.querySelectorAll('.mode-card').forEach((card) => {
    card.addEventListener('click', () => {
      startGame((card as HTMLElement).dataset.mode as GameMode);
    });
  });

  app.querySelector('[data-action="library"]')?.addEventListener('click', () => {
    state.screen = 'library';
    render();
  });
}

function bindExploreEvents(): void {
  app.querySelector('[data-action="quit"]')?.addEventListener('click', goHome);
  app.querySelector('[data-action="guess"]')?.addEventListener('click', () => {
    state.screen = 'guess';
    if (!state.guess && state.round?.answer.year != null) {
      state.guess = { lat: NaN, lng: NaN, year: state.mode === 'past' ? 1920 : 2050 };
    }
    render();
  });
}

function bindGuessEvents(): void {
  app.querySelector('[data-action="back-explore"]')?.addEventListener('click', () => {
    state.screen = 'explore';
    render();
  });

  app.querySelector('[data-action="submit"]')?.addEventListener('click', submitGuess);

  const slider = app.querySelector('#year-slider') as HTMLInputElement | null;
  slider?.addEventListener('input', () => {
    const year = Number(slider.value);
    const output = app.querySelector('#year-value');
    if (output) output.textContent = slider.value;
    if (state.guess) state.guess.year = year;
    app.querySelectorAll('.era-chip').forEach((chip) => {
      chip.classList.toggle('active', Number((chip as HTMLElement).dataset.year) === year);
    });
  });

  app.querySelectorAll('.era-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const year = Number((chip as HTMLElement).dataset.year);
      if (slider) {
        slider.value = String(year);
        slider.dispatchEvent(new Event('input'));
      }
    });
  });
}

function bindResultEvents(): void {
  app.querySelector('[data-action="quit"]')?.addEventListener('click', goHome);
  app.querySelector('[data-action="next"]')?.addEventListener('click', () => {
    if (state.session && state.session.hearts > 0) {
      nextRound();
    } else {
      state.screen = 'gameover';
      render();
    }
  });
}

function bindGameOverEvents(): void {
  app.querySelector('[data-action="retry"]')?.addEventListener('click', () => {
    if (state.mode) startGame(state.mode);
  });
  app.querySelector('[data-action="home"]')?.addEventListener('click', goHome);
}

function bindLibraryEvents(): void {
  app.querySelector('[data-action="home"]')?.addEventListener('click', goHome);

  app.querySelectorAll('.library-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-delete]')) return;
      const index = Number((item as HTMLElement).dataset.index);
      state.libraryIndex = index;
      state.libraryViewId = (item as HTMLElement).dataset.id ?? null;
      state.screen = 'library-view';
      render();
    });
  });

  app.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.delete!;
      if (confirm('Remove this panorama from the library? (Hidden locally — file stays in repo.)')) {
        hidePanorama(id);
        render();
      }
    });
  });

  app.querySelector('[data-action="restore-all"]')?.addEventListener('click', () => {
    restoreAllPanoramas();
    render();
  });
}

function bindLibraryViewEvents(): void {
  app.querySelector('[data-action="library-back"]')?.addEventListener('click', () => {
    state.screen = 'library';
    render();
  });

  app.querySelector('[data-action="lib-prev"]')?.addEventListener('click', () => {
    if (state.libraryIndex > 0) {
      state.libraryIndex--;
      render();
    }
  });

  app.querySelector('[data-action="lib-next"]')?.addEventListener('click', () => {
    const max = getVisiblePanoramas().length - 1;
    if (state.libraryIndex < max) {
      state.libraryIndex++;
      render();
    }
  });

  app.querySelector('[data-action="lib-delete"]')?.addEventListener('click', () => {
    const id = (app.querySelector('[data-action="lib-delete"]') as HTMLElement).dataset.id;
    if (id && confirm('Remove this panorama from the library?')) {
      hidePanorama(id);
      const remaining = getVisiblePanoramas();
      if (remaining.length === 0) {
        state.screen = 'library';
      } else if (state.libraryIndex >= remaining.length) {
        state.libraryIndex = remaining.length - 1;
      }
      state.screen = remaining.length === 0 ? 'library' : 'library-view';
      render();
    }
  });
}

function startGame(mode: GameMode): void {
  destroyPanorama();
  destroyMap();
  state.mode = mode;
  state.session = {
    hearts: MAX_HEARTS,
    score: 0,
    roundNumber: 0,
    usedRoundIds: [],
    lastLostHeart: false,
    lastRoundPoints: 0,
  };
  nextRound();
}

function nextRound(): void {
  if (!state.mode || !state.session) return;

  let round = pickRound(state.mode, state.session.usedRoundIds);
  if (!round) {
    state.session.usedRoundIds = [];
    round = pickRound(state.mode);
  }
  if (!round) {
    alert('No panoramas available for this mode. Check the library or restore hidden scenes.');
    goHome();
    return;
  }

  state.session.roundNumber++;
  state.session.usedRoundIds.push(round.id);
  state.round = round;
  state.guess = null;
  state.screen = 'explore';
  render();
}

function submitGuess(): void {
  if (!state.guess || !state.round || !state.session) return;

  const score = scoreGuess(state.round, state.guess);
  state.session.score += score.points;
  state.session.lastRoundPoints = score.points;
  state.session.lastLostHeart = score.lostHeart;
  if (score.lostHeart) state.session.hearts = Math.max(0, state.session.hearts - 1);

  state.screen = 'result';
  render();
}

function goHome(): void {
  destroyPanorama();
  destroyMap();
  state = {
    screen: 'home',
    playType: state.playType,
    mode: null,
    round: null,
    guess: null,
    session: null,
    libraryIndex: 0,
    libraryViewId: null,
  };
  render();
}

function getActivePanoSource(): { panorama: string; panoConfig?: Round['panoConfig'] } {
  if (state.screen === 'library-view') {
    const items = getVisiblePanoramas();
    const item = items[state.libraryIndex];
    return { panorama: panoramaUrl(item), panoConfig: item.panoConfig };
  }
  const round = state.round!;
  return { panorama: round.panorama, panoConfig: round.panoConfig };
}

function initPanorama(): void {
  const src = getActivePanoSource();
  const token = ++panoInitToken;
  destroyPanorama();

  const config: Record<string, unknown> = {
    type: 'equirectangular',
    panorama: src.panorama,
    autoLoad: true,
    showControls: false,
    compass: false,
    hfov: 100,
    minHfov: 50,
    maxHfov: 120,
    ...src.panoConfig,
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const validScreens: Screen[] = ['explore', 'library-view'];
      if (token !== panoInitToken || !validScreens.includes(state.screen)) return;
      if (!document.getElementById('pano')) return;
      panoViewer = pannellum.viewer('pano', config);
    });
  });
}

function initGuessMap(): void {
  const round = state.round!;
  destroyMap();

  map = new maplibregl.Map({
    container: 'guess-map',
    style: MAP_STYLE,
    center: [10, 25],
    zoom: 1.2,
    attributionControl: { compact: true },
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  map.on('load', () => {
    map?.resize();
    if (state.guess && !Number.isNaN(state.guess.lat)) {
      placeGuessMarker(state.guess.lng, state.guess.lat);
    }
  });

  map.on('click', (e) => {
    state.guess = {
      lat: e.lngLat.lat,
      lng: e.lngLat.lng,
      year: state.guess?.year ?? round.answer.year ?? undefined,
    };
    placeGuessMarker(state.guess.lng, state.guess.lat);
    const submitBtn = app.querySelector('[data-action="submit"]') as HTMLButtonElement | null;
    if (submitBtn) submitBtn.disabled = false;
  });
}

function placeGuessMarker(lng: number, lat: number): void {
  if (!map) return;
  guessMarker?.remove();
  const el = document.createElement('div');
  el.className = 'map-pin map-pin-guess';
  el.setAttribute('aria-label', 'Your guess');
  guessMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat([lng, lat])
    .addTo(map);
}

function initResultMap(): void {
  const round = state.round!;
  const guess = state.guess!;
  destroyMap();

  const bounds = new maplibregl.LngLatBounds();
  bounds.extend([guess.lng, guess.lat]);
  bounds.extend([round.answer.lng, round.answer.lat]);

  map = new maplibregl.Map({
    container: 'result-map',
    style: MAP_STYLE,
    bounds,
    fitBoundsOptions: { padding: 60, maxZoom: 8 },
    attributionControl: { compact: true },
  });

  map.on('load', () => {
    if (!map) return;
    map.addSource('result-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [guess.lng, guess.lat],
            [round.answer.lng, round.answer.lat],
          ],
        },
      },
    });
    map.addLayer({
      id: 'result-line-layer',
      type: 'line',
      source: 'result-line',
      paint: {
        'line-color': '#3dd6c6',
        'line-width': 3,
        'line-dasharray': [2, 2],
        'line-opacity': 0.85,
      },
    });

    const guessEl = document.createElement('div');
    guessEl.className = 'map-pin map-pin-guess';
    guessEl.textContent = 'You';
    guessMarker = new maplibregl.Marker({ element: guessEl, anchor: 'bottom' })
      .setLngLat([guess.lng, guess.lat])
      .addTo(map);

    const answerEl = document.createElement('div');
    answerEl.className = 'map-pin map-pin-answer';
    answerEl.textContent = '✓';
    answerMarker = new maplibregl.Marker({ element: answerEl, anchor: 'bottom' })
      .setLngLat([round.answer.lng, round.answer.lat])
      .addTo(map);
  });
}

function destroyPanorama(): void {
  panoViewer?.destroy();
  panoViewer = null;
}

function destroyMap(): void {
  guessMarker?.remove();
  guessMarker = null;
  answerMarker?.remove();
  answerMarker = null;
  map?.remove();
  map = null;
}

render();
