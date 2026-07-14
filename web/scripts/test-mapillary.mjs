#!/usr/bin/env node
/**
 * Test Mapillary Graph API token (free client token from mapillary.com/dashboard/developers).
 *
 * Usage:
 *   MAPILLARY_ACCESS_TOKEN=xxx node scripts/test-mapillary.mjs
 *   # or set in web/.env as VITE_MAPILLARY_ACCESS_TOKEN / MAPILLARY_ACCESS_TOKEN
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

function loadToken() {
  if (process.env.MAPILLARY_ACCESS_TOKEN?.trim()) return process.env.MAPILLARY_ACCESS_TOKEN.trim();
  if (process.env.VITE_MAPILLARY_ACCESS_TOKEN?.trim()) return process.env.VITE_MAPILLARY_ACCESS_TOKEN.trim();
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^(?:MAPILLARY_ACCESS_TOKEN|VITE_MAPILLARY_ACCESS_TOKEN)=(.*)$/);
      if (m?.[1]?.trim()) return m[1].trim();
    }
  }
  return null;
}

const token = loadToken();
if (!token) {
  console.error('No token. Set MAPILLARY_ACCESS_TOKEN or VITE_MAPILLARY_ACCESS_TOKEN in web/.env');
  console.error('Get a FREE client token: https://www.mapillary.com/dashboard/developers');
  process.exit(1);
}

const bbox = '13.377,52.517,13.381,52.521';
const url =
  `https://graph.mapillary.com/images?access_token=${encodeURIComponent(token)}` +
  `&fields=id,is_pano,computed_geometry,thumb_256_url&bbox=${bbox}&is_pano=true&limit=5`;

const res = await fetch(url);
const data = await res.json();

if (data.error) {
  console.error('API error:', data.error.message);
  process.exit(1);
}

const images = data.data ?? [];
console.log(`OK — ${images.length} pano(s) in Berlin bbox`);
for (const img of images) {
  const [lng, lat] = img.computed_geometry?.coordinates ?? [];
  console.log(`  id=${img.id}  lat=${lat?.toFixed(5)} lng=${lng?.toFixed(5)}`);
}

if (images[0]) {
  console.log('\nUse this imageId in MapillaryJS live viewer:', images[0].id);
}
