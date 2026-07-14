#!/usr/bin/env node
/**
 * Import street-level 360° panoramas from Panoramax, Mapillary, and KartaView.
 *
 * Usage:
 *   node scripts/import-external-panos.mjs [--source panoramax|mapillary|kartaview|all] [--merge] [--only city1,city2]
 *
 * Mapillary: set MAPILLARY_ACCESS_TOKEN in web/.env (https://www.mapillary.com/developer)
 * --merge: append new entries to src/data/panoramas.ts automatically
 *
 * Note: OpenStreetMap / MapLibre / Mapbox provide map tiles for pinning — not 360° photos.
 */

import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(WEB_ROOT, 'public', 'panoramas');
const CATALOG_TS = path.join(WEB_ROOT, 'src', 'data', 'panoramas.ts');
const UA = 'ChronoPinImport/1.0';

loadDotEnv();

const MAPILLARY_TOKEN = process.env.MAPILLARY_ACCESS_TOKEN?.trim() ?? '';

/** bbox = minLng,minLat,maxLng,maxLat */
const REGIONS = [
  { id: 'paris', label: 'Paris', region: 'Paris, France', bbox: '2.29,48.84,2.37,48.90' },
  { id: 'london', label: 'London', region: 'London, United Kingdom', bbox: '-0.15,51.49,-0.07,51.53' },
  { id: 'berlin', label: 'Berlin', region: 'Berlin, Germany', bbox: '13.35,52.49,13.45,52.55' },
  { id: 'tokyo', label: 'Tokyo', region: 'Tokyo, Japan', bbox: '139.66,35.66,139.76,35.72' },
  { id: 'nyc', label: 'NYC', region: 'New York, USA', bbox: '-74.02,40.74,-73.96,40.80' },
  { id: 'sydney', label: 'Sydney', region: 'Sydney, Australia', bbox: '151.18,-33.90,151.24,-33.84' },
  { id: 'barcelona', label: 'Barcelona', region: 'Barcelona, Spain', bbox: '2.14,41.36,2.20,41.42' },
  { id: 'cape-town', label: 'Cape Town', region: 'Cape Town, South Africa', bbox: '18.40,-33.95,18.46,-33.89' },
  { id: 'mumbai', label: 'Mumbai', region: 'Mumbai, India', bbox: '72.80,18.90,72.88,18.98' },
  { id: 'rome', label: 'Rome', region: 'Rome, Italy', bbox: '12.46,41.87,12.52,41.93' },
  { id: 'amsterdam', label: 'Amsterdam', region: 'Amsterdam, Netherlands', bbox: '4.86,52.35,4.94,52.39' },
  { id: 'lisbon', label: 'Lisbon', region: 'Lisbon, Portugal', bbox: '-9.17,38.69,-9.11,38.75' },
  { id: 'istanbul', label: 'Istanbul', region: 'Istanbul, Turkey', bbox: '28.95,40.98,29.03,41.04' },
  { id: 'dubai', label: 'Dubai', region: 'Dubai, UAE', bbox: '55.20,25.15,55.35,25.28' },
  { id: 'singapore', label: 'Singapore', region: 'Singapore', bbox: '103.82,1.25,103.90,1.32' },
  { id: 'seoul', label: 'Seoul', region: 'Seoul, South Korea', bbox: '126.95,37.53,127.03,37.59' },
  { id: 'mexico-city', label: 'Mexico City', region: 'Mexico City, Mexico', bbox: '-99.16,19.40,-99.10,19.46' },
  { id: 'buenos-aires', label: 'Buenos Aires', region: 'Buenos Aires, Argentina', bbox: '-58.42,-34.63,-58.36,-34.57' },
  { id: 'cairo', label: 'Cairo', region: 'Cairo, Egypt', bbox: '31.20,30.02,31.28,30.08' },
  { id: 'stockholm', label: 'Stockholm', region: 'Stockholm, Sweden', bbox: '18.04,59.31,18.10,59.35' },
  { id: 'prague', label: 'Prague', region: 'Prague, Czech Republic', bbox: '14.39,50.07,14.45,50.11' },
  { id: 'montreal', label: 'Montreal', region: 'Montreal, Canada', bbox: '-73.60,45.49,-73.54,45.53' },
  { id: 'los-angeles', label: 'Los Angeles', region: 'Los Angeles, USA', bbox: '-118.28,34.03,-118.22,34.09' },
  { id: 'san-francisco', label: 'San Francisco', region: 'San Francisco, USA', bbox: '-122.44,37.75,-122.38,37.81' },
  { id: 'hong-kong', label: 'Hong Kong', region: 'Hong Kong', bbox: '114.14,22.26,114.20,22.32' },
  { id: 'bangkok', label: 'Bangkok', region: 'Bangkok, Thailand', bbox: '100.47,13.72,100.53,13.78' },
  { id: 'nairobi', label: 'Nairobi', region: 'Nairobi, Kenya', bbox: '36.79,-1.31,36.85,-1.25' },
  { id: 'lagos', label: 'Lagos', region: 'Lagos, Nigeria', bbox: '3.35,6.42,3.41,6.48' },
  { id: 'helsinki', label: 'Helsinki', region: 'Helsinki, Finland', bbox: '24.91,60.15,24.97,60.19' },
  { id: 'oslo', label: 'Oslo', region: 'Oslo, Norway', bbox: '10.71,59.89,10.77,59.95' },
  { id: 'jakarta', label: 'Jakarta', region: 'Jakarta, Indonesia', bbox: '106.78,-6.25,106.92,-6.10' },
  { id: 'bucharest', label: 'Bucharest', region: 'Bucharest, Romania', bbox: '26.06,44.41,26.12,44.47' },
  { id: 'warsaw', label: 'Warsaw', region: 'Warsaw, Poland', bbox: '21.00,52.22,21.06,52.26' },
  { id: 'athens', label: 'Athens', region: 'Athens, Greece', bbox: '23.71,37.96,23.77,38.00' },
  { id: 'vienna', label: 'Vienna', region: 'Vienna, Austria', bbox: '16.35,48.19,16.41,48.23' },
  { id: 'johannesburg', label: 'Johannesburg', region: 'Johannesburg, South Africa', bbox: '27.98,-26.22,28.06,-26.16' },
  { id: 'casablanca', label: 'Casablanca', region: 'Casablanca, Morocco', bbox: '-7.64,33.57,-7.58,33.61' },
  { id: 'sao-paulo', label: 'São Paulo', region: 'São Paulo, Brazil', bbox: '-46.68,-23.58,-46.62,-23.52' },
  { id: 'rio-de-janeiro', label: 'Rio de Janeiro', region: 'Rio de Janeiro, Brazil', bbox: '-43.20,-22.95,-43.14,-22.89' },
  { id: 'lima', label: 'Lima', region: 'Lima, Peru', bbox: '-77.06,-12.08,-77.00,-12.02' },
  { id: 'santiago', label: 'Santiago', region: 'Santiago, Chile', bbox: '-70.68,-33.47,-70.62,-33.41' },
  { id: 'bogota', label: 'Bogotá', region: 'Bogotá, Colombia', bbox: '-74.10,4.60,-74.04,4.66' },
  { id: 'beijing', label: 'Beijing', region: 'Beijing, China', bbox: '116.38,39.88,116.42,39.92' },
  { id: 'shanghai', label: 'Shanghai', region: 'Shanghai, China', bbox: '121.46,31.22,121.50,31.26' },
  { id: 'manila', label: 'Manila', region: 'Manila, Philippines', bbox: '120.97,14.58,121.01,14.62' },
  { id: 'kuala-lumpur', label: 'Kuala Lumpur', region: 'Kuala Lumpur, Malaysia', bbox: '101.68,3.13,101.72,3.17' },
  { id: 'delhi', label: 'Delhi', region: 'Delhi, India', bbox: '77.20,28.60,77.26,28.66' },
  { id: 'hanoi', label: 'Hanoi', region: 'Hanoi, Vietnam', bbox: '105.83,21.01,105.87,21.05' },
  { id: 'auckland', label: 'Auckland', region: 'Auckland, New Zealand', bbox: '174.75,-36.87,174.79,-36.83' },
  { id: 'vancouver', label: 'Vancouver', region: 'Vancouver, Canada', bbox: '-123.14,49.27,-123.08,49.31' },
  { id: 'miami', label: 'Miami', region: 'Miami, USA', bbox: '-80.22,25.75,-80.16,25.81' },
  { id: 'tel-aviv', label: 'Tel Aviv', region: 'Tel Aviv, Israel', bbox: '34.76,32.06,34.80,32.10' },
  { id: 'panama-city', label: 'Panama City', region: 'Panama City, Panama', bbox: '-79.54,8.97,-79.50,9.01' },
  { id: 'guadalajara', label: 'Guadalajara', region: 'Guadalajara, Mexico', bbox: '-103.37,20.65,-103.31,20.71' },
];

