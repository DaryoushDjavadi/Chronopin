import {
  DISTANCE_FAIL_KM,
  YEAR_FAIL_ERROR,
  type Guess,
  type Round,
  type ScoreResult,
} from '../types';

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString('en-GB')} km`;
}

export function scoreGuess(round: Round, guess: Guess): ScoreResult {
  const distanceKm = haversineKm(
    guess.lat,
    guess.lng,
    round.answer.lat,
    round.answer.lng,
  );

  let yearError: number | null = null;
  if (round.answer.year != null && guess.year != null) {
    yearError = Math.abs(guess.year - round.answer.year);
  }

  const distancePoints = Math.max(0, 5000 - distanceKm * 8);
  let yearPoints = 0;
  if (yearError != null) {
    yearPoints = Math.max(0, 5000 - yearError * 12);
  }

  const hasYear = round.answer.year != null;
  const maxPoints = hasYear ? 10000 : 5000;
  const points = Math.round(hasYear ? distancePoints + yearPoints : distancePoints);

  const tooFar = distanceKm > DISTANCE_FAIL_KM;
  const yearTooOff = yearError != null && yearError > YEAR_FAIL_ERROR;
  const lostHeart = tooFar || yearTooOff;

  let failReason: string | null = null;
  if (tooFar && yearTooOff) {
    failReason = `>${formatDistance(DISTANCE_FAIL_KM)} away & year off by ${yearError} yrs`;
  } else if (tooFar) {
    failReason = `More than ${formatDistance(DISTANCE_FAIL_KM)} off`;
  } else if (yearTooOff) {
    failReason = `Year off by more than ${YEAR_FAIL_ERROR} years`;
  }

  return { distanceKm, yearError, points, maxPoints, lostHeart, failReason };
}

export function scoreGrade(points: number, maxPoints: number): string {
  const ratio = points / maxPoints;
  if (ratio >= 0.85) return 'Excellent';
  if (ratio >= 0.65) return 'Great';
  if (ratio >= 0.45) return 'Good';
  if (ratio >= 0.25) return 'Fair';
  return 'Keep exploring';
}

export function renderHearts(hearts: number, max: number): string {
  return Array.from({ length: max }, (_, i) =>
    i < hearts
      ? '<span class="heart heart-full" aria-hidden="true">♥</span>'
      : '<span class="heart heart-empty" aria-hidden="true">♡</span>',
  ).join('');
}
