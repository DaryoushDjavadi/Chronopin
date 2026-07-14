#!/usr/bin/env node
/**
 * Import street-level panoramas from Panoramax, Mapillary, and KartaView.
 *
 * Usage:
 *   node scripts/import-external-panos.mjs [--source panoramax|mapillary|kartaview|all]
 *
 * Mapillary requires MAPILLARY_ACCESS_TOKEN (see .env.example).
 * Appends catalog snippets to stdout — merge into src/data/panoramas.ts manually
 * or pipe to a patch file for review.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(WEB_ROOT, 'public', 'panoramas');
const UA = 'ChronoPinImport/1.0';

const MAPILLARY_TOKEN = process.env.MAPILLARY_ACCESS_TOKEN?.trim() ?? '';

const REGIONS = [
  { id: 'paris', label: 'Paris', region: 'Paris, France', bbox: '2.29,48.85,2.31,48.86' },
  { id: 'london', label: 'London', region: 'London, United Kingdom', bbox: '-0.13,51.50,-0.11,51.52' },
  { id: 'berlin', label: 'Berlin', region: 'Berlin, Germany', bbox: '13.37,52.50,13.41,52.53' },
  { id: 'tokyo', label: 'Tokyo', region: 'Tokyo, Japan', bbox: '139.69,35.68,139.71,35.70' },
  { id: 'nyc', label: 'NYC', region: 'New York, USA', bbox: '-74.01,40.75,-73.98,40.77' },
  { id: 'sydney', label: 'Sydney', region: 'Sydney, Australia', bbox: '151.20,-33.88,151.22,-33.86' },
  { id: 'barcelona', label: 'Barcelona', region: 'Barcelona, Spain', bbox: '2.16,41.38,2.18,41.40' },
  { id: 'cape-town', label: 'Cape Town', region: 'Cape Town, South Africa', bbox: '18.41,-33.93,18.44,-33.91' },
  { id: 'mumbai', label: 'Mumbai', region: 'Mumbai, India', bbox: '72.82,18.92,72.85,18.95' },
];

const MAPILLARY_BBOXES = [
  { id: 'paris', label: 'Paris', region: 'Paris, France', bbox: '2.294,48.856,2.298,48.860' },
  { id: 'london', label: 'London', region: 'London, United Kingdom', bbox: '-0.128,51.503,-0.124,51.507' },
  { id: 'berlin', label: 'Berlin', region: 'Berlin, Germany', bbox: '13.377,52.517,13.381,52.521' },
  { id: 'tokyo', label: 'Tokyo', region: 'Tokyo, Japan', bbox: '139.691,35.689,139.695,35.693' },
  { id: 'nyc', label: 'NYC', region: 'New York, USA', bbox: '-73.992,40.756,-73.988,40.760' },
];

const KARTAVIEW_SEQUENCES = [
  6187609, 6894426, 7000000, 7500000, 8000000, 8500000, 9000000, 9500000, 10000000,
];

function parseArgs() {
  const idx = process.argv.indexOf('--source');
  const source = idx >= 0 ? process.argv[idx + 1] : 'all';
  if (!['all', 'panoramax', 'mapillary', 'kartaview'].includes(source)) {
    console.error('Unknown --source. Use panoramax | mapillary | kartaview | all');
    process.exit(1);
  }
  return source;
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function downloadJpeg(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error(`not jpeg (${buf.length} bytes)`);
  await writeFile(dest, buf);
  return buf.length;
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA } });
    return res.ok;
  } catch {
    return false;
  }
}

function is360Model(model = '') {
  const m = model.toLowerCase();
  return ['imajbox', 'theta', 'insta', 'gopro max', 'virb', 'oners', 'garmin'].some((k) => m.includes(k));
}

async function importPanoramax() {
  const catalog = [];
  for (const r of REGIONS) {
    try {
      const data = await fetchJson(`https://api.panoramax.xyz/api/search?bbox=${r.bbox}&limit=30`);
      let best = null;
      for (const f of data.features ?? []) {
        const model = f.properties?.exif?.['Exif.Image.Model'] ?? '';
        const sd = f.assets?.sd?.href ?? f.assets?.hd?.href;
        if (!sd) continue;
        const [lng, lat] = f.geometry.coordinates;
        const item = { is360: is360Model(model), id: f.id, lat, lng, url: sd, model };
        if (!best || (item.is360 && !best.is360)) best = item;
      }
      if (!best) {
        console.warn(`[panoramax] skip ${r.label}: no results`);
        continue;
      }
      const fileId = `${r.id}-panoramax`;
      const filename = `${fileId}.jpg`;
      const dest = path.join(OUT_DIR, filename);
      try {
        await downloadJpeg(best.url, dest);
      } catch {
        await downloadJpeg(`https://api.panoramax.xyz/api/pictures/${best.id}/sd.jpg`, dest);
      }
      console.log(`[panoramax] saved ${filename}`);
      catalog.push({
        id: fileId,
        filename,
        title: `${r.label} Street View`,
        region: r.region,
        lat: best.lat,
        lng: best.lng,
        modes: ['classic'],
        ...(best.is360 ? { panoConfig: { haov: 360, vaov: 90, vOffset: 0 } } : {}),
        context: `Crowdsourced street-level imagery in ${r.label} via Panoramax.`,
        attribution: 'Panoramax contributors',
        license: 'CC BY-SA 4.0',
        source: 'panoramax',
        sourceId: best.id,
        isNew: true,
      });
    } catch (err) {
      console.warn(`[panoramax] ${r.label}:`, err.message);
    }
  }
  return catalog;
}

async function importMapillary() {
  if (!MAPILLARY_TOKEN) {
    console.warn('[mapillary] skip — set MAPILLARY_ACCESS_TOKEN (https://www.mapillary.com/developer)');
    return [];
  }
  const catalog = [];
  for (const r of MAPILLARY_BBOXES) {
    try {
      const url =
        `https://graph.mapillary.com/images?access_token=${MAPILLARY_TOKEN}` +
        `&fields=id,thumb_2048_url,computed_geometry,is_pano,captured_at` +
        `&bbox=${r.bbox}&is_pano=true&limit=5`;
      const data = await fetchJson(url);
      const image = data.data?.[0];
      if (!image?.thumb_2048_url) {
        console.warn(`[mapillary] skip ${r.label}: no 360 pano in bbox`);
        continue;
      }
      const [lng, lat] = image.computed_geometry.coordinates;
      const fileId = `${r.id}-mapillary`;
      const filename = `${fileId}.jpg`;
      await downloadJpeg(image.thumb_2048_url, path.join(OUT_DIR, filename));
      console.log(`[mapillary] saved ${filename}`);
      catalog.push({
        id: fileId,
        filename,
        title: `${r.label} Street View`,
        region: r.region,
        lat,
        lng,
        modes: ['classic'],
        panoConfig: { haov: 360, vaov: 90, vOffset: 0 },
        context: `Crowdsourced Mapillary 360° street panorama in ${r.label}.`,
        attribution: 'Mapillary contributors',
        license: 'CC BY-SA 4.0',
        source: 'mapillary',
        sourceId: String(image.id),
        isNew: true,
      });
    } catch (err) {
      console.warn(`[mapillary] ${r.label}:`, err.message);
    }
  }
  return catalog;
}

async function importKartaview() {
  const catalog = [];
  const seenRegions = new Set();
  for (const sequenceId of KARTAVIEW_SEQUENCES) {
    if (seenRegions.size >= 5) break;
    try {
      const data = await fetchJson(
        `https://api.openstreetcam.org/2.0/photo/?sequenceId=${sequenceId}&limit=80&projection=SPHERE`,
      );
      const photos = data.result?.data ?? [];
      for (const p of photos) {
        if (p.projection !== 'SPHERE' || p.fieldOfView !== '360') continue;
        const proc = p.fileurlProc;
        if (!proc || !(await headOk(proc))) continue;
        const lat = parseFloat(p.lat);
        const lng = parseFloat(p.lng);
        const regionKey = `${lat.toFixed(1)},${lng.toFixed(1)}`;
        if (seenRegions.has(regionKey)) continue;
        seenRegions.add(regionKey);
        const slug = `kartaview-${p.id}`;
        const filename = `${slug}.jpg`;
        await downloadJpeg(proc, path.join(OUT_DIR, filename));
        console.log(`[kartaview] saved ${filename}`);
        catalog.push({
          id: slug,
          filename,
          title: 'Street View (KartaView)',
          region: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          lat,
          lng,
          modes: ['classic'],
          panoConfig: { haov: 360, vaov: 90, vOffset: 0 },
          context: 'Crowdsourced KartaView 360° street panorama (CC BY-SA).',
          attribution: 'KartaView / OpenStreetCam contributors',
          license: 'CC BY-SA 4.0',
          source: 'kartaview',
          sourceId: String(p.id),
          isNew: true,
        });
        break;
      }
    } catch (err) {
      console.warn(`[kartaview] sequence ${sequenceId}:`, err.message);
    }
  }
  if (!catalog.length) {
    console.warn('[kartaview] no downloadable SPHERE photos found (CDN may be unavailable)');
  }
  return catalog;
}

function printCatalog(entries) {
  if (!entries.length) return;
  console.log('\n// Paste into src/data/panoramas.ts:\n');
  for (const e of entries) {
    console.log(JSON.stringify(e, null, 2) + ',');
  }
}

async function main() {
  const source = parseArgs();
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  const all = [];
  if (source === 'all' || source === 'panoramax') all.push(...(await importPanoramax()));
  if (source === 'all' || source === 'mapillary') all.push(...(await importMapillary()));
  if (source === 'all' || source === 'kartaview') all.push(...(await importKartaview()));

  printCatalog(all);
  console.log(`\nDone — ${all.length} scene(s) imported to public/panoramas/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
