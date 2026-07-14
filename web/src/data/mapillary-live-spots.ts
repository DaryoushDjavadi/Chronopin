/** Seed locations for Mapillary live API lookup (no static JPG). */
export interface MapillaryLiveSpot {
  id: string;
  label: string;
  region: string;
  lat: number;
  lng: number;
}

export const MAPILLARY_LIVE_SPOTS: MapillaryLiveSpot[] = [
  { id: 'berlin', label: 'Berlin', region: 'Berlin, Germany', lat: 52.52, lng: 13.405 },
  { id: 'paris', label: 'Paris', region: 'Paris, France', lat: 48.856, lng: 2.352 },
  { id: 'london', label: 'London', region: 'London, UK', lat: 51.507, lng: -0.128 },
  { id: 'nyc', label: 'New York', region: 'New York, USA', lat: 40.758, lng: -73.985 },
  { id: 'tokyo', label: 'Tokyo', region: 'Tokyo, Japan', lat: 35.689, lng: 139.692 },
  { id: 'barcelona', label: 'Barcelona', region: 'Barcelona, Spain', lat: 41.387, lng: 2.168 },
  { id: 'rome', label: 'Rome', region: 'Rome, Italy', lat: 41.902, lng: 12.496 },
  { id: 'amsterdam', label: 'Amsterdam', region: 'Amsterdam, Netherlands', lat: 52.367, lng: 4.904 },
  { id: 'san-francisco', label: 'San Francisco', region: 'San Francisco, USA', lat: 37.774, lng: -122.419 },
  { id: 'sydney', label: 'Sydney', region: 'Sydney, Australia', lat: -33.868, lng: 151.209 },
  { id: 'cape-town', label: 'Cape Town', region: 'Cape Town, South Africa', lat: -33.925, lng: 18.424 },
  { id: 'mumbai', label: 'Mumbai', region: 'Mumbai, India', lat: 19.076, lng: 72.877 },
  { id: 'singapore', label: 'Singapore', region: 'Singapore', lat: 1.352, lng: 103.819 },
  { id: 'mexico-city', label: 'Mexico City', region: 'Mexico City, Mexico', lat: 19.432, lng: -99.133 },
  { id: 'buenos-aires', label: 'Buenos Aires', region: 'Buenos Aires, Argentina', lat: -34.603, lng: -58.382 },
];

export function pickMapillaryLiveSpot(): MapillaryLiveSpot {
  return MAPILLARY_LIVE_SPOTS[Math.floor(Math.random() * MAPILLARY_LIVE_SPOTS.length)]!;
}
