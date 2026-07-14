import { LANDMARKS } from '../data/landmarks';
import { CONTINENT_LABELS, continentFromLatLng } from './regions';
import { haversineKm } from './geo';

interface CountryRegion {
  name: string;
  subregion: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const COUNTRY_REGIONS: CountryRegion[] = [
  { name: 'Germany', subregion: 'Central Europe', minLat: 47.2, maxLat: 55.1, minLng: 5.8, maxLng: 15.1 },
  { name: 'France', subregion: 'Western Europe', minLat: 41.3, maxLat: 51.1, minLng: -5.1, maxLng: 9.6 },
  { name: 'Austria', subregion: 'Central Europe', minLat: 46.4, maxLat: 49.1, minLng: 9.5, maxLng: 17.2 },
  { name: 'Switzerland', subregion: 'Central Europe', minLat: 45.8, maxLat: 47.8, minLng: 5.9, maxLng: 10.5 },
  { name: 'Italy', subregion: 'Southern Europe', minLat: 36.6, maxLat: 47.1, minLng: 6.6, maxLng: 18.5 },
  { name: 'Spain', subregion: 'Southern Europe', minLat: 36.0, maxLat: 43.8, minLng: -9.3, maxLng: 4.3 },
  { name: 'United Kingdom', subregion: 'Northern Europe', minLat: 49.9, maxLat: 60.9, minLng: -8.6, maxLng: 1.8 },
  { name: 'Netherlands', subregion: 'Western Europe', minLat: 50.7, maxLat: 53.6, minLng: 3.3, maxLng: 7.2 },
  { name: 'Belgium', subregion: 'Western Europe', minLat: 49.5, maxLat: 51.5, minLng: 2.5, maxLng: 6.4 },
  { name: 'Czechia', subregion: 'Central Europe', minLat: 48.5, maxLat: 51.1, minLng: 12.0, maxLng: 18.9 },
  { name: 'Poland', subregion: 'Central Europe', minLat: 49.0, maxLat: 54.9, minLng: 14.1, maxLng: 24.2 },
  { name: 'Hungary', subregion: 'Central Europe', minLat: 45.7, maxLat: 48.6, minLng: 16.1, maxLng: 22.9 },
  { name: 'Denmark', subregion: 'Northern Europe', minLat: 54.5, maxLat: 57.8, minLng: 8.0, maxLng: 15.2 },
  { name: 'Sweden', subregion: 'Northern Europe', minLat: 55.3, maxLat: 69.1, minLng: 11.0, maxLng: 24.2 },
  { name: 'Norway', subregion: 'Northern Europe', minLat: 57.9, maxLat: 71.2, minLng: 4.5, maxLng: 31.2 },
  { name: 'Greece', subregion: 'Southern Europe', minLat: 34.8, maxLat: 41.8, minLng: 19.3, maxLng: 29.7 },
  { name: 'Portugal', subregion: 'Southern Europe', minLat: 36.9, maxLat: 42.2, minLng: -9.5, maxLng: -6.2 },
  { name: 'Ireland', subregion: 'Northern Europe', minLat: 51.4, maxLat: 55.4, minLng: -10.5, maxLng: -5.9 },
  { name: 'Romania', subregion: 'Eastern Europe', minLat: 43.6, maxLat: 48.3, minLng: 20.2, maxLng: 29.7 },
  { name: 'Turkey', subregion: 'Western Asia / Europe', minLat: 36.0, maxLat: 42.1, minLng: 26.0, maxLng: 44.8 },
];

function countryFromLatLng(lat: number, lng: number): { country: string; subregion: string } {
  for (const region of COUNTRY_REGIONS) {
    if (
      lat >= region.minLat &&
      lat <= region.maxLat &&
      lng >= region.minLng &&
      lng <= region.maxLng
    ) {
      return { country: region.name, subregion: region.subregion };
    }
  }
  const continent = CONTINENT_LABELS[continentFromLatLng(lat, lng)];
  return { country: 'an unknown country', subregion: continent };
}

function nearestLandmark(lat: number, lng: number) {
  let best = LANDMARKS[0]!;
  let bestDist = haversineKm(lat, lng, best.lat, best.lng);
  for (const landmark of LANDMARKS) {
    const dist = haversineKm(lat, lng, landmark.lat, landmark.lng);
    if (dist < bestDist) {
      best = landmark;
      bestDist = dist;
    }
  }
  return { landmark: best, distanceKm: bestDist };
}

/** Binoculars: name a famous place “nearby”, even if it is hundreds of km away. */
export function getBinocularHint(lat: number, lng: number): string {
  const { landmark, distanceKm } = nearestLandmark(lat, lng);
  if (distanceKm < 30) {
    return `You're right by ${landmark.name}.`;
  }
  if (distanceKm < 120) {
    return `You're near ${landmark.name}.`;
  }
  return `You're somewhere near ${landmark.name} — roughly ${Math.round(distanceKm)} km away.`;
}

/** North Star: country + broader region hint. */
export function getStarHint(lat: number, lng: number): string {
  const { country, subregion } = countryFromLatLng(lat, lng);
  const continent = CONTINENT_LABELS[continentFromLatLng(lat, lng)];
  if (country === 'an unknown country') {
    return `The scene is in ${continent}.`;
  }
  return `The scene is in ${country}, ${subregion} (${continent}).`;
}
