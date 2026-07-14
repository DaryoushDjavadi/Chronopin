#!/usr/bin/env node
/**
 * Discover & download 360° equirectangular panoramas from Wikimedia Commons via search API.
 * Validates ~2:1 aspect ratio. Rate-limited to avoid 429 errors.
 *
 * Usage:
 *   node scripts/import-wikimedia-panos.mjs
 *   node scripts/import-wikimedia-panos.mjs --write-catalog
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(WEB_ROOT, 'public', 'panoramas');
const UA = 'ChronoPinImport/1.0 (wikimedia-search)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Search queries → catalog metadata (one hit per region). */
const SEARCH_TARGETS = [
  { query: '360 equirectangular Machu Picchu', id: 'machu-picchu', title: 'Machu Picchu', region: 'Cusco Region, Peru', lat: -13.1631, lng: -72.545 },
  { query: '360 equirectangular Angkor Wat', id: 'angkor-wat', title: 'Angkor Wat', region: 'Siem Reap, Cambodia', lat: 13.4125, lng: 103.8667, year: 1150 },
  { query: '360 equirectangular Christ Redeemer Rio', id: 'rio-christ', title: 'Christ the Redeemer', region: 'Rio de Janeiro, Brazil', lat: -22.9519, lng: -43.2105 },
  { query: '360 equirectangular Grand Canyon', id: 'grand-canyon', title: 'Grand Canyon', region: 'Arizona, USA', lat: 36.0544, lng: -112.1401 },
  { query: '360 equirectangular Taj Mahal', id: 'taj-mahal', title: 'Taj Mahal', region: 'Agra, India', lat: 27.1751, lng: 78.0421, year: 1653 },
  { query: '360 equirectangular Petra Treasury', id: 'petra-treasury', title: 'Petra Treasury', region: "Ma'an, Jordan", lat: 30.322, lng: 35.4519 },
  { query: '360 equirectangular Pyramids Giza', id: 'giza-pyramids', title: 'Pyramids of Giza', region: 'Giza, Egypt', lat: 29.9792, lng: 31.1342 },
  { query: '360 equirectangular Sydney Opera House', id: 'sydney-opera-wm', title: 'Sydney Opera House', region: 'Sydney, Australia', lat: -33.8568, lng: 151.2153 },
  { query: '360 equirectangular Golden Gate Bridge', id: 'golden-gate-wm', title: 'Golden Gate Bridge', region: 'San Francisco, USA', lat: 37.8199, lng: -122.4783 },
  { query: '360 equirectangular Venice San Marco', id: 'venice-st-marks-wm', title: "St Mark's Square", region: 'Venice, Italy', lat: 45.434, lng: 12.338 },
  { query: '360 equirectangular Colosseum Rome', id: 'rome-colosseum-wm', title: 'Colosseum', region: 'Rome, Italy', lat: 41.8902, lng: 12.4922 },
  { query: '360 equirectangular Hagia Sophia', id: 'hagia-sophia-wm', title: 'Hagia Sophia', region: 'Istanbul, Turkey', lat: 41.0086, lng: 28.98 },
  { query: '360 equirectangular Uluru', id: 'uluru-wm', title: 'Uluru', region: 'Northern Territory, Australia', lat: -25.3444, lng: 131.0369 },
  { query: '360 equirectangular Niagara Falls', id: 'niagara-wm', title: 'Niagara Falls', region: 'Ontario, Canada', lat: 43.0828, lng: -79.0742 },
  { query: '360 equirectangular Mount Fuji', id: 'fuji-wm', title: 'Mount Fuji', region: 'Honshu, Japan', lat: 35.5175, lng: 138.7556 },
  { query: '360 equirectangular Chichen Itza', id: 'chichen-itza-wm', title: 'Chichen Itza', region: 'Yucatán, Mexico', lat: 20.6843, lng: -88.5678 },
  { query: '360 equirectangular Banff lake', id: 'banff-wm', title: 'Banff National Park', region: 'Alberta, Canada', lat: 51.4968, lng: -115.9281 },
  { query: '360 equirectangular Santorini', id: 'santorini-wm', title: 'Santorini', region: 'Santorini, Greece', lat: 36.3932, lng: 25.4615 },
  { query: '360 equirectangular Monument Valley', id: 'monument-valley-wm', title: 'Monument Valley', region: 'Utah, USA', lat: 36.9833, lng: -110.0833 },
  { query: '360 equirectangular Edinburgh Castle', id: 'edinburgh-wm', title: 'Edinburgh Castle', region: 'Edinburgh, Scotland', lat: 55.9486, lng: -3.1999 },
];