const KARTAVIEW_FALLBACK_SEQUENCES = [
  { sequenceId: 6187609, label: 'Jakarta', region: 'Jakarta, Indonesia', lat: -6.193911, lng: 106.84935 },
];

function loadDotEnv() {
  try {
    const envPath = path.join(WEB_ROOT, '.env');
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* optional */
  }
}

function parseArgs() {
  const idx = process.argv.indexOf('--source');
  const source = idx >= 0 ? process.argv[idx + 1] : 'all';
  const merge = process.argv.includes('--merge');
  const onlyIdx = process.argv.indexOf('--only');
  const only =
    onlyIdx >= 0
      ? process.argv[onlyIdx + 1]
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean) ?? []
      : null;
  if (!['all', 'panoramax', 'mapillary', 'kartaview'].includes(source)) {
    console.error('Unknown --source. Use panoramax | mapillary | kartaview | all');
    process.exit(1);
  }
  return { source, merge, only };
}

function filterRegions(only) {
  if (!only?.length) return REGIONS;
  const set = new Set(only);
  return REGIONS.filter((r) => set.has(r.id));
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function jpegDimensions(buf) {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    const len = buf.readUInt16BE(i + 2);
    if (len < 2) break;
    i += 2 + len;
  }
  return null;
}

function isEquirectangular(w, h) {
  if (!w || !h) return false;
  const ratio = w / h;
  return ratio >= 1.85 && ratio <= 2.15;
}

