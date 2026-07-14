import type { AvatarCategory, AvatarConfig } from './data/lpc-catalog';

export type GameMode = 'classic' | 'past' | 'future';
export type PlayType = 'solo' | 'multiplayer';
export type Screen =
  | 'onboarding'
  | 'home'
  | 'explore'
  | 'guess'
  | 'result'
  | 'gameover'
  | 'library'
  | 'library-view'
  | 'scoreboard'
  | 'player-info';

export interface PanoConfig {
  haov?: number;
  vaov?: number;
  vOffset?: number;
  minPitch?: number;
  maxPitch?: number;
}

export interface PanoramaAsset {
  id: string;
  filename: string;
  title: string;
  region: string;
  lat: number;
  lng: number;
  year?: number;
  modes: GameMode[];
  panoConfig?: PanoConfig;
  context: string;
  attribution: string;
  license: string;
  isAiGenerated?: boolean;
  /** Show "new" badge in panorama library */
  isNew?: boolean;
}

export interface RoundAnswer {
  lat: number;
  lng: number;
  year?: number;
  label: string;
}

export interface Round {
  id: string;
  panoramaId: string;
  modes: GameMode[];
  title: string;
  panorama: string;
  panoConfig?: PanoConfig;
  answer: RoundAnswer;
  context: string;
  attribution: string;
  license: string;
  isAiGenerated?: boolean;
}

export interface Guess {
  lat: number;
  lng: number;
  year?: number;
}

export interface GameSession {
  hearts: number;
  score: number;
  roundNumber: number;
  usedRoundIds: string[];
  lastLostHeart: boolean;
  lastRoundPoints: number;
  usedItemsThisRound: string[];
  activeHint: { itemId: string; text: string } | null;
}

export interface AppState {
  screen: Screen;
  playType: PlayType;
  mode: GameMode | null;
  round: Round | null;
  guess: Guess | null;
  session: GameSession | null;
  libraryIndex: number;
  libraryViewId: string | null;
  scoreboardFilter: GameMode | 'all';
  avatarConfig: AvatarConfig;
  avatarEditorOpenCategory: AvatarCategory | null;
  inventoryOpen: boolean;
  socialOpen: boolean;
  socialTab: 'friends' | 'add';
  socialView: 'list' | 'friend';
  socialSelectedFriendId: string | null;
  socialMessageDraft: string;
  socialToast: string | null;
  creditsOpen: boolean;
}

export interface ScoreResult {
  distanceKm: number;
  yearError: number | null;
  points: number;
  maxPoints: number;
  lostHeart: boolean;
  failReason: string | null;
}

export const MAX_HEARTS = 3;
export const DISTANCE_FAIL_KM = 1500;
export const YEAR_FAIL_ERROR = 80;
