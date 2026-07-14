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
  { id: 'lisbon', label: 'Lisbon', region: 'Lisbon, Portugal', lat: 38.722, lng: -9.139 },
  { id: 'istanbul', label: 'Istanbul', region: 'Istanbul, Turkey', lat: 41.008, lng: 28.978 },
  { id: 'stockholm', label: 'Stockholm', region: 'Stockholm, Sweden', lat: 59.329, lng: 18.069 },
  { id: 'prague', label: 'Prague', region: 'Prague, Czechia', lat: 50.075, lng: 14.437 },
  { id: 'montreal', label: 'Montreal', region: 'Montreal, Canada', lat: 45.501, lng: -73.567 },
  { id: 'hong-kong', label: 'Hong Kong', region: 'Hong Kong', lat: 22.319, lng: 114.169 },
  { id: 'bangkok', label: 'Bangkok', region: 'Bangkok, Thailand', lat: 13.756, lng: 100.502 },
  { id: 'nairobi', label: 'Nairobi', region: 'Nairobi, Kenya', lat: -1.292, lng: 36.822 },
  { id: 'helsinki', label: 'Helsinki', region: 'Helsinki, Finland', lat: 60.17, lng: 24.938 },
  { id: 'oslo', label: 'Oslo', region: 'Oslo, Norway', lat: 59.913, lng: 10.752 },
  { id: 'dubai', label: 'Dubai', region: 'Dubai, UAE', lat: 25.204, lng: 55.271 },
  { id: 'seoul', label: 'Seoul', region: 'Seoul, South Korea', lat: 37.566, lng: 126.978 },
  { id: 'los-angeles', label: 'Los Angeles', region: 'Los Angeles, USA', lat: 34.052, lng: -118.244 },
  { id: 'bucharest', label: 'Bucharest', region: 'Bucharest, Romania', lat: 44.426, lng: 26.102 },
  { id: 'warsaw', label: 'Warsaw', region: 'Warsaw, Poland', lat: 52.23, lng: 21.012 },
  { id: 'athens', label: 'Athens', region: 'Athens, Greece', lat: 37.984, lng: 23.728 },
  { id: 'vienna', label: 'Vienna', region: 'Vienna, Austria', lat: 48.208, lng: 16.373 },
  { id: 'madrid', label: 'Madrid', region: 'Madrid, Spain', lat: 40.416, lng: -3.703 },
  { id: 'munich', label: 'Munich', region: 'Munich, Germany', lat: 48.137, lng: 11.575 },
  { id: 'chicago', label: 'Chicago', region: 'Chicago, USA', lat: 41.878, lng: -87.63 },
  { id: 'toronto', label: 'Toronto', region: 'Toronto, Canada', lat: 43.653, lng: -79.383 },
  { id: 'jakarta', label: 'Jakarta', region: 'Jakarta, Indonesia', lat: -6.208, lng: 106.845 },
  { id: 'melbourne', label: 'Melbourne', region: 'Melbourne, Australia', lat: -37.813, lng: 144.963 },
  { id: 'dublin', label: 'Dublin', region: 'Dublin, Ireland', lat: 53.349, lng: -6.26 },
  { id: 'copenhagen', label: 'Copenhagen', region: 'Copenhagen, Denmark', lat: 55.676, lng: 12.568 },
  // — Gap fill: Africa, South America, Asia-Pacific, Middle East, Central America —
  { id: 'cairo', label: 'Cairo', region: 'Cairo, Egypt', lat: 30.044, lng: 31.236 },
  { id: 'lagos', label: 'Lagos', region: 'Lagos, Nigeria', lat: 6.524, lng: 3.379 },
  { id: 'johannesburg', label: 'Johannesburg', region: 'Johannesburg, South Africa', lat: -26.204, lng: 28.047 },
  { id: 'casablanca', label: 'Casablanca', region: 'Casablanca, Morocco', lat: 33.573, lng: -7.589 },
  { id: 'sao-paulo', label: 'São Paulo', region: 'São Paulo, Brazil', lat: -23.55, lng: -46.633 },
  { id: 'rio-de-janeiro', label: 'Rio de Janeiro', region: 'Rio de Janeiro, Brazil', lat: -22.907, lng: -43.173 },
  { id: 'lima', label: 'Lima', region: 'Lima, Peru', lat: -12.046, lng: -77.042 },
  { id: 'santiago', label: 'Santiago', region: 'Santiago, Chile', lat: -33.449, lng: -70.669 },
  { id: 'bogota', label: 'Bogotá', region: 'Bogotá, Colombia', lat: 4.711, lng: -74.072 },
  { id: 'beijing', label: 'Beijing', region: 'Beijing, China', lat: 39.904, lng: 116.407 },
  { id: 'shanghai', label: 'Shanghai', region: 'Shanghai, China', lat: 31.23, lng: 121.474 },
  { id: 'manila', label: 'Manila', region: 'Manila, Philippines', lat: 14.599, lng: 120.984 },
  { id: 'kuala-lumpur', label: 'Kuala Lumpur', region: 'Kuala Lumpur, Malaysia', lat: 3.139, lng: 101.687 },
  { id: 'delhi', label: 'Delhi', region: 'Delhi, India', lat: 28.613, lng: 77.209 },
  { id: 'hanoi', label: 'Hanoi', region: 'Hanoi, Vietnam', lat: 21.028, lng: 105.854 },
  { id: 'auckland', label: 'Auckland', region: 'Auckland, New Zealand', lat: -36.848, lng: 174.763 },
  { id: 'vancouver', label: 'Vancouver', region: 'Vancouver, Canada', lat: 49.283, lng: -123.121 },
  { id: 'miami', label: 'Miami', region: 'Miami, USA', lat: 25.762, lng: -80.192 },
  { id: 'tel-aviv', label: 'Tel Aviv', region: 'Tel Aviv, Israel', lat: 32.085, lng: 34.782 },
  { id: 'panama-city', label: 'Panama City', region: 'Panama City, Panama', lat: 8.983, lng: -79.519 },
  { id: 'guadalajara', label: 'Guadalajara', region: 'Guadalajara, Mexico', lat: 20.659, lng: -103.349 },
];

export function pickMapillaryLiveSpot(): MapillaryLiveSpot {
  return MAPILLARY_LIVE_SPOTS[Math.floor(Math.random() * MAPILLARY_LIVE_SPOTS.length)]!;
}
