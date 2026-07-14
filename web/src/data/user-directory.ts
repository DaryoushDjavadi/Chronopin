import type { AvatarConfig } from './lpc-catalog';
import { normalizeAvatarConfig } from './lpc-catalog';
import type { FriendProfile } from './social';

export interface DirectoryUser {
  id: string;
  name: string;
  tagline: string;
  avatarConfig: AvatarConfig;
  memberSince: string;
  /** Demo: auto-accept friend requests after send */
  demoAutoAccept?: boolean;
}

export const USER_DIRECTORY: DirectoryUser[] = [
  {
    id: 'max-mustermann',
    name: 'Max Mustermann',
    tagline: 'Panorama hunter · Berlin',
    memberSince: '2024-03-12',
    avatarConfig: normalizeAvatarConfig({
      body: 'male',
      skin: 'olive',
      hair: 'messy',
      hairColor: 'brown',
      headwear: 'none',
      top: 'vneck',
      topColor: '#27ae60',
      pants: 'pants',
      pantsColor: '#2a2a2a',
      shoes: 'basic',
      shoesColor: '#5d6d7e',
    }),
  },
  {
    id: 'lena-vogt',
    name: 'Lena Vogt',
    tagline: 'Classic mode main · Vienna',
    memberSince: '2025-11-04',
    avatarConfig: normalizeAvatarConfig({
      body: 'female',
      skin: 'light',
      hair: 'bob',
      hairColor: 'blonde',
      headwear: 'none',
      top: 'tshirt',
      topColor: '#8e44ad',
      pants: 'pants',
      pantsColor: '#3d7ec9',
      shoes: 'basic',
      shoesColor: '#ecf0f1',
    }),
  },
  {
    id: 'kai-chen',
    name: 'Kai Chen',
    tagline: 'Asia specialist · Singapore',
    memberSince: '2025-06-18',
    demoAutoAccept: true,
    avatarConfig: normalizeAvatarConfig({
      body: 'male',
      skin: 'light',
      hair: 'short',
      hairColor: 'black',
      headwear: 'none',
      top: 'tshirt',
      topColor: '#2980b9',
      pants: 'pants',
      pantsColor: '#1a1a1a',
      shoes: 'basic',
      shoesColor: '#333',
    }),
  },
  {
    id: 'sam-rivera',
    name: 'Sam Rivera',
    tagline: 'Americas routes · Mexico City',
    memberSince: '2025-02-02',
    demoAutoAccept: true,
    avatarConfig: normalizeAvatarConfig({
      body: 'female',
      skin: 'brown',
      hair: 'long',
      hairColor: 'brown',
      headwear: 'none',
      top: 'tshirt',
      topColor: '#e74c3c',
      pants: 'pants',
      pantsColor: '#2c3e50',
      shoes: 'basic',
      shoesColor: '#ecf0f1',
    }),
  },
  {
    id: 'yuki-tanaka',
    name: 'Yuki Tanaka',
    tagline: 'Night owl · Osaka',
    memberSince: '2024-11-20',
    avatarConfig: normalizeAvatarConfig({
      body: 'female',
      skin: 'light',
      hair: 'ponytail',
      hairColor: 'black',
      headwear: 'none',
      top: 'tshirt',
      topColor: '#9b59b6',
      pants: 'pants',
      pantsColor: '#34495e',
      shoes: 'basic',
      shoesColor: '#bdc3c7',
    }),
  },
];

export function directoryUserToFriend(user: DirectoryUser): FriendProfile {
  return {
    id: user.id,
    name: user.name,
    tagline: user.tagline,
    avatarConfig: user.avatarConfig,
    memberSince: user.memberSince,
    stats: {
      gamesPlayed: 12,
      gamesWon: 7,
      gamesLost: 5,
      bestRunScore: 2400,
      winRate: 58,
      strongestRegion: 'Europe',
      avgDistanceKm: 520,
    },
  };
}

export function getDirectoryUser(id: string): DirectoryUser | undefined {
  return USER_DIRECTORY.find((u) => u.id === id);
}

export function getDirectoryUserByName(name: string): DirectoryUser | undefined {
  const q = name.trim().toLowerCase();
  return USER_DIRECTORY.find((u) => u.name.toLowerCase() === q || u.id === q);
}

export function searchDirectoryUsers(query: string): DirectoryUser[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return USER_DIRECTORY.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.id.includes(q) ||
      u.tagline.toLowerCase().includes(q),
  );
}