async function downloadJpeg(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error(`not jpeg (${buf.length} bytes)`);
  await writeFile(dest, buf);
  return buf;
}

function is360Model(model = '') {
  const m = model.toLowerCase();
  return ['imajbox', 'theta', 'insta', 'gopro max', 'virb', 'oners', 'garmin', 'madv'].some((k) =>
    m.includes(k),
  );
}

function scorePanoramaxFeature(f) {
  const model = f.properties?.exif?.['Exif.Image.Model'] ?? '';
  const hasHd = Boolean(f.assets?.hd?.href);
  const w = f.properties?.width ?? 0;
  let score = 0;
  if (is360Model(model)) score += 10;
  if (hasHd) score += 3;
  if (w >= 6000) score += 2;
  else if (w >= 4000) score += 1;
  return score;
}

async function importPanoramax(regions = REGIONS) {
  const catalog = [];
  for (const r of regions) {
    const fileId = `${r.id}-panoramax`;
    const filename = `${fileId}.jpg`;
    const dest = path.join(OUT_DIR, filename);

    try {
      const data = await fetchJson(`https://api.panoramax.xyz/api/search?bbox=${r.bbox}&limit=40`);
      const features = (data.features ?? []).sort(
        (a, b) => scorePanoramaxFeature(b) - scorePanoramaxFeature(a),
      );
      let best = null;
      for (const f of features) {
        const sd = f.assets?.hd?.href ?? f.assets?.sd?.href;
        if (!sd) continue;
        const [lng, lat] = f.geometry.coordinates;
        const model = f.properties?.exif?.['Exif.Image.Model'] ?? '';
        best = { is360: is360Model(model), id: f.id, lat, lng, url: sd, model, score: scorePanoramaxFeature(f) };
        if (best.is360 && best.score >= 10) break;
      }
      if (!best) {
        console.warn(`[panoramax] skip ${r.label}: no results`);
        continue;
      }

      let buf;
      try {
        buf = await downloadJpeg(best.url, dest);
      } catch {
        buf = await downloadJpeg(`https://api.panoramax.xyz/api/pictures/${best.id}/sd.jpg`, dest);
      }
      const dim = jpegDimensions(buf);
      const eq = dim ? isEquirectangular(dim.width, dim.height) : false;
      console.log(
        `[panoramax] ${filename} ${dim ? `${dim.width}x${dim.height}` : '?'} 360=${best.is360} eq=${eq}`,
      );

      catalog.push({
        id: fileId,
        filename,
        title: `${r.label} Street View`,
        region: r.region,
        lat: best.lat,
        lng: best.lng,
        modes: ['classic'],
        ...(best.is360 || eq ? { panoConfig: { haov: 360, vaov: 90, vOffset: 0 } } : {}),
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
    console.warn('[mapillary] skip — set MAPILLARY_ACCESS_TOKEN in web/.env');
    console.warn('          → https://www.mapillary.com/developer');
    return [];
  }
  const catalog = [];
  for (const r of REGIONS) {
    const fileId = `${r.id}-mapillary`;
    const filename = `${fileId}.jpg`;
    const dest = path.join(OUT_DIR, filename);

    try {
      const url =
        `https://graph.mapillary.com/images?access_token=${MAPILLARY_TOKEN}` +
        `&fields=id,thumb_2048_url,computed_geometry,is_pano,captured_at,width,height` +
        `&bbox=${r.bbox}&is_pano=true&limit=15`;
      const data = await fetchJson(url);
      const images = data.data ?? [];
      if (!images.length) {
        console.warn(`[mapillary] skip ${r.label}: no 360 pano in bbox`);
        continue;
      }
      const image = images[0];
      if (!image?.thumb_2048_url) continue;

      const buf = await downloadJpeg(image.thumb_2048_url, dest);
      const dim = jpegDimensions(buf);
      const [lng, lat] = image.computed_geometry.coordinates;
      console.log(`[mapillary] ${filename} ${dim ? `${dim.width}x${dim.height}` : '?'}`);

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

function bboxToKartaView(r) {
  const [minLng, minLat, maxLng, maxLat] = r.bbox.split(',').map(Number);
  return { tLeft: `${maxLat},${minLng}`, bRight: `${minLat},${maxLng}` };
}

async function importKartaviewForRegion(r) {
  const { tLeft, bRight } = bboxToKartaView(r);
  const seqData = await fetchJson(
    `https://api.openstreetcam.org/2.0/sequence/?tLeft=${tLeft}&bRight=${bRight}&limit=8`,
  );
  const sequences = seqData.result?.data ?? [];

  for (const seq of sequences.slice(0, 5)) {
    const photoData = await fetchJson(
      `https://api.openstreetcam.org/2.0/photo/?sequenceId=${seq.id}&limit=30&projection=SPHERE`,
    );
    for (const p of photoData.result?.data ?? []) {
      if (p.projection !== 'SPHERE' || p.fieldOfView !== '360' || !p.fileurlProc) continue;
      const lat = parseFloat(p.lat);
      const lng = parseFloat(p.lng);
      const fileId = `${r.id}-kartaview`;
      const filename = `${fileId}.jpg`;
      const dest = path.join(OUT_DIR, filename);
      const buf = await downloadJpeg(p.fileurlProc, dest);
      const dim = jpegDimensions(buf);
      console.log(
        `[kartaview] ${filename} seq=${seq.id} ${dim ? `${dim.width}x${dim.height}` : '?'}`,
      );
      return {
        id: fileId,
        filename,
        title: `${r.label} Street View`,
        region: r.region,
        lat,
        lng,
        modes: ['classic'],
        panoConfig: { haov: 360, vaov: 90, vOffset: 0 },
        context: `Crowdsourced KartaView 360° street panorama in ${r.label}.`,
        attribution: 'KartaView / OpenStreetCam contributors',
        license: 'CC BY-SA 4.0',
        source: 'kartaview',
        sourceId: String(p.id),
        isNew: true,
      };
    }
  }
  return null;
}

async function importKartaviewFallback(entry) {
  const fileId = `${entry.label.toLowerCase().replace(/\s+/g, '-')}-kartaview`;
  const filename = `${fileId}.jpg`;
  const dest = path.join(OUT_DIR, filename);
  if (existsSync(dest)) return null;

  const photoData = await fetchJson(
    `https://api.openstreetcam.org/2.0/photo/?sequenceId=${entry.sequenceId}&limit=5&projection=SPHERE`,
  );
  const p = (photoData.result?.data ?? []).find(
    (x) => x.projection === 'SPHERE' && x.fieldOfView === '360' && x.fileurlProc,
  );
  if (!p) return null;

  await downloadJpeg(p.fileurlProc, dest);
  console.log(`[kartaview] fallback ${filename} seq=${entry.sequenceId}`);
  return {
    id: fileId,
    filename,
    title: `${entry.label} Street View`,
    region: entry.region,
    lat: parseFloat(p.lat) || entry.lat,
    lng: parseFloat(p.lng) || entry.lng,
    modes: ['classic'],
    panoConfig: { haov: 360, vaov: 90, vOffset: 0 },
    context: `Crowdsourced KartaView 360° street panorama in ${entry.label}.`,
    attribution: 'KartaView / OpenStreetCam contributors',
    license: 'CC BY-SA 4.0',
    source: 'kartaview',
    sourceId: String(p.id),
    isNew: true,
  };
}

async function importKartaview() {
  const catalog = [];
  for (const r of REGIONS) {
    try {
      const entry = await importKartaviewForRegion(r);
      if (entry) catalog.push(entry);
    } catch (err) {
      console.warn(`[kartaview] ${r.label}:`, err.message);
    }
  }
  for (const fb of KARTAVIEW_FALLBACK_SEQUENCES) {
    try {
      const entry = await importKartaviewFallback(fb);
      if (entry) catalog.push(entry);
    } catch (err) {
      console.warn(`[kartaview] fallback ${fb.label}:`, err.message);
    }
  }
  if (!catalog.length) {
    console.warn('[kartaview] no 360° SPHERE photos found in searched regions');
  }
  return catalog;
}

function formatCatalogEntry(e) {
  const lines = [
    '  {',
    `    id: '${e.id}',`,
    `    filename: '${e.filename}',`,
    `    title: '${e.title.replace(/'/g, "\\'")}',`,
    `    region: '${e.region.replace(/'/g, "\\'")}',`,
    `    lat: ${e.lat},`,
    `    lng: ${e.lng},`,
  ];
  if (e.panoConfig) {
    lines.push(`    panoConfig: { haov: 360, vaov: 90, vOffset: 0 },`);
  }
  lines.push(`    modes: [${e.modes.map((m) => `'${m}'`).join(', ')}],`);
  lines.push(`    context: '${e.context.replace(/'/g, "\\'")}',`);
  lines.push(`    attribution: '${e.attribution.replace(/'/g, "\\'")}',`);
  lines.push(`    license: '${e.license}',`);
  lines.push(`    source: '${e.source}',`);
  if (e.sourceId) lines.push(`    sourceId: '${e.sourceId}',`);
  lines.push(`    isNew: true,`);
  lines.push('  },');
  return lines.join('\n');
}

async function mergeIntoPanoramasTs(entries) {
  if (!entries.length) return 0;
  let ts = await readFile(CATALOG_TS, 'utf8');
  const existing = new Set([...ts.matchAll(/id: '([^']+)'/g)].map((m) => m[1]));
  const fresh = entries.filter((e) => !existing.has(e.id));
  if (!fresh.length) {
    console.log('[merge] no new catalog ids to add');
    return 0;
  }
  const block = fresh.map(formatCatalogEntry).join('\n');
  ts = ts.replace(/\n];\n\nexport function panoramaUrl/, `\n${block}\n];\n\nexport function panoramaUrl`);
  await writeFile(CATALOG_TS, ts);
  console.log(`[merge] added ${fresh.length} entries to panoramas.ts`);
  return fresh.length;
}

async function main() {
  const { source, merge, only } = parseArgs();
  const regions = filterRegions(only);
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  const all = [];
  if (source === 'all' || source === 'panoramax') all.push(...(await importPanoramax(regions)));
  if (source === 'all' || source === 'mapillary') all.push(...(await importMapillary()));
  if (source === 'all' || source === 'kartaview') all.push(...(await importKartaview()));

  const outPath = path.join(__dirname, 'generated-external-catalog.json');
  await writeFile(outPath, JSON.stringify(all, null, 2));
  console.log(`\nCatalog written: ${outPath}`);
  console.log(`Done — ${all.length} scene(s) in this run`);

  if (merge) await mergeIntoPanoramasTs(all);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
