import {
  addBonusHeartsNextRun,
  addBonusPoints,
  addStashItemCharge,
} from './stash';

export type DailyWheelRewardId =
  | 'binoculars'
  | 'star'
  | 'compass'
  | 'map'
  | 'extra_heart'
  | 'points_500'
  | 'points_250'
  | 'jackpot';

export interface WheelSegment {
  id: DailyWheelRewardId;
  label: string;
  emoji: string;
  color: string;
  weight: number;
}

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 'binoculars', label: 'Binoculars ×1', emoji: '🔭', color: '#3dd6c6', weight: 18 },
  { id: 'star', label: 'North Star ×1', emoji: '⭐', color: '#f5a623', weight: 18 },
  { id: 'extra_heart', label: 'Extra ♥', emoji: '♥', color: '#ff6b6b', weight: 14 },
  { id: 'points_500', label: '+500 pts', emoji: '✨', color: '#a78bfa', weight: 14 },
  { id: 'points_250', label: '+250 pts', emoji: '💫', color: '#7c9cff', weight: 16 },
  { id: 'compass', label: 'Compass ×1', emoji: '🧭', color: '#56c596', weight: 8 },
  { id: 'map', label: 'Pocket map ×1', emoji: '🗺', color: '#e87722', weight: 6 },
  { id: 'jackpot', label: 'Explorer pack', emoji: '🎁', color: '#ffd166', weight: 6 },
];

export function pickWeightedSegment(): { segment: WheelSegment; index: number } {
  const total = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
    roll -= WHEEL_SEGMENTS[i]!.weight;
    if (roll <= 0) return { segment: WHEEL_SEGMENTS[i]!, index: i };
  }
  const last = WHEEL_SEGMENTS.length - 1;
  return { segment: WHEEL_SEGMENTS[last]!, index: last };
}

export function applyWheelReward(id: DailyWheelRewardId): string {
  switch (id) {
    case 'binoculars':
      addStashItemCharge('binoculars');
      return 'Binoculars +1 use banked for your next runs.';
    case 'star':
      addStashItemCharge('star');
      return 'North Star +1 use banked for your next runs.';
    case 'compass':
      addStashItemCharge('compass');
      return 'Compass +1 use banked (usable when unlocked).';
    case 'map':
      addStashItemCharge('map');
      return 'Pocket map +1 use banked (usable when unlocked).';
    case 'extra_heart':
      addBonusHeartsNextRun(1);
      return 'Extra heart added to your next solo run.';
    case 'points_500':
      addBonusPoints(500);
      return '+500 bonus points on your next run.';
    case 'points_250':
      addBonusPoints(250);
      return '+250 bonus points on your next run.';
    case 'jackpot':
      addStashItemCharge('binoculars');
      addStashItemCharge('star');
      addBonusHeartsNextRun(1);
      return 'Explorer pack: Binoculars, North Star & an extra heart!';
    default:
      return 'Reward claimed.';
  }
}

export function segmentAngle(index: number): number {
  return (360 / WHEEL_SEGMENTS.length) * index;
}
