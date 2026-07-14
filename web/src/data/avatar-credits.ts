/** LPC Character Editor attribution (Universal LPC / OpenGameArt). */

export interface AvatarCreditBlock {
  id: string;
  assetPath: string;
  notes: string;
  licenses: string;
  authors: string;
}

export const AVATAR_EDITOR_CREDITS: AvatarCreditBlock[] = [
  {
    id: 'body-male',
    assetPath: 'body/bodies/male/idle.png',
    notes:
      "see details at https://opengameart.org/content/lpc-character-bases; 'Thick' Male Revised Run/Climb by JaidynReiman (based on ElizaWy's LPC Revised)",
    licenses: 'OGA-BY 3.0, CC-BY-SA 3.0, GPL 3.0',
    authors:
      'bluecarrot16, JaidynReiman, Benjamin K. Smith (BenCreating), Evert, Eliza Wyatt (ElizaWy), TheraHedwig, MuffinElZangano, Durrani, Johannes Sjölund (wulax), Stephen Challener (Redshrike)',
  },
  {
    id: 'head-male',
    assetPath: 'head/heads/human/male/idle.png',
    notes: 'original head by Redshrike, tweaks by BenCreating, modular version by bluecarrot16',
    licenses: 'OGA-BY 3.0, CC-BY-SA 3.0, GPL 3.0',
    authors: 'bluecarrot16, Benjamin K. Smith (BenCreating), Stephen Challener (Redshrike)',
  },
  {
    id: 'face-male',
    assetPath: 'head/faces/male/neutral/idle.png',
    notes:
      'Original by Redshrike, Expressions by ElizaWy, mapped to all frames by JaidynReiman',
    licenses: 'OGA-BY 3.0',
    authors: 'JaidynReiman, ElizaWy, Stephen Challener (Redshrike)',
  },
];

export const AVATAR_CREDITS_OGA_URL = 'https://opengameart.org/content/lpc-character-bases';
