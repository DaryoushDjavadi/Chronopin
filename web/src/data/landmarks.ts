/** Famous places for the binocular “nearby landmark” hint (Europe-focused for V1). */

export interface Landmark {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const LANDMARKS: Landmark[] = [
  { id: 'eiffel', name: 'the Eiffel Tower', lat: 48.858093, lng: 2.294694 },
  { id: 'bodensee', name: 'Lake Constance', lat: 47.58, lng: 9.47 },
  { id: 'alps', name: 'the Alps', lat: 46.82, lng: 10.4 },
  { id: 'wilder-kaiser', name: 'the Wilder Kaiser', lat: 47.5033, lng: 12.2944 },
  { id: 'brandenburg-gate', name: 'the Brandenburg Gate', lat: 52.516275, lng: 13.377704 },
  { id: 'reichstag', name: 'the Reichstag', lat: 52.51862, lng: 13.37619 },
  { id: 'schoenbrunn', name: 'Schönbrunn Palace', lat: 48.1845, lng: 16.3122 },
  { id: 'donauturm', name: 'the Danube Tower', lat: 48.2402, lng: 16.4102 },
  { id: 'rhine', name: 'the Rhine Valley', lat: 50.04, lng: 8.24 },
  { id: 'museum-island', name: 'Museum Island', lat: 52.520755, lng: 13.398936 },
  { id: 'mauerpark', name: 'Mauerpark', lat: 52.54338, lng: 13.40342 },
  { id: 'potsdamer-platz', name: 'Potsdamer Platz', lat: 52.509583, lng: 13.375611 },
  { id: 'colosseum', name: 'the Colosseum', lat: 41.8902, lng: 12.4922 },
  { id: 'canals-amsterdam', name: 'the Amsterdam canals', lat: 52.3676, lng: 4.9041 },
  { id: 'prague-castle', name: 'Prague Castle', lat: 50.0904, lng: 14.4004 },
  { id: 'tokyo-shinjuku', name: 'Shinjuku Station', lat: 35.6896, lng: 139.7006 },
  { id: 'osaka-harukas', name: 'Abeno Harukas', lat: 34.6454, lng: 135.5063 },
  { id: 'akashi-bridge', name: 'Akashi Kaikyō Bridge', lat: 34.6175, lng: 135.0213 },
  { id: 'kings-cross', name: 'Kings Cross station', lat: 51.5308, lng: -0.1238 },
  { id: 'christ-church-dublin', name: 'Christ Church Cathedral', lat: 53.3434, lng: -6.2714 },
  { id: 'kolkata-dalhousie', name: 'Dalhousie Square', lat: 22.5697, lng: 88.3478 },
  { id: 'iguazu', name: 'Iguaçu Falls', lat: -25.6919, lng: -54.4409 },
  { id: 'zocalo', name: 'the Zócalo', lat: 19.4326, lng: -99.1332 },
  { id: 'table-mountain', name: 'Table Mountain', lat: -33.9628, lng: 18.4098 },
];
