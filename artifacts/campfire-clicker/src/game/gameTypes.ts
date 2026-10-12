export type RoastPhase = 'idle' | 'roasting' | 'early' | 'normal' | 'golden' | 'burnt';

export interface CampfireState {
  marshmallows: number;
  mpr: number;
  maxMpr: number;
  sticks: number;
  friends: number;
  friendMpr: number;
  mps: number;
  nights: number;
  activeSeconds: number;
  goldenFriends: boolean;
}

export interface RoastState {
  progress: number;
  phase: RoastPhase;
  lastAward: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  amount: number;
  purchased: number;
  maxPurchases?: number;
  capped: boolean;
  unlocked: boolean;
  affordable: boolean;
  category: 'player' | 'friends';
}

export interface GameSettings {
  musicEnabled: boolean;
  musicVolume: number;
  fireGlow: boolean;
}

export interface CampfireGame {
  state: CampfireState;
  roast: RoastState;
  upgrades: Upgrade[];
  offlineEarnings: number;
  lastSavedAt: number;
  settings: GameSettings;
  startRoast(): void;
  releaseRoast(): void;
  buyUpgrade(id: string): void;
  setMusicEnabled(enabled: boolean): void;
  setMusicVolume(volume: number): void;
  setFireGlow(enabled: boolean): void;
  resetGame(): void;
  exportSave(): void;
  importSave(file: File): Promise<void>;
}
