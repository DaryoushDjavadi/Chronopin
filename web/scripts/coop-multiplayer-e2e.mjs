/**
 * Two-browser Co-op multiplayer smoke test against live or local build.
 * Usage: node scripts/coop-multiplayer-e2e.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = (process.argv[2] ?? 'https://media-acht.de/Chrono/').replace(/\/?$/, '/');
const ts = Date.now().toString().slice(-6);
const HOST = `MpHost${ts}`;
const GUEST = `MpGuest${ts}`;
const TIMEOUT = 45_000;

const log = (...args) => console.log('[coop-e2e]', ...args);

function attachDialogHandler(page) {
  page.on('dialog', (d) => {
    void d.accept();
  });
}

function attachDiagnostics(page, label) {
  page.on('console', (msg) => {
    const t = msg.text();
    if (/Firestore|ChronoPin|coop|permission/i.test(t)) {
      log(`${label} console:`, t.slice(0, 200));
    }
  });
}

async function dumpCoopState(page, label) {
  const state = await page.evaluate(() => {
    const rooms = JSON.parse(localStorage.getItem('chronopin-coop-rooms') || '[]');
    const active = localStorage.getItem('chronopin-coop-active');
    const room = rooms.find((r) => r.id === active);
    if (!room) return { active, room: null };
    return {
      active,
      id: room.id,
      phase: room.phase,
      hostPin: room.hostPin ? { lat: room.hostPin.lat, at: room.hostPin.at } : null,
      guestPin: room.guestPin ? { lat: room.guestPin.lat, at: room.guestPin.at } : null,
      hostPlayerId: room.hostPlayerId,
      guestUid: room.guestUid,
    };
  });
  log(`${label} local:`, JSON.stringify(state));
  return state;
}

async function login(page, name) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  const nameInput = page.locator('#login-name');
  await nameInput.waitFor({ state: 'visible', timeout: TIMEOUT });
  await nameInput.fill(name);
  await page.locator('button.login-submit').click();
  await page.locator('button.social-btn[data-action="social"]').waitFor({ state: 'visible', timeout: TIMEOUT });
  log(`${name}: logged in`);
}

async function openSocialTab(page, tab) {
  await page.locator('button.social-btn[data-action="social"]').click();
  await page.locator('[data-social-overlay]').waitFor({ state: 'visible', timeout: TIMEOUT });
  await page.locator(`[data-social-tab="${tab}"]`).click();
}

async function waitForCloudProfile(page, name) {
  await page.waitForTimeout(4000);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('button.social-btn[data-action="social"]').waitFor({ state: 'visible', timeout: TIMEOUT });
  log(`${name}: cloud profile sync wait done`);
}

async function sendFriendRequest(fromPage, toName) {
  await openSocialTab(fromPage, 'add');
  const input = fromPage.locator('#social-add-name');
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await input.fill('');
    await input.fill(toName);
    await fromPage.waitForTimeout(1200);
    const resultAdd = fromPage.locator('[data-action="send-request-to"]').first();
    if (await resultAdd.isVisible().catch(() => false)) {
      await resultAdd.click();
      await fromPage.waitForTimeout(800);
      log(`${toName}: friend request sent (search result)`);
      return;
    }
    const noResults = fromPage.getByText(/No players found/i);
    if (await noResults.isVisible().catch(() => false)) {
      await fromPage.waitForTimeout(1500);
      continue;
    }
    await fromPage.waitForTimeout(800);
  }
  throw new Error(`Could not find player ${toName} in cloud search after 60s`);
}

async function acceptFriendRequest(page) {
  await openSocialTab(page, 'add');
  const accept = page.locator('[data-action="accept-request"]').first();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await accept.isVisible().catch(() => false)) {
      await accept.click();
      await page.waitForTimeout(1000);
      log('friend request accepted');
      return;
    }
    await page.locator('[data-social-tab="add"]').click();
    await page.waitForTimeout(1500);
  }
  throw new Error('No incoming friend request within 60s');
}

async function closeSocial(page) {
  const overlay = page.locator('[data-social-overlay].open');
  if (!(await overlay.isVisible().catch(() => false))) return;
  await page.keyboard.press('Escape');
  await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(async () => {
    const xBtn = page.locator('button.inv-close[data-action="close-social"]');
    if (await xBtn.isVisible().catch(() => false)) await xBtn.click({ force: true });
  });
  await page.waitForTimeout(300);
}

async function syncFriendsList(page, friendName) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    await openSocialTab(page, 'friends');
    await page.waitForTimeout(1500);
    await closeSocial(page);
    await page.locator('[data-play="multiplayer"]').click();
    const chip = page.locator('[data-action="pick-mp-friend"]').filter({ hasText: friendName });
    if ((await chip.count()) > 0) {
      log(`friend ${friendName} visible in multiplayer list`);
      return;
    }
    await page.waitForTimeout(2000);
  }
  throw new Error(`Friend ${friendName} not visible in multiplayer list after 45s`);
}

async function hostSendCoopInvite(page, guestName) {
  await closeSocial(page);
  await syncFriendsList(page, guestName);
  await page.locator('[data-play="multiplayer"]').click();
  await page.locator('.multi-panel').waitFor({ state: 'visible', timeout: TIMEOUT });
  const friendChip = page.locator('[data-action="pick-mp-friend"]').filter({ hasText: guestName });
  await friendChip.first().click({ timeout: TIMEOUT });
  await page.locator('[data-action="coop-decide"]').click();
  await page.locator('[data-action="send-coop-invite"]').waitFor({ state: 'visible', timeout: TIMEOUT });
  await page.locator('[data-action="send-coop-invite"]').click();
  await page.waitForTimeout(1500);
  log('co-op invite sent');
}

async function guestAcceptCoopInvite(page) {
  await closeSocial(page);
  const homeAccept = page.locator('[data-action="accept-coop-home"]').first();
  if (await homeAccept.isVisible().catch(() => false)) {
    await homeAccept.click({ force: true });
  } else {
    await openSocialTab(page, 'games');
    const gamesAccept = page.locator('[data-action="accept-coop-invite"]').first();
    await gamesAccept.waitFor({ state: 'visible', timeout: TIMEOUT });
    await gamesAccept.click();
  }
  await page.locator('.screen-explore, .screen-coop-wait, .screen-guess').first().waitFor({
    state: 'visible',
    timeout: TIMEOUT,
  });
  log('guest joined co-op');
}

async function hostJoinCoop(page) {
  await closeSocial(page);
  const joinBtn = page.locator('[data-action="enter-coop-room"]').first();
  if (await joinBtn.isVisible().catch(() => false)) {
    await joinBtn.click();
  } else {
    await openSocialTab(page, 'games');
    await page.locator('[data-action="enter-coop-room"], [data-action="start-coop-room"]').first().click();
  }
  await page.locator('.screen-explore, .screen-coop-wait, .screen-guess').first().waitFor({
    state: 'visible',
    timeout: TIMEOUT,
  });
  log('host joined co-op');
}

async function dropPin(page, label) {
  if (await page.locator('.screen-coop-reveal, #coop-reveal-map').isVisible().catch(() => false)) {
    log(`${label}: already on reveal`);
    return;
  }
  if (await page.locator('.screen-coop-wait').isVisible().catch(() => false)) {
    log(`${label}: already waiting (pin done)`);
    return;
  }

  await page.locator('.screen-explore [data-action="guess"], .screen-guess').first().waitFor({
    state: 'visible',
    timeout: TIMEOUT,
  });
  await page.waitForTimeout(2500);

  const guessBtn = page.locator('[data-action="guess"]');
  if (await guessBtn.isVisible().catch(() => false)) {
    await guessBtn.click({ force: true });
  }

  await page.locator('#guess-map').waitFor({ state: 'visible', timeout: TIMEOUT });
  await page.waitForTimeout(1500);
  const map = page.locator('#guess-map');
  const box = await map.boundingBox();
  if (!box) throw new Error(`${label}: guess map has no bounding box`);
  await map.click({ position: { x: box.width * 0.55, y: box.height * 0.45 } });
  const submit = page.locator('[data-action="submit"]');
  await submit.waitFor({ state: 'visible', timeout: TIMEOUT });
  await page.waitForFunction(
    () => !document.querySelector('[data-action="submit"]')?.disabled,
    null,
    { timeout: TIMEOUT },
  );
  await submit.click();
  log(`${label}: pin submitted`);
}

async function waitForReveal(page, label, maxMs = 35_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const screen = await page.evaluate(() => document.querySelector('#app')?.innerHTML ?? '');
    if (screen.includes('screen-coop-reveal') || screen.includes('coop-reveal-map')) {
      log(`${label}: reached reveal screen`);
      return true;
    }
    if (screen.includes('screen-coop-wait')) {
      await page.locator('[data-action="coop-refresh"]').click({ force: true, timeout: 2000 }).catch(() => undefined);
    }
    await page.waitForTimeout(1500);
  }
  const stuck = await page.locator('.screen-coop-wait').isVisible().catch(() => false);
  log(`${label}: reveal timeout (wait screen=${stuck})`);
  return false;
}

async function screenshotBoth(host, guest, name) {
  await host.screenshot({ path: `/tmp/coop-e2e-${name}-host.png`, fullPage: true });
  await guest.screenshot({ path: `/tmp/coop-e2e-${name}-guest.png`, fullPage: true });
  log(`screenshots saved: /tmp/coop-e2e-${name}-*.png`);
}

let host;
let guest;

try {
  log(`Testing ${BASE} with ${HOST} vs ${GUEST}`);
  const browser = await chromium.launch({ headless: true });

  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  host = await ctxA.newPage();
  guest = await ctxB.newPage();
  attachDialogHandler(host);
  attachDialogHandler(guest);
  attachDiagnostics(host, HOST);
  attachDiagnostics(guest, GUEST);

  await login(guest, GUEST);
  await waitForCloudProfile(guest, GUEST);
  await login(host, HOST);

  await sendFriendRequest(host, GUEST);
  await acceptFriendRequest(guest);

  await hostSendCoopInvite(host, GUEST);
  await guestAcceptCoopInvite(guest);
  await hostJoinCoop(host);

  await dropPin(guest, GUEST);
  await dropPin(host, HOST);
  await host.waitForTimeout(3000);
  const hostState = await dumpCoopState(host, HOST);
  const guestState = await dumpCoopState(guest, GUEST);

  const hostReveal = await waitForReveal(host, HOST);
  const guestReveal = await waitForReveal(guest, GUEST);

  await screenshotBoth(host, guest, hostReveal && guestReveal ? 'pass' : 'fail');

  if (!hostReveal || !guestReveal) {
    const hostWait = await host.locator('.screen-coop-wait').isVisible().catch(() => false);
    const guestWait = await guest.locator('.screen-coop-wait').isVisible().catch(() => false);
    console.error('\nFAIL: stuck on wait screen?', { hostReveal, guestReveal, hostWait, guestWait });
    process.exitCode = 1;
  } else {
    console.log('\nPASS: both players reached co-op reveal after pinning.');
  }

  await browser.close();
} catch (err) {
  console.error('\nERROR:', err.message);
  if (host && guest) {
    await screenshotBoth(host, guest, 'error').catch(() => undefined);
  }
  process.exitCode = 1;
}
