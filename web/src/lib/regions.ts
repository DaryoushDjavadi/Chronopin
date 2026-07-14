/** Continent buckets for “where you know best” stats */

export type ContinentId =
  | 'europe'
  | 'north_america'
  | 'south_america'
  | 'asia'
  | 'africa'
  | 'oceania';

export const CONTINENT_LABELS: Record<ContinentId, string> = {
  europe: 'Europe',
  north_america: 'North America',
  south_america: 'South America',
  asia: 'Asia',
  africa: 'Africa',
  oceania: 'Oceania',
};

export function continentFromLatLng(lat: number, lng: number): ContinentId {
  // Simplified bounding regions — good enough for player stats
  if (lat >= -35 && lat <= 37 && lng >= -25 && lng <= 60) {
    if (lng >= -25 && lng <= 55 && lat >= 5 && lat <= 37) return 'europe';
    if (lng >= -20 && lng <= 55 && lat >= -35 && lat < 5) return 'africa';
  }
  if (lng >= -170 && lng <= -30 && lat >= 15) return 'north_america';
  if (lng >= -85 && lng <= -30 && lat < 15 && lat >= -60) return 'south_america';
  if (lng >= 60 && lng <= 180 && lat >= -50) return 'asia';
  if (lng >= -180 && lng <= -110 && lat < 15 && lat > -50) return 'oceania';
  if (lat >= 35 && lng >= -170 && lng <= -50) return 'north_america';
  if (lat >= -45 && lat <= 12 && lng >= -80 && lng <= -30) return 'south_america';
  if (lat >= -50 && lat <= 40 && lng >= 25 && lng <= 145) return 'asia';
  if (lat >= -35 && lat <= 37 && lng >= -20 && lng <= 55) return 'africa';
  if (lat >= 35 && lng >= -10 && lng <= 60) return 'europe';
  if (lat <= -10 && lng >= 110 && lng <= 180) return 'oceania';
  if (lat >= 25 && lng >= -130 && lng <= -60) return 'north_america';
  return 'europe';
}