async function fileExists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function isEquirectangular(w, h) {
  if (!w || !h) return false;
  const ratio = w / h;
  return ratio >= 1.85 && ratio <= 2.15 && w >= 3000;
}

async function searchBest360(query) {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search` +
    `&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8&gsrnamespace=6` +
    `&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=2048`;
  const data = await fetchJson(url);
  const pages = Object.values(data.query?.pages ?? {});
  for (const page of pages.sort((a, b) => (b.index ?? 0) - (a.index ?? 0))) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const w = info.width;
    const h = info.height;
    if (!isEquirectangular(w, h)) continue;
    const title = page.title?.replace(/^File:/, '') ?? '';
    const meta = info.extmetadata ?? {};
    const license = meta.LicenseShortName?.value?.replace(/<[^>]+>/g, '') ?? 'CC BY-SA';
    const artist = meta.Artist?.value?.replace(/<[^>]+>/g, '').trim() ?? 'Wikimedia Commons';
    return { title, url: info.thumburl ?? info.url, width: w, height: h, license, artist };
  }
  return null;
}

async function downloadJpeg(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return buf.length;
}

function formatCatalogEntry(c) {
  const lines = [
    '  {',
    `    id: '${c.id}',`,
    `    filename: '${c.filename}',`,
    `    title: '${c.title.replace(/'/g, "\\'")}',`,
    `    region: '${c.region.replace(/'/g, "\\'")}',`,
    `    lat: ${c.lat},`,
    `    lng: ${c.lng},`,
  ];
  if (c.year != null) lines.push(`    year: ${c.year},`);
  lines.push(`    modes: [${c.modes.map((m) => `'${m}'`).join(', ')}],`);
  lines.push(`    context: '${c.context.replace(/'/g, "\\'")}',`);
  lines.push(`    attribution: '${c.attribution.replace(/'/g, "\\'")}',`);
  lines.push(`    license: '${c.license}',`);
  lines.push(`    source: 'wikimedia',`);
  lines.push(`    isNew: true,`);
  lines.push('  },');
  return lines.join('\n');
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const writeCatalog = process.argv.includes('--write-catalog');
  const catalog = [];
  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const target of SEARCH_TARGETS) {
    const filename = `${target.id}.jpg`;
    const dest = path.join(OUT_DIR, filename);

    if (await fileExists(dest)) {
      console.log(`[skip exists] ${filename}`);
      skip++;
      continue;
    }

    await sleep(1200);

    try {
      const hit = await searchBest360(target.query);
      if (!hit) {
        console.warn(`[no match] ${target.query}`);
        fail++;
        continue;
      }
      const bytes = await downloadJpeg(hit.url, dest);
      console.log(`[ok ${hit.width}x${hit.height} ${(bytes / 1024).toFixed(0)}KB] ${filename} ← ${hit.title.slice(0, 50)}`);
      ok++;
      const modes = target.year != null ? ['classic', 'past'] : ['classic'];
      catalog.push({
        id: target.id,
        filename,
        title: target.title,
        region: target.region,
        lat: target.lat,
        lng: target.lng,
        ...(target.year != null ? { year: target.year } : {}),
        modes,
        context: `360° equirectangular panorama — ${target.title}.`,
        attribution: `${hit.artist} / Wikimedia Commons`,
        license: hit.license,
        source: 'wikimedia',
        isNew: true,
      });
    } catch (err) {
      console.warn(`[fail] ${target.id}:`, err.message);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} downloaded, ${skip} skipped, ${fail} failed`);

  if (catalog.length) {
    const outPath = path.join(__dirname, 'generated-wikimedia-catalog.json');
    await writeFile(outPath, JSON.stringify(catalog, null, 2));
    console.log(`Catalog: ${outPath}`);
    if (writeCatalog) {
      console.log('\n// Paste into panoramas.ts:\n');
      for (const c of catalog) console.log(formatCatalogEntry(c));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
