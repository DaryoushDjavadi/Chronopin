import type { AvatarCategory, AvatarConfig } from './data/lpc-catalog';

export type GameMode = 'classic' | 'past' | 'future';
export type PlayType = 'solo' | 'multiplayer';
export type PanoramaSource = 'wikimedia' | 'mapillary' | 'kartaview' | 'panoramax';

export type ClassicRegionFilter =
  | 'world'
  | 'europe'
  | 'north_america'
  | 'south_america'
  | 'asia'
  | 'africa'
  | 'oceania';
export type Screen =
  | 'onboarding'
  | 'home'
  | 'explore'
  | 'guess'
  | 'result'
  | 'gameover'
  | 'library'
  | 'library-view'
  | 'library-map'
  | 'scoreboard'
  | 'player-info'
  | 'coop-wait'
  | 'coop-reveal'
  | 'coop-vote'
  | 'coop-result';

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
  /** Crowdsourced provider (Wikimedia entries omit this) */
  source?: PanoramaSource;
  /** Provider-specific image / sequence id */
  sourceId?: string;
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
  /** Daily = single round only */
  isDaily?: boolean;
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
  socialAddNameDraft: string;
  socialToast: string | null;
  creditsOpen: boolean;
  /** Classic mode: region picker open on home */
  classicSetupOpen: boolean;
  /** Active classic region filter for the current run */
  classicRegion: ClassicRegionFilter;
  /** Today's daily challenge run */
  isDailyRun: boolean;
  /** Reward wheel overlay (home or after daily) */
  dailyWheelOpen: boolean;
  dailyWheelResult: string | null;
  /** Co-op multiplayer run */
  isCoopRun: boolean;
  coopRoomId: string | null;
  coopMyRole: 'host' | 'guest' | null;
  coopSetupOpen: boolean;
  coopSetupFriendId: string | null;
  coopSyncMode: 'live' | 'async';
  coopGameMode: GameMode;
  /** Firebase user search results (Add friend tab) */
  socialCloudSearch: { uid: string; name: string; avatarConfig: import('./data/lpc-catalog').AvatarConfig }[];
  /** In-match chat panel (co-op) */
  matchChatOpen: boolean;
  matchChatDraft: string;
  matchChatUnread: number;
  /** Admin panel (Admin / Dary / Daryoush only) */
  adminOpen: boolean;
  adminQuery: string;
  adminResults: import('./lib/firebase-admin').AdminPlayerRow[];
  adminSelectedUid: string | null;
  adminStatus: string | null;
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
