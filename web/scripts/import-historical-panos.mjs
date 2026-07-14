#!/usr/bin/env node
/**
 * Import Past-mode panoramas from Wikimedia Commons by exact file title (no search API).
 * CC-licensed 360×180 equirectangular interiors, ruins, and vintage street panos.
 *
 * Usage:
 *   node scripts/import-historical-panos.mjs
 *   node scripts/import-historical-panos.mjs --write-catalog
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(WEB_ROOT, 'public', 'panoramas');
const UA = 'ChronoPinImport/1.0 (https://github.com/DaryoushDjavadi/Chronopin; historical-panos)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @type {Array<{ fileTitle: string; id: string; title: string; region: string; lat: number; lng: number; year: number; pastEra: string; context: string; panoConfig?: object }>} */
const HISTORICAL_TARGETS = [
  {
    fileTitle: 'Christ Church Cathedral Nave 360x180, Dublin, Ireland - Diliff.jpg',
    id: 'dublin-christchurch',
    title: 'Christ Church Cathedral',
    region: 'Dublin, Ireland',
    lat: 53.3434,
    lng: -6.2714,
    year: 1030,
    pastEra: 'medieval',
    context: 'Medieval cathedral nave — guess when this church was founded (11th century).',
  },
  {
    fileTitle: 'Laon Cathedral Interior 360x180, Picardy, France - Diliff.jpg',
    id: 'france-laon-cathedral',
    title: 'Laon Cathedral',
    region: 'Laon, France',
    lat: 49.5636,
    lng: 3.324,
    year: 1200,
    pastEra: 'medieval',
    context: 'Gothic cathedral interior in northern France — guess the era from the stonework.',
  },
  {
    fileTitle: 'Soissons Cathedral Interior 360x180, Picardy, France - Diliff.jpg',
    id: 'france-soissons-cathedral',
    title: 'Soissons Cathedral',
    region: 'Soissons, France',
    lat: 49.3817,
    lng: 3.3239,
    year: 1170,
    pastEra: 'medieval',
    context: 'Medieval cathedral nave in Picardy, north-east France.',
  },
  {
    fileTitle: 'Noyon Cathedral Interior 360x180, Picardy, France - Diliff.jpg',
    id: 'france-noyon-cathedral',
    title: 'Noyon Cathedral',
    region: 'Noyon, France',
    lat: 49.581,
    lng: 3.0,
    year: 1150,
    pastEra: 'medieval',
    context: 'Early Gothic cathedral — one of the first in France (12th century).',
  },
  {
    fileTitle: "St Patrick's Cathedral Nave 360x180, Dublin, Ireland.jpg",
    id: 'dublin-st-patricks-nave',
    title: "St Patrick's Cathedral Nave",
    region: 'Dublin, Ireland',
    lat: 53.3393,
    lng: -6.2714,
    year: 1191,
    pastEra: 'medieval',
    context: "Ireland's national cathedral — guess the medieval foundation era.",
  },
  {
    fileTitle: "St Patrick's Cathedral Choir 360x180, Dublin, Ireland.jpg",
    id: 'dublin-st-patricks-choir',
    title: "St Patrick's Cathedral Choir",
    region: 'Dublin, Ireland',
    lat: 53.3393,
    lng: -6.2714,
    year: 1191,
    pastEra: 'medieval',
    context: 'Gothic choir stalls and vaulting — guess the century of construction.',
  },
  {
    fileTitle: 'Newman University Church Interior 360x180, Dublin, Ireland - Diliff.jpg',
    id: 'dublin-newman-church',
    title: 'Newman University Church',
    region: 'Dublin, Ireland',
    lat: 53.3339,
    lng: -6.2596,
    year: 1856,
    pastEra: 'industrial',
    context: 'Victorian neo-Gothic church — guess when it was completed (mid-19th century).',
  },
  {
    fileTitle: "St Etheldreda's Church Interior 360x180, London, UK - Diliff.jpg",
    id: 'london-st-etheldreda',
    title: "St Etheldreda's Church",
    region: 'London, United Kingdom',
    lat: 51.5154,
    lng: -0.1088,
    year: 1290,
    pastEra: 'medieval',
    context: "London's oldest Catholic church site — medieval origins, guess the era.",
  },
  {
    fileTitle: 'St Mary Abchurch Interior 360x180, London, UK - Diliff.jpg',
    id: 'london-st-mary-abchurch',
    title: 'St Mary Abchurch',
    region: 'London, United Kingdom',
    lat: 51.511,
    lng: -0.085,
    year: 1686,
    pastEra: 'early-modern',
    context: 'Baroque city church rebuilt after the Great Fire — guess the completion year.',
  },
  {
    fileTitle: 'Brompton Oratory 360x180, London, UK - Diliff.jpg',
    id: 'london-brompton',
    title: 'Brompton Oratory',
    region: 'London, United Kingdom',
    lat: 51.4891,
    lng: -0.1702,
    year: 1884,
    pastEra: 'industrial',
    context: 'Neo-baroque oratory — guess the late Victorian completion date.',
  },
  {
    fileTitle: 'St Barnabas Church 360x180, Pimlico, London, UK - Diliff.jpg',
    id: 'london-st-barnabas',
    title: 'St Barnabas Church',
    region: 'London, United Kingdom',
    lat: 51.4891,
    lng: -0.1408,
    year: 1859,
    pastEra: 'industrial',
    context: 'Victorian church interior in Pimlico — guess the decade it was built.',
  },
  {
    fileTitle: 'Kloster Paulinzella, Thüringen, 360x180, 170316, ako (1).jpg',
    id: 'germany-paulinzella',
    title: 'Kloster Paulinzella Ruins',
    region: 'Thuringia, Germany',
    lat: 50.5167,
    lng: 11.4167,
    year: 1124,
    pastEra: 'medieval',
    context: 'Romanesque monastery ruins in the Thuringian Forest — guess the founding century.',
  },
  {
    fileTitle: 'San Diego Panorama DSC 2002-DSC 2007.jpg',
    id: 'vintage-san-diego-2007',
    title: 'San Diego Skyline (2007)',
    region: 'San Diego, USA',
    lat: 32.7157,
    lng: -117.1611,
    year: 2007,
    pastEra: 'vintage-photo',
    context: 'Vintage equirectangular panorama — guess when this photo was taken (~2007).',
  },
  {
    fileTitle: 'Zugbrücken über die Oestermarsch Str in Dortmund.jpg',
    id: 'vintage-dortmund-2009',
    title: 'Dortmund Level Crossing (2009)',
    region: 'Dortmund, Germany',
    lat: 51.5136,
    lng: 7.4653,
    year: 2009,
    pastEra: 'vintage-photo',
    context: 'Street panorama from the late 2000s — guess the photo year.',
  },
  {
    fileTitle: 'Giza pyramid complex - 360.jpg',
    id: 'giza-pyramids',
    title: 'Pyramids of Giza',
    region: 'Giza, Egypt',
    lat: 29.9792,
    lng: 31.1342,
    year: -2560,
    pastEra: 'antiquity',
    context: 'Great Pyramid complex — guess the Old Kingdom construction era (~26th century BCE).',
    panoConfig: { haov: 360, vaov: 62, vOffset: 0, minPitch: -31, maxPitch: 31 },
    allowCylindrical: true,
  },
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
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function isUsable(w, h, allowCylindrical) {
  if (!w || !h || w < 2000) return false;
  const ratio = w / h;
  if (ratio >= 1.85 && ratio <= 2.15) return true;
  if (allowCylindrical && ratio >= 3.5 && ratio <= 7) return true;
  return false;
}

async function fetchBatchInfo(fileTitles) {
  const titles = fileTitles.map((t) => `File:${t}`).join('|');
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(titles)}` +
    `&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1536`;
  const data = await fetchJson(url);
  const out = new Map();
  for (const page of Object.values(data.query?.pages ?? {})) {
    if (page.missing !== undefined) continue;
    const title = page.title?.replace(/^File:/, '') ?? '';
    const info = page.imageinfo?.[0];
    if (info) out.set(title, info);
  }
  return out;
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
    `    year: ${c.year},`,
    `    pastEra: '${c.pastEra}',`,
    `    modes: ['classic', 'past'],`,
  ];
  if (c.panoConfig) lines.push(`    panoConfig: ${JSON.stringify(c.panoConfig)},`);
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

  const BATCH = 5;
  for (let i = 0; i < HISTORICAL_TARGETS.length; i += BATCH) {
    const batch = HISTORICAL_TARGETS.slice(i, i + BATCH);
    if (i > 0) await sleep(8000);

    let infoMap;
    try {
      infoMap = await fetchBatchInfo(batch.map((t) => t.fileTitle));
    } catch (err) {
      console.warn(`[batch fail]`, err.message);
      fail += batch.length;
      continue;
    }

    for (const target of batch) {
      const filename = `${target.id}.jpg`;
      const dest = path.join(OUT_DIR, filename);

      if (await fileExists(dest)) {
        console.log(`[skip exists] ${filename}`);
        skip++;
        catalog.push(buildEntry(target, 'Wikimedia Commons (cached)', 'CC BY-SA'));
        continue;
      }

      const info = infoMap.get(target.fileTitle);
      if (!info) {
        console.warn(`[missing file] ${target.fileTitle}`);
        fail++;
        continue;
      }

      const w = info.width;
      const h = info.height;
      if (!isUsable(w, h, target.allowCylindrical)) {
        console.warn(`[bad ratio ${w}x${h}] ${target.fileTitle}`);
        fail++;
        continue;
      }

      const meta = info.extmetadata ?? {};
      const license = meta.LicenseShortName?.value?.replace(/<[^>]+>/g, '') ?? 'CC BY-SA';
      const artist = meta.Artist?.value?.replace(/<[^>]+>/g, '').trim() ?? 'Wikimedia Commons';

      try {
        const bytes = await downloadJpeg(info.thumburl ?? info.url, dest);
        console.log(`[ok ${w}x${h} ${(bytes / 1024).toFixed(0)}KB] ${filename}`);
        ok++;
        catalog.push(buildEntry(target, `${artist} / Wikimedia Commons`, license));
      } catch (err) {
        console.warn(`[fail] ${target.id}:`, err.message);
        fail++;
      }
    }
  }

  console.log(`\nDone: ${ok} downloaded, ${skip} skipped, ${fail} failed`);

  const outPath = path.join(__dirname, 'generated-historical-catalog.json');
  await writeFile(outPath, JSON.stringify(catalog, null, 2));
  console.log(`Catalog: ${outPath} (${catalog.length} entries)`);

  if (writeCatalog && catalog.length) {
    console.log('\n// Paste into panoramas.ts:\n');
    for (const c of catalog) console.log(formatCatalogEntry(c));
  }
}

function buildEntry(target, attribution, license) {
  return {
    id: target.id,
    filename: `${target.id}.jpg`,
    title: target.title,
    region: target.region,
    lat: target.lat,
    lng: target.lng,
    year: target.year,
    pastEra: target.pastEra,
    modes: ['classic', 'past'],
    ...(target.panoConfig ? { panoConfig: target.panoConfig } : {}),
    context: target.context,
    attribution,
    license,
    source: 'wikimedia',
    isNew: true,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
